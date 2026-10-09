import { getOrder, type PrintfulShipment } from "@/lib/printful";
import { getResend } from "@/lib/resend";
import { markShippedBestEffort, recordShipmentNotification } from "@/lib/fulfillment/db";
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
  // which didn't survive a serverless cold start (so a Printful webhook
  // retry after a cold start could resend the same tracking email) and only
  // ever keyed on the payload's own (optional, unsigned) shipment id. Keyed
  // here on shipment.id from the authenticated GET /orders/{id} response
  // instead — always present once a shipment exists, unlike the payload's.
  //
  // Reserves the row *before* sending (same ordering the old Set used, just
  // made durable): a genuinely distinct shipment — a second package on the
  // same order — still gets its own row and its own email; only a retry of
  // the *same* shipment id is suppressed. The trade-off this ordering
  // accepts, same as before: if the Resend call below fails after the row
  // is reserved, a later webhook redelivery for that exact shipment won't
  // retry the email — see db/migrations/0003_create_shipment_notifications.sql.
  //
  // Fails open (proceeds to send) on a database error — e.g. the migration
  // not applied yet — so a missing table degrades to the old no-dedup
  // behavior instead of silently blocking every shipping email.
  let shouldNotify = true;
  try {
    shouldNotify = await recordShipmentNotification({
      printfulShipmentId: shipment.id,
      printfulOrderId: String(orderId),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[printful-webhook] recordShipmentNotification failed, sending anyway:", message);
  }

  if (!shouldNotify) {
    console.log("[printful-webhook] shipment already notified, skipping:", shipment.id);
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

    const { error } = await getResend().emails.send({
      from: ORDER_SHIPPED_FROM,
      replyTo: ORDER_SHIPPED_REPLY_TO,
      to: recipientEmail,
      subject: ORDER_SHIPPED_SUBJECT,
      html: renderOrderShippedHtml(emailData),
      text: renderOrderShippedText(emailData),
    });

    if (error) {
      console.error("[email] order shipped failed", error);
    } else {
      console.log("[email] order shipped sent");
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown email error";
    console.error("[email] order shipped failed", message);
  }

  return Response.json({ received: true });
}
