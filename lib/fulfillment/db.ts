import { getSql } from '@/lib/stats/db';
import { sendFulfillmentFailedAlert } from '@/lib/emails/fulfillment-alert';

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

/** Marks the fulfillment failed and fires the internal alert exactly once
 * from this single call site — every place that can fail (missing variant,
 * createOrder, confirmOrder — see app/api/webhook/route.ts) just calls this
 * with a bit of context instead of separately wiring up its own alert. */
export async function markFailed(
  stripeSessionId: string,
  context?: { step: string; errorMessage: string }
): Promise<void> {
  const sql = getSql();
  const rows = (await sql`
    UPDATE fulfillments SET status = 'failed', updated_at = now()
    WHERE stripe_session_id = ${stripeSessionId}
    RETURNING *
  `) as FulfillmentRow[];

  const fulfillment = rows[0] ? mapRow(rows[0]) : null;

  await sendFulfillmentFailedAlert({
    stripeSessionId,
    printfulOrderId: fulfillment?.printfulOrderId ?? null,
    step: context?.step,
    errorMessage: context?.errorMessage,
  });
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

export interface ClaimShipmentNotificationParams {
  printfulShipmentId: number;
  printfulOrderId: string;
}

export type ShipmentNotificationClaim = 'claimed' | 'already_sent' | 'in_progress';

// How long a row can sit at status 'pending' before a later delivery is
// allowed to reclaim it. Must comfortably exceed how long a single webhook
// invocation can plausibly run (Resend call + our own writes) — 2 minutes
// is generous slack above that, not a tight timeout, so a redelivery can
// only mistake a slow-but-live attempt for a crashed one in a genuinely
// pathological case.
const STALE_CLAIM_SQL_INTERVAL = '2 minutes';

/**
 * Atomically claims the right to send the "order shipped" email for one
 * Printful shipment — see db/migrations/0003_create_shipment_notifications.sql
 * for the full reasoning. A row existing is *not* the same fact as "the
 * email was sent": this only reserves the attempt; markShipmentNotificationSent
 * / ...Failed (below) are what settle it, called from the webhook route
 * once the Resend call actually resolves.
 *
 * Three outcomes:
 * - 'claimed': either the first time this shipment has ever been seen, or
 *   a previous attempt ended in 'failed' (Resend rejected/threw), or a
 *   previous attempt is stuck at 'pending' for longer than
 *   STALE_CLAIM_SQL_INTERVAL (the function likely crashed mid-flight,
 *   between claiming and settling) — in every case, go ahead and send.
 * - 'already_sent': a previous attempt already confirmed delivery to
 *   Resend. Skip — this is the common case for a genuine webhook replay
 *   hours or days later.
 * - 'in_progress': another delivery is actively mid-flight for this exact
 *   shipment right now (status 'pending', still fresh). Skip and trust it
 *   to finish rather than racing it — see the staleness window above.
 *
 * Insert-first, then a guarded reclaim UPDATE whose WHERE clause only
 * matches a row that's genuinely 'failed' or stale-'pending', mirrors the
 * ON-CONFLICT-as-dedup-signal pattern already used by recordSale() and
 * getOrCreateFulfillment() elsewhere in this codebase — extended with a
 * status column because, unlike those two, "a row exists" alone isn't
 * enough information here. The reclaim UPDATE's WHERE clause is what
 * keeps two concurrent reclaim attempts from both succeeding: Postgres
 * serializes the two UPDATEs on the same row, and the second one's WHERE
 * clause no longer matches once the first has already flipped the status.
 *
 * Throws on a database error (e.g. the migration not yet applied) — the
 * caller decides whether to fail open or closed.
 */
export async function claimShipmentNotification(
  params: ClaimShipmentNotificationParams
): Promise<ShipmentNotificationClaim> {
  const sql = getSql();

  const inserted = (await sql`
    INSERT INTO shipment_notifications (printful_shipment_id, printful_order_id, status, attempts)
    VALUES (${params.printfulShipmentId}, ${params.printfulOrderId}, 'pending', 1)
    ON CONFLICT (printful_shipment_id) DO NOTHING
    RETURNING id
  `) as { id: number }[];

  if (inserted.length > 0) return 'claimed';

  const reclaimed = (await sql`
    UPDATE shipment_notifications
    SET status = 'pending', attempts = attempts + 1, last_error = NULL, updated_at = now()
    WHERE printful_shipment_id = ${params.printfulShipmentId}
      AND (status = 'failed' OR (status = 'pending' AND updated_at < now() - ${STALE_CLAIM_SQL_INTERVAL}::interval))
    RETURNING id
  `) as { id: number }[];

  if (reclaimed.length > 0) return 'claimed';

  const rows = (await sql`
    SELECT status FROM shipment_notifications WHERE printful_shipment_id = ${params.printfulShipmentId}
  `) as { status: string }[];

  return rows[0]?.status === 'sent' ? 'already_sent' : 'in_progress';
}

/** Best-effort, settles a claimShipmentNotification() 'claimed' outcome
 * once Resend has confirmed the email was actually accepted. Never throws
 * into the caller — mirrors markShippedBestEffort's contract. */
export async function markShipmentNotificationSent(printfulShipmentId: number): Promise<void> {
  try {
    const sql = getSql();
    await sql`
      UPDATE shipment_notifications SET status = 'sent', updated_at = now()
      WHERE printful_shipment_id = ${printfulShipmentId}
    `;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[fulfillment] failed to mark shipment notification sent', message);
  }
}

/** Best-effort, settles a claimShipmentNotification() 'claimed' outcome as
 * failed — leaves the row reclaimable by a later webhook redelivery
 * (see claimShipmentNotification's reclaim WHERE clause) instead of stuck
 * at 'pending' until the staleness window expires. Never throws into the
 * caller. */
export async function markShipmentNotificationFailed(
  printfulShipmentId: number,
  errorMessage: string
): Promise<void> {
  try {
    const sql = getSql();
    await sql`
      UPDATE shipment_notifications SET status = 'failed', last_error = ${errorMessage}, updated_at = now()
      WHERE printful_shipment_id = ${printfulShipmentId}
    `;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[fulfillment] failed to mark shipment notification failed', message);
  }
}
