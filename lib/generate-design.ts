'use client';

import { toPng } from 'html-to-image';

export async function generateDesignImage(element: HTMLElement): Promise<Blob> {
  await document.fonts.ready;

  const dataUrl = await toPng(element, {
    pixelRatio: 4,
    cacheBust: false,
    filter: (node: Node) => node === element || element.contains(node),
  });

  const res = await fetch(dataUrl);
  return await res.blob();
}
