// Internal alerts — not customer-facing emails. Sent best-effort, the
// moment something in the Stripe/Printful/Resend pipeline needs a human to
// look at it, so it gets noticed immediately instead of only showing up in
// Vercel logs or a manual SQL query.
//
// Deliberately plain text, no branded template — these exist for one
// person to read in an inbox, not to represent the brand.

import { getResend } from '@/lib/resend';

const FULFILLMENT_ALERT_FROM = 'Mon Kebab <commande@monkebab.xyz>';

export interface FulfillmentFailedAlertData {
  stripeSessionId: string;
  printfulOrderId?: string | null;
  /** Which step failed, e.g. "variant_lookup", "printful_create", "printful_confirm". */
  step?: string;
  errorMessage?: string;
}

function renderText(data: FulfillmentFailedAlertData): string {
  return [
    'Un fulfillment vient de passer en FAILED.',
    '',
    `Session Stripe   : ${data.stripeSessionId}`,
    `Commande Printful: ${data.printfulOrderId ?? '(aucune)'}`,
    `Étape            : ${data.step ?? '(non précisée)'}`,
    `Erreur           : ${data.errorMessage ?? '(non précisée)'}`,
    `Environnement    : ${process.env.NODE_ENV ?? '(inconnu)'}`,
    `Horodatage       : ${new Date().toISOString()}`,
  ].join('\n');
}

/** Best-effort — never throws. Called from markFailed() (lib/fulfillment/db.ts)
 * so every path that marks a fulfillment failed alerts exactly once, with no
 * separate call needed at each failure site. A Resend failure here must
 * never mask or replace the real fulfillment error that triggered this —
 * it's only logged via console.error. */
export async function sendFulfillmentFailedAlert(data: FulfillmentFailedAlertData): Promise<void> {
  const to = process.env.FULFILLMENT_ALERT_EMAIL;

  if (!to) {
    console.error('[fulfillment-alert] FULFILLMENT_ALERT_EMAIL not set, skipping alert email', data);
    return;
  }

  try {
    const { error } = await getResend().emails.send({
      from: FULFILLMENT_ALERT_FROM,
      to,
      subject: `🚨 Fulfillment échoué — ${data.stripeSessionId}`,
      text: renderText(data),
    });

    if (error) {
      console.error('[fulfillment-alert] Resend returned an error', error);
    } else {
      console.log('[fulfillment-alert] alert sent for', data.stripeSessionId);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[fulfillment-alert] failed to send alert email', message);
  }
}

export interface ShipmentNotificationFailedAlertData {
  printfulOrderId: string;
  printfulShipmentId: number;
  errorMessage: string;
}

function renderShipmentText(data: ShipmentNotificationFailedAlertData): string {
  return [
    "Un e-mail de suivi d'expédition n'a pas pu être envoyé.",
    '',
    `Commande Printful : ${data.printfulOrderId}`,
    `Colis (shipment)  : ${data.printfulShipmentId}`,
    `Erreur            : ${data.errorMessage}`,
    `Environnement     : ${process.env.NODE_ENV ?? '(inconnu)'}`,
    `Horodatage        : ${new Date().toISOString()}`,
    '',
    'Pour relancer cet envoi sans attendre un nouveau webhook Printful :',
    `  npx tsx scripts/retry-shipment-notification.ts --order-id=${data.printfulOrderId} --shipment-id=${data.printfulShipmentId}`,
  ].join('\n');
}

/** Best-effort — never throws, and deliberately never retries itself: a
 * Resend failure here is only logged (console.error), never re-alerted,
 * so a broken alert channel can't turn into its own alert loop. Called
 * from notifyShipment() (lib/fulfillment/shipment-notify.ts) exactly once
 * per failed send attempt, so a customer who was going to miss a tracking
 * email doesn't also go unnoticed internally — this is the one case that
 * has no other safety net, since the webhook route always answers
 * Printful with 200 regardless of what happened here, so Printful itself
 * has no reason to redeliver. Does NOT cover a notification stuck at
 * 'pending' after a mid-flight crash — that case never reaches this
 * function at all (the crash prevents it); see
 * listReclaimableShipmentNotifications() in lib/fulfillment/db.ts for how
 * that's found instead. */
export async function sendShipmentNotificationFailedAlert(data: ShipmentNotificationFailedAlertData): Promise<void> {
  const to = process.env.FULFILLMENT_ALERT_EMAIL;

  if (!to) {
    console.error('[fulfillment-alert] FULFILLMENT_ALERT_EMAIL not set, skipping alert email', data);
    return;
  }

  try {
    const { error } = await getResend().emails.send({
      from: FULFILLMENT_ALERT_FROM,
      to,
      subject: `🚨 E-mail de suivi échoué — commande ${data.printfulOrderId}`,
      text: renderShipmentText(data),
    });

    if (error) {
      console.error('[fulfillment-alert] Resend returned an error', error);
    } else {
      console.log('[fulfillment-alert] shipment alert sent for', data.printfulOrderId, data.printfulShipmentId);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[fulfillment-alert] failed to send shipment alert email', message);
  }
}
