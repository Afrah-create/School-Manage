-- Per-paper compulsory/optional flags and per-student exam entries (who sits which paper).

ALTER TABLE exam_subjects
  ADD COLUMN IF NOT EXISTS is_compulsory BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS exam_student_entries (
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (exam_id, student_id, subject_id),
  CONSTRAINT exam_student_entries_paper_fk
    FOREIGN KEY (exam_id, subject_id)
    REFERENCES exam_subjects (exam_id, subject_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_exam_student_entries_exam_subject
  ON exam_student_entries (exam_id, subject_id);

CREATE INDEX IF NOT EXISTS idx_exam_student_entries_student
  ON exam_student_entries (exam_id, student_id);

-- Backfill: existing exams treat all class students as entered for every paper.
INSERT INTO exam_student_entries (exam_id, student_id, subject_id)
SELECT es.exam_id, st.id, es.subject_id
FROM exam_subjects es
JOIN exams e ON e.id = es.exam_id
JOIN students st ON st.class_id = e.class_id AND st.status = 'active'
ON CONFLICT DO NOTHING;
