CREATE TABLE IF NOT EXISTS timetable_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
  level VARCHAR(10) NOT NULL CHECK (level IN ('O_LEVEL', 'A_LEVEL', 'o_level', 'a_level')),
  name VARCHAR(120) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  version INT NOT NULL DEFAULT 0,
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_timetable_templates_one_draft
  ON timetable_templates (academic_year_id, term_id, level)
  WHERE status = 'draft';

CREATE UNIQUE INDEX IF NOT EXISTS idx_timetable_templates_one_published
  ON timetable_templates (academic_year_id, term_id, level)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_timetable_templates_scope
  ON timetable_templates (academic_year_id, term_id, level, status);

CREATE TABLE IF NOT EXISTS timetable_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES timetable_templates(id) ON DELETE CASCADE,
  period_number INT NOT NULL CHECK (period_number >= 1),
  label VARCHAR(60) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_teaching BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (template_id, period_number)
);

CREATE INDEX IF NOT EXISTS idx_timetable_periods_template
  ON timetable_periods (template_id, period_number);

CREATE TABLE IF NOT EXISTS timetable_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES timetable_templates(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  is_school_day BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (template_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_timetable_days_template
  ON timetable_days (template_id, day_of_week);

CREATE TABLE IF NOT EXISTS timetable_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES timetable_templates(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  period_id UUID NOT NULL REFERENCES timetable_periods(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  class_subject_id UUID NOT NULL REFERENCES class_subjects(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (template_id, day_of_week, period_id, class_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_timetable_entries_teacher_slot
  ON timetable_entries (template_id, day_of_week, period_id, teacher_id)
  WHERE teacher_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_timetable_entries_template
  ON timetable_entries (template_id);

CREATE INDEX IF NOT EXISTS idx_timetable_entries_template_class
  ON timetable_entries (template_id, class_id);

CREATE INDEX IF NOT EXISTS idx_timetable_entries_template_teacher
  ON timetable_entries (template_id, teacher_id);

CREATE INDEX IF NOT EXISTS idx_timetable_entries_class_subject
  ON timetable_entries (class_subject_id);

CREATE TABLE IF NOT EXISTS timetable_publication_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES timetable_templates(id) ON DELETE CASCADE,
  version INT NOT NULL,
  published_by UUID REFERENCES users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  entry_count INT NOT NULL DEFAULT 0,
  validation_summary JSONB
);

CREATE INDEX IF NOT EXISTS idx_timetable_publication_log_template
  ON timetable_publication_log (template_id, published_at DESC);
