// Runs client-side only — uses browser Canvas API.
// Produces a 1800×2400 PNG with white text on a transparent background,
// sized for Printful DTG print-on-demand (draft quality).

// Anton has only weight 400 — "bold" would trigger faux-bold synthesis.
const FONT_FAMILY = 'Anton';
const FONT_SPEC = (size: number) => `400 ${size}px Anton, sans-serif`;

// Letter-spacing equivalent to 0.04em applied via per-character rendering.
// Canvas doesn't support CSS letter-spacing natively in all browsers.
function drawTrackedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  letterSpacingEm: number,
  maxW: number
) {
  const chars = [...text]; // spread handles multi-byte unicode (é, è…)
  const fontSize = parseFloat(ctx.font);
  const spacing = fontSize * letterSpacingEm;

  // Measure total width including tracking
  const charWidths = chars.map((c) => ctx.measureText(c).width);
  const totalWidth =
    charWidths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);

  // Clamp to maxW by scaling spacing down proportionally
  const scale = totalWidth > maxW ? maxW / totalWidth : 1;
  const effectiveSpacing = spacing * scale;
  const scaledWidths = charWidths.map((w) => w * scale);

  let x = cx - (totalWidth * scale) / 2;

  // Save and reset textAlign so individual chars align left from x
  ctx.textAlign = 'left';
  for (let i = 0; i < chars.length; i++) {
    ctx.strokeText(chars[i], x, y);
    ctx.fillText(chars[i], x, y);
    x += scaledWidths[i] + effectiveSpacing;
  }
  ctx.textAlign = 'center';
}

async function ensureAntonLoaded() {
  await document.fonts.ready;

  // If the Next.js-served Anton isn't registered (e.g. cold canvas context),
  // load it explicitly from Google Fonts CDN.
  if (!document.fonts.check(`400 1em ${FONT_FAMILY}`)) {
    const faces = [
      // Latin basic (covers ASCII + accented: é, è, à…)
      new FontFace(
        FONT_FAMILY,
        'url(https://fonts.gstatic.com/s/anton/v25/1Ptgg87LROyAm3Kz-C8.woff2)',
        { weight: '400', style: 'normal', unicodeRange: 'U+0000-00FF' }
      ),
      // Latin extended (Ç, œ…)
      new FontFace(
        FONT_FAMILY,
        'url(https://fonts.gstatic.com/s/anton/v25/1Ptgg87LROyAm3Kz-C8.woff2)',
        { weight: '400', style: 'normal', unicodeRange: 'U+0100-02AF' }
      ),
    ];
    await Promise.all(
      faces.map(async (f) => {
        await f.load();
        document.fonts.add(f);
      })
    );
  }
}

export async function generateDesignImage(
  bread: string,
  meat: string,
  vegetables: string[],
  sauces: string[]
): Promise<Blob> {
  await ensureAntonLoaded();

  const W = 1800;
  const H = 2400;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Transparent background — no fill.
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';

  const cx = W / 2;
  const maxW = W - 120;

  const line1 = (bread || 'SANS PAIN').toUpperCase();
  const line2 = (meat || 'SANS VIANDE').toUpperCase();
  const line3 = vegetables.length
    ? vegetables.map((v) => v.toUpperCase()).join(', ')
    : 'SANS CRUDITÉS';
  const line4 = sauces.length
    ? sauces.map((s) => s.toUpperCase()).join(', ')
    : 'SANS SAUCE';

  // Vertical layout — balanced around canvas midpoint (H/2 = 1200)
  const layout = [
    { text: line1, y: 750,  size: 200 },
    { text: line2, y: 1020, size: 280 },
    { text: line3, y: 1290, size: 155 },
    { text: line4, y: 1460, size: 120 },
  ] as const;

  for (const { text, y, size } of layout) {
    ctx.font = FONT_SPEC(size);

    // Stroke pass (drawn before fill so fill always sits on top)
    ctx.lineWidth = size * 0.06;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.lineJoin = 'round';

    // Shadow only on fill pass
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = size * 0.08;
    ctx.shadowOffsetX = size * 0.02;
    ctx.shadowOffsetY = size * 0.02;

    ctx.fillStyle = '#f5f5f5';

    // 0.04em tracking — matches tight Anton display style
    drawTrackedText(ctx, text, cx, y, 0.04, maxW);

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('canvas.toBlob failed'))),
      'image/png'
    );
  });
}
