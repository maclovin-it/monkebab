import { getOrder, type PrintfulShipment } from "@/lib/printful";
import { getResend } from "@/lib/resend";
import {
  markShippedBestEffort,
  claimShipmentNotification,
  markShipmentNotificationSent,
  markShipmentNotificationFailed,
} from "@/lib/fulfillment/db";
import {
  ORDER_SHIPPED_SUBJECT,
  renderOrderShippedHtml,
  renderOrderShippedText,
} from "@/lib/emails/order-shipped";

const ORDER_SHIPPED_FROM = "Mon Kebab <commande@monkebab.xyz>";
// Real, human-monitored mailbox (OVH Zimbra) — see the matching constant in
// app/api/webhook/route.ts for why this isn't commande@monkebab.xyz itself.
const ORDER_SHIPPED_REPLY_TO = "hello@monkebab.xyz";

interface PackageShippedPayload {
  type?: string;
  data?: {
    shipment?: { id?: number };
    order?: { id?: number };
  };
}

export async function POST(request: Request, { params }: { params: Promise<{ secret: string }> }) {
  const { secret } = await params;
  const expectedSecret = process.env.PRINTFUL_WEBHOOK_SECRET;

  if (!expectedSecret || secret !== expectedSecret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let event: PackageShippedPayload;
  try {
    event = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (event.type !== "package_shipped") {
    return Response.json({ received: true });
  }

  const shipmentId = event.data?.shipment?.id;
  const orderId = event.data?.order?.id;

  if (!orderId) {
    console.error("[printful-webhook] package_shipped payload missing order id");
    return Response.json({ received: true });
  }

  // Never trust the incoming payload for tracking/recipient data — the
  // webhook isn't signed by Printful, so it's only used here to learn which
  // order to look up. The email is built entirely from a fresh, authenticated
  // GET /orders/{id} call.
  const { status, body } = await getOrder(orderId);

  if (status !== 200 || !body?.result) {
    console.error("[printful-webhook] failed to fetch order", { orderId, status, body });
    return Response.json({ received: true });
  }

  const order = body.result;
  const recipientEmail = order.recipient?.email;
  const shipments = order.shipments ?? [];
  const shipment: PrintfulShipment | undefined =
    shipments.find((s) => s.id === shipmentId) ?? shipments[shipments.length - 1];

  if (!recipientEmail || !shipment?.tracking_url) {
    console.error("[printful-webhook] missing recipient email or tracking info", { orderId, shipmentId });
    return Response.json({ received: true });
  }

  // Persistent, race-safe idempotency gate — replaces the old in-memory Set,
  // which didn't survive a serverless cold start and only ever keyed on the
  // payload's own (optional, unsigned) shipment id. Keyed here on
  // shipment.id from the authenticated GET /orders/{id} response instead —
  // always present once a shipment exists, unlike the payload's.
  //
  // Importantly, this is a *claim*, not a "sent" record: "a row exists" and
  // "the email was actually confirmed sent" are different facts (see
  // db/migrations/0003_create_shipment_notifications.sql and
  // claimShipmentNotification's own doc comment) — markShipmentNotificationSent
  // / ...Failed below are what actually settle that distinction, so a crash
  // or a Resend failure between claiming and settling leaves the row
  // reclaimable by a later webhook redelivery instead of permanently
  // "handled". A genuinely distinct shipment (a second package on the same
  // order) always gets its own row/claim regardless.
  //
  // Fails open (treats a DB error as 'claimed', proceeds to send) so a
  // missing table — e.g. the migration not applied yet — degrades to the
  // old no-dedup behavior instead of silently blocking every shipping email.
  let claim: "claimed" | "already_sent" | "in_progress" = "claimed";
  try {
    claim = await claimShipmentNotification({
      printfulShipmentId: shipment.id,
      printfulOrderId: String(orderId),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[printful-webhook] claimShipmentNotification failed, sending anyway:", message);
  }

  if (claim === "already_sent" || claim === "in_progress") {
    console.log(`[printful-webhook] shipment ${shipment.id} skipped (${claim})`);
    return Response.json({ received: true });
  }

  // Best-effort, purely informational for support lookups — never blocks or
  // fails the tracking email below.
  await markShippedBestEffort(String(orderId));

  try {
    const emailData = {
      reference: String(orderId),
      carrier: shipment.carrier,
      trackingNumber: shipment.tracking_number,
      trackingUrl: shipment.tracking_url,
    };

    // idempotencyKey: Resend's own dedup, independent of our DB — the
    // second, finer-grained layer that closes the gap our claim alone
    // can't: if this exact request actually reaches Resend and succeeds,
    // but we crash or lose the response before calling
    // markShipmentNotificationSent below, a retry would otherwise re-claim
    // and re-call send(). With the same key, Resend returns the original
    // result instead of sending a second email. See this function's call
    // site doc comment above for why a true "exactly once" guarantee still
    // isn't possible across two independent systems (Resend + our DB) —
    // this closes the most likely gap, not every theoretical one.
    const { error } = await getResend().emails.send(
      {
        from: ORDER_SHIPPED_FROM,
        replyTo: ORDER_SHIPPED_REPLY_TO,
        to: recipientEmail,
        subject: ORDER_SHIPPED_SUBJECT,
        html: renderOrderShippedHtml(emailData),
        text: renderOrderShippedText(emailData),
      },
      { idempotencyKey: `shipment-shipped-${shipment.id}` }
    );

    if (error) {
      console.error("[email] order shipped failed", error);
      await markShipmentNotificationFailed(shipment.id, error.message);
    } else {
      console.log("[email] order shipped sent");
      await markShipmentNotificationSent(shipment.id);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown email error";
    console.error("[email] order shipped failed", message);
    await markShipmentNotificationFailed(shipment.id, message);
  }

  return Response.json({ received: true });
}
