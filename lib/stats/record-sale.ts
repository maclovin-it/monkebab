import { getSql } from './db';
import {
  validateSelection,
  buildCombinationKey,
  canonicalCrudites,
  canonicalSauces,
  type KebabSelection,
} from '@/lib/design/options';

export interface RecordSaleParams {
  /** Stripe Checkout Session id — the sole deduplication key. */
  stripeSessionId: string;
  /** Raw Stripe metadata fields, as stored by /api/checkout (bread/meat are
   * single values, vegetables/sauces are comma-joined strings). */
  bread?: string;
  meat?: string;
  vegetables?: string;
  sauces?: string;
}

/**
 * Records a paid sale for stats purposes only — no personal data, no
 * popularity/rarity computed or stored here (those are derived later, on
 * demand, from the raw rows). Deduplicated at the database level via the
 * UNIQUE constraint on stripe_session_id + ON CONFLICT DO NOTHING, so this
 * is safe to call multiple times for the same session (Stripe retries,
 * or both checkout.session.completed and checkout.session.async_payment_succeeded
 * firing for the same session).
 *
 * Never throws into the caller for anything other than a missing/invalid
 * DATABASE_URL — callers should still wrap this in try/catch, since a stats
 * write failing must never break order fulfillment.
 */
export async function recordSale(params: RecordSaleParams): Promise<void> {
  const selection: KebabSelection = {
    pain: params.bread ?? '',
    viande: params.meat ?? '',
    crudites: params.vegetables ? params.vegetables.split(',').filter(Boolean) : [],
    sauces: params.sauces ? params.sauces.split(',').filter(Boolean) : [],
  };

  const validation = validateSelection(selection);
  if (!validation.ok) {
    console.error('[stats] refusing to record invalid selection', {
      stripeSessionId: params.stripeSessionId,
      errors: validation.errors,
    });
    return;
  }

  const combinationKey = buildCombinationKey(selection);
  // Store crudités/sauces in the same canonical (menu) order used for the
  // combination_key — not click order. This keeps every raw column safe to
  // GROUP BY directly later (e.g. most common sauce *pair*), not just via
  // unnest() for single-item stats, without needing to re-sort at query time.
  const crudites = canonicalCrudites(selection.crudites);
  const sauces = canonicalSauces(selection.sauces);
  const sql = getSql();

  await sql`
    INSERT INTO orders (stripe_session_id, pain, viande, crudites, sauces, combination_key)
    VALUES (${params.stripeSessionId}, ${selection.pain}, ${selection.viande}, ${crudites}, ${sauces}, ${combinationKey})
    ON CONFLICT (stripe_session_id) DO NOTHING
  `;
}
