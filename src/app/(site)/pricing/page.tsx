import { Check } from "lucide-react";
import type { Metadata } from "next";
import { ButtonLink, Card } from "@/components/ui";
import { MAX_STAFF, PLAN_PRICE_INR, TRIAL_DAYS } from "@/lib/config";

export const metadata: Metadata = { title: "Pricing" };

const included = [
  "QR code for every seat, printable cards",
  "Customer menu with photos, no app or login",
  "Kitchen screen with voice announcements",
  "Counter screen with payment status",
  `Up to ${MAX_STAFF} staff logins (owner, manager, cashier, kitchen)`,
  "Menu, seats and sold-out control",
  "Daily sales and best-selling dishes",
  "No commission on your food orders",
];

const faqs = [
  { q: "What happens after the free trial?", a: `Your ${TRIAL_DAYS}-day trial starts when you register. After it ends, your dashboard stays available but guests cannot place new orders until you renew.` },
  { q: "How do guests pay for food?", a: "At your counter, the way they do today. Your cashier marks each order as paid. Online payment for food is not part of this version." },
  { q: "Do I need special hardware?", a: "No. Use any Android phone or tablet for the kitchen and counter, and print the QR cards on paper." },
  { q: "Can I add more than four staff logins?", a: `The plan includes ${MAX_STAFF} logins per restaurant. You can remove a login at any time and add someone else.` },
];

export default function Pricing() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="display text-4xl font-semibold">Simple pricing</h1>
      <p className="mt-2 text-muted">One plan for every restaurant. Prices in Indian rupees, GST as applicable.</p>

      <div className="mt-10 grid gap-8 md:grid-cols-[1fr_1.1fr]">
        <Card className="border-ink p-7">
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-deep">Dinexes Restaurant</p>
          <p className="mt-4 flex items-baseline gap-1.5">
            <span className="text-5xl font-bold" data-testid="plan-price">₹{PLAN_PRICE_INR}</span>
            <span className="text-muted">/ month per restaurant</span>
          </p>
          <p className="mt-2 text-sm text-muted">{TRIAL_DAYS}-day free trial. No card needed to start.</p>
          <ButtonLink href="/register" size="lg" className="mt-6 w-full">
            Start free trial
          </ButtonLink>
          <ul className="mt-7 space-y-3">
            {included.map((i) => (
              <li key={i} className="flex gap-3 text-[15px]">
                <Check className="mt-0.5 size-4 shrink-0 text-ok" /> {i}
              </li>
            ))}
          </ul>
        </Card>
        <div>
          <h2 className="text-lg font-semibold">Questions</h2>
          <dl className="mt-4 divide-y divide-line border-y border-line">
            {faqs.map((f) => (
              <div key={f.q} className="py-5">
                <dt className="font-semibold">{f.q}</dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-muted">{f.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
