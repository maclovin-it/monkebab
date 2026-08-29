import { createCanvas } from '@napi-rs/canvas';
import { renderCanvas, ensureFontRegistered, FONT_FAMILY } from './render';
import type { KebabSelection } from './options';

// ─────────────────────────────────────────────────────────────────────────
// Live-preview compositing ONLY — the home page borne's interactive screen.
// Same rule as lib/design/share.ts: this file never decides a font size, a
// gap, a letter-spacing, or an ingredient order — all of that is entirely
// baked into the Canvas that renderCanvas() (lib/design/render.ts) returns.
//
// The one thing this file exists to avoid, unlike share.ts: a PNG
// encode/decode round trip. renderCanvas() hands back an already-rasterized
// Canvas that gets drawn directly with ctx.drawImage(canvas, ...) — no
// canvas.toBuffer(), no loadImage(). Measured cause for this file existing:
// encoding the 3000x3750 print canvas to PNG alone cost ~800ms in
// production (~93-97% of renderDesign()'s total time, confirmed via
// temporary server-side instrumentation across 5 independent fresh
// combinations) — and that huge canvas was previously being generated and
// immediately thrown away on every single configurator click, just to feed
// a live preview a fraction of that size. A local experiment at identical
// composition confirmed PNG-encode time tracks pixel count almost exactly
// linearly (100% pixels -> 100% time, 4% pixels -> 4.3% time, 1% pixels ->
// 1.2% time) — so rendering natively at preview size, never touching the
// print-size canvas at all, is the fix.
// ─────────────────────────────────────────────────────────────────────────

export const PREVIEW_W = 600;
export const PREVIEW_H = 750;

const FOOTER_TEXT = 'monkebab.xyz';

// Same proportional dressing (frame stroke, padding, footer) as
// lib/design/share.ts's 4:5 format — reproduced here, not shared, because
// this composes from a raw Canvas instead of a PNG Buffer + loadImage(),
// which is the entire reason this file is separate from share.ts (see perf
// plan: share.ts is left alone on this branch, "priorité absolue est le
// live preview"). If the borne's visual dressing ever changes, this and
// share.ts's '4:5' path both need the same update.
const PADDING_X_RATIO = 0.09;
const PADDING_TOP_RATIO = 0.06;
const FOOTER_RESERVE_RATIO = 0.09;
const DESIGN_ASPECT_RATIO = 4 / 5; // matches renderCanvas()'s fixed reference aspect ratio

/**
 * Composes the borne's live-preview image: same visual dressing as the
 * social exports (black background, thin frame, footer), but the design
 * layer is rendered directly at the exact pixel size the content box
 * needs — never at print size, never encoded then decoded. Throws if
 * renderCanvas() reports a safe-zone overflow, same guarantee share.ts's
 * renderShareImage() gives: a preview must never depict a design that
 * couldn't actually be printed.
 */
export function renderPreviewImage(selection: KebabSelection): Buffer {
  const paddingX = PREVIEW_W * PADDING_X_RATIO;
  const paddingTop = PREVIEW_H * PADDING_TOP_RATIO;
  const footerReserve = PREVIEW_H * FOOTER_RESERVE_RATIO;
  const boxW = PREVIEW_W - paddingX * 2;
  const boxH = PREVIEW_H - paddingTop - footerReserve;

  // Solve for the design layer's native render width so "contain"-fitting
  // it into the content box lands on an exact pixel match — renderCanvas()
  // always derives its height from the fixed reference 4:5 ratio, so this
  // never needs a follow-up resize/resample.
  let designW = Math.round(boxW);
  let designH = Math.round(designW / DESIGN_ASPECT_RATIO);
  if (designH > boxH) {
    designH = Math.round(boxH);
    designW = Math.round(designH * DESIGN_ASPECT_RATIO);
  }

  const { canvas: designCanvas, overflow } = renderCanvas(selection, designW);
  if (overflow.length > 0) {
    throw new Error(`Design overflow, refusing to compose preview: ${JSON.stringify(overflow)}`);
  }

  ensureFontRegistered();

  const canvas = createCanvas(PREVIEW_W, PREVIEW_H);
  const ctx = canvas.getContext('2d');

  // Background + frame — cosmetic, has no bearing on the text composition.
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, PREVIEW_W, PREVIEW_H);
  ctx.strokeStyle = '#666';
  ctx.lineWidth = Math.max(4, Math.round(PREVIEW_W * 0.0055));
  const inset = ctx.lineWidth * 2;
  ctx.strokeRect(inset, inset, PREVIEW_W - inset * 2, PREVIEW_H - inset * 2);

  // Draw the already-rasterized design canvas directly — no encode, no
  // decode, and (per the sizing solved above) no resampling either.
  const drawX = (PREVIEW_W - designCanvas.width) / 2;
  const drawY = paddingTop + (boxH - designCanvas.height) / 2;
  ctx.drawImage(designCanvas, drawX, drawY);

  // Footer — brand mark, not one of the 4 composed lines. Deliberately no
  // letter-spacing (a URL reads worse tracked out), same proportions as
  // share.ts's footer.
  const footerFontPx = Math.round(PREVIEW_W * 0.034);
  ctx.font = `700 ${footerFontPx}px '${FONT_FAMILY}'`;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(FOOTER_TEXT, PREVIEW_W / 2, PREVIEW_H - footerReserve * 0.4);

  return canvas.toBuffer('image/png');
}
