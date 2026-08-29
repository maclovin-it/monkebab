import { createCanvas, GlobalFonts, type Canvas, type SKRSContext2D } from '@napi-rs/canvas';
import fs from 'node:fs';
import path from 'node:path';
import { CRUDITES_OPTIONS, SAUCES_OPTIONS, validateSelection, type KebabSelection } from './options';

// ─────────────────────────────────────────────────────────────────────────
// LOCKED LAYOUT — always exactly 4 lines, one per block (pain / viande /
// crudités / sauces), never more. No wrapping, no horizontal compression, no
// per-order font-size adjustment. Each block's font size is a fixed constant
// chosen once, offline, as the largest size at which that category's real
// worst case (the widest string that category can ever produce, measured
// exhaustively across every configurator option) still fits within the safe
// zone with margin. See FONT_SIZE below — every value there was derived this
// way, not guessed.
//
// RESOLUTION-INDEPENDENT BY DESIGN — every one of these numbers is defined
// at the REFERENCE (Printful print file) resolution; `metricsFor()` below
// is the *only* place a different resolution ever enters the picture, and
// it works by multiplying every one of these same numbers by one scale
// factor (targetCanvasW / REFERENCE_CANVAS_W). There is no second set of
// hand-tuned constants for smaller sizes — a preview at 600px wide is
// exactly this composition at 20% scale, not a re-derived layout.
// ─────────────────────────────────────────────────────────────────────────

const REFERENCE_CANVAS_W = 3000;
const REFERENCE_CANVAS_H = 3750;
export const CANVAS_W = REFERENCE_CANVAS_W;
export const CANVAS_H = REFERENCE_CANVAS_H;

const REFERENCE_MARGIN_X = 250;
const REFERENCE_MARGIN_Y = 300;
export const SAFE_W = CANVAS_W - REFERENCE_MARGIN_X * 2; // 2500
export const SAFE_H = CANVAS_H - REFERENCE_MARGIN_Y * 2; // 3150

const REFERENCE_SCALE = 6; // logical-unit -> canvas-px multiplier at the reference resolution
const LETTER_SPACING_LOGICAL = 1.5;
const LINE_HEIGHT_MULT = 1.15;

// Fixed vertical gaps between the 4 lines — 3 constants, one per transition,
// calibrated against a physical print reference (photo of the actual
// t-shirt). None of these depend on text content or order: pain/viande read
// as one compact pair (the dish), crudités/sauces as another (the extras),
// with a clearly larger gap at the size break between the two pairs — that
// visible separation is what the physical reference has and the previous
// flat 40px gap lacked, which made every line look glued together regardless
// of transition. Values are at REFERENCE resolution; metricsFor() scales them.
const REFERENCE_GAP_PAIN_VIANDE = 50;
const REFERENCE_GAP_VIANDE_CRUDITES = 240;
const REFERENCE_GAP_CRUDITES_SAUCES = 70;

// Worst real case per category, measured exhaustively (see project history):
//   pain    "SANS PAIN"                 @72 -> 1717px / 2500 (69%, margin 783)
//   viande  "POULET TIKKA"              @76 -> 2344px / 2500 (94%, margin 156)
//   crudités "SALADE, TOMATE, OIGNON"   @36 -> 2190px / 2500 (88%, margin 310)
//   sauces  "MAYONNAISE, BRÉSILIENNE"   @34 -> 2175px / 2500 (87%, margin 325)
// These are already resolution-independent ("logical" units multiplied by
// scale at draw time, same as the reference engine always did) — no change
// needed here for scaling.
const FONT_SIZE = {
  pain: 72,
  viande: 76,
  crudites: 36,
  sauces: 34,
} as const;

export const FONT_FAMILY = 'AntonPrintServer';
let fontRegistered = false;

/** Exported so lib/design/share.ts and lib/design/preview.ts can draw their
 * own footer text in the same Anton face without re-reading/re-registering
 * the font file themselves — asset loading, not text composition, so
 * sharing it doesn't blur the line this module exists to draw. */
export function ensureFontRegistered() {
  if (fontRegistered) return;
  // __dirname is unreliable across Next.js's bundlers (Turbopack rewrites it
  // under a virtual root in dev). process.cwd() is the project root in both
  // `next dev` and the deployed serverless function, so resolve from there.
  const fontPath = path.join(process.cwd(), 'lib/design/fonts/Anton-Regular.ttf');
  const buffer = fs.readFileSync(fontPath);
  const key = GlobalFonts.register(buffer, FONT_FAMILY);
  if (!key) {
    throw new Error(`Failed to register font from ${fontPath}`);
  }
  fontRegistered = true;
}

/** Every non-typographic (i.e. purely resolution-driven) number the drawing
 * code needs, all derived from ONE scale factor relative to the reference
 * 3000-wide print canvas. At canvasW === REFERENCE_CANVAS_W, scaleFactor is
 * exactly 1 and every field below reduces to precisely the reference
 * engine's original constant (1.0 is an exact no-op multiplier in IEEE754 —
 * this is what guarantees byte-identical output for the print file; see the
 * hash comparison in the perf-step3 verification). */
interface Metrics {
  canvasW: number;
  canvasH: number;
  safeW: number;
  safeH: number;
  scale: number;
  letterSpacing: number;
  gaps: readonly [number, number, number];
}

function metricsFor(canvasW: number): Metrics {
  const scaleFactor = canvasW / REFERENCE_CANVAS_W;
  const canvasH = Math.round(REFERENCE_CANVAS_H * scaleFactor);
  const marginX = REFERENCE_MARGIN_X * scaleFactor;
  const marginY = REFERENCE_MARGIN_Y * scaleFactor;
  return {
    canvasW,
    canvasH,
    safeW: canvasW - marginX * 2,
    safeH: canvasH - marginY * 2,
    scale: REFERENCE_SCALE * scaleFactor,
    letterSpacing: LETTER_SPACING_LOGICAL * REFERENCE_SCALE * scaleFactor,
    gaps: [
      REFERENCE_GAP_PAIN_VIANDE * scaleFactor,
      REFERENCE_GAP_VIANDE_CRUDITES * scaleFactor,
      REFERENCE_GAP_CRUDITES_SAUCES * scaleFactor,
    ],
  };
}

function fontString(sizeLogical: number, scale: number): string {
  return `400 ${sizeLogical * scale}px '${FONT_FAMILY}'`;
}

function measure(ctx: SKRSContext2D, text: string, sizeLogical: number, scale: number, letterSpacing: number): number {
  ctx.font = fontString(sizeLogical, scale);
  return ctx.measureText(text).width + Math.max(0, text.length - 1) * letterSpacing;
}

/** Draws `text` centered on `cx`, applying the fixed letter-spacing manually. */
function fillTextCentered(
  ctx: SKRSContext2D,
  text: string,
  cx: number,
  y: number,
  sizeLogical: number,
  scale: number,
  letterSpacing: number
) {
  ctx.font = fontString(sizeLogical, scale);
  const w = measure(ctx, text, sizeLogical, scale, letterSpacing);
  let x = cx - w / 2;
  for (const ch of text) {
    ctx.fillText(ch, x, y);
    x += ctx.measureText(ch).width + letterSpacing;
  }
}

/** Joins a category's selected items into its single fixed line. Never
 * wraps, never splits — the category's font size (see FONT_SIZE) was chosen
 * specifically so this joined string always fits, for every real option. */
function joinLine(items: string[], emptyLabel: string): string {
  return items.length ? items.join(', ') : emptyLabel;
}

interface Block {
  text: string;
  fontSize: number;
}

function buildBlocks(selection: KebabSelection): Block[] {
  const painText = selection.pain ? selection.pain.toUpperCase() : 'SANS PAIN';
  const viandeText = selection.viande ? selection.viande.toUpperCase() : 'SANS VIANDE';
  // Normalize to a canonical order (the menu's own order) so the same *set*
  // of choices always renders identically, regardless of the order the
  // customer clicked them in.
  const cruditesItems = CRUDITES_OPTIONS.filter((c) => selection.crudites.includes(c)).map((c) =>
    c.toUpperCase()
  );
  const saucesItems = SAUCES_OPTIONS.filter((s) => selection.sauces.includes(s)).map((s) => s.toUpperCase());

  return [
    { text: painText, fontSize: FONT_SIZE.pain },
    { text: viandeText, fontSize: FONT_SIZE.viande },
    { text: joinLine(cruditesItems, 'SANS CRUDITÉS'), fontSize: FONT_SIZE.crudites },
    { text: joinLine(saucesItems, 'SANS SAUCE'), fontSize: FONT_SIZE.sauces },
  ];
}

export interface OverflowCheck {
  line: string;
  width: number;
}

/** The one place that actually draws. Returns the raw, not-yet-encoded
 * Canvas — callers decide whether they need PNG bytes (renderDesign(),
 * renderDesignScaled()) or want to composite the canvas directly into
 * something else without ever paying for a PNG encode of it (renderCanvas(),
 * used by lib/design/preview.ts specifically to avoid that cost). */
function renderCanvasAtResolution(
  selection: KebabSelection,
  canvasW: number
): { canvas: Canvas; overflow: OverflowCheck[] } {
  const validation = validateSelection(selection);
  if (!validation.ok) {
    throw new Error(`Invalid selection: ${validation.errors.join('; ')}`);
  }

  ensureFontRegistered();

  const m = metricsFor(canvasW);
  const canvas = createCanvas(m.canvasW, m.canvasH);
  const ctx = canvas.getContext('2d');

  // Transparent background — Printful DTG prints on the black t-shirt underneath.
  ctx.clearRect(0, 0, m.canvasW, m.canvasH);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left'; // centering is done manually in fillTextCentered
  ctx.textBaseline = 'alphabetic';

  // Exactly 4 blocks, exactly 4 lines — always, regardless of selection.
  const blocks = buildBlocks(selection);
  const lineHeights = blocks.map((b) => b.fontSize * m.scale * LINE_HEIGHT_MULT);
  const totalGaps = m.gaps.reduce((a, b) => a + b, 0);
  const totalH = lineHeights.reduce((a, b) => a + b, 0) + totalGaps;

  const overflow: OverflowCheck[] = [];
  if (totalH > m.safeH) {
    overflow.push({ line: '(vertical total)', width: totalH });
  }

  let y = (m.canvasH - totalH) / 2;

  blocks.forEach((block, i) => {
    y += lineHeights[i];
    fillTextCentered(ctx, block.text, m.canvasW / 2, y, block.fontSize, m.scale, m.letterSpacing);
    const w = measure(ctx, block.text, block.fontSize, m.scale, m.letterSpacing);
    if (w > m.safeW) overflow.push({ line: block.text, width: w });
    if (i < m.gaps.length) y += m.gaps[i];
  });

  return { canvas, overflow };
}

/** Renders the locked design at the reference (Printful print file)
 * resolution. Returns the PNG buffer plus a diagnostic list of any line
 * that (should never happen if validateSelection() passed) ended up wider
 * than the safe zone — callers should treat a non-empty list as a hard
 * error, not a cosmetic warning. Unchanged behavior/signature — every
 * existing caller (/api/design, checkout) needs zero changes. */
export function renderDesign(selection: KebabSelection): { png: Buffer; overflow: OverflowCheck[] } {
  const { canvas, overflow } = renderCanvasAtResolution(selection, REFERENCE_CANVAS_W);
  return { png: canvas.toBuffer('image/png'), overflow };
}

/** Same composition as renderDesign(), scaled proportionally to a different
 * canvas width (height follows the reference 4:5 aspect automatically).
 * Still returns PNG bytes — for callers that specifically need an encoded
 * image at a non-reference size. */
export function renderDesignScaled(
  selection: KebabSelection,
  canvasW: number
): { png: Buffer; overflow: OverflowCheck[] } {
  const { canvas, overflow } = renderCanvasAtResolution(selection, canvasW);
  return { png: canvas.toBuffer('image/png'), overflow };
}

/** Same composition again, but returns the raw Canvas instead of encoding
 * it to PNG — for a compositor that's going to immediately drawImage() this
 * into something else (see lib/design/preview.ts) and would otherwise pay
 * for an encode it's just going to decode again a moment later. */
export function renderCanvas(selection: KebabSelection, canvasW: number): { canvas: Canvas; overflow: OverflowCheck[] } {
  return renderCanvasAtResolution(selection, canvasW);
}
