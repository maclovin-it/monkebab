// Centralized Printful API client. Every call to api.printful.com goes
// through here instead of duplicating fetch + auth headers at each call site.

const PRINTFUL_API_BASE = "https://api.printful.com";

function authHeaders(): HeadersInit {
  const apiKey = process.env.PRINTFUL_API_KEY;
  const storeId = process.env.PRINTFUL_STORE_ID;

  if (!apiKey || !storeId) {
    throw new Error("Missing PRINTFUL_API_KEY or PRINTFUL_STORE_ID environment variable");
  }

  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "X-PF-Store-Id": storeId,
  };
}

interface PrintfulResponse<T = unknown> {
  status: number;
  body: { code: number; result?: T; error?: { reason: string; message: string } };
}

async function request<T = unknown>(path: string, init?: RequestInit): Promise<PrintfulResponse<T>> {
  const res = await fetch(`${PRINTFUL_API_BASE}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init?.headers ?? {}) },
  });

  return { status: res.status, body: await res.json() };
}

export interface PrintfulRecipient {
  name: string;
  email?: string;
  address1: string;
  city: string;
  state_code: string;
  country_code: string;
  zip: string;
}

export interface PrintfulOrderFile {
  type: string;
  url: string;
  position?: Record<string, number | boolean>;
}

export interface PrintfulOrderItem {
  variant_id: number;
  quantity: number;
  name?: string;
  files: PrintfulOrderFile[];
}

export interface CreateOrderParams {
  confirm: boolean;
  recipient: PrintfulRecipient;
  items: PrintfulOrderItem[];
}

export interface PrintfulShipment {
  id: number;
  carrier: string;
  service: string;
  tracking_number: string;
  tracking_url: string;
  created: number;
  ship_date: string;
  shipped_at: string;
  reshipment: boolean;
}

export interface PrintfulOrder {
  id: number;
  external_id: string | null;
  status: string;
  recipient: PrintfulRecipient;
  shipments: PrintfulShipment[];
}

/** POST /orders — creates a draft or (with confirm: true) a submitted order. */
export function createOrder(params: CreateOrderParams) {
  return request<{ id: number }>("/orders", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

/** POST /orders/{id}/confirm — submits a draft order for fulfillment. */
export function confirmOrder(orderId: number | string) {
  return request(`/orders/${orderId}/confirm`, { method: "POST" });
}

/** GET /orders/{id} — canonical order data, used to verify webhook events. */
export function getOrder(orderId: number | string) {
  return request<PrintfulOrder>(`/orders/${orderId}`);
}
