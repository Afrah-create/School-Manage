CREATE TABLE IF NOT EXISTS password_reset_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  attempt_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  attempt_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_codes_email_expires
  ON password_reset_codes (email, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_verification_codes_email_expires
  ON email_verification_codes (email, expires_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_password_reset_codes_active_email
  ON password_reset_codes (email)
  WHERE used_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_email_verification_codes_active_email
  ON email_verification_codes (email)
  WHERE used_at IS NULL;
