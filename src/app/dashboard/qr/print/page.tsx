"use client";
import { Printer } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Mark } from "@/components/brand";
import { useDash } from "@/components/dash-context";
import { NoAccess } from "@/components/dash-shell";
import { QrSvg, seatUrl } from "@/components/qr";
import { useSeats } from "@/components/seats-manager";
import { Button, ButtonLink, EmptyState, Spinner } from "@/components/ui";
import { APP_NAME, QR_KINDS, QR_KIND_INFO, type QrKind } from "@/lib/config";
import { can } from "@/lib/roles";

const CARD_TEXT: Record<QrKind, { title: string; foot: string }> = {
  dine: { title: "Scan to order", foot: "Pay at the counter" },
  takeaway: { title: "Scan for parcel", foot: "Order, write your name, collect" },
  counter: { title: "Scan, order, collect", foot: "We call your name · Pay at the counter" },
};

export default function PrintPage() {
  return (
    <Suspense>
      <PrintCards />
    </Suspense>
  );
}

/** Printable cards: 6 per A4 page. ?kind=dine|takeaway|counter prints one type only. */
function PrintCards() {
  const d = useDash();
  const seats = useSeats(d.rid);
  const want = useSearchParams().get("kind");
  const only = QR_KINDS.includes(want as QrKind) ? (want as QrKind) : null;
  if (!can(d.role, "seats.manage")) return <NoAccess />;
  const list = seats.data.filter((s) => s.active && d.access.kinds.includes(s.kind) && (!only || s.kind === only));
  return (
    <div>
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="display text-2xl font-semibold">Print {only ? QR_KIND_INFO[only].plural.toLowerCase() : "QR"} cards</h1>
          <p className="text-sm text-muted">Six cards per A4 page. Cut along the edges and put each one where guests can scan it.</p>
        </div>
        <Button onClick={() => window.print()} disabled={!list.length}>
          <Printer className="size-4" /> Print
        </Button>
      </div>
      {seats.loading ? (
        <Spinner />
      ) : list.length === 0 ? (
        <EmptyState title="No active QR codes" action={<ButtonLink href="/dashboard/qr">Add QR codes</ButtonLink>}>
          Add QR codes first; each one gets a card to print.
        </EmptyState>
      ) : (
        <div className="grid grid-cols-2 gap-4 print:gap-0 sm:grid-cols-3 print:grid-cols-2">
          {list.map((s) => (
            <div key={s.id} className="flex break-inside-avoid flex-col items-center rounded-xl border border-dashed border-ink/40 bg-white p-5 text-center print:h-[93mm] print:rounded-none">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted">{d.restaurant.name}</p>
              <p className="display mt-1 text-2xl font-semibold">{CARD_TEXT[s.kind].title}</p>
              <QrSvg value={seatUrl(s.token)} className="my-3 size-40" />
              <p className="text-2xl font-bold">{s.label}</p>
              <p className="mt-2 flex items-center gap-1.5 text-[10px] text-muted">
                <Mark className="size-3.5" /> {APP_NAME} · {CARD_TEXT[s.kind].foot}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
