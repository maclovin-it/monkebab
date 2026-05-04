import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { size = '', bread = '', meat = '', vegetables = [], sauces = [], printFileUrl = '' } = body as {
    size?: string;
    bread?: string;
    meat?: string;
    vegetables?: string[];
    sauces?: string[];
    printFileUrl?: string;
  };

  const vegetablesStr = vegetables.join(',');
  const saucesStr = sauces.join(',');
  const meta = {
    size,
    bread,
    meat,
    vegetables: vegetablesStr,
    sauces: saucesStr,
    printFileUrl,
  };

  console.log('[checkout] received body:', meta);

  const baseUrl =
  process.env.NODE_ENV === "production"
    ? "https://monkebab.xyz"
    : "http://localhost:3000";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      currency: "eur",
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
        allowed_countries: ["FR", "CA"],
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
