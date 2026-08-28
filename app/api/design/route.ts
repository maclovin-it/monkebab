import { renderDesign } from '@/lib/design/render';
import { validateSelection } from '@/lib/design/options';

// Deterministic design preview/print-file endpoint. Given the exact same
// query params, always returns byte-identical PNG output — this is the
// single rendering path used both for the client-facing preview (<img> tag
// on /tshirt) and, server-side, for the file actually sent to Printful.
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
    const { png, overflow } = renderDesign(selection);

    if (overflow.length > 0) {
      console.error('[design] safe-zone overflow detected', { selection, overflow });
      return Response.json({ error: 'Internal layout error' }, { status: 500 });
    }

    return new Response(new Uint8Array(png), {
      headers: {
        'Content-Type': 'image/png',
        // Deterministic output for a given query string — safe to cache hard.
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Render failed';
    console.error('[design] render failed', message);
    return Response.json({ error: message }, { status: 500 });
  }
}
