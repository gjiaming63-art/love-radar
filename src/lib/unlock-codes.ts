import { randomBytes, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
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

export type NewUserGiftCodeResult = {
  success: boolean;
  code?: string;
  alreadyClaimed?: boolean;
  error?: string;
};

type EntitlementFeature = "chat_report" | "personality" | "astrology" | "chat_astrology";

function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}

function getPromoInviteCodes() {
  const codes = [process.env.PROMO_INVITE_CODE, process.env.PROMO_INVITE_CODES]
    .filter(Boolean)
    .flatMap((value) => String(value).split(/[,，\n\r]+/))
    .map(normalizeCode)
    .filter(Boolean);
  return Array.from(new Set(codes));
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

export async function getNewUserGiftCode(userId: string) {
  if (!userId.trim()) return null;
  await ensureCommerceSchema();
  await ensureNewUserGiftSchema();
  const db = requireDb();
  const result = await db.query<{ code: string }>(
    "SELECT code FROM new_user_gift_codes WHERE user_id = $1",
    [userId],
  );
  return result.rows[0]?.code ?? null;
}

export async function claimNewUserGiftCode(userId: string): Promise<NewUserGiftCodeResult> {
  if (!userId.trim()) return { success: false, error: "请先登录后再领取新人福利。" };

  await ensureCommerceSchema();
  await ensureNewUserGiftSchema();
  const db = requireDb();
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const existing = await client.query<{ code: string }>(
      "SELECT code FROM new_user_gift_codes WHERE user_id = $1 FOR UPDATE",
      [userId],
    );
    if (existing.rows[0]) {
      await client.query("COMMIT");
      return { success: true, code: existing.rows[0].code, alreadyClaimed: true };
    }

    let code = "";
    let codeId = "";
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const candidateCode = generateCode();
      const candidateId = randomUUID();
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO unlock_codes
          (id, code, type, expires_at, user_id, payment_provider, order_source)
         VALUES ($1, $2, 'new_user_trial', NULL, $3, 'system', 'new_user_gift')
         ON CONFLICT (code) DO NOTHING
         RETURNING id`,
        [candidateId, candidateCode, userId],
      );
      if (inserted.rows[0]) {
        code = candidateCode;
        codeId = candidateId;
        break;
      }
    }

    if (!code || !codeId) {
      await client.query("ROLLBACK");
      return { success: false, error: "新人福利码生成失败，请稍后重试。" };
    }

    await client.query(
      `INSERT INTO new_user_gift_codes (user_id, code_id, code)
       VALUES ($1, $2, $3)`,
      [userId, codeId, code],
    );

    await client.query("COMMIT");
    return { success: true, code, alreadyClaimed: false };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    if (isUniqueViolation(error)) {
      const existing = await db
        .query<{ code: string }>("SELECT code FROM new_user_gift_codes WHERE user_id = $1", [userId])
        .catch(() => ({ rows: [] }));
      if (existing.rows[0]) return { success: true, code: existing.rows[0].code, alreadyClaimed: true };
    }
    console.error("claim new user gift code failed:", error);
    return { success: false, error: "新人福利领取失败，请稍后重试。" };
  } finally {
    client.release();
  }
}

export async function redeemEntitlementCode({
  code,
  feature,
  targetId,
  clientKey,
  userId,
}: {
  code: string;
  feature: EntitlementFeature;
  targetId?: string;
  clientKey?: string;
  userId?: string;
}) {
  const normalizedCode = normalizeCode(code);
  if (!/^LR-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(normalizedCode)) {
    return { success: false, error: "兑换码格式不正确，请检查后重试。" };
  }

  await ensureCommerceSchema();
  await ensureEntitlementBundleSchema();
  const db = requireDb();
  const client = await db.connect();
  const clientHash = clientKey ? hashClientKey(clientKey) : null;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  try {
    await client.query("BEGIN");

    const codeResult = await client.query<{
      id: string;
      code: string;
      used: boolean;
      expires_at: Date | null;
      user_id: string | null;
    }>(
      `SELECT id, code, used, expires_at, user_id
       FROM unlock_codes
       WHERE code = $1
       FOR UPDATE`,
      [normalizedCode],
    );
    const codeRow = codeResult.rows[0];
    if (!codeRow) {
      await client.query("ROLLBACK");
      return { success: false, error: "兑换码不存在，请检查后重试。" };
    }
    if (codeRow.expires_at && new Date(codeRow.expires_at).getTime() <= Date.now()) {
      await client.query("ROLLBACK");
      return { success: false, error: "兑换码已过期。" };
    }
    if (codeRow.user_id && userId && codeRow.user_id !== userId) {
      await client.query("ROLLBACK");
      return { success: false, error: "这枚兑换码已绑定其他账号。" };
    }
    if (codeRow.user_id && !userId) {
      await client.query("ROLLBACK");
      return { success: false, error: "这枚兑换码已绑定账号，请登录后使用。" };
    }

    const bundle = await ensureBundleForCode(client, {
      codeId: codeRow.id,
      code: normalizedCode,
      userId: userId || codeRow.user_id,
      clientHash,
      expiresAt: codeRow.expires_at,
    });

    const column = entitlementColumn(feature);
    const consumed = await client.query(
      `UPDATE entitlement_bundles
       SET ${column} = ${column} - 1,
           user_id = COALESCE(user_id, $2),
           client_hash = COALESCE(client_hash, $3)
       WHERE id = $1
         AND ${column} > 0
         AND (expires_at IS NULL OR expires_at > NOW())
       RETURNING id`,
      [bundle.id, userId || null, clientHash],
    );

    if (!consumed.rows[0]) {
      await client.query("ROLLBACK");
      return { success: false, error: "这枚兑换码在当前功能的权益已用完。" };
    }

    await client.query(
      `UPDATE unlock_codes
       SET used = TRUE,
           used_at = COALESCE(used_at, NOW()),
           user_id = COALESCE(user_id, $2),
           report_id = CASE WHEN $3 = 'chat_report' THEN $4 ELSE report_id END,
           astrology_report_id = CASE WHEN $3 = 'astrology' THEN $4 ELSE astrology_report_id END
       WHERE id = $1`,
      [codeRow.id, userId || null, feature, targetId || null],
    );

    if (feature === "chat_report" && targetId) {
      await client.query(
        "UPDATE love_reports SET is_paid = TRUE, paid_at = NOW(), user_id = COALESCE(user_id, $2) WHERE id = $1",
        [targetId, userId || null],
      );
    }
    if (feature === "astrology" && targetId) {
      await client.query(
        "UPDATE astrology_reports SET is_paid = TRUE, paid_at = NOW(), user_id = COALESCE(user_id, $2) WHERE id = $1",
        [targetId, userId || null],
      );
    }
    if (feature === "chat_astrology" && targetId) {
      await client
        .query("UPDATE chat_astrology_layers SET is_paid = TRUE, paid_at = NOW() WHERE report_id = $1", [targetId])
        .catch(() => undefined);
    }

    if (clientHash && Number(bundle.screenshot_uses) > 0) {
      await client.query(
        `INSERT INTO screenshot_entitlements
          (id, client_hash, remaining_uses, max_images_per_use, source_code, user_id, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [
          randomUUID(),
          clientHash,
          Number(bundle.screenshot_uses),
          Number(bundle.max_images_per_use),
          normalizedCode,
          userId || null,
          expiresAt,
        ],
      );
      await client.query("UPDATE entitlement_bundles SET screenshot_uses = 0 WHERE id = $1", [bundle.id]);
    }

    await client.query("COMMIT");
    return { success: true };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("redeem entitlement code failed:", error);
    return { success: false, error: "兑换失败，请稍后重试。" };
  } finally {
    client.release();
  }
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
  const promoCodes = getPromoInviteCodes();
  if (promoCodes.includes(normalizedCode)) {
    return redeemPromoInviteCode(normalizedCode, reportId, clientKey, userId);
  }

  if (!/^LR-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(normalizedCode)) {
    return { success: false, error: "兑换码格式不正确，请检查后重试。" };
  }
  if (!reportId.trim()) return { success: false, error: "缺少报告 ID。" };

  const entitlementResult = await redeemEntitlementCode({
    code: normalizedCode,
    feature: "chat_report",
    targetId: reportId,
    clientKey,
    userId,
  });
  if (entitlementResult.success || entitlementResult.error !== "兑换码不存在，请检查后重试。") {
    return entitlementResult;
  }

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

export async function redeemPersonalityCode(code: string, clientKey?: string, userId?: string) {
  const normalizedCode = normalizeCode(code);
  if (!/^LR-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(normalizedCode)) {
    return { success: false, error: "兑换码格式不正确，请检查后重试。" };
  }

  return redeemEntitlementCode({
    code: normalizedCode,
    feature: "personality",
    clientKey,
    userId,
  });
}

async function redeemPromoInviteCode(code: string, reportId: string, clientKey?: string, userId?: string) {
  if (!reportId.trim()) return { success: false, error: "缺少报告 ID。" };
  if (!clientKey) return { success: false, error: "暂时无法识别当前设备，请稍后再试。" };

  await ensureCommerceSchema();
  const db = requireDb();
  await ensurePromoInviteSchema();
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
       ON CONFLICT (code, client_hash) DO NOTHING
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

async function ensurePromoInviteSchema() {
  const db = requireDb();
  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS promo_invite_uses_code_client_hash_unique
      ON promo_invite_uses (code, client_hash);
  `);
  await db.query(`ALTER TABLE promo_invite_uses DROP CONSTRAINT IF EXISTS promo_invite_uses_client_hash_key;`);
}

async function ensureNewUserGiftSchema() {
  const db = requireDb();
  await db.query(`
    CREATE TABLE IF NOT EXISTS new_user_gift_codes (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      code_id TEXT NOT NULL REFERENCES unlock_codes(id) ON DELETE RESTRICT,
      code TEXT NOT NULL,
      claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS new_user_gift_codes_code_id_unique
      ON new_user_gift_codes (code_id);
    CREATE INDEX IF NOT EXISTS new_user_gift_codes_claimed_at_idx
      ON new_user_gift_codes (claimed_at);
  `);
}

async function ensureEntitlementBundleSchema() {
  const db = requireDb();
  await db.query(`
    CREATE TABLE IF NOT EXISTS entitlement_bundles (
      id TEXT PRIMARY KEY,
      code_id TEXT NOT NULL UNIQUE REFERENCES unlock_codes(id) ON DELETE RESTRICT,
      code TEXT NOT NULL,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      client_hash TEXT,
      chat_report_unlocks INTEGER NOT NULL DEFAULT 1,
      personality_unlocks INTEGER NOT NULL DEFAULT 1,
      astrology_unlocks INTEGER NOT NULL DEFAULT 1,
      chat_astrology_unlocks INTEGER NOT NULL DEFAULT 1,
      screenshot_uses INTEGER NOT NULL DEFAULT 10,
      max_images_per_use INTEGER NOT NULL DEFAULT 8,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS entitlement_bundles_user_id_idx
      ON entitlement_bundles (user_id);
    CREATE INDEX IF NOT EXISTS entitlement_bundles_client_hash_idx
      ON entitlement_bundles (client_hash);
    CREATE INDEX IF NOT EXISTS entitlement_bundles_code_idx
      ON entitlement_bundles (code);
  `);
}

async function ensureBundleForCode(
  client: PoolClient,
  {
    codeId,
    code,
    userId,
    clientHash,
    expiresAt,
  }: {
    codeId: string;
    code: string;
    userId?: string | null;
    clientHash?: string | null;
    expiresAt?: Date | null;
  },
) {
  const existing = await client.query<{
    id: string;
    screenshot_uses: number;
    max_images_per_use: number;
  }>("SELECT id, screenshot_uses, max_images_per_use FROM entitlement_bundles WHERE code_id = $1 FOR UPDATE", [
    codeId,
  ]);
  if (existing.rows[0]) return existing.rows[0];

  const inserted = await client.query<{
    id: string;
    screenshot_uses: number;
    max_images_per_use: number;
  }>(
    `INSERT INTO entitlement_bundles
      (id, code_id, code, user_id, client_hash, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, screenshot_uses, max_images_per_use`,
    [randomUUID(), codeId, code, userId || null, clientHash || null, expiresAt || null],
  );
  return inserted.rows[0];
}

function entitlementColumn(feature: EntitlementFeature) {
  switch (feature) {
    case "chat_report":
      return "chat_report_unlocks";
    case "personality":
      return "personality_unlocks";
    case "astrology":
      return "astrology_unlocks";
    case "chat_astrology":
      return "chat_astrology_unlocks";
  }
}

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

function toCsv(rows: Array<{ code: string; type: string; expires_at: string }>) {
  const body = rows.map((row) => `${row.code},${row.type},${row.expires_at}`).join("\n");
  return `code,type,expires_at\n${body}${body ? "\n" : ""}`;
}
