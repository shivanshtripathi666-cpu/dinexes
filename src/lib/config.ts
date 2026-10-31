/**
 * Product constants shared by the server and the browser. Change prices and limits here only.
 * Anything that differs per deployment (domain, keys) lives in environment variables, read in
 * src/lib/server/env.ts (server) and passed to the browser through src/lib/publicConfig.ts.
 */
export const APP_NAME = "Dinexes";
export const APP_TAGLINE = "Scan. Order. Serve.";
export const PLAN_PRICE_INR = 399;
export const PLAN_PRICE_PAISE = PLAN_PRICE_INR * 100;
export const PLAN_PERIOD_DAYS = 30;

/** Subscription plans. Longer plans cost less per month. */
export const PLANS = [
  { id: "m1", label: "1 month", months: 1, days: 30, priceInr: 399, tag: "" },
  { id: "m3", label: "3 months", months: 3, days: 90, priceInr: 899, tag: "Popular" },
  { id: "m6", label: "6 months", months: 6, days: 180, priceInr: 1499, tag: "Best value" },
] as const;
export type PlanId = (typeof PLANS)[number]["id"];
export const planById = (id: string) => PLANS.find((p) => p.id === id);
export const planSaving = (p: (typeof PLANS)[number]) => p.months * PLAN_PRICE_INR - p.priceInr;

/** Shown on the legal and contact pages. Set SUPPORT_EMAIL on the server to change it. */
export const DEFAULT_SUPPORT_EMAIL = "shivanshtripathi666@gmail.com";
export const TRIAL_DAYS = 7;
export const MAX_STAFF = 4;
export const MAX_SEATS = 300;
export const TIME_ZONE = "Asia/Kolkata";

/** Limits on a single order, so a broken or abusive client cannot flood a kitchen. */
export const MAX_ORDER_LINES = 30;
export const MAX_QTY_PER_LINE = 20;
export const MAX_ORDERS_PER_SEAT_WINDOW = 6;
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
