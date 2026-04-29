// Gildan 5000 Black M = variant_id 11547 (product 438 in Printful catalog)
const DRAFT_ORDER = {
  confirm: false,
  recipient: {
    name: "Test User",
    address1: "123 Queen Street West",
    city: "Toronto",
    state_code: "ON",
    country_code: "CA",
    zip: "M5H 2M9",
  },
  items: [
    {
      variant_id: 11547,
      quantity: 1,
      files: [
        {
          type: "front",
          url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/280px-PNG_transparency_demonstration_1.png",
        },
      ],
    },
  ],
};

export async function POST() {
  const apiKey = process.env.PRINTFUL_API_KEY;
  const storeId = process.env.PRINTFUL_STORE_ID;

  if (!apiKey || !storeId) {
    return Response.json(
      { success: false, error: "Missing PRINTFUL_API_KEY or PRINTFUL_STORE_ID" },
      { status: 500 }
    );
  }

  try {
    const res = await fetch("https://api.printful.com/orders", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "X-PF-Store-Id": storeId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(DRAFT_ORDER),
    });

    const data = await res.json();

    if (!res.ok) {
      return Response.json({ success: false, error: data }, { status: res.status });
    }

    return Response.json({ success: true, data });
  } catch (error) {
    return Response.json(
      { success: false, error: "Failed to reach Printful API" },
      { status: 500 }
    );
  }
}
