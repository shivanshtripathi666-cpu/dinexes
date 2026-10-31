import { MapPin } from "lucide-react";
import type { PublicMenu } from "@/lib/server/public";

export function MenuHeader({ r, seatLabel }: { r: PublicMenu["restaurant"]; seatLabel?: string }) {
  return (
    <header className="bg-navy text-ivory">
      <div className="relative">
        {r.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={r.coverUrl} alt="" className="h-40 w-full object-cover opacity-80 sm:h-52" />
        ) : (
          <div className="h-24 w-full bg-navy-2" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/30 to-transparent" />
      </div>
      <div className="relative mx-auto -mt-12 max-w-2xl px-4 pb-5">
        <div className="flex items-end gap-3">
          {r.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={r.logoUrl} alt={`${r.name} logo`} className="size-20 shrink-0 rounded-xl border-2 border-navy bg-white object-cover" />
          ) : (
            <div className="flex size-20 shrink-0 items-center justify-center rounded-xl border-2 border-navy bg-amber text-3xl font-bold text-ink">{r.name.slice(0, 1)}</div>
          )}
          <div className="min-w-0 pb-1">
            <h1 className="display truncate text-2xl font-semibold">{r.name}</h1>
            {r.tagline && <p className="truncate text-sm text-ivory/70">{r.tagline}</p>}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ivory/70">
          {seatLabel && (
            <span className="rounded-md bg-amber px-2.5 py-1 text-sm font-bold text-ink" data-testid="seat-label">
              {seatLabel}
            </span>
          )}
          {(r.address || r.city) && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" /> {[r.address, r.city].filter(Boolean).join(", ").slice(0, 80)}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
