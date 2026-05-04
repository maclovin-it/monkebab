'use client';

import { toPng } from 'html-to-image';

// Fetch Anton from Google Fonts CDN and return it as a base64 data URI.
// Embedding it directly means html-to-image never needs to fetch it again,
// avoiding CORS issues and font-loading timing problems.
async function loadAntonDataUri(): Promise<string> {
  const res = await fetch(
    'https://fonts.gstatic.com/s/anton/v25/1Ptgg87LROyAm3Kz-C8.woff2'
  );
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function generateDesignImage(
  bread: string,
  meat: string,
  vegetables: string[],
  sauces: string[]
): Promise<Blob> {
  const antonDataUri = await loadAntonDataUri();

  const line1 = (bread || 'SANS PAIN').toUpperCase();
  const line2 = (meat || 'SANS VIANDE').toUpperCase();
  const line3 = vegetables.length
    ? vegetables.map((v) => v.toUpperCase()).join(', ')
    : 'SANS CRUDITÉS';
  const line4 = sauces.length
    ? sauces.map((s) => s.toUpperCase()).join(', ')
    : 'SANS SAUCE';

  // Absolute (not fixed) avoids capturing page-level fixed overlays.
  const container = document.createElement('div');
  Object.assign(container.style, {
    position: 'absolute',
    top: '-9999px',
    left: '-9999px',
    width: '1800px',
    height: '2400px',
    backgroundColor: '#000000',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px',
    padding: '0 60px',
    boxSizing: 'border-box',
    overflow: 'hidden',
  });

  // Inject font under a unique family name — avoids any conflict with
  // Next.js-registered "Anton" and guarantees html-to-image finds it as
  // a data URI (no network fetch, no CORS).
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    @font-face {
      font-family: 'AntonPrint';
      src: url('${antonDataUri}') format('woff2');
      font-weight: 400;
      font-style: normal;
    }
  `;
  container.appendChild(styleEl);

  const FONT = "'AntonPrint', sans-serif";

  // Font sizes chosen so the longest realistic strings
  // (e.g. "POULET TIKKA", "SANS CRUDITÉS") stay on one line within 1680 px.
  const lines: { text: string; size: string; wrap: boolean }[] = [
    { text: line1, size: '165px', wrap: false }, // bread
    { text: line2, size: '205px', wrap: false }, // meat — dominant
    { text: line3, size: '130px', wrap: true  }, // vegetables — may be long
    { text: line4, size: '108px', wrap: true  }, // sauces — may be long
  ];

  for (const { text, size, wrap } of lines) {
    const el = document.createElement('div');
    el.textContent = text;
    Object.assign(el.style, {
      fontFamily: FONT,
      fontWeight: '400',
      fontStyle: 'normal',
      fontSize: size,
      color: '#ffffff',
      lineHeight: '1.15',
      letterSpacing: '0.02em',
      textAlign: 'center',
      width: '100%',
      whiteSpace: wrap ? 'normal' : 'nowrap',
      wordBreak: 'break-word',
    });
    container.appendChild(el);
  }

  document.body.appendChild(container);

  try {
    const dataUrl = await toPng(container, {
      width: 1800,
      height: 2400,
      pixelRatio: 1,
      cacheBust: false,
      // Only capture nodes inside our container — filters out any injected
      // page-level elements (AdSense, dev overlays, etc.).
      filter: (node: Node) =>
        node === container || container.contains(node),
    });

    const res = await fetch(dataUrl);
    return await res.blob();
  } finally {
    document.body.removeChild(container);
  }
}
