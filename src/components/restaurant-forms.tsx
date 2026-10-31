"use client";
import { useState } from "react";
import { api, errorText } from "@/lib/api";
import { RESTAURANT_CATEGORIES } from "@/lib/config";
import type { Hours, Restaurant } from "@/lib/types";
import { ImagePicker } from "./image-picker";
import { Alert, Button, Field, Input, Textarea, cx } from "./ui";

function useSaver() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  async function save(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      await api("/api/restaurants", { method: "PATCH", body });
      setSaved(true);
      return true;
    } catch (e) {
      setError(errorText(e));
      return false;
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, saved, save };
}

export function ProfileForm({ r, onSaved, submitLabel = "Save details" }: { r: Restaurant; onSaved?: () => void; submitLabel?: string }) {
  const [v, setV] = useState({ name: r.name, tagline: r.tagline, address: r.address, city: r.city, phone: r.phone, email: r.email, cuisines: r.cuisines });
  const s = useSaver();
  const set = (k: "name" | "tagline" | "address" | "city" | "phone" | "email") => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setV((x) => ({ ...x, [k]: e.target.value }));
  const toggle = (c: string) =>
    setV((x) => ({ ...x, cuisines: x.cuisines.includes(c) ? x.cuisines.filter((y) => y !== c) : x.cuisines.length < 6 ? [...x.cuisines, c] : x.cuisines }));

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (await s.save(v)) onSaved?.();
      }}
    >
      <Field label="Restaurant name" htmlFor="r-name">
        <Input id="r-name" value={v.name} onChange={set("name")} required />
      </Field>
      <Field label="Short line under your name" htmlFor="r-tag" hint="Optional, e.g. “Dum biryani since 1998”.">
        <Input id="r-tag" value={v.tagline} onChange={set("tagline")} maxLength={90} />
      </Field>
      <Field label="Address" htmlFor="r-address">
        <Textarea id="r-address" value={v.address} onChange={set("address")} maxLength={200} className="min-h-20" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="City" htmlFor="r-city">
          <Input id="r-city" value={v.city} onChange={set("city")} required />
        </Field>
        <Field label="Phone" htmlFor="r-phone">
          <Input id="r-phone" type="tel" value={v.phone} onChange={set("phone")} required />
        </Field>
        <Field label="Contact email" htmlFor="r-email">
          <Input id="r-email" type="email" value={v.email} onChange={set("email")} />
        </Field>
      </div>
      <fieldset>
        <legend className="text-sm font-semibold">Categories</legend>
        <p className="text-xs text-muted">Choose up to 6.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {RESTAURANT_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => toggle(c)}
              aria-pressed={v.cuisines.includes(c)}
              className={cx(
                "rounded-md border px-3 py-1.5 text-sm",
                v.cuisines.includes(c) ? "border-ink bg-ink text-ivory" : "border-line bg-white text-ink hover:border-ink/40",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </fieldset>
      {s.error && <Alert tone="bad">{s.error}</Alert>}
      {s.saved && !onSaved && <Alert tone="ok">Saved.</Alert>}
      <Button type="submit" loading={s.busy}>
        {submitLabel}
      </Button>
    </form>
  );
}

export function BrandingForm({ r, onSaved, submitLabel = "Save images" }: { r: Restaurant; onSaved?: () => void; submitLabel?: string }) {
  const [logoUrl, setLogo] = useState(r.logoUrl);
  const [coverUrl, setCover] = useState(r.coverUrl);
  const s = useSaver();
  return (
    <div className="space-y-5">
      <div className="grid gap-6 sm:grid-cols-[auto_1fr]">
        <div>
          <p className="mb-2 text-sm font-semibold">Logo</p>
          <ImagePicker kind="logo" value={logoUrl} onChange={setLogo} label="Add logo" />
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold">Cover photo</p>
          <ImagePicker kind="cover" value={coverUrl} onChange={setCover} label="Add cover photo" aspect="wide" />
        </div>
      </div>
      {s.error && <Alert tone="bad">{s.error}</Alert>}
      {s.saved && !onSaved && <Alert tone="ok">Saved.</Alert>}
      <Button
        loading={s.busy}
        onClick={async () => {
          if (await s.save({ logoUrl, coverUrl })) onSaved?.();
        }}
      >
        {submitLabel}
      </Button>
    </div>
  );
}

export function HoursForm({ r, onSaved, submitLabel = "Save hours" }: { r: Restaurant; onSaved?: () => void; submitLabel?: string }) {
  const [hours, setHours] = useState<Hours[]>(r.hours);
  const s = useSaver();
  const upd = (i: number, patch: Partial<Hours>) => setHours((h) => h.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <div className="space-y-4">
      <div className="divide-y divide-line rounded-xl border border-line bg-white">
        {hours.map((h, i) => (
          <div key={h.day} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <span className="w-24 text-sm font-semibold">{h.day}</span>
            <label className="flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" checked={h.closed} onChange={(e) => upd(i, { closed: e.target.checked })} className="size-4 accent-[#131b2b]" />
              Closed
            </label>
            {!h.closed && (
              <div className="ml-auto flex items-center gap-2">
                <Input type="time" aria-label={`${h.day} opening time`} value={h.open} onChange={(e) => upd(i, { open: e.target.value })} className="h-10 w-28" />
                <span className="text-muted">to</span>
                <Input type="time" aria-label={`${h.day} closing time`} value={h.close} onChange={(e) => upd(i, { close: e.target.value })} className="h-10 w-28" />
              </div>
            )}
          </div>
        ))}
      </div>
      <button type="button" className="text-sm font-semibold text-ink underline underline-offset-4" onClick={() => setHours((h) => h.map((x) => ({ ...x, open: h[0].open, close: h[0].close, closed: h[0].closed })))}>
        Use Monday’s hours for every day
      </button>
      {s.error && <Alert tone="bad">{s.error}</Alert>}
      {s.saved && !onSaved && <Alert tone="ok">Saved.</Alert>}
      <div>
        <Button
          loading={s.busy}
          onClick={async () => {
            if (await s.save({ hours })) onSaved?.();
          }}
        >
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
