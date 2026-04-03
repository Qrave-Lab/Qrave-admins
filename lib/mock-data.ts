import {
  AnalyticsTopItem,
  DowntimeItem,
  FeedbackItem,
  Overview,
  RestaurantDetail,
  RestaurantStatus,
  RestaurantSummary,
  RestaurantUser,
  RevenuePoint,
  RevenueRange,
  UserStatus,
} from "@/lib/types";

type RestaurantSeed = Omit<RestaurantSummary, "todayRevenue" | "ordersToday" | "totalRevenueRange"> & {
  baseRevenue: number;
  volatility: number;
};

type DailyPoint = {
  date: string;
  revenue: number;
  orders: number;
};

type DisplayPoint = {
  date: string;
  revenue: number;
  orders: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const seeds: RestaurantSeed[] = [
  {
    id: "r1",
    brandName: "Qrave",
    locationName: "Kochi MG Road",
    ownerEmail: "owner@qrave.in",
    plan: "pro",
    status: "active",
    mrr: 1499,
    createdAt: "2025-06-05",
    memberSince: "2025-06-05",
    baseRevenue: 52000,
    volatility: 0.18,
  },
  {
    id: "r2",
    brandName: "Qrave",
    locationName: "Bangalore Indiranagar",
    ownerEmail: "owner@qrave.in",
    plan: "growth",
    status: "active",
    mrr: 999,
    createdAt: "2025-08-12",
    memberSince: "2025-08-12",
    baseRevenue: 46000,
    volatility: 0.2,
  },
  {
    id: "r3",
    brandName: "Spice Board",
    locationName: "Chennai OMR",
    ownerEmail: "founder@spiceboard.com",
    plan: "starter",
    status: "trial",
    mrr: 499,
    createdAt: "2026-01-02",
    memberSince: "2026-01-02",
    baseRevenue: 18000,
    volatility: 0.25,
  },
  {
    id: "r4",
    brandName: "Burger Lane",
    locationName: "Hyderabad Gachibowli",
    ownerEmail: "ops@burgerlane.com",
    plan: "growth",
    status: "churn-risk",
    mrr: 999,
    createdAt: "2025-05-21",
    memberSince: "2025-05-21",
    baseRevenue: 15000,
    volatility: 0.35,
  },
  {
    id: "r5",
    brandName: "Thai Bowl",
    locationName: "Mumbai Bandra",
    ownerEmail: "team@thaibowl.in",
    plan: "pro",
    status: "active",
    mrr: 1499,
    createdAt: "2025-03-09",
    memberSince: "2025-03-09",
    baseRevenue: 61000,
    volatility: 0.14,
  },
];

const restaurantStatusOverrides = new Map<string, RestaurantStatus>();
const userStatusOverrides = new Map<string, UserStatus>();

const usersByRestaurant = new Map<string, RestaurantUser[]>([
  [
    "r1",
    [
      { id: "u11", name: "Akhil", email: "akhil@qrave.in", role: "manager", status: "active" },
      { id: "u12", name: "Rohit", email: "rohit@qrave.in", role: "cashier", status: "active" },
      { id: "u13", name: "Midhun", email: "midhun@qrave.in", role: "chef", status: "active" },
    ],
  ],
  [
    "r2",
    [
      { id: "u21", name: "Nina", email: "nina@qrave.in", role: "manager", status: "active" },
      { id: "u22", name: "Arun", email: "arun@qrave.in", role: "waiter", status: "active" },
    ],
  ],
  [
    "r3",
    [{ id: "u31", name: "Suresh", email: "suresh@spiceboard.com", role: "manager", status: "active" }],
  ],
]);

const feedbackByRestaurant = new Map<string, FeedbackItem[]>([
  [
    "r1",
    [
      { id: "f11", rating: 5, comment: "Fast service and clean UI.", createdAt: "2026-02-22", source: "service" },
      { id: "f12", rating: 4, comment: "Checkout was smooth.", createdAt: "2026-02-21", source: "checkout" },
    ],
  ],
  [
    "r2",
    [{ id: "f21", rating: 3, comment: "Menu images load slowly sometimes.", createdAt: "2026-02-20", source: "menu" }],
  ],
  [
    "r3",
    [{ id: "f31", rating: 4, comment: "Need more drink options.", createdAt: "2026-02-19", source: "menu" }],
  ],
]);

const downtimeByRestaurant = new Map<string, DowntimeItem[]>([
  [
    "r1",
    [
      {
        id: "d11",
        startedAt: "2026-02-18T13:20:00Z",
        endedAt: "2026-02-18T13:37:00Z",
        minutes: 17,
        reason: "payment provider timeout",
        severity: "medium",
      },
    ],
  ],
  [
    "r2",
    [
      {
        id: "d21",
        startedAt: "2026-02-16T08:05:00Z",
        endedAt: "2026-02-16T08:33:00Z",
        minutes: 28,
        reason: "event-stream reconnect",
        severity: "high",
      },
    ],
  ],
]);

function lastNDates(n: number): Date[] {
  const out: Date[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i -= 1) {
    out.push(new Date(now.getTime() - i * DAY_MS));
  }
  return out;
}

function stableNoise(seed: string, idx: number): number {
  let h = 2166136261;
  const text = `${seed}:${idx}`;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

function rangeDays(range: RevenueRange): number {
  if (range === "week") return 7;
  if (range === "month") return 30;
  return 365;
}

function toDisplaySeries(window: DailyPoint[], range: RevenueRange): DisplayPoint[] {
  if (range !== "year") {
    return window.map((p) => ({
      date: new Date(p.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      revenue: p.revenue,
      orders: p.orders,
    }));
  }

  const byMonth = new Map<string, { revenue: number; orders: number }>();
  for (const p of window) {
    const month = new Date(p.date).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
    const prev = byMonth.get(month) || { revenue: 0, orders: 0 };
    prev.revenue += p.revenue;
    prev.orders += p.orders;
    byMonth.set(month, prev);
  }

  return Array.from(byMonth.entries()).map(([date, value]) => ({
    date,
    revenue: value.revenue,
    orders: value.orders,
  }));
}

function generateSeriesForSeed(seed: RestaurantSeed): DailyPoint[] {
  const dates = lastNDates(365);
  return dates.map((date, idx) => {
    const weekday = date.getDay();
    const weekendBoost = weekday === 0 || weekday === 6 ? 1.18 : 1;
    const seasonal = 0.92 + (idx / 365) * 0.2;
    const drift = 0.9 + stableNoise(seed.id, idx) * seed.volatility;
    const revenue = Math.round(seed.baseRevenue * weekendBoost * seasonal * drift);
    const orders = Math.max(10, Math.round(revenue / (260 + stableNoise(`${seed.id}o`, idx) * 180)));
    return {
      date: date.toISOString().slice(0, 10),
      revenue,
      orders,
    };
  });
}

const byRestaurantSeries = new Map<string, DailyPoint[]>();
for (const seed of seeds) {
  byRestaurantSeries.set(seed.id, generateSeriesForSeed(seed));
}

function resolvedStatus(seed: RestaurantSeed): RestaurantStatus {
  return restaurantStatusOverrides.get(seed.id) || seed.status;
}

function aggregateNetworkSeries(range: RevenueRange): RevenuePoint[] {
  const days = rangeDays(range);
  const sample = byRestaurantSeries.get(seeds[0].id) || [];
  const start = Math.max(0, sample.length - days);
  const windowDates = sample.slice(start).map((p) => p.date);

  const raw = windowDates.map((date) => {
    let revenue = 0;
    let orders = 0;
    for (const seed of seeds) {
      const row = (byRestaurantSeries.get(seed.id) || []).find((x) => x.date === date);
      revenue += row?.revenue || 0;
      orders += row?.orders || 0;
    }

    return { date, revenue, orders };
  });

  return toDisplaySeries(raw, range);
}

function getRestaurantRangeTotals(seed: RestaurantSeed, range: RevenueRange) {
  const series = byRestaurantSeries.get(seed.id) || [];
  const days = rangeDays(range);
  const window = series.slice(Math.max(0, series.length - days));
  const totalRevenueRange = window.reduce((sum, p) => sum + p.revenue, 0);
  const today = series[series.length - 1];

  return {
    totalRevenueRange,
    todayRevenue: today?.revenue || 0,
    ordersToday: today?.orders || 0,
  };
}

export function getRestaurants(range: RevenueRange): RestaurantSummary[] {
  return seeds.map((seed) => {
    const totals = getRestaurantRangeTotals(seed, range);
    return {
      id: seed.id,
      brandName: seed.brandName,
      locationName: seed.locationName,
      ownerEmail: seed.ownerEmail,
      plan: seed.plan,
      status: resolvedStatus(seed),
      mrr: seed.mrr,
      createdAt: seed.createdAt,
      memberSince: seed.memberSince,
      todayRevenue: totals.todayRevenue,
      ordersToday: totals.ordersToday,
      totalRevenueRange: totals.totalRevenueRange,
    };
  });
}

export function getOverview(range: RevenueRange): Overview {
  const restaurants = getRestaurants(range);
  const series = aggregateNetworkSeries(range);
  const gmVToday = series[series.length - 1]?.revenue || 0;
  const ordersToday = series[series.length - 1]?.orders || 0;
  const totalRevenueRange = series.reduce((sum, p) => sum + p.revenue, 0);

  return {
    totalRestaurants: restaurants.length,
    activeRestaurants: restaurants.filter((r) => r.status === "active").length,
    trialRestaurants: restaurants.filter((r) => r.status === "trial").length,
    mrr: restaurants.reduce((sum, r) => sum + r.mrr, 0),
    gmVToday,
    ordersToday,
    totalRevenueRange,
    range,
  };
}

export function getNetworkRevenueSeries(range: RevenueRange): RevenuePoint[] {
  return aggregateNetworkSeries(range);
}

export function getRestaurantDetail(id: string, range: RevenueRange): RestaurantDetail | null {
  const seed = seeds.find((s) => s.id === id);
  if (!seed) return null;

  const fullSeries = byRestaurantSeries.get(id) || [];
  const days = rangeDays(range);
  const window = fullSeries.slice(Math.max(0, fullSeries.length - days));
  const revenueSeries: RevenuePoint[] = toDisplaySeries(window, range);

  const restaurant = getRestaurants(range).find((r) => r.id === id);
  if (!restaurant) return null;

  return {
    restaurant,
    totalRevenueLifetime: fullSeries.reduce((sum, p) => sum + p.revenue, 0),
    totalOrdersLifetime: fullSeries.reduce((sum, p) => sum + p.orders, 0),
    range,
    revenueSeries,
  };
}

export function setRestaurantStatus(id: string, status: RestaurantStatus): boolean {
  const exists = seeds.some((s) => s.id === id);
  if (!exists) return false;
  restaurantStatusOverrides.set(id, status);
  return true;
}

export function getRestaurantUsers(restaurantID: string): RestaurantUser[] {
  const users = usersByRestaurant.get(restaurantID) || [];
  return users.map((user) => {
    const override = userStatusOverrides.get(`${restaurantID}:${user.id}`);
    return {
      ...user,
      status: override || user.status,
    };
  });
}

export function setRestaurantUserStatus(
  restaurantID: string,
  userID: string,
  status: UserStatus,
): boolean {
  const users = usersByRestaurant.get(restaurantID) || [];
  const exists = users.some((u) => u.id === userID);
  if (!exists) return false;
  userStatusOverrides.set(`${restaurantID}:${userID}`, status);
  return true;
}

export function getRestaurantFeedback(restaurantID: string): FeedbackItem[] {
  return feedbackByRestaurant.get(restaurantID) || [];
}

export function getRestaurantDowntimes(restaurantID: string): DowntimeItem[] {
  return downtimeByRestaurant.get(restaurantID) || [];
}

export function getTopItems(_range: RevenueRange): AnalyticsTopItem[] {
  return [
    { name: "Chicken Mandi", orders: 4800, revenue: 4280000 },
    { name: "Fried Rice", orders: 4380, revenue: 1780000 },
    { name: "Pepperoni Pizza", orders: 4020, revenue: 3120000 },
    { name: "Classic Burger", orders: 3910, revenue: 2210000 },
    { name: "Lime Combo", orders: 3200, revenue: 1100000 },
  ];
}
