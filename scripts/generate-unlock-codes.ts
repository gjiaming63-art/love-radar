import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";

const count = readNumberArg("--count", 100);
const type = readStringArg("--type", "single_report");
const expiresAtArg = readStringArg("--expires-at", "");
const expiresAt = expiresAtArg ? new Date(expiresAtArg) : null;

if (!process.env.DATABASE_URL) {
  throw new Error("缺少 DATABASE_URL，请先配置数据库连接。");
}
if (!Number.isFinite(count) || count < 1 || count > 1000) {
  throw new Error("--count 必须在 1-1000 之间。");
}
if (expiresAt && Number.isNaN(expiresAt.getTime())) {
  throw new Error("--expires-at 时间格式不正确，例如 2026-12-31T23:59:59+08:00。");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
});

try {
  await ensureSchema();
  const codes: string[] = [];
  while (codes.length < count) {
    const code = generateCode();
    try {
      await pool.query(
        `INSERT INTO unlock_codes
          (id, code, type, expires_at, payment_provider, order_source)
         VALUES ($1, $2, $3, $4, 'mianbaoduo', 'external_code')`,
        [randomUUID(), code, type, expiresAt],
      );
      codes.push(code);
    } catch (error) {
      if (isUniqueViolation(error)) continue;
      throw error;
    }
  }

  const csv = `code,type,expires_at\n${codes
    .map((code) => `${code},${type},${expiresAt ? expiresAt.toISOString() : ""}`)
    .join("\n")}\n`;
  const outputDir = path.join(process.cwd(), "exports");
  await mkdir(outputDir, { recursive: true });
  const outputFile = path.join(outputDir, `unlock-codes-${Date.now()}.csv`);
  await writeFile(outputFile, csv, "utf8");
  console.log(`Generated ${codes.length} unlock codes.`);
  console.log(outputFile);
} finally {
  await pool.end();
}

function readStringArg(name: string, fallback: string) {
  const index = process.argv.indexOf(name);
  if (index < 0) return fallback;
  return process.argv[index + 1] || fallback;
}

function readNumberArg(name: string, fallback: number) {
  const value = Number(readStringArg(name, String(fallback)));
  return Number.isFinite(value) ? value : fallback;
}

function generateCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const part = () =>
    Array.from({ length: 4 }, () => alphabet[randomBytes(1)[0] % alphabet.length]).join("");
  return `LR-${part()}-${part()}`;
}

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

async function ensureSchema() {
  await pool.query(`
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
  `);
}
