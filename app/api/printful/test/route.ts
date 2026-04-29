export async function GET() {
  try {
    const res = await fetch("https://api.printful.com/stores", {
      headers: {
        Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      return Response.json({ success: false, error: data }, { status: res.status });
    }

    // data.result is an array of stores; pick the first store_id
    const stores: { id: number; name: string }[] = data.result ?? [];
    const store_id = stores[0]?.id ?? null;

    return Response.json({ success: true, store_id, data });
  } catch (error) {
    return Response.json(
      { success: false, error: "Failed to reach Printful API" },
      { status: 500 }
    );
  }
}
