BEGIN;

-- 1. Global Plans & Default Features
CREATE TABLE IF NOT EXISTS superadmin_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_monthly NUMERIC NOT NULL DEFAULT 0,
  price_yearly NUMERIC NOT NULL DEFAULT 0,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  limits JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Default Plans
INSERT INTO superadmin_plans (id, name, price_monthly, price_yearly, features, limits, description)
VALUES 
  (
    'starter',
    'Starter Core',
    499,
    5499,
    '["digital_qr", "basic_analytics", "support_tickets"]'::jsonb,
    '{"max_tables": 10, "max_staff": 3}'::jsonb,
    'Essential digital menu and ordering for emerging cafes and single-counter outlets.'
  ),
  (
    'growth',
    'Growth Dining',
    999,
    10999,
    '["digital_qr", "basic_analytics", "support_tickets", "custom_discounts", "downtime_alerts"]'::jsonb,
    '{"max_tables": 30, "max_staff": 10}'::jsonb,
    'Advanced promotional campaigns and operational reliability for busy dining rooms.'
  ),
  (
    'pro',
    'Pro Flagship',
    1499,
    14999,
    '["digital_qr", "basic_analytics", "support_tickets", "custom_discounts", "downtime_alerts", "ar_menu_3d", "advanced_analytics", "unlimited_staff", "multi_branch", "custom_domain", "api_access"]'::jsonb,
    '{"max_tables": 9999, "max_staff": 9999}'::jsonb,
    'Full-suite powerhouse with 3D AR food models, multi-branch control, and custom domain access.'
  ),
  (
    'enterprise',
    'Enterprise Custom',
    4999,
    49999,
    '["digital_qr", "basic_analytics", "support_tickets", "custom_discounts", "downtime_alerts", "ar_menu_3d", "advanced_analytics", "unlimited_staff", "multi_branch", "custom_domain", "api_access", "priority_support"]'::jsonb,
    '{"max_tables": 99999, "max_staff": 99999}'::jsonb,
    'Bespoke infrastructure, dedicated SLAs, and tailored integrations for restaurant chains.'
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  features = EXCLUDED.features,
  limits = EXCLUDED.limits,
  description = EXCLUDED.description;

-- 2. Restaurant Feature Overrides & Plan Overrides
CREATE TABLE IF NOT EXISTS superadmin_restaurant_features (
  restaurant_id TEXT PRIMARY KEY,
  custom_plan TEXT REFERENCES superadmin_plans(id) ON DELETE SET NULL,
  feature_overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
  trial_ends_at TIMESTAMPTZ,
  notes TEXT,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_restaurant_features_updated_at ON superadmin_restaurant_features (updated_at DESC);

COMMIT;
