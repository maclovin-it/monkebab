// Minimal, cookie-free consent storage — no external CMP. Holds nothing but
// the choice itself ('granted' | 'denied'), no timestamp, no IP, nothing
// else. The same two values are also what's threaded through to the Stripe
// checkout -> webhook path (app/tshirt/page.tsx -> app/api/checkout/route.ts
// -> app/api/webhook/route.ts) to gate the server-side purchase event —
// see ConsentChoice below, shared by both the client banner and that flow.

export type ConsentChoice = 'granted' | 'denied';

const STORAGE_KEY = 'monkebab_analytics_consent';

/** null means "no explicit choice yet" — always treated the same as denied
 * everywhere consent is checked (never assume consent). */
export function readStoredConsent(): ConsentChoice | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === 'granted' || value === 'denied' ? value : null;
  } catch {
    // Private browsing / storage disabled — treat as "no choice yet".
    return null;
  }
}

export function writeStoredConsent(choice: ConsentChoice): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    // Best-effort — if this fails, the banner simply reappears on the next
    // page load, which is a safe fallback (never assumes consent).
  }
}
