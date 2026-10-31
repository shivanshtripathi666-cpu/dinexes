import type { MeResponse } from "./types";

/** Where a signed-in user should land, based on their restaurant and role. */
export function homeFor(me: MeResponse | null): string {
  if (!me?.restaurant || !me.member) return "/register";
  if (me.member.role === "owner" && !me.restaurant.onboarded) return "/onboarding";
  if (me.member.role === "kitchen") return "/dashboard/kitchen";
  if (me.member.role === "cashier") return "/dashboard/counter";
  return "/dashboard";
}
