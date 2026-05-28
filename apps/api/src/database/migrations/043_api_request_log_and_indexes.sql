-- API request log (partitioned by month)
CREATE TABLE IF NOT EXISTS api_request_log (
  id BIGSERIAL,
  method VARCHAR(10) NOT NULL,
  path VARCHAR(255) NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ip_address INET,
  status_code SMALLINT,
  response_time_ms INTEGER,
  request_size_bytes INTEGER,
  response_size_bytes INTEGER,
  cache_hit BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE IF NOT EXISTS api_request_log_default PARTITION OF api_request_log DEFAULT;

CREATE INDEX IF NOT EXISTS idx_api_request_log_created ON api_request_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_request_log_path ON api_request_log (path, created_at DESC);

-- Performance indexes (non-breaking; skip when columns/tables differ from expected schema)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'students' AND column_name = 'class_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_students_class_id ON students (class_id);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'students' AND column_name = 'full_name'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_students_name_search
      ON students USING gin (to_tsvector('english', full_name));
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'assessments_cbc'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'idx_assessments_cbc_student_term_year'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_assessments_cbc_student_term
      ON assessments_cbc (student_id, term_id);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'assessments_cbc' AND column_name = 'subject_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'assessments_cbc' AND column_name = 'term_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_assessments_cbc_subject_term
      ON assessments_cbc (subject_id, term_id);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'fee_payments'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_fee_payments_student
      ON fee_payments (student_id, created_at DESC);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'fee_invoices' AND column_name = 'balance'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_fee_invoices_student_balance
      ON fee_invoices (student_id) WHERE balance > 0;
  END IF;
END $$;
