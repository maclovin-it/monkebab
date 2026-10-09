import { getOrder, type PrintfulShipment } from "@/lib/printful";
import { markShippedBestEffort } from "@/lib/fulfillment/db";
import { notifyShipment } from "@/lib/fulfillment/shipment-notify";

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
  // order (and which shipment within it) to look up. notifyShipment builds
  // the email entirely from this fresh, authenticated GET /orders/{id} call.
  const { status, body } = await getOrder(orderId);

  if (status !== 200 || !body?.result) {
    console.error("[printful-webhook] failed to fetch order", { orderId, status, body });
    return Response.json({ received: true });
  }

  const order = body.result;
  const shipments = order.shipments ?? [];
  const shipment: PrintfulShipment | undefined =
    shipments.find((s) => s.id === shipmentId) ?? shipments[shipments.length - 1];

  if (!shipment) {
    console.error("[printful-webhook] order has no shipments", { orderId, shipmentId });
    return Response.json({ received: true });
  }

  // Best-effort, purely informational for support lookups — never blocks or
  // fails the tracking email below.
  await markShippedBestEffort(String(orderId));

  // Claim, send, settle, and alert on failure — see
  // lib/fulfillment/shipment-notify.ts. Shared with
  // scripts/retry-shipment-notification.ts so a manual retry runs through
  // the exact same logic as a real webhook delivery.
  await notifyShipment({ order, shipment });

  // Always 200: Printful has no retry mechanism to rely on here regardless
  // (see notifyShipment's own alert-on-failure for why that's covered
  // another way), and a non-200 would just make Printful's webhook
  // dashboard report this endpoint as unhealthy for a failure that's
  // already been handled (alerted + left reclaimable).
  return Response.json({ received: true });
}
