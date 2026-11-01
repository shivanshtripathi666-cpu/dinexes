"use client";
import { Printer } from "lucide-react";
import { Mark } from "@/components/brand";
import { useDash } from "@/components/dash-context";
import { NoAccess } from "@/components/dash-shell";
import { QrSvg, seatUrl } from "@/components/qr";
import { useSeats } from "@/components/seats-manager";
import { Button, ButtonLink, EmptyState, Spinner } from "@/components/ui";
import { APP_NAME } from "@/lib/config";
import { can } from "@/lib/roles";

/** Printable table cards: 6 per A4 page. */
export default function PrintPage() {
  const d = useDash();
  const seats = useSeats(d.rid);
  if (!can(d.role, "seats.manage")) return <NoAccess />;
  const list = seats.data.filter((s) => s.active);
  return (
    <div>
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="display text-2xl font-semibold">Print QR cards</h1>
          <p className="text-sm text-muted">Six cards per A4 page. Cut along the edges and place one on each seat.</p>
        </div>
        <Button onClick={() => window.print()} disabled={!list.length}>
          <Printer className="size-4" /> Print
        </Button>
      </div>
      {seats.loading ? (
        <Spinner />
      ) : list.length === 0 ? (
        <EmptyState title="No active seats" action={<ButtonLink href="/dashboard/qr">Add seats</ButtonLink>}>
          Add seats first; each one gets a QR card to print.
        </EmptyState>
      ) : (
        <div className="grid grid-cols-2 gap-4 print:gap-0 sm:grid-cols-3 print:grid-cols-2">
          {list.map((s) => (
            <div key={s.id} className="flex break-inside-avoid flex-col items-center rounded-xl border border-dashed border-ink/40 bg-white p-5 text-center print:h-[93mm] print:rounded-none">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted">{d.restaurant.name}</p>
              <p className="display mt-1 text-2xl font-semibold">Scan to order</p>
              <QrSvg value={seatUrl(s.token)} className="my-3 size-40" />
              <p className="text-2xl font-bold">{s.label}</p>
              <p className="mt-2 flex items-center gap-1.5 text-[10px] text-muted">
                <Mark className="size-3.5" /> {APP_NAME} · Pay at the counter
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
