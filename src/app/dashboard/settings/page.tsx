"use client";
import { sendEmailVerification } from "firebase/auth";
import { CalendarX, Copy, ExternalLink, X } from "lucide-react";
import { useState } from "react";
import { useDash } from "@/components/dash-context";
import { NoAccess } from "@/components/dash-shell";
import { BrandingForm, HoursForm, ProfileForm } from "@/components/restaurant-forms";
import { useSession } from "@/components/session";
import { Alert, Button, Card, Input, PageHeader, Toggle } from "@/components/ui";
import { todayKey } from "@/lib/hours";
import { api, errorText } from "@/lib/api";
import { cfg, fb } from "@/lib/firebase/client";
import { can } from "@/lib/roles";

export default function SettingsPage() {
  const d = useDash();
  if (!can(d.role, "settings.edit")) return <NoAccess />;
  return <Settings />;
}

function Section({ title, text, children }: { title: string; text?: string; children: React.ReactNode }) {
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="font-semibold">{title}</h2>
      {text && <p className="mt-1 text-sm text-muted">{text}</p>}
      <div className="mt-5">{children}</div>
    </Card>
  );
}

function Settings() {
  const d = useDash();
  const { user } = useSession();
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const publicUrl = `${cfg().platformUrl}/r/${d.restaurant.slug}`;

  async function patch(body: Record<string, unknown>) {
    setErr("");
    try {
      await api("/api/restaurants", { method: "PATCH", body });
    } catch (e) {
      setErr(errorText(e));
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Settings" />
      {err && <Alert tone="bad">{err}</Alert>}

      <Section title="Ordering" text="Pause online ordering for all seats, for example when the kitchen is closing.">
        <label className="flex items-center justify-between gap-4">
          <span className="text-sm font-medium">{d.restaurant.settings.acceptingOrders ? "Guests can order from their seat" : "Ordering is paused"}</span>
          <Toggle label="Accept online orders" checked={d.restaurant.settings.acceptingOrders} onChange={(v) => patch({ acceptingOrders: v })} />
        </label>
      </Section>

      <Section title="Kitchen announcements" text="Default voice language for new kitchen devices. Each device can change it on the kitchen screen.">
        <div className="flex gap-2">
          {(["en", "hi"] as const).map((l) => (
            <Button key={l} variant={d.restaurant.settings.voiceLang === l ? "dark" : "outline"} size="sm" onClick={() => patch({ voiceLang: l })}>
              {l === "en" ? "English" : "हिंदी (Hindi)"}
            </Button>
          ))}
        </div>
      </Section>

      <Section title="Restaurant details">
        <ProfileForm r={d.restaurant} />
      </Section>
      <Section title="Logo and cover photo">
        <BrandingForm r={d.restaurant} />
      </Section>
      <Section title="Opening hours" text="When the rule below is on, QR codes stop taking orders outside these hours and tell guests when you open next.">
        <label className="mb-5 flex items-center justify-between gap-4 rounded-xl bg-ivory px-4 py-3">
          <span className="text-sm font-medium">{d.restaurant.settings.followHours ? "Orders only during opening hours" : "Orders any time (hours shown for information)"}</span>
          <Toggle label="Take orders only during opening hours" checked={d.restaurant.settings.followHours} onChange={(v) => patch({ followHours: v })} />
        </label>
        <HoursForm r={d.restaurant} />
      </Section>

      <Section title="Closed dates" text="Holidays and days off. On these days every QR code shows that you are closed and when you open again.">
        <ClosedDates dates={d.restaurant.closedDates} onSave={(closedDates) => patch({ closedDates })} />
      </Section>

      <Section title="Your restaurant’s web address" text="Guests order through each seat’s QR code. This public page shows your menu for viewing only.">
        <div className="flex flex-wrap items-center gap-2">
          <code className="rounded-md bg-ivory px-3 py-2 text-sm">{publicUrl}</code>
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              await navigator.clipboard.writeText(publicUrl).catch(() => undefined);
              setMsg("Link copied.");
            }}
          >
            <Copy className="size-4" /> Copy
          </Button>
          <a href={publicUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold underline underline-offset-4">
            Open <ExternalLink className="size-3.5" />
          </a>
        </div>
        {msg && <p className="mt-2 text-xs text-ok">{msg}</p>}
        <p className="mt-3 text-xs text-muted">Using your own domain (for example menu.yourrestaurant.in) will be available later. Contact support when you need it.</p>
      </Section>

      <Section title="Account">
        <p className="text-sm">
          Signed in as <strong>{d.email}</strong>
          {user?.emailVerified ? " · email verified" : " · email not verified"}
        </p>
        {!user?.emailVerified && (
          <Button
            size="sm"
            variant="outline"
            className="mt-3"
            onClick={async () => {
              const u = fb().auth.currentUser;
              if (!u) return;
              try {
                await sendEmailVerification(u);
                setMsg("Verification email sent. Check your inbox.");
              } catch (e) {
                setErr(errorText(e));
              }
            }}
          >
            Send verification email
          </Button>
        )}
      </Section>
    </div>
  );
}

function niceDate(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(new Date(Date.UTC(y, m - 1, d, 12)));
}

/** Add or remove whole days off. Past days drop off by themselves. */
function ClosedDates({ dates, onSave }: { dates: string[]; onSave: (d: string[]) => Promise<void> }) {
  const today = todayKey();
  const upcoming = dates.filter((x) => x >= today).sort();
  const [pick, setPick] = useState(today);
  const [busy, setBusy] = useState(false);
  async function save(next: string[]) {
    setBusy(true);
    await onSave([...new Set(next)].sort());
    setBusy(false);
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-sm font-semibold">
          Date
          <Input type="date" min={today} value={pick} onChange={(e) => setPick(e.target.value)} className="mt-1.5 w-44" aria-label="Closed date" />
        </label>
        <Button variant="dark" loading={busy} disabled={!pick || pick < today || upcoming.includes(pick)} onClick={() => save([...upcoming, pick])} data-testid="add-closed-date">
          <CalendarX className="size-4" /> Mark closed
        </Button>
      </div>
      {upcoming.length === 0 ? (
        <p className="text-sm text-muted">No closed dates. You are open on every day your hours allow.</p>
      ) : (
        <ul className="flex flex-wrap gap-2" data-testid="closed-dates">
          {upcoming.map((x) => (
            <li key={x} className="inline-flex items-center gap-1 rounded-lg border border-line bg-white py-1 pl-3 pr-1 text-sm">
              {x === today ? "Today" : niceDate(x)}
              <button type="button" className="tap rounded-md p-1 text-muted hover:text-bad" aria-label={`Open again on ${niceDate(x)}`} onClick={() => save(upcoming.filter((y) => y !== x))}>
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
