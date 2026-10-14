import { randomUUID } from "node:crypto";
import { ensureCommerceSchema, getPool } from "@/lib/reports";

export async function markReportPaid({
  provider,
  orderId,
  reportId,
  userId,
  amountCents,
  currency,
}: {
  provider: string;
  orderId: string;
  reportId: string;
  userId?: string | null;
  amountCents?: number | null;
  currency?: string | null;
}) {
  const db = getPool();
  if (!db) throw new Error("DATABASE_URL is not configured");
  await ensureCommerceSchema();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query(
      "SELECT id, status FROM purchases WHERE provider = $1 AND provider_order_id = $2",
      [provider, orderId],
    );
    if (existing.rows[0]?.status === "refunded") {
      await client.query("ROLLBACK");
      return { unlocked: false, reason: "refunded" };
    }
    if (!existing.rows[0]) {
      await client.query(
        `INSERT INTO purchases
          (id, user_id, report_id, provider, provider_order_id, product_type, amount_cents, currency, status, purchased_at)
         VALUES ($1, $2, $3, $4, $5, 'single_report', $6, $7, 'paid', NOW())`,
        [randomUUID(), userId || null, reportId, provider, orderId, amountCents ?? null, currency ?? null],
      );
    }
    await client.query(
      "UPDATE love_reports SET is_paid = TRUE, paid_at = COALESCE(paid_at, NOW()), user_id = COALESCE(user_id, $2) WHERE id = $1",
      [reportId, userId || null],
    );
    await client.query("COMMIT");
    return { unlocked: true, firstTime: !existing.rows[0] };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function markPurchaseRefunded(provider: string, orderId: string) {
  const db = getPool();
  if (!db) throw new Error("DATABASE_URL is not configured");
  await ensureCommerceSchema();
  const result = await db.query(
    `UPDATE purchases SET status = 'refunded', refunded_at = NOW()
     WHERE provider = $1 AND provider_order_id = $2
     RETURNING report_id`,
    [provider, orderId],
  );
  const reportId = result.rows[0]?.report_id as string | undefined;
  if (reportId) {
    await db.query("UPDATE love_reports SET is_paid = FALSE, paid_at = NULL WHERE id = $1", [reportId]);
  }
  return { reportId: reportId ?? null };
}
