import { createHash, randomUUID } from "node:crypto";
import { ensureCommerceSchema, getPool } from "@/lib/reports";

export type ClaimUnlockCodeResult =
  | { success: true; code: string; alreadyClaimed: boolean }
  | { success: false; error: string };

function requireDb() {
  const db = getPool();
  if (!db) throw new Error("服务端未配置 DATABASE_URL，暂时无法领取兑换码。");
  return db;
}

export function normalizeOrderNo(orderNo: string) {
  return orderNo.trim().replace(/\s+/g, "").toUpperCase();
}

function hashClient(request?: Request) {
  const forwarded = request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const userAgent = request?.headers.get("user-agent") ?? "";
  return createHash("sha256").update(`${forwarded}|${userAgent}`).digest("hex");
}

export async function claimUnlockCode({
  orderNo,
  request,
  source = "mianbaoduo",
}: {
  orderNo: string;
  request?: Request;
  source?: string;
}): Promise<ClaimUnlockCodeResult> {
  const normalizedOrderNo = normalizeOrderNo(orderNo);
  if (normalizedOrderNo.length < 6 || normalizedOrderNo.length > 80) {
    return { success: false, error: "订单号格式不正确，请检查后重试。" };
  }

  await ensureCommerceSchema();
  const db = requireDb();
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const existing = await client.query(
      `SELECT code FROM code_claims WHERE order_no = $1 LIMIT 1`,
      [normalizedOrderNo],
    );
    if (existing.rows[0]) {
      await client.query("COMMIT");
      return { success: true, code: String(existing.rows[0].code), alreadyClaimed: true };
    }

    const available = await client.query(
      `SELECT id, code
       FROM unlock_codes
       WHERE used = FALSE
         AND (expires_at IS NULL OR expires_at > NOW())
         AND NOT EXISTS (
           SELECT 1 FROM code_claims WHERE code_claims.code_id = unlock_codes.id
         )
       ORDER BY created_at ASC
       LIMIT 1
       FOR UPDATE SKIP LOCKED`,
    );
    const code = available.rows[0] as { id: string; code: string } | undefined;
    if (!code) {
      await client.query("ROLLBACK");
      return { success: false, error: "兑换码库存不足，请联系作者补码。" };
    }

    await client.query(
      `INSERT INTO code_claims
        (id, order_no, code_id, code, client_hash, source)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [randomUUID(), normalizedOrderNo, code.id, code.code, hashClient(request), source],
    );

    await client.query("COMMIT");
    return { success: true, code: code.code, alreadyClaimed: false };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      const existing = await db.query(`SELECT code FROM code_claims WHERE order_no = $1 LIMIT 1`, [
        normalizedOrderNo,
      ]);
      if (existing.rows[0]) {
        return { success: true, code: String(existing.rows[0].code), alreadyClaimed: true };
      }
    }
    console.error("claim unlock code failed:", error);
    return { success: false, error: "领取失败，请稍后重试。" };
  } finally {
    client.release();
  }
}
