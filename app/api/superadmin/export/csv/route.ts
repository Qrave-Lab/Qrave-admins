import { NextResponse } from "next/server";
import { requireAuthJson, getSessionUserWithRole } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/auth/roles";

function escapeCSV(val: any): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCSVString(headers: string[], rows: any[][]): string {
  const headerLine = headers.map(escapeCSV).join(",");
  const dataLines = rows.map((r) => r.map(escapeCSV).join(","));
  // Prepend UTF-8 BOM so Microsoft Excel reads encoding properly
  return "\uFEFF" + [headerLine, ...dataLines].join("\r\n");
}

export async function GET(request: Request) {
  const unauthorized = await requireAuthJson();
  if (unauthorized) return unauthorized;

  const user = await getSessionUserWithRole();
  if (!user || !hasPermission(user.role, "finance.export")) {
    return NextResponse.json({ error: "forbidden, insufficient finance permissions" }, { status: 403 });
  }

  const url = new URL(request.url);
  const type = url.searchParams.get("type") || "revenue_summary";
  const restaurantId = url.searchParams.get("restaurantId") || "";
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const range = url.searchParams.get("range") || "month";

  // Calculate date window
  let dateFilter = `COALESCE(p.captured_at, p.created_at) >= (NOW() - INTERVAL '30 days')`;
  if (from && to) {
    dateFilter = `COALESCE(p.captured_at, p.created_at) >= '${from}'::timestamp AND COALESCE(p.captured_at, p.created_at) <= '${to} 23:59:59'::timestamp`;
  } else if (range === "week") {
    dateFilter = `COALESCE(p.captured_at, p.created_at) >= (NOW() - INTERVAL '7 days')`;
  } else if (range === "quarter") {
    dateFilter = `COALESCE(p.captured_at, p.created_at) >= (NOW() - INTERVAL '90 days')`;
  } else if (range === "year") {
    dateFilter = `COALESCE(p.captured_at, p.created_at) >= (NOW() - INTERVAL '365 days')`;
  }

  let restFilter = "";
  const args: any[] = [];
  if (restaurantId && restaurantId !== "all") {
    restFilter = `AND p.restaurant_id = $1`;
    args.push(restaurantId);
  }

  const todayStr = new Date().toISOString().split("T")[0];

  try {
    if (type === "transactions_ledger") {
      const q = `
        SELECT
          p.id AS payment_id,
          COALESCE(p.transaction_id, p.id::text) AS transaction_ref,
          COALESCE(p.order_id::text, p.takeaway_order_id::text, '') AS order_id,
          to_char(COALESCE(p.captured_at, p.created_at), 'YYYY-MM-DD HH24:MI:SS') AS transaction_time,
          r.name AS restaurant_name,
          p.amount,
          COALESCE(p.mode, 'upi') AS payment_mode,
          p.status AS payment_status,
          COALESCE(p.gateway, 'razorpay') AS gateway
        FROM payments p
        JOIN restaurants r ON r.id = p.restaurant_id
        WHERE p.status = 'paid'
          AND ${dateFilter}
          ${restFilter}
        ORDER BY COALESCE(p.captured_at, p.created_at) DESC
        LIMIT 5000
      `;

      const { rows } = await db.query(q, args);
      const headers = [
        "Payment ID",
        "Transaction Ref",
        "Order ID",
        "Date & Time",
        "Restaurant Name",
        "Amount (INR)",
        "Payment Mode",
        "Status",
        "Gateway Provider",
      ];

      const csvData = rows.map((r: any) => [
        r.payment_id,
        r.transaction_ref,
        r.order_id,
        r.transaction_time,
        r.restaurant_name,
        Number(r.amount).toFixed(2),
        String(r.payment_mode).toUpperCase(),
        r.payment_status,
        r.gateway,
      ]);

      const csvContent = toCSVString(headers, csvData);
      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="qrave-transactions-ledger-${todayStr}.csv"`,
        },
      });
    }

    if (type === "discounts_reconciliation") {
      const q = `
        SELECT
          c.name AS campaign_name,
          COALESCE(c.code, 'DIRECT_PROMO') AS coupon_code,
          r.name AS restaurant_name,
          c.discount_type,
          c.discount_value,
          COUNT(cr.id) AS redemptions_count,
          COALESCE(SUM(cr.discount_amount), 0) AS total_discount_absorbed,
          to_char(c.created_at, 'YYYY-MM-DD') AS campaign_created
        FROM offer_campaigns c
        JOIN restaurants r ON r.id = c.restaurant_id
        LEFT JOIN offer_coupon_redemptions cr ON cr.campaign_id = c.id
        WHERE 1=1
        ${restaurantId && restaurantId !== "all" ? `AND c.restaurant_id = '${restaurantId}'` : ""}
        GROUP BY c.id, c.name, c.code, r.name, c.discount_type, c.discount_value, c.created_at
        ORDER BY total_discount_absorbed DESC
      `;

      const { rows } = await db.query(q);
      const headers = [
        "Campaign / Offer Name",
        "Coupon Code",
        "Restaurant Name",
        "Discount Type",
        "Discount Value",
        "Redemptions Count",
        "Total Absorbed Discount (INR)",
        "Created Date",
      ];

      const csvData = rows.map((r: any) => [
        r.campaign_name,
        r.coupon_code,
        r.restaurant_name,
        r.discount_type === "percent" ? "Percentage" : "Flat",
        r.discount_type === "percent" ? `${r.discount_value}%` : `₹${r.discount_value}`,
        r.redemptions_count,
        Number(r.total_discount_absorbed).toFixed(2),
        r.campaign_created,
      ]);

      const csvContent = toCSVString(headers, csvData);
      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="qrave-discounts-reconciliation-${todayStr}.csv"`,
        },
      });
    }

    if (type === "gst_tax_schedule") {
      const q = `
        SELECT
          to_char(COALESCE(p.captured_at, p.created_at), 'YYYY-MM') AS filing_period,
          r.name AS restaurant_name,
          r.id AS restaurant_id,
          COALESCE(ROUND(SUM(p.amount) / 1.05), 0) AS taxable_turnover,
          COALESCE(ROUND((SUM(p.amount) / 1.05) * 0.025), 0) AS cgst_amount,
          COALESCE(ROUND((SUM(p.amount) / 1.05) * 0.025), 0) AS sgst_amount,
          COALESCE(ROUND((SUM(p.amount) / 1.05) * 0.05), 0) AS total_gst_collected,
          COALESCE(ROUND(SUM(p.amount)), 0) AS gross_total
        FROM payments p
        JOIN restaurants r ON r.id = p.restaurant_id
        WHERE p.status = 'paid'
          AND ${dateFilter}
          ${restFilter}
        GROUP BY 1, r.name, r.id
        ORDER BY 1 DESC, gross_total DESC
      `;

      const { rows } = await db.query(q, args);
      const headers = [
        "Filing Period",
        "Restaurant Name",
        "Restaurant ID",
        "Taxable Turnover (INR)",
        "CGST 2.5% (INR)",
        "SGST 2.5% (INR)",
        "Total GST 5% (INR)",
        "Gross Collection (INR)",
      ];

      const csvData = rows.map((r: any) => [
        r.filing_period,
        r.restaurant_name,
        r.restaurant_id,
        Number(r.taxable_turnover).toFixed(2),
        Number(r.cgst_amount).toFixed(2),
        Number(r.sgst_amount).toFixed(2),
        Number(r.total_gst_collected).toFixed(2),
        Number(r.gross_total).toFixed(2),
      ]);

      const csvContent = toCSVString(headers, csvData);
      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="qrave-gst-tax-schedule-${todayStr}.csv"`,
        },
      });
    }

    // Default: revenue_summary
    const q = `
      SELECT
        to_char(COALESCE(p.captured_at, p.created_at), 'YYYY-MM-DD') AS transaction_date,
        r.name AS restaurant_name,
        r.id AS restaurant_id,
        COALESCE(COUNT(DISTINCT p.order_id), 0) AS orders_count,
        COALESCE(ROUND(SUM(p.amount)), 0) AS gross_revenue,
        COALESCE(ROUND((SUM(p.amount) / 1.05) * 0.05), 0) AS estimated_taxes,
        COALESCE(ROUND(SUM(p.amount) * 0.95), 0) AS net_payout,
        COALESCE(ROUND(SUM(CASE WHEN LOWER(p.mode) = 'upi' THEN p.amount ELSE 0 END)), 0) AS upi_amount,
        COALESCE(ROUND(SUM(CASE WHEN LOWER(p.mode) = 'card' THEN p.amount ELSE 0 END)), 0) AS card_amount,
        COALESCE(ROUND(SUM(CASE WHEN LOWER(p.mode) = 'cash' THEN p.amount ELSE 0 END)), 0) AS cash_amount
      FROM payments p
      JOIN restaurants r ON r.id = p.restaurant_id
      WHERE p.status = 'paid'
        AND ${dateFilter}
        ${restFilter}
      GROUP BY 1, r.name, r.id
      ORDER BY 1 DESC, gross_revenue DESC
    `;

    const { rows } = await db.query(q, args);
    const headers = [
      "Date",
      "Restaurant Name",
      "Restaurant ID",
      "Orders Count",
      "Gross Sales (INR)",
      "Estimated Taxes 5% (INR)",
      "Estimated Net Payout (INR)",
      "UPI Volume (INR)",
      "Card Volume (INR)",
      "Cash Volume (INR)",
    ];

    const csvData = rows.map((r: any) => [
      r.transaction_date,
      r.restaurant_name,
      r.restaurant_id,
      r.orders_count,
      Number(r.gross_revenue).toFixed(2),
      Number(r.estimated_taxes).toFixed(2),
      Number(r.net_payout).toFixed(2),
      Number(r.upi_amount).toFixed(2),
      Number(r.card_amount).toFixed(2),
      Number(r.cash_amount).toFixed(2),
    ]);

    const csvContent = toCSVString(headers, csvData);
    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="qrave-revenue-summary-${todayStr}.csv"`,
      },
    });
  } catch (err) {
    console.error("CSV Export failed:", err);
    return NextResponse.json({ error: "Failed to generate CSV export" }, { status: 500 });
  }
}
