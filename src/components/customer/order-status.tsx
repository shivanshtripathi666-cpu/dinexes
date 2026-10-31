"use client";
import { doc, onSnapshot } from "firebase/firestore";
import { Check, ChefHat, CircleX, Clock, HandPlatter, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { fb } from "@/lib/firebase/client";
import { formatINR } from "@/lib/money";
import { STATUS_LABEL, type OrderStatus } from "@/lib/roles";
import { formatTime } from "@/lib/time";
import type { PublicOrderStatus } from "@/lib/types";
import { buttonClass, cx } from "../ui";

const STEPS: { s: OrderStatus; label: string; text: string; icon: typeof Check }[] = [
  { s: "new", label: "Order received", text: "The kitchen has your order.", icon: Clock },
  { s: "accepted", label: "Accepted", text: "The kitchen has accepted your order.", icon: Check },
  { s: "preparing", label: "Preparing", text: "Your food is being prepared.", icon: ChefHat },
  { s: "ready", label: "Ready", text: "Your food is ready and will be served shortly.", icon: HandPlatter },
  { s: "served", label: "Served", text: "Enjoy your meal.", icon: Check },
];

export function OrderStatusView({ token, initial }: { token: string; initial: PublicOrderStatus }) {
  const [o, setO] = useState(initial);
  const [live, setLive] = useState(true);

  useEffect(() => {
    let stop = () => {};
    let timer: ReturnType<typeof setInterval> | null = null;
    const poll = () => {
      timer = setInterval(async () => {
        try {
          const r = await fetch(`/api/orders/status/${token}`, { cache: "no-store" });
          if (r.ok) setO(await r.json());
        } catch {
          /* try again next tick */
        }
      }, 8000);
    };
    try {
      stop = onSnapshot(
        doc(fb().db, `orderStatus/${token}`),
        (s) => {
          if (s.exists()) setO(s.data() as PublicOrderStatus);
          setLive(true);
        },
        () => {
          setLive(false);
          poll();
        },
      );
    } catch {
      setLive(false);
      poll();
    }
    return () => {
      stop();
      if (timer) clearInterval(timer);
    };
  }, [token]);

  const idx = STEPS.findIndex((x) => x.s === o.status);
  const cancelled = o.status === "cancelled";

  return (
    <div className="min-h-dvh bg-paper">
      <header className="bg-navy px-4 pb-8 pt-6 text-ivory">
        <div className="mx-auto max-w-lg">
          <p className="text-sm text-ivory/70">{o.restaurantName}</p>
          <h1 className="display mt-1 text-3xl font-semibold">Order #{o.number}</h1>
          <p className="mt-1 text-ivory/80">
            {o.seatLabel} · placed at {formatTime(o.createdAt)}
          </p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-md bg-amber px-3 py-1.5 text-sm font-bold text-ink" data-testid="order-status">
            {STATUS_LABEL[o.status]}
          </p>
        </div>
      </header>
      <main className="mx-auto max-w-lg space-y-6 px-4 py-6">
        {cancelled ? (
          <div className="flex gap-3 rounded-xl border border-bad/30 bg-bad-soft p-4 text-bad">
            <CircleX className="size-5 shrink-0" />
            <p className="text-sm">This order was cancelled by the restaurant. Please speak to the staff.</p>
          </div>
        ) : (
          <ol className="rounded-xl border border-line bg-white p-5">
            {STEPS.map((st, i) => {
              const done = i <= idx;
              return (
                <li key={st.s} className="relative flex gap-4 pb-5 last:pb-0">
                  {i < STEPS.length - 1 && <span className={cx("absolute left-[15px] top-8 h-[calc(100%-24px)] w-0.5", i < idx ? "bg-ok" : "bg-line")} />}
                  <span className={cx("relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2", done ? "border-ok bg-ok text-white" : "border-line bg-white text-muted")}>
                    <st.icon className="size-4" />
                  </span>
                  <div>
                    <p className={cx("font-semibold", done ? "text-ink" : "text-muted")}>{st.label}</p>
                    {i === idx && <p className="text-sm text-muted">{st.text}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        <section className="rounded-xl border border-line bg-white p-5">
          <h2 className="font-semibold">Items</h2>
          <ul className="mt-3 space-y-2">
            {o.items.map((it, i) => (
              <li key={i} className="flex justify-between text-[15px]">
                <span>{it.name}</span>
                <span className="font-semibold">× {it.qty}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-between border-t border-line pt-3">
            <span className="font-semibold">Total</span>
            <span className="font-bold">{formatINR(o.totalPaise)}</span>
          </div>
          <p className="mt-1 text-xs text-muted">Please pay at the counter.</p>
        </section>

        <a href={`/t/${o.seatToken}`} className={buttonClass("dark", "lg", "w-full")}>
          <Plus className="size-4" /> Order more from this seat
        </a>
        {!live && <p className="text-center text-xs text-muted">Live updates are slow on this connection; the status refreshes every few seconds.</p>}
      </main>
    </div>
  );
}
