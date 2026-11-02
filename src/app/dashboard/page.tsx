"use client";
import { orderWho } from "@/lib/order-label";
import { ArrowRight, BarChart3, ChefHat, QrCode, Receipt, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { NextStepButton, useOrderAction } from "@/components/order-actions";
import { Badge } from "@/components/ui";
import { STATUS_LABEL } from "@/lib/roles";
import { ago } from "@/lib/time";
import { SalesBars } from "@/components/bar-chart";
import { YourPlan } from "@/components/your-plan";
import { useDash } from "@/components/dash-context";
import { NoAccess } from "@/components/dash-shell";
import { Card, EmptyState, PageHeader, Spinner, Stat, buttonClass } from "@/components/ui";
import { formatINR } from "@/lib/money";
import { useOrdersSince } from "@/lib/orders-client";
import { can } from "@/lib/roles";
import { topDishes, useDays } from "@/lib/stats-client";
import { startOfDayIST } from "@/lib/time";

export default function OverviewPage() {
  const d = useDash();
  if (!can(d.role, "reports.view")) return <NoAccess />;
  return <Overview />;
}

function Overview() {
  const d = useDash();
  const [since] = useState(() => startOfDayIST().getTime());
  const today = useOrdersSince(d.rid, since);
  const { days, loading } = useDays(d.rid, 14);
  const t = days[days.length - 1];
  const live = today.data.filter((o) => o.status !== "cancelled");
  const inProgress = live.filter((o) => o.status !== "served").length;
  const served = live.filter((o) => o.status === "served").length;
  const top = topDishes(days.slice(-7));
  const anySales = days.some((x) => x.salesPaise > 0);
  const act = useOrderAction();
  const active = [...live].filter((o) => o.status !== "served").reverse();

  return (
    <div>
      <PageHeader
        title={`Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}`}
        subtitle={d.restaurant.name}
        actions={
          <>
            <Link href="/dashboard/kitchen" className={buttonClass("dark", "sm")}>
              <ChefHat className="size-4" /> Kitchen
            </Link>
            <Link href="/dashboard/counter" className={buttonClass("outline", "sm")}>
              <Receipt className="size-4" /> Counter
            </Link>
          </>
        }
      />

      {d.restaurant.seatCount === 0 && (
        <Card className="mb-6 flex flex-col gap-3 border-amber/50 bg-amber-soft p-5 sm:flex-row sm:items-center">
          <QrCode className="size-6 shrink-0 text-amber-deep" />
          <p className="text-sm">
            <strong>Add your QR codes</strong> for dining seats, a parcel counter or a stall. Guests cannot order until there is a code to scan.
          </p>
          <Link href="/dashboard/qr" className={buttonClass("dark", "sm", "sm:ml-auto")}>
            Add QR codes
          </Link>
        </Card>
      )}

      {can(d.role, "billing.manage") && (
        <div className="mb-6">
          <YourPlan />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Orders today" value={today.loading ? "…" : live.length} />
        <Stat label="Sales today" value={loading ? "…" : formatINR(t.salesPaise)} hint="Excluding cancelled orders" />
        <Stat label="In progress" value={today.loading ? "…" : inProgress} hint="Not yet served" />
        <Stat label="Served today" value={today.loading ? "…" : served} />
      </div>

      <Card className="mt-6 p-5" data-testid="live-orders">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-ok opacity-60" />
              <span className="relative inline-flex size-2.5 rounded-full bg-ok" />
            </span>
            Live orders
          </h2>
          <Link href="/dashboard/counter" className="inline-flex items-center gap-1 text-sm font-semibold text-ink hover:underline">
            All orders <ArrowRight className="size-4" />
          </Link>
        </div>
        {act.error && <p className="mb-2 text-sm text-bad">{act.error}</p>}
        {today.loading ? (
          <Spinner />
        ) : active.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No orders in progress. New orders appear here instantly.</p>
        ) : (
          <ul className="divide-y divide-line">
            {active.slice(0, 8).map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="w-24">
                  <p className="truncate font-bold">{orderWho(o)}</p>
                  <p className="text-xs text-muted">
                    #{o.number} · {ago(o.createdAt)}
                  </p>
                </div>
                <p className="min-w-0 flex-1 truncate text-sm">{o.items.map((i) => `${i.qty} × ${i.name}`).join(", ")}</p>
                <Badge tone={o.status === "new" ? "amber" : o.status === "ready" ? "ok" : "info"}>{STATUS_LABEL[o.status]}</Badge>
                <div className="flex w-full gap-2 sm:w-auto">
                  <NextStepButton o={o} role={d.role} busy={act.busy} onStatus={act.setStatus} size="sm" />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Sales, last 14 days</h2>
            <Link href="/dashboard/reports" className="inline-flex items-center gap-1 text-sm font-semibold text-ink hover:underline">
              Reports <ArrowRight className="size-4" />
            </Link>
          </div>
          {loading ? (
            <div className="flex h-44 items-center justify-center text-muted">
              <Spinner />
            </div>
          ) : anySales ? (
            <SalesBars days={days} />
          ) : (
            <EmptyState icon={<BarChart3 className="size-7" />} title="No sales yet">
              Your daily sales will appear here after the first orders.
            </EmptyState>
          )}
        </Card>
        <Card className="p-5">
          <h2 className="mb-4 font-semibold">Most ordered, last 7 days</h2>
          {top.length === 0 ? (
            <EmptyState icon={<UtensilsCrossed className="size-7" />} title="No orders yet" />
          ) : (
            <ol className="space-y-3">
              {top.map((x, i) => (
                <li key={x.name} className="flex items-center gap-3">
                  <span className="w-5 text-sm font-bold text-amber-deep">{i + 1}</span>
                  <span className="flex-1 truncate">{x.name}</span>
                  <span className="text-sm font-semibold tabular-nums">{x.qty}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}
