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

    const { size, bread, meat, vegetables, sauces, printFileUrl } = session.metadata ?? {};

    console.log("[webhook] checkout.session.completed", {
      sessionId: session.id,
      size,
      bread,
      meat,
      vegetables,
      sauces,
    });

    const VARIANT_IDS: Record<string, number> = {
      S: 11546,
      M: 11547,
      L: 11548,
      XL: 11549,
      XXL: 11550,
    };

    const variantId = size ? VARIANT_IDS[size] : undefined;
    if (!variantId) {
      console.error("[printful] unknown or missing size, skipping order:", size);
      return Response.json({ received: true });
    }

    const printfulHeaders = {
      Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
      "Content-Type": "application/json",
      "X-PF-Store-Id": process.env.PRINTFUL_STORE_ID!,
    };

    const customerDetails = session.customer_details;

    const printfulResponse = await fetch("https://api.printful.com/orders", {
      method: "POST",
      headers: printfulHeaders,
      body: JSON.stringify({
        confirm: false,
        recipient: {
          name: customerDetails?.name || "Unknown",
          email: customerDetails?.email || "",
          address1: customerDetails?.address?.line1 || "",
          city: customerDetails?.address?.city || "",
          state_code: customerDetails?.address?.state || "",
          country_code: customerDetails?.address?.country || "FR",
          zip: customerDetails?.address?.postal_code || "",
        },
        items: [
          {
            variant_id: variantId,
            quantity: 1,
            name: `Mon Kebab T-Shirt - ${size}`,
            files: [
              {
                type: "front",
                url: printFileUrl || "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/280px-PNG_transparency_demonstration_1.png",
                position: {
                  // Print file ratio is 4:5 = 0.80 (width/height).
                  // Position ratio must match: 960/1200 = 0.80.
                  // Centered horizontally: left = (1800 - 960) / 2 = 420.
                  area_width: 1800,
                  area_height: 2400,
                  width: 960,
                  height: 1200,
                  top: 360,
                  left: 420,
                  limit_to_print_area: true,
                },
              },
            ],
          },
        ],
      }),
    });

    const printfulData = await printfulResponse.json();

    console.log("[printful] order response", printfulData);

    if (printfulResponse.status !== 200 || !printfulData?.result?.id) {
      console.error("[printful] order creation failed", {
        status: printfulResponse.status,
        body: printfulData,
      });
      return Response.json({ error: "Printful order creation failed" }, { status: 500 });
    }

    const orderId = printfulData.result.id;
    const confirmResponse = await fetch(`https://api.printful.com/orders/${orderId}/confirm`, {
      method: "POST",
      headers: printfulHeaders,
    });
    const confirmData = await confirmResponse.json();
    console.log("[printful] order confirmed", confirmData);
  }

  return Response.json({ received: true });
}