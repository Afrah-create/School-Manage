-- Best-effort backfill: legacy assessments_cbc_project → project_work_scores (numbered by created_at per term).

ALTER TABLE project_work_scores DISABLE ROW LEVEL SECURITY;

INSERT INTO project_work_scores (
  tenant_id, student_id, class_subject_id, term_id, project_number,
  score, max_score, scored_by, scored_at, notes, created_at, updated_at
)
SELECT DISTINCT ON (p.tenant_id, p.student_id, cs.id, p.term_id, p.rn)
  p.tenant_id,
  p.student_id,
  cs.id,
  p.term_id,
  p.rn::smallint,
  COALESCE(p.score, 0),
  COALESCE(p.max_score, 100),
  p.teacher_id,
  COALESCE(p.created_at, NOW()),
  p.assessment_title,
  COALESCE(p.created_at, NOW()),
  NOW()
FROM (
  SELECT
    leg.*,
    ROW_NUMBER() OVER (
      PARTITION BY leg.tenant_id, leg.student_id, leg.subject_id, leg.term_id
      ORDER BY leg.created_at, leg.id
    ) AS rn
  FROM assessments_cbc_project leg
  WHERE leg.score IS NOT NULL
) p
JOIN students st ON st.id = p.student_id
JOIN class_subjects cs
  ON cs.class_id = st.class_id
 AND cs.subject_id = p.subject_id
 AND cs.academic_year_id = p.academic_year_id
WHERE NOT EXISTS (
  SELECT 1 FROM project_work_scores pws
  WHERE pws.tenant_id = p.tenant_id
    AND pws.student_id = p.student_id
    AND pws.class_subject_id = cs.id
    AND pws.term_id = p.term_id
    AND pws.project_number = p.rn::smallint
)
ORDER BY p.tenant_id, p.student_id, cs.id, p.term_id, p.rn;

ALTER TABLE project_work_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_work_scores FORCE ROW LEVEL SECURITY;

UPDATE olevel_subject_results
SET ca_source = COALESCE(ca_source, 'strand_fallback'),
    formula_version = 'cbc_ca_v1'
WHERE ca_source IS NULL AND ca_score IS NOT NULL;
