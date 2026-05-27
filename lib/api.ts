import {
  AnalyticsTopItem,
  AuditLogRecord,
  CouponCampaign,
  CouponRedemption,
  DowntimeItem,
  FeedbackItem,
  GlobalDiscount,
  Overview,
  PaymentHistoryRecord,
  PlatformOperations,
  QAdminUser,
  RestaurantDetail,
  RestaurantOption,
  RestaurantSummary,
  RestaurantStatus,
  RestaurantUser,
  RevenuePoint,
  RevenueRange,
  UserStatus,
} from "@/lib/types";

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(path, {
    cache: "no-store",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export async function fetchOverview(range: RevenueRange): Promise<Overview> {
  return getJSON<Overview>(`/api/superadmin/overview?range=${range}`);
}

export async function fetchRestaurants(range: RevenueRange): Promise<RestaurantSummary[]> {
  return getJSON<RestaurantSummary[]>(`/api/superadmin/restaurants?range=${range}`);
}

export async function fetchRestaurantDetail(id: string, range: RevenueRange): Promise<RestaurantDetail> {
  return getJSON<RestaurantDetail>(`/api/superadmin/restaurants/${id}?range=${range}`);
}

export async function fetchRestaurantPaymentHistory(id: string): Promise<PaymentHistoryRecord[]> {
  return getJSON<PaymentHistoryRecord[]>(`/api/superadmin/restaurants/${id}/payments`);
}

export async function fetchRevenueSeries(range: RevenueRange): Promise<RevenuePoint[]> {
  return getJSON<RevenuePoint[]>(`/api/superadmin/revenue?range=${range}`);
}

export async function fetchTopItems(range: RevenueRange): Promise<AnalyticsTopItem[]> {
  return getJSON<AnalyticsTopItem[]>(`/api/superadmin/analytics?range=${range}`);
}

async function patchJSON<T>(path: string, payload: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export async function updateRestaurantStatus(id: string, status: RestaurantStatus): Promise<void> {
  await patchJSON<{ ok: boolean }>(`/api/superadmin/restaurants/${id}/status`, { status });
}

export async function updateRestaurantBilling(
  id: string,
  payload: { action: "update_plan" | "extend_trial"; plan?: string }
): Promise<any> {
  return patchJSON<any>(`/api/superadmin/restaurants/${id}/billing`, payload);
}

export async function fetchRestaurantUsers(id: string): Promise<RestaurantUser[]> {
  return getJSON<RestaurantUser[]>(`/api/superadmin/restaurants/${id}/users`);
}

export async function updateRestaurantUserStatus(
  restaurantID: string,
  userID: string,
  status: UserStatus,
): Promise<void> {
  await patchJSON<{ ok: boolean }>(
    `/api/superadmin/restaurants/${restaurantID}/users/${userID}/status`,
    { status },
  );
}

export async function fetchRestaurantFeedback(id: string): Promise<FeedbackItem[]> {
  return getJSON<FeedbackItem[]>(`/api/superadmin/restaurants/${id}/feedback`);
}

export async function fetchRestaurantStaffFeedback(id: string): Promise<any[]> {
    return getJSON<any[]>(`/api/superadmin/restaurants/${id}/staff-feedback`);
}

export async function updateStaffFeedback(id: string, status: string, response: string): Promise<void> {
    await fetch(`/api/superadmin/staff-feedback/${id}/respond`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status, response })
    });
}

export async function fetchRestaurantDowntimes(id: string): Promise<DowntimeItem[]> {
  return getJSON<DowntimeItem[]>(`/api/superadmin/restaurants/${id}/downtimes`);
}

export async function fetchGlobalFeedback(): Promise<FeedbackItem[]> {
  return getJSON<FeedbackItem[]>(`/api/superadmin/feedback?limit=250`);
}

export async function createRestaurant(payload: {
  brandName: string;
  locationName: string;
  currency: string;
  plan: string;
  ownerEmail: string;
  ownerPassword: string;
  initialTables: number;
}): Promise<{ id: string }> {
  const res = await fetch("/api/superadmin/restaurants", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Request failed (${res.status})`);
  }
  return (await res.json()) as { id: string };
}

export async function deleteRestaurant(id: string): Promise<void> {
    const res = await fetch(`/api/superadmin/restaurants/${id}`, {
        method: "DELETE",
        credentials: "include",
    });
    if (!res.ok) {
        throw new Error(`Request failed (${res.status})`);
    }
}

export async function fetchGlobalDiscounts(): Promise<GlobalDiscount[]> {
  return getJSON<GlobalDiscount[]>("/api/superadmin/global-discounts");
}

export async function createGlobalDiscount(payload: {
  name: string;
  code?: string;
  discountType: "percent" | "flat";
  discountValue: number;
  startsAt?: string;
  endsAt?: string;
}): Promise<{ id: string }> {
  const res = await fetch("/api/superadmin/global-discounts", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Request failed (${res.status})`);
  }
  return (await res.json()) as { id: string };
}

export async function setGlobalDiscountStatus(id: string, isActive: boolean): Promise<void> {
  await patchJSON<{ ok: boolean }>(`/api/superadmin/global-discounts/${id}/status`, { isActive });
}

export async function fetchCouponCampaigns(): Promise<CouponCampaign[]> {
  return getJSON<CouponCampaign[]>("/api/superadmin/coupons");
}

export async function fetchCouponRedemptions(campaignId?: string): Promise<CouponRedemption[]> {
  const q = campaignId ? `?campaignId=${encodeURIComponent(campaignId)}` : "";
  return getJSON<CouponRedemption[]>(`/api/superadmin/coupon-redemptions${q}`);
}

export async function fetchOperations(): Promise<PlatformOperations> {
  return getJSON<PlatformOperations>("/api/superadmin/operations");
}

export async function fetchRestaurantOptions(): Promise<RestaurantOption[]> {
  return fetchOperations().then((data) => data.restaurants);
}

export async function fetchQAdmins(): Promise<QAdminUser[]> {
  return getJSON<QAdminUser[]>("/api/superadmin/qadmins");
}

export async function createQAdmin(payload: { username: string; password: string }): Promise<void> {
  const res = await fetch("/api/superadmin/qadmins", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Request failed (${res.status})`);
  }
}

export async function deleteQAdmin(username: string): Promise<void> {
  const res = await fetch("/api/superadmin/qadmins", {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
  });
  if (!res.ok) {
    const message = await res.text().catch(() => "");
    throw new Error(message || `Request failed (${res.status})`);
  }
}

export async function fetchAuditLogs(search = "", action = ""): Promise<AuditLogRecord[]> {
  const searchQ = search ? `&search=${encodeURIComponent(search)}` : "";
  const actionQ = action ? `&action=${encodeURIComponent(action)}` : "";
  return getJSON<AuditLogRecord[]>(`/api/superadmin/audit-logs?${searchQ}${actionQ}`);
}

export async function fetchSystemStats(): Promise<any> {
  return getJSON<any>("/api/superadmin/system-stats");
}

export async function fetchIncidents(): Promise<any[]> {
  return getJSON<any[]>("/api/superadmin/incidents");
}

export async function createIncident(payload: { title: string; message: string; severity: string }): Promise<any> {
  const res = await fetch("/api/superadmin/incidents", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Request failed (${res.status})`);
  }
  return res.json();
}

export async function resolveIncident(id: string): Promise<void> {
  const res = await fetch(`/api/superadmin/incidents/${id}/resolve`, {
    method: "PATCH",
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Request failed (${res.status})`);
  }
}

export async function fetchAssets(): Promise<any[]> {
  return getJSON<any[]>("/api/superadmin/assets");
}

export async function purgeAsset(id: string): Promise<void> {
  const res = await fetch(`/api/superadmin/assets/${id}/purge`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Request failed (${res.status})`);
  }
}
