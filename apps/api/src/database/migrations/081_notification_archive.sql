-- Soft-archive notifications so users can hide items without losing audit history.

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_notifications_user_active_created
  ON notifications (tenant_id, user_id, created_at DESC)
  WHERE archived_at IS NULL;

DROP INDEX IF EXISTS idx_notifications_user_unread;
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications (tenant_id, user_id)
  WHERE read_at IS NULL AND archived_at IS NULL;
