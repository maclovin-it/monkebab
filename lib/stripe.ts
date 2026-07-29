import Stripe from 'stripe';

// Requires STRIPE_SECRET_KEY in env.
// The Stripe constructor throws "Neither apiKey nor config.authenticator
// provided" when the key is missing. Instantiating at module scope therefore
// breaks `next build`, which imports every route module while collecting page
// data — in an environment where the secret may not be exposed. Create the
// client lazily instead, on first actual use.
let client: Stripe | null = null;

export function getStripe(): Stripe {
  if (client) return client;

  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    console.error('[stripe] Missing env var: STRIPE_SECRET_KEY');
    throw new Error('Missing STRIPE_SECRET_KEY environment variable');
  }

  client = new Stripe(apiKey);
  return client;
}
