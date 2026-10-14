import { createHmac, timingSafeEqual } from "node:crypto";

function apiBase() {
  return process.env.DODO_PAYMENTS_ENV === "live" ? "https://live.dodopayments.com" : "https://test.dodopayments.com";
}

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://lovescannerai.com").replace(/\/$/, "");
}

export function isDodoConfigured() {
  return Boolean(process.env.DODO_PAYMENTS_API_KEY && process.env.DODO_PRODUCT_ID);
}

async function dodoFetch(path: string, init?: RequestInit) {
  return fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.DODO_PAYMENTS_API_KEY}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

export async function createDodoCheckout({
  reportId,
  userId,
  email,
}: {
  reportId: string;
  userId?: string | null;
  email?: string | null;
}): Promise<{ url: string } | { error: string }> {
  if (!isDodoConfigured()) return { error: "Payments are not available yet." };
  const metadata: Record<string, string> = { report_id: reportId };
  if (userId) metadata.user_id = userId;

  const response = await dodoFetch("/checkouts", {
    method: "POST",
    body: JSON.stringify({
      product_cart: [{ product_id: process.env.DODO_PRODUCT_ID, quantity: 1 }],
      return_url: `${siteUrl()}/en/report/${encodeURIComponent(reportId)}?paid=1`,
      metadata,
      ...(email ? { customer: { email } } : {}),
    }),
  });
  const json = (await response.json().catch(() => null)) as { checkout_url?: string | null } | null;
  if (!response.ok || !json?.checkout_url) {
    console.error("dodo checkout failed:", response.status, JSON.stringify(json));
    return { error: "Could not start checkout. Please try again." };
  }
  return { url: json.checkout_url };
}

export type DodoPayment = {
  payment_id?: string;
  status?: string | null;
  total_amount?: number;
  currency?: string;
  metadata?: Record<string, unknown> | null;
  product_cart?: { product_id?: string }[] | null;
};

export async function getDodoPayment(paymentId: string): Promise<DodoPayment | null> {
  if (!isDodoConfigured() || !/^[A-Za-z0-9_]+$/.test(paymentId)) return null;
  const response = await dodoFetch(`/payments/${encodeURIComponent(paymentId)}`);
  if (!response.ok) {
    console.error("dodo get payment failed:", response.status);
    return null;
  }
  return (await response.json().catch(() => null)) as DodoPayment | null;
}

/** Standard Webhooks verification: HMAC-SHA256 over `${id}.${timestamp}.${body}`, base64, key = base64-decoded secret without whsec_. */
export function verifyDodoWebhook(rawBody: string, headers: Headers) {
  const secret = process.env.DODO_PAYMENTS_WEBHOOK_SECRET;
  const id = headers.get("webhook-id");
  const timestamp = headers.get("webhook-timestamp");
  const signatureHeader = headers.get("webhook-signature");
  if (!secret || !id || !timestamp || !signatureHeader) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 5 * 60) return false;

  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = Buffer.from(createHmac("sha256", key).update(`${id}.${timestamp}.${rawBody}`).digest("base64"));

  return signatureHeader.split(" ").some((part) => {
    const [version, signature] = part.split(",");
    if (version !== "v1" || !signature) return false;
    const received = Buffer.from(signature);
    return received.length === expected.length && timingSafeEqual(received, expected);
  });
}
