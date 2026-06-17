-- Project work scores (authoritative CA source) + CA provenance on O-Level results.

ALTER TABLE academic_years
  ADD COLUMN IF NOT EXISTS curriculum_form VARCHAR(2)
    CHECK (curriculum_form IS NULL OR curriculum_form IN ('S1', 'S2', 'S3', 'S4'));

COMMENT ON COLUMN academic_years.curriculum_form IS
  'Senior form label for cumulative CA window (S1–S4). Optional until configured.';

CREATE TABLE IF NOT EXISTS project_work_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_subject_id UUID NOT NULL REFERENCES class_subjects(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
  project_number SMALLINT NOT NULL CHECK (project_number >= 1),
  score NUMERIC(5,2) NOT NULL,
  max_score NUMERIC(5,2) NOT NULL DEFAULT 100,
  scored_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  scored_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  evidence_ref TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, student_id, class_subject_id, term_id, project_number)
);

CREATE INDEX IF NOT EXISTS idx_project_work_scores_student_term
  ON project_work_scores (student_id, term_id);
CREATE INDEX IF NOT EXISTS idx_project_work_scores_class_subject
  ON project_work_scores (class_subject_id, term_id);

ALTER TABLE project_work_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_work_scores FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_project_work_scores ON project_work_scores;
CREATE POLICY tenant_isolation_project_work_scores ON project_work_scores
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

DROP TRIGGER IF EXISTS trg_project_work_scores_tenant_default ON project_work_scores;
CREATE TRIGGER trg_project_work_scores_tenant_default
  BEFORE INSERT ON project_work_scores
  FOR EACH ROW EXECUTE FUNCTION apply_tenant_id_default();

ALTER TABLE olevel_subject_results
  ADD COLUMN IF NOT EXISTS ca_source VARCHAR(20)
    CHECK (ca_source IS NULL OR ca_source IN ('project_work', 'strand_fallback', 'incomplete')),
  ADD COLUMN IF NOT EXISTS formula_version VARCHAR(40) NOT NULL DEFAULT 'cbc_ca_v1',
  ADD COLUMN IF NOT EXISTS projects_completed INT,
  ADD COLUMN IF NOT EXISTS projects_expected INT;

CREATE TABLE IF NOT EXISTS olevel_subject_result_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  ca_score NUMERIC(5,2),
  eoc_score NUMERIC(5,2),
  composite_score NUMERIC(5,2),
  final_grade CHAR(1) CHECK (final_grade IN ('A', 'B', 'C', 'D', 'E')),
  ca_source VARCHAR(20)
    CHECK (ca_source IS NULL OR ca_source IN ('project_work', 'strand_fallback', 'incomplete')),
  formula_version VARCHAR(40) NOT NULL,
  projects_completed INT,
  projects_expected INT,
  ca_complete BOOLEAN NOT NULL DEFAULT FALSE,
  project_complete BOOLEAN NOT NULL DEFAULT FALSE,
  config_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  computed_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_olevel_result_versions_student_year
  ON olevel_subject_result_versions (student_id, academic_year_id, computed_at DESC);

ALTER TABLE olevel_subject_result_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE olevel_subject_result_versions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_olevel_subject_result_versions ON olevel_subject_result_versions;
CREATE POLICY tenant_isolation_olevel_subject_result_versions ON olevel_subject_result_versions
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

DROP TRIGGER IF EXISTS trg_olevel_subject_result_versions_tenant_default ON olevel_subject_result_versions;
CREATE TRIGGER trg_olevel_subject_result_versions_tenant_default
  BEFORE INSERT ON olevel_subject_result_versions
  FOR EACH ROW EXECUTE FUNCTION apply_tenant_id_default();
