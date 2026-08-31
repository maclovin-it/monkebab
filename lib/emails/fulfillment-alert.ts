// Internal alert — not a customer-facing email. Sent once, best-effort, the
// moment a fulfillment (Stripe -> Printful pipeline, see lib/fulfillment/db.ts)
// is marked `failed`, so a paid order that didn't make it to Printful gets
// noticed immediately instead of only showing up in Vercel logs or a manual
// SQL query against `fulfillments`.
//
// Deliberately plain text, no branded template — this exists for one person
// to read in an inbox, not to represent the brand.

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
