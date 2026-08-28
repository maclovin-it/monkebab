'use client';

import { useEffect, useState } from 'react';
import { getCachedPreview, loadPreview } from './preview-cache';
import type { KebabSelection } from './options';

/**
 * Returns the URL currently safe to display for `url` — this is the
 * "never go blank" preview binding: once a first image has been shown for
 * this component, the returned src only ever moves forward to a newly
 * *loaded* image, never back to null/blank while a new one is loading.
 * `<img src={...}>` bound directly to a changing URL clears its bitmap the
 * moment `src` is reassigned, before the new image has loaded — that's the
 * flash this hook exists to avoid, by holding the previous src until the
 * next one has actually finished loading (from the in-memory cache, or a
 * real fetch) and only swapping once.
 *
 * A cache hit for the *current* selection is derived synchronously during
 * render (not via an effect) so a combination already seen this tab
 * session — e.g. returning to "/" from "/tshirt" — can paint its final
 * image on the very first render, with no blank frame at all. The effect
 * only handles the genuinely-async case: a selection that isn't cached yet.
 */
export function usePreviewImage(url: string, selection: KebabSelection, variant: string): string | null {
  const cruditesKey = selection.crudites.join(',');
  const saucesKey = selection.sauces.join(',');

  const cachedForCurrent = getCachedPreview(selection, variant);

  const [fetchedSrc, setFetchedSrc] = useState<string | null>(null);

  useEffect(() => {
    if (getCachedPreview(selection, variant)) return; // handled synchronously below, nothing to fetch

    let cancelled = false;
    loadPreview(url, selection, variant)
      .then((objectUrl) => {
        if (!cancelled) setFetchedSrc(objectUrl);
      })
      .catch(() => {
        // Keep showing whatever was last displayed rather than going blank
        // on a transient fetch failure.
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, selection.pain, selection.viande, cruditesKey, saucesKey, variant]);

  // Prefer an exact cache hit for the CURRENT selection (covers "just
  // navigated back to an already-seen combo" instantly); otherwise fall
  // back to the last successfully fetched src, which only ever moves
  // forward — never reset to null — so the screen never blanks while a new
  // selection's image is loading.
  return cachedForCurrent ?? fetchedSrc;
}
