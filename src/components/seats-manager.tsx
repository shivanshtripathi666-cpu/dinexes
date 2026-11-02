"use client";
import { orderBy } from "firebase/firestore";
import { Download, Lock, Printer, QrCode, RefreshCw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { api, errorText } from "@/lib/api";
import { QR_KINDS, QR_KIND_INFO, TIERS, type QrKind } from "@/lib/config";
import { useLiveCollection } from "@/lib/firebase/hooks";
import { mapSeat } from "@/lib/mappers";
import type { Seat } from "@/lib/types";
import { useDash } from "./dash-context";
import { Modal } from "./modal";
import { QrSvg, downloadQrPng, seatUrl } from "./qr";
import { Alert, Badge, Button, Card, EmptyState, Input, Spinner, Toggle, buttonClass, cx } from "./ui";

export function useSeats(rid: string) {
  return useLiveCollection(`restaurants/${rid}/seats`, [orderBy("number")], "number", mapSeat);
}

/**
 * Adds QR codes of one kind. With `kinds`, the owner first picks the kind (used in onboarding);
 * otherwise the kind is fixed by the tab the form sits in.
 */
export function AddSeatsForm({ onDone, initial = 10, kind: fixedKind, kinds }: { onDone?: () => void; initial?: number; kind?: QrKind; kinds?: readonly QrKind[] }) {
  const [kind, setKind] = useState<QrKind>(fixedKind || (kinds?.includes("dine") ? "dine" : kinds?.[0]) || "dine");
  const [count, setCount] = useState(String(initial));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const info = QR_KIND_INFO[kind];
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        setOkMsg("");
        try {
          await api("/api/seats", { method: "POST", body: { count: Number(count), kind } });
          setOkMsg(`${count} ${info.name.toLowerCase()} ${count === "1" ? "code" : "codes"} added.`);
          setCount("1");
          onDone?.();
        } catch (err) {
          setError(errorText(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      {kinds && kinds.length > 1 && !fixedKind && (
        <fieldset>
          <legend className="text-sm font-semibold">Type of QR code</legend>
          <div className="mt-1.5 grid gap-2 sm:grid-cols-3">
            {kinds.map((k) => (
              <label
                key={k}
                className={cx("tap flex cursor-pointer flex-col rounded-xl border p-3 text-sm", kind === k ? "border-ink bg-ivory ring-2 ring-amber" : "border-line bg-white")}
              >
                <input type="radio" name="qr-kind" value={k} checked={kind === k} onChange={() => setKind(k)} className="sr-only" />
                <span className="font-semibold">{QR_KIND_INFO[k].plural}</span>
                <span className="mt-0.5 text-xs text-muted">{QR_KIND_INFO[k].hint}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-sm font-semibold">
          How many?
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            max={100}
            value={count}
            onChange={(e) => setCount(e.target.value)}
            className="mt-1.5 w-28"
            aria-label={`Number of ${info.plural.toLowerCase()} QR codes to add`}
          />
        </label>
        <Button type="submit" variant="dark" loading={busy} data-testid={`add-qr-${kind}`}>
          Add {info.plural.toLowerCase()} QR
        </Button>
      </div>
      {error && <Alert tone="bad">{error}</Alert>}
      {okMsg && <Alert tone="ok">{okMsg}</Alert>}
    </form>
  );
}

export function SeatsManager({ rid, restaurantName }: { rid: string; restaurantName: string }) {
  const d = useDash();
  const allowed = d.access.kinds;
  const seats = useSeats(rid);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [confirm, setConfirm] = useState<{ seat: Seat; action: "regenerate" | "delete" } | null>(null);
  // Tabs: the kinds in the plan, plus any kind that still has codes from an earlier plan.
  const tabs = QR_KINDS.filter((k) => allowed.includes(k) || seats.data.some((s) => s.kind === k));
  const [tab, setTab] = useState<QrKind | null>(null);
  // Open on the first type the plan includes; paused types stay one tap away.
  const current: QrKind = tab && tabs.includes(tab) ? tab : tabs.find((k) => allowed.includes(k)) || tabs[0] || "counter";
  const inPlan = allowed.includes(current);
  const list = seats.data.filter((s) => s.kind === current);
  const locked = QR_KINDS.filter((k) => !allowed.includes(k));

  async function run(key: string, fn: () => Promise<unknown>) {
    setBusy(key);
    setErr("");
    try {
      await fn();
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setBusy("");
    }
  }

  if (seats.loading) {
    return (
      <div className="flex justify-center py-16 text-muted">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {tabs.length > 1 && (
        <div className="flex gap-1 overflow-x-auto rounded-xl border border-line bg-white p-1 [scrollbar-width:none]" role="tablist" aria-label="QR code types">
          {tabs.map((k) => {
            const n = seats.data.filter((s) => s.kind === k).length;
            return (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={current === k}
                onClick={() => setTab(k)}
                className={cx("shrink-0 rounded-lg px-3.5 py-2 text-sm font-semibold", current === k ? "bg-ink text-ivory" : "text-muted hover:text-ink")}
                data-testid={`qr-tab-${k}`}
              >
                {QR_KIND_INFO[k].plural} <span className="opacity-70">({n})</span>
              </button>
            );
          })}
        </div>
      )}

      {inPlan ? (
        <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-3 text-sm text-muted">{QR_KIND_INFO[current].hint}</p>
            <AddSeatsForm key={current} kind={current} initial={list.length ? 1 : current === "dine" ? 10 : 1} />
          </div>
          {list.length > 0 && (
            <Link href={`/dashboard/qr/print?kind=${current}`} target="_blank" className={buttonClass("outline")}>
              <Printer className="size-4" /> Print {QR_KIND_INFO[current].plural.toLowerCase()} cards
            </Link>
          )}
        </Card>
      ) : (
        <Alert tone="amber" title={`${QR_KIND_INFO[current].plural} QR codes are paused`}>
          They are part of the {TIERS.premium.name} plan. Guests who scan them are asked to order at the counter.{" "}
          <Link href="/dashboard/billing?plan=prem3" className="font-semibold underline">
            Switch to {TIERS.premium.name}
          </Link>
        </Alert>
      )}

      {locked.length > 0 && inPlan && (
        <Link href="/dashboard/billing?plan=prem3" className="tap flex items-center gap-3 rounded-xl border border-dashed border-ink/30 bg-ivory p-4 text-sm" data-testid="qr-upgrade">
          <Lock className="size-5 shrink-0 text-muted" />
          <span>
            <span className="font-semibold">Want {locked.map((k) => QR_KIND_INFO[k].plural.toLowerCase()).join(" and ")} QR codes?</span>{" "}
            <span className="text-muted">They come with {TIERS.premium.name}, from ₹{TIERS.premium.monthlyInr} a month.</span>
          </span>
        </Link>
      )}

      {(err || seats.error) && <Alert tone="bad">{err || seats.error}</Alert>}
      {list.length === 0 ? (
        <EmptyState icon={<QrCode className="size-7" />} title={`No ${QR_KIND_INFO[current].plural.toLowerCase()} QR codes yet`}>
          {current === "dine"
            ? "Add your seats. Each one gets its own QR code, so orders arrive with the seat number."
            : current === "takeaway"
              ? "Add one parcel QR for your takeaway counter. Guests scan, order, write their name and collect the packed food."
              : "Add one QR for your stall or counter. Guests scan, see the full menu, write their name and order. The kitchen hears the name."}
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((s) => (
            <Card key={s.id} className="p-4" data-testid={`seat-card-${s.number}`} data-qr-kind={s.kind} data-seat-url={seatUrl(s.token)}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-lg font-bold">{s.label}</p>
                  <Badge tone={s.active && inPlan ? "ok" : "neutral"} className="mt-1">
                    {!inPlan ? "Paused (plan)" : s.active ? "Taking orders" : "Disabled"}
                  </Badge>
                </div>
                <Toggle label={`${s.label} active`} checked={s.active} disabled={busy === s.id} onChange={(v) => run(s.id, () => api("/api/seats", { method: "PATCH", body: { id: s.id, active: v } }))} />
              </div>
              <div className={s.active && inPlan ? "" : "opacity-40"}>
                <QrSvg value={seatUrl(s.token)} className="mx-auto mt-3 size-40" />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Button size="sm" variant="outline" onClick={() => downloadQrPng(seatUrl(s.token), `${restaurantName}-${s.label}.png`.replace(/\s+/g, "-"), s.label)}>
                  <Download className="size-4" /> PNG
                </Button>
                <a href={seatUrl(s.token)} target="_blank" rel="noreferrer" className={buttonClass("ghost", "sm")}>
                  Open menu
                </a>
                <Button size="sm" variant="ghost" aria-label={`New QR code for ${s.label}`} onClick={() => setConfirm({ seat: s, action: "regenerate" })}>
                  <RefreshCw className="size-4" />
                </Button>
                <Button size="sm" variant="ghost" aria-label={`Delete ${s.label}`} onClick={() => setConfirm({ seat: s, action: "delete" })}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <Modal open={!!confirm} onClose={() => setConfirm(null)} title={confirm?.action === "delete" ? "Delete QR code?" : "Replace QR code?"}>
        {confirm && (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              {confirm.action === "delete"
                ? `${confirm.seat.label} and its QR code will be removed. Past orders keep their label.`
                : `The current QR code for ${confirm.seat.label} will stop working immediately. Print and put up the new card.`}
            </p>
            <div className="flex gap-2">
              <Button
                variant={confirm.action === "delete" ? "danger" : "dark"}
                loading={busy === "confirm"}
                onClick={async () => {
                  const c = confirm;
                  await run("confirm", () =>
                    c.action === "delete" ? api("/api/seats", { method: "DELETE", body: { id: c.seat.id } }) : api("/api/seats", { method: "PATCH", body: { id: c.seat.id, action: "regenerate" } }),
                  );
                  setConfirm(null);
                }}
              >
                {confirm.action === "delete" ? "Delete" : "Replace QR code"}
              </Button>
              <Button variant="outline" onClick={() => setConfirm(null)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
