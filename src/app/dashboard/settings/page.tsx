"use client";
import { sendEmailVerification } from "firebase/auth";
import { Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import { useDash } from "@/components/dash-context";
import { NoAccess } from "@/components/dash-shell";
import { BrandingForm, HoursForm, ProfileForm } from "@/components/restaurant-forms";
import { useSession } from "@/components/session";
import { Alert, Button, Card, PageHeader, Toggle } from "@/components/ui";
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
      <Section title="Opening hours">
        <HoursForm r={d.restaurant} />
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
