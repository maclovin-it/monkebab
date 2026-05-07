'use client';
import { toPng } from 'html-to-image';

export async function generateDesignImage(element: HTMLElement): Promise<string> {
  await document.fonts.ready;

  const rect = element.getBoundingClientRect();
  const w = rect.width || 500;
  const h = rect.height || 625;

  return toPng(element, {
    pixelRatio: 4,
    width: w,
    height: h,
    cacheBust: false,
  });
}
