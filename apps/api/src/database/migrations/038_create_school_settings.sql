CREATE TABLE IF NOT EXISTS school_settings (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton = TRUE),
  school_name VARCHAR(140) NOT NULL,
  motto VARCHAR(180),
  vision TEXT,
  mission TEXT,
  logo_url TEXT,
  contact_email VARCHAR(160),
  contact_phone VARCHAR(40),
  website_url TEXT,
  postal_address TEXT,
  physical_address TEXT,
  primary_color CHAR(7),
  secondary_color CHAR(7),
  report_footer_text VARCHAR(280),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO school_settings (
  singleton,
  school_name,
  motto,
  primary_color,
  secondary_color,
  report_footer_text
)
VALUES (
  TRUE,
  'Uganda CBC SMS School',
  'Learning with purpose',
  '#1D4ED8',
  '#0F172A',
  'This report is system-generated and valid without signature.'
)
ON CONFLICT (singleton) DO NOTHING;
