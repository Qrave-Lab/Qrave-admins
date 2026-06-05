"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import OrdersChart from "@/components/OrdersChart";
import RangeTabs from "@/components/RangeTabs";
import RevenueChart from "@/components/RevenueChart";
import PackageExpiryBadge from "@/components/PackageExpiryBadge";
import TopBar from "@/components/TopBar";
import {
  createCouponCampaign,
  extendRestaurantSubscription,
  fetchRestaurantDetail,
  fetchCouponCampaigns,
  fetchRestaurantDowntimes,
  fetchRestaurantFeedback,
  fetchRestaurantStaffFeedback,
  fetchRestaurantUsers,
  updateStaffFeedback,
  updateRestaurantStatus,
  updateRestaurantUserStatus,
} from "@/lib/api";
import {
  DowntimeItem,
  FeedbackItem,
  CouponCampaign,
  RestaurantDetail,
  RestaurantStatus,
  RestaurantUser,
  RevenueRange,
  UserStatus,
} from "@/lib/types";

export default function RestaurantDetailPage() {
  const params = useParams<{ id: string }>();
  const id = String(params.id || "");

  const [range, setRange] = useState<RevenueRange>("month");
  const [detail, setDetail] = useState<RestaurantDetail | null>(null);
  const [users, setUsers] = useState<RestaurantUser[]>([]);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [staffFeedback, setStaffFeedback] = useState<any[]>([]); // New state
  const [downtimes, setDowntimes] = useState<DowntimeItem[]>([]);
  const [coupons, setCoupons] = useState<CouponCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState("");

  // Feedback Action State
  const [selectedFeedback, setSelectedFeedback] = useState<any | null>(null);
  const [responseNote, setResponseNote] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [extraSubscriptionDays, setExtraSubscriptionDays] = useState("7");
  const [extendingSubscription, setExtendingSubscription] = useState(false);
  const [couponName, setCouponName] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscountKind, setCouponDiscountKind] = useState<"percent" | "fixed" | "fixed_price">("percent");
  const [couponDiscountValue, setCouponDiscountValue] = useState("10");
  const [couponStartsAt, setCouponStartsAt] = useState("");
  const [couponEndsAt, setCouponEndsAt] = useState("");
  const [couponMaxRedemptions, setCouponMaxRedemptions] = useState("");
  const [creatingCoupon, setCreatingCoupon] = useState(false);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    const load = async (showLoading: boolean) => {
      if (showLoading) setLoading(true);
      try {
        const [d, u, f, sf, down, allCoupons] = await Promise.all([
          fetchRestaurantDetail(id, range),
          fetchRestaurantUsers(id),
          fetchRestaurantFeedback(id),
          fetchRestaurantStaffFeedback(id), // new fetch
          fetchRestaurantDowntimes(id),
          fetchCouponCampaigns(),
        ]);
        if (!mounted) return;
        setDetail(d);
        setUsers(u);
        setFeedback(f);
        setStaffFeedback(sf);
        setDowntimes(down);
        setCoupons(allCoupons.filter((c) => c.restaurantID === id));
      } catch {
        // Keep last known data during transient API failures.
      } finally {
        if (showLoading && mounted) setLoading(false);
      }
    };

    void load(true);
    const timer = window.setInterval(() => {
      void load(false);
    }, 8000);

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [id, range]);

  const totalRangeRevenue = useMemo(
    () => detail?.revenueSeries.reduce((sum, p) => sum + p.revenue, 0) || 0,
    [detail],
  );

  const setRestaurantAccess = async (status: RestaurantStatus) => {
    if (!detail) return;
    const previous = detail.restaurant.status;
    setPending(`restaurant:${status}`);
    setDetail({ ...detail, restaurant: { ...detail.restaurant, status } });

    try {
      await updateRestaurantStatus(detail.restaurant.id, status);
    } catch {
      setDetail({
        ...detail,
        restaurant: { ...detail.restaurant, status: previous },
      });
      alert("Failed to update restaurant status");
    } finally {
      setPending("");
    }
  };

  const setUserAccess = async (userID: string, status: UserStatus) => {
    const snapshot = users;
    setPending(`user:${userID}`);
    setUsers((prev) =>
      prev.map((u) => (u.id === userID ? { ...u, status } : u)),
    );

    try {
      await updateRestaurantUserStatus(id, userID, status);
    } catch {
      setUsers(snapshot);
      alert("Failed to update user status");
    } finally {
      setPending("");
    }
  };

  const handleOpenFeedback = (fb: any) => {
    setSelectedFeedback(fb);
    setResponseNote(fb.admin_response || "");
    setNewStatus(fb.status);
  };

  const closeFeedbackModal = () => {
    setSelectedFeedback(null);
    setResponseNote("");
    setNewStatus("");
  };

  const submitFeedbackUpdate = async () => {
    if (!selectedFeedback) return;
    setActionLoading(true);
    try {
      await updateStaffFeedback(selectedFeedback.id, newStatus, responseNote);
      // Optimistic Update
      setStaffFeedback((prev) =>
        prev.map((p) =>
          p.id === selectedFeedback.id
            ? { ...p, status: newStatus, admin_response: responseNote }
            : p,
        ),
      );
      closeFeedbackModal();
    } catch (e) {
      console.error(e);
      alert("Failed to update feedback");
    } finally {
      setActionLoading(false);
    }
  };

  const extendSubscriptionByDays = async () => {
    if (!detail) return;

    const days = Math.trunc(Number(extraSubscriptionDays));
    if (!Number.isFinite(days) || days < 1) {
      alert("Please enter a valid number of days (minimum 1)");
      return;
    }

    setExtendingSubscription(true);
    try {
      const result = await extendRestaurantSubscription(detail.restaurant.id, days);
      setDetail((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          restaurant: {
            ...prev.restaurant,
            packageExpiresAt: result.packageExpiresAt,
          },
        };
      });
      setExtraSubscriptionDays("7");
    } catch {
      alert("Failed to extend subscription");
    } finally {
      setExtendingSubscription(false);
    }
  };

  const createRestaurantCoupon = async () => {
    if (!detail) return;

    const discountValue = Number(couponDiscountValue);
    if (!couponName.trim() || !couponCode.trim()) {
      alert("Please enter a coupon name and code");
      return;
    }
    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      alert("Please enter a valid discount value");
      return;
    }

    setCreatingCoupon(true);
    try {
      const created = await createCouponCampaign({
        restaurantId: detail.restaurant.id,
        name: couponName,
        couponCode: couponCode,
        discountKind: couponDiscountKind,
        discountValue,
        startsAt: couponStartsAt || null,
        endsAt: couponEndsAt || null,
        maxRedemptions: couponMaxRedemptions ? Number(couponMaxRedemptions) : null,
      });
      setCoupons((prev) => [created, ...prev]);
      setCouponName("");
      setCouponCode("");
      setCouponDiscountKind("percent");
      setCouponDiscountValue("10");
      setCouponStartsAt("");
      setCouponEndsAt("");
      setCouponMaxRedemptions("");
    } catch (err) {
      alert("Failed to create coupon");
    } finally {
      setCreatingCoupon(false);
    }
  };

  if (loading || !detail)
    return (
      <div className="min-h-screen bg-slate-50/50 pb-12">
        <TopBar
          title="Restaurant Details"
          subtitle="Loading..."
          rightSlot={<RangeTabs value={range} onChange={setRange} />}
        />
        <div className="px-6 py-8 max-w-7xl mx-auto space-y-6 animate-pulse">
          {/* Back + status bar */}
          <div className="flex items-center justify-between">
            <div className="h-8 w-40 bg-slate-200 rounded-lg" />
            <div className="h-6 w-20 bg-slate-100 rounded-full" />
          </div>
          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="h-3 w-24 bg-slate-200 rounded mb-3" />
                <div className="h-7 w-16 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
          {/* Access controls */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="h-4 w-40 bg-slate-200 rounded mb-4" />
            <div className="flex gap-3">
              <div className="h-9 w-28 bg-slate-100 rounded-lg" />
              <div className="h-9 w-36 bg-slate-100 rounded-lg" />
              <div className="h-9 w-36 bg-slate-100 rounded-lg" />
            </div>
          </div>
          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm h-72" />
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm h-72" />
          </div>
        </div>
      </div>
    );

  const { restaurant } = detail;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-12">
      <TopBar
        title={
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            {restaurant.brandName} · {restaurant.locationName}
          </h1>
        }
        subtitle={
          <div className="flex items-center gap-2 text-sm text-gray-500">
            Subscription, revenue, users, feedback, and downtime controls
          </div>
        }
        rightSlot={<RangeTabs value={range} onChange={setRange} />}
      />

      <div className="px-6 mt-6 mb-4 flex items-center justify-between">
        <Link
          href="/restaurants"
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg"
        >
          <span aria-hidden="true">&larr;</span> Back to Restaurants
        </Link>
        <span
          className={`
            inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold capitalize
            ${restaurant.status === "active" ? "bg-green-100 text-green-800" : ""}
            ${restaurant.status === "disabled" ? "bg-yellow-100 text-yellow-800" : ""}
            ${restaurant.status === "revoked" ? "bg-red-100 text-red-800" : ""}
            ${restaurant.status === "trial" ? "bg-indigo-100 text-indigo-800" : ""}
            ${restaurant.status === "churn-risk" ? "bg-rose-100 text-rose-800" : ""}
          `}
        >
          {restaurant.status}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 px-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Subscription Plan
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900 capitalize">
            {restaurant.plan}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Package Expiry
          </p>
          <div className="mt-2 flex flex-col gap-2">
            <PackageExpiryBadge expiresAt={restaurant.packageExpiresAt} />
            <p className="text-xs text-gray-500">
              {restaurant.packageExpiresAt
                ? new Date(restaurant.packageExpiresAt).toLocaleString("en-IN")
                : "No expiry configured"}
            </p>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Member Since
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {restaurant.memberSince}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Total Revenue ({range})
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900 text-green-600">
            ₹{totalRangeRevenue.toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      <div className="mt-8 px-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Lifetime Revenue
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            ₹{detail.totalRevenueLifetime.toLocaleString("en-IN")}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Lifetime Orders
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {detail.totalOrdersLifetime.toLocaleString("en-IN")}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md sm:col-span-2">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Billing Summary
          </p>
          <p className="mt-2 text-sm text-gray-600">
            Current status:{" "}
            <span className="font-semibold text-gray-900 capitalize">
              {restaurant.billingStatus || restaurant.status}
            </span>
          </p>
          <p className="mt-1 text-sm text-gray-600">
            Package timer:{" "}
            <span className="font-semibold text-gray-900">
              {restaurant.packageExpiresAt
                ? new Date(restaurant.packageExpiresAt).toLocaleString("en-IN")
                : "Not available"}
            </span>
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="text-xs font-medium uppercase tracking-wide text-gray-500" htmlFor="extra-subscription-days">
              Add Extra Days
            </label>
            <div className="flex items-center gap-2">
              <input
                id="extra-subscription-days"
                type="number"
                min={1}
                step={1}
                value={extraSubscriptionDays}
                onChange={(e) => setExtraSubscriptionDays(e.target.value)}
                className="w-24 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Days"
              />
              <button
                onClick={extendSubscriptionByDays}
                disabled={extendingSubscription}
                className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {extendingSubscription ? "Adding..." : "Add Days"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <section className="mt-8 px-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Restaurant Access Controls
          </h3>
          <div className="flex items-center gap-3">
            <button
              disabled={pending.startsWith("restaurant")}
              onClick={() => setRestaurantAccess("active")}
              className={`px-4 py-2 font-medium rounded-lg transition-colors ${
                restaurant.status === "active"
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-green-600 text-white hover:bg-green-700 shadow-sm"
              }`}
            >
              Activate Access
            </button>
            <button
              disabled={pending.startsWith("restaurant")}
              onClick={() => setRestaurantAccess("disabled")}
              className={`px-4 py-2 font-medium rounded-lg transition-colors ${
                restaurant.status === "disabled"
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-amber-600 text-white hover:bg-amber-700 shadow-sm"
              }`}
            >
              Suspend Temporarily
            </button>
            <button
              disabled={pending.startsWith("restaurant")}
              onClick={() => setRestaurantAccess("revoked")}
              className={`px-4 py-2 font-medium rounded-lg transition-colors ${
                restaurant.status === "revoked"
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-red-600 text-white hover:bg-red-700 shadow-sm"
              }`}
            >
              Revoke Permanently
            </button>
          </div>
        </div>
      </section>

      <section className="mt-8 px-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Discount Coupons
              </h3>
              <p className="text-sm text-gray-500">
                Create restaurant-scoped promo coupons that customers can apply at checkout.
              </p>
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              {coupons.length} coupons
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            <input
              value={couponName}
              onChange={(e) => setCouponName(e.target.value)}
              placeholder="Coupon name"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            <input
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="Coupon code"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            <select
              value={couponDiscountKind}
              onChange={(e) => setCouponDiscountKind(e.target.value as "percent" | "fixed" | "fixed_price")}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="percent">Percent off</option>
              <option value="fixed">Flat amount off</option>
              <option value="fixed_price">Fixed price</option>
            </select>
            <input
              type="number"
              min={1}
              step={1}
              value={couponDiscountValue}
              onChange={(e) => setCouponDiscountValue(e.target.value)}
              placeholder="Discount value"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            <input
              type="datetime-local"
              value={couponStartsAt}
              onChange={(e) => setCouponStartsAt(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            <input
              type="datetime-local"
              value={couponEndsAt}
              onChange={(e) => setCouponEndsAt(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            <input
              type="number"
              min={1}
              step={1}
              value={couponMaxRedemptions}
              onChange={(e) => setCouponMaxRedemptions(e.target.value)}
              placeholder="Max redemptions (optional)"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 md:col-span-2 xl:col-span-2"
            />
            <button
              onClick={createRestaurantCoupon}
              disabled={creatingCoupon}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300 md:col-start-2 xl:col-start-3"
            >
              {creatingCoupon ? "Creating..." : "Create Coupon"}
            </button>
          </div>

          <div className="mt-6 overflow-hidden rounded-xl border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Discount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {coupons.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                      No coupons created for this restaurant.
                    </td>
                  </tr>
                ) : (
                  coupons.map((coupon) => (
                    <tr key={coupon.id}>
                      <td className="px-4 py-3 font-medium text-gray-900">{coupon.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-700">{coupon.couponCode || "-"}</td>
                      <td className="px-4 py-3 text-gray-700">
                        {coupon.discountKind === "percent"
                          ? `${coupon.discountValue}%`
                          : coupon.discountKind === "fixed_price"
                            ? `Fixed price ${coupon.discountValue}`
                            : `₹${coupon.discountValue}`}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{coupon.isActive ? "Active" : "Inactive"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {selectedFeedback && (
        <div className="fixed inset-0 bg-black/50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
          <div className="relative mx-auto p-5 border w-[500px] shadow-2xl rounded-xl bg-white">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                Manage Feedback
              </h3>
              <button
                onClick={closeFeedbackModal}
                className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  ></path>
                </svg>
              </button>
            </div>

            <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    selectedFeedback.type === "bug"
                      ? "bg-red-100 text-red-700"
                      : selectedFeedback.type === "feature_request"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {selectedFeedback.type?.replace("_", " ")}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    selectedFeedback.priority === "critical"
                      ? "bg-rose-600 text-white"
                      : selectedFeedback.priority === "high"
                        ? "bg-orange-500 text-white"
                        : "bg-green-100 text-green-700"
                  }`}
                >
                  {selectedFeedback.priority}
                </span>
              </div>
              <h4 className="font-bold text-gray-900 mb-1">
                {selectedFeedback.title}
              </h4>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {selectedFeedback.description}
              </p>
              <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500 flex justify-between">
                <span>
                  Submitted by{" "}
                  <span className="font-medium text-gray-700">
                    {selectedFeedback.user_name || "Unknown"}
                  </span>
                </span>
                <span>
                  {new Date(selectedFeedback.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Update Status
                </label>
                <div className="relative">
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm"
                  >
                    <option value="open">Open (Needs Attention)</option>
                    <option value="acknowledged">
                      Acknowledged (In Progress)
                    </option>
                    <option value="resolved">Resolved (Fixed/Completed)</option>
                    <option value="wont_fix">Won&apos;t Fix (Closed)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Admin Response / Resolution Note
                  <span className="ml-1 font-normal text-gray-400 text-xs">
                    (Visible to staff)
                  </span>
                </label>
                <textarea
                  value={responseNote}
                  onChange={(e) => setResponseNote(e.target.value)}
                  rows={4}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                  placeholder="Example: 'Fixed in version 2.4', 'Added to roadmap', or reason for closing..."
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 mt-6">
                <button
                  onClick={closeFeedbackModal}
                  className="bg-white py-2 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
                <button
                  onClick={submitFeedbackUpdate}
                  disabled={actionLoading}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {actionLoading ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    "Update Feedback"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 px-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Revenue Trend ({range})
          </h3>
          <div className="h-72 w-full">
            <RevenueChart data={detail.revenueSeries} />
          </div>
        </section>
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Orders Trend ({range})
          </h3>
          <div className="h-72 w-full">
            <OrdersChart data={detail.revenueSeries} />
          </div>
        </section>
      </div>

      <section className="mt-8 px-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Restaurant Users
        </h3>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Role
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Controls
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900">
                      {u.name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                      {u.email}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600 capitalize">
                      {u.role}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                        ${u.status === "active" ? "bg-green-100 text-green-800" : ""}
                        ${u.status === "disabled" ? "bg-yellow-100 text-yellow-800" : ""}
                        ${u.status === "revoked" ? "bg-red-100 text-red-800" : ""}
                      `}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          disabled={
                            pending === `user:${u.id}` || u.status === "active"
                          }
                          onClick={() => setUserAccess(u.id, "active")}
                          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                            u.status === "active"
                              ? "bg-gray-100 text-gray-400"
                              : "bg-green-600 text-white hover:bg-green-700"
                          }`}
                        >
                          Activate
                        </button>
                        <button
                          disabled={
                            pending === `user:${u.id}` ||
                            u.status === "disabled"
                          }
                          onClick={() => setUserAccess(u.id, "disabled")}
                          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                            u.status === "disabled"
                              ? "bg-gray-100 text-gray-400"
                              : "bg-amber-600 text-white hover:bg-amber-700"
                          }`}
                        >
                          Disable
                        </button>
                        <button
                          disabled={
                            pending === `user:${u.id}` || u.status === "revoked"
                          }
                          onClick={() => setUserAccess(u.id, "revoked")}
                          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                            u.status === "revoked"
                              ? "bg-gray-100 text-gray-400"
                              : "bg-red-600 text-white hover:bg-red-700"
                          }`}
                        >
                          Revoke
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="mt-8 px-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Staff Feedback
        </h3>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Date/Details
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Source
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {staffFeedback.map((sf: any) => (
                  <tr
                    key={sf.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            sf.type === "bug"
                              ? "bg-red-100 text-red-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {sf.type}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            sf.priority === "critical"
                              ? "bg-rose-600 text-white"
                              : "bg-orange-100 text-orange-800"
                          }`}
                        >
                          {sf.priority}
                        </span>
                        <span className="font-bold text-gray-900 text-sm ml-1">
                          {sf.title}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap mb-1">
                        {sf.description}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {new Date(sf.created_at).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 align-top">
                      {sf.user_name || "Unknown"}{" "}
                      <span className="text-xs text-gray-400">
                        ({sf.user_role || "Staff"})
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 align-top">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                          sf.status === "open"
                            ? "bg-green-100 text-green-800"
                            : sf.status === "resolved"
                              ? "bg-gray-100 text-gray-800 line-through"
                              : "bg-indigo-100 text-indigo-800"
                        }`}
                      >
                        {sf.status}
                      </span>
                      <button
                        onClick={() => handleOpenFeedback(sf)}
                        className="ml-2 text-xs text-blue-600 hover:text-blue-800 font-medium underline"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
                {staffFeedback.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-6 py-8 text-center text-gray-400"
                    >
                      No staff feedback submitted.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="mt-8 px-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Customer Feedback
        </h3>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Rating
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Source
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 w-1/2">
                    Comment
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {feedback.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-8 text-center text-gray-500 text-sm"
                    >
                      No feedback found.
                    </td>
                  </tr>
                ) : (
                  feedback.map((f) => (
                    <tr
                      key={f.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                        {f.createdAt}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-md font-bold text-xs ${
                            f.rating >= 4
                              ? "bg-green-100 text-green-700"
                              : f.rating === 3
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                          }`}
                        >
                          ⭐ {f.rating}/5
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600 capitalize">
                        {f.source}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 whitespace-wrap">
                        {f.comment || (
                          <span className="text-gray-400 italic">
                            No comment provided
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="mt-8 px-6">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Payment History
            </h3>
            <p className="text-sm text-gray-500">
              Status transitions for paid, refunded, voided, and takeaway
              payment updates.
            </p>
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            {detail.paymentHistory.length} events
          </span>
        </div>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Type
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Order
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    From
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    To
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Amount
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Actor
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Reason
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {detail.paymentHistory.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-8 text-center text-sm text-gray-500"
                    >
                      No payment history recorded for this restaurant.
                    </td>
                  </tr>
                ) : (
                  detail.paymentHistory.map((event) => (
                    <tr
                      key={event.id}
                      className="hover:bg-gray-50 transition-colors align-top"
                    >
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                        {new Date(event.createdAt).toLocaleString("en-IN")}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700 capitalize">
                        {event.paymentType}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                        <div>
                          {event.orderId || event.takeawayOrderId || "-"}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700 capitalize">
                        {event.oldStatus}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 font-semibold capitalize">
                        {event.newStatus}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                        {event.amount === null
                          ? "-"
                          : `₹${event.amount.toLocaleString("en-IN")}`}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {event.actorName}
                        {event.actorRole ? (
                          <span className="text-xs text-gray-400">
                            {" "}
                            ({event.actorRole})
                          </span>
                        ) : null}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {event.reason || "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="mt-8 px-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Downtime Log
        </h3>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Start Time
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    End Time
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Duration
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Severity
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 w-1/3">
                    Reason
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {downtimes.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-8 text-center text-gray-500 text-sm"
                    >
                      No downtime incidents recorded.
                    </td>
                  </tr>
                ) : (
                  downtimes.map((d) => (
                    <tr
                      key={d.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                        {new Date(d.startedAt).toLocaleString("en-IN")}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                        {new Date(d.endedAt).toLocaleString("en-IN")}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                        {d.minutes} mins
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-md font-bold text-xs uppercase tracking-wider
                          ${d.severity === "low" ? "bg-blue-100 text-blue-700" : d.severity === "medium" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}
                        `}
                        >
                          {d.severity}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {d.reason || (
                          <span className="text-gray-400 italic">
                            Unspecified
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
