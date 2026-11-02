/**
 * Product constants shared by the server and the browser. Change prices and limits here only.
 * Anything that differs per deployment (domain, keys) lives in environment variables, read in
 * src/lib/server/env.ts (server) and passed to the browser through src/lib/publicConfig.ts.
 */
export const APP_NAME = "Dinexes";
export const APP_TAGLINE = "Scan. Order. Serve.";
/**
 * Kinds of QR code a restaurant can print.
 * - dine: a seat or table. Food is served to the seat.
 * - takeaway: a parcel counter. The guest gives a name and collects the packed food.
 * - counter: a stall or quick-service counter (tea, juice, snacks). The guest gives a name,
 *   the kitchen hears "Shivansh, one tea", and the guest collects and pays.
 */
export const QR_KINDS = ["dine", "takeaway", "counter"] as const;
export type QrKind = (typeof QR_KINDS)[number];
export const QR_KIND_INFO: Record<QrKind, { name: string; plural: string; label: string; hint: string; needsName: boolean }> = {
  dine: { name: "Dining seat", plural: "Dining seats", label: "Seat", hint: "Food is served to the seat.", needsName: false },
  takeaway: { name: "Parcel QR", plural: "Parcel / takeaway", label: "Parcel", hint: "Guest gives a name and collects the packed food.", needsName: true },
  counter: { name: "Stall / counter QR", plural: "Stall / counter", label: "Counter", hint: "Guest gives a name, collects at the counter and pays.", needsName: true },
};

/** Two plans. Pro is for stalls and counters; Premium adds dining seats and parcel QR codes. */
export type Tier = "pro" | "premium";
export const TIERS: Record<Tier, { id: Tier; name: string; monthlyInr: number; kinds: readonly QrKind[]; forWho: string; features: readonly string[] }> = {
  pro: {
    id: "pro",
    name: "Pro",
    monthlyInr: 249,
    kinds: ["counter"],
    forWho: "Tea stalls, juice and snack counters, food carts",
    features: [
      "Stall / counter QR codes",
      "Full menu with photos and prices",
      "Guest writes a name, kitchen hears it: \"Shivansh, one tea\"",
      "Bill on the guest's phone before ordering",
      "Live order screen and daily sales",
      "Up to 4 logins (owner + 3 staff)",
    ],
  },
  premium: {
    id: "premium",
    name: "Premium",
    monthlyInr: 349,
    kinds: ["dine", "takeaway", "counter"],
    forWho: "Restaurants, cafes and dhabas with seating",
    features: [
      "Everything in Pro",
      "Dining QR on every seat, orders arrive with the seat number",
      "Parcel / takeaway QR with the guest's name",
      "Kitchen voice in English and Hindi",
      "Kitchen, counter and owner screens",
      "Dish ratings from guests and sales reports",
    ],
  },
};

/** Subscription plans. A longer plan costs less per month; the saving is real (monthly price x months, minus the plan price). */
export const PLANS = [
  { id: "pro1", tier: "pro", label: "1 month", months: 1, days: 30, priceInr: 249, tag: "" },
  { id: "pro3", tier: "pro", label: "3 months", months: 3, days: 90, priceInr: 649, tag: "Popular" },
  { id: "pro6", tier: "pro", label: "6 months", months: 6, days: 180, priceInr: 899, tag: "Best value" },
  { id: "prem1", tier: "premium", label: "1 month", months: 1, days: 30, priceInr: 349, tag: "" },
  { id: "prem3", tier: "premium", label: "3 months", months: 3, days: 90, priceInr: 799, tag: "Popular" },
  { id: "prem6", tier: "premium", label: "6 months", months: 6, days: 180, priceInr: 1299, tag: "Best value" },
] as const;
export type Plan = (typeof PLANS)[number];
export type PlanId = Plan["id"];
export const planById = (id: string) => PLANS.find((p) => p.id === id);
export const plansOf = (tier: Tier) => PLANS.filter((p) => p.tier === tier);
/** Full price at the monthly rate, shown crossed out next to the plan price. */
export const planFullPrice = (p: Plan) => p.months * TIERS[p.tier].monthlyInr;
export const planSaving = (p: Plan) => planFullPrice(p) - p.priceInr;
export const planPerMonth = (p: Plan) => Math.round(p.priceInr / p.months);
/** Names for payment history, including the plans sold before Pro and Premium. */
export function planName(id: string): string {
  const p = planById(id);
  if (p) return `${TIERS[p.tier].name} · ${p.label}`;
  return ({ m1: "1 month", m3: "3 months", m6: "6 months" } as Record<string, string>)[id] || "Plan";
}
/** Lowest monthly price, for "from ₹... a month" lines. */
export const LOWEST_MONTHLY_INR = Math.min(...PLANS.map((p) => planPerMonth(p)));

/** Shown on the legal and contact pages. Set SUPPORT_EMAIL on the server to change it. */
export const DEFAULT_SUPPORT_EMAIL = "shivanshtripathi666@gmail.com";
export const TRIAL_DAYS = 30;
export const MAX_STAFF = 4;
export const MAX_SEATS = 300;
export const TIME_ZONE = "Asia/Kolkata";

/** Limits on a single order, so a broken or abusive client cannot flood a kitchen. */
export const MAX_ORDER_LINES = 30;
export const MAX_QTY_PER_LINE = 20;
export const MAX_ORDERS_PER_SEAT_WINDOW = 6;
/** A parcel or stall QR is shared by many guests, so it allows many more orders. */
export const MAX_ORDERS_PER_SHARED_QR_WINDOW = 60;
export const MAX_NAME_LENGTH = 30;
export const SEAT_WINDOW_MINUTES = 10;

export const RESTAURANT_CATEGORIES = [
  "North Indian",
  "South Indian",
  "Chinese",
  "Biryani",
  "Fast food",
  "Cafe",
  "Bakery",
  "Desserts",
  "Street food",
  "Thali",
  "Pure veg",
  "Multi-cuisine",
] as const;

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
