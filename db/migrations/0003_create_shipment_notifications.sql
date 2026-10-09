-- Persistent idempotency for the "order shipped" email
-- (app/api/printful/webhook/[secret]/route.ts). Replaces an in-memory Set,
-- which didn't survive a serverless cold start and could let a retried
-- Printful webhook resend the same tracking email — same class of problem
-- 0002_create_fulfillments.sql already solved for the Stripe -> Printful
-- pipeline, applied here to the shipment-notification step.
--
-- One row per Printful shipment id, not per order: a multi-package order
-- has several distinct shipments, and each one should still get its own
-- email and its own row here. The INSERT's UNIQUE conflict on
-- printful_shipment_id is the sole dedup signal — same ON CONFLICT DO
-- NOTHING pattern as `orders.stripe_session_id` (0001) and
-- `fulfillments.stripe_session_id` (0002).
--
-- PROPOSED, NOT YET APPLIED — run this once against the same Neon database
-- as 0001/0002 (SQL editor, or `psql`) before relying on this fix in
-- production. Until it's applied, the webhook route's call to
-- recordShipmentNotification() fails open (logs the error, sends the email
-- anyway) rather than blocking shipping emails entirely — see that
-- function's doc comment in lib/fulfillment/db.ts.

CREATE TABLE IF NOT EXISTS shipment_notifications (
  id                    BIGSERIAL PRIMARY KEY,

  printful_shipment_id  BIGINT NOT NULL UNIQUE,
  printful_order_id     TEXT NOT NULL,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shipment_notifications_printful_order_id ON shipment_notifications (printful_order_id);
