import { createHash, randomUUID } from "node:crypto";
import { getPool } from "@/lib/reports";

export type ProductStats = {
  totalVisitors: number;
  reportCount: number;
  premiumClicks: number;
  premiumClickRate: number;
  englishReports: number;
  premiumInterest: number;
};

let metricsSchemaReady: Promise<void> | null = null;

export async function trackProductEvent({
  eventName,
  reportId,
  source,
  locale,
  userId,
  request,
}: {
  eventName: "visit" | "premium_click" | "premium_interest" | "english_report_generated" | "english_share_clicked";
  reportId?: string | null;
  source?: string | null;
  locale?: "zh-CN" | "en-US" | null;
  userId?: string | null;
  request: Request;
}) {
  const db = getPool();
  if (!db) return;
  await ensureMetricsSchema();

  await db.query(
    `INSERT INTO product_events
      (id, event_name, report_id, client_hash, source, user_agent, locale, user_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      randomUUID(),
      eventName,
      reportId?.trim() || null,
      hashClient(request),
      cleanSource(source) || cleanSource(request.headers.get("referer")) || null,
      request.headers.get("user-agent")?.slice(0, 300) || null,
      locale || null,
      userId || null,
    ],
  );
}

export async function getProductStats(): Promise<ProductStats> {
  const db = getPool();
  if (!db) return { totalVisitors: 0, reportCount: 0, premiumClicks: 0, premiumClickRate: 0, englishReports: 0, premiumInterest: 0 };
  await ensureMetricsSchema();

  const result = await db.query<{
    total_visitors: number;
    report_count: number;
    premium_clicks: number;
    english_reports: number;
    premium_interest: number;
  }>(`
    SELECT
      (SELECT COUNT(DISTINCT client_hash)::int FROM product_events WHERE event_name = 'visit') AS total_visitors,
      (SELECT COUNT(*)::int FROM love_reports) AS report_count,
      (SELECT COUNT(*)::int FROM product_events WHERE event_name = 'premium_click') AS premium_clicks,
      (SELECT COUNT(*)::int FROM product_events WHERE event_name = 'english_report_generated') AS english_reports,
      (SELECT COUNT(*)::int FROM product_events WHERE event_name = 'premium_interest') AS premium_interest
  `);

  const row = result.rows[0];
  const reportCount = Number(row?.report_count ?? 0);
  const premiumClicks = Number(row?.premium_clicks ?? 0);
  return {
    totalVisitors: Number(row?.total_visitors ?? 0),
    reportCount,
    premiumClicks,
    premiumClickRate: reportCount > 0 ? Number(((premiumClicks / reportCount) * 100).toFixed(1)) : 0,
    englishReports: Number(row?.english_reports ?? 0),
    premiumInterest: Number(row?.premium_interest ?? 0),
  };
}

async function ensureMetricsSchema() {
  const db = getPool();
  if (!db) return;
  metricsSchemaReady =
    metricsSchemaReady ??
    db.query(`
      CREATE TABLE IF NOT EXISTS product_events (
        id TEXT PRIMARY KEY,
        event_name TEXT NOT NULL,
        report_id TEXT,
        client_hash TEXT NOT NULL,
        source TEXT,
        user_agent TEXT,
        locale TEXT,
        user_id TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS product_events_event_name_idx ON product_events (event_name);
      CREATE INDEX IF NOT EXISTS product_events_report_id_idx ON product_events (report_id);
      CREATE INDEX IF NOT EXISTS product_events_created_at_idx ON product_events (created_at);
      ALTER TABLE product_events ADD COLUMN IF NOT EXISTS locale TEXT;
      ALTER TABLE product_events ADD COLUMN IF NOT EXISTS user_id TEXT;
    `).then(() => undefined);
  await metricsSchemaReady;
}

function hashClient(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const userAgent = request.headers.get("user-agent")?.trim() || "unknown-agent";
  const salt = process.env.PRODUCT_METRICS_SALT || process.env.DATABASE_URL || "love-radar-product-metrics";
  return createHash("sha256").update(`${salt}:${forwarded || realIp || "anonymous"}:${userAgent}`).digest("hex");
}

function cleanSource(value?: string | null) {
  if (!value) return "";
  return value.trim().slice(0, 500);
}
