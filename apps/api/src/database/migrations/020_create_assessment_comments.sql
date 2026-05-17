CREATE TABLE IF NOT EXISTS assessment_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  class_teacher_comment TEXT,
  headteacher_comment TEXT,
  class_teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
  headteacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, term_id, academic_year_id)
);
