import { can } from "@/lib/rbac/can";

export type NavItem = { href: string; label: string; permission?: string };

export const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/tables", label: "Tables & Orders", permission: "order.create" },
  { href: "/kds", label: "Kitchen Display", permission: "kds.view" },
  { href: "/voids", label: "Void Requests", permission: "void.approve" },
  { href: "/billing", label: "Billing", permission: "bill.create" },
  { href: "/menu", label: "Menu", permission: "menu.manage" },
  { href: "/floors", label: "Floors & Tables", permission: "tables.manage" },
  { href: "/inventory", label: "Inventory", permission: "stock.manage" },
  { href: "/shifts", label: "Shifts", permission: "shift.open" },
  { href: "/reports", label: "Reports", permission: "reports.view" },
  { href: "/audit", label: "Audit Logs", permission: "audit.view" },
  { href: "/users", label: "Users", permission: "users.manage" },
  { href: "/settings", label: "Settings", permission: "settings.manage" },
];

export function filterNav(permissions: string[]): NavItem[] {
  return NAV.filter((i) => !i.permission || can(permissions, i.permission));
}

/** Role-based landing route after login. */
export function landingPath(role: string): string {
  if (role === "kitchen") return "/kds";
  if (role === "inventory") return "/inventory";
  if (role === "waiter") return "/tables";
  if (role === "auditor") return "/reports";
  return "/dashboard";
}
