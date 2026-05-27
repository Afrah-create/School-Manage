CREATE TABLE IF NOT EXISTS attendance_registers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'locked')),
  recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (class_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_registers_class_date
  ON attendance_registers (class_id, date);

ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS register_id UUID REFERENCES attendance_registers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_attendance_class_date
  ON attendance (class_id, date);

CREATE INDEX IF NOT EXISTS idx_attendance_register_id
  ON attendance (register_id);

INSERT INTO attendance_registers (class_id, date, status, recorded_by, created_at, updated_at)
SELECT
  a.class_id,
  a.date,
  'submitted',
  (array_agg(a.recorded_by ORDER BY a.created_at DESC NULLS LAST) FILTER (WHERE a.recorded_by IS NOT NULL))[1]
    AS recorded_by,
  MIN(a.created_at) AS created_at,
  MAX(COALESCE(a.updated_at, a.created_at)) AS updated_at
FROM attendance a
GROUP BY a.class_id, a.date
ON CONFLICT (class_id, date) DO NOTHING;

UPDATE attendance a
SET register_id = ar.id
FROM attendance_registers ar
WHERE ar.class_id = a.class_id
  AND ar.date = a.date
  AND a.register_id IS NULL;
