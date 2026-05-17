CREATE TABLE IF NOT EXISTS assessments_alevel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  score NUMERIC(5,2) CHECK (score >= 0 AND score <= 100),
  grade CHAR(1) CHECK (grade IN ('A','B','C','D','E','O','F')),
  points INTEGER CHECK (points BETWEEN 1 AND 9),
  term_id UUID NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  is_submitted BOOLEAN DEFAULT FALSE,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, subject_id, term_id, academic_year_id)
);

INSERT INTO assessments_alevel (
  student_id,
  subject_id,
  score,
  grade,
  points,
  term_id,
  academic_year_id,
  teacher_id,
  is_submitted,
  submitted_at,
  created_at,
  updated_at
)
SELECT
  als.student_id,
  als.subject_id,
  als.score,
  als.grade,
  als.points,
  als.term_id,
  t.academic_year_id,
  als.teacher_id,
  FALSE,
  NULL,
  COALESCE(als.created_at, NOW()),
  COALESCE(als.updated_at, NOW())
FROM alevel_scores als
JOIN terms t ON t.id = als.term_id
ON CONFLICT (student_id, subject_id, term_id, academic_year_id) DO NOTHING;
