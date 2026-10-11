export type QAdminRole =
  | "superadmin"
  | "ops_manager"
  | "finance_lead"
  | "menu_specialist"
  | "auditor";

export type QAdminPermission =
  | "qadmins.manage"
  | "restaurants.delete"
  | "restaurants.status"
  | "features.manage"
  | "menu.manage"
  | "discounts.manage"
  | "tickets.respond"
  | "finance.view"
  | "finance.export"
  | "audit.view";

export interface RoleDefinition {
  id: QAdminRole;
  name: string;
  description: string;
  badgeClass: string;
  permissions: QAdminPermission[];
}

export const ROLE_DEFINITIONS: Record<QAdminRole, RoleDefinition> = {
  superadmin: {
    id: "superadmin",
    name: "Super Admin",
    description: "Unrestricted platform root access. Can manage operators, feature flags, billing, and permanent deletions.",
    badgeClass: "bg-slate-900 text-white",
    permissions: [
      "qadmins.manage",
      "restaurants.delete",
      "restaurants.status",
      "features.manage",
      "menu.manage",
      "discounts.manage",
      "tickets.respond",
      "finance.view",
      "finance.export",
      "audit.view",
    ],
  },
  ops_manager: {
    id: "ops_manager",
    name: "Operations & Support Lead",
    description: "Manages restaurant operational access, downtime incidents, and staff support tickets. Cannot delete stores or manage operators.",
    badgeClass: "bg-blue-100 text-blue-800 border border-blue-200",
    permissions: [
      "restaurants.status",
      "menu.manage",
      "discounts.manage",
      "tickets.respond",
      "audit.view",
    ],
  },
  finance_lead: {
    id: "finance_lead",
    name: "Finance & Accountant",
    description: "Access to revenue reporting, financial analytics, discount ledger, and CSV exports for accountant tax filing.",
    badgeClass: "bg-emerald-100 text-emerald-800 border border-emerald-200",
    permissions: [
      "finance.view",
      "finance.export",
      "audit.view",
    ],
  },
  menu_specialist: {
    id: "menu_specialist",
    name: "Menu & Catalog Specialist",
    description: "Manages dishes, categories, pricing, modifier groups, and allergens. Restricted from financial reports and operator settings.",
    badgeClass: "bg-purple-100 text-purple-800 border border-purple-200",
    permissions: [
      "menu.manage",
    ],
  },
  auditor: {
    id: "auditor",
    name: "Compliance Auditor",
    description: "Read-only access across audit logs, restaurant list, and support history. Zero modification privileges.",
    badgeClass: "bg-slate-100 text-slate-700 border border-slate-200",
    permissions: [
      "audit.view",
    ],
  },
};

export function hasPermission(role: string | null | undefined, permission: QAdminPermission): boolean {
  const normRole = (role || "").toLowerCase().trim() as QAdminRole;
  const def = ROLE_DEFINITIONS[normRole];
  if (!def) return false;
  return def.permissions.includes(permission);
}

export function normalizeQAdminRole(raw: string | null | undefined): QAdminRole {
  const r = (raw || "").toLowerCase().trim();
  if (r === "superadmin" || r === "root" || r === "admin") return "superadmin";
  if (r === "ops_manager" || r === "ops" || r === "support") return "ops_manager";
  if (r === "finance_lead" || r === "finance" || r === "accountant") return "finance_lead";
  if (r === "menu_specialist" || r === "menu") return "menu_specialist";
  if (r === "auditor" || r === "readonly") return "auditor";
  return "ops_manager";
}
