"use client";
import { ArrowRight, BarChart3, ChefHat, QrCode, Receipt, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { SalesBars } from "@/components/bar-chart";
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
            <strong>Add your seats</strong> to get QR codes. Guests cannot order until each seat has its code.
          </p>
          <Link href="/dashboard/qr" className={buttonClass("dark", "sm", "sm:ml-auto")}>
            Add seats
          </Link>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Orders today" value={today.loading ? "…" : live.length} />
        <Stat label="Sales today" value={loading ? "…" : formatINR(t.salesPaise)} hint="Excluding cancelled orders" />
        <Stat label="In progress" value={today.loading ? "…" : inProgress} hint="Not yet served" />
        <Stat label="Served today" value={today.loading ? "…" : served} />
      </div>

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
