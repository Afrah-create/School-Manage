CREATE TABLE IF NOT EXISTS platform_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES platform_admins(id) ON DELETE SET NULL,
  action VARCHAR(80) NOT NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_audit_log_created ON platform_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_audit_log_tenant ON platform_audit_log (tenant_id);
