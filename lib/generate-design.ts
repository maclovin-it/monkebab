'use client';

export interface DesignLine {
  text: string;
  fontSize: number; // logical px — will be scaled ×4
}

export async function generateDesignImage(lines: DesignLine[]): Promise<string> {
  // Wait for the embedded AntonPrint font specifically before drawing
  try {
    await document.fonts.load("400 56px 'AntonPrint'");
  } catch {
    try {
      await document.fonts.load("400 56px 'Anton'");
    } catch {
      // proceed with fallback
    }
  }

  const SCALE = 4;
  const W = 500 * SCALE; // 2000 px
  const H = 625 * SCALE; // 2500 px

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Transparent background — Printful DTG prints on the black t-shirt underneath
  ctx.clearRect(0, 0, W, H);

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  const LINE_HEIGHT = 1.15;
  const GAP = 6 * SCALE;
  const MAX_W = W * 0.84; // 8% padding each side

  const lineHeights = lines.map(({ fontSize }) => fontSize * SCALE * LINE_HEIGHT);
  const totalH = lineHeights.reduce((a, b) => a + b, 0) + GAP * (lines.length - 1);

  let y = (H - totalH) / 2 + lineHeights[0];
  for (let i = 0; i < lines.length; i++) {
    const { text, fontSize } = lines[i];
    ctx.font = `400 ${fontSize * SCALE}px 'AntonPrint', 'Anton', sans-serif`;
    ctx.fillText(text, W / 2, y, MAX_W);
    y += lineHeights[i] + GAP;
  }

  return canvas.toDataURL('image/png');
}
