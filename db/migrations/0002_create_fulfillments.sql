-- Durable fulfillment state — makes the Stripe -> Printful order pipeline
-- idempotent across cold starts and webhook replays. Separate from `orders`
-- (stats-only, no PII, see 0001_create_orders.sql) — this table exists
-- purely to answer "did we already handle this paid session, and how far
-- did we get" without relying on an in-memory Set that a fresh serverless
-- instance never sees.
--
-- status values (plain TEXT, no CHECK constraint so a future status like
-- 'shipped' doesn't require a migration):
--   processing        -- session confirmed paid, Printful order not yet created
--   printful_created  -- POST /orders succeeded, printful_order_id persisted
--   confirmed         -- POST /orders/{id}/confirm succeeded — the only
--                        status that triggers the confirmation email
--   failed            -- create or confirm failed; retried on the next
--                        webhook delivery by re-checking printful_order_id
--   shipped           -- (optional, set by the Printful webhook) order
--                        confirmed as shipped — not required for fulfillment
--                        logic, purely informational for support lookups
--
-- Minimal PII: email + size only — no address, no composition (composition
-- already lives in `orders` for stats; address lives in Stripe/Printful,
-- not duplicated here).
--
-- Run this once against the same Neon database as 0001_create_orders.sql
-- (SQL editor, or `psql`).

CREATE TABLE IF NOT EXISTS fulfillments (
  id                  BIGSERIAL PRIMARY KEY,

  -- Sole idempotency key for the whole create->confirm pipeline. Also sent
  -- to Printful as the order's external_id, so a lost response after a
  -- successful POST /orders can be recovered via GET /orders/@{external_id}
  -- instead of blindly creating a second order.
  stripe_session_id   TEXT NOT NULL UNIQUE,

  printful_order_id   TEXT,
  status              TEXT NOT NULL DEFAULT 'processing',

  email               TEXT,
  size                TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fulfillments_status ON fulfillments (status);
CREATE INDEX IF NOT EXISTS idx_fulfillments_printful_order_id ON fulfillments (printful_order_id);
