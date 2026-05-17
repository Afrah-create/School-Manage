CREATE TABLE IF NOT EXISTS assessment_grading_scales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level VARCHAR(20) NOT NULL CHECK (level IN ('O_LEVEL', 'A_LEVEL')),
  grade VARCHAR(10) NOT NULL,
  min_score NUMERIC(5,2) NOT NULL CHECK (min_score >= 0 AND min_score <= 100),
  max_score NUMERIC(5,2) NOT NULL CHECK (max_score >= 0 AND max_score <= 100),
  points INTEGER NOT NULL CHECK (points >= 0),
  descriptor VARCHAR(255),
  sort_order INTEGER NOT NULL CHECK (sort_order >= 1),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(level, grade)
);

CREATE INDEX IF NOT EXISTS idx_assessment_grading_scales_level_active_sort
  ON assessment_grading_scales (level, is_active, sort_order);

INSERT INTO assessment_grading_scales (level, grade, min_score, max_score, points, descriptor, sort_order)
VALUES
  ('A_LEVEL', 'A', 80, 100, 1, 'Distinction', 1),
  ('A_LEVEL', 'B', 75, 79.99, 2, 'Very Good', 2),
  ('A_LEVEL', 'C', 65, 74.99, 3, 'Credit', 3),
  ('A_LEVEL', 'D', 60, 64.99, 4, 'Pass', 4),
  ('A_LEVEL', 'E', 55, 59.99, 5, 'Partial Pass', 5),
  ('A_LEVEL', 'O', 45, 54.99, 6, 'Ordinary', 6),
  ('A_LEVEL', 'F', 0, 44.99, 9, 'Fail', 7),
  ('O_LEVEL', 'A', 80, 100, 1, 'Excellent', 1),
  ('O_LEVEL', 'B', 75, 79.99, 2, 'Very Good', 2),
  ('O_LEVEL', 'C', 65, 74.99, 3, 'Good', 3),
  ('O_LEVEL', 'D', 60, 64.99, 4, 'Satisfactory', 4),
  ('O_LEVEL', 'E', 55, 59.99, 5, 'Pass', 5),
  ('O_LEVEL', 'O', 45, 54.99, 6, 'Ordinary', 6),
  ('O_LEVEL', 'F', 0, 44.99, 9, 'Fail', 7)
ON CONFLICT (level, grade) DO NOTHING;
