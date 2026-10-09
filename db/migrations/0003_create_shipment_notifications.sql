-- Persistent idempotency for the "order shipped" email
-- (app/api/printful/webhook/[secret]/route.ts). Replaces an in-memory Set,
-- which didn't survive a serverless cold start and could let a retried
-- Printful webhook resend the same tracking email — same class of problem
-- 0002_create_fulfillments.sql already solved for the Stripe -> Printful
-- pipeline, applied here to the shipment-notification step.
--
-- One row per Printful shipment id, not per order: a multi-package order
-- has several distinct shipments, and each one should still get its own
-- email and its own row here.
--
-- Critically, a row existing is NOT the same fact as "the email was
-- actually sent" — that's why this has a `status` column instead of just a
-- UNIQUE constraint to insert against. Without it, a row inserted right
-- before the Resend call (to win a race against a concurrent delivery)
-- would look identical whether that call later succeeded, failed, or the
-- function crashed before even attempting it — and a later webhook replay
-- (Printful can resend the same event hours later) would wrongly treat all
-- three the same way ("a row exists, skip"), permanently losing any
-- notification that failed or crashed before completing.
--
-- status values (plain TEXT, no CHECK constraint, same convention as
-- fulfillments.status in 0002 — a future status doesn't require a
-- migration):
--   pending  -- claimed, Resend call not yet settled (in flight, or the
--              function crashed before reaching markShipmentNotificationSent
--              / ...Failed — see claimShipmentNotification in
--              lib/fulfillment/db.ts for how a stale 'pending' row, older
--              than its 2-minute staleness window, becomes reclaimable)
--   sent     -- Resend confirmed the email was accepted — terminal, never
--              reclaimed again
--   failed   -- Resend rejected the request or threw — reclaimable by the
--              next webhook delivery for the same shipment
--
-- attempts / last_error are diagnostic only (how many times this shipment
-- has been claimed, and why the most recent failure happened) — nothing
-- in the application logic branches on attempts having a specific value;
-- there's no max-retry cutoff.
--
-- PROPOSED, NOT YET APPLIED — run this once against the same Neon database
-- as 0001/0002 (SQL editor, or `psql`) before relying on this fix in
-- production. Until it's applied, claimShipmentNotification() fails open
-- (logs the error, sends the email anyway) rather than blocking shipping
-- emails entirely — see that function's doc comment in lib/fulfillment/db.ts.

CREATE TABLE IF NOT EXISTS shipment_notifications (
  id                    BIGSERIAL PRIMARY KEY,

  printful_shipment_id  BIGINT NOT NULL UNIQUE,
  printful_order_id     TEXT NOT NULL,

  status                TEXT NOT NULL DEFAULT 'pending',
  attempts              INT NOT NULL DEFAULT 0,
  last_error            TEXT,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shipment_notifications_printful_order_id ON shipment_notifications (printful_order_id);
CREATE INDEX IF NOT EXISTS idx_shipment_notifications_status ON shipment_notifications (status);
