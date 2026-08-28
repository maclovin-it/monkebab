'use client';

import { buildCombinationKey, type KebabSelection } from './options';

// In-memory, per-tab cache of already-fetched preview/design images, keyed
// by the canonical selection (click order doesn't matter, reuses the same
// canonicalization as the stats combination-key) plus a `variant` string
// distinguishing which endpoint/shape produced it (e.g. the home borne's
// "4:5" live preview vs /tshirt's full-size "design" mockup — different
// images, must never collide).
//
// Deliberately plain module state, not sessionStorage or the Cache API:
// Next.js App Router client-side navigation doesn't tear down the JS
// execution context, so this survives "/ -> /tshirt -> /" for free with no
// persistence-layer code — the simplest thing that gives synchronous,
// instant re-display for any combination already seen this tab session.
const cache = new Map<string, string>(); // key -> object URL
const inflight = new Map<string, Promise<string>>(); // key -> in-flight fetch

function cacheKey(selection: KebabSelection, variant: string): string {
  return `${buildCombinationKey(selection)}|${variant}`;
}

/** Synchronous lookup — the object URL for this exact selection+variant if
 * it's already been fetched this session, otherwise undefined. */
export function getCachedPreview(selection: KebabSelection, variant: string): string | undefined {
  return cache.get(cacheKey(selection, variant));
}

/** Fetches `url` and caches the result as an object URL, keyed by the
 * canonical selection+variant. Concurrent/repeated calls for the same
 * selection+variant share one in-flight fetch instead of issuing another.
 * The fetch is not tied to any component's lifetime — if the caller
 * unmounts before it resolves, the result still lands in the shared cache
 * for next time (this is what lets a fast RETOUR often find the home
 * preview already warm even if the user navigated away mid-fetch). */
export function loadPreview(url: string, selection: KebabSelection, variant: string): Promise<string> {
  const key = cacheKey(selection, variant);

  const cached = cache.get(key);
  if (cached) return Promise.resolve(cached);

  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error(`preview fetch failed: ${res.status}`);
      return res.blob();
    })
    .then((blob) => {
      const objectUrl = URL.createObjectURL(blob);
      cache.set(key, objectUrl);
      inflight.delete(key);
      return objectUrl;
    })
    .catch((err) => {
      inflight.delete(key);
      throw err;
    });

  inflight.set(key, promise);
  return promise;
}
