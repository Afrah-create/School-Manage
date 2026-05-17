CREATE TABLE IF NOT EXISTS student_division_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  combination_id UUID REFERENCES subject_combinations(id) ON DELETE SET NULL,
  total_points INTEGER,
  division VARCHAR(20),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, term_id, academic_year_id)
);

INSERT INTO student_division_summary (
  student_id,
  term_id,
  academic_year_id,
  combination_id,
  total_points,
  division,
  updated_at
)
SELECT
  ar.student_id,
  ar.term_id,
  t.academic_year_id,
  s.combination_id,
  ar.total_points,
  CASE
    WHEN ar.division IN ('I', 'II', 'III', 'IV', 'Ungraded') THEN ar.division
    WHEN ar.division = 'Division I' THEN 'I'
    WHEN ar.division = 'Division II' THEN 'II'
    WHEN ar.division = 'Division III' THEN 'III'
    WHEN ar.division = 'Division IV' THEN 'IV'
    ELSE 'Ungraded'
  END,
  NOW()
FROM alevel_results ar
JOIN terms t ON t.id = ar.term_id
LEFT JOIN students s ON s.id = ar.student_id
ON CONFLICT (student_id, term_id, academic_year_id) DO UPDATE
SET
  combination_id = EXCLUDED.combination_id,
  total_points = EXCLUDED.total_points,
  division = EXCLUDED.division,
  updated_at = NOW();
