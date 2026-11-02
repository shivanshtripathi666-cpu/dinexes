import { ArrowRight, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { PlanGrid, StaffSavings } from "@/components/plans";
import { ButtonLink } from "@/components/ui";
import { MAX_STAFF, TIERS, TRIAL_DAYS, planSaving, plansOf } from "@/lib/config";

const pro6 = plansOf("pro")[2];
const prem6 = plansOf("premium")[2];

export const metadata: Metadata = { title: "Pricing" };

const faqs = [
  { q: "What happens after the free trial?", a: `Your ${TRIAL_DAYS}-day trial starts when you register. After it ends, your dashboard stays open but guests cannot place new orders until you choose a plan.` },
  {
    q: "Pro or Premium?",
    a: `${TIERS.pro.name} is for stalls and quick counters: one QR, full menu, the guest writes a name and you hear it. ${TIERS.premium.name} adds a QR on every dining seat and a parcel QR, for restaurants with seating. You can switch any time.`,
  },
  {
    q: "Why are longer plans cheaper?",
    a: `You pay less per month when you pay for longer. 6 months of ${TIERS.pro.name} is ₹${pro6.priceInr.toLocaleString("en-IN")} instead of ₹${(pro6.months * TIERS.pro.monthlyInr).toLocaleString("en-IN")} (you save ₹${planSaving(pro6).toLocaleString("en-IN")}); 6 months of ${TIERS.premium.name} is ₹${prem6.priceInr.toLocaleString("en-IN")} instead of ₹${(prem6.months * TIERS.premium.monthlyInr).toLocaleString("en-IN")} (you save ₹${planSaving(prem6).toLocaleString("en-IN")}).`,
  },
  { q: "What does the free trial include?", a: `Everything in ${TIERS.premium.name}: dining, parcel and stall QR codes. Choose a plan when the ${TRIAL_DAYS} days are over.` },
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
          Two plans, no commission, no hidden charges. Start with a {TRIAL_DAYS}-day free trial, no card needed. Prices in Indian rupees.
        </p>
        <p className="mt-1 text-sm text-muted">
          {TIERS.pro.name} <span data-testid="plan-price-pro">₹{TIERS.pro.monthlyInr}</span> a month · {TIERS.premium.name}{" "}
          <span data-testid="plan-price-premium">₹{TIERS.premium.monthlyInr}</span> a month. Save more with 3 or 6 months.
        </p>
      </div>

      <div className="mt-10">
        <PlanGrid />
      </div>
      <div className="mt-8 flex flex-wrap items-center gap-4">
        <ButtonLink href="/register" size="lg">
          Start {TRIAL_DAYS}-day free trial <ArrowRight className="size-4" />
        </ButtonLink>
        <span className="inline-flex items-center gap-2 text-sm text-muted">
          <ShieldCheck className="size-4 text-ok" /> Pay securely with UPI, cards or net banking when your trial ends.
        </span>
      </div>

      <div className="mt-16">
        <StaffSavings />
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
