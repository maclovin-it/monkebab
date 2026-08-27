import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { getResend } from "@/lib/resend";
import { createOrder, confirmOrder } from "@/lib/printful";
import {
  ORDER_CONFIRMATION_SUBJECT,
  renderOrderConfirmationHtml,
  renderOrderConfirmationText,
} from "@/lib/emails/order-confirmation";

// In-memory only: this does NOT survive cold starts and is not shared between
// concurrent serverless instances. It de-duplicates Stripe retries hitting the
// same warm instance, nothing more.
const processedSessions = new Set<string>();

const ORDER_CONFIRMATION_FROM = "Mon Kebab <commande@monkebab.xyz>";

// Generic placeholder mockup, used only as a fallback for the rare session
// that has no printFileUrl in its metadata.
const PRODUCT_MOCKUP_URL =
  "https://res.cloudinary.com/dtyn7j361/image/upload/v1777654524/MOCK_UP_TA_COMMANDE_PERSONNE%CC%81LISE%CC%81E_kkafkj.png";

function formatAmount(session: Stripe.Checkout.Session): string {
  const total = session.amount_total;
  if (typeof total !== "number") return "29,99 €";

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: (session.currency ?? "eur").toUpperCase(),
  }).format(total / 100);
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

    if (processedSessions.has(session.id)) {
      console.log("[webhook] already processed, skipping:", session.id);
      return Response.json({ received: true });
    }
    processedSessions.add(session.id);

    const { size, bread, meat, vegetables, sauces, printFileUrl } = session.metadata ?? {};

    console.log("[webhook] checkout.session.completed", {
      sessionId: session.id,
      size,
      bread,
      meat,
      vegetables,
      sauces,
    });

    const VARIANT_IDS: Record<string, number> = {
      S: 11546,
      M: 11547,
      L: 11548,
      XL: 11549,
      XXL: 11550,
    };

    const variantId = size ? VARIANT_IDS[size] : undefined;
    if (!variantId) {
      console.error("[printful] unknown or missing size, skipping order:", size);
      return Response.json({ received: true });
    }

    const customerDetails = session.customer_details;

    const { status: createStatus, body: printfulData } = await createOrder({
      confirm: false,
      recipient: {
        name: customerDetails?.name || "Unknown",
        email: customerDetails?.email || "",
        address1: customerDetails?.address?.line1 || "",
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
              url: printFileUrl || "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/280px-PNG_transparency_demonstration_1.png",
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
      console.error("[printful] order creation failed", {
        status: createStatus,
        body: printfulData,
      });
      return Response.json({ error: "Printful order creation failed" }, { status: 500 });
    }

    const orderId = printfulData.result.id;

    // Test-only escape hatch: leaves the order in Printful's "draft" status
    // (created, visible in the dashboard, never queued for production/billing)
    // instead of confirming it. Gated on NODE_ENV so it can never be armed by
    // an env var alone in a deployed (production or preview) environment —
    // only `next dev` sets NODE_ENV to anything other than "production".
    const skipConfirm =
      process.env.PRINTFUL_SKIP_CONFIRM === "true" && process.env.NODE_ENV !== "production";

    if (skipConfirm) {
      console.log("[printful] PRINTFUL_SKIP_CONFIRM active — leaving order as draft, not confirming:", orderId);
    } else {
      const { body: confirmData } = await confirmOrder(orderId);
      console.log("[printful] order confirmed", confirmData);
    }

    // Order confirmation email. Deliberately best-effort: the Printful order
    // already exists at this point, so an email failure must never bubble up
    // and trigger a Stripe retry that would create a duplicate order.
    const recipient = customerDetails?.email;

    if (!recipient) {
      console.error("[email] no customer email on session, skipping:", session.id);
    } else {
      try {
        const emailData = {
          bread,
          meat,
          vegetables,
          sauces,
          size,
          amountPaid: formatAmount(session),
          reference: String(orderId),
          mockupUrl: printFileUrl || PRODUCT_MOCKUP_URL,
        };

        const { error } = await getResend().emails.send({
          from: ORDER_CONFIRMATION_FROM,
          to: recipient,
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
  }

  return Response.json({ received: true });
}