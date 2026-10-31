import { ArrowRight, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PlanCard } from "@/components/plans";
import { ButtonLink } from "@/components/ui";
import { MAX_STAFF, PLANS, PLAN_PRICE_INR, TRIAL_DAYS } from "@/lib/config";

export const metadata: Metadata = { title: "Pricing" };

const faqs = [
  { q: "What happens after the free trial?", a: `Your ${TRIAL_DAYS}-day trial starts when you register. After it ends, your dashboard stays open but guests cannot place new orders until you choose a plan.` },
  { q: "Which plan should I choose?", a: "All plans include every feature. Longer plans simply cost less per month: 3 months for ₹899 and 6 months for ₹1,499." },
  { q: "How do guests pay for food?", a: "At your counter, the way they do today. Your cashier marks each order as paid. There is no commission on your food orders." },
  { q: "Do I need special hardware?", a: "No. Any Android phone or tablet works for the kitchen and counter. Print the QR cards on paper." },
  { q: "How many staff can log in?", a: `${MAX_STAFF} logins per restaurant: you plus up to ${MAX_STAFF - 1} staff. You add them yourself and can remove them any time.` },
];

export default function Pricing() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <div className="max-w-2xl">
        <h1 className="display text-4xl font-semibold">Simple pricing</h1>
        <p className="mt-2 text-muted">
          Every plan includes everything. Start with a {TRIAL_DAYS}-day free trial, no card needed. Prices in Indian rupees.
        </p>
        <p className="mt-1 text-sm text-muted">
          Monthly price <span data-testid="plan-price">₹{PLAN_PRICE_INR}</span>. Save more with 3 or 6 months.
        </p>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {PLANS.map((p) => (
          <Link key={p.id} href="/register" className="block" aria-label={`Start free trial, then ${p.label} for ₹${p.priceInr}`}>
            <PlanCard plan={p} />
          </Link>
        ))}
      </div>
      <div className="mt-8 flex flex-wrap items-center gap-4">
        <ButtonLink href="/register" size="lg">
          Start {TRIAL_DAYS}-day free trial <ArrowRight className="size-4" />
        </ButtonLink>
        <span className="inline-flex items-center gap-2 text-sm text-muted">
          <ShieldCheck className="size-4 text-ok" /> Pay securely with UPI, cards or net banking when your trial ends.
        </span>
      </div>

      <div className="mt-16 max-w-3xl">
        <h2 className="text-lg font-semibold">Questions</h2>
        <div className="mt-4 divide-y divide-line border-y border-line">
          {faqs.map((f) => (
            <details key={f.q} className="group py-4">
              <summary className="flex list-none items-center justify-between font-semibold">
                {f.q}
                <span className="text-xl text-muted transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
