"use client";

import { useEffect, useState, useMemo } from "react";
import { generateQrSvg } from "@/lib/qr";
import { Printer, Download, Copy, Check, ExternalLink, SlidersHorizontal, X } from "lucide-react";
import { DEFAULT_DINER_APP_URL, dinerBaseUrl } from "@/lib/dinerUrl";
import { tableQrUrl } from "@/lib/tableQrUrl";

interface TableInfo {
  id: string;
  table_number?: number;
  tableNumber?: number;
  floor_name?: string;
  floorName?: string;
  capacity?: number;
  qrUrl?: string;
  qrToken?: string;
}

interface TableQrPackModalProps {
  restaurantId: string;
  restaurantName: string;
  initialTables?: TableInfo[];
  onClose: () => void;
}

export default function TableQrPackModal({
  restaurantId,
  restaurantName,
  initialTables,
  onClose,
}: TableQrPackModalProps) {
  const [tables, setTables] = useState<TableInfo[]>(initialTables || []);
  const [loading, setLoading] = useState(!initialTables || initialTables.length === 0);
  const [baseUrl, setBaseUrl] = useState(dinerBaseUrl());
  const [selectedSection, setSelectedSection] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!initialTables || initialTables.length === 0) {
      void fetchTables();
    }
  }, [restaurantId]);

  const fetchTables = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/superadmin/restaurants/${restaurantId}/tables?baseUrl=${encodeURIComponent(baseUrl)}`);
      if (res.ok) {
        const data = await res.json();
        setTables(data.tables || []);
      }
    } catch (err) {
      console.error("Failed to load tables:", err);
    } finally {
      setLoading(false);
    }
  };

  const sections = useMemo(() => {
    const set = new Set<string>();
    tables.forEach((t) => {
      const s = t.floor_name || t.floorName;
      if (s) set.add(s);
    });
    return Array.from(set);
  }, [tables]);

  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      if (selectedSection === "all") return true;
      const s = t.floor_name || t.floorName;
      return s === selectedSection;
    });
  }, [tables, selectedSection]);

  const copyQrLink = (tableNum: number, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(String(tableNum));
    setTimeout(() => setCopiedId(null), 2000);
  };

  const downloadSvg = (tableNum: number, qrUrl: string) => {
    const svgStr = generateQrSvg(qrUrl, { margin: 3 });
    const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${restaurantName.replace(/\s+/g, "_")}_Table_${tableNum}_QR.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* ── Global Print Stylesheet ── */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-qr-pack, #print-qr-pack * {
            visibility: visible;
          }
          #print-qr-pack {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
          }
          .no-print {
            display: none !important;
          }
          .print-card {
            page-break-inside: avoid;
            break-inside: avoid;
            box-shadow: none !important;
            border: 2px solid #0f172a !important;
            margin-bottom: 20px !important;
          }
        }
      `}</style>

      {/* ── Modal Overlay ── */}
      <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
        <div className="flex h-full max-h-[92vh] w-full max-w-5xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl">
          {/* Header */}
          <div className="no-print flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black text-slate-900">Print-Ready Table QR Pack</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                  {tables.length} Tables
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                {restaurantName} · Formatted for instant high-res tent card printing & SVG exports
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition-colors"
              >
                <Printer size={15} />
                <span>Print Table Pack</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-6 py-3 text-xs">
            {/* Section tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className="font-semibold text-slate-500 mr-1 flex items-center gap-1">
                <SlidersHorizontal size={13} /> Section:
              </span>
              <button
                onClick={() => setSelectedSection("all")}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
                  selectedSection === "all"
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                All ({tables.length})
              </button>
              {sections.map((sec) => (
                <button
                  key={sec}
                  onClick={() => setSelectedSection(sec)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
                    selectedSection === sec
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {sec} ({tables.filter((t) => (t.floor_name || t.floorName) === sec).length})
                </button>
              ))}
            </div>

            {/* Base URL input */}
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-500">Diner App URL:</span>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                className="w-56 rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-mono text-xs focus:border-slate-500 focus:outline-none"
                placeholder={DEFAULT_DINER_APP_URL}
              />
            </div>
          </div>

          {/* Cards Content */}
          <div id="print-qr-pack" className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="py-20 text-center text-slate-500">Generating vector QR codes...</div>
            ) : filteredTables.length === 0 ? (
              <div className="py-20 text-center text-slate-500">No tables found.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredTables.map((t) => {
                  const num = t.table_number ?? t.tableNumber ?? 1;
                  const section = t.floor_name ?? t.floorName ?? "Main Dining";
                  // Built from the token so editing the diner site updates every code.
                  const targetUrl = t.qrToken ? tableQrUrl(baseUrl, t.qrToken) : t.qrUrl || "";
                  const svgDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(generateQrSvg(targetUrl, { margin: 3 }))}`;

                  return (
                    <div
                      key={t.id || num}
                      className="print-card relative flex flex-col items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-xs transition-shadow hover:shadow-md"
                    >
                      {/* Top Header */}
                      <div className="w-full pb-3 border-b border-slate-100">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          {restaurantName}
                        </div>
                        <div className="mt-1 flex items-center justify-center gap-1.5">
                          <span className="text-xl font-black tracking-tight text-slate-900">
                            TABLE {String(num).padStart(2, "0")}
                          </span>
                        </div>
                        <div className="mt-1">
                          <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600 border border-slate-200">
                            {section}
                          </span>
                        </div>
                      </div>

                      {/* QR Visual */}
                      <div className="my-4 flex items-center justify-center p-2 rounded-xl bg-slate-50 border border-slate-100">
                        <img
                          src={svgDataUrl}
                          alt={`QR Table ${num}`}
                          className="h-40 w-40 object-contain"
                        />
                      </div>

                      {/* Instructions */}
                      <div className="w-full">
                        <p className="text-[11px] font-semibold text-slate-700">
                          Scan with Phone Camera to Order
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5 font-mono truncate">
                          {targetUrl.replace(/^https?:\/\//, "")}
                        </p>
                      </div>

                      {/* Action buttons (hidden on print) */}
                      <div className="no-print mt-3 flex w-full items-center justify-center gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => copyQrLink(num, targetUrl)}
                          className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-50"
                          title="Copy Table URL"
                        >
                          {copiedId === String(num) ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                          <span>{copiedId === String(num) ? "Copied" : "Link"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadSvg(num, targetUrl)}
                          className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-50"
                          title="Download Vector SVG"
                        >
                          <Download size={12} />
                          <span>SVG</span>
                        </button>
                        <a
                          href={targetUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-50"
                          title="Test Order URL"
                        >
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="no-print flex items-center justify-between border-t border-slate-200 bg-slate-50/50 px-6 py-3 text-xs text-slate-500">
            <span>Tip: Print on standard paper or cardstock and fold into table tents or place in acrylic stands.</span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
