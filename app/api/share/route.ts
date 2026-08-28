import { renderShareImage, SHARE_SIZES, type ShareFormat } from '@/lib/design/share';
import { validateSelection } from '@/lib/design/options';

// Deterministic social-share image: same query shape as /api/design, plus
// `format`. Composes the exact renderDesign() output as a layer (see
// lib/design/share.ts) — this route never decides typography, only calls
// into the one place that does.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const pain = searchParams.get('pain') ?? '';
  const viande = searchParams.get('viande') ?? '';
  const crudites = (searchParams.get('crudites') ?? '').split(',').filter(Boolean);
  const sauces = (searchParams.get('sauces') ?? '').split(',').filter(Boolean);
  const formatParam = searchParams.get('format') ?? '9:16';

  if (!Object.prototype.hasOwnProperty.call(SHARE_SIZES, formatParam)) {
    return Response.json({ error: `Invalid format: ${formatParam}` }, { status: 400 });
  }
  const format = formatParam as ShareFormat;

  const selection = { pain, viande, crudites, sauces };
  const validation = validateSelection(selection);

  if (!validation.ok) {
    return Response.json({ error: 'Invalid selection', details: validation.errors }, { status: 400 });
  }

  try {
    const png = await renderShareImage(selection, format);

    return new Response(new Uint8Array(png), {
      headers: {
        'Content-Type': 'image/png',
        // Deterministic output for a given query string — safe to cache hard.
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Render failed';
    console.error('[share] render failed', message);
    return Response.json({ error: message }, { status: 500 });
  }
}
