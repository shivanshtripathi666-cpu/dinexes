"use client";
import { Check, Store, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { TIERS, TRIAL_DAYS, planFullPrice, planPerMonth, planSaving, plansOf, type Plan, type PlanId, type Tier } from "@/lib/config";
import { buttonClass, cx } from "./ui";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const TIER_ICON: Record<Tier, typeof Store> = { pro: Store, premium: UtensilsCrossed };

/** Price block: plan price, the full monthly-rate price crossed out, per-month cost and the saving. */
function Price({ plan, big = true }: { plan: Plan; big?: boolean }) {
  const saving = planSaving(plan);
  return (
    <div>
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className={cx("font-bold tabular-nums", big ? "text-4xl" : "text-2xl")} data-testid={`price-${plan.id}`}>
          {inr(plan.priceInr)}
        </span>
        {saving > 0 && (
          <span className="text-base font-semibold text-muted line-through decoration-bad/70 decoration-2" aria-label={`${inr(planFullPrice(plan))} at the monthly price`}>
            {inr(planFullPrice(plan))}
          </span>
        )}
        <span className="text-sm text-muted">/ {plan.label}</span>
      </p>
      <p className="mt-1 text-sm">
        {plan.months === 1 ? <span className="text-muted">Billed monthly</span> : <span className="text-muted">Just {inr(planPerMonth(plan))} a month</span>}
        {saving > 0 && (
          <span className="ml-2 rounded-md bg-ok-soft px-1.5 py-0.5 text-xs font-bold text-ok" data-testid={`save-${plan.id}`}>
            You save {inr(saving)}
          </span>
        )}
      </p>
    </div>
  );
}

/** 1 / 3 / 6 months switch. */
function Durations({ tier, value, onChange }: { tier: Tier; value: PlanId; onChange: (id: PlanId) => void }) {
  return (
    <div className="grid grid-cols-3 gap-1 rounded-xl bg-ivory p-1" role="radiogroup" aria-label={`${TIERS[tier].name} plan length`}>
      {plansOf(tier).map((p) => (
        <button
          key={p.id}
          type="button"
          role="radio"
          aria-checked={value === p.id}
          onClick={() => onChange(p.id)}
          className={cx("relative rounded-lg px-2 py-2 text-sm font-semibold", value === p.id ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink")}
          data-testid={`duration-${p.id}`}
        >
          {p.label}
          {p.tag === "Best value" && <span className="absolute -top-2 right-1 rounded bg-amber px-1 text-[9px] font-bold uppercase text-ink">Best</span>}
        </button>
      ))}
    </div>
  );
}

/** One plan (Pro or Premium) with its length switch, price, features and a button. */
export function TierCard({ tier, initial, cta, highlight }: { tier: Tier; initial?: PlanId; cta: (p: Plan) => React.ReactNode; highlight?: boolean }) {
  const t = TIERS[tier];
  const list = plansOf(tier);
  const [id, setId] = useState<PlanId>(initial && list.some((p) => p.id === initial) ? initial : list[1].id);
  const plan = list.find((p) => p.id === id) || list[0];
  const Icon = TIER_ICON[tier];
  return (
    <div className={cx("relative flex h-full flex-col rounded-2xl border bg-white p-5 sm:p-6", highlight ? "border-ink ring-2 ring-amber" : "border-line")} data-testid={`tier-${tier}`}>
      {highlight && <span className="absolute -top-3 left-5 rounded-md bg-amber px-2 py-0.5 text-xs font-bold text-ink">Dining + parcel + stall</span>}
      <div className="flex items-center gap-3">
        <span className={cx("flex size-10 items-center justify-center rounded-xl", highlight ? "bg-navy text-amber" : "bg-ivory text-ink")}>
          <Icon className="size-5" />
        </span>
        <div>
          <p className="text-xl font-bold">{t.name}</p>
          <p className="text-sm text-muted">{t.forWho}</p>
        </div>
      </div>
      <div className="mt-5">
        <Durations tier={tier} value={plan.id} onChange={setId} />
      </div>
      <div className="mt-4">
        <Price plan={plan} />
      </div>
      <ul className="mt-5 space-y-2 text-sm">
        {t.features.map((f) => (
          <li key={f} className="flex gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-ok" /> {f}
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-6">{cta(plan)}</div>
    </div>
  );
}

/** Pro and Premium side by side, each with "Start free trial" (home and pricing pages). */
export function PlanGrid() {
  return (
    <div>
      <div className="grid gap-5 md:grid-cols-2">
        {(["pro", "premium"] as const).map((tier) => (
          <TierCard
            key={tier}
            tier={tier}
            highlight={tier === "premium"}
            cta={(p) => (
              <Link href={`/register?plan=${p.id}`} className={buttonClass(tier === "premium" ? "primary" : "dark", "lg", "w-full")} data-testid={`start-${p.id}`}>
                Start {TRIAL_DAYS}-day free trial
              </Link>
            )}
          />
        ))}
      </div>
      <p className="mt-4 text-center text-sm text-muted">
        The free trial includes everything in Premium. No card needed. Pick a plan only when you are happy.
      </p>
    </div>
  );
}

/** Selectable plan row for the billing page. */
export function PlanOption({ plan, selected }: { plan: Plan; selected: boolean }) {
  return (
    <div className={cx("tap relative rounded-xl border bg-white p-4 text-left", selected ? "border-ink ring-2 ring-amber" : "border-line")} data-testid={`plan-${plan.id}`}>
      {plan.tag && <span className={cx("absolute -top-2.5 right-3 rounded px-1.5 py-0.5 text-[10px] font-bold", plan.tag === "Best value" ? "bg-amber text-ink" : "bg-navy text-ivory")}>{plan.tag}</span>}
      <Price plan={plan} big={false} />
    </div>
  );
}

export function TierSwitch({ value, onChange }: { value: Tier; onChange: (t: Tier) => void }) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-xl bg-ivory p-1" role="radiogroup" aria-label="Plan">
      {(["pro", "premium"] as const).map((t) => (
        <button
          key={t}
          type="button"
          role="radio"
          aria-checked={value === t}
          onClick={() => onChange(t)}
          className={cx("rounded-lg px-3 py-2 text-left", value === t ? "bg-white shadow-sm" : "text-muted hover:text-ink")}
          data-testid={`tier-switch-${t}`}
        >
          <span className="block text-sm font-bold">{TIERS[t].name}</span>
          <span className="block text-xs">{t === "pro" ? "Stall / counter QR" : "Dining, parcel and stall QR"}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * What Dinexes saves against paying people to take orders. The owner sets the numbers; the defaults
 * are a modest example, not a promise.
 */
export function StaffSavings() {
  const [people, setPeople] = useState(1);
  const [salary, setSalary] = useState(9000);
  const yearlyStaff = people * salary * 12;
  const yearlyDinexes = 2 * plansOf("premium")[2].priceInr;
  const saved = Math.max(0, yearlyStaff - yearlyDinexes);
  return (
    <div className="grid gap-6 rounded-2xl border border-line bg-white p-5 sm:p-7 md:grid-cols-2" data-testid="savings">
      <div>
        <h3 className="display text-2xl font-semibold">Fewer hands on orders, more money kept</h3>
        <p className="mt-2 text-sm text-muted">
          Guests read the menu and order from their own phone. Nobody has to stand at the table with a notepad, repeat orders or fix wrong bills. Your
          team cooks and serves; Dinexes takes the order.
        </p>
        <div className="mt-5 space-y-4">
          <label className="block text-sm font-semibold">
            People you pay mainly to take orders: <span className="tabular-nums">{people}</span>
            <input type="range" min={1} max={5} value={people} onChange={(e) => setPeople(Number(e.target.value))} className="mt-2 w-full accent-[#d29b3a]" aria-label="People who take orders" />
          </label>
          <label className="block text-sm font-semibold">
            Monthly pay for each: <span className="tabular-nums">{inr(salary)}</span>
            <input
              type="range"
              min={5000}
              max={20000}
              step={500}
              value={salary}
              onChange={(e) => setSalary(Number(e.target.value))}
              className="mt-2 w-full accent-[#d29b3a]"
              aria-label="Monthly pay for each person"
            />
          </label>
        </div>
      </div>
      <div className="flex flex-col justify-center rounded-xl bg-navy p-5 text-ivory">
        <p className="text-sm text-ivory/70">Order-taking staff for a year</p>
        <p className="text-2xl font-bold tabular-nums">{inr(yearlyStaff)}</p>
        <p className="mt-3 text-sm text-ivory/70">Dinexes Premium for a year (two 6-month plans)</p>
        <p className="text-2xl font-bold tabular-nums">{inr(yearlyDinexes)}</p>
        <div className="mt-4 border-t border-white/15 pt-4">
          <p className="text-sm text-ivory/70">You could keep up to</p>
          <p className="text-4xl font-bold text-amber tabular-nums" data-testid="savings-amount">
            {inr(saved)}
          </p>
          <p className="mt-1 text-xs text-ivory/60">a year. Your own numbers decide the real saving.</p>
        </div>
      </div>
    </div>
  );
}
