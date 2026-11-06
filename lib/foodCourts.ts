// Client for the admin platform's food court API (/api/superadmin/food-courts/...).

export type CourtStatus = "trialing" | "active" | "past_due" | "canceled" | "expired";

export type FoodCourt = {
  id: string;
  name: string;
  slug: string;
  address: string;
  city: string;
  logoUrl: string;
  coverUrl: string;
  opensAt: string;
  closesAt: string;
  subscriptionStatus: CourtStatus;
  trialEndsAt?: string;
  currentPeriodEnd?: string;
  isArchived: boolean;
  createdAt: string;
};

export type FoodCourtSummary = FoodCourt & {
  stallCount: number;
  operatorCount: number;
  qrCount: number;
  activeAds: number;
  visitors7d: number;
};

export type Stall = {
  restaurantId: string;
  name: string;
  logoUrl: string;
  stallLabel: string;
  cuisineTags: string[];
  isListed: boolean;
  opensAt: string;
  closesAt: string;
  itemCount: number;
  arItemCount: number;
  thumbnails: string[];
};

export type Operator = { userId: string; email: string; name: string; role: "owner" | "manager"; createdAt: string };
export type QRToken = { token: string; zoneLabel: string; createdAt: string };

export type CourtDetail = { court: FoodCourt; stalls: Stall[]; operators: Operator[]; qr_tokens: QRToken[] };

export type StallCandidate = {
  restaurantId: string;
  name: string;
  address: string;
  ownerEmail: string;
  itemCount: number;
  arItemCount: number;
};

export type Dish = { id: string; restaurantId: string; name: string; price: number; imageUrl: string; isVeg: boolean; hasAr: boolean };

export type Placement = {
  id: string;
  restaurantId: string;
  restaurantName: string;
  slot: "top_stall" | "featured_item";
  menuItemId?: string;
  menuItemName?: string;
  startsAt: string;
  endsAt: string;
  priceCents: number;
  note: string;
  createdAt: string;
  impressions: number;
  clicks: number;
};

export type CountRow = { key: string; visitors: number };
export type SearchRow = { query: string; searches: number; zeroResults: number };
export type CourtAnalytics = {
  from: string;
  to: string;
  visitors: number;
  opens: number;
  byHour: CountRow[];
  byDay: CountRow[];
  byZone: CountRow[];
  stalls: { restaurantId: string; name: string; views: number; itemViews: number; view3d: number; arOpens: number }[];
  topSearches: SearchRow[];
  noResults: SearchRow[];
};

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

const BASE = "/api/superadmin/food-courts";

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    cache: "no-store",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
  });
  const text = await res.text();
  let json: any = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = {};
  }
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") window.location.href = "/login";
    throw new ApiError(json.error || `Request failed (${res.status})`, res.status);
  }
  return json as T;
}

const send = (method: string, body?: unknown): RequestInit => ({ method, body: body === undefined ? undefined : JSON.stringify(body) });

export const foodCourts = {
  list: () => call<{ courts: FoodCourtSummary[] }>("").then((r) => r.courts),
  create: (input: { name: string; slug: string; city?: string; address?: string; opens_at?: string; closes_at?: string }) =>
    call<FoodCourt>("", send("POST", input)),
  detail: (id: string) => call<CourtDetail>(`/${id}`),
  update: (id: string, patch: Partial<Record<"name" | "slug" | "city" | "address" | "logo_url" | "cover_url" | "opens_at" | "closes_at", string>> & { is_archived?: boolean }) =>
    call<FoodCourt>(`/${id}`, send("PATCH", patch)),
  setSubscription: (id: string, input: { status: CourtStatus; trial_ends_at?: string; current_period_end?: string }) =>
    call<FoodCourt>(`/${id}/subscription`, send("POST", input)),

  candidates: (q: string) =>
    call<{ restaurants: StallCandidate[] }>(`/stall-candidates?q=${encodeURIComponent(q)}`).then((r) => r.restaurants),
  addStall: (id: string, input: { restaurant_id: string; stall_label?: string; cuisine_tags?: string[] }) =>
    call(`/${id}/stalls`, send("POST", input)),
  updateStall: (id: string, restaurantId: string, patch: { stall_label?: string; cuisine_tags?: string[]; is_listed?: boolean }) =>
    call(`/${id}/stalls/${restaurantId}`, send("PATCH", patch)),
  removeStall: (id: string, restaurantId: string) => call(`/${id}/stalls/${restaurantId}`, send("DELETE")),
  dishes: (id: string, restaurantId: string) =>
    call<{ dishes: Dish[] }>(`/${id}/stalls/${restaurantId}/dishes`).then((r) => r.dishes),

  addOperator: (id: string, input: { email: string; name?: string; password?: string; role: "owner" | "manager" }) =>
    call<{ user_id: string; created: boolean }>(`/${id}/operators`, send("POST", input)),
  removeOperator: (id: string, userId: string) => call(`/${id}/operators/${userId}`, send("DELETE")),
  resetPassword: (id: string, userId: string, password: string) =>
    call(`/${id}/operators/${userId}/password`, send("POST", { password })),

  createQR: (id: string, zones: string[]) => call<{ tokens: QRToken[] }>(`/${id}/qr-tokens`, send("POST", { zones })).then((r) => r.tokens),
  deleteQR: (id: string, token: string) => call(`/${id}/qr-tokens/${token}`, send("DELETE")),

  placements: (id: string) => call<{ placements: Placement[] }>(`/${id}/placements`).then((r) => r.placements),
  createPlacement: (
    id: string,
    input: { restaurant_id: string; slot: Placement["slot"]; menu_item_id?: string; starts_at: string; ends_at: string; price_cents: number; note?: string },
  ) => call<{ id: string }>(`/${id}/placements`, send("POST", input)),
  endPlacement: (id: string, placementId: string) => call(`/${id}/placements/${placementId}/end`, send("POST")),

  analytics: (id: string, from: string, to: string) => call<CourtAnalytics>(`/${id}/analytics?from=${from}&to=${to}`),
};

export type Me = { id: string; username: string; name: string; role: string; permissions: string[] };

export async function fetchMe(): Promise<Me> {
  const res = await fetch("/api/auth/me", { cache: "no-store", credentials: "include" });
  if (!res.ok) throw new ApiError("Not signed in", res.status);
  return res.json();
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** A readable random password: 12 characters, no look-alike letters. */
export function generatePassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint32Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

export { dinerBaseUrl } from "./dinerUrl";

/** YYYY-MM-DD in India time, `daysAgo` days before today. */
export function istDate(daysAgo = 0): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(Date.now() - daysAgo * 86_400_000));
}

export function formatIST(iso?: string, withTime = false): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });
}

export function cuisineLabel(tag: string): string {
  return tag
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/** What the court's billing means right now, for badges. */
export function billingState(c: Pick<FoodCourt, "subscriptionStatus" | "trialEndsAt" | "currentPeriodEnd" | "isArchived">, now = Date.now()) {
  if (c.isArchived) return { label: "Archived", tone: "slate" as const, live: false };
  const grace = 72 * 3600 * 1000;
  const t = c.trialEndsAt ? new Date(c.trialEndsAt).getTime() : null;
  const p = c.currentPeriodEnd ? new Date(c.currentPeriodEnd).getTime() : null;
  switch (c.subscriptionStatus) {
    case "trialing":
      if (t === null || now <= t) return { label: "Trial", tone: "sky" as const, live: true };
      if (now <= t + grace) return { label: "Trial ended · grace", tone: "amber" as const, live: true };
      return { label: "Trial expired", tone: "red" as const, live: false };
    case "active":
      if (p !== null && now > p + grace) return { label: "Period ended", tone: "red" as const, live: false };
      if (p !== null && now > p) return { label: "Active · grace", tone: "amber" as const, live: true };
      return { label: "Active", tone: "emerald" as const, live: true };
    case "past_due":
      if (p !== null && now <= p + grace) return { label: "Past due · grace", tone: "amber" as const, live: true };
      return { label: "Past due", tone: "red" as const, live: false };
    case "canceled":
      return { label: "Canceled", tone: "red" as const, live: false };
    default:
      return { label: "Expired", tone: "red" as const, live: false };
  }
}

export const TONE: Record<"slate" | "sky" | "amber" | "red" | "emerald", string> = {
  slate: "bg-slate-100 text-slate-700 border-slate-200",
  sky: "bg-sky-50 text-sky-700 border-sky-200",
  amber: "bg-amber-50 text-amber-800 border-amber-200",
  red: "bg-red-50 text-red-700 border-red-200",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
};
