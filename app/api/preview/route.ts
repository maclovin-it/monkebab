import { renderPreviewImage } from '@/lib/design/preview';
import { validateSelection } from '@/lib/design/options';

// Live-preview endpoint for the home page borne. Same renderDesign()
// engine as /api/design and /api/share (via renderCanvas(), see
// lib/design/render.ts) — never a second typography engine — but composes
// directly at preview size instead of generating the 3000x3750 print
// canvas first. No `format` param: the borne's screen is a fixed 600x750,
// decoupled from whatever format the user later picks in the
// PARTAGER/TÉLÉCHARGER dialog (which still goes through /api/share at the
// real export resolutions, untouched by this endpoint).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const pain = searchParams.get('pain') ?? '';
  const viande = searchParams.get('viande') ?? '';
  const crudites = (searchParams.get('crudites') ?? '').split(',').filter(Boolean);
  const sauces = (searchParams.get('sauces') ?? '').split(',').filter(Boolean);

  const selection = { pain, viande, crudites, sauces };
  const validation = validateSelection(selection);

  if (!validation.ok) {
    return Response.json({ error: 'Invalid selection', details: validation.errors }, { status: 400 });
  }

  try {
    const png = renderPreviewImage(selection);

    return new Response(new Uint8Array(png), {
      headers: {
        'Content-Type': 'image/png',
        // Deterministic output for a given query string — safe to cache hard.
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Render failed';
    console.error('[preview] render failed', message);
    return Response.json({ error: message }, { status: 500 });
  }
}
