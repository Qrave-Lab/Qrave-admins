import { db } from "@/lib/db";
import { recordAuditLog } from "@/lib/audit";

export interface FeatureDefinition {
  key: string;
  name: string;
  description: string;
  category: "catalog" | "marketing" | "operations" | "platform";
}

export const ALL_FEATURES: FeatureDefinition[] = [
  {
    key: "digital_qr",
    name: "Digital QR Menu & Dine-in Ordering",
    description: "Interactive diner digital menu, allergen filters, and digital table ordering.",
    category: "catalog",
  },
  {
    key: "basic_analytics",
    name: "Standard Sales Analytics",
    description: "Daily revenue, orders count, table volume, and average ticket size.",
    category: "operations",
  },
  {
    key: "support_tickets",
    name: "Staff Feedback & Support Desk",
    description: "Direct in-app issue reporting and management ticket resolution.",
    category: "operations",
  },
  {
    key: "custom_discounts",
    name: "Promotional Coupons & Campaigns",
    description: "Percentage and flat discount campaigns, coupon codes, and redemption limits.",
    category: "marketing",
  },
  {
    key: "downtime_alerts",
    name: "Downtime Alerts & Incident Monitoring",
    description: "Automated offline signal alerts and downtime incident logging.",
    category: "operations",
  },
  {
    key: "ar_menu_3d",
    name: "3D Food AR Models (GLB Assets)",
    description: "Interactive 3D dish preview on diner smartphones in augmented reality.",
    category: "catalog",
  },
  {
    key: "advanced_analytics",
    name: "Advanced Velocity & Hourly Heatmaps",
    description: "Item velocity, peak hour seating heatmaps, and raw CSV data export.",
    category: "operations",
  },
  {
    key: "unlimited_staff",
    name: "Unlimited Staff & Waiter Accounts",
    description: "Removes default staff limits (3 on Starter, 10 on Growth).",
    category: "platform",
  },
  {
    key: "multi_branch",
    name: "Multi-Branch Brand Management",
    description: "Centralized brand administration, cross-location menu syncing, and multi-store reporting.",
    category: "platform",
  },
  {
    key: "custom_domain",
    name: "Custom Web Domain & White-Label Theme",
    description: "Point a bespoke restaurant domain and remove default platform branding.",
    category: "marketing",
  },
  {
    key: "api_access",
    name: "Webhooks & POS API Integrations",
    description: "Integrate third-party POS machines, accounting tools, and real-time order webhooks.",
    category: "platform",
  },
  {
    key: "priority_support",
    name: "Dedicated Account Manager & 24/7 SLA",
    description: "VIP priority support with guaranteed SLA response times.",
    category: "platform",
  },
];

export interface PlanRecord {
  id: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
  limits: Record<string, number>;
  description: string;
}

export function normalizePlanKey(raw: string | null | undefined): string {
  const plan = (raw || "").toLowerCase().trim();
  if (["monthly_1499", "yearly_14999", "pro", "1499", "1499_monthly", "1499_yearly"].includes(plan)) return "pro";
  if (["monthly_999", "yearly_10999", "growth", "999", "999_monthly", "999_yearly"].includes(plan)) return "growth";
  if (["enterprise", "custom"].includes(plan)) return "enterprise";
  return "starter";
}

export async function listAllPlans(): Promise<PlanRecord[]> {
  try {
    const { rows } = await db.query(
      `SELECT id, name, price_monthly, price_yearly, features, limits, description 
       FROM superadmin_plans 
       ORDER BY price_monthly ASC`
    );
    return rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      priceMonthly: Number(r.price_monthly),
      priceYearly: Number(r.price_yearly),
      features: Array.isArray(r.features) ? r.features : [],
      limits: typeof r.limits === "object" && r.limits !== null ? r.limits : {},
      description: r.description || "",
    }));
  } catch (err) {
    console.error("Failed to list plans:", err);
    return [];
  }
}

export interface RestaurantEffectiveFeatures {
  restaurantId: string;
  restaurantName: string;
  basePlanId: string;
  effectivePlanId: string;
  effectivePlanName: string;
  planFeatures: string[];
  overrides: Record<string, boolean>;
  effectiveFeatures: Record<string, boolean>;
  trialEndsAt: string | null;
  isTrialActive: boolean;
  notes: string | null;
}

export async function getRestaurantEffectiveFeatures(
  restaurantId: string
): Promise<RestaurantEffectiveFeatures | null> {
  try {
    const restRes = await db.query(
      `SELECT r.id, r.name, r.subscription_plan, 
              srf.custom_plan, srf.feature_overrides, srf.trial_ends_at, srf.notes
       FROM restaurants r
       LEFT JOIN superadmin_restaurant_features srf ON srf.restaurant_id = r.id
       WHERE r.id = $1`,
      [restaurantId]
    );

    if (restRes.rows.length === 0) return null;

    const row = restRes.rows[0];
    const basePlanId = normalizePlanKey(row.subscription_plan);
    const effectivePlanId = row.custom_plan ? normalizePlanKey(row.custom_plan) : basePlanId;

    const plans = await listAllPlans();
    const currentPlan = plans.find((p) => p.id === effectivePlanId) || plans.find((p) => p.id === "starter");
    const planFeatures: string[] = currentPlan ? currentPlan.features : [];

    const overrides: Record<string, boolean> =
      typeof row.feature_overrides === "object" && row.feature_overrides !== null
        ? row.feature_overrides
        : {};

    const trialEndsAt = row.trial_ends_at ? new Date(row.trial_ends_at).toISOString() : null;
    const isTrialActive = trialEndsAt ? new Date(trialEndsAt) > new Date() : false;

    // Calculate effective status for each known feature
    const effectiveFeatures: Record<string, boolean> = {};
    for (const feat of ALL_FEATURES) {
      if (typeof overrides[feat.key] === "boolean") {
        effectiveFeatures[feat.key] = overrides[feat.key];
      } else {
        effectiveFeatures[feat.key] = planFeatures.includes(feat.key);
      }
    }

    return {
      restaurantId: row.id,
      restaurantName: row.name,
      basePlanId,
      effectivePlanId,
      effectivePlanName: currentPlan?.name || effectivePlanId,
      planFeatures,
      overrides,
      effectiveFeatures,
      trialEndsAt,
      isTrialActive,
      notes: row.notes || null,
    };
  } catch (err) {
    console.error("Failed to get restaurant effective features:", err);
    return null;
  }
}

export interface UpdateRestaurantPlanParams {
  restaurantId: string;
  customPlan?: string | null;
  overrides?: Record<string, boolean>;
  trialEndsAt?: string | null;
  notes?: string | null;
  actorUsername?: string;
}

export async function updateRestaurantPlanAndFeatures(
  params: UpdateRestaurantPlanParams
): Promise<RestaurantEffectiveFeatures | null> {
  const { restaurantId, customPlan, overrides, trialEndsAt, notes, actorUsername } = params;

  // Retrieve current state for diff / audit
  const before = await getRestaurantEffectiveFeatures(restaurantId);
  if (!before) return null;

  const newCustomPlan = customPlan !== undefined ? customPlan : before.effectivePlanId;
  const newOverrides = overrides !== undefined ? overrides : before.overrides;
  const newTrialEndsAt = trialEndsAt !== undefined ? trialEndsAt : before.trialEndsAt;
  const newNotes = notes !== undefined ? notes : before.notes;

  // Upsert superadmin_restaurant_features
  await db.query(
    `INSERT INTO superadmin_restaurant_features
      (restaurant_id, custom_plan, feature_overrides, trial_ends_at, notes, updated_by, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (restaurant_id)
     DO UPDATE SET
       custom_plan = EXCLUDED.custom_plan,
       feature_overrides = EXCLUDED.feature_overrides,
       trial_ends_at = EXCLUDED.trial_ends_at,
       notes = EXCLUDED.notes,
       updated_by = EXCLUDED.updated_by,
       updated_at = NOW()`,
    [
      restaurantId,
      newCustomPlan || null,
      JSON.stringify(newOverrides || {}),
      newTrialEndsAt ? new Date(newTrialEndsAt) : null,
      newNotes || null,
      actorUsername || "superadmin",
    ]
  );

  // If a custom plan was set, synchronize it with restaurants.subscription_plan as well
  if (newCustomPlan) {
    await db.query(
      `UPDATE restaurants SET subscription_plan = $1 WHERE id = $2`,
      [newCustomPlan, restaurantId]
    );
  }

  const after = await getRestaurantEffectiveFeatures(restaurantId);

  // Record tamper-evident audit log
  await recordAuditLog({
    action: "PLAN_AND_FEATURES_UPDATE",
    entityType: "restaurant",
    entityId: restaurantId,
    entityName: before.restaurantName,
    details: {
      previous_plan: before.effectivePlanId,
      new_plan: after?.effectivePlanId,
      feature_overrides: newOverrides,
      trial_ends_at: newTrialEndsAt,
      is_trial_active: after?.isTrialActive,
      notes: newNotes,
    },
    actorUsername: actorUsername,
  });

  return after;
}

export async function listRestaurantsWithFeatureOverrides(): Promise<
  Array<{
    restaurantId: string;
    restaurantName: string;
    effectivePlanId: string;
    effectivePlanName: string;
    overridesCount: number;
    enabledOverrides: string[];
    trialEndsAt: string | null;
    isTrialActive: boolean;
    notes: string | null;
    updatedAt: string;
    updatedBy: string | null;
  }>
> {
  try {
    const { rows } = await db.query(`
      SELECT 
        r.id AS restaurant_id,
        r.name AS restaurant_name,
        COALESCE(srf.custom_plan, r.subscription_plan, 'starter') AS raw_plan,
        srf.feature_overrides,
        srf.trial_ends_at,
        srf.notes,
        srf.updated_at,
        srf.updated_by
      FROM superadmin_restaurant_features srf
      JOIN restaurants r ON r.id = srf.restaurant_id
      ORDER BY srf.updated_at DESC
    `);

    const plans = await listAllPlans();

    return rows.map((r: any) => {
      const planKey = normalizePlanKey(r.raw_plan);
      const planDef = plans.find((p) => p.id === planKey);
      const overrides: Record<string, boolean> =
        typeof r.feature_overrides === "object" && r.feature_overrides !== null
          ? r.feature_overrides
          : {};

      const enabledOverrides = Object.entries(overrides)
        .filter(([, v]) => v === true)
        .map(([k]) => k);

      const trialEnds = r.trial_ends_at ? new Date(r.trial_ends_at).toISOString() : null;
      const isTrialActive = trialEnds ? new Date(trialEnds) > new Date() : false;

      return {
        restaurantId: r.restaurant_id,
        restaurantName: r.restaurant_name,
        effectivePlanId: planKey,
        effectivePlanName: planDef?.name || planKey,
        overridesCount: Object.keys(overrides).length,
        enabledOverrides,
        trialEndsAt: trialEnds,
        isTrialActive,
        notes: r.notes || null,
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : "",
        updatedBy: r.updated_by || null,
      };
    });
  } catch (err) {
    console.error("Failed to list restaurants with feature overrides:", err);
    return [];
  }
}
