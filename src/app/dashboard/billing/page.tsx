"use client";
import { orderBy } from "firebase/firestore";
import { Check, CreditCard, Info } from "lucide-react";
import { useState } from "react";
import { useDash } from "@/components/dash-context";
import { NoAccess } from "@/components/dash-shell";
import { useSession } from "@/components/session";
import { Alert, Badge, Button, Card, EmptyState, PageHeader, Spinner } from "@/components/ui";
import { api, errorText } from "@/lib/api";
import { MAX_STAFF, PLAN_PERIOD_DAYS, PLAN_PRICE_INR, TRIAL_DAYS } from "@/lib/config";
import { cfg } from "@/lib/firebase/client";
import { useLiveCollection } from "@/lib/firebase/hooks";
import { mapPayment } from "@/lib/mappers";
import { formatINR } from "@/lib/money";
import { can } from "@/lib/roles";
import { formatDate } from "@/lib/time";

declare global {
  interface Window {
    Razorpay?: new (o: Record<string, unknown>) => { open: () => void; on: (e: string, cb: (r: unknown) => void) => void };
  }
}

function loadCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load the payment window. Check your internet connection."));
    document.body.appendChild(s);
  });
}

export default function BillingPage() {
  const d = useDash();
  if (!can(d.role, "billing.manage")) return <NoAccess />;
  return <Billing />;
}

function Billing() {
  const d = useDash();
  const { refresh } = useSession();
  const payments = useLiveCollection(`restaurants/${d.rid}/payments`, [orderBy("createdAt", "desc")], "createdAt", mapPayment);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const enabled = cfg().paymentsEnabled;
  const a = d.access;

  async function pay() {
    setBusy(true);
    setError("");
    setOk("");
    try {
      const o = await api<{ orderId: string; amount: number; keyId: string }>("/api/billing/checkout", { method: "POST" });
      await loadCheckout();
      const rzp = new window.Razorpay!({
        key: o.keyId,
        amount: o.amount,
        currency: "INR",
        order_id: o.orderId,
        name: "Dinexes",
        description: `${d.restaurant.name} · ${PLAN_PERIOD_DAYS} days`,
        prefill: { email: d.email, contact: d.restaurant.phone },
        theme: { color: "#131b2b" },
        handler: async (resp: Record<string, string>) => {
          try {
            await api("/api/billing/verify", { method: "POST", body: resp });
            await refresh();
            setOk("Payment received. Thank you!");
          } catch (e) {
            setError(errorText(e));
          } finally {
            setBusy(false);
          }
        },
        modal: { ondismiss: () => setBusy(false) },
      });
      rzp.on("payment.failed", () => {
        setError("The payment did not go through. You have not been charged for a new period.");
        setBusy(false);
      });
      rzp.open();
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  }

  return (
    <div className="max-w-4xl">
      <PageHeader title="Subscription & billing" subtitle="One plan per restaurant, billed in Indian rupees." />
      <div className="grid gap-6 md:grid-cols-[1.1fr_1fr]">
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-muted">Current status</p>
              <p className="mt-2 text-2xl font-bold" data-testid="billing-status">
                {a.state === "trialing" ? "Free trial" : a.state === "active" ? "Active" : "Expired"}
              </p>
            </div>
            <Badge tone={a.state === "active" ? "ok" : a.state === "trialing" ? "amber" : "bad"}>
              {a.state === "expired" ? "Ordering paused" : "Taking orders"}
            </Badge>
          </div>
          <p className="mt-3 text-sm text-muted" data-testid="billing-detail">
            {a.state === "trialing" && `${a.daysLeft} ${a.daysLeft === 1 ? "day" : "days"} left of your ${TRIAL_DAYS}-day trial. Ends ${formatDate(a.endsAt)}.`}
            {a.state === "active" && `Paid until ${formatDate(a.endsAt)} (${a.daysLeft} days).`}
            {a.state === "expired" && `Ended ${formatDate(a.endsAt)}. Guests cannot place orders until you renew.`}
          </p>
          <div className="mt-6 border-t border-line pt-5">
            <p className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold" data-testid="billing-price">
                ₹{PLAN_PRICE_INR}
              </span>
              <span className="text-muted">/ {PLAN_PERIOD_DAYS} days</span>
            </p>
            <ul className="mt-3 space-y-1.5 text-sm">
              {["QR ordering on every seat", "Kitchen voice announcements", "Kitchen, counter and owner dashboards", `Up to ${MAX_STAFF} staff logins`, "Sales reports"].map((x) => (
                <li key={x} className="flex gap-2">
                  <Check className="mt-0.5 size-4 text-ok" /> {x}
                </li>
              ))}
            </ul>
            {enabled ? (
              <Button size="lg" className="mt-5 w-full" onClick={pay} loading={busy}>
                <CreditCard className="size-4" /> {a.state === "active" ? `Pay for next ${PLAN_PERIOD_DAYS} days` : a.state === "expired" ? "Renew now" : "Subscribe now"}
              </Button>
            ) : (
              <div className="mt-5 rounded-lg border border-dashed border-line bg-ivory p-4 text-sm" data-testid="payments-placeholder">
                <p className="flex items-center gap-2 font-semibold">
                  <Info className="size-4" /> Online payment is not connected yet
                </p>
                <p className="mt-1 text-muted">
                  The platform owner has not added Razorpay keys. No payment can be taken here, and nothing is marked as paid. See “Connect payments” in
                  the README.
                </p>
              </div>
            )}
            {error && <Alert tone="bad" className="mt-4">{error}</Alert>}
            {ok && <Alert tone="ok" className="mt-4">{ok}</Alert>}
          </div>
        </Card>
        <Card className="p-6">
          <h2 className="font-semibold">Payment history</h2>
          {payments.loading ? (
            <div className="py-8 text-muted">
              <Spinner />
            </div>
          ) : payments.data.filter((p) => p.status === "paid").length === 0 ? (
            <div className="mt-4">
              <EmptyState title="No payments yet" />
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {payments.data
                .filter((p) => p.status === "paid")
                .map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-3 text-sm">
                    <div>
                      <p className="font-medium">{formatINR(p.amountPaise)}</p>
                      <p className="text-xs text-muted">
                        {p.periodStart && p.periodEnd ? `${formatDate(p.periodStart)} – ${formatDate(p.periodEnd)}` : formatDate(p.createdAt)}
                      </p>
                    </div>
                    <span className="text-xs text-muted">{p.providerPaymentId}</span>
                  </li>
                ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
