"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Mail, Send, RefreshCw } from "lucide-react";
import TopBar from "@/components/TopBar";
import { fetchRestaurants } from "@/lib/api";
import { RestaurantSummary } from "@/lib/types";

const defaultSubject = "Your Qrave plan is ending soon";
const defaultBody = `Hi {{owner_name}},

This is a reminder that your Qrave plan for {{restaurant_name}} is ending on {{expiry_date}}.
Please renew it to avoid service interruption.

Regards,
Qrave Billing`;

export default function OwnerMailPage() {
  const [restaurants, setRestaurants] = useState<RestaurantSummary[]>([]);
  const [selectedRestaurantID, setSelectedRestaurantID] = useState("");
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const rows = await fetchRestaurants("month");
        const owners = rows.filter((row) => row.ownerEmail);
        if (mounted) {
          setRestaurants(owners);
          setSelectedRestaurantID((current) => current || owners[0]?.id || "");
        }
      } catch {
        if (mounted) setFeedback("Failed to load restaurants.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const selectedRestaurant = useMemo(
    () => restaurants.find((row) => row.id === selectedRestaurantID) || null,
    [restaurants, selectedRestaurantID],
  );

  const sendMail = async () => {
    if (!selectedRestaurant) {
      setFeedback("Select a restaurant first.");
      return;
    }

    setSending(true);
    setFeedback("");
    try {
      const res = await fetch("/api/superadmin/owner-mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant_id: selectedRestaurant.id,
          subject,
          body,
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "Failed to send mail");
      }

      const payload = await res
        .json()
        .catch(() => ({}) as { recipient?: string });
      setFeedback(
        `Mail sent to ${payload.recipient || selectedRestaurant.ownerEmail}`,
      );
    } catch (error: any) {
      setFeedback(error?.message || "Failed to send mail");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <TopBar
        title="Owner Mail"
        subtitle="Send a custom billing reminder or message to a registered restaurant owner."
      />

      <section className="mx-auto max-w-4xl space-y-6 px-6 py-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
              <Mail size={18} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Compose mail
              </h2>
              <p className="text-sm text-slate-500">
                The email goes to the registered owner of the selected
                restaurant.
              </p>
            </div>
          </div>

          <div className="grid gap-5">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700">
                Restaurant
              </span>
              {loading ? (
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading restaurants...
                </div>
              ) : (
                <select
                  value={selectedRestaurantID}
                  onChange={(e) => setSelectedRestaurantID(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none ring-slate-200 transition focus:border-slate-900 focus:ring-2"
                >
                  <option value="">Select restaurant</option>
                  {restaurants.map((restaurant) => (
                    <option key={restaurant.id} value={restaurant.id}>
                      {restaurant.brandName} - {restaurant.ownerEmail}
                    </option>
                  ))}
                </select>
              )}
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700">
                Subject
              </span>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Your Qrave plan is ending soon"
                className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none ring-slate-200 transition focus:border-slate-900 focus:ring-2"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700">
                Message
              </span>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Hi {{owner_name}},\n\nYour plan for {{restaurant_name}} ends on {{expiry_date}}..."
                rows={10}
                className="rounded-2xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none ring-slate-200 transition focus:border-slate-900 focus:ring-2"
              />
            </label>

            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-xs text-slate-500">
              Placeholder tokens:{" "}
              <span className="font-semibold text-slate-700">
                {"{{owner_name}}"}
              </span>
              ,{" "}
              <span className="font-semibold text-slate-700">
                {"{{restaurant_name}}"}
              </span>
              ,{" "}
              <span className="font-semibold text-slate-700">
                {"{{expiry_date}}"}
              </span>
            </div>

            {selectedRestaurant && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Sending to{" "}
                <span className="font-semibold text-slate-900">
                  {selectedRestaurant.ownerEmail}
                </span>{" "}
                for{" "}
                <span className="font-semibold text-slate-900">
                  {selectedRestaurant.brandName}
                </span>
              </div>
            )}

            {feedback ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {feedback}
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setSubject(defaultSubject);
                  setBody(defaultBody);
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <RefreshCw size={15} />
                Reset template
              </button>
              <button
                type="button"
                onClick={sendMail}
                disabled={sending || !selectedRestaurant}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send size={16} />
                )}
                Send mail
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
