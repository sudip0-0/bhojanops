// Central permission catalog. Keys are referenced by requirePermission() and seeded into DB.
export const PERMISSIONS: Record<string, string> = {
  "users.manage": "Manage users",
  "roles.manage": "Manage roles & permissions",
  "branches.manage": "Manage branches",
  "settings.manage": "Manage restaurant settings",
  "reports.view": "View operational reports",
  "reports.financial": "View financial reports",
  "data.export": "Export data",
  "audit.view": "View audit logs",
  "menu.manage": "Manage menu",
  "tables.manage": "Manage floors & tables",
  "order.create": "Create orders",
  "order.send": "Send orders to kitchen",
  "void.request": "Request item void",
  "void.approve": "Approve item void",
  "discount.apply": "Apply discount",
  "discount.approve": "Approve discount",
  "refund.approve": "Approve refund",
  "bill.create": "Create bills",
  "bill.finalize": "Finalize bills",
  "payment.settle": "Settle payments",
  "bill.refund": "Refund / void bill",
  "kds.view": "View kitchen display",
  "kds.update": "Update kitchen tickets",
  "stock.manage": "Manage stock items",
  "purchase.manage": "Record purchases",
  "wastage.record": "Record wastage",
  "shift.open": "Open shift",
  "shift.close": "Close shift",
  "shift.approve": "Approve shift variance",
};

export type PermissionKey = keyof typeof PERMISSIONS;

const ALL = Object.keys(PERMISSIONS);

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  owner: ALL,
  manager: [
    "menu.manage", "tables.manage", "order.create", "order.send",
    "void.request", "void.approve", "discount.apply", "discount.approve",
    "refund.approve", "bill.create", "bill.finalize", "payment.settle",
    "bill.refund", "kds.view", "kds.update", "stock.manage", "purchase.manage",
    "wastage.record", "shift.open", "shift.close", "shift.approve",
    "reports.view", "audit.view", "data.export", "users.manage",
  ],
  cashier: [
    "order.create", "bill.create", "bill.finalize", "payment.settle",
    "discount.apply", "void.request", "shift.open", "shift.close", "reports.view",
  ],
  waiter: ["order.create", "order.send", "void.request"],
  kitchen: ["kds.view", "kds.update"],
  inventory: ["stock.manage", "purchase.manage", "wastage.record", "reports.view"],
  auditor: ["reports.view", "reports.financial", "audit.view"],
};

export const ROLES: Record<string, string> = {
  owner: "Owner",
  manager: "Manager",
  cashier: "Cashier",
  waiter: "Waiter",
  kitchen: "Kitchen",
  inventory: "Inventory",
  auditor: "Auditor",
};
