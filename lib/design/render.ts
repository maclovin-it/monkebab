import { createCanvas, GlobalFonts, type SKRSContext2D } from '@napi-rs/canvas';
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
// ─────────────────────────────────────────────────────────────────────────

export const CANVAS_W = 3000;
export const CANVAS_H = 3750;

const MARGIN_X = 250;
const MARGIN_Y = 300;
export const SAFE_W = CANVAS_W - MARGIN_X * 2; // 2500
export const SAFE_H = CANVAS_H - MARGIN_Y * 2; // 3150

const SCALE = 6; // logical-unit -> canvas-px multiplier, kept for continuity with prior file conventions
const LETTER_SPACING_LOGICAL = 1.5;
const LETTER_SPACING = LETTER_SPACING_LOGICAL * SCALE; // 9px canvas
const LINE_HEIGHT_MULT = 1.15;

// Fixed vertical gaps between the 4 lines — 3 constants, one per transition,
// calibrated against a physical print reference (photo of the actual
// t-shirt). None of these depend on text content or order: pain/viande read
// as one compact pair (the dish), crudités/sauces as another (the extras),
// with a clearly larger gap at the size break between the two pairs — that
// visible separation is what the physical reference has and the previous
// flat 40px gap lacked, which made every line look glued together regardless
// of transition.
const GAP_PAIN_VIANDE = 50;
const GAP_VIANDE_CRUDITES = 240;
const GAP_CRUDITES_SAUCES = 70;
const BLOCK_GAPS = [GAP_PAIN_VIANDE, GAP_VIANDE_CRUDITES, GAP_CRUDITES_SAUCES] as const;

// Worst real case per category, measured exhaustively (see project history):
//   pain    "SANS PAIN"                 @72 -> 1717px / 2500 (69%, margin 783)
//   viande  "POULET TIKKA"              @76 -> 2344px / 2500 (94%, margin 156)
//   crudités "SALADE, TOMATE, OIGNON"   @36 -> 2190px / 2500 (88%, margin 310)
//   sauces  "MAYONNAISE, BRÉSILIENNE"   @34 -> 2175px / 2500 (87%, margin 325)
const FONT_SIZE = {
  pain: 72,
  viande: 76,
  crudites: 36,
  sauces: 34,
} as const;

const FONT_FAMILY = 'AntonPrintServer';
let fontRegistered = false;

function ensureFontRegistered() {
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

function fontString(sizeLogical: number): string {
  return `400 ${sizeLogical * SCALE}px '${FONT_FAMILY}'`;
}

function measure(ctx: SKRSContext2D, text: string, sizeLogical: number): number {
  ctx.font = fontString(sizeLogical);
  return ctx.measureText(text).width + Math.max(0, text.length - 1) * LETTER_SPACING;
}

/** Draws `text` centered on `cx`, applying the fixed letter-spacing manually. */
function fillTextCentered(ctx: SKRSContext2D, text: string, cx: number, y: number, sizeLogical: number) {
  ctx.font = fontString(sizeLogical);
  const w = measure(ctx, text, sizeLogical);
  let x = cx - w / 2;
  for (const ch of text) {
    ctx.fillText(ch, x, y);
    x += ctx.measureText(ch).width + LETTER_SPACING;
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

/** Renders the locked design. Returns the PNG buffer plus a diagnostic list
 * of any line that (should never happen if validateSelection() passed) ended
 * up wider than the safe zone — callers should treat a non-empty list as a
 * hard error, not a cosmetic warning. */
export function renderDesign(selection: KebabSelection): { png: Buffer; overflow: OverflowCheck[] } {
  const validation = validateSelection(selection);
  if (!validation.ok) {
    throw new Error(`Invalid selection: ${validation.errors.join('; ')}`);
  }

  ensureFontRegistered();

  const canvas = createCanvas(CANVAS_W, CANVAS_H);
  const ctx = canvas.getContext('2d');

  // Transparent background — Printful DTG prints on the black t-shirt underneath.
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left'; // centering is done manually in fillTextCentered
  ctx.textBaseline = 'alphabetic';

  // Exactly 4 blocks, exactly 4 lines — always, regardless of selection.
  const blocks = buildBlocks(selection);
  const lineHeights = blocks.map((b) => b.fontSize * SCALE * LINE_HEIGHT_MULT);
  const totalGaps = BLOCK_GAPS.reduce((a, b) => a + b, 0);
  const totalH = lineHeights.reduce((a, b) => a + b, 0) + totalGaps;

  const overflow: OverflowCheck[] = [];
  if (totalH > SAFE_H) {
    overflow.push({ line: '(vertical total)', width: totalH });
  }

  let y = (CANVAS_H - totalH) / 2;

  blocks.forEach((block, i) => {
    y += lineHeights[i];
    fillTextCentered(ctx, block.text, CANVAS_W / 2, y, block.fontSize);
    const w = measure(ctx, block.text, block.fontSize);
    if (w > SAFE_W) overflow.push({ line: block.text, width: w });
    if (i < BLOCK_GAPS.length) y += BLOCK_GAPS[i];
  });

  return { png: canvas.toBuffer('image/png'), overflow };
}
