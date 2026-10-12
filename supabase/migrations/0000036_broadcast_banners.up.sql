BEGIN;

CREATE TABLE IF NOT EXISTS platform_broadcast_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning', -- 'info', 'warning', 'critical'
  scope TEXT NOT NULL DEFAULT 'global', -- 'global', 'restaurant'
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  target_audience TEXT NOT NULL DEFAULT 'all', -- 'all', 'diners', 'staff'
  is_active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMP NOT NULL DEFAULT now(),
  expires_at TIMESTAMP,
  created_by TEXT NOT NULL DEFAULT 'qadmin',
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_broadcast_banners_active ON platform_broadcast_banners(is_active, starts_at, expires_at);
CREATE INDEX IF NOT EXISTS idx_broadcast_banners_rest ON platform_broadcast_banners(restaurant_id);

COMMIT;
