import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

/* ── helpers ── */

function resolveRange(raw: string): { days: number; bucket: string; label: string } {
  switch ((raw || "").toLowerCase().trim()) {
    case "week": return { days: 7, bucket: "day", label: "week" };
    case "year": return { days: 365, bucket: "month", label: "year" };
    default: return { days: 30, bucket: "day", label: "month" };
  }
}

function normalisePlan(raw: string | null): string {
  const plan = (raw || "").toLowerCase().trim();
  if (["monthly_1499", "yearly_14999"].includes(plan)) return "pro";
  if (["monthly_999", "yearly_10999"].includes(plan)) return "growth";
  if (["monthly_499", "yearly_5500", "yearly_5499"].includes(plan)) return "starter";
  if (["pro", "1499", "1499_monthly", "1499_yearly"].includes(plan)) return "pro";
  if (["growth", "999", "999_monthly", "999_yearly"].includes(plan)) return "growth";
  return "starter";
}

function mrrFromSubscriptionPlan(raw: string | null): number {
  const plan = (raw || "").toLowerCase().trim();
  switch (plan) {
    case "monthly_1499":
    case "pro":
    case "1499":
    case "1499_monthly":
    case "1499_yearly":
      return 1499;
    case "monthly_999":
    case "growth":
    case "999":
    case "999_monthly":
    case "999_yearly":
      return 999;
    case "yearly_14999":
      return Math.round(14999 / 12);
    case "yearly_10999":
      return Math.round(10999 / 12);
    case "yearly_5500":
    case "yearly_5499":
      return Math.round(5500 / 12);
    case "monthly_499":
    case "starter":
    default:
      return 499;
  }
}

function resolvePackageExpirySQL() {
  return `
    CASE
      WHEN rest.subscription_status = 'trialing' THEN COALESCE(rest.trial_ends_at, rest.current_period_end, rest.grace_ends_at)
      WHEN rest.subscription_status IN ('active', 'past_due', 'halted') THEN COALESCE(rest.current_period_end, rest.grace_ends_at, rest.trial_ends_at)
      WHEN rest.subscription_status IN ('expired', 'canceled') THEN COALESCE(rest.grace_ends_at, rest.current_period_end, rest.trial_ends_at)
      ELSE COALESCE(rest.current_period_end, rest.trial_ends_at, rest.grace_ends_at)
    END
  `;
}

export { resolveRange };

/* ── list restaurants ── */

export async function listRestaurants(rangeDays: number) {
  const { rows } = await db.query(`
    SELECT
      rest.id,
      rest.name,
      COALESCE(rest.address, '')         AS location,
      COALESCE(owner.email,  '')         AS owner_email,
      rest.subscription_plan,
      COALESCE(rest.subscription_status, 'trialing') AS subscription_status,
      to_char(${resolvePackageExpirySQL()}, 'YYYY-MM-DD"T"HH24:MI:SS') AS package_expires_at,
      COALESCE(ctrl.status,
        CASE
          WHEN rest.subscription_status='trialing' THEN 'trial'
          WHEN rest.subscription_status='active'   THEN 'active'
          WHEN rest.subscription_status IN ('past_due','halted','expired','canceled') THEN 'churn-risk'
          ELSE 'trial'
        END
      ) AS resolved_status,
      COALESCE(ctrl.reason, '')          AS status_reason,
      COALESCE(today.revenue,0)::BIGINT  AS today_revenue,
      COALESCE(today.orders,0)::BIGINT   AS orders_today,
      COALESCE(win.revenue,0)::BIGINT    AS range_revenue,
      to_char(rest.created_at::date, 'YYYY-MM-DD') AS created_at
    FROM restaurants rest
    LEFT JOIN superadmin_restaurant_controls ctrl ON ctrl.restaurant_id = rest.id
    LEFT JOIN LATERAL (
      SELECT u.email
      FROM restaurant_users ru
      JOIN users u ON u.id = ru.user_id
      WHERE ru.restaurant_id = rest.id AND ru.role = 'owner'
      ORDER BY ru.created_at ASC
      LIMIT 1
    ) owner ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        COALESCE(ROUND(SUM(p.amount))::BIGINT, 0) AS revenue,
        COALESCE(COUNT(DISTINCT p.order_id), 0)    AS orders
      FROM payments p
      WHERE p.restaurant_id = rest.id
        AND p.status = 'paid'
        AND COALESCE(p.captured_at, p.created_at)::date = CURRENT_DATE
    ) today ON TRUE
    LEFT JOIN LATERAL (
      SELECT COALESCE(ROUND(SUM(p.amount))::BIGINT, 0) AS revenue
      FROM payments p
      WHERE p.restaurant_id = rest.id
        AND p.status = 'paid'
        AND COALESCE(p.captured_at, p.created_at) >= (NOW() - make_interval(days => $1))
    ) win ON TRUE
    WHERE COALESCE(rest.is_archived, FALSE) = FALSE
    ORDER BY win.revenue DESC, rest.created_at DESC
  `, [rangeDays]);

  return rows.map((r: any) => {
    const plan = normalisePlan(r.subscription_plan);
    const subscriptionStatus = String(r.subscription_status || "trialing");
    return {
      id: r.id,
      brandName: r.name,
      locationName: r.location,
      ownerEmail: r.owner_email,
      plan,
      status: r.resolved_status,
      statusReason: r.status_reason,
      mrr: subscriptionStatus === "active" ? mrrFromSubscriptionPlan(r.subscription_plan) : 0,
      billingStatus: subscriptionStatus,
      todayRevenue: Number(r.today_revenue),
      ordersToday: Number(r.orders_today),
      createdAt: r.created_at,
      totalRevenueRange: Number(r.range_revenue),
      memberSince: r.created_at,
      packageExpiresAt: r.package_expires_at,
    };
  });
}

/* ── overview ── */

export async function getOverview(rangeRaw: string) {
  const { days, label } = resolveRange(rangeRaw);
  const restaurants = await listRestaurants(days);

  let activeRestaurants = 0, trialRestaurants = 0, mrr = 0,
    gmVToday = 0, ordersToday = 0, totalRevenueRange = 0;

  for (const r of restaurants) {
    if (r.status === "active") activeRestaurants++;
    if (r.status === "trial") trialRestaurants++;
    mrr += r.mrr;

    gmVToday += r.todayRevenue;
    ordersToday += r.ordersToday;
    totalRevenueRange += r.totalRevenueRange;
  }

  return {
    totalRestaurants: restaurants.length,
    activeRestaurants,
    trialRestaurants,
    mrr,
    gmVToday,
    ordersToday,
    totalRevenueRange,
    range: label,
  };
}

/* ── revenue series ── */

export async function listRevenueSeries(rangeDays: number, bucket: string, restaurantId?: string) {
  const trunc = bucket === "month" ? "month" : "day";
  const format = bucket === "month" ? "Mon YY" : "DD Mon";

  let query = `
    SELECT
      to_char(date_trunc('${trunc}', COALESCE(p.captured_at, p.created_at)), '${format}') AS bucket,
      COALESCE(ROUND(SUM(p.amount))::BIGINT, 0)           AS revenue,
      COALESCE(COUNT(DISTINCT p.order_id), 0)::BIGINT      AS orders
    FROM payments p
    WHERE p.status = 'paid'
      AND COALESCE(p.captured_at, p.created_at) >= (NOW() - make_interval(days => $1))
  `;

  const args: any[] = [rangeDays];
  if (restaurantId) {
    query += ` AND p.restaurant_id = $2`;
    args.push(restaurantId);
  }
  query += ` GROUP BY 1 ORDER BY MIN(COALESCE(p.captured_at, p.created_at)) ASC`;

  const { rows } = await db.query(query, args);
  return rows.map((r: any) => ({
    date: r.bucket,
    revenue: Number(r.revenue),
    orders: Number(r.orders),
  }));
}

/* ── top items ── */

export async function listTopItems(rangeDays: number) {
  const { rows } = await db.query(`
    SELECT
      COALESCE(mi.name, 'Unknown Item') AS item_name,
      COALESCE(SUM(oi.quantity), 0)::BIGINT AS item_orders,
      COALESCE(SUM(oi.quantity * oi.price), 0)::BIGINT AS revenue
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    LEFT JOIN menu_items mi ON mi.id = oi.menu_item_id
    WHERE EXISTS (
      SELECT 1
      FROM payments p
      WHERE p.order_id = o.id
        AND p.status = 'paid'
        AND COALESCE(p.captured_at, p.created_at) >= (NOW() - make_interval(days => $1))
    )
    GROUP BY item_name
    ORDER BY revenue DESC
    LIMIT 10
  `, [rangeDays]);

  return rows.map((r: any) => ({
    name: r.item_name,
    orders: Number(r.item_orders),
    revenue: Number(r.revenue),
  }));
}

/* ── restaurant detail ── */

export async function getRestaurantDetail(restaurantId: string, rangeRaw: string) {
  const { days, bucket, label } = resolveRange(rangeRaw);
  const restaurants = await listRestaurants(days);
  const selected = restaurants.find((r: any) => r.id === restaurantId);
  if (!selected) return null;

  const lifetimeRes = await db.query(`
    SELECT
      COALESCE(ROUND(SUM(p.amount))::BIGINT, 0) AS revenue,
      COALESCE(COUNT(DISTINCT p.order_id), 0)::BIGINT AS orders
    FROM payments p
    WHERE p.restaurant_id = $1 AND p.status = 'paid'
  `, [restaurantId]);

  const series = await listRevenueSeries(days, bucket, restaurantId);
  const paymentHistory = await listPaymentHistory(restaurantId);

  return {
    restaurant: selected,
    totalRevenueLifetime: Number(lifetimeRes.rows[0]?.revenue || 0),
    totalOrdersLifetime: Number(lifetimeRes.rows[0]?.orders || 0),
    range: label,
    revenueSeries: series,
    paymentHistory,
  };
}

export async function listPaymentHistory(restaurantId: string) {
  const { rows } = await db.query(`
    SELECT
      pse.id,
      pse.order_id,
      pse.takeaway_order_id,
      CASE WHEN pse.order_id IS NOT NULL THEN 'order' ELSE 'takeaway' END AS payment_type,
      pse.old_status,
      pse.new_status,
      pse.payment_mode,
      pse.amount::float8 AS amount,
      COALESCE(pse.reason, '') AS reason,
      COALESCE(u.name, u.email, pse.actor_role, 'system') AS actor_name,
      COALESCE(pse.actor_role, '') AS actor_role,
      to_char(pse.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at
    FROM payment_status_events pse
    LEFT JOIN users u ON u.id = pse.actor_user_id
    WHERE pse.restaurant_id = $1
    ORDER BY pse.created_at DESC
    LIMIT 500
  `, [restaurantId]);

  return rows.map((row: any) => ({
    id: row.id,
    orderId: row.order_id,
    takeawayOrderId: row.takeaway_order_id,
    paymentType: row.payment_type,
    oldStatus: row.old_status,
    newStatus: row.new_status,
    paymentMode: row.payment_mode,
    amount: row.amount === null ? null : Number(row.amount),
    reason: row.reason || null,
    actorName: row.actor_name,
    actorRole: row.actor_role || null,
    createdAt: row.created_at,
  }));
}

/* ── restaurant users ── */

export async function listRestaurantUsers(restaurantId: string) {
  const { rows } = await db.query(`
    SELECT
      u.id,
      u.email,
      ru.role,
      COALESCE(suc.status, 'active') AS status
    FROM restaurant_users ru
    JOIN users u ON u.id = ru.user_id
    LEFT JOIN superadmin_user_controls suc ON suc.restaurant_id = ru.restaurant_id AND suc.user_id = ru.user_id
    WHERE ru.restaurant_id = $1
      AND COALESCE(u.is_archived, FALSE) = FALSE
    ORDER BY ru.created_at ASC
  `, [restaurantId]);

  return rows.map((r: any) => {
    let name = r.email;
    const atIdx = name.indexOf("@");
    if (atIdx > 0) name = name.substring(0, atIdx);
    name = name.replace(/\./g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
    return { id: r.id, name, email: r.email, role: r.role, status: r.status };
  });
}

/* ── set restaurant status ── */

export async function setRestaurantStatus(restaurantId: string, status: string, reason: string, updatedBy: string) {
  await db.query(`
    INSERT INTO superadmin_restaurant_controls (restaurant_id, status, reason, updated_by, updated_at)
    VALUES ($1, $2, $3, $4, NOW())
    ON CONFLICT (restaurant_id)
    DO UPDATE SET status = EXCLUDED.status, reason = EXCLUDED.reason, updated_by = EXCLUDED.updated_by, updated_at = NOW()
  `, [restaurantId, status, reason, updatedBy]);
}

export async function extendRestaurantSubscriptionDays(restaurantId: string, extraDays: number) {
  const days = Math.trunc(Number(extraDays));
  if (!Number.isFinite(days) || days < 1 || days > 3650) {
    throw new Error("invalid extraDays");
  }

  const { rows } = await db.query(`
    UPDATE restaurants AS rest
    SET
      trial_ends_at = CASE
        WHEN rest.subscription_status = 'trialing'
          THEN GREATEST(COALESCE(rest.trial_ends_at, NOW()), NOW()) + make_interval(days => $2)
        ELSE rest.trial_ends_at
      END,
      current_period_end = CASE
        WHEN rest.subscription_status IN ('active', 'past_due', 'halted')
          THEN GREATEST(COALESCE(rest.current_period_end, NOW()), NOW()) + make_interval(days => $2)
        WHEN rest.subscription_status NOT IN ('trialing', 'expired', 'canceled')
          AND rest.trial_ends_at IS NULL
          AND rest.grace_ends_at IS NULL
          THEN GREATEST(COALESCE(rest.current_period_end, NOW()), NOW()) + make_interval(days => $2)
        ELSE rest.current_period_end
      END,
      grace_ends_at = CASE
        WHEN rest.subscription_status IN ('expired', 'canceled')
          THEN GREATEST(COALESCE(rest.grace_ends_at, NOW()), NOW()) + make_interval(days => $2)
        ELSE rest.grace_ends_at
      END,
      billing_updated_at = NOW()
    WHERE rest.id = $1
    RETURNING to_char(${resolvePackageExpirySQL()}, 'YYYY-MM-DD"T"HH24:MI:SS') AS package_expires_at
  `, [restaurantId, days]);

  if (rows.length === 0) return null;

  return {
    packageExpiresAt: rows[0].package_expires_at as string | null,
  };
}

/* ── set user status ── */

export async function setRestaurantUserStatus(restaurantId: string, userId: string, status: string, reason: string, updatedBy: string) {
  const check = await db.query(`SELECT 1 FROM restaurant_users WHERE restaurant_id = $1 AND user_id = $2`, [restaurantId, userId]);
  if (check.rows.length === 0) return null;
  await db.query(`
    INSERT INTO superadmin_user_controls (restaurant_id, user_id, status, reason, updated_by, updated_at)
    VALUES ($1, $2, $3, $4, $5, NOW())
    ON CONFLICT (restaurant_id, user_id)
    DO UPDATE SET status = EXCLUDED.status, reason = EXCLUDED.reason, updated_by = EXCLUDED.updated_by, updated_at = NOW()
  `, [restaurantId, userId, status, reason, updatedBy]);
  return true;
}

/* ── feedback ── */

export async function listFeedback(restaurantId: string) {
  const { rows } = await db.query(`
    SELECT id, rating, COALESCE(comment, '') AS comment, to_char(created_at, 'YYYY-MM-DD') AS created_at, source
    FROM restaurant_feedback_events
    WHERE restaurant_id = $1
    ORDER BY created_at DESC
    LIMIT 200
  `, [restaurantId]);
  return rows.map((r: any) => ({ id: r.id, rating: r.rating, comment: r.comment, createdAt: r.created_at, source: r.source }));
}

export async function listStaffFeedback(restaurantId: string) {
    const { rows } = await db.query(`
        SELECT 
            sf.id,
            sf.type,
            sf.priority,
            sf.title,
            sf.description,
            sf.status,
            to_char(sf.created_at, 'YYYY-MM-DD') AS created_at,
            sf.user_role,
            COALESCE(sf.admin_response, '') AS admin_response,
            to_char(sf.admin_responded_at, 'YYYY-MM-DD') AS admin_responded_at,
            u.name as user_name
        FROM staff_feedback sf
        LEFT JOIN users u ON sf.user_id = u.id
        WHERE sf.restaurant_id = $1
        ORDER BY sf.created_at DESC
    `, [restaurantId]);
    return rows;
}

export async function updateStaffFeedback(id: string, status: string, response: string, responderEmail: string) {
    // Basic validation
    if (!['open', 'acknowledged', 'resolved', 'wont_fix'].includes(status)) {
        throw new Error("Invalid status");
    }

    await db.query(`
        UPDATE staff_feedback 
        SET status = $1, 
            admin_response = $2,
            admin_responded_at = NOW(),
            admin_responded_by = $4,
            resolved_at = CASE WHEN $1 = 'resolved' THEN NOW() ELSE resolved_at END
        WHERE id = $3
    `, [status, response, id, responderEmail]);
}

export async function listGlobalFeedback(limit: number = 200) {
  const { rows } = await db.query(`
    SELECT 
      f.id, 
      f.rating, 
      COALESCE(f.comment, '') AS comment, 
      to_char(f.created_at, 'YYYY-MM-DD') AS created_at, 
      f.source,
      r.name as restaurant_name
    FROM restaurant_feedback_events f
    LEFT JOIN restaurants r ON r.id = f.restaurant_id
    ORDER BY f.created_at DESC
    LIMIT $1
  `, [limit]);
  return rows.map((r: any) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.created_at,
    source: r.source,
    restaurantName: r.restaurant_name
  }));
}

/* ── downtimes ── */

export async function listDowntimes(restaurantId: string) {
  const { rows } = await db.query(`
    SELECT
      id,
      to_char(started_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS started_at,
      to_char(ended_at,   'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS ended_at,
      downtime_minutes,
      COALESCE(reason, '') AS reason,
      severity
    FROM restaurant_downtime_events
    WHERE restaurant_id = $1
    ORDER BY started_at DESC
    LIMIT 200
  `, [restaurantId]);
  return rows.map((r: any) => ({
    id: r.id, startedAt: r.started_at, endedAt: r.ended_at,
    minutes: r.downtime_minutes, reason: r.reason, severity: r.severity,
  }));
}

/* ── coupon analytics ── */

export async function listCouponCampaigns() {
  const { rows } = await db.query(`
    SELECT
      oc.id,
      oc.name,
      COALESCE(oc.coupon_code, '') AS coupon_code,
      COALESCE(oc.discount_kind, '') AS discount_kind,
      COALESCE(oc.discount_value, 0)::float8 AS discount_value,
      COALESCE(oc.is_active, TRUE) AS is_active,
      oc.restaurant_id,
      COALESCE(r.name, '') AS restaurant_name
    FROM offer_campaigns oc
    LEFT JOIN restaurants r ON r.id = oc.restaurant_id
    WHERE oc.requires_coupon = TRUE
    ORDER BY oc.updated_at DESC
  `);
  return rows.map((r: any) => ({
    id: r.id,
    name: r.name,
    couponCode: r.coupon_code,
    discountKind: r.discount_kind,
    discountValue: Number(r.discount_value || 0),
    isActive: Boolean(r.is_active),
    restaurantID: r.restaurant_id,
    restaurantName: r.restaurant_name,
  }));
}

export async function createCouponCampaign(input: {
  restaurantId: string;
  name: string;
  couponCode: string;
  discountKind: "percent" | "fixed" | "fixed_price";
  discountValue: number;
  startsAt?: string | null;
  endsAt?: string | null;
  maxRedemptions?: number | null;
}) {
  const code = input.couponCode.trim();
  const name = input.name.trim();
  const discountValue = Number(input.discountValue);
  const maxRedemptions = input.maxRedemptions == null ? null : Math.trunc(Number(input.maxRedemptions));
  const restaurantRes = await db.query(`SELECT name FROM restaurants WHERE id = $1`, [input.restaurantId]);

  if (!name) throw new Error("coupon name required");
  if (!code) throw new Error("coupon code required");
  if (!Number.isFinite(discountValue) || discountValue <= 0) throw new Error("discount value must be greater than 0");

  const { rows } = await db.query(`
    INSERT INTO offer_campaigns (
      restaurant_id,
      name,
      scope,
      discount_kind,
      discount_value,
      requires_coupon,
      coupon_code,
      is_active,
      starts_at,
      ends_at,
      max_redemptions,
      updated_at
    ) VALUES ($1, $2, 'full_menu', $3, $4, TRUE, $5, TRUE, $6, $7, $8, NOW())
    RETURNING
      id,
      name,
      coupon_code,
      discount_kind,
      discount_value::float8 AS discount_value,
      is_active,
      restaurant_id
  `, [
    input.restaurantId,
    name,
    input.discountKind,
    discountValue,
    code,
    input.startsAt || null,
    input.endsAt || null,
    maxRedemptions,
  ]);

  return {
    id: rows[0].id,
    name: rows[0].name,
    couponCode: rows[0].coupon_code,
    discountKind: rows[0].discount_kind,
    discountValue: Number(rows[0].discount_value || 0),
    isActive: Boolean(rows[0].is_active),
    restaurantID: rows[0].restaurant_id,
    restaurantName: String(restaurantRes.rows[0]?.name || ""),
  };
}

export async function listCouponRedemptions(campaignID?: string) {
  const args: any[] = [];
  let where = "";
  if (campaignID) {
    where = "WHERE cr.campaign_id = $1";
    args.push(campaignID);
  }

  const { rows } = await db.query(`
    SELECT
      cr.id,
      cr.campaign_id,
      cr.order_id,
      cr.restaurant_id,
      cr.code_used,
      cr.discount_amount::float8 AS discount_amount,
      to_char(cr.redeemed_at, 'YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"') AS redeemed_at,
      COALESCE(r.name, '') AS restaurant_name,
      COALESCE(oc.name, '') AS campaign_name,
      COALESCE(o.status, '') AS order_status
    FROM offer_coupon_redemptions cr
    LEFT JOIN restaurants r ON r.id = cr.restaurant_id
    LEFT JOIN offer_campaigns oc ON oc.id = cr.campaign_id
    LEFT JOIN orders o ON o.id = cr.order_id
    ${where} ${where ? "AND" : "WHERE"} COALESCE(o.status, '') = 'completed'
    ORDER BY cr.redeemed_at DESC
    LIMIT 500
  `, args);

  return rows.map((r: any) => ({
    id: r.id,
    campaignID: r.campaign_id,
    campaignName: r.campaign_name,
    orderID: r.order_id,
    restaurantID: r.restaurant_id,
    restaurantName: r.restaurant_name,
    codeUsed: r.code_used,
    discountAmount: Number(r.discount_amount || 0),
    redeemedAt: r.redeemed_at,
    orderStatus: r.order_status,
  }));
}

/* ── create restaurant ── */

export async function createRestaurantWithOwner(input: {
  brandName: string;
  locationName: string;
  currency: string;
  plan: string;
  ownerEmail: string;
  ownerPassword: string;
  initialTables: number;
}) {
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const hash = await bcrypt.hash(input.ownerPassword, 10);
    const userRes = await client.query(
      `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id`,
      [input.ownerEmail.trim().toLowerCase(), hash],
    );
    const userID = userRes.rows[0].id;

    const restaurantName = input.locationName.trim()
      ? `${input.brandName.trim()} - ${input.locationName.trim()}`
      : input.brandName.trim();

    const restRes = await client.query(
      `INSERT INTO restaurants (
        name, currency, address, subscription_plan, subscription_status, billing_provider,
        trial_started_at, trial_ends_at, billing_updated_at
      ) VALUES ($1, $2, $3, $4, 'trialing', 'razorpay', now(), now() + interval '7 days', now())
      RETURNING id`,
      [
        restaurantName,
        (input.currency || "INR").trim().toUpperCase(),
        input.locationName.trim() || null,
        (input.plan || "monthly_499").trim().toLowerCase(),
      ],
    );
    const restaurantID = restRes.rows[0].id;

    await client.query(
      `INSERT INTO restaurant_users (restaurant_id, user_id, role) VALUES ($1, $2, 'owner')`,
      [restaurantID, userID],
    );

    const tableCount = Math.min(Math.max(Number(input.initialTables) || 8, 1), 200);
    await client.query(
      `INSERT INTO restaurant_tables (restaurant_id, table_number)
       SELECT $1, gs FROM generate_series(1, $2) AS gs`,
      [restaurantID, tableCount],
    );

    await client.query(
      `INSERT INTO menu_categories (restaurant_id, name) VALUES
        ($1, 'Food'), ($1, 'Beverages'), ($1, 'Desserts')
      ON CONFLICT (restaurant_id, name) DO NOTHING`,
      [restaurantID],
    );

    await client.query("COMMIT");
    return { id: restaurantID };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function listRestaurantOptions() {
  const { rows } = await db.query(`
    SELECT id, name
    FROM restaurants
    WHERE COALESCE(is_archived, FALSE) = FALSE
    ORDER BY name ASC
  `);

  return rows.map((row: any) => ({
    id: row.id,
    name: row.name,
  }));
}

export async function listMenuCategoriesForRestaurant(restaurantId: string) {
  const { rows } = await db.query(`
    SELECT id, name
    FROM menu_categories
    WHERE restaurant_id = $1
    ORDER BY name ASC
  `, [restaurantId]);

  return rows.map((row: any) => ({
    id: row.id,
    name: row.name,
  }));
}

export async function listMenuItemsForRestaurant(restaurantId: string) {
  const { rows } = await db.query(`
    SELECT
      mi.id,
      mi.restaurant_id,
      mi.category_id,
      COALESCE(mc.name, 'Uncategorized') AS category_name,
      mi.name,
      COALESCE(mi.description, '') AS description,
      mi.price,
      COALESCE(mi.is_veg, TRUE) AS is_veg,
      COALESCE(mi.is_available, TRUE) AS is_available,
      COALESCE(mi.image_url, '') AS image_url,
      COALESCE(mi.model_glb, '') AS model_glb,
      to_char(mi.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at
    FROM menu_items mi
    LEFT JOIN menu_categories mc ON mc.id = mi.category_id
    WHERE mi.restaurant_id = $1
    ORDER BY mi.created_at DESC, mi.name ASC
  `, [restaurantId]);

  return rows.map((row: any) => ({
    id: row.id,
    restaurantId: row.restaurant_id,
    categoryId: row.category_id,
    categoryName: row.category_name,
    name: row.name,
    description: row.description,
    price: Number(row.price || 0),
    isVeg: Boolean(row.is_veg),
    isAvailable: Boolean(row.is_available),
    imageUrl: row.image_url,
    modelGlb: row.model_glb,
    createdAt: row.created_at,
  }));
}

export async function listStaffForRestaurant(restaurantId: string) {
  const { rows } = await db.query(`
    SELECT
      u.id,
      ru.restaurant_id,
      COALESCE(u.name, split_part(u.email, '@', 1)) AS name,
      u.email,
      COALESCE(u.phone, '') AS phone,
      ru.role,
      COALESCE(suc.status, 'active') AS status,
      to_char(ru.created_at, 'YYYY-MM-DD') AS joined_at
    FROM restaurant_users ru
    JOIN users u ON u.id = ru.user_id
    LEFT JOIN superadmin_user_controls suc
      ON suc.restaurant_id = ru.restaurant_id AND suc.user_id = ru.user_id
    WHERE ru.restaurant_id = $1
      AND COALESCE(u.is_archived, FALSE) = FALSE
    ORDER BY ru.created_at ASC
  `, [restaurantId]);

  return rows.map((row: any) => ({
    id: row.id,
    restaurantId: row.restaurant_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    status: row.status,
    joinedAt: row.joined_at,
  }));
}

export async function listQAdminUsers() {
  const { rows } = await db.query(`
    SELECT
      id,
      username,
      to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at
    FROM superadmin_users
    UNION ALL
    SELECT
      id,
      email AS username,
      to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at
    FROM qrave_admins
    ORDER BY created_at DESC
  `);

  return rows.map((row: any) => ({
    id: row.id,
    username: row.username,
    createdAt: row.created_at,
  }));
}

export async function listPlatformOperations() {
  const [
    restaurants,
    qadmins,
    ticketRows,
    downtimeRows,
    paymentRows,
    orderRows,
    takeawayRows,
    coupons,
    globalDiscounts,
    summaryRes,
  ] = await Promise.all([
    listRestaurantOptions(),
    listQAdminUsers(),
    db.query(`
      SELECT
        sf.id,
        sf.restaurant_id,
        COALESCE(r.name, '') AS restaurant_name,
        sf.title,
        sf.description,
        sf.type,
        sf.priority,
        sf.status,
        COALESCE(u.name, split_part(u.email, '@', 1), 'Unknown') AS user_name,
        COALESCE(sf.user_role, '') AS user_role,
        COALESCE(sf.admin_response, '') AS admin_response,
        to_char(sf.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at,
        CASE
          WHEN sf.admin_responded_at IS NULL THEN NULL
          ELSE to_char(sf.admin_responded_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
        END AS responded_at
      FROM staff_feedback sf
      LEFT JOIN restaurants r ON r.id = sf.restaurant_id
      LEFT JOIN users u ON u.id = sf.user_id
      ORDER BY sf.created_at DESC
      LIMIT 200
    `),
    db.query(`
      SELECT
        de.id,
        de.restaurant_id,
        COALESCE(r.name, '') AS restaurant_name,
        COALESCE(de.reason, '') AS reason,
        de.severity,
        COALESCE(de.downtime_minutes, 0) AS minutes,
        to_char(de.started_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS started_at,
        to_char(de.ended_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS ended_at,
        to_char(de.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at
      FROM restaurant_downtime_events de
      LEFT JOIN restaurants r ON r.id = de.restaurant_id
      ORDER BY de.created_at DESC
      LIMIT 200
    `),
    db.query(`
      SELECT
        p.id,
        p.order_id,
        p.restaurant_id,
        COALESCE(r.name, '') AS restaurant_name,
        p.amount::float8 AS amount,
        COALESCE(p.mode, '') AS mode,
        COALESCE(p.status, '') AS status,
        to_char(p.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at,
        CASE
          WHEN p.captured_at IS NULL THEN NULL
          ELSE to_char(p.captured_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
        END AS captured_at
      FROM payments p
      LEFT JOIN restaurants r ON r.id = p.restaurant_id
      ORDER BY COALESCE(p.captured_at, p.created_at) DESC
      LIMIT 200
    `),
    db.query(`
      SELECT
        o.id,
        o.restaurant_id,
        COALESCE(r.name, '') AS restaurant_name,
        o.session_id,
        COALESCE(o.status, '') AS status,
        COALESCE(SUM(oi.quantity), 0)::int AS total_items,
        COALESCE(SUM(oi.quantity * oi.price), 0)::float8 AS subtotal,
        to_char(o.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at
      FROM orders o
      LEFT JOIN restaurants r ON r.id = o.restaurant_id
      LEFT JOIN order_items oi ON oi.order_id = o.id
      GROUP BY o.id, r.name
      ORDER BY o.created_at DESC
      LIMIT 200
    `),
    db.query(`
      SELECT
        t.id,
        t.restaurant_id,
        COALESCE(r.name, '') AS restaurant_name,
        t.order_type,
        t.status,
        COALESCE(t.customer_name, '') AS customer_name,
        t.total::float8 AS total,
        COALESCE(t.payment_mode, '') AS payment_mode,
        to_char(t.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at
      FROM takeaway_orders t
      LEFT JOIN restaurants r ON r.id = t.restaurant_id
      ORDER BY t.created_at DESC
      LIMIT 200
    `),
    listCouponCampaigns(),
    listGlobalDiscounts(),
    db.query(`
      SELECT
        (SELECT COUNT(1) FROM restaurants WHERE COALESCE(is_archived, FALSE) = FALSE) AS restaurant_count,
        (SELECT COUNT(1) FROM menu_items) AS menu_item_count,
        (SELECT COUNT(1) FROM restaurant_users) AS staff_count,
        (SELECT COUNT(1) FROM staff_feedback WHERE status IN ('open', 'acknowledged')) AS open_tickets,
        (SELECT COUNT(1) FROM payments WHERE status = 'paid' AND COALESCE(captured_at, created_at)::date = CURRENT_DATE) AS paid_payments_today,
        (SELECT COALESCE(SUM(amount), 0)::float8 FROM payments WHERE status = 'paid' AND COALESCE(captured_at, created_at)::date = CURRENT_DATE) AS payment_volume_today,
        (SELECT COUNT(1) FROM offer_campaigns WHERE is_active = TRUE) AS active_coupons,
        (SELECT COUNT(1) FROM superadmin_global_discounts WHERE is_active = TRUE) AS active_global_discounts,
        (SELECT COUNT(1) FROM orders WHERE created_at::date = CURRENT_DATE) AS today_orders,
        (SELECT COUNT(1) FROM takeaway_orders WHERE created_at::date = CURRENT_DATE) AS today_takeaway_orders
    `),
  ]);

  const summary = summaryRes.rows[0] || {};

  return {
    summary: {
      restaurantCount: Number(summary.restaurant_count || 0),
      menuItemCount: Number(summary.menu_item_count || 0),
      staffCount: Number(summary.staff_count || 0),
      openTickets: Number(summary.open_tickets || 0),
      paidPaymentsToday: Number(summary.paid_payments_today || 0),
      paymentVolumeToday: Number(summary.payment_volume_today || 0),
      activeCoupons: Number(summary.active_coupons || 0),
      activeGlobalDiscounts: Number(summary.active_global_discounts || 0),
      todayOrders: Number(summary.today_orders || 0),
      todayTakeawayOrders: Number(summary.today_takeaway_orders || 0),
    },
    restaurants,
    payments: paymentRows.rows.map((row: any) => ({
      id: row.id,
      orderId: row.order_id,
      restaurantId: row.restaurant_id,
      restaurantName: row.restaurant_name,
      amount: Number(row.amount || 0),
      mode: row.mode,
      status: row.status,
      createdAt: row.created_at,
      capturedAt: row.captured_at,
    })),
    orders: orderRows.rows.map((row: any) => ({
      id: row.id,
      restaurantId: row.restaurant_id,
      restaurantName: row.restaurant_name,
      sessionId: row.session_id,
      status: row.status,
      totalItems: Number(row.total_items || 0),
      subtotal: Number(row.subtotal || 0),
      createdAt: row.created_at,
    })),
    takeawayOrders: takeawayRows.rows.map((row: any) => ({
      id: row.id,
      restaurantId: row.restaurant_id,
      restaurantName: row.restaurant_name,
      orderType: row.order_type,
      status: row.status,
      customerName: row.customer_name,
      total: Number(row.total || 0),
      paymentMode: row.payment_mode,
      createdAt: row.created_at,
    })),
    tickets: ticketRows.rows.map((row: any) => ({
      id: row.id,
      restaurantId: row.restaurant_id,
      restaurantName: row.restaurant_name,
      title: row.title,
      description: row.description,
      type: row.type,
      priority: row.priority,
      status: row.status,
      userName: row.user_name,
      userRole: row.user_role,
      adminResponse: row.admin_response,
      createdAt: row.created_at,
      respondedAt: row.responded_at,
    })),
    downtime: downtimeRows.rows.map((row: any) => ({
      id: row.id,
      restaurantId: row.restaurant_id,
      restaurantName: row.restaurant_name,
      reason: row.reason,
      severity: row.severity,
      minutes: Number(row.minutes || 0),
      startedAt: row.started_at,
      endedAt: row.ended_at,
      createdAt: row.created_at,
    })),
    coupons,
    globalDiscounts,
    qadmins,
  };
}

/* ── global discounts ── */

export async function listGlobalDiscounts() {
  const { rows } = await db.query(`
    SELECT
      id,
      name,
      COALESCE(code, '') AS code,
      discount_type,
      discount_value::float8 AS discount_value,
      to_char(starts_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS starts_at,
      CASE WHEN ends_at IS NULL THEN NULL ELSE to_char(ends_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') END AS ends_at,
      is_active
    FROM superadmin_global_discounts
    ORDER BY created_at DESC
  `);
  return rows.map((r: any) => ({
    id: r.id,
    name: r.name,
    code: r.code,
    discountType: r.discount_type,
    discountValue: Number(r.discount_value),
    startsAt: r.starts_at,
    endsAt: r.ends_at || null,
    isActive: !!r.is_active,
  }));
}

export async function createGlobalDiscount(input: {
  name: string;
  code?: string | null;
  discountType: "percent" | "flat";
  discountValue: number;
  startsAt?: string | null;
  endsAt?: string | null;
  createdBy?: string | null;
}) {
  const { rows } = await db.query(
    `INSERT INTO superadmin_global_discounts
      (name, code, discount_type, discount_value, starts_at, ends_at, is_active, created_by, updated_at)
     VALUES ($1, NULLIF($2, ''), $3, $4, COALESCE($5::timestamp, now()), NULLIF($6, '')::timestamp, TRUE, $7, now())
     RETURNING id`,
    [
      input.name.trim(),
      (input.code || "").trim().toUpperCase(),
      input.discountType,
      input.discountValue,
      input.startsAt || null,
      input.endsAt || null,
      input.createdBy || null,
    ],
  );
  return { id: rows[0].id };
}

export async function setGlobalDiscountStatus(discountID: string, isActive: boolean) {
  await db.query(
    `UPDATE superadmin_global_discounts SET is_active = $2, updated_at = now() WHERE id = $1`,
    [discountID, isActive],
  );
}
