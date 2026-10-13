import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { ensureCommerceSchema, getPool } from "@/lib/reports";

const API_BASE = "https://api.lemonsqueezy.com/v1";

export function isLemonSqueezyConfigured() {
  return Boolean(
    process.env.LEMONSQUEEZY_API_KEY &&
      process.env.LEMONSQUEEZY_STORE_ID &&
      process.env.LEMONSQUEEZY_VARIANT_ID,
  );
}

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://lovescannerai.com").replace(/\/$/, "");
}

export async function createReportCheckout({
  reportId,
  userId,
  email,
}: {
  reportId: string;
  userId?: string | null;
  email?: string | null;
}): Promise<{ url: string } | { error: string }> {
  if (!isLemonSqueezyConfigured()) return { error: "Payments are not available yet." };

  const custom: Record<string, string> = { report_id: reportId };
  if (userId) custom.user_id = userId;

  const response = await fetch(`${API_BASE}/checkouts`, {
    method: "POST",
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      Authorization: `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
    },
    body: JSON.stringify({
      data: {
        type: "checkouts",
        attributes: {
          product_options: {
            redirect_url: `${siteUrl()}/en/report/${encodeURIComponent(reportId)}?paid=1`,
          },
          checkout_data: {
            ...(email ? { email } : {}),
            custom,
          },
          test_mode: process.env.LEMONSQUEEZY_TEST_MODE === "true" ? true : undefined,
        },
        relationships: {
          store: { data: { type: "stores", id: String(process.env.LEMONSQUEEZY_STORE_ID) } },
          variant: { data: { type: "variants", id: String(process.env.LEMONSQUEEZY_VARIANT_ID) } },
        },
      },
    }),
  });

  const json = (await response.json().catch(() => null)) as
    | { data?: { attributes?: { url?: string } }; errors?: unknown }
    | null;
  const url = json?.data?.attributes?.url;
  if (!response.ok || !url) {
    console.error("lemonsqueezy checkout failed:", response.status, JSON.stringify(json?.errors ?? json));
    return { error: "Could not start checkout. Please try again." };
  }
  return { url };
}

export function verifyLemonSqueezySignature(rawBody: string, signature: string | null) {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const digest = Buffer.from(createHmac("sha256", secret).update(rawBody).digest("hex"), "utf8");
  const received = Buffer.from(signature, "utf8");
  if (digest.length !== received.length) return false;
  return timingSafeEqual(digest, received);
}

type OrderPayload = {
  meta?: { event_name?: string; custom_data?: Record<string, unknown> };
  data?: {
    id?: string | number;
    attributes?: {
      status?: string;
      total?: number;
      currency?: string;
      user_email?: string;
      test_mode?: boolean;
    };
  };
};

export async function handleLemonSqueezyEvent(payload: OrderPayload) {
  const eventName = payload.meta?.event_name;
  const reportId = String(payload.meta?.custom_data?.report_id ?? "").trim();
  const userId = String(payload.meta?.custom_data?.user_id ?? "").trim() || null;
  const orderId = payload.data?.id != null ? String(payload.data.id) : "";
  const attrs = payload.data?.attributes ?? {};

  const db = getPool();
  if (!db) throw new Error("DATABASE_URL is not configured");
  await ensureCommerceSchema();

  if (eventName === "order_created") {
    if (attrs.status !== "paid" || !reportId || !orderId) return { handled: false, reason: "not a paid report order" };
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const existing = await client.query(
        "SELECT id FROM purchases WHERE provider = 'lemonsqueezy' AND provider_order_id = $1",
        [orderId],
      );
      if (!existing.rows[0]) {
        await client.query(
          `INSERT INTO purchases
            (id, user_id, report_id, provider, provider_order_id, product_type, amount_cents, currency, status, purchased_at)
           VALUES ($1, $2, $3, 'lemonsqueezy', $4, 'single_report', $5, $6, 'paid', NOW())`,
          [randomUUID(), userId, reportId, orderId, attrs.total ?? null, attrs.currency ?? null],
        );
      }
      await client.query(
        "UPDATE love_reports SET is_paid = TRUE, paid_at = COALESCE(paid_at, NOW()), user_id = COALESCE(user_id, $2) WHERE id = $1",
        [reportId, userId],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
    return { handled: true };
  }

  if (eventName === "order_refunded") {
    if (!orderId) return { handled: false, reason: "missing order id" };
    const result = await db.query(
      `UPDATE purchases SET status = 'refunded', refunded_at = NOW()
       WHERE provider = 'lemonsqueezy' AND provider_order_id = $1
       RETURNING report_id`,
      [orderId],
    );
    const refundedReport = result.rows[0]?.report_id as string | undefined;
    if (refundedReport) {
      await db.query("UPDATE love_reports SET is_paid = FALSE, paid_at = NULL WHERE id = $1", [refundedReport]);
    }
    return { handled: true };
  }

  return { handled: false, reason: `ignored event ${eventName}` };
}
