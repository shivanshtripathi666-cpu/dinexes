"use client";
import { Minus, Plus, ShoppingBag, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { api, errorText } from "@/lib/api";
import { MAX_NAME_LENGTH, MAX_QTY_PER_LINE, QR_KIND_INFO } from "@/lib/config";
import { formatINR } from "@/lib/money";
import type { SeatMenuData } from "@/lib/server/public";
import type { Dish } from "@/lib/types";
import { Modal } from "../modal";
import { Alert, Button, EmptyState, Input, Textarea, VegMark, cx } from "../ui";
import { MenuHeader, RatingTag } from "./menu-header";
import { drop, load, newKey, save, type SeatOrderRef } from "./storage";

type Menu = SeatMenuData;
const NAME_KEY = "dx-guest-name";

export function SeatMenu({ token, menu }: { token: string; menu: Menu }) {
  const router = useRouter();
  const kind = menu.seat.kind;
  const needsName = QR_KIND_INFO[kind].needsName;
  const headerLabel = kind === "takeaway" ? "Parcel order" : menu.seat.label;
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const cartKey = `dx-cart-${token}`;
  const idemKey = `dx-idem-${token}`;
  const ordersKey = `dx-orders-${token}`;
  const [cart, setCart] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [past, setPast] = useState<SeatOrderRef[]>([]);
  const [activeCat, setActiveCat] = useState(menu.categories[0]?.id || "");

  const dishById = useMemo(() => new Map(menu.dishes.map((d) => [d.id, d])), [menu.dishes]);

  useEffect(() => {
    const saved = load<Record<string, number>>(cartKey, {});
    const valid: Record<string, number> = {};
    for (const [id, q] of Object.entries(saved)) if (dishById.get(id)?.available && q > 0) valid[id] = Math.min(q, MAX_QTY_PER_LINE);
    setCart(valid);
    setPast(load<SeatOrderRef[]>(ordersKey, []).filter((o) => Date.now() - o.at < 12 * 3600000));
    setName(load<string>(NAME_KEY, ""));
  }, [cartKey, ordersKey, dishById]);

  const setQty = (id: string, q: number) => {
    setCart((c) => {
      const n = { ...c };
      if (q <= 0) delete n[id];
      else n[id] = Math.min(q, MAX_QTY_PER_LINE);
      save(cartKey, n);
      return n;
    });
    drop(idemKey, true);
  };

  const lines = Object.entries(cart)
    .map(([id, qty]) => ({ dish: dishById.get(id), qty }))
    .filter((l): l is { dish: Dish; qty: number } => !!l.dish);
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const total = lines.reduce((s, l) => s + l.qty * l.dish.pricePaise, 0);

  async function place() {
    const guest = name.replace(/\s+/g, " ").trim();
    if (needsName && !/\p{L}/u.test(guest)) {
      setNameError("Please write your name. We call it out when your order is ready.");
      document.getElementById("guest-name")?.focus();
      return;
    }
    setNameError("");
    if (needsName) save(NAME_KEY, guest);
    setBusy(true);
    setError("");
    let key = load<string>(idemKey, "", true);
    if (!key) {
      key = newKey();
      save(idemKey, key, true);
    }
    try {
      const r = await api<{ number: number; publicToken: string }>("/api/orders", {
        method: "POST",
        auth: false,
        body: {
          seatToken: token,
          idempotencyKey: key,
          note,
          customerName: needsName ? guest : "",
          items: lines.map((l) => ({ dishId: l.dish.id, qty: l.qty })),
        },
      });
      drop(idemKey, true);
      drop(cartKey);
      save(`dx-seat-of-${r.publicToken}`, token);
      const refs = [{ token: r.publicToken, number: r.number, at: Date.now() }, ...past.filter((p) => p.token !== r.publicToken)].slice(0, 10);
      save(ordersKey, refs);
      router.push(`/o/${r.publicToken}`);
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-paper pb-28">
      <MenuHeader r={menu.restaurant} seatLabel={headerLabel} />

      {!menu.ordering.ok && (
        <div className="mx-auto max-w-2xl px-4 pt-4">
          <Alert tone="amber" title="Online ordering is not available">
            {menu.ordering.reason}
          </Alert>
        </div>
      )}

      {past.length > 0 && (
        <div className="mx-auto max-w-2xl px-4 pt-4">
          <div className="rounded-lg border border-line bg-white px-4 py-3 text-sm">
            <p className="font-semibold">{needsName ? "Your recent orders" : "Your orders from this seat"}</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {past.map((p) => (
                <Link key={p.token} href={`/o/${p.token}`} className="rounded-md border border-line px-2.5 py-1 font-medium hover:border-ink/40">
                  Order #{p.number}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {menu.categories.length > 1 && (
        <nav className="sticky top-0 z-20 mt-4 border-b border-line bg-paper/95 backdrop-blur" aria-label="Menu categories">
          <div className="mx-auto flex max-w-2xl gap-1 overflow-x-auto px-4 py-2 [scrollbar-width:none]">
            {menu.categories.map((c) => (
              <a
                key={c.id}
                href={`#c-${c.id}`}
                onClick={() => setActiveCat(c.id)}
                className={cx(
                  "shrink-0 rounded-md px-3 py-1.5 text-sm font-medium",
                  activeCat === c.id ? "bg-ink text-ivory" : "text-muted hover:text-ink",
                )}
              >
                {c.name}
              </a>
            ))}
          </div>
        </nav>
      )}

      <main className="mx-auto max-w-2xl px-4 py-5">
        {menu.categories.length === 0 && (
          <EmptyState icon={<UtensilsCrossed className="size-7" />} title="The menu is being prepared">
            Please ask the staff to take your order.
          </EmptyState>
        )}
        {menu.categories.map((c) => (
          <section key={c.id} id={`c-${c.id}`} className="mb-8 scroll-mt-16">
            <h2 className="mb-3 text-lg font-semibold">{c.name}</h2>
            <ul className="space-y-3">
              {menu.dishes
                .filter((d) => d.categoryId === c.id)
                .map((d) => (
                  <li
                    key={d.id}
                    className={cx("flex gap-3 rounded-xl border border-line bg-white p-3", d.available && menu.ordering.ok ? "tap cursor-pointer" : "opacity-60")}
                    data-testid={`menu-dish-${d.name}`}
                    onClick={() => {
                      if (d.available && menu.ordering.ok && !cart[d.id]) setQty(d.id, 1);
                    }}
                  >
                    {d.photoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={d.photoUrl} alt="" className="size-24 shrink-0 rounded-lg object-cover" loading="lazy" />
                    )}
                    <div className="flex min-w-0 flex-1 flex-col">
                      <p className="flex items-start gap-2 font-semibold leading-snug">
                        <span className="mt-0.5">
                          <VegMark veg={d.veg} />
                        </span>
                        {d.name}
                      </p>
                      {d.ratingCount > 0 && <RatingTag avg={d.ratingAvg} count={d.ratingCount} />}
                      {d.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{d.description}</p>}
                      <div className="mt-auto flex items-center justify-between pt-2">
                        <span className="font-bold">{formatINR(d.pricePaise)}</span>
                        {!d.available ? (
                          <span className="text-xs font-semibold uppercase text-bad">Sold out</span>
                        ) : !menu.ordering.ok ? null : cart[d.id] ? (
                          <Qty value={cart[d.id]} onChange={(q) => setQty(d.id, q)} name={d.name} />
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => setQty(d.id, 1)} aria-label={`Add ${d.name}`}>
                            <Plus className="size-4" /> Add
                          </Button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </main>

      {count > 0 && menu.ordering.ok && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-navy px-4 py-3 text-ivory">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
            <div>
              <p className="text-sm text-ivory/70">
                {count} {count === 1 ? "item" : "items"}
              </p>
              <p className="text-lg font-bold">{formatINR(total)}</p>
            </div>
            <Button size="lg" onClick={() => setOpen(true)} data-testid="view-cart">
              <ShoppingBag className="size-4" /> {needsName ? "View bill" : "View order"}
            </Button>
          </div>
        </div>
      )}

      <Modal open={open} locked={busy} onClose={() => setOpen(false)} title={needsName ? "Your bill" : `Your order · ${menu.seat.label}`}>
        <ul className="divide-y divide-line">
          {lines.map((l) => (
            <li key={l.dish.id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{l.dish.name}</p>
                <p className="text-sm text-muted">{formatINR(l.dish.pricePaise)} each</p>
              </div>
              <Qty value={l.qty} onChange={(q) => setQty(l.dish.id, q)} name={l.dish.name} />
              <span className="w-20 text-right font-semibold tabular-nums">{formatINR(l.qty * l.dish.pricePaise)}</span>
            </li>
          ))}
        </ul>
        {needsName && (
          <div className="mt-4">
            <label className="block text-sm font-semibold" htmlFor="guest-name">
              Your name
            </label>
            <Input
              id="guest-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError("");
              }}
              maxLength={MAX_NAME_LENGTH}
              autoComplete="given-name"
              enterKeyHint="done"
              placeholder="e.g. Shivansh"
              className="mt-1.5"
              aria-invalid={!!nameError}
              aria-describedby="guest-name-help"
              data-testid="guest-name"
            />
            <p id="guest-name-help" className={cx("mt-1 text-xs", nameError ? "font-semibold text-bad" : "text-muted")}>
              {nameError || "The kitchen calls this name when your order is ready."}
            </p>
          </div>
        )}
        <label className="mt-4 block text-sm font-semibold" htmlFor="note">
          Instructions for the kitchen
        </label>
        <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Optional, e.g. less spicy" className="mt-1.5 min-h-16" />
        <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
          <span className="font-semibold">Total</span>
          <span className="text-xl font-bold" data-testid="cart-total">
            {formatINR(total)}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted">
          {needsName ? "Check your bill, then confirm. Pay at the counter when you collect." : "Pay at the counter. Final prices are confirmed by the restaurant."}
        </p>
        {error && (
          <Alert tone="bad" className="mt-4">
            {error}
          </Alert>
        )}
        <Button size="lg" className="mt-5 w-full" onClick={place} loading={busy} disabled={!lines.length} data-testid="place-order">
          {needsName ? `Confirm and order · ${formatINR(total)}` : "Place order"}
        </Button>
      </Modal>
    </div>
  );
}

function Qty({ value, onChange, name }: { value: number; onChange: (q: number) => void; name: string }) {
  return (
    <div className="inline-flex h-9 items-center rounded-lg border border-ink">
      <button type="button" onClick={() => onChange(value - 1)} className="flex h-full w-9 items-center justify-center" aria-label={`Remove one ${name}`}>
        <Minus className="size-4" />
      </button>
      <span className="w-7 text-center font-bold tabular-nums" aria-label={`${name} quantity`}>
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={value >= MAX_QTY_PER_LINE}
        className="flex h-full w-9 items-center justify-center disabled:opacity-40"
        aria-label={`Add one more ${name}`}
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}
