ALTER TABLE cbc_report_cards
  ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES academic_years(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS payload JSONB,
  ADD COLUMN IF NOT EXISTS computed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE alevel_results
  ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES academic_years(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS payload JSONB,
  ADD COLUMN IF NOT EXISTS computed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS idx_cbc_report_cards_student_term
  ON cbc_report_cards (student_id, term_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_alevel_results_student_term
  ON alevel_results (student_id, term_id);

UPDATE cbc_report_cards cr
SET academic_year_id = t.academic_year_id
FROM terms t
WHERE cr.term_id = t.id AND cr.academic_year_id IS NULL;

UPDATE alevel_results ar
SET academic_year_id = t.academic_year_id
FROM terms t
WHERE ar.term_id = t.id AND ar.academic_year_id IS NULL;
