import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { getResend } from "@/lib/resend";
import { createOrder, confirmOrder, getOrderByExternalId } from "@/lib/printful";
import { recordSale } from "@/lib/stats/record-sale";
import {
  getOrCreateFulfillment,
  markPrintfulCreated,
  markConfirmed,
  markFailed,
} from "@/lib/fulfillment/db";
import {
  ORDER_CONFIRMATION_SUBJECT,
  renderOrderConfirmationHtml,
  renderOrderConfirmationText,
} from "@/lib/emails/order-confirmation";
import { sendPurchaseEvent } from "@/lib/analytics/measurement-protocol";

const ORDER_CONFIRMATION_FROM = "Mon Kebab <commande@monkebab.xyz>";
// Real, human-monitored mailbox (OVH Zimbra) — a customer hitting "Reply"
// lands there instead of commande@monkebab.xyz, whose domain is verified
// with Resend for sending only (receiving disabled), so an unrouted reply
// would otherwise bounce.
const ORDER_CONFIRMATION_REPLY_TO = "hello@monkebab.xyz";

// Generic placeholder mockup, used only as a fallback for the rare session
// that has no printFileUrl in its metadata.
const PRODUCT_MOCKUP_URL =
  "https://res.cloudinary.com/dtyn7j361/image/upload/v1777654524/MOCK_UP_TA_COMMANDE_PERSONNE%CC%81LISE%CC%81E_kkafkj.png";

// Only used if a session somehow has no printFileUrl at all — Printful still
// needs *some* fetchable file to accept the order.
const FALLBACK_PRINT_FILE_URL =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/280px-PNG_transparency_demonstration_1.png";

const VARIANT_IDS: Record<string, number> = {
  S: 11546,
  M: 11547,
  L: 11548,
  XL: 11549,
  XXL: 11550,
};

// Best-effort stats recording: a paid t-shirt is a real sale regardless of
// what happens afterward (Printful outage, email failure), so this runs
// independently of and before the Printful/email logic. Deduplicated at the
// database level (UNIQUE stripe_session_id + ON CONFLICT DO NOTHING), so
// it's safe to call for both checkout.session.completed and
// checkout.session.async_payment_succeeded without risking a double count.
// Returns whether this call was the one that actually recorded the sale
// (see recordSale()'s own doc — the INSERT's RETURNING is empty on a
// duplicate/conflict), used below as the sole idempotence signal for the
// GA4 purchase event.
async function recordSaleBestEffort(session: Stripe.Checkout.Session): Promise<boolean> {
  if (session.payment_status !== "paid") return false;

  const { bread, meat, vegetables, sauces } = session.metadata ?? {};

  try {
    return await recordSale({ stripeSessionId: session.id, bread, meat, vegetables, sauces });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown stats error";
    console.error("[stats] record sale failed", message);
    return false;
  }
}

/** "Payment confirmed" = a sale happened, independent of whatever Printful
 * fulfillment does afterward — so this is called where payment success is
 * first known, not inside runFulfillment(), and its own idempotence rides
 * entirely on recordSaleBestEffort()'s return value (itself backed by the
 * `orders` table's existing UNIQUE(stripe_session_id) constraint) rather
 * than a second, separate dedup mechanism. The sale is always recorded
 * regardless of analytics consent — only the GA4 purchase event itself is
 * gated on it. Best-effort itself — see sendPurchaseEvent()'s own
 * contract, never throws. */
async function recordSaleAndFirePurchase(session: Stripe.Checkout.Session) {
  const isNewSale = await recordSaleBestEffort(session);
  if (!isNewSale) return;

  const { gaClientId, size, analyticsConsent } = session.metadata ?? {};

  // Trust only an explicit "granted" — missing metadata, "denied", or any
  // unrecognized value all mean no purchase event. The checkout flow always
  // sends this field (app/api/checkout/route.ts), so anything else here
  // means the visitor had not accepted analytics when they checked out.
  if (analyticsConsent !== "granted") {
    console.log("[ga4] analytics consent not granted, skipping purchase event:", session.id, analyticsConsent || "(none)");
    return;
  }

  // No fabricated amount — a "purchase" without a real, Stripe-confirmed
  // value would misreport revenue in GA4. This should not happen in
  // practice (Checkout Sessions always carry amount_total once paid), but
  // if it ever does, skip the event entirely rather than guess.
  if (typeof session.amount_total !== "number") {
    console.error("[ga4] session.amount_total missing, cannot report an accurate purchase value — skipping:", session.id);
    return;
  }

  await sendPurchaseEvent({
    clientId: gaClientId,
    transactionId: session.id,
    value: session.amount_total / 100,
    currency: (session.currency ?? "eur").toUpperCase(),
    size,
  });
}

function formatAmount(session: Stripe.Checkout.Session): string {
  const total = session.amount_total;
  if (typeof total !== "number") return "29,99 €";

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: (session.currency ?? "eur").toUpperCase(),
  }).format(total / 100);
}

/** The whole create -> confirm -> email pipeline, driven entirely by the
 * durable `fulfillments` row rather than an in-memory Set — a cold start or
 * a Stripe redelivery landing on a different instance resumes from exactly
 * whatever step the row says was last reached, instead of either silently
 * skipping (row looked "done" to a Set that no longer exists) or blindly
 * redoing everything (creating a second Printful order).
 *
 * Throws on a failure that's worth Stripe retrying (Printful create/confirm
 * failing) so the caller can return a 5xx; returns normally for permanent,
 * non-retryable conditions (unpaid session, unknown size, already confirmed). */
async function runFulfillment(session: Stripe.Checkout.Session) {
  // Explicit payment guard — checkout.session.completed fires with
  // payment_status "unpaid" for delayed payment methods; fulfillment must
  // never start before the payment has actually settled. (Delayed methods
  // are handled by the separate checkout.session.async_payment_succeeded
  // branch below, stats-only — out of scope here, unchanged.)
  if (session.payment_status !== "paid") {
    console.log("[fulfillment] session not paid yet, skipping:", session.id, session.payment_status);
    return;
  }

  const { size, bread, meat, vegetables, sauces, printFileUrl } = session.metadata ?? {};
  const customerDetails = session.customer_details;
  const email = customerDetails?.email || undefined;

  const fulfillment = await getOrCreateFulfillment({ stripeSessionId: session.id, email, size });

  if (fulfillment.status === "confirmed") {
    console.log("[fulfillment] already confirmed, no-op:", session.id);
    return;
  }

  const variantId = size ? VARIANT_IDS[size] : undefined;
  if (!variantId) {
    console.error("[printful] unknown or missing size, cannot fulfill:", size, session.id);
    await markFailed(session.id, {
      step: "variant_lookup",
      errorMessage: `Unknown or missing size: ${size ?? "(none)"}`,
    });
    return;
  }

  let printfulOrderId = fulfillment.printfulOrderId;

  // Step 1 — ensure a Printful order exists. Never call createOrder twice
  // for the same session: if we don't yet have an id persisted, first check
  // whether Printful already has one under this session's external_id (a
  // prior attempt's create could have succeeded while the response that
  // would have let us persist the id was lost — network drop, function
  // timeout, crash). Only create if that lookup comes back empty.
  if (!printfulOrderId) {
    const lookup = await getOrderByExternalId(session.id);

    if (lookup.status === 200 && lookup.body?.result?.id) {
      printfulOrderId = String(lookup.body.result.id);
      console.log("[printful] recovered existing order via external_id, no new order created:", printfulOrderId);
      await markPrintfulCreated(session.id, printfulOrderId);
    } else {
      const { status: createStatus, body: printfulData } = await createOrder({
        confirm: false,
        external_id: session.id,
        recipient: {
          name: customerDetails?.name || "Unknown",
          email: email || "",
          address1: customerDetails?.address?.line1 || "",
          address2: customerDetails?.address?.line2 || undefined,
          city: customerDetails?.address?.city || "",
          state_code: customerDetails?.address?.state || "",
          country_code: customerDetails?.address?.country || "FR",
          zip: customerDetails?.address?.postal_code || "",
        },
        items: [
          {
            variant_id: variantId,
            quantity: 1,
            name: `Mon Kebab T-Shirt - ${size}`,
            files: [
              {
                type: "front",
                url: printFileUrl || FALLBACK_PRINT_FILE_URL,
                position: {
                  // Print file ratio is 4:5 = 0.80 (width/height).
                  // Position ratio must match: 1700/2125 = 0.80.
                  // Centered horizontally: left = (1800 - 1700) / 2 = 50.
                  area_width: 1800,
                  area_height: 2400,
                  width: 1700,
                  height: 2125,
                  top: 80,
                  left: 50,
                  limit_to_print_area: true,
                },
              },
            ],
          },
        ],
      });

      console.log("[printful] order response", printfulData);

      if (createStatus !== 200 || !printfulData?.result?.id) {
        console.error("[printful] order creation failed", { status: createStatus, body: printfulData, sessionId: session.id });
        await markFailed(session.id, {
          step: "printful_create",
          errorMessage: `createOrder failed (HTTP ${createStatus}): ${JSON.stringify(printfulData?.error ?? printfulData)}`,
        });
        throw new Error("Printful order creation failed");
      }

      printfulOrderId = String(printfulData.result.id);
      await markPrintfulCreated(session.id, printfulOrderId);
    }
  }

  // Test-only escape hatch: leaves the order in Printful's "draft" status
  // (created, visible in the dashboard, never queued for production/billing)
  // instead of confirming it. Gated on NODE_ENV so it can never be armed by
  // an env var alone in a deployed (production or preview) environment —
  // only `next dev` sets NODE_ENV to anything other than "production".
  const skipConfirm = process.env.PRINTFUL_SKIP_CONFIRM === "true" && process.env.NODE_ENV !== "production";

  if (skipConfirm) {
    console.log("[printful] PRINTFUL_SKIP_CONFIRM active — leaving order as draft, not confirming:", printfulOrderId);
    return;
  }

  // Step 2 — confirm. Only reached once printfulOrderId is known (either
  // just created or recovered), and re-attempted on every call until it
  // actually succeeds — status only ever becomes "confirmed" after a real
  // 200 from Printful, never assumed.
  const { status: confirmStatus, body: confirmBody } = await confirmOrder(printfulOrderId);
  console.log("[printful] confirm response", { status: confirmStatus, body: confirmBody });

  if (confirmStatus !== 200) {
    console.error("[printful] order confirmation failed", {
      status: confirmStatus,
      body: confirmBody,
      sessionId: session.id,
      printfulOrderId,
    });
    await markFailed(session.id, {
      step: "printful_confirm",
      errorMessage: `confirmOrder failed (HTTP ${confirmStatus}): ${JSON.stringify(confirmBody?.error ?? confirmBody)}`,
    });
    throw new Error("Printful order confirmation failed");
  }

  await markConfirmed(session.id);

  // Note: the GA4 purchase event is NOT fired here. "Paid" and "fulfilled"
  // are deliberately different facts — purchase fires as soon as payment is
  // confirmed (see recordSaleAndFirePurchase(), called from POST() below,
  // before runFulfillment() is even invoked), independent of whether
  // Printful order creation/confirmation below succeeds. A Printful failure
  // still shows up (status 'failed' + the internal alert), just not as a
  // missing GA4 purchase — those are two separate concerns now.

  // Step 3 — confirmation email. Only reachable after a verified confirm
  // success above; deliberately best-effort itself (a Resend failure must
  // never turn into a 5xx that makes Stripe retry an already-confirmed order).
  if (!email) {
    console.error("[email] no customer email on session, skipping:", session.id);
    return;
  }

  try {
    const emailData = {
      bread,
      meat,
      vegetables,
      sauces,
      size,
      amountPaid: formatAmount(session),
      reference: printfulOrderId,
      mockupUrl: printFileUrl || PRODUCT_MOCKUP_URL,
    };

    const { error } = await getResend().emails.send({
      from: ORDER_CONFIRMATION_FROM,
      replyTo: ORDER_CONFIRMATION_REPLY_TO,
      to: email,
      subject: ORDER_CONFIRMATION_SUBJECT,
      html: renderOrderConfirmationHtml(emailData),
      text: renderOrderConfirmationText(emailData),
    });

    if (error) {
      console.error("[email] order confirmation failed", error);
    } else {
      console.log("[email] order confirmation sent");
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown email error";
    console.error("[email] order confirmation failed", message);
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const sig = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !secret) {
    return Response.json({ error: "Missing signature or webhook secret" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Signature verification failed";
    console.error("[webhook] signature error:", message);
    return Response.json({ error: message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    console.log("[webhook] checkout.session.completed", { sessionId: session.id });

    // Payment confirmed = a sale happened, independent of fulfillment —
    // recorded (stats) and measured (GA4 purchase) before Printful is ever
    // involved, so a downstream Printful failure never affects either.
    await recordSaleAndFirePurchase(session);

    try {
      await runFulfillment(session);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown fulfillment error";
      console.error("[webhook] fulfillment failed, returning 5xx so Stripe retries:", message);
      return Response.json({ error: message }, { status: 500 });
    }
  } else if (event.type === "checkout.session.async_payment_succeeded") {
    // Delayed payment methods (e.g. bank transfer) don't have payment_status
    // "paid" yet at checkout.session.completed — this event confirms success
    // later. Order fulfillment (Printful/email) for delayed payment methods
    // is out of scope here; this only ensures the sale is still counted in
    // stats and measured in GA4. stripe_session_id dedup (via the `orders`
    // table's UNIQUE constraint, see recordSale()) makes this safe even if
    // a session somehow triggers both event types.
    const session = event.data.object as Stripe.Checkout.Session;
    await recordSaleAndFirePurchase(session);
  }

  return Response.json({ received: true });
}
