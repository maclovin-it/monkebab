// The single place that turns "we have a confirmed Printful shipment" into
// "the customer got (or didn't need) a tracking email" — shared by the
// Printful webhook route (app/api/printful/webhook/[secret]/route.ts) and
// the manual retry script (scripts/retry-shipment-notification.ts), so a
// manual retry runs through exactly the same claim/send/settle/alert logic
// as a real webhook delivery, never a simulated one.

import type { PrintfulOrder, PrintfulShipment } from '@/lib/printful';
import { getResend } from '@/lib/resend';
import {
  claimShipmentNotification,
  markShipmentNotificationSent,
  markShipmentNotificationFailed,
  type ShipmentNotificationClaim,
} from '@/lib/fulfillment/db';
import { sendShipmentNotificationFailedAlert } from '@/lib/emails/fulfillment-alert';
import {
  ORDER_SHIPPED_SUBJECT,
  renderOrderShippedHtml,
  renderOrderShippedText,
} from '@/lib/emails/order-shipped';

const ORDER_SHIPPED_FROM = 'Mon Kebab <commande@monkebab.xyz>';
// Real, human-monitored mailbox (OVH Zimbra) — see the matching constant in
// app/api/webhook/route.ts for why this isn't commande@monkebab.xyz itself.
const ORDER_SHIPPED_REPLY_TO = 'hello@monkebab.xyz';

export type NotifyShipmentOutcome =
  | 'sent'
  | 'already_sent'
  | 'in_progress'
  | 'failed'
  | 'missing_data';

/**
 * Sends (or correctly skips) the "order shipped" tracking email for one
 * Printful shipment. Always call this with an `order` fetched fresh from
 * Printful's authenticated API (never a webhook payload trusted as-is) —
 * both call sites already do this.
 *
 * - 'sent': Resend confirmed the email was accepted.
 * - 'already_sent' / 'in_progress': see claimShipmentNotification.
 * - 'missing_data': the order has no recipient email or this shipment has
 *   no tracking_url yet — nothing attempted or claimed (so a later retry,
 *   once Printful's data is complete, starts fresh rather than being
 *   blocked by a premature claim). Still alerts, since the customer still
 *   won't get an email either way.
 * - 'failed': the claim succeeded but Resend rejected/threw — alerted via
 *   sendShipmentNotificationFailedAlert, and the row is left 'failed' so
 *   a later call (webhook redelivery or the retry script) can reclaim it.
 */
export async function notifyShipment(params: {
  order: PrintfulOrder;
  shipment: PrintfulShipment;
}): Promise<NotifyShipmentOutcome> {
  const { order, shipment } = params;
  const recipientEmail = order.recipient?.email;

  if (!recipientEmail || !shipment.tracking_url) {
    const message = 'Missing recipient email or tracking info';
    console.error('[shipment-notify]', message, { orderId: order.id, shipmentId: shipment.id });
    await sendShipmentNotificationFailedAlert({
      printfulOrderId: String(order.id),
      printfulShipmentId: shipment.id,
      errorMessage: message,
    });
    return 'missing_data';
  }

  // Fails open (treats a DB error as 'claimed', proceeds to send) so a
  // missing table — e.g. the migration not applied yet — degrades to no
  // dedup rather than silently blocking every shipping email.
  let claim: ShipmentNotificationClaim = 'claimed';
  try {
    claim = await claimShipmentNotification({
      printfulShipmentId: shipment.id,
      printfulOrderId: String(order.id),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[shipment-notify] claimShipmentNotification failed, sending anyway:', message);
  }

  if (claim === 'already_sent' || claim === 'in_progress') {
    console.log(`[shipment-notify] shipment ${shipment.id} skipped (${claim})`);
    return claim;
  }

  try {
    const emailData = {
      reference: String(order.id),
      carrier: shipment.carrier,
      trackingNumber: shipment.tracking_number,
      trackingUrl: shipment.tracking_url,
    };

    // idempotencyKey: Resend's own dedup, independent of our DB — closes
    // the gap where Resend actually accepts the email but we crash or
    // lose the response before calling markShipmentNotificationSent; a
    // retry with the same key returns the original result instead of
    // sending a second email.
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
      console.error('[email] order shipped failed', error);
      await markShipmentNotificationFailed(shipment.id, error.message);
      await sendShipmentNotificationFailedAlert({
        printfulOrderId: String(order.id),
        printfulShipmentId: shipment.id,
        errorMessage: error.message,
      });
      return 'failed';
    }

    console.log('[email] order shipped sent');
    await markShipmentNotificationSent(shipment.id);
    return 'sent';
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown email error';
    console.error('[email] order shipped failed', message);
    await markShipmentNotificationFailed(shipment.id, message);
    await sendShipmentNotificationFailedAlert({
      printfulOrderId: String(order.id),
      printfulShipmentId: shipment.id,
      errorMessage: message,
    });
    return 'failed';
  }
}
