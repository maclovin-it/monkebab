import { getSql } from '@/lib/stats/db';

// Durable state for the Stripe -> Printful pipeline (db/migrations/0002).
// Separate from lib/stats/db.ts's `orders` table (stats only, no PII) —
// this is the single source of truth the webhook consults instead of an
// in-memory Set, so a cold start or a replay on a different instance sees
// exactly what a prior attempt already accomplished.

export type FulfillmentStatus = 'processing' | 'printful_created' | 'confirmed' | 'failed' | 'shipped';

export interface Fulfillment {
  id: number;
  stripeSessionId: string;
  printfulOrderId: string | null;
  status: FulfillmentStatus;
  email: string | null;
  size: string | null;
  createdAt: string;
  updatedAt: string;
}

interface FulfillmentRow {
  id: number | string;
  stripe_session_id: string;
  printful_order_id: string | null;
  status: string;
  email: string | null;
  size: string | null;
  created_at: string;
  updated_at: string;
}

function mapRow(row: FulfillmentRow): Fulfillment {
  return {
    id: Number(row.id),
    stripeSessionId: row.stripe_session_id,
    printfulOrderId: row.printful_order_id,
    status: row.status as FulfillmentStatus,
    email: row.email,
    size: row.size,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getFulfillment(stripeSessionId: string): Promise<Fulfillment | null> {
  const sql = getSql();
  const rows = (await sql`
    SELECT * FROM fulfillments WHERE stripe_session_id = ${stripeSessionId}
  `) as FulfillmentRow[];
  return rows[0] ? mapRow(rows[0]) : null;
}

/** Get-or-create, atomically — a race between two near-simultaneous webhook
 * deliveries for the same session both land here safely: the UPSERT's
 * no-op DO UPDATE still returns the single row that ends up in the table,
 * whichever request's INSERT actually won. */
export async function getOrCreateFulfillment(params: {
  stripeSessionId: string;
  email?: string;
  size?: string;
}): Promise<Fulfillment> {
  const sql = getSql();
  const rows = (await sql`
    INSERT INTO fulfillments (stripe_session_id, status, email, size)
    VALUES (${params.stripeSessionId}, 'processing', ${params.email ?? null}, ${params.size ?? null})
    ON CONFLICT (stripe_session_id) DO UPDATE SET updated_at = fulfillments.updated_at
    RETURNING *
  `) as FulfillmentRow[];
  return mapRow(rows[0]);
}

export async function markPrintfulCreated(stripeSessionId: string, printfulOrderId: string): Promise<void> {
  const sql = getSql();
  await sql`
    UPDATE fulfillments
    SET printful_order_id = ${printfulOrderId}, status = 'printful_created', updated_at = now()
    WHERE stripe_session_id = ${stripeSessionId}
  `;
}

export async function markConfirmed(stripeSessionId: string): Promise<void> {
  const sql = getSql();
  await sql`
    UPDATE fulfillments SET status = 'confirmed', updated_at = now()
    WHERE stripe_session_id = ${stripeSessionId}
  `;
}

export async function markFailed(stripeSessionId: string): Promise<void> {
  const sql = getSql();
  await sql`
    UPDATE fulfillments SET status = 'failed', updated_at = now()
    WHERE stripe_session_id = ${stripeSessionId}
  `;
}

/** Best-effort, called from the Printful shipment webhook — never throws
 * into that caller (mirrors recordSaleBestEffort's contract). Keyed by
 * printful_order_id since that webhook has no Stripe session id at all. */
export async function markShippedBestEffort(printfulOrderId: string): Promise<void> {
  try {
    const sql = getSql();
    await sql`
      UPDATE fulfillments SET status = 'shipped', updated_at = now()
      WHERE printful_order_id = ${printfulOrderId}
    `;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown fulfillment update error';
    console.error('[fulfillment] failed to mark shipped', message);
  }
}
