-- Order stats collection — raw sales data only. No personal data (no name,
-- email, address, phone). Popularity and rarity are computed on demand from
-- these rows, never stored here.
--
-- Run this once against your Neon database (SQL editor, or `psql`), before
-- setting DATABASE_URL in Vercel.

CREATE TABLE IF NOT EXISTS orders (
  id                 BIGSERIAL PRIMARY KEY,

  -- Deduplication key. For real orders: the Stripe Checkout Session id
  -- (cs_live_... / cs_test_...) — the UNIQUE constraint plus
  -- ON CONFLICT DO NOTHING in lib/stats/record-sale.ts guarantees a given
  -- session is recorded at most once, no matter how many times Stripe
  -- redelivers its webhook or how many event types fire for it.
  -- For historical backfill: a synthetic id like 'historical-001', which by
  -- construction can never collide with a real Stripe session id.
  stripe_session_id  TEXT NOT NULL UNIQUE,

  pain               TEXT NOT NULL,
  viande             TEXT NOT NULL,
  crudites           TEXT[] NOT NULL DEFAULT '{}',
  sauces             TEXT[] NOT NULL DEFAULT '{}',

  -- Canonical representation (see lib/design/options.ts#buildCombinationKey)
  -- — the same set of choices always produces the same key, regardless of
  -- the order the customer clicked things in.
  combination_key    TEXT NOT NULL,

  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_combination_key ON orders (combination_key);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at);
