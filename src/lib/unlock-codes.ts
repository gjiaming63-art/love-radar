import { randomBytes, randomUUID } from "node:crypto";
import { ensureCommerceSchema, getPool } from "@/lib/reports";
import { hashClientKey } from "@/lib/screenshot-usage";

export type UnlockCodeStats = {
  total: number;
  unused: number;
  used: number;
  claimed: number;
  claimable: number;
  promoUses: number;
};

export type GeneratedUnlockCode = {
  code: string;
  type: string;
  expiresAt: string | null;
};

function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}

function getPromoInviteCode() {
  const code = process.env.PROMO_INVITE_CODE?.trim();
  return code ? normalizeCode(code) : "";
}

function generateCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const part = () =>
    Array.from({ length: 4 }, () => alphabet[randomBytes(1)[0] % alphabet.length]).join("");
  return `LR-${part()}-${part()}`;
}

function requireDb() {
  const db = getPool();
  if (!db) throw new Error("服务端未配置 DATABASE_URL，暂时无法使用兑换码功能。");
  return db;
}

export async function getUnlockCodeStats(): Promise<UnlockCodeStats> {
  await ensureCommerceSchema();
  const db = requireDb();
  const result = await db.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE used = FALSE)::int AS unused,
      COUNT(*) FILTER (WHERE used = TRUE)::int AS used,
      (SELECT COUNT(*)::int FROM code_claims) AS claimed,
      (SELECT COUNT(*)::int FROM promo_invite_uses) AS promo_uses,
      COUNT(*) FILTER (
        WHERE used = FALSE
          AND (expires_at IS NULL OR expires_at > NOW())
          AND NOT EXISTS (
            SELECT 1 FROM code_claims WHERE code_claims.code_id = unlock_codes.id
          )
      )::int AS claimable
    FROM unlock_codes
  `);
  return {
    total: Number(result.rows[0]?.total ?? 0),
    unused: Number(result.rows[0]?.unused ?? 0),
    used: Number(result.rows[0]?.used ?? 0),
    claimed: Number(result.rows[0]?.claimed ?? 0),
    claimable: Number(result.rows[0]?.claimable ?? 0),
    promoUses: Number(result.rows[0]?.promo_uses ?? 0),
  };
}

export async function createUnlockCodes({
  count,
  type,
  expiresAt,
}: {
  count: number;
  type: string;
  expiresAt?: string | null;
}): Promise<GeneratedUnlockCode[]> {
  await ensureCommerceSchema();
  const db = requireDb();
  const safeCount = Math.max(1, Math.min(1000, Math.floor(count)));
  const safeType = type.trim() || "single_report";
  const safeExpiresAt = expiresAt?.trim() ? new Date(expiresAt) : null;
  if (safeExpiresAt && Number.isNaN(safeExpiresAt.getTime())) {
    throw new Error("过期时间格式不正确。");
  }

  const generated: GeneratedUnlockCode[] = [];
  while (generated.length < safeCount) {
    const code = generateCode();
    try {
      await db.query(
        `INSERT INTO unlock_codes
          (id, code, type, expires_at, payment_provider, order_source)
         VALUES ($1, $2, $3, $4, 'mianbaoduo', 'external_code')`,
        [randomUUID(), code, safeType, safeExpiresAt],
      );
      generated.push({
        code,
        type: safeType,
        expiresAt: safeExpiresAt ? safeExpiresAt.toISOString() : null,
      });
    } catch (error) {
      if (isUniqueViolation(error)) continue;
      throw error;
    }
  }

  return generated;
}

export async function exportUnusedCodesCsv() {
  await ensureCommerceSchema();
  const db = requireDb();
  const result = await db.query(
    `SELECT code, type, expires_at
     FROM unlock_codes
     WHERE used = FALSE
       AND NOT EXISTS (
         SELECT 1 FROM code_claims WHERE code_claims.code_id = unlock_codes.id
       )
     ORDER BY created_at DESC`,
  );
  return toCsv(
    result.rows.map((row) => ({
      code: String(row.code),
      type: String(row.type),
      expires_at: row.expires_at ? row.expires_at.toISOString() : "",
    })),
  );
}

export async function redeemUnlockCode(code: string, reportId: string, clientKey?: string, userId?: string) {
  const normalizedCode = normalizeCode(code);
  const promoCode = getPromoInviteCode();
  if (promoCode && normalizedCode === promoCode) {
    return redeemPromoInviteCode(normalizedCode, reportId, clientKey, userId);
  }

  if (!/^LR-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(normalizedCode)) {
    return { success: false, error: "兑换码格式不正确，请检查后重试。" };
  }
  if (!reportId.trim()) return { success: false, error: "缺少报告 ID。" };

  await ensureCommerceSchema();
  const db = requireDb();
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const report = await client.query("SELECT id FROM love_reports WHERE id = $1 AND expires_at > NOW()", [
      reportId,
    ]);
    if (!report.rows[0]) {
      await client.query("ROLLBACK");
      return { success: false, error: "报告不存在或已过期。" };
    }

    const updatedCode = await client.query(
      `UPDATE unlock_codes
       SET used = TRUE, used_at = NOW(), report_id = $2, user_id = $3
       WHERE code = $1
         AND used = FALSE
         AND (expires_at IS NULL OR expires_at > NOW())
       RETURNING id`,
      [normalizedCode, reportId, userId || null],
    );

    if (!updatedCode.rows[0]) {
      const existing = await client.query("SELECT used, expires_at FROM unlock_codes WHERE code = $1", [
        normalizedCode,
      ]);
      await client.query("ROLLBACK");
      const row = existing.rows[0];
      if (!row) return { success: false, error: "兑换码不存在，请检查后重试。" };
      if (row.used) return { success: false, error: "兑换码已被使用。" };
      if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) {
        return { success: false, error: "兑换码已过期。" };
      }
      return { success: false, error: "兑换码暂时不可用，请稍后重试。" };
    }

    await client.query(
      "UPDATE love_reports SET is_paid = TRUE, paid_at = NOW(), user_id = COALESCE(user_id, $2) WHERE id = $1",
      [reportId, userId || null],
    );
    if (clientKey) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      await client.query(
        `INSERT INTO screenshot_entitlements
          (id, client_hash, remaining_uses, max_images_per_use, source_code, user_id, expires_at)
         VALUES ($1, $2, 10, 8, $3, $4, $5)`,
        [randomUUID(), hashClientKey(clientKey), normalizedCode, userId || null, expiresAt],
      );
    }
    await client.query("COMMIT");
    return { success: true };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("redeem code failed:", error);
    return { success: false, error: "兑换失败，请稍后重试。" };
  } finally {
    client.release();
  }
}

async function redeemPromoInviteCode(code: string, reportId: string, clientKey?: string, userId?: string) {
  if (!reportId.trim()) return { success: false, error: "缺少报告 ID。" };
  if (!clientKey) return { success: false, error: "暂时无法识别当前设备，请稍后再试。" };

  await ensureCommerceSchema();
  const db = requireDb();
  const clientHash = hashClientKey(clientKey);
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const report = await client.query("SELECT id, is_paid FROM love_reports WHERE id = $1 AND expires_at > NOW()", [
      reportId,
    ]);
    if (!report.rows[0]) {
      await client.query("ROLLBACK");
      return { success: false, error: "报告不存在或已过期。" };
    }

    if (report.rows[0].is_paid) {
      await client.query("COMMIT");
      return { success: true };
    }

    const inserted = await client.query(
      `INSERT INTO promo_invite_uses
        (id, code, client_hash, report_id, user_id)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (client_hash) DO NOTHING
       RETURNING id`,
      [randomUUID(), code, clientHash, reportId, userId || null],
    );

    if (!inserted.rows[0]) {
      await client.query("ROLLBACK");
      return { success: false, error: "这个老用户福利码已在当前设备使用过。" };
    }

    await client.query(
      "UPDATE love_reports SET is_paid = TRUE, paid_at = NOW(), user_id = COALESCE(user_id, $2) WHERE id = $1",
      [reportId, userId || null],
    );

    await client.query("COMMIT");
    return { success: true };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("redeem promo invite failed:", error);
    return { success: false, error: "福利码解锁失败，请稍后重试。" };
  } finally {
    client.release();
  }
}

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

function toCsv(rows: Array<{ code: string; type: string; expires_at: string }>) {
  const body = rows.map((row) => `${row.code},${row.type},${row.expires_at}`).join("\n");
  return `code,type,expires_at\n${body}${body ? "\n" : ""}`;
}
