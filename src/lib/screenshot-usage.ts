import { createHash, randomUUID } from "node:crypto";
import { getPool } from "@/lib/reports";

type ScreenshotQuotaResult = {
  ok: boolean;
  count: number;
  remaining: number;
  limit: number;
  tier: "free" | "paid" | "none";
  maxImagesPerUse: number;
  paidRemaining: number;
};

const memoryBuckets = new Map<string, { count: number; usageDate: string }>();
const memoryPaidBuckets = new Map<string, { remaining: number; expiresAt: number }>();
let screenshotUsageSchemaReady: Promise<void> | null = null;

const freeMaxImagesPerUse = 4;
const paidMaxImagesPerUse = 8;
const paidGrantUses = 10;
const paidGrantDays = 7;

export async function consumeScreenshotQuota(
  clientKey: string,
  limit: number,
  requestedImages = 1,
): Promise<ScreenshotQuotaResult> {
  if (!Number.isFinite(limit) || limit <= 0) {
    return {
      ok: true,
      count: 0,
      remaining: Number.POSITIVE_INFINITY,
      limit,
      tier: "free",
      maxImagesPerUse: freeMaxImagesPerUse,
      paidRemaining: 0,
    };
  }

  const usageDate = getShanghaiUsageDate();
  const clientHash = hashClientKey(clientKey);
  const db = getPool();
  const needsPaidTier = requestedImages > freeMaxImagesPerUse;

  if (!db) {
    return consumeMemoryQuota(clientHash, usageDate, limit, needsPaidTier);
  }

  await ensureScreenshotUsageSchema();

  if (needsPaidTier) {
    return consumePaidQuota(db, clientHash, limit, limit);
  }

  const result = await db.query<{ count: number }>(
    `
      INSERT INTO screenshot_usage (usage_date, client_hash, count)
      VALUES ($1, $2, 1)
      ON CONFLICT (usage_date, client_hash)
      DO UPDATE SET
        count = screenshot_usage.count + 1,
        updated_at = NOW()
      WHERE screenshot_usage.count < $3
      RETURNING count
    `,
    [usageDate, clientHash, limit],
  );

  if (result.rowCount && result.rows[0]) {
    const count = Number(result.rows[0].count);
    return {
      ok: true,
      count,
      remaining: Math.max(0, limit - count),
      limit,
      tier: "free",
      maxImagesPerUse: freeMaxImagesPerUse,
      paidRemaining: await getPaidRemaining(clientHash),
    };
  }

  const existing = await db.query<{ count: number }>(
    "SELECT count FROM screenshot_usage WHERE usage_date = $1 AND client_hash = $2",
    [usageDate, clientHash],
  );
  const count = Number(existing.rows[0]?.count ?? limit);
  return consumePaidQuota(db, clientHash, limit, count);
}

async function consumePaidQuota(
  db: NonNullable<ReturnType<typeof getPool>>,
  clientHash: string,
  limit: number,
  freeCount: number,
): Promise<ScreenshotQuotaResult> {
  const paid = await db.query<{ remaining_uses: number }>(
    `
      UPDATE screenshot_entitlements
      SET remaining_uses = remaining_uses - 1,
          updated_at = NOW()
      WHERE id = (
        SELECT id
        FROM screenshot_entitlements
        WHERE client_hash = $1
          AND remaining_uses > 0
          AND expires_at > NOW()
        ORDER BY expires_at ASC, created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING remaining_uses
    `,
    [clientHash],
  );

  if (paid.rowCount && paid.rows[0]) {
    return {
      ok: true,
      count: freeCount,
      remaining: 0,
      limit,
      tier: "paid",
      maxImagesPerUse: paidMaxImagesPerUse,
      paidRemaining: Number(paid.rows[0].remaining_uses),
    };
  }

  return {
    ok: false,
    count: freeCount,
    remaining: 0,
    limit,
    tier: "none",
    maxImagesPerUse: freeMaxImagesPerUse,
    paidRemaining: 0,
  };
}

async function ensureScreenshotUsageSchema() {
  const db = getPool();
  if (!db) return;
  screenshotUsageSchemaReady =
    screenshotUsageSchemaReady ??
    db.query(`
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
    `).then(() => undefined);
  await screenshotUsageSchemaReady;
}

export async function grantScreenshotEntitlement(clientKey: string, sourceCode: string) {
  const db = getPool();
  const clientHash = hashClientKey(clientKey);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + paidGrantDays);

  if (!db) {
    const current = memoryPaidBuckets.get(clientHash);
    memoryPaidBuckets.set(clientHash, {
      remaining: (current?.remaining ?? 0) + paidGrantUses,
      expiresAt: expiresAt.getTime(),
    });
    return { remainingUses: (current?.remaining ?? 0) + paidGrantUses, expiresAt };
  }

  await ensureScreenshotUsageSchema();
  await db.query(
    `
      INSERT INTO screenshot_entitlements
        (id, client_hash, remaining_uses, max_images_per_use, source_code, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [randomUUID(), clientHash, paidGrantUses, paidMaxImagesPerUse, sourceCode, expiresAt],
  );
  const result = await db.query<{ total_remaining: number }>(
    `
      SELECT COALESCE(SUM(remaining_uses), 0)::int AS total_remaining
      FROM screenshot_entitlements
      WHERE client_hash = $1
        AND remaining_uses > 0
        AND expires_at > NOW()
    `,
    [clientHash],
  );
  return { remainingUses: Number(result.rows[0]?.total_remaining ?? paidGrantUses), expiresAt };
}

export async function getScreenshotQuotaStatus(clientKey: string, limit: number) {
  const usageDate = getShanghaiUsageDate();
  const clientHash = hashClientKey(clientKey);
  const db = getPool();

  if (!db) {
    const current = memoryBuckets.get(clientHash);
    const freeCount = current?.usageDate === usageDate ? current.count : 0;
    const paid = getMemoryPaidRemaining(clientHash);
    return {
      freeRemaining: Math.max(0, limit - freeCount),
      freeLimit: limit,
      paidRemaining: paid,
      maxImagesPerUse: paid > 0 ? paidMaxImagesPerUse : freeMaxImagesPerUse,
    };
  }

  await ensureScreenshotUsageSchema();
  const result = await db.query<{ free_count: number; paid_remaining: number }>(
    `
      SELECT
        COALESCE((SELECT count FROM screenshot_usage WHERE usage_date = $1 AND client_hash = $2), 0)::int AS free_count,
        COALESCE((
          SELECT SUM(remaining_uses)
          FROM screenshot_entitlements
          WHERE client_hash = $2
            AND remaining_uses > 0
            AND expires_at > NOW()
        ), 0)::int AS paid_remaining
    `,
    [usageDate, clientHash],
  );
  const freeCount = Number(result.rows[0]?.free_count ?? 0);
  const paidRemaining = Number(result.rows[0]?.paid_remaining ?? 0);
  return {
    freeRemaining: Math.max(0, limit - freeCount),
    freeLimit: limit,
    paidRemaining,
    maxImagesPerUse: paidRemaining > 0 ? paidMaxImagesPerUse : freeMaxImagesPerUse,
  };
}

export function getClientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const userAgent = request.headers.get("user-agent")?.trim() || "unknown-agent";
  return `${forwarded || realIp || "anonymous"}:${userAgent}`;
}

function consumeMemoryQuota(
  clientHash: string,
  usageDate: string,
  limit: number,
  needsPaidTier = false,
): ScreenshotQuotaResult {
  if (needsPaidTier) {
    return consumeMemoryPaidQuota(clientHash, limit, limit);
  }
  const current = memoryBuckets.get(clientHash);
  if (!current || current.usageDate !== usageDate) {
    memoryBuckets.set(clientHash, { usageDate, count: 1 });
    return {
      ok: true,
      count: 1,
      remaining: Math.max(0, limit - 1),
      limit,
      tier: "free",
      maxImagesPerUse: freeMaxImagesPerUse,
      paidRemaining: getMemoryPaidRemaining(clientHash),
    };
  }
  if (current.count >= limit) {
    const paidResult = consumeMemoryPaidQuota(clientHash, limit, current.count);
    if (paidResult.ok) return paidResult;
    return {
      ok: false,
      count: current.count,
      remaining: 0,
      limit,
      tier: "none",
      maxImagesPerUse: freeMaxImagesPerUse,
      paidRemaining: 0,
    };
  }
  current.count += 1;
  return {
    ok: true,
    count: current.count,
    remaining: Math.max(0, limit - current.count),
    limit,
    tier: "free",
    maxImagesPerUse: freeMaxImagesPerUse,
    paidRemaining: getMemoryPaidRemaining(clientHash),
  };
}

function consumeMemoryPaidQuota(clientHash: string, limit: number, freeCount: number): ScreenshotQuotaResult {
  const paidRemaining = getMemoryPaidRemaining(clientHash);
  if (paidRemaining > 0) {
    const paid = memoryPaidBuckets.get(clientHash);
    memoryPaidBuckets.set(clientHash, { remaining: paidRemaining - 1, expiresAt: paid?.expiresAt ?? Date.now() });
    return {
      ok: true,
      count: freeCount,
      remaining: 0,
      limit,
      tier: "paid",
      maxImagesPerUse: paidMaxImagesPerUse,
      paidRemaining: paidRemaining - 1,
    };
  }
  return {
    ok: false,
    count: freeCount,
    remaining: 0,
    limit,
    tier: "none",
    maxImagesPerUse: freeMaxImagesPerUse,
    paidRemaining: 0,
  };
}

export function hashClientKey(clientKey: string) {
  const salt = process.env.SCREENSHOT_USAGE_SALT || process.env.DATABASE_URL || "love-radar-screenshot-usage";
  return createHash("sha256").update(`${salt}:${clientKey}`).digest("hex");
}

async function getPaidRemaining(clientHash: string) {
  const db = getPool();
  if (!db) return getMemoryPaidRemaining(clientHash);
  const result = await db.query<{ remaining: number }>(
    `
      SELECT COALESCE(SUM(remaining_uses), 0)::int AS remaining
      FROM screenshot_entitlements
      WHERE client_hash = $1
        AND remaining_uses > 0
        AND expires_at > NOW()
    `,
    [clientHash],
  );
  return Number(result.rows[0]?.remaining ?? 0);
}

function getMemoryPaidRemaining(clientHash: string) {
  const paid = memoryPaidBuckets.get(clientHash);
  if (!paid || paid.expiresAt <= Date.now()) return 0;
  return Math.max(0, paid.remaining);
}

function getShanghaiUsageDate() {
  const now = new Date();
  const shanghaiTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return shanghaiTime.toISOString().slice(0, 10);
}
