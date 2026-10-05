// Server-side GA4 purchase event — fired from the Stripe webhook
// (app/api/webhook/route.ts, right after markConfirmed()), not from the
// client. That call site is already proven exactly-once by the idempotent
// fulfillment pipeline (lib/fulfillment/db.ts), so "purchase" inherits that
// guarantee for free instead of needing its own dedup logic, and doesn't
// depend on the customer's browser ever reaching a /success page (closed
// tab, ad blocker, JS disabled — none of that affects measurement).
//
// Uses GA4's Measurement Protocol (https://www.google-analytics.com/mp/collect),
// a plain server-to-server POST — requires GA4_API_SECRET (created in GA4
// Admin > Data Streams > your stream > Measurement Protocol API secrets),
// separate from the public NEXT_PUBLIC_GA_MEASUREMENT_ID.

import { GA_MEASUREMENT_ID } from './ga';
import { randomUUID } from 'node:crypto';

export interface PurchaseEventData {
  /** GA4 client_id captured client-side at checkout_started, threaded
   * through Stripe metadata — links this purchase back to the same
   * visitor's funnel. Falls back to a throwaway id (purchase still
   * recorded, just not stitched to the earlier funnel) when unavailable —
   * e.g. consent not given, or gtag never loaded. */
  clientId?: string | null;
  /** Printful order id — not a Stripe identifier, already the reference
   * shown to the customer in the order-confirmation email. */
  transactionId: string;
  value: number;
  currency: string;
  size?: string;
}

/** Best-effort — never throws. A failure here must never affect the
 * fulfillment pipeline that called it; only console.error. */
export async function sendPurchaseEvent(data: PurchaseEventData): Promise<void> {
  const apiSecret = process.env.GA4_API_SECRET;

  // Same production-only gate as the client-side script load (lib/analytics/ga.ts
  // isn't loaded at all outside production) — keeps local/test runs (and the
  // webhook-replay tests used to verify this very pipeline) out of real GA4 data.
  if (process.env.NODE_ENV !== 'production') return;

  if (!GA_MEASUREMENT_ID || !apiSecret) {
    console.error('[ga4] NEXT_PUBLIC_GA_MEASUREMENT_ID or GA4_API_SECRET not set, skipping purchase event');
    return;
  }

  const clientId = data.clientId || randomUUID();

  try {
    const res = await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${GA_MEASUREMENT_ID}&api_secret=${apiSecret}`,
      {
        method: 'POST',
        body: JSON.stringify({
          client_id: clientId,
          events: [
            {
              name: 'purchase',
              params: {
                transaction_id: data.transactionId,
                value: data.value,
                currency: data.currency,
                items: [
                  {
                    item_name: 'T-shirt Mon Kebab',
                    item_variant: data.size,
                    quantity: 1,
                    price: data.value,
                  },
                ],
              },
            },
          ],
        }),
      }
    );

    if (!res.ok) {
      console.error('[ga4] purchase event rejected', res.status, await res.text().catch(() => ''));
    } else {
      console.log('[ga4] purchase event sent for', data.transactionId);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[ga4] failed to send purchase event', message);
  }
}
