"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { ArrowLeft, BarChart3, ExternalLink, Megaphone, QrCode, Settings, Store, Users } from "lucide-react";
import TopBar from "@/components/TopBar";
import { Badge, Spinner, ToastProvider, errorText, useFoodCourtAccess } from "@/components/foodcourts/ui";
import OverviewTab from "@/components/foodcourts/OverviewTab";
import StallsTab from "@/components/foodcourts/StallsTab";
import OperatorsTab from "@/components/foodcourts/OperatorsTab";
import QRTab from "@/components/foodcourts/QRTab";
import AdsTab from "@/components/foodcourts/AdsTab";
import SettingsTab from "@/components/foodcourts/SettingsTab";
import { ApiError, TONE, billingState, dinerBaseUrl, foodCourts, type CourtDetail } from "@/lib/foodCourts";

const TABS = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "stalls", label: "Stalls", icon: Store },
  { id: "operators", label: "Operators", icon: Users },
  { id: "qr", label: "QR codes", icon: QrCode },
  { id: "ads", label: "Ads", icon: Megaphone },
  { id: "settings", label: "Settings", icon: Settings },
] as const;
type TabID = (typeof TABS)[number]["id"];

export default function FoodCourtPage() {
  return (
    <ToastProvider>
      <Suspense fallback={<Spinner />}>
        <FoodCourtDetail />
      </Suspense>
    </ToastProvider>
  );
}

function FoodCourtDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const params = useSearchParams();
  const requested = params.get("tab");
  const tab: TabID = TABS.some((t) => t.id === requested) ? (requested as TabID) : "overview";
  const { canManage } = useFoodCourtAccess();
  const [detail, setDetail] = useState<CourtDetail | null>(null);
  const [error, setError] = useState<{ status?: number; text: string } | null>(null);

  const reload = useCallback(async () => {
    try {
      setDetail(await foodCourts.detail(id));
      setError(null);
    } catch (e) {
      setError({ status: e instanceof ApiError ? e.status : undefined, text: errorText(e) });
    }
  }, [id]);
  useEffect(() => {
    let cancelled = false;
    foodCourts
      .detail(id)
      .then((d) => !cancelled && (setDetail(d), setError(null)))
      .catch((e) => !cancelled && setError({ status: e instanceof ApiError ? e.status : undefined, text: errorText(e) }));
    return () => {
      cancelled = true;
    };
  }, [id]);

  const setTab = (t: TabID) => router.replace(`/food-courts/${id}${t === "overview" ? "" : `?tab=${t}`}`, { scroll: false });

  if (error && !detail) {
    return (
      <section className="mx-auto max-w-7xl px-6 py-16 text-center">
        <p className="text-lg font-semibold text-slate-900">{error.status === 404 ? "Food court not found" : "Couldn't load this food court"}</p>
        <p className="mt-1 text-sm text-slate-500">{error.status === 404 ? "It may have been removed." : error.text}</p>
        <Link href="/food-courts" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-slate-900 underline">
          <ArrowLeft size={14} /> All food courts
        </Link>
      </section>
    );
  }
  if (!detail) return <Spinner />;

  const { court } = detail;
  const st = billingState(court);
  const dinerUrl = `${dinerBaseUrl()}/fc/${court.slug}`;
  const props = { detail, reload, canManage };

  return (
    <>
      <TopBar
        title={
          <div className="min-w-0">
            <Link href="/food-courts" className="mb-1 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800">
              <ArrowLeft size={13} /> Food courts
            </Link>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="truncate text-3xl font-bold tracking-tight text-brand-900">{court.name}</h1>
              <Badge className={TONE[st.tone]}>{st.label}</Badge>
            </div>
          </div>
        }
        subtitle={
          <p className="mt-1.5 text-sm font-medium text-brand-500">
            {[court.city, `${detail.stalls.length} ${detail.stalls.length === 1 ? "stall" : "stalls"}`, `${detail.operators.length} ${detail.operators.length === 1 ? "operator" : "operators"}`]
              .filter(Boolean)
              .join(" · ")}
          </p>
        }
        rightSlot={
          <a
            href={dinerUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Diner page <ExternalLink size={14} />
          </a>
        }
      />

      <div className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 backdrop-blur">
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-6 py-2" aria-label="Food court sections">
          {TABS.map(({ id: tid, label, icon: Icon }) => (
            <button
              key={tid}
              onClick={() => setTab(tid)}
              aria-current={tab === tid ? "page" : undefined}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
                tab === tid ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-white hover:text-slate-900"
              }`}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </nav>
      </div>

      <section className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        {court.isArchived && (
          <div className="rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 text-sm text-slate-700">
            This food court is archived. Diners see &ldquo;Menus are unavailable&rdquo;, operators can&apos;t sign in, and its stalls lose admin access. Restore it under Settings.
          </div>
        )}
        {!court.isArchived && !st.live && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Billing is {st.label.toLowerCase()}, so diners see &ldquo;Menus are unavailable&rdquo; and the stalls lose admin access. Update billing under Overview.
          </div>
        )}
        {tab === "overview" && <OverviewTab {...props} />}
        {tab === "stalls" && <StallsTab {...props} />}
        {tab === "operators" && <OperatorsTab {...props} />}
        {tab === "qr" && <QRTab {...props} />}
        {tab === "ads" && <AdsTab {...props} />}
        {tab === "settings" && <SettingsTab {...props} />}
      </section>
    </>
  );
}
