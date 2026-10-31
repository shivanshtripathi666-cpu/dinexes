import { QrCode, UtensilsCrossed } from "lucide-react";
import { formatINR } from "@/lib/money";
import type { PublicMenu } from "@/lib/server/public";
import { EmptyState, VegMark } from "../ui";
import { MenuHeader } from "./menu-header";

/** Read-only menu for the restaurant's public link. */
export function MenuView({ menu }: { menu: PublicMenu }) {
  return (
    <div className="min-h-dvh bg-paper">
      <MenuHeader r={menu.restaurant} />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <p className="mb-6 flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-3 text-sm text-muted">
          <QrCode className="size-4 shrink-0 text-amber-deep" /> To order, scan the QR code on your seat.
        </p>
        {menu.categories.length === 0 && (
          <EmptyState icon={<UtensilsCrossed className="size-7" />} title="Menu coming soon" />
        )}
        {menu.categories.map((c) => (
          <section key={c.id} className="mb-8">
            <h2 className="mb-3 text-lg font-semibold">{c.name}</h2>
            <ul className="divide-y divide-line rounded-xl border border-line bg-white">
              {menu.dishes
                .filter((d) => d.categoryId === c.id)
                .map((d) => (
                  <li key={d.id} className="flex gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 font-medium">
                        <VegMark veg={d.veg} /> {d.name}
                      </p>
                      <p className="mt-0.5 text-sm font-semibold">{formatINR(d.pricePaise)}</p>
                      {d.description && <p className="mt-1 text-sm text-muted">{d.description}</p>}
                      {!d.available && <p className="mt-1 text-xs font-semibold text-bad">Sold out</p>}
                    </div>
                    {d.photoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={d.photoUrl} alt="" className="size-20 shrink-0 rounded-lg object-cover" loading="lazy" />
                    )}
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </main>
    </div>
  );
}
