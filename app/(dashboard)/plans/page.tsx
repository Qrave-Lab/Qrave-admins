"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import RestaurantFeatureManager from "@/components/RestaurantFeatureManager";
import { FeatureDefinition, PlanRecord } from "@/lib/plans";
import { fetchRestaurants } from "@/lib/api";
import { RestaurantSummary } from "@/lib/types";
import {
  SlidersHorizontal,
  Sparkles,
  Check,
  X,
  Search,
  Clock,
  Layers,
  ExternalLink,
  ChevronRight,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
} from "lucide-react";

interface OverrideRow {
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
}

export default function PlansAndFlagsPage() {
  const [plans, setPlans] = useState<PlanRecord[]>([]);
  const [features, setFeatures] = useState<FeatureDefinition[]>([]);
  const [overrides, setOverrides] = useState<OverrideRow[]>([]);
  const [restaurantsList, setRestaurantsList] = useState<RestaurantSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState<"tiers" | "overrides" | "catalog">("tiers");
  const [searchQuery, setSearchQuery] = useState("");
  const [trialFilter, setTrialFilter] = useState<"all" | "trials_only" | "overrides_only">("all");

  // Quick edit modal state
  const [managingRestaurantId, setManagingRestaurantId] = useState<string | null>(null);
  const [showSelectModal, setShowSelectModal] = useState(false);
  const [modalSearch, setModalSearch] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [plansRes, restList] = await Promise.all([
        fetch("/api/superadmin/plans"),
        fetchRestaurants("month"),
      ]);

      if (!plansRes.ok) throw new Error("Failed to load subscription plans");
      const plansData = await plansRes.json();

      setPlans(plansData.plans || []);
      setFeatures(plansData.features || []);
      setOverrides(plansData.overrides || []);
      setRestaurantsList(restList || []);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const activeTrialsCount = useMemo(() => {
    return overrides.filter((o) => o.isTrialActive).length;
  }, [overrides]);

  const customOverridesCount = useMemo(() => {
    return overrides.filter((o) => o.overridesCount > 0).length;
  }, [overrides]);

  const filteredOverrides = useMemo(() => {
    return overrides.filter((row) => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        row.restaurantName.toLowerCase().includes(q) ||
        row.effectivePlanName.toLowerCase().includes(q) ||
        (row.notes && row.notes.toLowerCase().includes(q));

      if (!matchSearch) return false;

      if (trialFilter === "trials_only") {
        return row.isTrialActive;
      }
      if (trialFilter === "overrides_only") {
        return row.overridesCount > 0;
      }
      return true;
    });
  }, [overrides, searchQuery, trialFilter]);

  const filteredModalRestaurants = useMemo(() => {
    const q = modalSearch.toLowerCase();
    return restaurantsList.filter(
      (r) =>
        r.brandName.toLowerCase().includes(q) ||
        r.locationName.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)
    );
  }, [restaurantsList, modalSearch]);

  const selectedRestaurantName = useMemo(() => {
    if (!managingRestaurantId) return "";
    const found = restaurantsList.find((r) => r.id === managingRestaurantId);
    return found ? `${found.brandName} (${found.locationName})` : managingRestaurantId;
  }, [managingRestaurantId, restaurantsList]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      <TopBar
        title="Subscription Plans & Feature Gating"
        subtitle="Manage SaaS tier matrices, grant instant trial extensions, and override feature flags per restaurant"
        rightSlot={
          <div className="flex items-center gap-3">
            <button
              onClick={() => void loadData()}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
              title="Refresh Plan Data"
            >
              <RotateCw className="w-3.5 h-3.5" />
              Refresh
            </button>
            <button
              onClick={() => setShowSelectModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Manage Restaurant Flags
            </button>
          </div>
        }
      />

      <div className="px-6 py-6 max-w-7xl mx-auto space-y-6">
        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Available Tiers
              </span>
              <Layers className="w-4 h-4 text-slate-400" />
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-900">{plans.length} Tiers</p>
            <p className="mt-1 text-xs text-slate-500">Starter, Growth, Pro, Enterprise</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Feature Flags
              </span>
              <Sparkles className="w-4 h-4 text-orange-500" />
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-900">{features.length} Flags</p>
            <p className="mt-1 text-xs text-slate-500">Instant toggle across mobile & web</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Active Trials
              </span>
              <Clock className="w-4 h-4 text-blue-500" />
            </div>
            <p className="mt-3 text-2xl font-bold text-blue-600">{activeTrialsCount} Restaurants</p>
            <p className="mt-1 text-xs text-slate-500">Temporary premium feature access</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Custom Overrides
              </span>
              <SlidersHorizontal className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-900">{customOverridesCount} Configured</p>
            <p className="mt-1 text-xs text-slate-500">Custom flag rules or discounts</p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center justify-between border-b border-slate-200 pt-2 pb-0">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("tiers")}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === "tiers"
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Subscription Tier Matrix
            </button>
            <button
              onClick={() => setActiveTab("overrides")}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "overrides"
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Active Overrides & Trials
              <span className="px-1.5 py-0.5 text-xs font-bold rounded-full bg-slate-100 text-slate-700">
                {overrides.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("catalog")}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === "catalog"
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Feature Catalog & SDK Gates
            </button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Tab 1: Subscription Tier Matrix */}
        {activeTab === "tiers" && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Standard Plan Tier Catalog</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Base entitlements included by default with each subscription tier. All plans can be custom-overridden per restaurant.
                  </p>
                </div>
              </div>

              {/* Grid of Plans */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {plans.map((p) => {
                  const isPro = p.id === "pro";
                  const isEnterprise = p.id === "enterprise";
                  return (
                    <div
                      key={p.id}
                      className={`relative flex flex-col justify-between rounded-xl border p-5 transition-shadow ${
                        isPro
                          ? "border-orange-300 bg-white ring-1 ring-orange-200 shadow-sm"
                          : "border-slate-200 bg-white hover:shadow-sm"
                      }`}
                    >
                      {isPro && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-orange-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-sm">
                          Most Popular
                        </div>
                      )}
                      {isEnterprise && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-sm">
                          Full Platform
                        </div>
                      )}

                      <div>
                        <div className="flex items-center justify-between">
                          <h4 className="text-base font-bold text-slate-900">{p.name}</h4>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                            {p.id}
                          </span>
                        </div>

                        <div className="mt-4 flex items-baseline">
                          <span className="text-2xl font-black text-slate-900">
                            ₹{p.priceMonthly.toLocaleString("en-IN")}
                          </span>
                          <span className="text-xs text-slate-500 font-medium ml-1">/month</span>
                        </div>

                        <p className="mt-2 text-xs text-slate-600 leading-relaxed min-h-[36px]">
                          {p.description}
                        </p>

                        <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Tables:</span>
                            <span className="font-semibold text-slate-700">
                              {(p.limits?.tables ?? 20) >= 9999 ? "Unlimited" : `Up to ${p.limits?.tables ?? 20}`}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Staff Accounts:</span>
                            <span className="font-semibold text-slate-700">
                              {(p.limits?.staff ?? 5) >= 9999 ? "Unlimited" : `Up to ${p.limits?.staff ?? 5}`}
                            </span>
                          </div>
                        </div>

                        <div className="mt-5 pt-4 border-t border-slate-100">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Included Capabilities
                          </span>
                          <ul className="mt-3 space-y-2">
                            {features.map((f) => {
                              const included = p.features?.includes(f.key);
                              return (
                                <li
                                  key={f.key}
                                  className={`flex items-start gap-2 text-xs ${
                                    included ? "text-slate-800" : "text-slate-300"
                                  }`}
                                >
                                  {included ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                  ) : (
                                    <X className="w-3.5 h-3.5 text-slate-200 shrink-0 mt-0.5" />
                                  )}
                                  <span className={included ? "font-medium" : "line-through text-slate-300"}>
                                    {f.name}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Active Overrides & Trials */}
        {activeTab === "overrides" && (
          <div className="space-y-4">
            {/* Search and Filters */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search restaurants, plans, notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={trialFilter}
                  onChange={(e: any) => setTrialFilter(e.target.value)}
                  className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="all">All Overridden Restaurants ({overrides.length})</option>
                  <option value="trials_only">Active Trials Only ({activeTrialsCount})</option>
                  <option value="overrides_only">Custom Flag Overrides ({customOverridesCount})</option>
                </select>
              </div>
            </div>

            {/* Overrides Table */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-5 py-3.5 font-bold uppercase tracking-wider text-slate-500">Restaurant</th>
                      <th className="px-5 py-3.5 font-bold uppercase tracking-wider text-slate-500">Effective Plan</th>
                      <th className="px-5 py-3.5 font-bold uppercase tracking-wider text-slate-500">Trial Status</th>
                      <th className="px-5 py-3.5 font-bold uppercase tracking-wider text-slate-500">Feature Overrides</th>
                      <th className="px-5 py-3.5 font-bold uppercase tracking-wider text-slate-500">Internal Notes</th>
                      <th className="px-5 py-3.5 font-bold uppercase tracking-wider text-slate-500">Updated</th>
                      <th className="px-5 py-3.5 text-right font-bold uppercase tracking-wider text-slate-500">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredOverrides.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                          <SlidersHorizontal className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="font-medium text-slate-600">No matching overrides found</p>
                          <p className="text-xs text-slate-400 mt-1">
                            Click &ldquo;Manage Restaurant Flags&rdquo; above to assign a custom tier or trial.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredOverrides.map((row) => {
                        const trialDate = row.trialEndsAt ? new Date(row.trialEndsAt) : null;
                        const trialDaysRemaining = trialDate
                          ? Math.ceil((trialDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                          : null;

                        return (
                          <tr key={row.restaurantId} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-5 py-4">
                              <Link
                                href={`/restaurants/${row.restaurantId}`}
                                className="font-bold text-slate-900 hover:text-orange-600 transition-colors flex items-center gap-1.5"
                              >
                                {row.restaurantName}
                                <ExternalLink className="w-3 h-3 text-slate-400" />
                              </Link>
                              <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                                {row.restaurantId}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-800">
                                {row.effectivePlanName}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              {row.isTrialActive ? (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                  <Clock className="w-3 h-3 text-blue-600" />
                                  <span>
                                    {trialDaysRemaining !== null && trialDaysRemaining > 0
                                      ? `${trialDaysRemaining}d remaining`
                                      : "Expires today"}
                                  </span>
                                </div>
                              ) : row.trialEndsAt ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-400">
                                  Trial Expired
                                </span>
                              ) : (
                                <span className="text-slate-400 text-xs">Standard</span>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              {row.overridesCount > 0 ? (
                                <div className="flex flex-wrap gap-1 max-w-xs">
                                  {row.enabledOverrides.map((k) => {
                                    const feat = features.find((f) => f.key === k);
                                    return (
                                      <span
                                        key={k}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      >
                                        <Check className="w-2.5 h-2.5" />
                                        {feat?.name || k}
                                      </span>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span className="text-slate-400 text-xs">Tier defaults</span>
                              )}
                            </td>
                            <td className="px-5 py-4 max-w-xs truncate text-slate-600" title={row.notes || ""}>
                              {row.notes ? row.notes : <span className="text-slate-300 italic">None</span>}
                            </td>
                            <td className="px-5 py-4 text-slate-500 whitespace-nowrap">
                              <div>{new Date(row.updatedAt).toLocaleDateString()}</div>
                              {row.updatedBy && (
                                <div className="text-[10px] text-slate-400">by {row.updatedBy}</div>
                              )}
                            </td>
                            <td className="px-5 py-4 text-right">
                              <button
                                onClick={() => setManagingRestaurantId(row.restaurantId)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                              >
                                <SlidersHorizontal className="w-3 h-3" />
                                Edit Flags
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Feature Catalog & SDK Gates */}
        {activeTab === "catalog" && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <div className="mb-6">
                <h3 className="text-base font-bold text-slate-900">Feature Gate Directory & SDK Usage</h3>
                <p className="text-xs text-slate-500 mt-1">
                  All 12 feature gates are evaluated server-side and exposed to client apps via{" "}
                  <code className="text-orange-600 bg-orange-50 px-1 py-0.5 rounded font-mono">
                    GET /api/features?restaurantId=...
                  </code>
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {features.map((f) => {
                  const basePlan = plans.find((p) => p.features?.includes(f.key));
                  return (
                    <div
                      key={f.key}
                      className="border border-slate-200 rounded-xl p-4 bg-white hover:border-slate-300 transition-colors flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-sm text-slate-900">{f.name}</span>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                              f.category === "catalog"
                                ? "bg-slate-100 text-slate-700"
                                : f.category === "marketing"
                                ? "bg-purple-50 text-purple-700 border border-purple-200"
                                : f.category === "operations"
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}
                          >
                            {f.category}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 mt-2 leading-relaxed">{f.description}</p>

                        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                          <span>Base Tier:</span>
                          <span className="font-semibold text-slate-700 capitalize">
                            {basePlan ? basePlan.name : "Enterprise"}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-100 bg-slate-50/80 -mx-4 -mb-4 px-4 py-2.5 rounded-b-xl flex items-center justify-between">
                        <span className="text-[10px] font-mono text-slate-500 truncate">
                          key: &ldquo;{f.key}&rdquo;
                        </span>
                        <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Live Gated
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* API Integration Snippet */}
              <div className="mt-8 border border-slate-200 rounded-xl p-5 bg-slate-900 text-slate-100 font-mono text-xs shadow-sm">
                <div className="flex items-center justify-between text-slate-400 mb-3 text-[11px] uppercase tracking-wider font-sans font-bold">
                  <span>Client-Side Feature Check (React / React Native)</span>
                  <span>TypeScript</span>
                </div>
                <pre className="overflow-x-auto text-slate-300 leading-relaxed">
{`// 1. Fetch effective features for restaurant
const res = await fetch(\`/api/features?restaurantId=\${restaurantId}\`);
const { features, effectivePlan, isTrialActive } = await res.json();

// 2. Check gated capabilities
if (features.ar_menu_3d) {
  render3DModelViewer();
} else {
  renderUpsellModal({ feature: "3D AR Menu", requiredPlan: "pro" });
}`}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Select Restaurant Modal (to manage flags for any restaurant) */}
      {showSelectModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Select Restaurant</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Choose a restaurant to adjust subscription plan and feature flags
                </p>
              </div>
              <button
                onClick={() => {
                  setShowSelectModal(false);
                  setModalSearch("");
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search restaurant by name or ID..."
                value={modalSearch}
                onChange={(e) => setModalSearch(e.target.value)}
                autoFocus
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
              />
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
              {filteredModalRestaurants.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">No restaurants found</div>
              ) : (
                filteredModalRestaurants.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setShowSelectModal(false);
                      setModalSearch("");
                      setManagingRestaurantId(r.id);
                    }}
                    className="w-full text-left p-3 hover:bg-slate-50 transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <div className="font-semibold text-xs text-slate-900 group-hover:text-orange-600 transition-colors">
                        {r.brandName} · {r.locationName}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{r.id}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                        {r.plan}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Embedded Feature Manager Modal */}
      {managingRestaurantId && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full p-6 shadow-2xl my-8 relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Feature Flag Editor
                </span>
                <h3 className="text-lg font-bold text-slate-900">{selectedRestaurantName}</h3>
              </div>
              <button
                onClick={() => {
                  setManagingRestaurantId(null);
                  void loadData();
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <RestaurantFeatureManager
              restaurantId={managingRestaurantId}
              onPlanChanged={() => {
                void loadData();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
