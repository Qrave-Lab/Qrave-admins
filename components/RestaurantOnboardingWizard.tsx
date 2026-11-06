"use client";

import { notify } from "@/lib/ui/feedback";

import { useState } from "react";
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Store,
  Grid3X3,
  Utensils,
  Shield,
  Printer,
  X,
  Loader2,
} from "lucide-react";
import TableQrPackModal from "./TableQrPackModal";

interface OnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const MENU_THEMES = [
  {
    id: "cafe",
    name: "Cafe & Specialty Coffee",
    desc: "Espresso, lattes, sourdough toasts, panini, and Belgian waffles",
    itemsCount: 5,
    categories: ["Signature Coffees", "Breakfast & Sandwiches", "Desserts"],
    badge: "Most Popular",
  },
  {
    id: "fast_food",
    name: "Burgers & Quick Service",
    desc: "Smash burgers, loaded truffle fries, chicken tenders, thickshakes",
    itemsCount: 5,
    categories: ["Burgers & Wraps", "Loaded Fries", "Thick Shakes"],
    badge: "High Velocity",
  },
  {
    id: "indian_fine_dining",
    name: "Indian Dining & Tandoor",
    desc: "Galouti kebabs, butter chicken, dal makhani, dum biryani, artisan naan",
    itemsCount: 6,
    categories: ["Starters", "Curries", "Breads & Biryani"],
    badge: "Full Service",
  },
  {
    id: "pizzeria",
    name: "Pizzeria & Italian Bistro",
    desc: "Neapolitan wood-fired pizzas, handmade pasta, mocktails",
    itemsCount: 5,
    categories: ["Pizzas", "Pastas", "Beverages"],
    badge: "Casual Dine",
  },
  {
    id: "blank",
    name: "Blank Starter (Empty)",
    desc: "Seeds 3 default categories without dishes. Clean slate.",
    itemsCount: 0,
    categories: ["Starters", "Mains", "Beverages"],
    badge: "Custom",
  },
];

export default function RestaurantOnboardingWizard({
  isOpen,
  onClose,
  onSuccess,
}: OnboardingWizardProps) {
  const [step, setStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [brandName, setBrandName] = useState("");
  const [locationName, setLocationName] = useState("");
  const [currency, setCurrency] = useState("INR");

  const [tableCount, setTableCount] = useState<number>(15);
  const [sections, setSections] = useState<string[]>(["Main Dining", "Terrace"]);
  const [newSectionInput, setNewSectionInput] = useState("");

  const [menuTemplate, setMenuTemplate] = useState("cafe");

  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [plan, setPlan] = useState("pro");
  const [trialDays, setTrialDays] = useState<number>(14);

  // Result state
  const [createdResult, setCreatedResult] = useState<any | null>(null);
  const [qrPackOpen, setQrPackOpen] = useState(false);

  if (!isOpen) return null;

  const toggleSection = (sec: string) => {
    if (sections.includes(sec)) {
      if (sections.length > 1) {
        setSections(sections.filter((s) => s !== sec));
      }
    } else {
      setSections([...sections, sec]);
    }
  };

  const addCustomSection = () => {
    const trimmed = newSectionInput.trim();
    if (trimmed && !sections.includes(trimmed)) {
      setSections([...sections, trimmed]);
      setNewSectionInput("");
    }
  };

  const handleFinish = async () => {
    if (!brandName.trim() || !ownerEmail.trim() || !ownerPassword.trim()) {
      notify.error("Please fill in Brand Name, Owner Email, and Owner Password.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/superadmin/restaurants/wizard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: brandName.trim(),
          locationName: locationName.trim(),
          currency,
          tableCount,
          sections,
          menuTemplate,
          ownerEmail: ownerEmail.trim(),
          ownerPassword: ownerPassword.trim(),
          plan,
          trialDays,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to onboard restaurant");
      }

      setCreatedResult(data);
      setStep(5); // Success step
      onSuccess();
    } catch (err: any) {
      notify.error(err.message || "Failed to complete onboarding");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
        <div className="flex h-full max-h-[92vh] w-full max-w-3xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl">
          {/* Header & Steps */}
          <div className="border-b border-slate-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-lg font-black text-slate-900">1-Click Restaurant Onboarding</span>
                <p className="text-xs text-slate-500">
                  Provision store, generate table layout, seed starter menu, and issue QR pack
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            {/* Step Pills */}
            {step < 5 && (
              <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                {[
                  { num: 1, label: "Identity", icon: Store },
                  { num: 2, label: "Tables & Layout", icon: Grid3X3 },
                  { num: 3, label: "Starter Menu", icon: Utensils },
                  { num: 4, label: "Plan & Access", icon: Shield },
                ].map((s) => {
                  const Icon = s.icon;
                  const isActive = step === s.num;
                  const isDone = step > s.num;
                  return (
                    <div
                      key={s.num}
                      className={`flex flex-1 items-center gap-2 rounded-xl p-2 text-xs font-bold transition-all ${
                        isActive
                          ? "bg-slate-900 text-white"
                          : isDone
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : "bg-slate-50 text-slate-400"
                      }`}
                    >
                      <div className={`flex h-6 w-6 items-center justify-center rounded-lg text-[11px] font-black ${
                        isActive ? "bg-white text-slate-900" : isDone ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"
                      }`}>
                        {isDone ? <Check size={12} strokeWidth={3} /> : s.num}
                      </div>
                      <span className="hidden sm:inline">{s.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* ── STEP 1: Identity ── */}
            {step === 1 && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900">Step 1: Restaurant Identity</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Brand / Business Name *
                    </label>
                    <input
                      type="text"
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      placeholder="e.g. Blue Tokai Coffee Roasters"
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-slate-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Location / Outlet Name
                    </label>
                    <input
                      type="text"
                      value={locationName}
                      onChange={(e) => setLocationName(e.target.value)}
                      placeholder="e.g. Indiranagar, Bangalore"
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-slate-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Billing Currency
                    </label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-slate-500 focus:outline-none"
                    >
                      <option value="INR">INR (₹) - Indian Rupee</option>
                      <option value="USD">USD ($) - US Dollar</option>
                      <option value="EUR">EUR (€) - Euro</option>
                      <option value="AED">AED (د.إ) - UAE Dirham</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 2: Tables & Layout ── */}
            {step === 2 && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Step 2: Table Provisioning & Sections</h3>
                    <p className="text-xs text-slate-500">Configure initial table capacity and floor assignments</p>
                  </div>
                  <span className="rounded-xl bg-slate-900 px-3 py-1 font-mono text-sm font-black text-white">
                    {tableCount} Tables
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Initial Table Count (1 to 50)
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={tableCount}
                    onChange={(e) => setTableCount(Number(e.target.value))}
                    className="w-full accent-slate-900"
                  />
                  <div className="mt-1 flex justify-between text-[11px] font-semibold text-slate-400">
                    <span>1 Table</span>
                    <span>15 Standard</span>
                    <span>30 Mid-size</span>
                    <span>50 Large</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Floor Sections (Tables will be distributed across these)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {["Main Dining", "Terrace", "AC Floor", "Balcony", "Bar Counter", "Garden Patio"].map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => toggleSection(sec)}
                        className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all border ${
                          sections.includes(sec)
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {sec} {sections.includes(sec) ? "✓" : "+"}
                      </button>
                    ))}
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="text"
                      value={newSectionInput}
                      onChange={(e) => setNewSectionInput(e.target.value)}
                      placeholder="Add custom section..."
                      className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs focus:border-slate-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={addCustomSection}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 3: Starter Menu ── */}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Step 3: Starter Menu Template</h3>
                  <p className="text-xs text-slate-500">Pick a starter cuisine to pre-populate live categories and dishes</p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {MENU_THEMES.map((theme) => {
                    const isSelected = menuTemplate === theme.id;
                    return (
                      <div
                        key={theme.id}
                        onClick={() => setMenuTemplate(theme.id)}
                        className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                          isSelected
                            ? "border-slate-900 bg-slate-50 ring-2 ring-slate-900 shadow-xs"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-slate-900">{theme.name}</span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                            {theme.badge}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-600 leading-relaxed">{theme.desc}</p>
                        <div className="mt-3 flex flex-wrap gap-1">
                          {theme.categories.map((cat) => (
                            <span key={cat} className="rounded bg-white px-1.5 py-0.5 text-[11px] font-medium text-slate-500 border border-slate-200">
                              {cat}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── STEP 4: Owner & Plan ── */}
            {step === 4 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Step 4: Owner Credentials & Subscription Tier</h3>
                  <p className="text-xs text-slate-500">Set up operator credentials and trial gating</p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Owner Email *
                    </label>
                    <input
                      type="email"
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      placeholder="owner@restaurant.com"
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-slate-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Initial Password *
                    </label>
                    <input
                      type="password"
                      value={ownerPassword}
                      onChange={(e) => setOwnerPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-slate-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Initial Subscription Plan
                    </label>
                    <select
                      value={plan}
                      onChange={(e) => setPlan(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-slate-500 focus:outline-none"
                    >
                      <option value="starter">Starter (₹499/mo - Basic Ordering)</option>
                      <option value="growth">Growth (₹999/mo - Campaigns & Alerts)</option>
                      <option value="pro">Pro (₹1,499/mo - 3D AR Menu & Analytics)</option>
                      <option value="enterprise">Enterprise (₹4,999/mo - Multi-outlet, SLA)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Free Trial Period (Days)
                    </label>
                    <select
                      value={trialDays}
                      onChange={(e) => setTrialDays(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-slate-500 focus:outline-none"
                    >
                      <option value="7">7 Days Instant Trial</option>
                      <option value="14">14 Days Standard Trial</option>
                      <option value="30">30 Days Extended Trial</option>
                      <option value="0">Zero Trial (Direct Active)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 5: Success Screen ── */}
            {step === 5 && createdResult && (
              <div className="py-6 text-center space-y-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
                  <Check size={32} strokeWidth={2.5} />
                </div>
                <h3 className="text-xl font-black text-slate-900">
                  {createdResult.restaurantName} Successfully Onboarded!
                </h3>
                <p className="mx-auto max-w-md text-xs text-slate-500">
                  Tables 1 to {createdResult.tableCount} provisioned, starter menu seeded, and owner account configured.
                </p>

                <div className="mx-auto max-w-sm rounded-xl border border-slate-200 bg-slate-50 p-4 text-left text-xs space-y-1.5 font-medium text-slate-700">
                  <div><span className="font-bold">Store ID:</span> <span className="font-mono text-[11px]">{createdResult.restaurantId}</span></div>
                  <div><span className="font-bold">Owner Email:</span> {createdResult.ownerEmail}</div>
                  <div><span className="font-bold">Total Tables:</span> {createdResult.tableCount}</div>
                  <div><span className="font-bold">Menu Theme:</span> {createdResult.menuTemplate}</div>
                </div>

                <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQrPackOpen(true)}
                    className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition-colors"
                  >
                    <Printer size={16} />
                    <span>Open Print-Ready Table QR Pack</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    Done & View Stores
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer Navigation */}
          {step < 5 && (
            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/50 px-6 py-4">
              <button
                type="button"
                disabled={step === 1 || submitting}
                onClick={() => setStep((s) => Math.max(1, s - 1))}
                className="flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft size={16} />
                <span>Back</span>
              </button>

              {step < 4 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => Math.min(4, s + 1))}
                  className="flex items-center gap-1 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors"
                >
                  <span>Continue</span>
                  <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleFinish}
                  className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-60 transition-colors"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Provisioning Restaurant...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>Complete Onboarding & Generate QRs</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Embedded Table QR Pack Modal on Success */}
      {qrPackOpen && createdResult && (
        <TableQrPackModal
          restaurantId={createdResult.restaurantId}
          restaurantName={createdResult.restaurantName}
          initialTables={createdResult.tables}
          onClose={() => setQrPackOpen(false)}
        />
      )}
    </>
  );
}
