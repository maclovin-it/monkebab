// Runs client-side only — uses browser Canvas API.
// Produces a 1800×2400 PNG with white text on a transparent background,
// sized for Printful DTG print-on-demand (draft quality).
export function generateDesignImage(
  bread: string,
  meat: string,
  vegetables: string[],
  sauces: string[]
): Promise<Blob> {
  const W = 1800;
  const H = 2400;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Transparent background — do not fill.
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

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

  // Vertical layout: balanced centering around the midpoint (H/2 = 1200)
  // bread: y=750  meat: y=1020  vegetables: y=1260  sauces: y=1450
  const layout = [
    { text: line1, y: 750,  size: 200, weight: 'bold' },
    { text: line2, y: 1020, size: 280, weight: 'bold' },
    { text: line3, y: 1290, size: 155, weight: 'bold' },
    { text: line4, y: 1460, size: 120, weight: 'bold' },
  ] as const;

  for (const { text, y, size } of layout) {
    ctx.font = `bold ${size}px Arial Black, Arial, Helvetica, sans-serif`;

    // Dark stroke for visibility on light backgrounds and in preview
    ctx.lineWidth = size * 0.06;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.lineJoin = 'round';
    ctx.strokeText(text, cx, y, maxW);

    // Subtle drop shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = size * 0.08;
    ctx.shadowOffsetX = size * 0.02;
    ctx.shadowOffsetY = size * 0.02;

    // Off-white fill
    ctx.fillStyle = '#f5f5f5';
    ctx.fillText(text, cx, y, maxW);

    // Reset shadow before next stroke pass
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
