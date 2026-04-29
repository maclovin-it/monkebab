import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { size = '', bread = '', meat = '', vegetables = [], sauces = [] } = body as {
    size?: string;
    bread?: string;
    meat?: string;
    vegetables?: string[];
    sauces?: string[];
  };

  const vegetablesStr = vegetables.join(',');
  const saucesStr = sauces.join(',');
  const meta = { size, bread, meat, vegetables: vegetablesStr, sauces: saucesStr };

  console.log('[checkout] received body:', meta);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      currency: "cad",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "cad",
            unit_amount: 2500,
            product_data: {
              name: "Mon Kebab T-Shirt",
            },
          },
        },
      ],
      metadata: meta,
      payment_intent_data: {
        metadata: meta,
      },
      success_url: "http://localhost:3000/success",
      cancel_url: "http://localhost:3000/cancel",
    });

    return Response.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stripe error";
    return Response.json({ error: message }, { status: 500 });
  }
}
