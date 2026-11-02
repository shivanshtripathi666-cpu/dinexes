import { TIERS, type QrKind, type Tier } from "./config";
import type { Access, Restaurant } from "./types";

/**
 * Trial and subscription state. The server uses this to accept or refuse new orders.
 * The free trial includes every feature (Premium). A paid plan uses the tier that was bought;
 * restaurants that paid before Pro and Premium existed keep everything (Premium).
 */
export function accessOf(r: Pick<Restaurant, "trialEndsAt" | "subscription"> & { planTier?: Tier | "" }, now: number = Date.now()): Access {
  const paidEnd = r.subscription?.currentPeriodEnd || 0;
  const paidTier: Tier = r.planTier === "pro" ? "pro" : "premium";
  if (paidEnd > now) {
    return { state: "active", endsAt: paidEnd, daysLeft: Math.ceil((paidEnd - now) / 86400000), canOrder: true, tier: paidTier, kinds: TIERS[paidTier].kinds };
  }
  if (r.trialEndsAt > now && !paidEnd) {
    return { state: "trialing", endsAt: r.trialEndsAt, daysLeft: Math.ceil((r.trialEndsAt - now) / 86400000), canOrder: true, tier: "premium", kinds: TIERS.premium.kinds };
  }
  const tier: Tier = paidEnd ? paidTier : "premium";
  return { state: "expired", endsAt: Math.max(paidEnd, r.trialEndsAt), daysLeft: 0, canOrder: false, tier, kinds: TIERS[tier].kinds };
}

export function kindAllowed(a: Pick<Access, "kinds">, kind: QrKind): boolean {
  return a.kinds.includes(kind);
}
