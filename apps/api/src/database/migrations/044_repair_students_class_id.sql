-- Repair drift: ensure students.class_id exists (required by application code)
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id);

CREATE INDEX IF NOT EXISTS idx_students_class_id ON students (class_id);
