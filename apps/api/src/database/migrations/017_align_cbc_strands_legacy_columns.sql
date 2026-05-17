-- Align CBC strands schema across legacy and current deployments.
-- Ensures both the normalized fields and legacy fields exist so services can
-- read/write consistently regardless of migration history.

DO $$ BEGIN
  ALTER TABLE cbc_strands ADD COLUMN strand_name VARCHAR(100);
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE cbc_strands ADD COLUMN competencies JSONB;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

UPDATE cbc_strands
SET strand_name = COALESCE(strand_name, name)
WHERE strand_name IS NULL;

UPDATE cbc_strands
SET name = COALESCE(name, strand_name)
WHERE name IS NULL;

UPDATE cbc_strands
SET competencies = COALESCE(competencies, '[]'::jsonb)
WHERE competencies IS NULL;

ALTER TABLE cbc_strands
  ALTER COLUMN strand_name SET NOT NULL,
  ALTER COLUMN competencies SET DEFAULT '[]'::jsonb,
  ALTER COLUMN competencies SET NOT NULL;
