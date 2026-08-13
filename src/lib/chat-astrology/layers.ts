import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { getPool } from "@/lib/reports";
import type { ChatAstrologyLayer } from "@/types/chat-astrology";

type StoredChatAstrologyLayer = ChatAstrologyLayer & {
  id: string;
  createdAt: string;
};

let schemaReady: Promise<void> | null = null;

function fallbackDir() {
  if (process.env.VERCEL) return path.join("/tmp", "love-radar-chat-astrology-layers");
  return path.join(process.cwd(), ".next", "cache", "love-radar-chat-astrology-layers");
}

function fallbackFile(reportId: string) {
  return path.join(fallbackDir(), `${reportId}.json`);
}

export async function ensureChatAstrologyLayerSchema() {
  const db = getPool();
  if (!db) return;
  schemaReady =
    schemaReady ??
    db.query(`
      CREATE TABLE IF NOT EXISTS chat_astrology_layers (
        id TEXT PRIMARY KEY,
        report_id TEXT NOT NULL UNIQUE REFERENCES love_reports(id) ON DELETE CASCADE,
        alignment_score INTEGER NOT NULL,
        alignment_level TEXT NOT NULL,
        summary TEXT NOT NULL,
        dimensions JSONB NOT NULL,
        astrology_snapshot JSONB NOT NULL,
        disclaimer TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS chat_astrology_layers_report_id_idx
        ON chat_astrology_layers (report_id);
    `).then(() => undefined);
  await schemaReady;
}

export async function getChatAstrologyLayer(reportId: string): Promise<StoredChatAstrologyLayer | null> {
  const db = getPool();
  if (!db) {
    try {
      return JSON.parse(await readFile(fallbackFile(reportId), "utf8")) as StoredChatAstrologyLayer;
    } catch {
      return null;
    }
  }
  await ensureChatAstrologyLayerSchema();
  const result = await db.query(
    `SELECT id, report_id, alignment_score, alignment_level, summary, dimensions, astrology_snapshot, disclaimer, created_at
     FROM chat_astrology_layers
     WHERE report_id = $1`,
    [reportId],
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    reportId: row.report_id,
    alignmentScore: Number(row.alignment_score),
    alignmentLevel: row.alignment_level,
    summary: row.summary,
    dimensions: row.dimensions,
    astrologySnapshot: row.astrology_snapshot,
    disclaimer: row.disclaimer,
    createdAt: row.created_at.toISOString(),
  };
}

export async function saveChatAstrologyLayer(layer: ChatAstrologyLayer): Promise<StoredChatAstrologyLayer> {
  const existing = await getChatAstrologyLayer(layer.reportId);
  if (existing) return existing;

  const id = randomUUID();
  const createdAt = new Date();
  const stored: StoredChatAstrologyLayer = {
    ...layer,
    id,
    createdAt: createdAt.toISOString(),
  };

  const db = getPool();
  if (!db) {
    await mkdir(fallbackDir(), { recursive: true });
    await writeFile(fallbackFile(layer.reportId), JSON.stringify(stored), "utf8");
    return stored;
  }
  await ensureChatAstrologyLayerSchema();
  await db.query(
    `INSERT INTO chat_astrology_layers
      (id, report_id, alignment_score, alignment_level, summary, dimensions, astrology_snapshot, disclaimer, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (report_id) DO NOTHING`,
    [
      id,
      stored.reportId,
      stored.alignmentScore,
      stored.alignmentLevel,
      stored.summary,
      JSON.stringify(stored.dimensions),
      JSON.stringify(stored.astrologySnapshot),
      stored.disclaimer,
      createdAt,
    ],
  );
  return (await getChatAstrologyLayer(layer.reportId)) ?? stored;
}

export function redactChatAstrologyLayer(layer: StoredChatAstrologyLayer, unlocked: boolean): StoredChatAstrologyLayer {
  if (unlocked) return layer;
  return {
    ...layer,
    dimensions: layer.dimensions.slice(0, 2),
  };
}
