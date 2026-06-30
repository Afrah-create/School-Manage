-- Per class–subject flags for report readiness and project work requirements.
ALTER TABLE class_subjects
  ADD COLUMN IF NOT EXISTS include_on_reports BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS project_work_required BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN class_subjects.include_on_reports IS
  'When false, subject is omitted from term report readiness tracking.';
COMMENT ON COLUMN class_subjects.project_work_required IS
  'When true and tenant policy includes project work, CA scores are required for report release.';
