import { neon } from '@neondatabase/serverless';

// Requires DATABASE_URL in env. Same lazy-init pattern as lib/stripe.ts /
// lib/resend.ts — created on first use, not at import time, so a missing
// env var never breaks `next build`.
let sql: ReturnType<typeof neon> | null = null;

export function getSql() {
  if (sql) return sql;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('[stats] Missing env var: DATABASE_URL');
    throw new Error('Missing DATABASE_URL environment variable');
  }

  sql = neon(connectionString);
  return sql;
}
