import { createHash, createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { ensureCommerceSchema, getPool } from "@/lib/reports";

export type AuthUser = {
  id: string;
  phone: string | null;
  email: string | null;
  displayName: string | null;
  createdAt: string;
  lastLoginAt: string | null;
};

export type AuthSession = {
  token: string;
  expiresAt: Date;
};

export const sessionCookieName = "love_radar_session";

const codeTtlMinutes = 5;
const resendSeconds = 60;
const sessionDays = 30;
const emailCodeTtlMinutes = 10;

let authSchemaReady: Promise<void> | null = null;

export function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

export function isValidChinaMobile(phone: string) {
  return /^1[3-9]\d{9}$/.test(normalizePhone(phone));
}

export async function ensureAuthSchema() {
  const db = getPool();
  if (!db) return;
  await ensureCommerceSchema();
  authSchemaReady =
    authSchemaReady ??
    db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        phone TEXT UNIQUE,
        email TEXT UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_login_at TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS login_codes (
        id TEXT PRIMARY KEY,
        phone TEXT NOT NULL,
        code_hash TEXT NOT NULL,
        client_hash TEXT,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS login_codes_phone_created_at_idx
        ON login_codes (phone, created_at DESC);
      CREATE INDEX IF NOT EXISTS login_codes_client_hash_created_at_idx
        ON login_codes (client_hash, created_at DESC);

      CREATE TABLE IF NOT EXISTS email_login_codes (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        code_hash TEXT NOT NULL,
        client_hash TEXT,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS email_login_codes_email_created_at_idx
        ON email_login_codes (email, created_at DESC);
      CREATE INDEX IF NOT EXISTS email_login_codes_client_hash_created_at_idx
        ON email_login_codes (client_hash, created_at DESC);

      ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT;
      CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx ON users (email) WHERE email IS NOT NULL;

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);
      CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions (expires_at);

      ALTER TABLE love_reports
        ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
      CREATE INDEX IF NOT EXISTS love_reports_user_id_idx ON love_reports (user_id);

      ALTER TABLE screenshot_entitlements
        ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
      CREATE INDEX IF NOT EXISTS screenshot_entitlements_user_id_idx
        ON screenshot_entitlements (user_id);

      ALTER TABLE unlock_codes
        ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
      CREATE INDEX IF NOT EXISTS unlock_codes_user_id_idx ON unlock_codes (user_id);
    `).then(() => undefined);
  await authSchemaReady;
}

export function getAuthClientHash(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const userAgent = request.headers.get("user-agent")?.trim() || "unknown-agent";
  const salt = process.env.AUTH_SESSION_SECRET || process.env.DATABASE_URL || "love-radar-auth";
  return createHash("sha256").update(`${salt}:${forwarded || realIp || "anonymous"}:${userAgent}`).digest("hex");
}

function codeHash(phone: string, code: string) {
  const secret = process.env.AUTH_SESSION_SECRET || process.env.DATABASE_URL || "love-radar-auth";
  return createHash("sha256").update(`${secret}:${phone}:${code}`).digest("hex");
}

function emailCodeHash(email: string, code: string) {
  const secret = process.env.AUTH_SESSION_SECRET || process.env.DATABASE_URL || "love-radar-auth";
  return createHash("sha256").update(`${secret}:${email}:${code}`).digest("hex");
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

function tokenHash(token: string) {
  const secret = process.env.AUTH_SESSION_SECRET || process.env.DATABASE_URL || "love-radar-auth";
  return createHash("sha256").update(`${secret}:${token}`).digest("hex");
}

function safeEqual(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  return aBuffer.length === bBuffer.length && timingSafeEqual(aBuffer, bBuffer);
}

export async function sendLoginCode(phoneInput: string, request: Request) {
  const phone = normalizePhone(phoneInput);
  if (!isValidChinaMobile(phone)) {
    return { success: false, error: "请输入正确的 11 位手机号。" };
  }

  const db = getPool();
  if (!db) return { success: false, error: "登录服务暂未配置数据库，请稍后再试。" };
  await ensureAuthSchema();

  const clientHash = getAuthClientHash(request);
  const recent = await db.query<{ phone_recent: number; phone_hour: number; ip_hour: number }>(
    `
      SELECT
        COUNT(*) FILTER (WHERE phone = $1 AND created_at > NOW() - INTERVAL '60 seconds')::int AS phone_recent,
        COUNT(*) FILTER (WHERE phone = $1 AND created_at > NOW() - INTERVAL '1 hour')::int AS phone_hour,
        COUNT(*) FILTER (WHERE client_hash = $2 AND created_at > NOW() - INTERVAL '1 hour')::int AS ip_hour
      FROM login_codes
      WHERE created_at > NOW() - INTERVAL '1 hour'
    `,
    [phone, clientHash],
  );
  const row = recent.rows[0];
  if (Number(row?.phone_recent ?? 0) > 0) {
    return { success: false, error: "验证码发送太频繁，请 60 秒后再试。" };
  }
  if (Number(row?.phone_hour ?? 0) >= 5 || Number(row?.ip_hour ?? 0) >= 10) {
    return { success: false, error: "今天尝试次数有点多，请稍后再试。" };
  }

  const code = String(randomInt(100000, 1000000));
  const expiresAt = new Date(Date.now() + codeTtlMinutes * 60 * 1000);
  const sms = await sendAliyunSmsCode(phone, code);
  if (!sms.success) return sms;

  await db.query(
    `INSERT INTO login_codes (id, phone, code_hash, client_hash, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [randomUUID(), phone, codeHash(phone, code), clientHash, expiresAt],
  );

  return {
    success: true,
    expiresIn: codeTtlMinutes * 60,
    resendAfter: resendSeconds,
    devCode: sms.devCode,
  };
}

export async function verifyLoginCode(phoneInput: string, codeInput: string) {
  const phone = normalizePhone(phoneInput);
  const code = codeInput.trim();
  if (!isValidChinaMobile(phone) || !/^\d{6}$/.test(code)) {
    return { success: false, error: "手机号或验证码格式不正确。" };
  }

  const db = getPool();
  if (!db) return { success: false, error: "登录服务暂未配置数据库，请稍后再试。" };
  await ensureAuthSchema();

  const candidates = await db.query<{ id: string; code_hash: string }>(
    `
      SELECT id, code_hash
      FROM login_codes
      WHERE phone = $1
        AND used_at IS NULL
        AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 5
    `,
    [phone],
  );
  const expected = codeHash(phone, code);
  const matched = candidates.rows.find((item) => safeEqual(item.code_hash, expected));
  if (!matched) {
    return { success: false, error: "验证码错误或已过期。" };
  }

  const userId = randomUUID();
  const sessionToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + sessionDays);

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query("UPDATE login_codes SET used_at = NOW() WHERE id = $1", [matched.id]);
    const userResult = await client.query<AuthUser>(
      `
        INSERT INTO users (id, phone, last_login_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (phone)
        DO UPDATE SET last_login_at = NOW()
      RETURNING id, phone, email, display_name AS "displayName", created_at AS "createdAt", last_login_at AS "lastLoginAt"
      `,
      [userId, phone],
    );
    const user = userResult.rows[0];
    await client.query(
      `INSERT INTO sessions (id, user_id, token_hash, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [randomUUID(), user.id, tokenHash(sessionToken), expiresAt],
    );
    await client.query("COMMIT");
    return { success: true, user, session: { token: sessionToken, expiresAt } };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("verify login code failed:", error);
    return { success: false, error: "登录失败，请稍后再试。" };
  } finally {
    client.release();
  }
}

export async function sendEmailLoginCode(emailInput: string, request: Request) {
  const email = normalizeEmail(emailInput);
  if (!isValidEmail(email)) return { success: false, error: "请输入正确的邮箱地址。" };

  const db = getPool();
  if (!db) return { success: false, error: "登录服务暂未配置数据库，请稍后再试。" };
  await ensureAuthSchema();
  const clientHash = getAuthClientHash(request);
  const recent = await db.query<{ email_recent: number; email_hour: number; client_hour: number }>(
    `SELECT
       COUNT(*) FILTER (WHERE email = $1 AND created_at > NOW() - INTERVAL '60 seconds')::int AS email_recent,
       COUNT(*) FILTER (WHERE email = $1 AND created_at > NOW() - INTERVAL '1 hour')::int AS email_hour,
       COUNT(*) FILTER (WHERE client_hash = $2 AND created_at > NOW() - INTERVAL '1 hour')::int AS client_hour
     FROM email_login_codes
     WHERE created_at > NOW() - INTERVAL '1 hour'`,
    [email, clientHash],
  );
  const row = recent.rows[0];
  if (Number(row?.email_recent ?? 0) > 0) return { success: false, error: "发送太频繁，请 60 秒后再试。" };
  if (Number(row?.email_hour ?? 0) >= 5 || Number(row?.client_hour ?? 0) >= 10) {
    return { success: false, error: "今天尝试次数较多，请稍后再试。" };
  }

  const code = String(randomInt(100000, 1000000));
  const expiresAt = new Date(Date.now() + emailCodeTtlMinutes * 60 * 1000);
  const sent = await sendEmailCode(email, code);
  if (!sent.success) return sent;
  await db.query(
    `INSERT INTO email_login_codes (id, email, code_hash, client_hash, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [randomUUID(), email, emailCodeHash(email, code), clientHash, expiresAt],
  );
  return { success: true, expiresIn: emailCodeTtlMinutes * 60, resendAfter: 60, devCode: sent.devCode };
}

export async function verifyEmailLoginCode(emailInput: string, codeInput: string) {
  const email = normalizeEmail(emailInput);
  const code = codeInput.trim();
  if (!isValidEmail(email) || !/^\d{6}$/.test(code)) return { success: false, error: "邮箱或验证码格式不正确。" };
  const db = getPool();
  if (!db) return { success: false, error: "登录服务暂未配置数据库，请稍后再试。" };
  await ensureAuthSchema();
  const candidates = await db.query<{ id: string; code_hash: string }>(
    `SELECT id, code_hash FROM email_login_codes
     WHERE email = $1 AND used_at IS NULL AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 5`,
    [email],
  );
  const expected = emailCodeHash(email, code);
  const matched = candidates.rows.find((item) => safeEqual(item.code_hash, expected));
  if (!matched) return { success: false, error: "验证码错误或已过期。" };
  const sessionToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + sessionDays);
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query("UPDATE email_login_codes SET used_at = NOW() WHERE id = $1 AND used_at IS NULL", [matched.id]);
    const userResult = await client.query<AuthUser>(
      `INSERT INTO users (id, email, last_login_at) VALUES ($1, $2, NOW())
       ON CONFLICT (email) WHERE email IS NOT NULL
       DO UPDATE SET last_login_at = NOW()
       RETURNING id, phone, email, display_name AS "displayName", created_at AS "createdAt", last_login_at AS "lastLoginAt"`,
      [randomUUID(), email],
    );
    const user = userResult.rows[0];
    await client.query(
      `INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)`,
      [randomUUID(), user.id, tokenHash(sessionToken), expiresAt],
    );
    await client.query("COMMIT");
    return { success: true, user, session: { token: sessionToken, expiresAt } };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("verify email code failed:", error);
    return { success: false, error: "登录失败，请稍后再试。" };
  } finally {
    client.release();
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  if (!token) return null;
  return getUserBySessionToken(token);
}

export async function getUserBySessionToken(token: string): Promise<AuthUser | null> {
  const db = getPool();
  if (!db) return null;
  await ensureAuthSchema();
  const result = await db.query<AuthUser>(
    `
      SELECT users.id, users.phone, users.email, users.display_name AS "displayName", users.created_at AS "createdAt", users.last_login_at AS "lastLoginAt"
      FROM sessions
      JOIN users ON users.id = sessions.user_id
      WHERE sessions.token_hash = $1
        AND sessions.expires_at > NOW()
      LIMIT 1
    `,
    [tokenHash(token)],
  );
  return result.rows[0] ?? null;
}

async function sendEmailCode(email: string, code: string): Promise<{ success: boolean; error?: string; devCode?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "Love Radar <onboarding@resend.dev>";
  if (!apiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[Love Radar dev email login code] ${email}: ${code}`);
      return { success: true, devCode: code };
    }
    return { success: false, error: "邮件服务暂未配置，请稍后再试。" };
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "你的 Love Radar 登录验证码",
      html: `<div style="font-family:Arial,sans-serif;line-height:1.8"><h2>Love Radar</h2><p>你的登录验证码是：</p><p style="font-size:32px;font-weight:700;letter-spacing:8px">${code}</p><p>验证码 10 分钟内有效，请勿转发给他人。</p></div>`,
    }),
  });
  if (!response.ok) {
    console.error("Resend email failed:", await response.text().catch(() => ""));
    return { success: false, error: "验证码邮件发送失败，请稍后再试。" };
  }
  return { success: true };
}

export async function logoutCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  if (!token) return;
  const db = getPool();
  if (!db) return;
  await ensureAuthSchema();
  await db.query("DELETE FROM sessions WHERE token_hash = $1", [tokenHash(token)]);
}

export async function bindReportToUser(reportId: string, userId: string) {
  const db = getPool();
  if (!db) return false;
  await ensureAuthSchema();
  const result = await db.query(
    `UPDATE love_reports SET user_id = $2 WHERE id = $1 AND expires_at > NOW()`,
    [reportId, userId],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function updateUserProfile(userId: string, displayNameInput: string) {
  const db = getPool();
  if (!db) return { success: false, error: "账户服务暂不可用，请稍后再试。" };
  const displayName = displayNameInput.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 20);
  await ensureAuthSchema();
  const result = await db.query<AuthUser>(
    `UPDATE users
     SET display_name = NULLIF($2, '')
     WHERE id = $1
     RETURNING id, phone, email, display_name AS "displayName", created_at AS "createdAt", last_login_at AS "lastLoginAt"`,
    [userId, displayName],
  );
  if (!result.rows[0]) return { success: false, error: "账户不存在，请重新登录。" };
  return { success: true, user: result.rows[0] };
}

export async function getMeOverview(userId: string) {
  const db = getPool();
  if (!db) {
    return { reports: [], screenshotRemaining: 0, redeemedCodes: 0, reportCount: 0, paidReportCount: 0 };
  }
  await ensureAuthSchema();
  const [reports, quota, codes] = await Promise.all([
    db.query<{
      id: string;
      summary: string;
      risk_level: string;
      overall_score: number;
      is_paid: boolean;
      created_at: Date;
    }>(
      `
        SELECT
          id,
          summary,
          relationship->>'riskLevel' AS risk_level,
          COALESCE((relationship->>'overallScore')::int, 0) AS overall_score,
          is_paid,
          created_at
        FROM love_reports
        WHERE user_id = $1 AND expires_at > NOW()
        ORDER BY created_at DESC
        LIMIT 30
      `,
      [userId],
    ),
    db.query<{ remaining: number }>(
      `
        SELECT COALESCE(SUM(remaining_uses), 0)::int AS remaining
        FROM screenshot_entitlements
        WHERE user_id = $1
          AND remaining_uses > 0
          AND expires_at > NOW()
      `,
      [userId],
    ),
    db.query<{ count: number }>("SELECT COUNT(*)::int AS count FROM unlock_codes WHERE user_id = $1", [userId]),
  ]);

  return {
    reports: reports.rows.map((item) => ({
      id: item.id,
      summary: item.summary,
      riskLevel: item.risk_level,
      overallScore: Number(item.overall_score),
      isPaid: Boolean(item.is_paid),
      createdAt: item.created_at.toISOString(),
    })),
    screenshotRemaining: Number(quota.rows[0]?.remaining ?? 0),
    redeemedCodes: Number(codes.rows[0]?.count ?? 0),
    reportCount: reports.rows.length,
    paidReportCount: reports.rows.filter((item) => Boolean(item.is_paid)).length,
  };
}

async function sendAliyunSmsCode(phone: string, code: string): Promise<{
  success: boolean;
  error?: string;
  devCode?: string;
}> {
  const accessKeyId = process.env.ALIYUN_SMS_ACCESS_KEY_ID || "";
  const accessKeySecret = process.env.ALIYUN_SMS_ACCESS_KEY_SECRET || "";
  const region = process.env.ALIYUN_SMS_REGION || "cn-hangzhou";
  const signName = process.env.ALIYUN_SMS_SIGN_NAME || "";
  const templateCode = process.env.ALIYUN_SMS_TEMPLATE_CODE || "";

  if (!accessKeyId || !accessKeySecret || !signName || !templateCode) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[Love Radar dev login code] ${phone}: ${code}`);
      return { success: true, devCode: code };
    }
    return { success: false, error: "短信服务暂未配置完整，请稍后再试。" };
  }

  const params: Record<string, string> = {
    AccessKeyId: accessKeyId,
    Action: "SendSms",
    Format: "JSON",
    PhoneNumbers: phone,
    RegionId: region,
    SignName: signName,
    SignatureMethod: "HMAC-SHA1",
    SignatureNonce: randomUUID(),
    SignatureVersion: "1.0",
    TemplateCode: templateCode,
    TemplateParam: JSON.stringify({ code }),
    Timestamp: new Date().toISOString(),
    Version: "2017-05-25",
  };
  const canonical = Object.keys(params)
    .sort()
    .map((key) => `${percentEncode(key)}=${percentEncode(params[key])}`)
    .join("&");
  const stringToSign = `GET&%2F&${percentEncode(canonical)}`;
  const signature = createHmac("sha1", `${accessKeySecret}&`).update(stringToSign).digest("base64");
  const url = `https://dysmsapi.aliyuncs.com/?Signature=${percentEncode(signature)}&${canonical}`;
  const response = await fetch(url, { method: "GET" });
  const payload = (await response.json().catch(() => ({}))) as { Code?: string; Message?: string };
  if (!response.ok || payload.Code !== "OK") {
    console.error("Aliyun SMS failed:", payload);
    return { success: false, error: "验证码发送失败，请稍后再试。" };
  }
  return { success: true };
}

function percentEncode(value: string) {
  return encodeURIComponent(value)
    .replace(/\+/g, "%20")
    .replace(/\*/g, "%2A")
    .replace(/%7E/g, "~");
}
