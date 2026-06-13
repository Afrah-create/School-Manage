-- Platform termly subscription billing (school → SlimCyberTech).

CREATE TABLE IF NOT EXISTS platform_billing_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  default_amount_ugx BIGINT NOT NULL DEFAULT 500000 CHECK (default_amount_ugx > 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'UGX',
  grace_days INT NOT NULL DEFAULT 7 CHECK (grace_days >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO platform_billing_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS tenant_billing_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  label VARCHAR(120) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  due_at TIMESTAMPTZ NOT NULL,
  amount_ugx BIGINT NOT NULL CHECK (amount_ugx > 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'UGX',
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'overdue', 'waived')),
  paid_at TIMESTAMPTZ,
  waived_at TIMESTAMPTZ,
  waived_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, label)
);

CREATE INDEX IF NOT EXISTS idx_tenant_billing_periods_tenant_status
  ON tenant_billing_periods (tenant_id, status, due_at DESC);

CREATE TABLE IF NOT EXISTS tenant_subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  billing_period_id UUID NOT NULL REFERENCES tenant_billing_periods(id) ON DELETE CASCADE,
  amount_ugx BIGINT NOT NULL CHECK (amount_ugx > 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'UGX',
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'cancelled')),
  provider VARCHAR(40) NOT NULL DEFAULT 'flutterwave',
  tx_ref VARCHAR(120) NOT NULL UNIQUE,
  provider_reference VARCHAR(160),
  checkout_url TEXT,
  paid_at TIMESTAMPTZ,
  failure_reason TEXT,
  initiated_by UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_subscription_payments_tenant
  ON tenant_subscription_payments (tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS tenant_payment_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(40) NOT NULL,
  event_id VARCHAR(160) NOT NULL,
  tx_ref VARCHAR(120),
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, event_id)
);

GRANT SELECT, INSERT, UPDATE ON platform_billing_settings TO platform_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON tenant_billing_periods TO platform_app;
GRANT SELECT, INSERT, UPDATE ON tenant_subscription_payments TO platform_app;
GRANT SELECT, INSERT, UPDATE ON tenant_payment_webhook_events TO platform_app;

GRANT SELECT ON platform_billing_settings TO school_app;
GRANT SELECT ON tenant_billing_periods TO school_app;
GRANT SELECT, INSERT, UPDATE ON tenant_subscription_payments TO school_app;
