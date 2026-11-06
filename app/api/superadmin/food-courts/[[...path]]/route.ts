import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recordAuditLog, type AuditAction } from "@/lib/audit";
import { requireAuthJson, requirePermissionJson, requireSessionEmail } from "@/lib/auth/server";
import type { QAdminPermission } from "@/lib/auth/roles";
import { proxyToBackend } from "@/lib/superadmin/proxy";

// Food court admin API. Every call is checked against this allowlist, then
// forwarded to the Go API (/api/superadmin/food-courts/...), which does the
// validation and the work. Writes are recorded in the audit log.

type Method = "GET" | "POST" | "PATCH" | "DELETE";
type Ctx = {
  params: Record<string, string>;
  body: Record<string, unknown>;
  response: Record<string, unknown>;
};
type Rule = {
  method: Method;
  pattern: string; // segments; ":name" captures one segment
  permission?: QAdminPermission; // omitted = any signed-in admin may read
  audit?: { action: AuditAction; summary: (c: Ctx) => string; details?: (c: Ctx) => Record<string, unknown> };
};

const MANAGE: QAdminPermission = "foodcourts.manage";
const str = (v: unknown) => (typeof v === "string" ? v : "");

async function restaurantName(id: string): Promise<string> {
  try {
    const { rows } = await db.query("SELECT name FROM restaurants WHERE id::text = $1", [id]);
    return rows[0]?.name ? String(rows[0].name) : id;
  } catch {
    return id;
  }
}

const RULES: Rule[] = [
  { method: "GET", pattern: "" },
  {
    method: "POST",
    pattern: "",
    permission: MANAGE,
    audit: {
      action: "FOOD_COURT_CREATE",
      summary: (c) => `Created with link /fc/${str(c.body.slug)}`,
      details: (c) => ({ slug: c.body.slug, city: c.body.city ?? null }),
    },
  },
  { method: "GET", pattern: "stall-candidates", permission: MANAGE },
  { method: "GET", pattern: ":court" },
  {
    method: "PATCH",
    pattern: ":court",
    permission: MANAGE,
    audit: {
      action: "FOOD_COURT_UPDATE",
      summary: (c) =>
        c.body.is_archived === true
          ? "Archived the court"
          : c.body.is_archived === false
            ? "Restored the court"
            : `Edited ${Object.keys(c.body).join(", ") || "details"}`,
      details: (c) => ({ changes: c.body }),
    },
  },
  {
    method: "POST",
    pattern: ":court/subscription",
    permission: MANAGE,
    audit: {
      action: "FOOD_COURT_SUBSCRIPTION",
      summary: (c) => `Set billing to ${str(c.body.status)}`,
      details: (c) => ({
        status: c.body.status,
        trial_ends_at: c.body.trial_ends_at ?? null,
        current_period_end: c.body.current_period_end ?? null,
      }),
    },
  },
  {
    method: "POST",
    pattern: ":court/stalls",
    permission: MANAGE,
    audit: {
      action: "FOOD_COURT_STALL_ADD",
      summary: (c) => `Added stall ${str(c.params.stallName)}${c.body.stall_label ? ` (${str(c.body.stall_label)})` : ""}`,
      details: (c) => ({ restaurant_id: c.body.restaurant_id, stall_label: c.body.stall_label ?? null, cuisine_tags: c.body.cuisine_tags ?? [] }),
    },
  },
  {
    method: "PATCH",
    pattern: ":court/stalls/:restaurant",
    permission: MANAGE,
    audit: {
      action: "FOOD_COURT_STALL_UPDATE",
      summary: (c) =>
        c.body.is_listed === false
          ? `Hid stall ${str(c.params.stallName)} from diners`
          : c.body.is_listed === true
            ? `Showed stall ${str(c.params.stallName)} to diners`
            : `Edited stall ${str(c.params.stallName)}`,
      details: (c) => ({ restaurant_id: c.params.restaurant, changes: c.body }),
    },
  },
  {
    method: "DELETE",
    pattern: ":court/stalls/:restaurant",
    permission: MANAGE,
    audit: {
      action: "FOOD_COURT_STALL_REMOVE",
      summary: (c) => `Removed stall ${str(c.params.stallName)}`,
      details: (c) => ({ restaurant_id: c.params.restaurant }),
    },
  },
  { method: "GET", pattern: ":court/stalls/:restaurant/dishes" },
  {
    method: "POST",
    pattern: ":court/operators",
    permission: MANAGE,
    audit: {
      action: "FOOD_COURT_OPERATOR_ADD",
      summary: (c) =>
        `${c.response.created ? "Created" : "Linked"} operator ${str(c.body.email)} as ${str(c.body.role) || "owner"}`,
      // Never log the password.
      details: (c) => ({ email: c.body.email, role: c.body.role || "owner", created: c.response.created ?? null, user_id: c.response.user_id ?? null }),
    },
  },
  {
    method: "DELETE",
    pattern: ":court/operators/:user",
    permission: MANAGE,
    audit: {
      action: "FOOD_COURT_OPERATOR_REMOVE",
      summary: () => "Removed an operator's access",
      details: (c) => ({ user_id: c.params.user }),
    },
  },
  {
    method: "POST",
    pattern: ":court/operators/:user/password",
    permission: MANAGE,
    audit: {
      action: "FOOD_COURT_OPERATOR_PASSWORD",
      summary: () => "Reset an operator's password",
      details: (c) => ({ user_id: c.params.user }),
    },
  },
  {
    method: "POST",
    pattern: ":court/qr-tokens",
    permission: MANAGE,
    audit: {
      action: "FOOD_COURT_QR_CREATE",
      summary: (c) => {
        const n = Array.isArray(c.body.zones) ? c.body.zones.length : 0;
        return `Created ${n} QR ${n === 1 ? "code" : "codes"}`;
      },
      details: (c) => ({ zones: c.body.zones }),
    },
  },
  {
    method: "DELETE",
    pattern: ":court/qr-tokens/:token",
    permission: MANAGE,
    audit: {
      action: "FOOD_COURT_QR_DELETE",
      summary: () => "Deleted a QR code",
      details: (c) => ({ token_suffix: c.params.token.slice(-6) }),
    },
  },
  { method: "GET", pattern: ":court/placements" },
  {
    method: "POST",
    pattern: ":court/placements",
    permission: MANAGE,
    audit: {
      action: "FOOD_COURT_AD_CREATE",
      summary: (c) =>
        `Scheduled ${c.body.slot === "featured_item" ? "a featured dish" : "the top stall spot"} for ${str(c.params.stallName)}`,
      details: (c) => ({
        placement_id: c.response.id ?? null,
        restaurant_id: c.body.restaurant_id,
        slot: c.body.slot,
        menu_item_id: c.body.menu_item_id ?? null,
        starts_at: c.body.starts_at,
        ends_at: c.body.ends_at,
        price_cents: c.body.price_cents ?? 0,
      }),
    },
  },
  {
    method: "POST",
    pattern: ":court/placements/:placement/end",
    permission: MANAGE,
    audit: {
      action: "FOOD_COURT_AD_END",
      summary: () => "Ended or cancelled an ad",
      details: (c) => ({ placement_id: c.params.placement }),
    },
  },
  { method: "GET", pattern: ":court/analytics" },
];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN = /^[0-9a-f]{16,64}$/i;

function match(method: string, segments: string[]): { rule: Rule; params: Record<string, string> } | null {
  for (const rule of RULES) {
    if (rule.method !== method) continue;
    const parts = rule.pattern ? rule.pattern.split("/") : [];
    if (parts.length !== segments.length) continue;
    const params: Record<string, string> = {};
    let ok = true;
    for (let i = 0; i < parts.length && ok; i++) {
      const p = parts[i];
      const seg = segments[i];
      if (p.startsWith(":")) {
        const name = p.slice(1);
        ok = name === "token" ? TOKEN.test(seg) : UUID.test(seg);
        if (ok) params[name] = seg;
      } else {
        ok = p === seg;
      }
    }
    if (ok) return { rule, params };
  }
  return null;
}

const MAX_BODY = 64 * 1024;

async function handle(request: Request, ctx: { params: Promise<{ path?: string[] }> }) {
  const segments = ((await ctx.params).path || []).filter(Boolean);
  const method = request.method.toUpperCase() as Method;
  const found = match(method, segments);
  if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { rule, params } = found;

  const denied = rule.permission ? await requirePermissionJson(rule.permission) : await requireAuthJson();
  if (denied) return denied;

  let raw = "";
  let body: Record<string, unknown> = {};
  if (method === "POST" || method === "PATCH") {
    raw = await request.text();
    if (raw.length > MAX_BODY) return NextResponse.json({ error: "Request too large" }, { status: 413 });
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
        body = parsed as Record<string, unknown>;
      } catch {
        return NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 });
      }
    }
  }

  const path = `/api/superadmin/food-courts${segments.length ? "/" + segments.join("/") : "/"}`;
  const upstream = await proxyToBackend({ path, request, method, body: raw });
  const text = await upstream.text();
  let json: Record<string, unknown> = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = {};
  }

  if (!upstream.ok) {
    // The Go API answers {code, message}; the admin UI reads {error}.
    const message = typeof json.message === "string" ? json.message : typeof json.error === "string" ? json.error : `Request failed (${upstream.status})`;
    return NextResponse.json({ error: message.replace(/^invalid input: /, ""), code: json.code ?? null }, { status: upstream.status });
  }

  if (rule.audit) {
    const courtID = params.court || (typeof json.id === "string" ? json.id : "");
    let courtName = str(body.name) || courtID;
    if (params.court) {
      try {
        const { rows } = await db.query("SELECT name FROM food_courts WHERE id::text = $1", [params.court]);
        if (rows[0]?.name) courtName = String(rows[0].name);
      } catch {
        // keep the id
      }
    }
    const stallID = params.restaurant || str(body.restaurant_id);
    const auditCtx: Ctx = {
      params: { ...params, stallName: stallID ? await restaurantName(stallID) : "" },
      body,
      response: json,
    };
    await recordAuditLog({
      action: rule.audit.action,
      entityType: "food_court",
      entityId: courtID || null,
      entityName: courtName || null,
      details: { summary: rule.audit.summary(auditCtx), ...(rule.audit.details?.(auditCtx) ?? {}) },
      actorUsername: (await requireSessionEmail()) || undefined,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
    });
  }

  return new Response(text || "{}", {
    status: upstream.status === 204 ? 200 : upstream.status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
