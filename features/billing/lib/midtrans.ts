const IS_PROD = process.env.NODE_ENV === "production";

export const SERVER_KEY = IS_PROD
  ? process.env.MIDTRANS_PRODUCTION_SERVER_KEY
  : process.env.MIDTRANS_SANDBOX_SERVER_KEY;

if (!SERVER_KEY) {
  throw new Error(
    `Missing Midtrans server key (${IS_PROD ? "production" : "sandbox"})`,
  );
}

const SNAP_BASE = IS_PROD
  ? "https://app.midtrans.com/snap/v1"
  : "https://app.sandbox.midtrans.com/snap/v1";

const CORE_BASE = IS_PROD
  ? "https://api.midtrans.com/v2"
  : "https://api.sandbox.midtrans.com/v2";

const auth = Buffer.from(`${SERVER_KEY}:`).toString("base64");

const baseHeaders = {
  Authorization: `Basic ${auth}`,
  "Content-Type": "application/json",
  Accept: "application/json",
};

export async function snapPost(body: unknown) {
  const res = await fetch(`${SNAP_BASE}/transactions`, {
    method: "POST",
    headers: baseHeaders,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Snap POST failed ${res.status}: ${text}`);
  }
  return res.json() as Promise<{ token: string; redirect_url: string }>;
}

export async function coreGet(path: string) {
  const res = await fetch(`${CORE_BASE}${path}`, {
    headers: { Authorization: `Basic ${auth}`, Accept: "application/json" },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Core GET ${path} failed ${res.status}: ${text}`);
  }
  return res.json() as Promise<Record<string, unknown>>;
}

export async function corePost(path: string, body: unknown = {}) {
  const res = await fetch(`${CORE_BASE}${path}`, {
    method: "POST",
    headers: baseHeaders,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Core POST ${path} failed ${res.status}: ${text}`);
  }
  return res.json() as Promise<Record<string, unknown>>;
}
