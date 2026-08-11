import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";

const email = String(process.argv[2] || "").trim().toLowerCase();

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  throw new Error("Usage: node scripts/grant-test-account.mjs name@example.com");
}

const localEnv = await readFile(resolve(".env.local"), "utf8").catch(() => "");
const localDatabaseUrl = localEnv
  .split(/\r?\n/)
  .find((line) => line.startsWith("DATABASE_URL="))
  ?.slice("DATABASE_URL=".length)
  .trim()
  .replace(/^['"]|['"]$/g, "");
const connectionString = process.env.DATABASE_URL || localDatabaseUrl;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured.");
}

const database = new pg.Pool({ connectionString });

try {
  await database.query(
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_test_account BOOLEAN NOT NULL DEFAULT FALSE",
  );
  const result = await database.query(
    `UPDATE users
     SET is_test_account = TRUE
     WHERE lower(email) = $1
     RETURNING email`,
    [email],
  );

  if (!result.rowCount) {
    throw new Error("No user with that email has logged in yet.");
  }

  console.log(`Unlimited test access enabled for ${result.rows[0].email}.`);
} finally {
  await database.end();
}
