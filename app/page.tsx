'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Anton } from 'next/font/google';

const anton = Anton({ subsets: ['latin'], weight: '400', display: 'swap' });

const painOptions = ['Pita', 'Galette', 'Naan'];
const viandeOptions = ['Kebab', 'Kefta', 'Tenders', 'Poulet Tikka'];
const cruditesOptions = ['Salade', 'Tomate', 'Oignon'];
const saucesOptions = [
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
];

const exportSizes = {
  '1:1': [1080, 1080],
  '4:5': [1080, 1350],
  '9:16': [1080, 1920],
} as const;

type ExportFormat = keyof typeof exportSizes;
const exportFormats: ExportFormat[] = ['1:1', '4:5', '9:16'];
type SectionKey = 'PAIN' | 'VIANDE' | 'CRUDITES' | 'SAUCES';
const sectionOrder: SectionKey[] = ['PAIN', 'VIANDE', 'CRUDITES', 'SAUCES'];

function formatCrudites(selected: string[]) {
  if (selected.length === 0) {
    return ['SANS CRUDITÉS'];
  }

  return [selected.join(', ')];
}

function buildPreviewLines(pain: string, viande: string, crudites: string[], sauces: string[]) {
  const first = pain ? pain.toUpperCase() : 'SANS PAIN';
  const second = viande ? viande.toUpperCase() : 'SANS VIANDE';
  const cruditeLines = formatCrudites(crudites.map((item) => item.toUpperCase()));
  const fourth = sauces.length ? sauces.map((item) => item.toUpperCase()).join(', ') : 'SANS SAUCE';
  return [first, second, ...cruditeLines, fourth];
}

function splitSauceText(ctx: CanvasRenderingContext2D, sauceText: string, maxWidth: number) {
  const parts = sauceText.split(', ');
  const lines: string[] = [];
  let current = '';

  parts.forEach((part) => {
    const candidate = current ? `${current}, ${part}` : part;
    ctx.font = ctx.font;
    if (current && ctx.measureText(candidate).width > maxWidth) {
      lines.push(current);
      current = part;
    } else {
      current = candidate;
    }
  });

  if (current) {
    lines.push(current);
  }

  return lines.length ? lines : [sauceText];
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

function getFontLimits(width: number, height: number) {
  const ratio = height / width;
  if (ratio >= 1.75) {
    return { min: 50, max: 96 };
  }
  if (ratio >= 1.2) {
    return { min: 48, max: 92 };
  }
  return { min: 46, max: 86 };
}

function fitFontSize(ctx: CanvasRenderingContext2D, lines: string[], width: number, height: number) {
  const paddingX = width * 0.1;
  const paddingY = height * 0.12;
  const maxWidth = width - paddingX * 2;
  const maxHeight = height - paddingY * 2 - 130;
  const { min, max } = getFontLimits(width, height);

  const primaryLines = lines.slice(0, 3);
  const sauceLine = lines[3] || '';

  let primaryFont = max;
  let primaryLineHeight = Math.round(primaryFont * 1.28);
  while (primaryFont >= min) {
    ctx.font = `bold ${primaryFont}px Anton, sans-serif`;
    const primaryHeight = primaryLineHeight * primaryLines.length;
    const primaryMaxWidth = primaryLines.reduce((maxW, line) => Math.max(maxW, ctx.measureText(line).width), 0);

    if (primaryMaxWidth <= maxWidth && primaryHeight <= maxHeight * 0.72) {
      break;
    }

    primaryFont -= 2;
    primaryLineHeight = Math.round(primaryFont * 1.28);
  }

  primaryFont = Math.max(primaryFont, min);
  primaryLineHeight = Math.round(primaryFont * 1.28);

  const sauceCount = sauceLine ? sauceLine.split(', ').length : 0;
  const sauceScale = sauceCount <= 1 ? 1 : Math.max(0.7, 1 - 0.06 * (sauceCount - 1));
  let sauceFont = Math.round(primaryFont * sauceScale);
  let sauceLineHeight = Math.round(sauceFont * 1.28);
  let sauceLines = splitSauceText(ctx, sauceLine, maxWidth);

  while (sauceFont >= min) {
    ctx.font = `bold ${sauceFont}px Anton, sans-serif`;
    sauceLines = splitSauceText(ctx, sauceLine, maxWidth);
    const sauceHeight = sauceLineHeight * sauceLines.length;
    const totalHeight = primaryLineHeight * primaryLines.length + sauceHeight;
    const sauceMaxWidth = sauceLines.reduce((maxW, line) => Math.max(maxW, ctx.measureText(line).width), 0);

    if (sauceMaxWidth <= maxWidth && totalHeight <= maxHeight) {
      break;
    }

    sauceFont -= 2;
    sauceLineHeight = Math.round(sauceFont * 1.28);
  }

  sauceFont = Math.max(sauceFont, min);
  sauceLineHeight = Math.round(sauceFont * 1.28);
  sauceLines = splitSauceText(ctx, sauceLine, maxWidth);

  const totalHeight = primaryLineHeight * primaryLines.length + sauceLineHeight * sauceLines.length;
  return { primaryFont, sauceFont, primaryLineHeight, sauceLineHeight, totalHeight, sauceLines };
}

function renderCanvas(ctx: CanvasRenderingContext2D, lines: string[], width: number, height: number) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = '#666';
  ctx.lineWidth = 6;
  ctx.strokeRect(12, 12, width - 24, height - 24);

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const { primaryFont, sauceFont, primaryLineHeight, sauceLineHeight, totalHeight, sauceLines } = fitFontSize(ctx, lines, width, height);

  const startY = Math.max(height * 0.46 - totalHeight / 2, height * 0.14);

  lines.slice(0, 3).forEach((line, index) => {
    ctx.font = `bold ${primaryFont}px Anton, sans-serif`;
    ctx.fillText(line, width / 2, startY + index * primaryLineHeight);
  });

  sauceLines.forEach((line, index) => {
    ctx.font = `bold ${sauceFont}px Anton, sans-serif`;
    ctx.fillText(line, width / 2, startY + primaryLineHeight * 3 + index * sauceLineHeight);
  });

  const footerFont = Math.round(primaryFont * 0.45);
  ctx.font = `bold ${footerFont}px Anton, sans-serif`;

  let footerY = height - 90;
  if (height === 1350) footerY = height - 110;
  if (height === 1080) footerY = height - 90;
  if (height === 1920) footerY = height - 150;

  ctx.fillText('monkebab.com', width / 2, footerY);
}

function createCanvasImage(lines: string[], width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Impossible de créer le contexte canvas');
  }

  renderCanvas(ctx, lines, width, height);

  return canvas;
}

async function downloadCanvasImage(lines: string[], format: ExportFormat) {
  const [width, height] = exportSizes[format];
  const canvas = createCanvasImage(lines, width, height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png', 1));
  if (!blob) {
    return;
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `monkebab-${format.replace(':', 'x')}.png`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
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

export default function Home() {
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pain, setPain] = useState('');
  const [viande, setViande] = useState('');
  const [crudites, setCrudites] = useState<string[]>([]);
  const [sauces, setSauces] = useState<string[]>([]);
  const [openSection, setOpenSection] = useState<SectionKey>('PAIN');
  const [format, setFormat] = useState<ExportFormat>('9:16');

  const previewLines = useMemo(() => buildPreviewLines(pain, viande, crudites, sauces), [pain, viande, crudites, sauces]);
  const validation = useMemo(
    () => calculateValidationScore(pain, viande, crudites, sauces),
    [pain, viande, crudites, sauces]
  );

  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const [width, height] = exportSizes[format];
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderCanvas(ctx, previewLines, width, height);
  }, [previewLines, format]);

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

  const optionClass = (active: boolean, compact = false) =>
    `option${active ? ' selected' : ''}${compact ? ' compact' : ''}`;

  const formatButtonClass = (current: ExportFormat) => `formatButton${format === current ? ' active' : ''}`;

  return (
    <main className={`page ${anton.className}`}>
      <header className="titleBlock">
        <h1>MONKEBAB</h1>
        <p>BORNE DE COMMANDE</p>
      </header>

      <div className="layout">
        <section className="leftPanel">
          <div className="leftContent">
            <div className="accordion">
              {sectionOrder.map((section) => {
                const active = openSection === section;
                return (
                  <div key={section} className={`accordionSection ${active ? 'active' : ''}`}>
                    <button type="button" className="accordionHeader" onClick={() => setOpenSection(section)}>
                      <span>{section}</span>
                      <span className="summary">{getSectionSummary(section, pain, viande, crudites, sauces)}</span>
                    </button>

                    {active ? (
                      <div className="accordionBody">
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
                            {saucesOptions.map((item) => (
                              <button
                                key={item}
                                type="button"
                                className={optionClass(sauces.includes(item), true)}
                                onClick={() => toggleSelection(item, sauces, setSauces)}
                              >
                                {item.toUpperCase()}
                              </button>
                            ))}
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

            <div className="previewCard">
              <div className="previewFrame" style={{ aspectRatio: format === '1:1' ? '1 / 1' : format === '4:5' ? '4 / 5' : '9 / 16' }}>
                <canvas ref={previewCanvasRef} className="previewCanvas" />
              </div>
            </div>

            <div className="formatButtons">
              {exportFormats.map((item) => (
                <button key={item} type="button" className={formatButtonClass(item)} onClick={() => setFormat(item)}>
                  {item}
                </button>
              ))}
            </div>

            <button type="button" className="downloadButton" onClick={() => downloadCanvasImage(previewLines, format)}>
              TÉLÉCHARGER
            </button>
          </div>
        </section>
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          height: 100vh;
          padding: 24px;
          display: flex;
          flex-direction: column;
          background: #000;
          color: #fff;
          overflow: hidden;
        }

        .layout {
          width: 100%;
          display: grid;
          grid-template-columns: 60% 40%;
          gap: 24px;
          flex: 1;
          align-content: center;
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
          justify-content: center;
        }

        .rightPanel {
          height: 100%;
          min-width: 0;
          display: flex;
          align-items: stretch;
          justify-content: center;
          overflow: hidden;
        }

        .rightStack {
          width: 100%;
          max-width: 620px;
          height: 100%;
          min-height: 0;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 12px;
        }

        .validationCard {
          width: 100%;
          min-height: 120px;
          flex-shrink: 0;
          background: #020202;
          border: 1px solid #666;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
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
          font-size: 0.75rem;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #bbb;
        }

        .validationScoreRow {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 1.45rem;
          font-weight: 700;
          text-transform: uppercase;
          min-width: 0;
        }

        .validationEmoji {
          font-size: 1.6rem;
          line-height: 1;
        }

        .validationScore {
          letter-spacing: 0.06em;
          white-space: nowrap;
        }

        .validationBar {
          width: 100%;
          height: 8px;
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
          font-size: 0.82rem;
          line-height: 1.4;
          letter-spacing: 0.02em;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .previewCard {
          width: 100%;
          flex: 1 1 auto;
          min-height: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .previewFrame {
          width: min(100%, 420px);
          max-height: 100%;
          background: #000;
          border: 1px solid #666;
          padding: 14px;
          display: flex;
          justify-content: center;
          align-items: center;
          overflow: hidden;
          box-sizing: border-box;
        }

        .previewCanvas {
          width: auto;
          height: auto;
          max-width: 100%;
          max-height: 100%;
          display: block;
          object-fit: contain;
        }

        .formatButtons {
          width: 100%;
          height: 56px;
          flex-shrink: 0;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }

        .formatButton,
        .downloadButton {
          border: 1px solid #666;
          background: #000;
          color: #fff;
          width: 100%;
          height: 100%;
          font-weight: 700;
          font-size: 0.92rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          cursor: pointer;
          transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
        }

        .downloadButton {
          width: 100%;
          height: 56px;
          flex-shrink: 0;
          min-height: 56px;
        }

        .titleBlock {
          width: min(100%, 1400px);
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding-right: 10px;
        }

        .titleBlock h1 {
          margin: 0;
          font-size: clamp(3rem, 4vw, 4.5rem);
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .titleBlock p {
          margin: 0;
          opacity: 0.72;
          letter-spacing: 0.22em;
          font-size: 0.95rem;
        }

        .accordion {
          display: grid;
          gap: 12px;
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
          padding: 18px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #000;
          color: #fff;
          border: none;
          cursor: pointer;
          text-transform: uppercase;
          font-weight: 700;
          letter-spacing: 0.12em;
          font-size: 0.95rem;
        }

        .summary {
          opacity: 0.72;
          font-size: 0.87rem;
          text-align: right;
          max-width: 55%;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .accordionBody {
          padding: 18px 20px 22px;
          display: grid;
          gap: 14px;
        }

        .accordionBody.scrollable {
          max-height: calc(100vh - 240px);
          overflow-y: auto;
          padding-right: 10px;
        }

        .grid {
          display: grid;
          gap: 10px;
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
          min-height: 52px;
          padding: 0 14px;
          font-weight: 700;
          font-size: 0.95rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
        }

        .option.compact {
          min-height: 38px;
          font-size: 0.78rem;
          letter-spacing: 0.06em;
          padding: 0 10px;
        }

        .option:hover {
          border-color: #999;
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
            min-height: auto;
            overflow-x: hidden;
            overflow-y: auto;
            padding: 16px 12px;
          }

          .layout {
            display: flex;
            flex-direction: column;
            max-width: 100%;
            height: auto;
            gap: 16px;
          }

          .leftPanel,
          .rightPanel {
            width: 100%;
          }

          .leftPanel,
          .rightPanel {
            overflow: visible;
          }

          .rightPanel {
            justify-content: flex-start;
            align-items: stretch;
            height: auto;
          }

          .rightStack {
            width: 100%;
            max-width: 100%;
            gap: 10px;
            justify-content: flex-start;
            height: auto;
          }

          .titleBlock h1 {
            font-size: clamp(2rem, 7vw, 2.8rem);
          }

          .formatButtons {
            gap: 8px;
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .formatButton,
          .downloadButton {
            min-height: 44px;
            font-size: 0.85rem;
            letter-spacing: 0.06em;
          }

          .previewCard {
            height: auto;
          }

          .previewFrame {
            width: 100%;
            max-width: 100%;
            min-height: 300px;
          }

          .previewCanvas {
            width: 100%;
            height: auto;
          }

          .validationCard {
            padding: 12px;
          }

          .validationScoreRow {
            font-size: 1.1rem;
            gap: 8px;
          }

          .validationLabel {
            white-space: normal;
            overflow: visible;
            text-overflow: unset;
          }

          .downloadButton {
            position: sticky;
            bottom: 12px;
            z-index: 5;
          }

          .saucesGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }

          .saucesGrid .option {
            font-size: 0.82rem;
            min-height: 44px;
            padding: 0 10px;
            letter-spacing: 0.06em;
            line-height: 1.1;
            white-space: normal;
            word-break: break-word;
          }
        }

        @media (max-width: 760px) {
          .saucesGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .titleBlock h1 {
            font-size: clamp(2.4rem, 8vw, 3.6rem);
          }

          .accordionHeader {
            flex-direction: column;
            align-items: flex-start;
          }

          .summary {
            max-width: 100%;
            white-space: normal;
          }
        }
      `}</style>
    </main>
  );
}
