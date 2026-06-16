-- Optional production database roles (run as PostgreSQL superuser).
-- In development, the default DATABASE_URL user usually owns all tables and bypasses RLS when superuser.
--
-- After creating roles, set in .env:
--   DATABASE_URL=postgresql://school_app:...@host/db
--   PLATFORM_DATABASE_URL=postgresql://platform_app:...@host/db
--   DATABASE_URL_MIGRATE=postgresql://migration_admin:...@host/db

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'school_app') THEN
    CREATE ROLE school_app LOGIN PASSWORD 'change_me_school_app';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'platform_app') THEN
  BEGIN
    CREATE ROLE platform_app LOGIN PASSWORD 'change_me_platform_app' BYPASSRLS;
  EXCEPTION
    WHEN insufficient_privilege THEN
      CREATE ROLE platform_app LOGIN PASSWORD 'change_me_platform_app';
  END;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'migration_admin') THEN
  BEGIN
    CREATE ROLE migration_admin LOGIN PASSWORD 'change_me_migration' BYPASSRLS;
  EXCEPTION
    WHEN insufficient_privilege THEN
      CREATE ROLE migration_admin LOGIN PASSWORD 'change_me_migration';
  END;
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO school_app, platform_app, migration_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO school_app, platform_app, migration_admin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO school_app, platform_app, migration_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO school_app, platform_app, migration_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO school_app, platform_app, migration_admin;

-- Platform and migration need tenant/catalog access without RLS session
-- school_app is subject to RLS policies on tenant tables
