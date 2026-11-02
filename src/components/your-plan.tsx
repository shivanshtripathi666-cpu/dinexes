"use client";
import { BadgeCheck } from "lucide-react";
import Link from "next/link";
import { TIERS, TRIAL_DAYS, planPerMonth, plansOf, type Tier } from "@/lib/config";
import { formatDate } from "@/lib/time";
import { useDash } from "./dash-context";
import { cx } from "./ui";

/** The owner's plan at a glance: the free trial (active from registration) and the two paid plans. */
export function YourPlan() {
  const d = useDash();
  const a = d.access;
  const trialActive = a.state === "trialing";
  return (
    <section className="rounded-[var(--radius-card)] border border-line bg-white p-5" data-testid="your-plan">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">Your plan</h2>
        <Link href="/dashboard/billing" className="text-sm font-semibold underline underline-offset-4">
          Billing
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className={cx("rounded-xl border p-4", trialActive ? "border-ok bg-ok-soft" : "border-line bg-ivory")}>
          <p className="flex items-center justify-between text-sm font-semibold">
            Free trial
            {trialActive ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-ok px-1.5 py-0.5 text-[11px] font-bold text-white">
                <BadgeCheck className="size-3.5" /> ACTIVE
              </span>
            ) : (
              <span className="text-[11px] font-bold text-muted">USED</span>
            )}
          </p>
          <p className="mt-2 text-2xl font-bold">₹0</p>
          <p className="mt-1 text-xs text-muted">
            {trialActive ? `${a.daysLeft} of ${TRIAL_DAYS} days left · ends ${formatDate(a.endsAt)} · everything included` : `${TRIAL_DAYS} days, started when you registered`}
          </p>
        </div>
        {(["pro", "premium"] as Tier[]).map((t) => {
          const current = a.state === "active" && a.tier === t;
          const best = plansOf(t)[2];
          return (
            <Link
              key={t}
              href={`/dashboard/billing?plan=${plansOf(t)[1].id}`}
              className={cx("tap relative rounded-xl border bg-white p-4", current ? "border-ok ring-2 ring-ok/30" : t === "premium" ? "border-ink" : "border-line")}
              data-testid={`choose-${t}`}
            >
              {current && <span className="absolute -top-2.5 right-3 rounded bg-ok px-1.5 py-0.5 text-[10px] font-bold text-white">YOUR PLAN</span>}
              <p className="text-sm font-semibold">{TIERS[t].name}</p>
              <p className="mt-2 text-2xl font-bold">
                ₹{TIERS[t].monthlyInr}
                <span className="text-sm font-medium text-muted"> / month</span>
              </p>
              <p className="mt-1 text-xs text-muted">
                {t === "pro" ? "Stall / counter QR" : "Dining, parcel and stall QR"} · as low as ₹{planPerMonth(best)}/month for 6 months
                {" · "}
                {current ? "adds after your plan" : trialActive ? "starts after trial" : "start now"}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
