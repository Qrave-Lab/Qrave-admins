"use client";

import { useState } from "react";
import {
  FileSpreadsheet,
  Download,
  Calendar,
  X,
  Building2,
  FileText,
  DollarSign,
  Receipt,
  Percent,
} from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  restaurants?: Array<{ id: string; name: string }>;
}

export default function AccountantExportModal({ isOpen, onClose, restaurants = [] }: Props) {
  const [exportType, setExportType] = useState<string>("revenue_summary");
  const [rangePreset, setRangePreset] = useState<string>("month");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>("all");
  const [downloading, setDownloading] = useState(false);

  if (!isOpen) return null;

  const exportTypes = [
    {
      id: "revenue_summary",
      title: "Revenue & Sales Summary",
      desc: "Daily net revenue, gross GMV, estimated taxes, service charge, and payment mode breakdown.",
      icon: DollarSign,
      color: "text-emerald-600 bg-emerald-50 border-emerald-200",
    },
    {
      id: "transactions_ledger",
      title: "Transactions Audit Ledger",
      desc: "Granular payment log with Payment ID, Transaction Ref, Order ID, Mode, Gateway, and timestamp.",
      icon: Receipt,
      color: "text-blue-600 bg-blue-50 border-blue-200",
    },
    {
      id: "discounts_reconciliation",
      title: "Discounts & Coupons Reconciliation",
      desc: "Promotion write-off report detailing coupon codes, discount rates, and total absorbed values.",
      icon: Percent,
      color: "text-purple-600 bg-purple-50 border-purple-200",
    },
    {
      id: "gst_tax_schedule",
      title: "GST & Tax Filing Schedule",
      desc: "Monthly tax accounting report with taxable turnover, CGST (2.5%), SGST (2.5%), and total GST.",
      icon: FileSpreadsheet,
      color: "text-orange-600 bg-orange-50 border-orange-200",
    },
  ];

  const handleDownload = () => {
    setDownloading(true);
    let url = `/api/superadmin/export/csv?type=${exportType}&restaurantId=${selectedRestaurant}`;

    if (rangePreset === "custom" && startDate && endDate) {
      url += `&from=${startDate}&to=${endDate}`;
    } else {
      url += `&range=${rangePreset}`;
    }

    // Trigger direct browser file download
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `qrave-${exportType}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setDownloading(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-900 text-white">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Accountant & Financial CSV Export
              </h3>
              <p className="text-xs text-slate-500">
                Generate clean, RFC 4180 / Excel-compatible sheets for audit and tax reconciliation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Export Type Selection */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            1. Select Export Format
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {exportTypes.map((t) => {
              const Icon = t.icon;
              const isSelected = exportType === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setExportType(t.id)}
                  className={`text-left p-3 rounded-xl border transition-all ${
                    isSelected
                      ? "border-slate-900 bg-slate-50 ring-1 ring-slate-900"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg border ${t.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-xs text-slate-900">{t.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">{t.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Date Range Selection */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            2. Date Range & Period
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            {[
              { id: "week", label: "Last 7 Days" },
              { id: "month", label: "Last 30 Days" },
              { id: "quarter", label: "Quarter (90d)" },
              { id: "custom", label: "Custom Dates" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setRangePreset(p.id)}
                className={`px-3 py-2 text-xs font-semibold rounded-lg border text-center transition-colors ${
                  rangePreset === p.id
                    ? "bg-slate-900 text-white border-slate-900"
                    : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {rangePreset === "custom" && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg text-slate-800"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg text-slate-800"
                />
              </div>
            </div>
          )}
        </div>

        {/* Restaurant Filter */}
        {restaurants.length > 0 && (
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              3. Store / Branch Filter
            </label>
            <select
              value={selectedRestaurant}
              onChange={(e) => setSelectedRestaurant(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 focus:bg-white focus:outline-none"
            >
              <option value="all">All Restaurants (Consolidated Franchise Export)</option>
              {restaurants.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <span className="text-[11px] text-slate-400">
            Formatted with UTF-8 BOM for Microsoft Excel & Google Sheets
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={downloading}
              onClick={handleDownload}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-sm transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {downloading ? "Preparing Export..." : "Download Accountant CSV"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
