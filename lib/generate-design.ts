'use client';

import { toBlob } from 'html-to-image';

// Produces a 1800×2400 PNG by rendering real HTML with the exact same
// Anton font and CSS that the /tshirt preview uses.
// Runs client-side only.
export async function generateDesignImage(
  bread: string,
  meat: string,
  vegetables: string[],
  sauces: string[]
): Promise<Blob> {
  // Wait for Anton (loaded by next/font/google) to be ready.
  await document.fonts.ready;

  const line1 = (bread || 'SANS PAIN').toUpperCase();
  const line2 = (meat || 'SANS VIANDE').toUpperCase();
  const line3 = vegetables.length
    ? vegetables.map((v) => v.toUpperCase()).join(', ')
    : 'SANS CRUDITÉS';
  const line4 = sauces.length
    ? sauces.map((s) => s.toUpperCase()).join(', ')
    : 'SANS SAUCE';

  // Off-screen container — same size as the Printful front print area.
  const container = document.createElement('div');
  Object.assign(container.style, {
    position: 'fixed',
    top: '-99999px',
    left: '-99999px',
    width: '1800px',
    height: '2400px',
    backgroundColor: '#000000',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    gap: '24px',
    padding: '0 80px',
    boxSizing: 'border-box',
    overflow: 'hidden',
  });

  const lines = [
    { text: line1, fontSize: '200px', opacity: '1' },
    { text: line2, fontSize: '280px', opacity: '1' },
    { text: line3, fontSize: '155px', opacity: '1' },
    { text: line4, fontSize: '120px', opacity: '1' },
  ];

  for (const { text, fontSize } of lines) {
    const el = document.createElement('div');
    el.textContent = text;
    Object.assign(el.style, {
      fontFamily: 'Anton, sans-serif',
      fontWeight: '400',
      fontStyle: 'normal',
      fontSize,
      color: '#ffffff',
      letterSpacing: '0.04em',
      lineHeight: '1.1',
      textAlign: 'center',
      width: '100%',
      whiteSpace: 'normal',
      wordBreak: 'break-word',
    });
    container.appendChild(el);
  }

  document.body.appendChild(container);

  try {
    const blob = await toBlob(container, {
      width: 1800,
      height: 2400,
      pixelRatio: 1,
      cacheBust: true,
    });

    if (!blob) throw new Error('html-to-image returned null');
    return blob;
  } finally {
    document.body.removeChild(container);
  }
}
