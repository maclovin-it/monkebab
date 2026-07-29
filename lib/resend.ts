import { Resend } from 'resend';

// Requires RESEND_API_KEY in env.
// The Resend constructor throws when the key is missing, so the client is
// created lazily on first use rather than at import time — otherwise any
// module importing this file would blow up at build time in an environment
// where the key is not exposed.
let client: Resend | null = null;

export function getResend(): Resend {
  if (client) return client;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('[resend] Missing env var: RESEND_API_KEY');
    throw new Error('Missing RESEND_API_KEY environment variable');
  }

  client = new Resend(apiKey);
  return client;
}
