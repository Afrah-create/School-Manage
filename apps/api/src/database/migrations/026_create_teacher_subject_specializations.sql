-- Teacher subject specializations (teachable subjects per teacher).
-- Empty specialization list means the teacher may be assigned any subject at matching level
-- until specializations are configured (common during onboarding).

CREATE TABLE IF NOT EXISTS teacher_subject_specializations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (teacher_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_teacher_subject_specializations_teacher
  ON teacher_subject_specializations (teacher_id);

CREATE INDEX IF NOT EXISTS idx_teacher_subject_specializations_subject
  ON teacher_subject_specializations (subject_id);
