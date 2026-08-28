import { createCanvas, loadImage } from '@napi-rs/canvas';
import { renderDesign, ensureFontRegistered, FONT_FAMILY } from './render';
import type { KebabSelection } from './options';

// ─────────────────────────────────────────────────────────────────────────
// Social-visual composition ONLY. This module never decides a font size, a
// gap, a letter-spacing, a wrap, or an ingredient order — all of that is
// entirely baked into the PNG that renderDesign() (lib/design/render.ts)
// returns. This file only places that PNG, unmodified, as a layer inside a
// differently-shaped canvas (background, frame, footer). If the 4-line
// composition ever looks different here than on the actual t-shirt, that is
// a bug in this file's placement math, never a second typography engine.
// ─────────────────────────────────────────────────────────────────────────

export const SHARE_SIZES = {
  '1:1': [1080, 1080],
  '4:5': [1080, 1350],
  '9:16': [1080, 1920],
} as const;

export type ShareFormat = keyof typeof SHARE_SIZES;

const FOOTER_TEXT = 'monkebab.xyz';

/**
 * Composes a social-share image at the given format: black background, a
 * thin frame, the exact renderDesign() output scaled (never re-drawn) to
 * fit centered inside a padded content box, and a footer line. Throws if
 * renderDesign() itself reports a safe-zone overflow — a share image must
 * never depict a design that couldn't actually be printed.
 */
export async function renderShareImage(selection: KebabSelection, format: ShareFormat): Promise<Buffer> {
  const { png: designPng, overflow } = renderDesign(selection);
  if (overflow.length > 0) {
    throw new Error(`Design overflow, refusing to compose share image: ${JSON.stringify(overflow)}`);
  }

  ensureFontRegistered();

  const [W, H] = SHARE_SIZES[format];
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Background + frame — cosmetic, has no bearing on the text composition.
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#666';
  ctx.lineWidth = Math.max(4, Math.round(W * 0.0055));
  const inset = ctx.lineWidth * 2;
  ctx.strokeRect(inset, inset, W - inset * 2, H - inset * 2);

  // Fit the design layer into a padded content box, preserving its own
  // aspect ratio ("contain"), centered. Never re-measures or redraws text.
  const designImage = await loadImage(designPng);
  const paddingX = W * 0.09;
  const paddingTop = H * 0.06;
  const footerReserve = H * 0.09;
  const boxW = W - paddingX * 2;
  const boxH = H - paddingTop - footerReserve;

  const designRatio = designImage.width / designImage.height;
  let drawW = boxW;
  let drawH = drawW / designRatio;
  if (drawH > boxH) {
    drawH = boxH;
    drawW = drawH * designRatio;
  }
  const drawX = (W - drawW) / 2;
  const drawY = paddingTop + (boxH - drawH) / 2;
  ctx.drawImage(designImage, drawX, drawY, drawW, drawH);

  // Footer — brand mark, not one of the 4 composed lines. Deliberately no
  // letter-spacing (a URL reads worse tracked out) and a size derived from
  // canvas width, matching the pre-existing footer's proportions.
  const footerFontPx = Math.round(W * 0.034);
  ctx.font = `700 ${footerFontPx}px '${FONT_FAMILY}'`;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(FOOTER_TEXT, W / 2, H - footerReserve * 0.4);

  return canvas.toBuffer('image/png');
}
