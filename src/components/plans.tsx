import { Check } from "lucide-react";
import { PLANS, PLAN_PRICE_INR, planSaving } from "@/lib/config";
import { cx } from "./ui";

type Plan = (typeof PLANS)[number];

export const PLAN_FEATURES = [
  "QR ordering on every seat",
  "Kitchen voice announcements",
  "Kitchen, counter and owner screens",
  "Up to 4 logins (owner + 3 staff)",
  "Dish ratings from guests",
  "Sales reports",
];

/** One plan card. Used on the pricing page (as a link) and on billing (as a selectable button). */
export function PlanCard({ plan, selected, compact }: { plan: Plan; selected?: boolean; compact?: boolean }) {
  const saving = planSaving(plan);
  const perMonth = Math.round(plan.priceInr / plan.months);
  return (
    <div
      className={cx(
        "tap relative flex h-full flex-col rounded-2xl border bg-white p-5 text-left",
        selected ? "border-ink ring-2 ring-amber" : plan.tag === "Best value" ? "border-ink" : "border-line",
      )}
      data-testid={`plan-${plan.id}`}
    >
      {plan.tag && (
        <span className={cx("absolute -top-3 left-5 rounded-md px-2 py-0.5 text-xs font-bold", plan.tag === "Best value" ? "bg-amber text-ink" : "bg-navy text-ivory")}>{plan.tag}</span>
      )}
      <p className="text-sm font-semibold uppercase tracking-wide text-muted">{plan.label}</p>
      <p className="mt-2 flex items-baseline gap-1">
        <span className="text-4xl font-bold">₹{plan.priceInr.toLocaleString("en-IN")}</span>
      </p>
      <p className="mt-1 text-sm text-muted">
        {plan.months === 1 ? "per month" : `₹${perMonth} per month`}
        {saving > 0 && (
          <span className="ml-2 font-semibold text-ok">
            Save ₹{saving.toLocaleString("en-IN")}
          </span>
        )}
      </p>
      {plan.months > 1 && <p className="mt-0.5 text-xs text-muted line-through">₹{(plan.months * PLAN_PRICE_INR).toLocaleString("en-IN")}</p>}
      {!compact && (
        <ul className="mt-4 space-y-2 text-sm">
          {PLAN_FEATURES.map((f) => (
            <li key={f} className="flex gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-ok" /> {f}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
