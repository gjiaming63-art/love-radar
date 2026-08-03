CREATE TABLE IF NOT EXISTS love_reports (
  id TEXT PRIMARY KEY,
  scores JSONB NOT NULL,
  tags JSONB NOT NULL,
  summary TEXT NOT NULL,
  evidence_excerpt JSONB NOT NULL,
  advice JSONB NOT NULL,
  mode TEXT NOT NULL,
  relationship JSONB NOT NULL,
  delete_token_hash TEXT NOT NULL,
  is_paid BOOLEAN NOT NULL DEFAULT FALSE,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS love_reports_expires_at_idx ON love_reports (expires_at);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  phone TEXT NOT NULL UNIQUE,
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

CREATE TABLE IF NOT EXISTS unlock_codes (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'single_report',
  used BOOLEAN NOT NULL DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  report_id TEXT REFERENCES love_reports(id) ON DELETE SET NULL,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  payment_provider TEXT NOT NULL DEFAULT 'mianbaoduo',
  order_source TEXT NOT NULL DEFAULT 'external_code'
);

CREATE INDEX IF NOT EXISTS unlock_codes_used_idx ON unlock_codes (used);
CREATE INDEX IF NOT EXISTS unlock_codes_report_id_idx ON unlock_codes (report_id);
CREATE INDEX IF NOT EXISTS unlock_codes_user_id_idx ON unlock_codes (user_id);

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

CREATE TABLE IF NOT EXISTS promo_invite_uses (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  client_hash TEXT NOT NULL UNIQUE,
  report_id TEXT NOT NULL REFERENCES love_reports(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS promo_invite_uses_code_idx ON promo_invite_uses (code);
CREATE INDEX IF NOT EXISTS promo_invite_uses_report_id_idx ON promo_invite_uses (report_id);
CREATE INDEX IF NOT EXISTS promo_invite_uses_user_id_idx ON promo_invite_uses (user_id);
CREATE INDEX IF NOT EXISTS promo_invite_uses_used_at_idx ON promo_invite_uses (used_at);

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
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS screenshot_entitlements_client_hash_idx
  ON screenshot_entitlements (client_hash);
CREATE INDEX IF NOT EXISTS screenshot_entitlements_user_id_idx
  ON screenshot_entitlements (user_id);
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
