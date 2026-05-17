CREATE INDEX IF NOT EXISTS idx_assessments_cbc_student_term_year
  ON assessments_cbc (student_id, term_id, academic_year_id);

CREATE INDEX IF NOT EXISTS idx_assessments_cbc_project_student_term_year
  ON assessments_cbc_project (student_id, term_id, academic_year_id);

CREATE INDEX IF NOT EXISTS idx_assessment_comments_student_term_year
  ON assessment_comments (student_id, term_id, academic_year_id);

CREATE INDEX IF NOT EXISTS idx_assessments_alevel_student_term_year
  ON assessments_alevel (student_id, term_id, academic_year_id);

CREATE INDEX IF NOT EXISTS idx_student_division_summary_student_term_year
  ON student_division_summary (student_id, term_id, academic_year_id);

CREATE INDEX IF NOT EXISTS idx_assessment_alevel_comments_student_term_year
  ON assessment_alevel_comments (student_id, term_id, academic_year_id);
