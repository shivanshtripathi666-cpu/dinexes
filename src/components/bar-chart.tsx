import { formatINR } from "@/lib/money";
import { formatDayKey } from "@/lib/time";
import type { DayStats } from "@/lib/types";

/** Daily sales as bars. Only real numbers; an all-zero period is shown as an empty state by the caller. */
export function SalesBars({ days }: { days: DayStats[] }) {
  const max = Math.max(...days.map((d) => d.salesPaise), 1);
  return (
    <div>
      <div className="flex h-44 items-end gap-1.5" role="img" aria-label="Daily sales chart">
        {days.map((d) => (
          <div key={d.day} className="group relative flex h-full flex-1 flex-col justify-end">
            <div className="rounded-t-[3px] bg-navy-3 transition-colors group-hover:bg-amber" style={{ height: `${Math.max(d.salesPaise ? 3 : 0, (d.salesPaise / max) * 100)}%` }} />
            <span className="pointer-events-none absolute -top-7 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded bg-ink px-2 py-1 text-xs text-ivory group-hover:block">
              {formatDayKey(d.day)}: {formatINR(d.salesPaise)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted">
        <span>{formatDayKey(days[0].day)}</span>
        <span>{formatDayKey(days[days.length - 1].day)}</span>
      </div>
    </div>
  );
}
