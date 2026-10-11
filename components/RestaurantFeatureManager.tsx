"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  Save,
  RotateCcw,
  SlidersHorizontal,
  Zap,
} from "lucide-react";
import { FeatureDefinition, PlanRecord, RestaurantEffectiveFeatures } from "@/lib/plans";

interface Props {
  restaurantId: string;
  onPlanChanged?: (newPlan: string) => void;
}

export default function RestaurantFeatureManager({ restaurantId, onPlanChanged }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [effective, setEffective] = useState<RestaurantEffectiveFeatures | null>(null);
  const [plans, setPlans] = useState<PlanRecord[]>([]);
  const [allFeatures, setAllFeatures] = useState<FeatureDefinition[]>([]);

  // Draft form states
  const [selectedPlan, setSelectedPlan] = useState<string>("starter");
  const [draftOverrides, setDraftOverrides] = useState<Record<string, boolean>>({});
  const [trialDays, setTrialDays] = useState<string>("none");
  const [customTrialDate, setCustomTrialDate] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/superadmin/restaurants/${restaurantId}/features`);
      if (res.ok) {
        const data = await res.json();
        setEffective(data.effective);
        setPlans(data.plans || []);
        setAllFeatures(data.allFeatures || []);

        // Initialize draft states
        setSelectedPlan(data.effective.effectivePlanId);
        setDraftOverrides(data.effective.overrides || {});
        setNotes(data.effective.notes || "");

        if (data.effective.trialEndsAt) {
          setCustomTrialDate(data.effective.trialEndsAt.split("T")[0]);
          setTrialDays("custom");
        } else {
          setTrialDays("none");
          setCustomTrialDate("");
        }
      } else {
        setError("Failed to load feature flags for this restaurant.");
      }
    } catch (err) {
      console.error(err);
      setError("Network error loading features.");
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleToggleFeature = (key: string) => {
    const currentPlanDef = plans.find((p) => p.id === selectedPlan);
    const includedInPlan = currentPlanDef?.features.includes(key) || false;

    setDraftOverrides((prev) => {
      const currentVal = prev[key];

      // If already explicitly overridden, toggle or clear
      if (typeof currentVal === "boolean") {
        if (currentVal === true) {
          // Switch to explicitly false
          return { ...prev, [key]: false };
        } else {
          // Remove override (revert to plan default)
          const copy = { ...prev };
          delete copy[key];
          return copy;
        }
      } else {
        // Not currently overridden: if included in plan, override to false; if not in plan, override to true
        return { ...prev, [key]: !includedInPlan };
      }
    });
  };

  const handleResetToPlanDefaults = () => {
    setDraftOverrides({});
    setTrialDays("none");
    setCustomTrialDate("");
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccessMsg("");

    let calculatedTrialDate: string | null = null;
    if (trialDays === "7") {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      calculatedTrialDate = d.toISOString();
    } else if (trialDays === "14") {
      const d = new Date();
      d.setDate(d.getDate() + 14);
      calculatedTrialDate = d.toISOString();
    } else if (trialDays === "30") {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      calculatedTrialDate = d.toISOString();
    } else if (trialDays === "custom" && customTrialDate) {
      calculatedTrialDate = new Date(`${customTrialDate}T23:59:59Z`).toISOString();
    }

    try {
      const res = await fetch(`/api/superadmin/restaurants/${restaurantId}/features`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customPlan: selectedPlan,
          overrides: draftOverrides,
          trialEndsAt: calculatedTrialDate,
          notes: notes.trim() || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setEffective(data.effective);
        setSuccessMsg("Plan gating & feature flags updated successfully!");
        if (onPlanChanged) onPlanChanged(selectedPlan);
        setTimeout(() => setSuccessMsg(""), 4000);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save feature flags");
      }
    } catch {
      setError("Network error saving feature changes.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-4 animate-pulse">
          <div className="h-5 w-48 bg-slate-200 rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const selectedPlanDef = plans.find((p) => p.id === selectedPlan);
  const planFeatures = selectedPlanDef?.features || [];

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-100 px-6 py-5 bg-slate-50/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-orange-100 text-orange-700">
                <SlidersHorizontal size={17} />
              </span>
              <h3 className="text-base font-bold text-slate-900">
                Plan Gating & Feature Flags
              </h3>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Run selective trials, gate advanced capabilities, and upsell tiers without code changes.
            </p>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-2">
            {effective?.isTrialActive && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-200">
                <Clock size={13} />
                <span>
                  Active Trial until{" "}
                  {effective.trialEndsAt ? new Date(effective.trialEndsAt).toLocaleDateString() : ""}
                </span>
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200 uppercase">
              Current: {effective?.effectivePlanName}
            </span>
          </div>
        </div>
      </div>

      {/* Plan & Trial Controls Row */}
      <div className="p-6 border-b border-slate-100 bg-white grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Tier Selector */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Subscription Plan Tier
          </label>
          <select
            value={selectedPlan}
            onChange={(e) => setSelectedPlan(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-sm font-semibold text-slate-900 focus:bg-white focus:border-slate-900 focus:outline-none transition-all"
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} (₹{p.priceMonthly.toLocaleString()}/mo)
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-[11px] text-slate-500">
            {selectedPlanDef?.description}
          </p>
        </div>

        {/* Temporary Trial Preset */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Trial Expiry Window
          </label>
          <select
            value={trialDays}
            onChange={(e) => setTrialDays(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-sm font-semibold text-slate-900 focus:bg-white focus:border-slate-900 focus:outline-none transition-all"
          >
            <option value="none">No Expiration (Permanent)</option>
            <option value="7">7-Day Feature Trial</option>
            <option value="14">14-Day Feature Trial</option>
            <option value="30">30-Day Feature Trial</option>
            <option value="custom">Custom Date</option>
          </select>

          {trialDays === "custom" && (
            <input
              type="date"
              value={customTrialDate}
              onChange={(e) => setCustomTrialDate(e.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs font-medium text-slate-800 focus:outline-none"
            />
          )}
          <p className="mt-1.5 text-[11px] text-slate-500">
            Automates duration for upsell promotions and trial access.
          </p>
        </div>

        {/* Notes / Reason */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Operator Audit Note
          </label>
          <input
            type="text"
            placeholder="e.g. Granted 14-day 3D AR trial for owner evaluation"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-xs text-slate-900 focus:bg-white focus:border-slate-900 focus:outline-none transition-all"
          />
          <p className="mt-1.5 text-[11px] text-slate-500">
            Visible in Audit Trail logs for compliance and sales tracking.
          </p>
        </div>
      </div>

      {/* Feature Flags Grid */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Granular Feature Matrix ({allFeatures.length} Capabilities)
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any toggle to manually grant trial access or restrict specific tools for this restaurant.
            </p>
          </div>

          {Object.keys(draftOverrides).length > 0 && (
            <button
              type="button"
              onClick={handleResetToPlanDefaults}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-red-600 transition-colors"
            >
              <RotateCcw size={13} />
              <span>Reset to Plan Defaults</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {allFeatures.map((feat) => {
            const includedInSelectedPlan = planFeatures.includes(feat.key);
            const overrideVal = draftOverrides[feat.key];

            const isEffectiveOn =
              typeof overrideVal === "boolean" ? overrideVal : includedInSelectedPlan;

            const isOverridden = typeof overrideVal === "boolean";

            return (
              <div
                key={feat.key}
                onClick={() => handleToggleFeature(feat.key)}
                className={`relative flex flex-col justify-between rounded-xl border p-4 transition-all duration-150 cursor-pointer select-none ${
                  isEffectiveOn
                    ? "border-slate-300 bg-white hover:border-slate-400 shadow-xs"
                    : "border-slate-200/80 bg-slate-50/60 hover:bg-white text-slate-400"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={`text-xs font-bold leading-tight ${
                        isEffectiveOn ? "text-slate-900" : "text-slate-600"
                      }`}
                    >
                      {feat.name}
                    </span>

                    {/* Modern Toggle Switch */}
                    <div
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out ${
                        isEffectiveOn ? "bg-emerald-500" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out mt-0.5 ${
                          isEffectiveOn ? "translate-x-4.5 ml-0.5" : "translate-x-0.5"
                        }`}
                      />
                    </div>
                  </div>

                  <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
                    {feat.description}
                  </p>
                </div>

                {/* Status Badges */}
                <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
                  <span className="font-mono text-slate-400">{feat.key}</span>
                  {isOverridden ? (
                    overrideVal ? (
                      <span className="inline-flex items-center gap-1 font-bold text-orange-600">
                        <Sparkles size={11} /> Manual Override (Enabled)
                      </span>
                    ) : (
                      <span className="font-bold text-rose-600">
                        Manual Override (Disabled)
                      </span>
                    )
                  ) : includedInSelectedPlan ? (
                    <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                      <CheckCircle2 size={11} /> Included in Plan
                    </span>
                  ) : (
                    <span className="text-slate-400 font-medium">Not in Plan</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Footer */}
      <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          {error && (
            <p className="text-xs font-semibold text-rose-600 flex items-center gap-1">
              <AlertCircle size={14} /> {error}
            </p>
          )}
          {successMsg && (
            <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
              <CheckCircle2 size={14} /> {successMsg}
            </p>
          )}
          {!error && !successMsg && (
            <p className="text-xs text-slate-500">
              Changes take effect immediately across all dining room tablet and mobile applications.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF5500] hover:bg-[#E64D00] px-5 py-2.5 text-xs font-bold text-white shadow-xs transition-colors disabled:opacity-60"
        >
          {saving ? (
            <>
              <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Applying Gating...</span>
            </>
          ) : (
            <>
              <Save size={14} />
              <span>Save & Apply Feature Flags</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
