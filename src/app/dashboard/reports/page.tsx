"use client";
import { BarChart3, Download } from "lucide-react";
import { useState } from "react";
import { SalesBars } from "@/components/bar-chart";
import { useDash } from "@/components/dash-context";
import { NoAccess } from "@/components/dash-shell";
import { Button, Card, EmptyState, PageHeader, Spinner, Stat, cx } from "@/components/ui";
import { formatINR } from "@/lib/money";
import { can } from "@/lib/roles";
import { topDishes, useDays } from "@/lib/stats-client";
import { formatDayKey } from "@/lib/time";

export default function ReportsPage() {
  const d = useDash();
  if (!can(d.role, "reports.view")) return <NoAccess />;
  return <Reports />;
}

function Reports() {
  const d = useDash();
  const [range, setRange] = useState(30);
  const { days, loading, error } = useDays(d.rid, range);
  const totals = days.reduce((a, x) => ({ orders: a.orders + x.orders, sales: a.sales + x.salesPaise, collected: a.collected + x.collectedPaise, cancelled: a.cancelled + x.cancelled }), {
    orders: 0,
    sales: 0,
    collected: 0,
    cancelled: 0,
  });
  const top = topDishes(days, 10);

  function csv() {
    const rows = [["Date", "Orders", "Cancelled", "Sales (INR)", "Collected (INR)"], ...days.map((x) => [x.day, x.orders, x.cancelled, (x.salesPaise / 100).toFixed(2), (x.collectedPaise / 100).toFixed(2)])];
    const blob = new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${d.restaurant.slug}-sales-${days[0].day}-to-${days[days.length - 1].day}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Sales are counted when an order is placed; cancelled orders are removed. Collected is what the counter marked as paid."
        actions={
          <>
            {[7, 30, 90].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRange(n)}
                className={cx("rounded-md px-3 py-1.5 text-sm font-medium", range === n ? "bg-ink text-ivory" : "text-muted hover:bg-sand")}
              >
                {n} days
              </button>
            ))}
            <Button size="sm" variant="outline" onClick={csv} disabled={loading}>
              <Download className="size-4" /> CSV
            </Button>
          </>
        }
      />
      {loading ? (
        <div className="flex justify-center py-20 text-muted">
          <Spinner />
        </div>
      ) : error ? (
        <p className="text-bad">{error}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Orders" value={totals.orders} />
            <Stat label="Sales" value={formatINR(totals.sales)} />
            <Stat label="Collected" value={formatINR(totals.collected)} />
            <Stat label="Cancelled" value={totals.cancelled} />
          </div>
          {totals.orders === 0 && totals.cancelled === 0 ? (
            <div className="mt-6">
              <EmptyState icon={<BarChart3 className="size-7" />} title="No orders in this period" />
            </div>
          ) : (
            <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
              <Card className="p-5">
                <h2 className="mb-4 font-semibold">Daily sales</h2>
                <SalesBars days={days} />
                <div className="mt-6 max-h-96 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white text-left text-xs uppercase tracking-wide text-muted">
                      <tr>
                        <th className="py-2">Date</th>
                        <th className="py-2 text-right">Orders</th>
                        <th className="py-2 text-right">Sales</th>
                        <th className="py-2 text-right">Collected</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {[...days].reverse().map((x) => (
                        <tr key={x.day}>
                          <td className="py-2">{formatDayKey(x.day)}</td>
                          <td className="py-2 text-right tabular-nums">{x.orders}</td>
                          <td className="py-2 text-right tabular-nums">{formatINR(x.salesPaise)}</td>
                          <td className="py-2 text-right tabular-nums">{formatINR(x.collectedPaise)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
              <Card className="p-5">
                <h2 className="mb-4 font-semibold">Best-selling dishes</h2>
                <ol className="space-y-3">
                  {top.map((x, i) => (
                    <li key={x.name} className="flex items-center gap-3">
                      <span className="w-6 text-sm font-bold text-amber-deep">{i + 1}</span>
                      <span className="flex-1 truncate">{x.name}</span>
                      <span className="text-sm font-semibold tabular-nums">{x.qty} sold</span>
                    </li>
                  ))}
                </ol>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
