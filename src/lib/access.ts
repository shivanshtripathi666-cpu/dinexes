import type { Access, Restaurant } from "./types";

/** Trial and subscription state. The server uses this to accept or refuse new orders. */
export function accessOf(r: Pick<Restaurant, "trialEndsAt" | "subscription">, now: number = Date.now()): Access {
  const paidEnd = r.subscription?.currentPeriodEnd || 0;
  if (paidEnd > now) {
    return { state: "active", endsAt: paidEnd, daysLeft: Math.ceil((paidEnd - now) / 86400000), canOrder: true };
  }
  if (r.trialEndsAt > now && !paidEnd) {
    return { state: "trialing", endsAt: r.trialEndsAt, daysLeft: Math.ceil((r.trialEndsAt - now) / 86400000), canOrder: true };
  }
  return { state: "expired", endsAt: Math.max(paidEnd, r.trialEndsAt), daysLeft: 0, canOrder: false };
}
