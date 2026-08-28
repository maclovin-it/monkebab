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
