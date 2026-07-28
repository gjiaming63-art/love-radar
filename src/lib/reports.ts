import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";
import type { LoveReport } from "@/types/report";

type StoredReport = LoveReport & {
  id: string;
  createdAt: string;
  expiresAt: string;
  isPaid: boolean;
  paidAt: string | null;
};

type DbRelationshipPayload = {
  overallScore: number;
  riskLevel: string;
  relationshipStage: string;
  behaviorPattern: string;
  confidence?: LoveReport["confidence"];
  relationshipTrend?: LoveReport["relationshipTrend"];
};

type DbEvidencePayload = {
  redFlags: LoveReport["redFlags"];
  greenFlags: LoveReport["greenFlags"];
};

type DbAdvicePayload = {
  suggestions: string[];
  replyExamples: string[];
  shareCardText: string;
  actionPlan?: LoveReport["actionPlan"];
};

let pool: Pool | null = null;

function fallbackDir() {
  if (process.env.VERCEL) return path.join("/tmp", "love-radar-reports");
  return path.join(process.cwd(), ".next", "cache", "love-radar-reports");
}

function fallbackFile(id: string) {
  return path.join(fallbackDir(), `${id}.json`);
}

export function getPool() {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes("sslmode=require")
        ? { rejectUnauthorized: false }
        : undefined,
    });
  }
  return pool;
}

let schemaReady: Promise<void> | null = null;

export async function ensureCommerceSchema() {
  const db = getPool();
  if (!db) return;
  schemaReady =
    schemaReady ??
    (async () => {
      await db.query(`
        ALTER TABLE love_reports
          ADD COLUMN IF NOT EXISTS is_paid BOOLEAN NOT NULL DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

        CREATE TABLE IF NOT EXISTS unlock_codes (
          id TEXT PRIMARY KEY,
          code TEXT NOT NULL UNIQUE,
          type TEXT NOT NULL DEFAULT 'single_report',
          used BOOLEAN NOT NULL DEFAULT FALSE,
          used_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          expires_at TIMESTAMPTZ,
          report_id TEXT REFERENCES love_reports(id) ON DELETE SET NULL,
          payment_provider TEXT NOT NULL DEFAULT 'mianbaoduo',
          order_source TEXT NOT NULL DEFAULT 'external_code'
        );

        CREATE INDEX IF NOT EXISTS unlock_codes_used_idx ON unlock_codes (used);
        CREATE INDEX IF NOT EXISTS unlock_codes_report_id_idx ON unlock_codes (report_id);

        CREATE TABLE IF NOT EXISTS code_claims (
          id TEXT PRIMARY KEY,
          order_no TEXT NOT NULL UNIQUE,
          code_id TEXT NOT NULL REFERENCES unlock_codes(id) ON DELETE RESTRICT,
          code TEXT NOT NULL,
          claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          client_hash TEXT,
          source TEXT
        );

        CREATE INDEX IF NOT EXISTS code_claims_code_id_idx ON code_claims (code_id);
        CREATE INDEX IF NOT EXISTS code_claims_claimed_at_idx ON code_claims (claimed_at);

        CREATE TABLE IF NOT EXISTS screenshot_usage (
          usage_date DATE NOT NULL,
          client_hash TEXT NOT NULL,
          count INTEGER NOT NULL DEFAULT 0,
          first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (usage_date, client_hash)
        );

        CREATE INDEX IF NOT EXISTS screenshot_usage_date_idx ON screenshot_usage (usage_date);

        CREATE TABLE IF NOT EXISTS screenshot_entitlements (
          id TEXT PRIMARY KEY,
          client_hash TEXT NOT NULL,
          remaining_uses INTEGER NOT NULL DEFAULT 0,
          max_images_per_use INTEGER NOT NULL DEFAULT 8,
          source_code TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          expires_at TIMESTAMPTZ NOT NULL
        );

        CREATE INDEX IF NOT EXISTS screenshot_entitlements_client_hash_idx
          ON screenshot_entitlements (client_hash);
        CREATE INDEX IF NOT EXISTS screenshot_entitlements_expires_at_idx
          ON screenshot_entitlements (expires_at);

        CREATE TABLE IF NOT EXISTS product_events (
          id TEXT PRIMARY KEY,
          event_name TEXT NOT NULL,
          report_id TEXT,
          client_hash TEXT NOT NULL,
          source TEXT,
          user_agent TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS product_events_event_name_idx ON product_events (event_name);
        CREATE INDEX IF NOT EXISTS product_events_report_id_idx ON product_events (report_id);
        CREATE INDEX IF NOT EXISTS product_events_created_at_idx ON product_events (created_at);
      `);
    })();
  await schemaReady;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function ttlDate() {
  const days = Number(process.env.REPORT_TTL_DAYS ?? 30);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (Number.isFinite(days) ? days : 30));
  return expiresAt;
}

export async function saveReport(report: LoveReport) {
  const id = randomUUID();
  const deleteToken = randomBytes(24).toString("base64url");
  const deleteTokenHash = hashToken(deleteToken);
  const createdAt = new Date();
  const expiresAt = ttlDate();
  const stored: StoredReport = {
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
  await ensureCommerceSchema();

  const relationship: DbRelationshipPayload = {
    overallScore: stored.overallScore,
    riskLevel: stored.riskLevel,
    relationshipStage: stored.relationshipStage,
    behaviorPattern: stored.behaviorPattern,
    confidence: stored.confidence,
    relationshipTrend: stored.relationshipTrend,
  };
  const evidence: DbEvidencePayload = {
    redFlags: stored.redFlags,
    greenFlags: stored.greenFlags,
  };
  const advice: DbAdvicePayload = {
    suggestions: stored.suggestions,
    replyExamples: stored.replyExamples,
    shareCardText: stored.shareCardText,
    actionPlan: stored.actionPlan,
  };

  await db.query(
    `INSERT INTO love_reports
      (id, scores, tags, summary, evidence_excerpt, advice, mode, relationship, delete_token_hash, is_paid, paid_at, created_at, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, FALSE, NULL, $10, $11)`,
    [
      id,
      JSON.stringify(stored.scores),
      JSON.stringify(stored.riskTags),
      stored.summary,
      JSON.stringify(evidence),
      JSON.stringify(advice),
      stored.mode ?? "comprehensive",
      JSON.stringify(relationship),
      deleteTokenHash,
      createdAt,
      expiresAt,
    ],
  );

  return { ...stored, deleteToken };
}

export async function getReport(id: string): Promise<StoredReport | null> {
  const db = getPool();
  if (!db) {
    const report = (await readFallbackReport(id)) as (StoredReport & { deleteTokenHash: string }) | null;
    if (!report) return null;
    if (new Date(report.expiresAt).getTime() < Date.now()) {
      await unlink(fallbackFile(id)).catch(() => undefined);
      return null;
    }
    const { deleteTokenHash: _deleteTokenHash, ...safeReport } = report;
    void _deleteTokenHash;
    return hydrateStoredReport(safeReport);
  }
  await ensureCommerceSchema();

  const result = await db.query(
    `SELECT id, scores, tags, summary, evidence_excerpt, advice, mode, relationship, is_paid, paid_at, created_at, expires_at
     FROM love_reports
     WHERE id = $1 AND expires_at > NOW()`,
    [id],
  );
  const row = result.rows[0];
  if (!row) return null;

  const relationship = row.relationship as DbRelationshipPayload;
  const evidence = row.evidence_excerpt as DbEvidencePayload;
  const advice = row.advice as DbAdvicePayload;

  return hydrateStoredReport({
    id: row.id,
    mode: row.mode,
    overallScore: relationship.overallScore,
    riskLevel: relationship.riskLevel,
    relationshipStage: relationship.relationshipStage,
    behaviorPattern: relationship.behaviorPattern,
    scores: row.scores,
    riskTags: row.tags,
    summary: row.summary,
    confidence: relationship.confidence ?? fallbackConfidence(),
    relationshipTrend: relationship.relationshipTrend ?? fallbackTrend(),
    redFlags: evidence.redFlags,
    greenFlags: evidence.greenFlags,
    suggestions: advice.suggestions,
    replyExamples: advice.replyExamples,
    actionPlan: advice.actionPlan ?? fallbackActionPlan(advice.replyExamples),
    shareCardText: advice.shareCardText,
    createdAt: row.created_at.toISOString(),
    expiresAt: row.expires_at.toISOString(),
    isPaid: Boolean(row.is_paid),
    paidAt: row.paid_at ? row.paid_at.toISOString() : null,
  });
}

export function redactReport(report: StoredReport): StoredReport {
  if (report.isPaid) return report;
  return {
    ...report,
    riskTags: report.riskTags.slice(0, 4),
    confidence: report.confidence,
    relationshipTrend: report.relationshipTrend,
    redFlags: report.redFlags.slice(0, 3),
    greenFlags: report.greenFlags.slice(0, 2),
    suggestions: report.suggestions.slice(0, 2),
    replyExamples: [],
    actionPlan: {
      strategy: report.actionPlan.strategy,
      nextReplies: [],
      ifThen: report.actionPlan.ifThen.slice(0, 1),
      dontDo: report.actionPlan.dontDo.slice(0, 1),
    },
  };
}

function fallbackConfidence(): LoveReport["confidence"] {
  return {
    level: "中",
    reason: "这份报告生成于旧版本，未记录详细可信度字段。",
    messageCount: 0,
    speakerBalance: "旧报告未记录双方发言比例。",
    limitations: ["建议结合更多聊天上下文理解结论。"],
  };
}

function fallbackTrend(): LoveReport["relationshipTrend"] {
  return {
    label: "继续观察",
    reason: "旧报告未记录关系走势字段，建议结合摘要和证据理解。",
  };
}

function fallbackActionPlan(replyExamples: string[]): LoveReport["actionPlan"] {
  return {
    strategy: "先用一次清晰、温和的沟通换取更明确反馈。",
    nextReplies: replyExamples.slice(0, 3).map((text, index) => ({
      style: ["温和沟通版", "边界感版", "轻松试探版"][index] ?? "参考回复",
      text,
    })),
    ifThen: [
      { scenario: "如果对方积极回应", advice: "继续观察实际行动，不急着加大投入。" },
      { scenario: "如果对方继续模糊", advice: "减少主动追问，把注意力收回到自己的生活节奏。" },
    ],
    dontDo: ["不要连续追问对方为什么不回。", "不要用测试或威胁逼对方表态。"],
  };
}

function hydrateStoredReport(report: StoredReport): StoredReport {
  return {
    ...report,
    confidence: report.confidence ?? fallbackConfidence(),
    relationshipTrend: report.relationshipTrend ?? fallbackTrend(),
    actionPlan: report.actionPlan ?? fallbackActionPlan(report.replyExamples ?? []),
  };
}

export async function deleteReport(id: string, deleteToken: string) {
  const tokenHash = hashToken(deleteToken);
  const db = getPool();
  if (!db) {
    const report = (await readFallbackReport(id)) as (StoredReport & { deleteTokenHash: string }) | null;
    if (!report || report.deleteTokenHash !== tokenHash) return false;
    await unlink(fallbackFile(id)).catch(() => undefined);
    return true;
  }
  await ensureCommerceSchema();

  const result = await db.query("DELETE FROM love_reports WHERE id = $1 AND delete_token_hash = $2", [
    id,
    tokenHash,
  ]);
  return (result.rowCount ?? 0) > 0;
}

async function readFallbackReport(id: string) {
  try {
    return JSON.parse(await readFile(fallbackFile(id), "utf8")) as StoredReport & {
      deleteTokenHash: string;
    };
  } catch {
    return null;
  }
}
