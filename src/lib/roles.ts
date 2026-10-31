/**
 * Who may do what. The server checks these on every request (src/lib/server/auth.ts); the dashboard
 * uses the same table only to decide which buttons to show.
 */
export type Role = "owner" | "manager" | "cashier" | "kitchen";
export const ROLES: Role[] = ["owner", "manager", "cashier", "kitchen"];
export const STAFF_ROLES: Exclude<Role, "owner">[] = ["manager", "cashier", "kitchen"];

export const ROLE_LABEL: Record<Role, string> = {
  owner: "Owner",
  manager: "Manager",
  cashier: "Cashier",
  kitchen: "Kitchen",
};

export type Perm =
  | "orders.kitchen"
  | "orders.counter"
  | "payments.mark"
  | "menu.edit"
  | "menu.availability"
  | "seats.manage"
  | "reports.view"
  | "staff.manage"
  | "billing.manage"
  | "settings.edit";

const PERMS: Record<Role, Perm[]> = {
  owner: [
    "orders.kitchen",
    "orders.counter",
    "payments.mark",
    "menu.edit",
    "menu.availability",
    "seats.manage",
    "reports.view",
    "staff.manage",
    "billing.manage",
    "settings.edit",
  ],
  manager: ["orders.kitchen", "orders.counter", "payments.mark", "menu.edit", "menu.availability", "seats.manage", "reports.view"],
  cashier: ["orders.counter", "payments.mark"],
  kitchen: ["orders.kitchen", "menu.availability"],
};

export function can(role: Role | undefined | null, perm: Perm): boolean {
  return !!role && PERMS[role].includes(perm);
}

export const ORDER_STATUSES = ["new", "accepted", "preparing", "ready", "served", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  new: "New",
  accepted: "Accepted",
  preparing: "Preparing",
  ready: "Ready",
  served: "Served",
  cancelled: "Cancelled",
};

const FLOW: OrderStatus[] = ["new", "accepted", "preparing", "ready", "served"];

/** Which status changes each role may make. Moves go forward only; cancelling is allowed before the food is ready. */
export function canTransition(role: Role, from: OrderStatus, to: OrderStatus): boolean {
  if (from === to || from === "served" || from === "cancelled") return false;
  if (to === "cancelled") {
    if (!["new", "accepted", "preparing"].includes(from)) return false;
    return role === "kitchen" ? from === "new" : true;
  }
  const a = FLOW.indexOf(from);
  const b = FLOW.indexOf(to);
  if (a < 0 || b <= a) return false;
  if (role === "owner" || role === "manager") return true;
  if (role === "kitchen") return to === "accepted" || to === "preparing" || to === "ready";
  if (role === "cashier") return to === "served" || to === "accepted";
  return false;
}
