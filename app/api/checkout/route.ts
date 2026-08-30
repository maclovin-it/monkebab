import { getStripe } from "@/lib/stripe";
import { validateSelection } from "@/lib/design/options";
import { renderDesign } from "@/lib/design/render";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { size = '', bread = '', meat = '', vegetables = [], sauces = [] } = body as {
    size?: string;
    bread?: string;
    meat?: string;
    vegetables?: string[];
    sauces?: string[];
  };

  // The print file is generated server-side from these fields, never
  // accepted from the client — this is also what guarantees the preview the
  // customer saw on /tshirt (rendered by the same engine, same inputs) is
  // byte-identical to what ships to Printful.
  const selection = { pain: bread, viande: meat, crudites: vegetables, sauces };
  const validation = validateSelection(selection);

  if (!validation.ok) {
    console.error('[checkout] invalid selection:', validation.errors);
    return Response.json({ error: 'Invalid selection', details: validation.errors }, { status: 400 });
  }

  // Fail before charging the customer, not after — if this selection can't
  // be rendered within the safe zone, something is wrong upstream (a gap
  // between the client's option list and the locked layout's audited set).
  try {
    const { overflow } = renderDesign(selection);
    if (overflow.length > 0) {
      console.error('[checkout] design overflow detected, refusing to charge:', { selection, overflow });
      return Response.json({ error: 'Design layout error' }, { status: 500 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Render failed';
    console.error('[checkout] design render failed:', message);
    return Response.json({ error: message }, { status: 500 });
  }

  const vegetablesStr = vegetables.join(',');
  const saucesStr = sauces.join(',');

  const baseUrl =
  process.env.NODE_ENV === "production"
    ? "https://monkebab.xyz"
    : "http://localhost:3000";

  const designParams = new URLSearchParams();
  if (bread) designParams.set('pain', bread);
  if (meat) designParams.set('viande', meat);
  if (vegetables.length) designParams.set('crudites', vegetables.join(','));
  if (sauces.length) designParams.set('sauces', sauces.join(','));
  // Self-hosted, deterministic: same params always regenerate the exact same
  // PNG, so Printful fetching this URL later gets exactly what the customer
  // previewed — no upload step, no third-party storage in the loop.
  const printFileUrl = `${baseUrl}/api/design?${designParams.toString()}`;

  const meta = {
    size,
    bread,
    meat,
    vegetables: vegetablesStr,
    sauces: saucesStr,
    printFileUrl,
  };

  console.log('[checkout] received body:', meta);

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      currency: "eur",
      // fr locale: EUR shown first, France pre-selected as default country
      locale: "fr",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: 2999,
            product_data: {
              name: "Ton Kebab T-Shirt personnalisé",
              description: `Ton kebab sur t-shirt 🥙👕 | ${bread} · ${meat} · ${vegetables} · ${sauces} | Livraison incluse`,
              images: ["https://res.cloudinary.com/dtyn7j361/image/upload/v1777654524/MOCK_UP_TA_COMMANDE_PERSONNE%CC%81LISE%CC%81E_kkafkj.png"],
            },
          },
        },
      ],
      shipping_address_collection: {
        // BE/LU added after a Printful cost-estimate audit (real API costs,
        // not assumed) confirmed their landed margin at 29,99€ stays within
        // ~2pp of France (53.8% / 55.3% vs 54.1%) — well above the 45%
        // acceptance threshold. Price, "livraison incluse", and everything
        // else about the checkout is unchanged.
        allowed_countries: ["FR", "BE", "LU"],
      },
      custom_text: {
        shipping_address: {
          message: "Fabriqué à la demande · Expédié sous 3–5 jours ouvrés 🚚",
        },
      },
      metadata: meta,
      payment_intent_data: {
        metadata: meta,
      },
      success_url: `${baseUrl}/success`,
      cancel_url: `${baseUrl}/cancel`,
    });

    return Response.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stripe error";
    return Response.json({ error: message }, { status: 500 });
  }
}
