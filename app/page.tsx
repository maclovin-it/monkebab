'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Anton } from 'next/font/google';
import {
  PAIN_OPTIONS,
  VIANDE_OPTIONS,
  CRUDITES_OPTIONS,
  SAUCES_OPTIONS,
  SAUCES_MAX,
  sanitizeSelectionFromParams,
} from '@/lib/design/options';

const anton = Anton({ subsets: ['latin'], weight: '400', display: 'swap' });

const painOptions: readonly string[] = PAIN_OPTIONS;
const viandeOptions: readonly string[] = VIANDE_OPTIONS;
const cruditesOptions: readonly string[] = CRUDITES_OPTIONS;
const saucesOptions: readonly string[] = SAUCES_OPTIONS;

// Pixel dimensions for each format live server-side (lib/design/share.ts
// SHARE_SIZES) — the client only needs the format labels themselves to
// build the /api/share query and the format dialog. Order here is the
// order they're listed in the dialog: Story first (the primary sharing
// format), then Post, then Carré.
const exportFormats = ['9:16', '4:5', '1:1'] as const;
type ExportFormat = (typeof exportFormats)[number];
type SectionKey = 'PAIN' | 'VIANDE' | 'CRUDITES' | 'SAUCES';
const sectionOrder: SectionKey[] = ['PAIN', 'VIANDE', 'CRUDITES', 'SAUCES'];

// The live preview inside the borne always renders at this ratio — it's
// decoupled from the export format so choosing STORY/POST/CARRÉ at share or
// download time never resizes the borne itself. 4:5 was picked because it
// fills the bezel's width better than 9:16 (less dead space on the sides)
// and happens to match the print canvas's own 3000x3750 proportions.
const PREVIEW_FORMAT: ExportFormat = '4:5';

const formatLabels: Record<ExportFormat, string> = {
  '9:16': 'STORY — 9:16',
  '4:5': 'POST — 4:5',
  '1:1': 'CARRÉ — 1:1',
};

const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function IconPain() {
  return (
    <svg {...iconProps} className="sectionIcon" aria-hidden="true">
      <ellipse cx="12" cy="12" rx="9" ry="6" />
      <path d="M8 10.5l2.4 3M13 9.5l2.4 3.5" />
    </svg>
  );
}

function IconViande() {
  return (
    <svg {...iconProps} className="sectionIcon" aria-hidden="true">
      <path d="M12 3v18" />
      <rect x="8.5" y="5.5" width="7" height="4.5" rx="2.25" />
      <rect x="8.5" y="10.5" width="7" height="4.5" rx="2.25" />
      <rect x="8.5" y="15.5" width="7" height="3.5" rx="1.75" />
    </svg>
  );
}

function IconCrudites() {
  return (
    <svg {...iconProps} className="sectionIcon" aria-hidden="true">
      {/* Simple pointed leaf (two mirrored curves meeting top and bottom)
          with a straight center vein — a rotated ellipse was tried first
          but at this stroke width it read as a "prohibited" circle-slash,
          not a leaf; this shape is deliberately wide enough that the
          1.5-unit stroke stays a visible hollow outline, not a fill. */}
      <path d="M12 3.5c7.5 4 7.5 13 0 17c-7.5-4-7.5-13 0-17z" />
      <path d="M12 5v15" />
    </svg>
  );
}

function IconSauces() {
  return (
    <svg {...iconProps} className="sectionIcon" aria-hidden="true">
      <path d="M10 3h4v2.2c1.2.5 2 1.7 2 3.1V19a2 2 0 01-2 2h-4a2 2 0 01-2-2V8.3c0-1.4.8-2.6 2-3.1z" />
      <path d="M10 9.5h4" />
    </svg>
  );
}

const sectionIcons: Record<SectionKey, typeof IconPain> = {
  PAIN: IconPain,
  VIANDE: IconViande,
  CRUDITES: IconCrudites,
  SAUCES: IconSauces,
};

function formatCrudites(selected: string[]) {
  if (selected.length === 0) {
    return ['SANS CRUDITÉS'];
  }

  return [selected.join(', ')];
}

function calculateValidationScore(pain: string, viande: string, crudites: string[], sauces: string[]) {
  const isPerfectCombo =
    pain === 'Naan' &&
    viande === 'Kebab' &&
    crudites.length === 3 &&
    ['Salade', 'Tomate', 'Oignon'].every((item) => crudites.includes(item)) &&
    sauces.length === 2 &&
    ['Algérienne', 'Blanche'].every((item) => sauces.includes(item));

  const painScores: Record<string, number> = {
    Pita: 80,
    Galette: 90,
    Naan: 100,
  };

  const viandeScores: Record<string, number> = {
    Kebab: 100,
    Kefta: 90,
    Tenders: 70,
    'Poulet Tikka': 65,
  };

  const sauceScores: Record<string, number> = {
    Blanche: 100,
    Harissa: 90,
    Algérienne: 100,
    Barbecue: 70,
    Mayonnaise: 60,
    Ketchup: 20,
    Samouraï: 85,
    Biggy: 60,
    Brésilienne: 70,
    Andalouse: 75,
    'Chili Thaï': 50,
    Américaine: 30,
    Curry: 60,
    Fromagère: 55,
    Marocaine: 85,
    Hannibal: 50,
    Dallas: 40,
    Poivre: 20,
  };

  const painScore = pain ? painScores[pain] ?? 0 : 0;
  const viandeScore = viande ? viandeScores[viande] ?? 0 : 0;
  const cruditesScore = crudites.length
    ? crudites.reduce((sum, item) => sum + (item === 'Salade' || item === 'Tomate' || item === 'Oignon' ? 100 : 0), 0) / crudites.length
    : 0;
  const saucesScore = sauces.length
    ? sauces.reduce((sum, item) => sum + (sauceScores[item] ?? 0), 0) / sauces.length
    : 0;

  const baseScore = painScore * 0.2 + viandeScore * 0.3 + cruditesScore * 0.25 + saucesScore * 0.25;

  let malus = 0;
  if (!pain) malus -= 20;
  if (!viande) malus -= 40;
  if (crudites.length === 0) malus -= 25;
  if (crudites.length === 1) malus -= 15;
  if (crudites.length === 2) malus -= 8;

  const bonus = sauces.length === 2 && sauces.includes('Algérienne') && sauces.includes('Blanche') ? 5 : 0;

  if (
    viande === 'Kebab' &&
    crudites.length === 3 &&
    ['Salade', 'Tomate', 'Oignon'].every((item) => crudites.includes(item)) &&
    sauces.length === 2 &&
    ['Algérienne', 'Blanche'].every((item) => sauces.includes(item))
  ) {
    if (pain === 'Pita') {
      malus -= 13;
    }
    if (pain === 'Galette') {
      malus -= 8;
    }
  }

  const cruditesMultiplier = crudites.length === 0 ? 0.25 : crudites.length === 1 ? 0.45 : crudites.length === 2 ? 0.7 : 1;
  const saucesMultiplier =
    sauces.length === 0
      ? 0.35
      : sauces.length === 1
      ? 0.75
      : sauces.length === 2
      ? 1
      : sauces.length === 3
      ? 0.65
      : sauces.length === 4
      ? 0.45
      : sauces.length === 5
      ? 0.25
      : sauces.length === 6
      ? 0.12
      : 0.03;

  const weakSauceCount = sauces.filter(
    (item) => !['Algérienne', 'Blanche', 'Harissa', 'Samouraï'].includes(item)
  ).length;
  const weakSaucesMultiplier =
    weakSauceCount === 0
      ? 1
      : weakSauceCount === 1
      ? 0.9
      : weakSauceCount === 2
      ? 0.75
      : weakSauceCount === 3
      ? 0.6
      : 0.45;

  const forbiddenMultiplier =
    (sauces.includes('Ketchup') ? 0.55 : 1) *
    (sauces.includes('Poivre') ? 0.7 : 1) *
    (sauces.includes('Américaine') ? 0.75 : 1);

  const viandeWeakMultiplier = viande === 'Tenders' ? 0.75 : viande === 'Poulet Tikka' ? 0.7 : 1;
  const painWeakMultiplier = pain === 'Pita' ? 0.88 : pain === 'Galette' ? 0.95 : 1;

  const eliteSauceCount = sauces.filter((item) => ['Algérienne', 'Blanche', 'Harissa', 'Samouraï'].includes(item)).length;
  const eliteSauceBonus =
    sauces.length === 2 && sauces.includes('Algérienne') && sauces.includes('Blanche')
      ? 8
      : eliteSauceCount >= 2
      ? 4
      : 0;

  let score = Math.round(
    (baseScore + malus + bonus) *
      cruditesMultiplier *
      saucesMultiplier *
      weakSaucesMultiplier *
      forbiddenMultiplier *
      viandeWeakMultiplier *
      painWeakMultiplier +
      eliteSauceBonus
  );
  score = Math.max(0, Math.min(score, 100));
  if (!isPerfectCombo && score === 100) {
    score = 99;
  }

  const emoji =
    score === 100
      ? '🤍'
      : score >= 95
      ? '🥰'
      : score >= 80
      ? '🤩'
      : score >= 60
      ? '😎'
      : score >= 40
      ? '🤕'
      : score >= 20
      ? '🤮'
      : '🐶';

  const label =
    score === 100
      ? 'parfait.'
      : score >= 95
      ? "c'est magnifique..."
      : score >= 80
      ? 'oui papiiiii'
      : score >= 60
      ? "okey, j'ai la vision"
      : score >= 40
      ? 'à 6h du matin pourquoi pas'
      : score >= 20
      ? 'la honte'
      : 'bon grec pour un bulldog anglais';

  return { score, emoji, label, ratio: score };
}

/** Debounces a fast-changing value (selection clicks) so the server render
 * it drives (via /api/share) doesn't fire on every intermediate click —
 * without this, composing a kebab would trigger a network render per
 * keystroke-equivalent. Format switches deliberately bypass this (see
 * shareSrc below) since there's exactly one per click, not a rapid stream. */
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

function downloadBlob(blob: Blob, format: ExportFormat) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `monkebab-${format.replace(':', 'x')}.png`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** Shared with the sync-to-URL effect and the /tshirt handoff, so the query
 * shape is built in exactly one place. */
function buildKebabParams(pain: string, viande: string, crudites: string[], sauces: string[]): URLSearchParams {
  const params = new URLSearchParams();
  if (pain) params.set('pain', pain);
  if (viande) params.set('viande', viande);
  if (crudites.length) params.set('crudites', crudites.join(','));
  if (sauces.length) params.set('sauces', sauces.join(','));
  return params;
}

function getSectionSummary(section: SectionKey, pain: string, viande: string, crudites: string[], sauces: string[]) {
  if (section === 'PAIN') {
    return pain ? pain.toUpperCase() : 'SANS PAIN';
  }

  if (section === 'VIANDE') {
    return viande ? viande.toUpperCase() : 'SANS VIANDE';
  }

  if (section === 'CRUDITES') {
    const lines = formatCrudites(crudites.map((item) => item.toUpperCase()));
    return lines.join(' ');
  }

  return sauces.length ? sauces.map((item) => item.toUpperCase()).join(', ') : 'SANS SAUCE';
}

function HomeContent() {
  const searchParams = useSearchParams();
  // Restores the previous configuration when arriving from /tshirt (via its
  // "← RETOUR" link, or the browser's native Back button — see the
  // URL-sync effect below). A plain visit to "/" has no params, so this
  // resolves to the same blank selection as before. Unknown/invalid values
  // are silently dropped by sanitizeSelectionFromParams, never crash.
  const initialSelection = sanitizeSelectionFromParams(searchParams);
  const [pain, setPain] = useState(initialSelection.pain);
  const [viande, setViande] = useState(initialSelection.viande);
  const [crudites, setCrudites] = useState<string[]>(initialSelection.crudites);
  const [sauces, setSauces] = useState<string[]>(initialSelection.sauces);
  const [openSection, setOpenSection] = useState<SectionKey>(initialSelection.pain ? 'VIANDE' : 'PAIN');
  const [pendingAction, setPendingAction] = useState<'share' | 'download' | null>(null);
  const formatDialogRef = useRef<HTMLDialogElement>(null);

  const validation = useMemo(
    () => calculateValidationScore(pain, viande, crudites, sauces),
    [pain, viande, crudites, sauces]
  );

  const router = useRouter();

  // Keeps "/" itself in sync with the current selection (replace, not push
  // — no extra history entries). This is what makes the browser's native
  // Back button from /tshirt land on a "/" that still has the previous
  // configuration, instead of a blank one.
  useEffect(() => {
    const query = buildKebabParams(pain, viande, crudites, sauces).toString();
    router.replace(query ? `/?${query}` : '/', { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pain, viande, crudites, sauces]);

  const handleTshirt = () => {
    const params = buildKebabParams(pain, viande, crudites, sauces);
    router.push(`/tshirt?${params.toString()}`);
  };

  // Selection changes are debounced before they reach the server so rapid
  // clicking doesn't fire a render per click. The borne's live preview is
  // always PREVIEW_FORMAT — it never depends on the export format the user
  // later picks in the share/download dialog, so composing a kebab never
  // resizes the borne.
  const selectionQuery = useMemo(
    () => buildKebabParams(pain, viande, crudites, sauces).toString(),
    [pain, viande, crudites, sauces]
  );
  // 80ms: short enough to feel immediate (measured server render alone is
  // ~360ms per new combination — the debounce was never the dominant cost),
  // long enough to still collapse a genuine rapid-click burst into a single
  // request instead of one per click. <img src> swapping is itself race-safe
  // (the browser never commits a stale in-flight load once src has moved on
  // to a newer value), so this doesn't risk showing an outdated preview.
  const debouncedSelectionQuery = useDebouncedValue(selectionQuery, 80);

  const shareSrc = useMemo(() => {
    const params = new URLSearchParams(debouncedSelectionQuery);
    params.set('format', PREVIEW_FORMAT);
    return `/api/share?${params.toString()}`;
  }, [debouncedSelectionQuery]);

  const fetchShareBlob = async (fmt: ExportFormat): Promise<Blob | null> => {
    // Built from the *current* selection, not the debounced preview one —
    // a click is a deliberate, single action, not part of the
    // rapid-interaction stream the debounce exists to smooth out.
    const params = buildKebabParams(pain, viande, crudites, sauces);
    params.set('format', fmt);
    const res = await fetch(`/api/share?${params.toString()}`);
    if (!res.ok) return null;
    return res.blob();
  };

  const handleShare = async (fmt: ExportFormat) => {
    const blob = await fetchShareBlob(fmt);
    if (!blob) return;
    if (navigator.share) {
      const file = new File([blob], 'monkebab.png', { type: 'image/png' });
      try {
        await navigator.share({ files: [file], title: 'Mon Kebab' });
      } catch {
        downloadBlob(blob, fmt);
      }
    } else {
      downloadBlob(blob, fmt);
    }
  };

  const handleDownload = async (fmt: ExportFormat) => {
    const blob = await fetchShareBlob(fmt);
    if (!blob) return;
    downloadBlob(blob, fmt);
  };

  const openFormatDialog = (action: 'share' | 'download') => {
    setPendingAction(action);
    formatDialogRef.current?.showModal();
  };

  const chooseFormat = (fmt: ExportFormat) => {
    formatDialogRef.current?.close();
    if (pendingAction === 'share') handleShare(fmt);
    else if (pendingAction === 'download') handleDownload(fmt);
  };

  const selectPain = (item: string) => {
    setPain(item);
    setOpenSection('VIANDE');
  };

  const selectViande = (item: string) => {
    setViande(item);
    setOpenSection('CRUDITES');
  };

  const toggleSelection = (item: string, list: string[], setList: (value: string[]) => void) => {
    if (list.includes(item)) {
      setList(list.filter((current) => current !== item));
    } else {
      setList([...list, item]);
    }
  };

  // Sauces are capped at SAUCES_MAX — the print-file safe zone was audited
  // for at most 2 sauces. Selecting a 3rd is a no-op rather than silently
  // accepted and later rejected server-side.
  const toggleSauce = (item: string) => {
    if (sauces.includes(item)) {
      setSauces(sauces.filter((current) => current !== item));
    } else if (sauces.length < SAUCES_MAX) {
      setSauces([...sauces, item]);
    }
  };

  const optionClass = (active: boolean, compact = false) =>
    `option${active ? ' selected' : ''}${compact ? ' compact' : ''}`;

  return (
    <main className={`page ${anton.className}`}>
      <header className="titleBlock">
        <h1>MONKEBAB</h1>
        <p>BORNE DE COMMANDE</p>
        <p className="tagline">COMPOSE TON KEBAB. ON L&rsquo;IMPRIME SUR UN T-SHIRT.</p>
      </header>

      <div className="layout">
        <section className="leftPanel">
          <div className="leftContent">
            <div className="accordion">
              {sectionOrder.map((section) => {
                const active = openSection === section;
                const SectionIcon = sectionIcons[section];
                return (
                  <div key={section} className={`accordionSection ${active ? 'active' : ''}`}>
                    <button
                      type="button"
                      id={`accordion-header-${section}`}
                      className="accordionHeader"
                      onClick={() => setOpenSection(section)}
                      aria-expanded={active}
                      aria-controls={`accordion-panel-${section}`}
                      aria-label={`${section}${section === 'SAUCES' ? ', 2 max' : ''}, ${getSectionSummary(section, pain, viande, crudites, sauces)}`}
                    >
                      <span className="headerLabel">
                        <SectionIcon />
                        {section}
                        {section === 'SAUCES' && <span className="sectionHint">2 MAX</span>}
                      </span>
                      <span className="summary">{getSectionSummary(section, pain, viande, crudites, sauces)}</span>
                    </button>

                    {active ? (
                      <div
                        className="accordionBody"
                        id={`accordion-panel-${section}`}
                        role="region"
                        aria-labelledby={`accordion-header-${section}`}
                      >
                        {section === 'PAIN' && (
                          <div className="grid twoColumns">
                            {painOptions.map((item) => (
                              <button key={item} type="button" className={optionClass(pain === item)} onClick={() => selectPain(item)}>
                                {item.toUpperCase()}
                              </button>
                            ))}
                          </div>
                        )}

                        {section === 'VIANDE' && (
                          <div className="grid twoColumns">
                            {viandeOptions.map((item) => (
                              <button key={item} type="button" className={optionClass(viande === item)} onClick={() => selectViande(item)}>
                                {item.toUpperCase()}
                              </button>
                            ))}
                          </div>
                        )}

                        {section === 'CRUDITES' && (
                          <div className="grid twoColumns">
                            {cruditesOptions.map((item) => (
                              <button
                                key={item}
                                type="button"
                                className={optionClass(crudites.includes(item))}
                                onClick={() => toggleSelection(item, crudites, setCrudites)}
                              >
                                {item.toUpperCase()}
                              </button>
                            ))}
                          </div>
                        )}

                        {section === 'SAUCES' && (
                          <div className="grid saucesGrid">
                            {saucesOptions.map((item) => {
                              const selected = sauces.includes(item);
                              const capped = !selected && sauces.length >= SAUCES_MAX;
                              return (
                                <button
                                  key={item}
                                  type="button"
                                  className={`${optionClass(selected, true)}${capped ? ' capped' : ''}`}
                                  disabled={capped}
                                  onClick={() => toggleSauce(item)}
                                >
                                  {item.toUpperCase()}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="rightPanel">
          <div className="rightStack">
            <div className="borne">
              <div className="borneNameplate">MONKEBAB</div>

              <div className="previewCard">
                <div className="previewFrame">
                  {/* Same renderDesign() composition as the print file and
                      /tshirt — the deterministic engine is the only thing
                      that ever decides these 4 lines; this just displays
                      its output. Always rendered at PREVIEW_FORMAT — the
                      borne's shape never changes with the export format
                      picked below. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={shareSrc} alt="Aperçu de ton design" className="previewImage" />
                </div>
              </div>

              <div className="validationCard">
                <div className="validationHeader">VALIDATION DU CRÉATEUR</div>
                <div className="validationScoreRow">
                  <span className="validationEmoji">{validation.emoji}</span>
                  <span className="validationScore">{validation.score}%</span>
                </div>
                <div className="validationBar">
                  <div className="validationFill" style={{ width: `${validation.ratio}%` }} />
                </div>
                <div className="validationLabel">{validation.label}</div>
              </div>
            </div>

            <div className="bottomActions">
              <div className="shareDownloadRow">
                <button type="button" className="shareButton" onClick={() => openFormatDialog('share')}>
                  PARTAGER
                </button>
                <button type="button" className="downloadButton" onClick={() => openFormatDialog('download')}>
                  TÉLÉCHARGER
                </button>
              </div>
              <button type="button" className="tshirtButton" onClick={handleTshirt}>
                OBTENIR MON T-SHIRT 👕
              </button>
            </div>
          </div>
        </section>
      </div>

      <dialog
        ref={formatDialogRef}
        className="formatDialog"
        onClick={(e) => {
          if (e.target === e.currentTarget) formatDialogRef.current?.close();
        }}
        // Native <dialog> is supposed to close on Escape on its own, but
        // that default action doesn't reliably fire in every environment —
        // this is a deterministic fallback, not a replacement; closing an
        // already-closed dialog is a harmless no-op.
        onKeyDown={(e) => {
          if (e.key === 'Escape') formatDialogRef.current?.close();
        }}
      >
        <div className="formatDialogInner">
          {exportFormats.map((fmt) => (
            <button key={fmt} type="button" className="formatOption" onClick={() => chooseFormat(fmt)}>
              {formatLabels[fmt]}
            </button>
          ))}
        </div>
      </dialog>

      <style jsx>{`
        /*
         * Desktop layout uses a two-row page grid (title / layout) so the
         * layout row has a *definite* height. This makes height:100% on
         * child panels resolve identically in Chrome and Safari — both now
         * derive from the explicit grid row size rather than from a flex:1
         * chain, which the two engines handled differently.
         */
        .page {
          height: 100vh;
          padding: 24px;
          box-sizing: border-box;
          display: grid;
          /* minmax(0,1fr) lets the row shrink below content min-height;
             without the 0 minimum, a tall left panel expands the row and
             pushes Chrome/Safari to render very differently */
          grid-template-rows: auto minmax(0, 1fr);
          background: #000;
          color: #fff;
          /* Anton only ships one real weight (400) — anywhere this page
             asks for font-weight:700 the browser was faking it by fattening
             strokes algorithmically, which is what made the UI text read as
             heavy/"boudiné" on top of an already-bold display face. */
          font-synthesis: none;
          overflow: hidden;
        }

        .layout {
          width: 100%;
          max-width: 1400px;
          margin: 0 auto;
          display: grid;
          /* ~57% left / ~43% right — left gets a bit more room for the
             larger accordion typography */
          grid-template-columns: minmax(0, 12fr) minmax(0, 9fr);
          grid-template-rows: minmax(0, 1fr);
          gap: 48px;
          height: 100%;
          min-height: 0;
        }

        .leftPanel,
        .rightPanel {
          min-width: 0;
          min-height: 0;
        }

        .leftPanel {
          height: 100%;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .leftContent {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
        }

        .rightPanel {
          height: 100%;
          min-width: 0;
          display: flex;
          align-items: stretch;
          overflow: hidden;
        }

        .rightStack {
          width: 100%;
          height: 100%;
          min-height: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        /* The "borne" — a kiosk screen bezel around the live preview. The
           one deliberately rounded element in the app; a device cue built
           from shape/border only, no texture/gradient/shadow. */
        .borne {
          /* Deliberately NOT flex:1 — a fixed-height accordion on the left
             can't stretch to fill a tall viewport without looking broken,
             so the borne is sized to its own (capped) content instead of
             filling the row too. Both columns then pack at the top with
             similar, viewport-independent heights rather than one
             stretching to match whatever the other one happens to need. */
          width: 100%;
          background: #050505;
          border: 1px solid #666;
          border-radius: 18px;
          padding: 16px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .borneNameplate {
          flex-shrink: 0;
          text-align: center;
          font-size: 0.8rem;
          letter-spacing: 0.25em;
          opacity: 0.6;
          padding-bottom: 8px;
          margin-bottom: 8px;
          border-bottom: 1px solid #262626;
        }

        .validationCard {
          width: 100%;
          flex-shrink: 0;
          padding-top: 5px;
          margin-top: 5px;
          border-top: 1px solid #262626;
          display: flex;
          flex-direction: column;
          gap: 4px;
          box-sizing: border-box;
          overflow: hidden;
        }

        .validationHeader,
        .validationScoreRow,
        .validationBar,
        .validationLabel {
          min-width: 0;
        }

        .validationHeader {
          font-size: 0.62rem;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #bbb;
        }

        .validationScoreRow {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 1.05rem;
          font-weight: 700;
          text-transform: uppercase;
          min-width: 0;
        }

        .validationEmoji {
          font-size: 1.15rem;
          line-height: 1;
        }

        .validationScore {
          letter-spacing: 0.06em;
          white-space: nowrap;
        }

        .validationBar {
          width: 100%;
          height: 5px;
          border-radius: 999px;
          background: #111;
          border: 1px solid #444;
          overflow: hidden;
        }

        .validationFill {
          height: 100%;
          background: #fff;
          width: 0%;
          transition: width 0.2s ease;
        }

        .validationLabel {
          color: #bbb;
          font-size: 0.7rem;
          line-height: 1.4;
          letter-spacing: 0.02em;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .previewCard {
          width: 100%;
          /* Never let this be the thing that silently shrinks when the
             bezel is tight on vertical space — the rendered order must
             never be visibly cropped. If space really runs out, .borne can
             grow past its row instead (visible/obvious in QA), not this. */
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        /* Fixed aspect ratio — the borne's screen never changes shape when
           an export format is picked in the share/download dialog. Capped
           at a fixed max-width so the borne has a natural, bounded height
           instead of growing to fill whatever space a tall viewport offers. */
        /* No border/background of its own — the rendered PNG already has
           its own frame baked in (drawn server-side by lib/design/share.ts,
           untouched here), so a second CSS frame directly around it just
           produced a redundant nested-boxes look. This is spacing only,
           not another frame; the bezel (.borne) is the sole CSS-level one. */
        .previewFrame {
          aspect-ratio: 4 / 5;
          width: 100%;
          max-width: 300px;
          padding: 8px;
          display: flex;
          justify-content: center;
          align-items: center;
          overflow: hidden;
          box-sizing: border-box;
        }

        .previewImage {
          display: block;
          max-width: 100%;
          max-height: 100%;
          width: auto;
          height: auto;
        }

        .downloadButton,
        .shareButton {
          border: 1px solid #666;
          background: #000;
          color: #fff;
          width: 100%;
          height: 100%;
          font-weight: 400;
          font-size: 0.92rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          cursor: pointer;
          transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
        }

        .downloadButton:hover,
        .shareButton:hover {
          border-color: #999;
        }

        .formatDialog {
          /* explicit margin:auto — a global CSS reset (Tailwind preflight)
             zeroes <dialog>'s default margin, which is what the browser
             normally uses to center a modal dialog; without restating it
             here the dialog sticks to the inset:0 top-left corner instead */
          margin: auto;
          background: #000;
          color: #fff;
          border: 1px solid #666;
          border-radius: 0;
          padding: 0;
          width: min(320px, 90vw);
        }

        :global(dialog.formatDialog::backdrop) {
          background: rgba(0, 0, 0, 0.7);
        }

        .formatDialogInner {
          display: flex;
          flex-direction: column;
        }

        .formatOption {
          width: 100%;
          height: 52px;
          border: none;
          border-bottom: 1px solid #333;
          background: #000;
          color: #fff;
          font-weight: 400;
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          cursor: pointer;
          transition: background 0.2s ease, color 0.2s ease;
        }

        .formatOption:last-child {
          border-bottom: none;
        }

        .formatOption:hover {
          background: #fff;
          color: #000;
        }

        .bottomActions {
          width: 100%;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .tshirtButton {
          /* Primary action — filled, same treatment as the COMMANDER button
             on /tshirt, so it reads as the one action that matters versus
             the secondary PARTAGER/TÉLÉCHARGER pair below it. */
          width: 100%;
          height: 56px;
          border: 1px solid #fff;
          background: #fff;
          color: #000;
          font-weight: 400;
          font-size: 0.92rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          cursor: pointer;
          transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
        }

        .tshirtButton:hover {
          background: #e0e0e0;
        }

        .tshirtButton:active {
          background: #000;
          color: #fff;
          border-color: #fff;
        }

        .shareDownloadRow {
          width: 100%;
          height: 56px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .titleBlock {
          width: min(100%, 1400px);
          display: flex;
          flex-direction: column;
          /* MONKEBAB / BORNE DE COMMANDE / tagline read as one tight,
             grouped intro block — uniform small gap between all three
             (the tagline no longer gets its own larger margin-top on top
             of this). */
          gap: 5px;
          padding-right: 10px;
          /* A real, distinct break before the configurator — bigger than
             the gaps inside the intro block above, so PAIN doesn't run
             into the tagline. Compacting the block above by the same
             amount it grows by here keeps the configurator's own vertical
             position unchanged, net. */
          margin-bottom: 19px;
        }

        .titleBlock h1 {
          margin: 0;
          font-size: clamp(3rem, 4vw, 4.5rem);
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .titleBlock p {
          margin: 0;
          opacity: 0.82;
          letter-spacing: 0.16em;
          font-size: 1rem;
        }

        .titleBlock p.tagline {
          opacity: 0.62;
          letter-spacing: 0.03em;
          font-size: 0.85rem;
        }

        .accordion {
          display: grid;
          gap: 18px;
          overflow: hidden;
        }

        .accordionSection {
          background: #050505;
          border: 1px solid #333;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .accordionHeader {
          width: 100%;
          padding: 26px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #000;
          color: #fff;
          border: none;
          cursor: pointer;
          text-transform: uppercase;
          /* Anton's real (only) weight — see .page's font-synthesis:none */
          font-weight: 400;
          letter-spacing: 0.06em;
          font-size: 1.15rem;
        }

        .headerLabel {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        /* :global — the icon components (IconPain etc.) render their own
           <svg> in a separate function, so styled-jsx's scoping class never
           reaches it; the selector has to opt out of scoping to apply. */
        :global(.sectionIcon) {
          width: 24px;
          height: 24px;
          flex-shrink: 0;
        }

        .summary {
          opacity: 0.78;
          font-weight: 400;
          font-size: 1rem;
          /* Tighter than the header's own tracking — long comma-separated
             values ("SALADE, TOMATE, OIGNON") need it to avoid reading as
             overly stretched/compressed against the available width. */
          letter-spacing: 0.02em;
          text-align: right;
          max-width: 58%;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sectionHint {
          margin-left: 8px;
          opacity: 0.5;
          font-size: 0.68rem;
          letter-spacing: 0.06em;
          font-weight: 400;
        }

        .accordionBody {
          padding: 22px 24px 26px;
          display: grid;
          gap: 13px;
        }

        .accordionBody.scrollable {
          max-height: calc(100vh - 240px);
          overflow-y: auto;
          padding-right: 10px;
        }

        .grid {
          display: grid;
          gap: 12px;
        }

        .twoColumns {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .saucesGrid {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        .option {
          border: 1px solid #666;
          background: #000;
          color: #fff;
          min-height: 60px;
          padding: 0 16px;
          font-weight: 400;
          font-size: 1.05rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
        }

        .option.compact {
          min-height: 44px;
          font-size: 0.88rem;
          letter-spacing: 0.03em;
          padding: 0 10px;
        }

        .option:hover {
          border-color: #999;
        }

        .option.capped {
          opacity: 0.35;
          cursor: not-allowed;
        }

        .option.capped:hover {
          border-color: #666;
        }

        .selected {
          background: #fff;
          color: #000;
          border-color: #fff;
        }

        .actionButton {
          width: fit-content;
          padding: 10px 16px;
          border: 1px solid #666;
          background: #000;
          color: #fff;
          text-transform: uppercase;
          font-weight: 700;
          letter-spacing: 0.08em;
          cursor: pointer;
        }

        .actionButton:hover {
          border-color: #999;
        }

        @media (max-width: 900px) {
          .page {
            height: auto;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            overflow-x: hidden;
            overflow-y: auto;
            padding: 16px 12px;
          }

          .layout {
            display: flex;
            flex-direction: column;
            max-width: 100%;
            height: auto;
            gap: 18px;
          }

          .leftPanel,
          .rightPanel {
            width: 100%;
            height: auto;
            min-height: auto;
            overflow: visible;
          }

          .leftPanel {
            order: 1;
          }

          .rightPanel {
            order: 2;
            height: auto;
          }

          .rightStack {
            width: 100%;
            height: auto;
            gap: 12px;
          }

          .titleBlock h1 {
            font-size: clamp(2.2rem, 7vw, 3rem);
          }

          .titleBlock {
            margin-bottom: 36px;
          }

          .titleBlock p {
            font-size: 1rem;
            line-height: 1.2;
          }

          .accordionHeader {
            padding: 16px 18px;
            font-size: 1.02rem;
          }

          .headerLabel {
            gap: 12px;
          }

          :global(.sectionIcon) {
            width: 20px;
            height: 20px;
          }

          .accordionBody {
            padding: 14px 16px 18px;
            gap: 12px;
          }

          .saucesGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
            grid-auto-rows: minmax(44px, auto);
          }

          .saucesGrid .option {
            font-size: 0.82rem;
            min-height: 44px;
            padding: 0 12px;
            letter-spacing: 0.05em;
            line-height: 1.15;
            white-space: normal;
            word-break: break-word;
            text-align: center;
          }

          .downloadButton,
          .shareButton {
            min-height: 44px;
            font-size: 0.88rem;
            letter-spacing: 0.06em;
          }

          .tshirtButton {
            min-height: 44px;
            font-size: 0.88rem;
            letter-spacing: 0.06em;
          }

          .shareDownloadRow {
            height: auto;
          }

          .borne {
            width: 100%;
            height: auto;
            flex: none;
            padding: 14px;
            border-radius: 14px;
          }

          .borneNameplate {
            font-size: 0.7rem;
            padding-bottom: 10px;
            margin-bottom: 10px;
          }

          .previewCard {
            width: 100%;
            height: auto;
            flex: none;
          }

          .previewFrame {
            width: 100%;
            max-width: 480px;
            max-height: none;
            height: auto;
            margin: 0 auto;
          }

          .previewImage {
            width: 100%;
            height: auto;
          }

          .validationCard {
            width: 100%;
            padding-top: 6px;
            margin-top: 6px;
          }

          .validationScoreRow {
            font-size: 0.95rem;
            gap: 6px;
          }

          .validationLabel {
            white-space: normal;
            overflow: visible;
            text-overflow: unset;
          }

          .bottomActions {
            position: sticky;
            bottom: 12px;
            z-index: 10;
            background: #000;
            padding-top: 8px;
          }

          .formatDialog {
            margin: auto 0 0;
            width: 100%;
            max-width: 100%;
          }
        }

        @media (max-width: 760px) {
          .saucesGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .titleBlock h1 {
            font-size: clamp(2rem, 8vw, 2.8rem);
          }

          .accordionHeader {
            flex-direction: column;
            align-items: flex-start;
            gap: 6px;
          }

          .summary {
            max-width: 100%;
            white-space: normal;
            /* A touch more discreet than the category label on mobile,
               reinforcing "category, then current choice" as you read down
               the stacked header instead of the two reading with equal
               weight. */
            opacity: 0.62;
            font-size: 0.92rem;
          }
        }
      `}</style>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div style={{ background: '#000', minHeight: '100vh' }} />}>
      <HomeContent />
    </Suspense>
  );
}
