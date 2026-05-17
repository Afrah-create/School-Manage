CREATE TABLE IF NOT EXISTS assessments_cbc (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  strand VARCHAR(255) NOT NULL,
  competency VARCHAR(255) NOT NULL,
  rating CHAR(1) CHECK (rating IN ('A','B','C','D')),
  term_id UUID NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  is_submitted BOOLEAN DEFAULT FALSE,
  submitted_at TIMESTAMPTZ,
  is_locked BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, subject_id, strand, competency, term_id, academic_year_id)
);

INSERT INTO assessments_cbc (
  student_id,
  subject_id,
  strand,
  competency,
  rating,
  term_id,
  academic_year_id,
  teacher_id,
  is_submitted,
  submitted_at,
  is_locked,
  created_at,
  updated_at
)
SELECT
  cs.student_id,
  cs.subject_id,
  COALESCE(st.name, st.strand_name, 'General') AS strand,
  cs.competency,
  cs.rating,
  cs.term_id,
  t.academic_year_id,
  cs.teacher_id,
  COALESCE(cs.submitted, FALSE),
  cs.submitted_at,
  COALESCE(cs.submitted, FALSE),
  COALESCE(cs.created_at, NOW()),
  COALESCE(cs.updated_at, NOW())
FROM cbc_scores cs
JOIN terms t ON t.id = cs.term_id
LEFT JOIN cbc_strands st ON st.id = cs.strand_id
ON CONFLICT (student_id, subject_id, strand, competency, term_id, academic_year_id) DO NOTHING;
