"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import TopBar from "@/components/TopBar";
import { fetchInvoices, fetchRestaurantDetail, setSubscriptionTier } from "@/lib/api";
import { SubscriptionInvoice, RestaurantDetail } from "@/lib/types";
import { CreditCard, FileText, Loader2, Save } from "lucide-react";

export default function RestaurantBillingPage() {
  const params = useParams<{ id: string }>();
  const id = String(params.id || "");

  const [detail, setDetail] = useState<RestaurantDetail | null>(null);
  const [invoices, setInvoices] = useState<SubscriptionInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [billingProvider, setBillingProvider] = useState<string>("stripe");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        const [d, invs] = await Promise.all([
          fetchRestaurantDetail(id, "month"),
          fetchInvoices(),
        ]);
        setDetail(d);
        // Filter invoices for this restaurant
        setInvoices(invs.filter((i) => i.restaurantId === id));
        setSelectedTier(d.restaurant.plan || "starter");
      } catch (err) {
        console.error("Failed to load billing data:", err);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id]);

  const handleSaveSubscription = async () => {
    if (!selectedTier) return;
    setSaving(true);
    try {
      // In a real app, tierID would be a UUID. For now, we mock it based on plan name.
      const mockTierId = "00000000-0000-0000-0000-000000000000"; 
      await setSubscriptionTier(id, mockTierId, billingProvider);
      alert("Subscription updated successfully!");
    } catch (err) {
      alert("Failed to update subscription.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !detail) {
    return (
      <div className="min-h-screen bg-slate-50/50 pb-12 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  const { restaurant } = detail;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12">
      <TopBar
        title={
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Billing & Subscriptions
          </h1>
        }
        subtitle={`Managing billing for ${restaurant.brandName} (${restaurant.locationName})`}
      />

      <div className="px-6 mt-6 mb-4">
        <Link
          href={`/restaurants/${id}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg"
        >
          <span aria-hidden="true">&larr;</span> Back to Overview
        </Link>
      </div>

      <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-3 gap-8 mt-4">
        {/* Subscription Control */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4 text-slate-800 font-bold">
              <CreditCard className="w-5 h-5 text-indigo-500" />
              <h3>Subscription Tier</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Plan Tier
                </label>
                <select
                  value={selectedTier || "starter"}
                  onChange={(e) => setSelectedTier(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm font-semibold outline-none focus:border-indigo-500"
                >
                  <option value="starter">Starter - Basic POS</option>
                  <option value="growth">Growth - Loyalty & CRM</option>
                  <option value="pro">Pro - White-label App</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Billing Provider
                </label>
                <select
                  value={billingProvider}
                  onChange={(e) => setBillingProvider(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm font-semibold outline-none focus:border-indigo-500"
                >
                  <option value="stripe">Stripe</option>
                  <option value="razorpay">Razorpay</option>
                </select>
              </div>

              <button
                onClick={handleSaveSubscription}
                disabled={saving}
                className="w-full flex justify-center items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 transition shadow-sm disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>

        {/* Invoice History */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-500" />
              <h3 className="font-bold text-slate-800">Invoice History</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase text-slate-500 tracking-wider font-semibold">
                  <tr>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Provider</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-500 italic">
                        No invoices found for this tenant.
                      </td>
                    </tr>
                  ) : (
                    invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 font-mono text-slate-600 text-xs">
                          {new Date(inv.createdAt).toLocaleDateString("en-IN")}
                        </td>
                        <td className="px-6 py-4 font-medium capitalize text-slate-700">
                          {inv.provider}
                        </td>
                        <td className="px-6 py-4 font-black text-slate-900">
                          ₹{(inv.amountCents / 100).toLocaleString("en-IN")}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                            inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                            inv.status === 'failed' ? 'bg-rose-100 text-rose-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {inv.hostedInvoiceUrl ? (
                            <a 
                              href={inv.hostedInvoiceUrl} 
                              target="_blank" 
                              rel="noreferrer"
                              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                            >
                              View PDF
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400 italic">N/A</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
