import { createHash, createHmac, randomBytes, randomInt, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { ensureCommerceSchema, getPool } from "@/lib/reports";
import { getNewUserGiftCode } from "@/lib/unlock-codes";

export type AuthUser = {
  id: string;
  phone: string | null;
  email: string | null;
  displayName: string | null;
  isTestAccount: boolean;
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
const passwordActionTtlMinutes = 10;
const passwordMinLength = 8;
const passwordMaxLength = 128;
const passwordLoginWindowMinutes = 15;
const passwordLoginEmailLimit = 5;
const passwordLoginClientLimit = 20;

type AuthLocale = "zh-CN" | "en-US";
type PasswordAction = "register" | "reset";

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
        password_hash TEXT,
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
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_test_account BOOLEAN NOT NULL DEFAULT FALSE;
      CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx ON users (email) WHERE email IS NOT NULL;

      CREATE TABLE IF NOT EXISTS password_action_codes (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        action TEXT NOT NULL CHECK (action IN ('register', 'reset')),
        code_hash TEXT NOT NULL,
        password_hash TEXT,
        client_hash TEXT,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS password_action_codes_email_action_created_at_idx
        ON password_action_codes (email, action, created_at DESC);
      CREATE INDEX IF NOT EXISTS password_action_codes_client_hash_created_at_idx
        ON password_action_codes (client_hash, created_at DESC);

      CREATE TABLE IF NOT EXISTS password_login_attempts (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        client_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS password_login_attempts_email_created_at_idx
        ON password_login_attempts (email, created_at DESC);
      CREATE INDEX IF NOT EXISTS password_login_attempts_client_hash_created_at_idx
        ON password_login_attempts (client_hash, created_at DESC);

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

export function isTestAccountEmail(email?: string | null) {
  const normalizedEmail = normalizeEmail(email || "");
  if (!normalizedEmail) return false;
  return (process.env.TEST_ACCOUNT_EMAILS || "")
    .split(",")
    .map((item) => normalizeEmail(item))
    .filter(Boolean)
    .includes(normalizedEmail);
}

function decorateTestUser(user: AuthUser) {
  return {
    ...user,
    isTestAccount: Boolean(user.isTestAccount) || isTestAccountEmail(user.email),
  };
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

function authMessage(locale: AuthLocale, chinese: string, english: string) {
  return locale === "en-US" ? english : chinese;
}

function passwordActionCodeHash(email: string, code: string, action: PasswordAction) {
  const secret = process.env.AUTH_SESSION_SECRET || process.env.DATABASE_URL || "love-radar-auth";
  return createHash("sha256").update(`${secret}:${action}:${email}:${code}`).digest("hex");
}

function createSessionMaterial(): AuthSession {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + sessionDays);
  return { token: randomBytes(32).toString("base64url"), expiresAt };
}

export async function setAuthSessionCookie(session: AuthSession) {
  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, session.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: session.expiresAt,
  });
}

export function validatePassword(password: string) {
  if (password.length < passwordMinLength) return "Password must be at least 8 characters.";
  if (password.length > passwordMaxLength) return "Password must be 128 characters or fewer.";
  return null;
}

function derivePasswordKey(password: string, salt: Buffer, cost = 16384, blockSize = 8, parallelization = 1) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(
      password,
      salt,
      64,
      { N: cost, r: blockSize, p: parallelization, maxmem: 64 * 1024 * 1024 },
      (error, derivedKey) => {
        if (error) reject(error);
        else resolve(derivedKey);
      },
    );
  });
}

async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const cost = 16384;
  const blockSize = 8;
  const parallelization = 1;
  const derivedKey = await derivePasswordKey(password, salt, cost, blockSize, parallelization);
  return [
    "scrypt",
    String(cost),
    String(blockSize),
    String(parallelization),
    salt.toString("base64url"),
    derivedKey.toString("base64url"),
  ].join("$");
}

async function verifyPassword(password: string, storedHash?: string | null) {
  const parts = storedHash?.split("$") ?? [];
  if (parts.length !== 6 || parts[0] !== "scrypt") {
    const dummySalt = createHash("sha256").update("love-radar-password-dummy").digest().subarray(0, 16);
    await derivePasswordKey(password.slice(0, passwordMaxLength), dummySalt);
    return false;
  }

  const cost = Number(parts[1]);
  const blockSize = Number(parts[2]);
  const parallelization = Number(parts[3]);
  const salt = Buffer.from(parts[4], "base64url");
  const expected = Buffer.from(parts[5], "base64url");
  if (
    !Number.isInteger(cost) ||
    !Number.isInteger(blockSize) ||
    !Number.isInteger(parallelization) ||
    cost < 2 ||
    cost > 65536 ||
    blockSize < 1 ||
    blockSize > 32 ||
    parallelization < 1 ||
    parallelization > 8 ||
    salt.length < 8 ||
    expected.length !== 64
  ) {
    const dummySalt = createHash("sha256").update("love-radar-password-invalid").digest().subarray(0, 16);
    await derivePasswordKey(password.slice(0, passwordMaxLength), dummySalt);
    return false;
  }

  const actual = await derivePasswordKey(password, salt, cost, blockSize, parallelization);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
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
  const session = createSessionMaterial();

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
      RETURNING id, phone, email, display_name AS "displayName", is_test_account AS "isTestAccount", created_at AS "createdAt", last_login_at AS "lastLoginAt"
      `,
      [userId, phone],
    );
    const user = decorateTestUser(userResult.rows[0]);
    await client.query(
      `INSERT INTO sessions (id, user_id, token_hash, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [randomUUID(), user.id, tokenHash(session.token), session.expiresAt],
    );
    await client.query("COMMIT");
    return { success: true, user, session };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("verify login code failed:", error);
    return { success: false, error: "登录失败，请稍后再试。" };
  } finally {
    client.release();
  }
}

export async function sendEmailLoginCode(emailInput: string, request: Request, locale: AuthLocale = "zh-CN") {
  const email = normalizeEmail(emailInput);
  if (!isValidEmail(email)) {
    return { success: false, error: authMessage(locale, "请输入正确的邮箱地址。", "Enter a valid email address.") };
  }

  const db = getPool();
  if (!db) {
    return { success: false, error: authMessage(locale, "登录服务暂未配置数据库，请稍后再试。", "Sign-in is temporarily unavailable.") };
  }
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
  if (Number(row?.email_recent ?? 0) > 0) {
    return { success: false, error: authMessage(locale, "发送太频繁，请 60 秒后再试。", "Please wait 60 seconds before requesting another code.") };
  }
  if (Number(row?.email_hour ?? 0) >= 5 || Number(row?.client_hour ?? 0) >= 10) {
    return { success: false, error: authMessage(locale, "今天尝试次数较多，请稍后再试。", "Too many requests. Please try again later.") };
  }

  const code = String(randomInt(100000, 1000000));
  const expiresAt = new Date(Date.now() + emailCodeTtlMinutes * 60 * 1000);
  const sent = await sendEmailCode(email, code, locale, "login");
  if (!sent.success) return sent;
  await db.query(
    `INSERT INTO email_login_codes (id, email, code_hash, client_hash, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [randomUUID(), email, emailCodeHash(email, code), clientHash, expiresAt],
  );
  return { success: true, expiresIn: emailCodeTtlMinutes * 60, resendAfter: 60, devCode: sent.devCode };
}

export async function verifyEmailLoginCode(emailInput: string, codeInput: string, locale: AuthLocale = "zh-CN") {
  const email = normalizeEmail(emailInput);
  const code = codeInput.trim();
  if (!isValidEmail(email) || !/^\d{6}$/.test(code)) {
    return { success: false, error: authMessage(locale, "邮箱或验证码格式不正确。", "Enter a valid email address and 6-digit code.") };
  }
  const db = getPool();
  if (!db) {
    return { success: false, error: authMessage(locale, "登录服务暂未配置数据库，请稍后再试。", "Sign-in is temporarily unavailable.") };
  }
  await ensureAuthSchema();
  const candidates = await db.query<{ id: string; code_hash: string }>(
    `SELECT id, code_hash FROM email_login_codes
     WHERE email = $1 AND used_at IS NULL AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 5`,
    [email],
  );
  const expected = emailCodeHash(email, code);
  const matched = candidates.rows.find((item) => safeEqual(item.code_hash, expected));
  if (!matched) {
    return { success: false, error: authMessage(locale, "验证码错误或已过期。", "That code is invalid or has expired.") };
  }
  const session = createSessionMaterial();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query("UPDATE email_login_codes SET used_at = NOW() WHERE id = $1 AND used_at IS NULL", [matched.id]);
    const userResult = await client.query<AuthUser>(
      `INSERT INTO users (id, email, last_login_at) VALUES ($1, $2, NOW())
       ON CONFLICT (email) WHERE email IS NOT NULL
       DO UPDATE SET last_login_at = NOW()
       RETURNING id, phone, email, display_name AS "displayName", is_test_account AS "isTestAccount", created_at AS "createdAt", last_login_at AS "lastLoginAt"`,
      [randomUUID(), email],
    );
    const user = decorateTestUser(userResult.rows[0]);
    await client.query(
      `INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)`,
      [randomUUID(), user.id, tokenHash(session.token), session.expiresAt],
    );
    await client.query("COMMIT");
    return { success: true, user, session };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("verify email code failed:", error);
    return { success: false, error: authMessage(locale, "登录失败，请稍后再试。", "Sign-in failed. Please try again.") };
  } finally {
    client.release();
  }
}

async function startPasswordAction(action: PasswordAction, emailInput: string, passwordInput: string | null, request: Request) {
  const email = normalizeEmail(emailInput);
  if (!isValidEmail(email)) return { success: false, error: "Enter a valid email address." };
  if (action === "register") {
    const passwordError = validatePassword(passwordInput ?? "");
    if (passwordError) return { success: false, error: passwordError };
  }

  const db = getPool();
  if (!db) return { success: false, error: "Account services are temporarily unavailable." };
  await ensureAuthSchema();

  const clientHash = getAuthClientHash(request);
  const recent = await db.query<{ email_recent: number; email_hour: number; client_hour: number }>(
    `SELECT
       COUNT(*) FILTER (WHERE email = $1 AND action = $2 AND created_at > NOW() - INTERVAL '60 seconds')::int AS email_recent,
       COUNT(*) FILTER (WHERE email = $1 AND action = $2 AND created_at > NOW() - INTERVAL '1 hour')::int AS email_hour,
       COUNT(*) FILTER (WHERE client_hash = $3 AND created_at > NOW() - INTERVAL '1 hour')::int AS client_hour
     FROM password_action_codes
     WHERE created_at > NOW() - INTERVAL '1 hour'`,
    [email, action, clientHash],
  );
  const row = recent.rows[0];
  if (Number(row?.email_recent ?? 0) > 0) {
    return { success: false, error: "Please wait 60 seconds before requesting another code." };
  }
  if (Number(row?.email_hour ?? 0) >= 5 || Number(row?.client_hour ?? 0) >= 10) {
    return { success: false, error: "Too many requests. Please try again later." };
  }

  const code = String(randomInt(100000, 1000000));
  const expiresAt = new Date(Date.now() + passwordActionTtlMinutes * 60 * 1000);
  const pendingPasswordHash = action === "register" ? await hashPassword(passwordInput ?? "") : null;
  const sent = await sendEmailCode(email, code, "en-US", action);
  if (!sent.success) return sent;

  await db.query(
    `INSERT INTO password_action_codes
       (id, email, action, code_hash, password_hash, client_hash, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [randomUUID(), email, action, passwordActionCodeHash(email, code, action), pendingPasswordHash, clientHash, expiresAt],
  );
  return {
    success: true,
    expiresIn: passwordActionTtlMinutes * 60,
    resendAfter: 60,
    devCode: sent.devCode,
  };
}

export async function startPasswordRegistration(
  emailInput: string,
  passwordInput: string,
  confirmPasswordInput: string,
  request: Request,
) {
  if (passwordInput !== confirmPasswordInput) return { success: false, error: "Passwords do not match." };
  return startPasswordAction("register", emailInput, passwordInput, request);
}

export async function completePasswordRegistration(emailInput: string, codeInput: string) {
  const email = normalizeEmail(emailInput);
  const code = codeInput.trim();
  if (!isValidEmail(email) || !/^\d{6}$/.test(code)) {
    return { success: false, error: "Enter a valid email address and 6-digit code." };
  }

  const db = getPool();
  if (!db) return { success: false, error: "Account services are temporarily unavailable." };
  await ensureAuthSchema();
  const candidates = await db.query<{ id: string; code_hash: string; password_hash: string | null }>(
    `SELECT id, code_hash, password_hash
     FROM password_action_codes
     WHERE email = $1 AND action = 'register' AND used_at IS NULL AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 5`,
    [email],
  );
  const expected = passwordActionCodeHash(email, code, "register");
  const matched = candidates.rows.find((item) => safeEqual(item.code_hash, expected));
  if (!matched?.password_hash) return { success: false, error: "That code is invalid or has expired." };

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query<{ id: string; password_hash: string | null }>(
      "SELECT id, password_hash FROM users WHERE email = $1 FOR UPDATE",
      [email],
    );
    const claimed = await client.query(
      "UPDATE password_action_codes SET used_at = NOW() WHERE id = $1 AND used_at IS NULL RETURNING id",
      [matched.id],
    );
    if (!claimed.rows[0]) {
      await client.query("ROLLBACK");
      return { success: false, error: "That code is invalid or has expired." };
    }
    if (existing.rows[0]?.password_hash) {
      await client.query("COMMIT");
      return { success: false, error: "An account already exists. Sign in or reset your password." };
    }

    const userResult = existing.rows[0]
      ? await client.query<AuthUser>(
          `UPDATE users SET password_hash = $2, last_login_at = NOW()
           WHERE id = $1
           RETURNING id, phone, email, display_name AS "displayName", is_test_account AS "isTestAccount", created_at AS "createdAt", last_login_at AS "lastLoginAt"`,
          [existing.rows[0].id, matched.password_hash],
        )
      : await client.query<AuthUser>(
          `INSERT INTO users (id, email, password_hash, last_login_at)
           VALUES ($1, $2, $3, NOW())
           RETURNING id, phone, email, display_name AS "displayName", is_test_account AS "isTestAccount", created_at AS "createdAt", last_login_at AS "lastLoginAt"`,
          [randomUUID(), email, matched.password_hash],
        );
    const user = decorateTestUser(userResult.rows[0]);
    const session = createSessionMaterial();
    await client.query(
      "INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)",
      [randomUUID(), user.id, tokenHash(session.token), session.expiresAt],
    );
    await client.query("COMMIT");
    return { success: true, user, session };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("password registration failed:", error);
    return { success: false, error: "Could not create the account. Please try again." };
  } finally {
    client.release();
  }
}

export async function startPasswordReset(emailInput: string, request: Request) {
  return startPasswordAction("reset", emailInput, null, request);
}

export async function completePasswordReset(
  emailInput: string,
  codeInput: string,
  passwordInput: string,
  confirmPasswordInput: string,
) {
  const email = normalizeEmail(emailInput);
  const code = codeInput.trim();
  if (!isValidEmail(email) || !/^\d{6}$/.test(code)) {
    return { success: false, error: "That code is invalid or has expired." };
  }
  if (passwordInput !== confirmPasswordInput) return { success: false, error: "Passwords do not match." };
  const passwordError = validatePassword(passwordInput);
  if (passwordError) return { success: false, error: passwordError };

  const db = getPool();
  if (!db) return { success: false, error: "Account services are temporarily unavailable." };
  await ensureAuthSchema();
  const candidates = await db.query<{ id: string; code_hash: string }>(
    `SELECT id, code_hash
     FROM password_action_codes
     WHERE email = $1 AND action = 'reset' AND used_at IS NULL AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 5`,
    [email],
  );
  const expected = passwordActionCodeHash(email, code, "reset");
  const matched = candidates.rows.find((item) => safeEqual(item.code_hash, expected));
  if (!matched) return { success: false, error: "That code is invalid or has expired." };

  const passwordHash = await hashPassword(passwordInput);
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const claimed = await client.query(
      "UPDATE password_action_codes SET used_at = NOW() WHERE id = $1 AND used_at IS NULL RETURNING id",
      [matched.id],
    );
    if (!claimed.rows[0]) {
      await client.query("ROLLBACK");
      return { success: false, error: "That code is invalid or has expired." };
    }
    const userResult = await client.query<AuthUser>(
      `UPDATE users SET password_hash = $2, last_login_at = NOW()
       WHERE email = $1
       RETURNING id, phone, email, display_name AS "displayName", is_test_account AS "isTestAccount", created_at AS "createdAt", last_login_at AS "lastLoginAt"`,
      [email, passwordHash],
    );
    if (!userResult.rows[0]) {
      await client.query("COMMIT");
      return { success: false, error: "That code is invalid or has expired." };
    }
    const user = decorateTestUser(userResult.rows[0]);
    const session = createSessionMaterial();
    await client.query(
      "INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)",
      [randomUUID(), user.id, tokenHash(session.token), session.expiresAt],
    );
    await client.query("COMMIT");
    return { success: true, user, session };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("password reset failed:", error);
    return { success: false, error: "Could not reset the password. Please try again." };
  } finally {
    client.release();
  }
}

export async function loginWithPassword(emailInput: string, passwordInput: string, request: Request) {
  const email = normalizeEmail(emailInput);
  const genericError = "Invalid email or password. You can also sign in with a verification code.";
  if (!isValidEmail(email) || passwordInput.length < 1 || passwordInput.length > passwordMaxLength) {
    return { success: false, error: genericError };
  }

  const db = getPool();
  if (!db) return { success: false, error: "Sign-in is temporarily unavailable." };
  await ensureAuthSchema();
  const clientHash = getAuthClientHash(request);
  const attempts = await db.query<{ email_client_count: number; client_count: number }>(
    `SELECT
       COUNT(*) FILTER (WHERE email = $1 AND client_hash = $2)::int AS email_client_count,
       COUNT(*) FILTER (WHERE client_hash = $2)::int AS client_count
     FROM password_login_attempts
     WHERE created_at > NOW() - ($3::int * INTERVAL '1 minute')`,
    [email, clientHash, passwordLoginWindowMinutes],
  );
  const attemptRow = attempts.rows[0];
  if (
    Number(attemptRow?.email_client_count ?? 0) >= passwordLoginEmailLimit ||
    Number(attemptRow?.client_count ?? 0) >= passwordLoginClientLimit
  ) {
    return { success: false, error: "Too many sign-in attempts. Please wait a few minutes and try again." };
  }

  try {
    const result = await db.query<AuthUser & { passwordHash: string | null }>(
      `SELECT id, phone, email, password_hash AS "passwordHash", display_name AS "displayName",
              is_test_account AS "isTestAccount", created_at AS "createdAt", last_login_at AS "lastLoginAt"
       FROM users WHERE email = $1 LIMIT 1`,
      [email],
    );
    const candidate = result.rows[0];
    const valid = await verifyPassword(passwordInput, candidate?.passwordHash);
    if (!candidate || !valid) {
      await db.query(
        "INSERT INTO password_login_attempts (id, email, client_hash) VALUES ($1, $2, $3)",
        [randomUUID(), email, clientHash],
      );
      return { success: false, error: genericError };
    }

    const userResult = await db.query<AuthUser>(
      `UPDATE users SET last_login_at = NOW() WHERE id = $1
       RETURNING id, phone, email, display_name AS "displayName", is_test_account AS "isTestAccount", created_at AS "createdAt", last_login_at AS "lastLoginAt"`,
      [candidate.id],
    );
    const user = decorateTestUser(userResult.rows[0]);
    const session = createSessionMaterial();
    await db.query(
      "INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)",
      [randomUUID(), user.id, tokenHash(session.token), session.expiresAt],
    );
    await db.query(
      "DELETE FROM password_login_attempts WHERE email = $1 AND client_hash = $2",
      [email, clientHash],
    );
    return { success: true, user, session };
  } catch (error) {
    console.error("password login failed:", error);
    return { success: false, error: "Sign-in failed. Please try again." };
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
      SELECT users.id, users.phone, users.email, users.display_name AS "displayName", users.is_test_account AS "isTestAccount", users.created_at AS "createdAt", users.last_login_at AS "lastLoginAt"
      FROM sessions
      JOIN users ON users.id = sessions.user_id
      WHERE sessions.token_hash = $1
        AND sessions.expires_at > NOW()
      LIMIT 1
    `,
    [tokenHash(token)],
  );
  return result.rows[0] ? decorateTestUser(result.rows[0]) : null;
}

async function sendEmailCode(
  email: string,
  code: string,
  locale: AuthLocale,
  purpose: "login" | PasswordAction,
): Promise<{ success: boolean; error?: string; devCode?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "Love Radar <onboarding@resend.dev>";
  if (!apiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[Love Radar dev ${purpose} code] ${email}: ${code}`);
      return { success: true, devCode: code };
    }
    return { success: false, error: authMessage(locale, "邮件服务暂未配置，请稍后再试。", "Email delivery is temporarily unavailable.") };
  }
  const english = locale === "en-US";
  const subject = english
    ? purpose === "register"
      ? "Confirm your Love Radar account"
      : purpose === "reset"
        ? "Reset your Love Radar password"
        : "Your Love Radar sign-in code"
    : "你的 Love Radar 登录验证码";
  const intro = english
    ? purpose === "register"
      ? "Use this code to finish creating your account:"
      : purpose === "reset"
        ? "Use this code to reset or set your password:"
        : "Your sign-in code is:"
    : "你的登录验证码是：";
  const footer = english
    ? "This code expires in 10 minutes. Do not share it with anyone."
    : "验证码 10 分钟内有效，请勿转发给他人。";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [email],
      subject,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.8"><h2>Love Radar</h2><p>${intro}</p><p style="font-size:32px;font-weight:700;letter-spacing:8px">${code}</p><p>${footer}</p></div>`,
    }),
  });
  if (!response.ok) {
    console.error("Resend email failed:", await response.text().catch(() => ""));
    return { success: false, error: authMessage(locale, "验证码邮件发送失败，请稍后再试。", "Could not send the email. Please try again.") };
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
     RETURNING id, phone, email, display_name AS "displayName", is_test_account AS "isTestAccount", created_at AS "createdAt", last_login_at AS "lastLoginAt"`,
    [userId, displayName],
  );
  if (!result.rows[0]) return { success: false, error: "账户不存在，请重新登录。" };
  return { success: true, user: decorateTestUser(result.rows[0]) };
}

export async function getMeOverview(userId: string) {
  const db = getPool();
  if (!db) {
    return {
      reports: [],
      screenshotRemaining: 0,
      redeemedCodes: 0,
      reportCount: 0,
      paidReportCount: 0,
      newUserGiftCode: null,
      newUserGiftClaimed: false,
    };
  }
  await ensureAuthSchema();
  const [reports, astrologyReports, quota, codes, newUserGiftCode] = await Promise.all([
    db.query<{
      id: string;
      summary: string;
      risk_level: string;
      overall_score: number;
      is_paid: boolean;
      created_at: Date;
      locale: "zh-CN" | "en-US";
    }>(
      `
        SELECT
          id,
          summary,
          relationship->>'riskLevel' AS risk_level,
          COALESCE((relationship->>'overallScore')::int, 0) AS overall_score,
          is_paid,
          locale,
          created_at
        FROM love_reports
        WHERE user_id = $1 AND expires_at > NOW()
        ORDER BY created_at DESC
        LIMIT 30
      `,
      [userId],
    ),
    db.query<{
      id: string;
      summary: string;
      risk_level: string;
      overall_score: number;
      is_paid: boolean;
      created_at: Date;
      locale: "zh-CN" | "en-US";
    }>(
      `
        SELECT
          id,
          free_content->>'oneLineSummary' AS summary,
          '恋爱占星师' AS risk_level,
          COALESCE((scores->>'overall')::int, 0) AS overall_score,
          is_paid,
          locale,
          created_at
        FROM astrology_reports
        WHERE user_id = $1 AND expires_at > NOW()
        ORDER BY created_at DESC
        LIMIT 30
      `,
      [userId],
    ).catch(() => ({ rows: [] })),
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
    getNewUserGiftCode(userId).catch(() => null),
  ]);

  const chatReports = reports.rows.map((item) => ({
      id: item.id,
      summary: item.summary,
      riskLevel: item.risk_level,
      overallScore: Number(item.overall_score),
      isPaid: Boolean(item.is_paid),
      locale: item.locale === "en-US" ? "en-US" : "zh-CN",
      createdAt: item.created_at.toISOString(),
      kind: "chat" as const,
    }));
  const astroReports = astrologyReports.rows.map((item) => ({
    id: item.id,
    summary: item.summary,
    riskLevel: item.risk_level,
    overallScore: Number(item.overall_score),
    isPaid: Boolean(item.is_paid),
    locale: item.locale === "en-US" ? "en-US" : "zh-CN",
    createdAt: item.created_at.toISOString(),
    kind: "astrology" as const,
  }));
  const allReports = [...chatReports, ...astroReports]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 30);

  return {
    reports: allReports,
    screenshotRemaining: Number(quota.rows[0]?.remaining ?? 0),
    redeemedCodes: Number(codes.rows[0]?.count ?? 0),
    reportCount: allReports.length,
    paidReportCount: allReports.filter((item) => Boolean(item.isPaid)).length,
    newUserGiftCode,
    newUserGiftClaimed: Boolean(newUserGiftCode),
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
