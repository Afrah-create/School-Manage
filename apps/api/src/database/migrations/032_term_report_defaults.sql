-- Official exam selection per class/term for report card generation
CREATE TABLE IF NOT EXISTS term_report_defaults (
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
  exam_id UUID REFERENCES exams(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  PRIMARY KEY (class_id, term_id)
);

CREATE INDEX IF NOT EXISTS idx_term_report_defaults_exam ON term_report_defaults (exam_id);
