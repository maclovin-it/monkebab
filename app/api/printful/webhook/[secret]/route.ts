import { getOrder, type PrintfulShipment } from "@/lib/printful";
import { getResend } from "@/lib/resend";
import {
  ORDER_SHIPPED_SUBJECT,
  renderOrderShippedHtml,
  renderOrderShippedText,
} from "@/lib/emails/order-shipped";

// In-memory only, same caveat as processedSessions in app/api/webhook/route.ts:
// does not survive cold starts, only de-dupes retries hitting the same warm
// instance.
const processedShipments = new Set<number>();

const ORDER_SHIPPED_FROM = "Mon Kebab <commande@monkebab.xyz>";

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

  if (shipmentId && processedShipments.has(shipmentId)) {
    console.log("[printful-webhook] shipment already processed, skipping:", shipmentId);
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

  if (shipmentId) processedShipments.add(shipmentId);

  try {
    const emailData = {
      reference: String(orderId),
      carrier: shipment.carrier,
      trackingNumber: shipment.tracking_number,
      trackingUrl: shipment.tracking_url,
    };

    const { error } = await getResend().emails.send({
      from: ORDER_SHIPPED_FROM,
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
