-- Allow the same subject code at O-Level and A-Level (separate catalogue rows per level).
DROP INDEX IF EXISTS subjects_tenant_code_uidx;

CREATE UNIQUE INDEX IF NOT EXISTS subjects_tenant_code_level_uidx
  ON subjects (tenant_id, code, level);

-- Cross-tenant catalogue repair: migration role may not bypass RLS on managed Postgres hosts.
ALTER TABLE subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE class_subjects DISABLE ROW LEVEL SECURITY;

-- Restore O-Level catalogue rows for codes shared with A-Level (previously overwritten).
INSERT INTO subjects (tenant_id, name, code, level)
SELECT t.id, v.name, v.code, 'O_LEVEL'
FROM tenants t
CROSS JOIN (
  VALUES
    ('Mathematics', 'MATH'),
    ('ICT', 'ICT'),
    ('Literature in English', 'LIT')
) AS v(name, code)
WHERE NOT EXISTS (
  SELECT 1 FROM subjects s
  WHERE s.tenant_id = t.id AND s.code = v.code AND s.level = 'O_LEVEL'
);

-- Point class–subject slots at the subject row matching the class level (same code).
UPDATE class_subjects cs
SET subject_id = s_ok.id,
    updated_at = NOW()
FROM classes c,
     subjects s_wrong,
     subjects s_ok
WHERE cs.class_id = c.id
  AND cs.subject_id = s_wrong.id
  AND s_ok.tenant_id = s_wrong.tenant_id
  AND s_ok.code = s_wrong.code
  AND s_ok.level = c.level
  AND c.level <> s_wrong.level;

ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects FORCE ROW LEVEL SECURITY;
ALTER TABLE class_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_subjects FORCE ROW LEVEL SECURITY;
