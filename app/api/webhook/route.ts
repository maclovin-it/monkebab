import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  const rawBody = await request.text();
  const sig = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !secret) {
    return Response.json({ error: "Missing signature or webhook secret" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Signature verification failed";
    console.error("[webhook] signature error:", message);
    return Response.json({ error: message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const { size, bread, meat, vegetables, sauces } = session.metadata ?? {};

    console.log("[webhook] checkout.session.completed", {
      sessionId: session.id,
      size,
      bread,
      meat,
      vegetables,
      sauces,
    });
  }

  return Response.json({ received: true });
}
