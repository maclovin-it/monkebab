// One-time backfill for real orders placed before order-stats existed
// (before this DATABASE_URL / orders table was set up).
//
// 1. Fill in HISTORICAL_ORDERS below with the real values for each order.
// 2. Run once:  DATABASE_URL="postgres://..." npx tsx scripts/backfill-historical-orders.ts
//
// Safe to re-run: each entry uses a synthetic `id` (never a real Stripe
// session id — those all start with "cs_"), and the same
// UNIQUE(stripe_session_id) + ON CONFLICT DO NOTHING mechanism used for real
// webhook-driven inserts applies here too, so re-running this script never
// creates duplicates and never collides with a real future sale.

import { neon } from '@neondatabase/serverless';
import { validateSelection, buildCombinationKey, type KebabSelection } from '../lib/design/options';

interface HistoricalOrder {
  /** Synthetic id — must be unique across this list, must never look like a
   * real Stripe session id (those start with "cs_"). */
  id: string;
  pain: string;
  viande: string;
  crudites: string[];
  sauces: string[];
  /** ISO date (e.g. "2026-07-15") or full timestamp — when the order was
   * actually placed, so stats reflect real history rather than today. */
  date: string;
}

const HISTORICAL_ORDERS: HistoricalOrder[] = [
  // TODO: remplacer par les vraies commandes avant de lancer ce script, par exemple :
  // { id: 'historical-001', pain: 'Naan', viande: 'Kebab', crudites: ['Salade', 'Tomate'], sauces: ['Algérienne'], date: '2026-07-01' },
];

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('Missing DATABASE_URL environment variable');
  }

  if (HISTORICAL_ORDERS.length === 0) {
    console.log('HISTORICAL_ORDERS is empty — fill it in with the real historical orders before running this script.');
    return;
  }

  const sql = neon(connectionString);
  const seenIds = new Set<string>();

  for (const order of HISTORICAL_ORDERS) {
    if (order.id.startsWith('cs_')) {
      console.error(`Skipping ${order.id}: looks like a real Stripe session id, not a synthetic backfill id.`);
      continue;
    }
    if (seenIds.has(order.id)) {
      console.error(`Skipping ${order.id}: duplicate id within HISTORICAL_ORDERS.`);
      continue;
    }
    seenIds.add(order.id);

    const selection: KebabSelection = {
      pain: order.pain,
      viande: order.viande,
      crudites: order.crudites,
      sauces: order.sauces,
    };

    const validation = validateSelection(selection);
    if (!validation.ok) {
      console.error(`Skipping ${order.id}: invalid selection`, validation.errors);
      continue;
    }

    const combinationKey = buildCombinationKey(selection);

    await sql`
      INSERT INTO orders (stripe_session_id, pain, viande, crudites, sauces, combination_key, created_at)
      VALUES (${order.id}, ${selection.pain}, ${selection.viande}, ${selection.crudites}, ${selection.sauces}, ${combinationKey}, ${order.date})
      ON CONFLICT (stripe_session_id) DO NOTHING
    `;

    console.log(`OK: ${order.id} -> ${combinationKey}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
