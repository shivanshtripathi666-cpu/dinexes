"use client";
import { orderBy } from "firebase/firestore";
import { Download, Printer, QrCode, RefreshCw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { api, errorText } from "@/lib/api";
import { useLiveCollection } from "@/lib/firebase/hooks";
import { mapSeat } from "@/lib/mappers";
import type { Seat } from "@/lib/types";
import { Modal } from "./modal";
import { QrSvg, downloadQrPng, seatUrl } from "./qr";
import { Alert, Badge, Button, Card, EmptyState, Input, Spinner, Toggle, buttonClass } from "./ui";

export function useSeats(rid: string) {
  return useLiveCollection(`restaurants/${rid}/seats`, [orderBy("number")], "number", mapSeat);
}

export function AddSeatsForm({ onDone, initial = 10 }: { onDone?: () => void; initial?: number }) {
  const [count, setCount] = useState(String(initial));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        setOkMsg("");
        try {
          await api("/api/seats", { method: "POST", body: { count: Number(count) } });
          setOkMsg(`${count} ${count === "1" ? "seat" : "seats"} added.`);
          setCount("1");
          onDone?.();
        } catch (err) {
          setError(errorText(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="text-sm font-semibold">
        Number of seats to add
        <Input type="number" min={1} max={100} value={count} onChange={(e) => setCount(e.target.value)} className="mt-1.5 w-32" aria-label="Number of seats to add" />
      </label>
      <Button type="submit" variant="dark" loading={busy}>
        Add seats
      </Button>
      {error && <Alert tone="bad" className="w-full">{error}</Alert>}
      {okMsg && <Alert tone="ok" className="w-full">{okMsg}</Alert>}
    </form>
  );
}

export function SeatsManager({ rid, restaurantName }: { rid: string; restaurantName: string }) {
  const seats = useSeats(rid);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [confirm, setConfirm] = useState<{ seat: Seat; action: "regenerate" | "delete" } | null>(null);

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
      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between">
        <AddSeatsForm initial={seats.data.length ? 1 : 10} />
        {seats.data.length > 0 && (
          <Link href="/dashboard/qr/print" target="_blank" className={buttonClass("outline")}>
            <Printer className="size-4" /> Print all QR cards
          </Link>
        )}
      </Card>
      {(err || seats.error) && <Alert tone="bad">{err || seats.error}</Alert>}
      {seats.data.length === 0 ? (
        <EmptyState icon={<QrCode className="size-7" />} title="No seats yet">
          Add your seats. Each one gets its own QR code, so orders arrive with the seat number.
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {seats.data.map((s) => (
            <Card key={s.id} className="p-4" data-testid={`seat-card-${s.number}`} data-seat-url={seatUrl(s.token)}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-lg font-bold">{s.label}</p>
                  <Badge tone={s.active ? "ok" : "neutral"} className="mt-1">
                    {s.active ? "Taking orders" : "Disabled"}
                  </Badge>
                </div>
                <Toggle label={`${s.label} active`} checked={s.active} disabled={busy === s.id} onChange={(v) => run(s.id, () => api("/api/seats", { method: "PATCH", body: { id: s.id, active: v } }))} />
              </div>
              <div className={s.active ? "" : "opacity-40"}>
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
      <Modal open={!!confirm} onClose={() => setConfirm(null)} title={confirm?.action === "delete" ? "Delete seat?" : "Replace QR code?"}>
        {confirm && (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              {confirm.action === "delete"
                ? `${confirm.seat.label} and its QR code will be removed. Past orders keep their seat number.`
                : `The current QR code for ${confirm.seat.label} will stop working immediately. Print and place the new card on the table.`}
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
                {confirm.action === "delete" ? "Delete seat" : "Replace QR code"}
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
