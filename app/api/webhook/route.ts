import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const processedSessions = new Set<string>();

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

    if (processedSessions.has(session.id)) {
      console.log("[webhook] already processed, skipping:", session.id);
      return Response.json({ received: true });
    }
    processedSessions.add(session.id);

    const { size, bread, meat, vegetables, sauces } = session.metadata ?? {};

    console.log("[webhook] checkout.session.completed", {
      sessionId: session.id,
      size,
      bread,
      meat,
      vegetables,
      sauces,
    });

    const printfulHeaders = {
      Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
      "Content-Type": "application/json",
      "X-PF-Store-Id": process.env.PRINTFUL_STORE_ID!,
    };

    const printfulResponse = await fetch("https://api.printful.com/orders", {
      method: "POST",
      headers: printfulHeaders,
      body: JSON.stringify({
        confirm: false,
        recipient: {
          name: "Test User",
          address1: "123 Test Street",
          city: "Toronto",
          state_code: "ON",
          country_code: "CA",
          zip: "M5V 2T6",
        },
        items: [
          {
            variant_id: 11547,
            quantity: 1,
            name: `Mon Kebab T-Shirt - ${size ?? "M"}`,
            files: [
              {
                url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/280px-PNG_transparency_demonstration_1.png",
              },
            ],
          },
        ],
      }),
    });

    const printfulData = await printfulResponse.json();

    console.log("[printful] order response", printfulData);
  }

  return Response.json({ received: true });
}