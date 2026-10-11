BEGIN;

CREATE TABLE IF NOT EXISTS superadmin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qadmin_id TEXT,
  qadmin_username TEXT NOT NULL,
  qadmin_name TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  entity_name TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON superadmin_audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON superadmin_audit_logs (entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON superadmin_audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_qadmin_username ON superadmin_audit_logs (qadmin_username);

COMMIT;
