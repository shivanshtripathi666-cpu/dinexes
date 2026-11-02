"use client";
import { orderWho } from "@/lib/order-label";
import { Receipt, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useDash } from "@/components/dash-context";
import { NoAccess } from "@/components/dash-shell";
import { NextStepButton, useOrderAction } from "@/components/order-actions";
import { Alert, Badge, Button, Card, EmptyState, Input, Spinner, cx } from "@/components/ui";
import { formatINR } from "@/lib/money";
import { useOrdersSince } from "@/lib/orders-client";
import { STATUS_LABEL, can, canTransition, type OrderStatus } from "@/lib/roles";
import { formatTime, startOfDayIST } from "@/lib/time";
import type { Order } from "@/lib/types";

type Filter = "all" | "new" | "kitchen" | "ready" | "served" | "cancelled" | "unpaid";
const FILTERS: { id: Filter; label: string; match: (o: Order) => boolean }[] = [
  { id: "all", label: "All", match: () => true },
  { id: "new", label: "New", match: (o) => o.status === "new" },
  { id: "kitchen", label: "In kitchen", match: (o) => o.status === "accepted" || o.status === "preparing" },
  { id: "ready", label: "Ready", match: (o) => o.status === "ready" },
  { id: "served", label: "Served", match: (o) => o.status === "served" },
  { id: "unpaid", label: "Unpaid", match: (o) => o.paymentStatus === "unpaid" && o.status !== "cancelled" },
  { id: "cancelled", label: "Cancelled", match: (o) => o.status === "cancelled" },
];

const TONE: Record<OrderStatus, "amber" | "info" | "ok" | "neutral" | "bad"> = {
  new: "amber",
  accepted: "info",
  preparing: "info",
  ready: "ok",
  served: "neutral",
  cancelled: "bad",
};

export default function CounterPage() {
  const d = useDash();
  if (!can(d.role, "orders.counter")) return <NoAccess />;
  return <Counter />;
}

function Counter() {
  const d = useDash();
  const [since] = useState(() => startOfDayIST().getTime());
  const orders = useOrdersSince(d.rid, since);
  const act = useOrderAction();
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    const f = FILTERS.find((x) => x.id === filter)!;
    const term = q.trim().toLowerCase();
    return [...orders.data]
      .reverse()
      .filter(f.match)
      .filter(
        (o) =>
          !term ||
          o.seatLabel.toLowerCase().includes(term) ||
          o.customerName.toLowerCase().includes(term) ||
          String(o.number).includes(term) ||
          String(o.seatNumber) === term,
      );
  }, [orders.data, filter, q]);

  const ready = orders.data.filter((o) => o.status === "ready");
  const live = orders.data.filter((o) => o.status !== "cancelled");
  const unpaid = live.filter((o) => o.paymentStatus === "unpaid");
  const collected = live.filter((o) => o.paymentStatus === "paid").reduce((s, o) => s + o.totalPaise, 0);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="display text-2xl font-semibold">Counter</h1>
          <p className="text-sm text-muted">Today’s orders, live.</p>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <span>
            Unpaid <strong className="tabular-nums">{formatINR(unpaid.reduce((s, o) => s + o.totalPaise, 0))}</strong> ({unpaid.length})
          </span>
          <span>
            Collected <strong className="tabular-nums">{formatINR(collected)}</strong>
          </span>
        </div>
      </div>

      {ready.length > 0 && (
        <Card className="mb-5 border-ok bg-ok-soft p-4">
          <p className="text-sm font-bold uppercase tracking-wide text-ok">Ready to serve</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {ready.map((o) => (
              <span key={o.id} className="rounded-lg bg-white px-3 py-2 text-sm font-semibold">
                #{o.number} · {orderWho(o)}
              </span>
            ))}
          </div>
        </Card>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex gap-1 overflow-x-auto [scrollbar-width:none]" role="tablist" aria-label="Filter orders">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={cx("shrink-0 rounded-md px-3 py-1.5 text-sm font-medium", filter === f.id ? "bg-ink text-ivory" : "text-muted hover:bg-sand hover:text-ink")}
            >
              {f.label} <span className="tabular-nums opacity-70">{orders.data.filter(f.match).length}</span>
            </button>
          ))}
        </div>
        <div className="relative sm:ml-auto sm:w-56">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Seat, name or order no." className="h-10 pl-9" aria-label="Search by seat, name or order number" />
        </div>
      </div>

      {(orders.error || act.error) && <Alert tone="bad" className="mb-4">{orders.error || act.error}</Alert>}

      {orders.loading ? (
        <div className="flex justify-center py-20 text-muted">
          <Spinner />
        </div>
      ) : list.length === 0 ? (
        <EmptyState icon={<Receipt className="size-7" />} title={orders.data.length ? "No orders match this filter" : "No orders yet today"}>
          {orders.data.length ? "Choose another filter." : "Orders appear here as soon as guests place them."}
        </EmptyState>
      ) : (
        <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-white">
          <ul className="divide-y divide-line">
            {list.map((o) => (
              <li key={o.id} className="grid gap-3 p-4 md:grid-cols-[150px_1fr_auto] md:items-center" data-testid={`counter-order-${o.number}`}>
                <div>
                  <p className="break-words text-xl font-bold">{o.customerName || o.seatLabel}</p>
                  {o.kind !== "dine" && <p className="text-xs font-semibold uppercase text-muted">{o.kind === "takeaway" ? "Parcel" : o.seatLabel}</p>}
                  <p className="text-xs text-muted">
                    #{o.number} · {formatTime(o.createdAt)}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-sm">{o.items.map((i) => `${i.qty} × ${i.name}`).join(", ")}</p>
                  {o.note && <p className="mt-0.5 text-xs text-amber-deep">Note: {o.note}</p>}
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <Badge tone={TONE[o.status]}>{STATUS_LABEL[o.status]}</Badge>
                    {o.status !== "cancelled" && (
                      <Badge tone={o.paymentStatus === "paid" ? "ok" : "neutral"}>
                        {o.paymentStatus === "paid" ? `Paid · ${o.paymentMethod.toUpperCase()}` : "Unpaid"}
                      </Badge>
                    )}
                    <span className="text-sm font-bold tabular-nums" data-testid="counter-total">
                      {formatINR(o.totalPaise)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 md:justify-end">
                  <NextStepButton o={o} role={d.role} busy={act.busy} onStatus={act.setStatus} size="sm" />
                  {o.status !== "cancelled" && can(d.role, "payments.mark") && (
                    o.paymentStatus === "paid" ? (
                      <Button size="sm" variant="ghost" loading={act.busy === `${o.id}-pay`} onClick={() => act.setPaid(o, false)}>
                        Undo paid
                      </Button>
                    ) : (
                      <>
                        <Button size="sm" variant="outline" loading={act.busy === `${o.id}-pay`} onClick={() => act.setPaid(o, true, "cash")}>
                          Paid cash
                        </Button>
                        <Button size="sm" variant="outline" disabled={act.busy === `${o.id}-pay`} onClick={() => act.setPaid(o, true, "upi")}>
                          Paid UPI
                        </Button>
                      </>
                    )
                  )}
                  {canTransition(d.role, o.status, "cancelled") && (
                    <Button size="sm" variant="ghost" className="text-bad" loading={act.busy === `${o.id}-cancelled`} onClick={() => act.setStatus(o, "cancelled")}>
                      Cancel
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
