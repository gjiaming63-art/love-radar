import { createHash } from "node:crypto";
import { getPool } from "@/lib/reports";

const memory = new Map<string, { date: string; count: number }>();

export async function consumeTextQuota(clientKey: string, locale: "zh-CN" | "en-US", limit: number) {
  const date = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const hash = createHash("sha256").update(`${process.env.TEXT_USAGE_SALT || process.env.DATABASE_URL || "love-radar-text"}:${clientKey}`).digest("hex");
  const db = getPool();
  if (!db) {
    const key = `${locale}:${hash}`;
    const current = memory.get(key);
    const count = current?.date === date ? current.count : 0;
    if (count >= limit) return { ok: false, remaining: 0, limit };
    memory.set(key, { date, count: count + 1 });
    return { ok: true, remaining: Math.max(0, limit - count - 1), limit };
  }
  await db.query(`
    CREATE TABLE IF NOT EXISTS text_usage (
      usage_date DATE NOT NULL, client_hash TEXT NOT NULL, locale TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (usage_date, client_hash, locale)
    )
  `);
  const result = await db.query<{ count: number }>(`
    INSERT INTO text_usage (usage_date, client_hash, locale, count)
    VALUES ($1, $2, $3, 1)
    ON CONFLICT (usage_date, client_hash, locale)
    DO UPDATE SET count = text_usage.count + 1, updated_at = NOW()
    WHERE text_usage.count < $4
    RETURNING count
  `, [date, hash, locale, limit]);
  const count = Number(result.rows[0]?.count ?? 0);
  return { ok: count > 0, remaining: Math.max(0, limit - count), limit };
}
