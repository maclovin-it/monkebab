// Single source of truth for configurator options. Both the client UI
// (app/page.tsx) and the server-side design renderer/validator import these
// — no duplicated option lists to drift out of sync.

export const PAIN_OPTIONS = ['Pita', 'Galette', 'Naan'] as const;
export const VIANDE_OPTIONS = ['Kebab', 'Kefta', 'Tenders', 'Poulet Tikka'] as const;
export const CRUDITES_OPTIONS = ['Salade', 'Tomate', 'Oignon'] as const;
export const SAUCES_OPTIONS = [
  'Blanche',
  'Harissa',
  'Algérienne',
  'Barbecue',
  'Mayonnaise',
  'Ketchup',
  'Samouraï',
  'Biggy',
  'Brésilienne',
  'Andalouse',
  'Chili Thaï',
  'Américaine',
  'Curry',
  'Fromagère',
  'Marocaine',
  'Hannibal',
  'Dallas',
  'Poivre',
] as const;

/** Hard cap on sauce selection — locked so the print-file safe zone guarantee holds. */
export const SAUCES_MAX = 2;

export type PainOption = (typeof PAIN_OPTIONS)[number];
export type ViandeOption = (typeof VIANDE_OPTIONS)[number];
export type CruditeOption = (typeof CRUDITES_OPTIONS)[number];
export type SauceOption = (typeof SAUCES_OPTIONS)[number];

export interface KebabSelection {
  pain: string;
  viande: string;
  crudites: string[];
  sauces: string[];
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

/**
 * Validates a selection against the known option lists and the sauces cap.
 * Empty pain/viande/crudites/sauces are valid (render as "SANS ..." placeholders) —
 * only *unknown* or *excess* values are rejected.
 */
export function validateSelection(selection: KebabSelection): ValidationResult {
  const errors: string[] = [];

  if (selection.pain && !(PAIN_OPTIONS as readonly string[]).includes(selection.pain)) {
    errors.push(`Unknown pain value: ${selection.pain}`);
  }
  if (selection.viande && !(VIANDE_OPTIONS as readonly string[]).includes(selection.viande)) {
    errors.push(`Unknown viande value: ${selection.viande}`);
  }
  for (const item of selection.crudites) {
    if (!(CRUDITES_OPTIONS as readonly string[]).includes(item)) {
      errors.push(`Unknown crudite value: ${item}`);
    }
  }
  if (new Set(selection.crudites).size !== selection.crudites.length) {
    errors.push('Duplicate crudite values');
  }
  for (const item of selection.sauces) {
    if (!(SAUCES_OPTIONS as readonly string[]).includes(item)) {
      errors.push(`Unknown sauce value: ${item}`);
    }
  }
  if (new Set(selection.sauces).size !== selection.sauces.length) {
    errors.push('Duplicate sauce values');
  }
  if (selection.sauces.length > SAUCES_MAX) {
    errors.push(`Too many sauces: ${selection.sauces.length} (max ${SAUCES_MAX})`);
  }

  return { ok: errors.length === 0, errors };
}

/** Menu order, not click order — the same canonicalization used to render
 * the print file (lib/design/render.ts), reused here so a combination_key
 * never depends on which order the customer clicked things in. */
export function canonicalCrudites(crudites: string[]): string[] {
  return CRUDITES_OPTIONS.filter((c) => crudites.includes(c));
}

export function canonicalSauces(sauces: string[]): string[] {
  return SAUCES_OPTIONS.filter((s) => sauces.includes(s));
}

/**
 * Canonical, deterministic representation of a selection — the same set of
 * choices always produces the same key, regardless of click order. Used to
 * group sales by combination for stats (popularity/rarity), never for
 * rendering.
 */
export function buildCombinationKey(selection: KebabSelection): string {
  const pain = selection.pain || 'SANS_PAIN';
  const viande = selection.viande || 'SANS_VIANDE';
  const crudites = canonicalCrudites(selection.crudites);
  const sauces = canonicalSauces(selection.sauces);
  const cruditesPart = crudites.length ? crudites.join(',') : 'SANS_CRUDITES';
  const saucesPart = sauces.length ? sauces.join(',') : 'SANS_SAUCE';
  return `${pain}|${viande}|${cruditesPart}|${saucesPart}`;
}

/** Minimal shape both `URLSearchParams` and Next's `ReadonlyURLSearchParams`
 * satisfy — accepted structurally so this works with either. */
interface ParamsLike {
  get(key: string): string | null;
}

/**
 * Builds a valid KebabSelection from raw query params, silently dropping
 * anything that isn't a real menu option instead of throwing — a crafted or
 * stale URL (unknown values, a 3rd sauce, duplicates) must never crash the
 * page. Used to restore the configurator's state from the URL (e.g. /tshirt
 * -> back to /), so the same option lists stay the single source of truth
 * for what counts as a valid choice.
 */
export function sanitizeSelectionFromParams(params: ParamsLike): KebabSelection {
  const rawPain = params.get('pain') ?? '';
  const rawViande = params.get('viande') ?? '';
  const rawCrudites = (params.get('crudites') ?? '').split(',').filter(Boolean);
  const rawSauces = (params.get('sauces') ?? '').split(',').filter(Boolean);

  const pain = (PAIN_OPTIONS as readonly string[]).includes(rawPain) ? rawPain : '';
  const viande = (VIANDE_OPTIONS as readonly string[]).includes(rawViande) ? rawViande : '';
  const crudites = canonicalCrudites(Array.from(new Set(rawCrudites)));
  const sauces = canonicalSauces(Array.from(new Set(rawSauces))).slice(0, SAUCES_MAX);

  return { pain, viande, crudites, sauces };
}
