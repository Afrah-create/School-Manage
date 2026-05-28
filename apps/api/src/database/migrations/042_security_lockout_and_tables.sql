-- Login attempt audit trail
CREATE TABLE IF NOT EXISTS login_attempts (
  id BIGSERIAL PRIMARY KEY,
  identifier VARCHAR(255) NOT NULL,
  ip_address INET,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_identifier ON login_attempts (identifier, attempted_at DESC);

-- IP blocklist
CREATE TABLE IF NOT EXISTS ip_blocklist (
  id BIGSERIAL PRIMARY KEY,
  ip_address INET NOT NULL UNIQUE,
  reason TEXT,
  blocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  blocked_by UUID REFERENCES users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ip_blocklist_ip ON ip_blocklist (ip_address);

-- Security-specific audit (separate from audit_logs)
CREATE TABLE IF NOT EXISTS security_audit_log (
  id BIGSERIAL PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  ip_address INET,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  details JSONB,
  severity VARCHAR(20) NOT NULL DEFAULT 'medium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_audit_log_severity_date ON security_audit_log (severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_event ON security_audit_log (event_type, created_at DESC);
