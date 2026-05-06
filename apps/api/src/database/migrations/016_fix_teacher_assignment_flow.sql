-- Teacher assignment flow: ensure uniqueness for class+subject+year and reporting view.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'class_subjects'::regclass
      AND conname = 'class_subjects_class_subject_year_unique'
  ) THEN
    ALTER TABLE class_subjects
      ADD CONSTRAINT class_subjects_class_subject_year_unique
      UNIQUE (class_id, subject_id, academic_year_id);
  END IF;
END $$;

CREATE OR REPLACE VIEW teacher_teaching_load AS
SELECT
  cs.id AS class_subject_id,
  cs.teacher_id,
  u.full_name AS teacher_name,
  u.role AS teacher_role,
  c.id AS class_id,
  c.name AS class_name,
  c.stream AS class_stream,
  s.id AS subject_id,
  s.name AS subject_name,
  t.id AS term_id,
  CASE WHEN t.id IS NULL THEN NULL ELSE ('Term ' || t.term_number::text) END AS term_name,
  ay.id AS academic_year_id,
  ay.name AS academic_year_label
FROM class_subjects cs
JOIN users u ON u.id = cs.teacher_id
JOIN classes c ON c.id = cs.class_id
JOIN subjects s ON s.id = cs.subject_id
LEFT JOIN terms t ON t.id = cs.term_id
JOIN academic_years ay ON ay.id = cs.academic_year_id;
