'use client';

// Thin, centralized gtag wrapper — nothing in app/page.tsx or
// app/tshirt/page.tsx calls window.gtag directly. Every call here is a
// silent no-op if gtag was never loaded (missing env var, script blocked,
// consent not yet given) — analytics must never be able to break the site.

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/** Fires a GA4 event. Params must stay limited to funnel-relevant,
 * non-personal data (size, value, currency — never email/name/address/any
 * Stripe identifier). */
export function trackEvent(name: string, params?: Record<string, unknown>): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('event', name, params);
}

/** Toggles gtag.js's own documented opt-out flag (window['ga-disable-<id>'])
 * — set true the moment consent is denied or revoked, so that even if the
 * script is still loaded in this page from an earlier grant, gtag.js
 * itself stops sending anything. Cleared (set false) only when consent is
 * actively granted. A no-op without a configured measurement id. */
export function setGaDisabled(disabled: boolean): void {
  if (typeof window === 'undefined' || !GA_MEASUREMENT_ID) return;
  (window as unknown as Record<string, boolean>)[`ga-disable-${GA_MEASUREMENT_ID}`] = disabled;
}

/** Reads GA4's own client_id for this browser, via the official async
 * gtag('get', ...) API — used once, right before checkout, to let the
 * server-side purchase event (fired from the Stripe webhook, see
 * lib/analytics/measurement-protocol.ts) attribute back to the same
 * visitor instead of landing as a disconnected event. Resolves null
 * (never rejects) if gtag isn't loaded or doesn't respond in time — the
 * purchase event still fires server-side either way, just without
 * client-side funnel stitching for that one visitor. */
export function getGaClientId(timeoutMs = 300): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof window.gtag !== 'function' || !GA_MEASUREMENT_ID) {
      resolve(null);
      return;
    }

    let settled = false;
    const finish = (value: string | null) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const timer = setTimeout(() => finish(null), timeoutMs);

    window.gtag('get', GA_MEASUREMENT_ID, 'client_id', (clientId: string) => {
      clearTimeout(timer);
      finish(typeof clientId === 'string' && clientId ? clientId : null);
    });
  });
}
