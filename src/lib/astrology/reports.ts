import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { ensureCommerceSchema, getPool } from "@/lib/reports";
import { redeemEntitlementCode } from "@/lib/unlock-codes";
import type { AstrologyReport } from "@/types/astrology";

type StoredAstrologyReport = AstrologyReport & {
  id: string;
  createdAt: string;
  expiresAt: string;
  isPaid: boolean;
  paidAt: string | null;
};

let astrologySchemaReady: Promise<void> | null = null;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function ttlDate() {
  const days = Number(process.env.REPORT_TTL_DAYS ?? 30);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (Number.isFinite(days) ? days : 30));
  return expiresAt;
}

function fallbackDir() {
  if (process.env.VERCEL) return path.join("/tmp", "love-radar-astrology-reports");
  return path.join(process.cwd(), ".next", "cache", "love-radar-astrology-reports");
}

function fallbackFile(id: string) {
  return path.join(fallbackDir(), `${id}.json`);
}

export async function ensureAstrologySchema() {
  const db = getPool();
  if (!db) return;
  await ensureCommerceSchema();
  astrologySchemaReady =
    astrologySchemaReady ??
    db.query(`
      CREATE TABLE IF NOT EXISTS astrology_reports (
        id TEXT PRIMARY KEY,
        profile_names JSONB NOT NULL,
        charts JSONB NOT NULL,
        aspects JSONB NOT NULL,
        scores JSONB NOT NULL,
        tags JSONB NOT NULL,
        free_content JSONB NOT NULL,
        premium_content JSONB NOT NULL,
        locale TEXT NOT NULL DEFAULT 'zh-CN',
        engine_version TEXT NOT NULL,
        calculation_source TEXT NOT NULL,
        delete_token_hash TEXT NOT NULL,
        is_paid BOOLEAN NOT NULL DEFAULT FALSE,
        paid_at TIMESTAMPTZ,
        user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL
      );

      CREATE INDEX IF NOT EXISTS astrology_reports_user_id_idx ON astrology_reports (user_id);
      CREATE INDEX IF NOT EXISTS astrology_reports_expires_at_idx ON astrology_reports (expires_at);

      ALTER TABLE unlock_codes
        ADD COLUMN IF NOT EXISTS astrology_report_id TEXT REFERENCES astrology_reports(id) ON DELETE SET NULL;
    `).then(() => undefined);
  await astrologySchemaReady;
}

export async function saveAstrologyReport(report: AstrologyReport, userId?: string) {
  const id = randomUUID();
  const deleteToken = randomBytes(24).toString("base64url");
  const deleteTokenHash = hashToken(deleteToken);
  const createdAt = new Date();
  const expiresAt = ttlDate();
  const stored: StoredAstrologyReport = {
    ...report,
    id,
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    isPaid: Boolean(report.isPaid),
    paidAt: report.paidAt ?? null,
  };

  const db = getPool();
  if (!db) {
    await mkdir(fallbackDir(), { recursive: true });
    await writeFile(fallbackFile(id), JSON.stringify({ ...stored, deleteTokenHash }), "utf8");
    return { ...stored, deleteToken };
  }
  await ensureAstrologySchema();
  await db.query(
    `INSERT INTO astrology_reports
      (id, profile_names, charts, aspects, scores, tags, free_content, premium_content, locale, engine_version, calculation_source, delete_token_hash, is_paid, paid_at, user_id, created_at, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
    [
      id,
      JSON.stringify({ a: stored.profileAName, b: stored.profileBName }),
      JSON.stringify({ a: stored.chartA, b: stored.chartB }),
      JSON.stringify(stored.aspects),
      JSON.stringify(stored.scores),
      JSON.stringify(stored.coreTags),
      JSON.stringify({
        oneLineSummary: stored.oneLineSummary,
        basicAdvice: stored.basicAdvice,
        dataQualityNotice: stored.dataQualityNotice,
      }),
      JSON.stringify(stored.ai),
      stored.locale,
      stored.engineVersion,
      stored.calculationSource,
      deleteTokenHash,
      stored.isPaid,
      stored.isPaid ? stored.paidAt ?? createdAt : null,
      userId ?? null,
      createdAt,
      expiresAt,
    ],
  );
  return { ...stored, deleteToken };
}

export async function getAstrologyReport(id: string): Promise<StoredAstrologyReport | null> {
  const db = getPool();
  if (!db) {
    const report = await readFallbackReport(id);
    if (!report) return null;
    if (new Date(report.expiresAt).getTime() < Date.now()) {
      await unlink(fallbackFile(id)).catch(() => undefined);
      return null;
    }
    const { deleteTokenHash: _deleteTokenHash, ...safeReport } = report;
    void _deleteTokenHash;
    return safeReport;
  }
  await ensureAstrologySchema();
  const result = await db.query(
    `SELECT id, profile_names, charts, aspects, scores, tags, free_content, premium_content, locale, engine_version, calculation_source, is_paid, paid_at, created_at, expires_at
     FROM astrology_reports
     WHERE id = $1 AND expires_at > NOW()`,
    [id],
  );
  const row = result.rows[0];
  if (!row) return null;
  const names = row.profile_names as { a: string; b: string };
  const charts = row.charts as { a: AstrologyReport["chartA"]; b: AstrologyReport["chartB"] };
  const freeContent = row.free_content as Pick<AstrologyReport, "oneLineSummary" | "basicAdvice" | "dataQualityNotice">;
  return {
    id: row.id,
    locale: row.locale === "en-US" ? "en-US" : "zh-CN",
    profileAName: names.a,
    profileBName: names.b,
    chartA: charts.a,
    chartB: charts.b,
    aspects: row.aspects,
    scores: row.scores,
    coreTags: row.tags,
    oneLineSummary: freeContent.oneLineSummary,
    basicAdvice: freeContent.basicAdvice,
    dataQualityNotice: freeContent.dataQualityNotice,
    ai: row.premium_content,
    engineVersion: row.engine_version,
    calculationSource: row.calculation_source,
    isPaid: Boolean(row.is_paid),
    paidAt: row.paid_at ? row.paid_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
    expiresAt: row.expires_at.toISOString(),
  };
}

export function redactAstrologyReport(report: StoredAstrologyReport): StoredAstrologyReport {
  if (report.isPaid) return report;
  return {
    ...report,
    aspects: report.aspects.slice(0, 3),
    ai: {
      ...report.ai,
      attractionReason: "",
      emotionalBond: "",
      communicationPattern: "",
      chemistryAndIntimacy: "",
      longTermPotential: "",
      biggestStrength: "",
      biggestChallenge: "",
      futureTrend: "",
      smartReplies: [],
    },
  };
}

export async function redeemAstrologyReport(code: string, reportId: string, userId?: string) {
  const normalizedCode = code.trim().toUpperCase();
  if (!/^LR-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(normalizedCode)) {
    return { success: false, error: "兑换码格式不正确，请检查后重试。" };
  }
  return redeemEntitlementCode({
    code: normalizedCode,
    feature: "astrology",
    targetId: reportId,
    userId,
  });
}

export async function redeemAstrologyReportLegacy(code: string, reportId: string, userId?: string) {
  const normalizedCode = code.trim().toUpperCase();
  if (!/^LR-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(normalizedCode)) {
    return { success: false, error: "兑换码格式不正确，请检查后重试。" };
  }
  const db = getPool();
  if (!db) return { success: false, error: "服务端未配置数据库，暂时无法兑换。" };
  await ensureAstrologySchema();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const report = await client.query("SELECT id FROM astrology_reports WHERE id = $1 AND expires_at > NOW()", [reportId]);
    if (!report.rows[0]) {
      await client.query("ROLLBACK");
      return { success: false, error: "报告不存在或已过期。" };
    }
    const updatedCode = await client.query(
      `UPDATE unlock_codes
       SET used = TRUE, used_at = NOW(), astrology_report_id = $2, user_id = $3
       WHERE code = $1
         AND used = FALSE
         AND report_id IS NULL
         AND (expires_at IS NULL OR expires_at > NOW())
       RETURNING id`,
      [normalizedCode, reportId, userId || null],
    );
    if (!updatedCode.rows[0]) {
      const existing = await client.query("SELECT used, expires_at FROM unlock_codes WHERE code = $1", [normalizedCode]);
      await client.query("ROLLBACK");
      const row = existing.rows[0];
      if (!row) return { success: false, error: "兑换码不存在，请检查后重试。" };
      if (row.used) return { success: false, error: "兑换码已被使用。" };
      if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) return { success: false, error: "兑换码已过期。" };
      return { success: false, error: "兑换码暂时不可用，请稍后重试。" };
    }
    await client.query(
      "UPDATE astrology_reports SET is_paid = TRUE, paid_at = NOW(), user_id = COALESCE(user_id, $2) WHERE id = $1",
      [reportId, userId || null],
    );
    await client.query("COMMIT");
    return { success: true };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("redeem astrology failed:", error);
    return { success: false, error: "兑换失败，请稍后重试。" };
  } finally {
    client.release();
  }
}

async function readFallbackReport(id: string) {
  try {
    return JSON.parse(await readFile(fallbackFile(id), "utf8")) as StoredAstrologyReport & { deleteTokenHash: string };
  } catch {
    return null;
  }
}
