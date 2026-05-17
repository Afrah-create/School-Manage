-- Many-to-many: teachers assigned to classes per academic year (homeroom + additional class teachers).

CREATE TABLE IF NOT EXISTS class_teacher_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  is_homeroom BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (class_id, teacher_id, academic_year_id)
);

CREATE INDEX IF NOT EXISTS idx_class_teacher_assignments_teacher
  ON class_teacher_assignments (teacher_id, academic_year_id);

CREATE INDEX IF NOT EXISTS idx_class_teacher_assignments_class
  ON class_teacher_assignments (class_id, academic_year_id);

-- Backfill homeroom assignments from legacy classes.class_teacher_id
INSERT INTO class_teacher_assignments (class_id, teacher_id, academic_year_id, is_homeroom)
SELECT c.id, c.class_teacher_id, c.academic_year_id, true
FROM classes c
WHERE c.class_teacher_id IS NOT NULL
  AND c.academic_year_id IS NOT NULL
ON CONFLICT (class_id, teacher_id, academic_year_id) DO UPDATE SET is_homeroom = true;
