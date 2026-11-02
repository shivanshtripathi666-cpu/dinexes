"use client";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand";
import { RequireRestaurant, useDash } from "@/components/dash-context";
import { MenuManager } from "@/components/menu-manager";
import { BrandingForm, HoursForm, ProfileForm } from "@/components/restaurant-forms";
import { AddSeatsForm, useSeats } from "@/components/seats-manager";
import { useSession } from "@/components/session";
import { Alert, Button, Card, cx } from "@/components/ui";
import { api, errorText } from "@/lib/api";

const STEPS = ["Details", "Logo & cover", "Opening hours", "QR codes", "Menu", "Finish"];

export default function OnboardingPage() {
  return (
    <RequireRestaurant allowNotOnboarded>
      <Wizard />
    </RequireRestaurant>
  );
}

function Wizard() {
  const d = useDash();
  const router = useRouter();
  const { refresh, signOut } = useSession();
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const seats = useSeats(d.rid);
  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));

  useEffect(() => {
    if (d.role !== "owner") router.replace("/dashboard");
  }, [d.role, router]);

  async function finish() {
    setBusy(true);
    setError("");
    try {
      await api("/api/restaurants", { method: "PATCH", body: { onboarded: true } });
      await refresh();
      router.replace("/dashboard");
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-paper">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <Logo href="/onboarding" />
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-muted sm:inline">Setting up {d.restaurant.name}</span>
            <button
              type="button"
              onClick={async () => {
                await signOut();
                router.replace("/login");
              }}
              className="text-sm font-semibold text-muted underline underline-offset-4 hover:text-ink"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <ol className="mb-8 flex flex-wrap gap-x-5 gap-y-2" aria-label="Set-up steps">
          {STEPS.map((s, i) => (
            <li key={s}>
              <button
                type="button"
                onClick={() => setStep(i)}
                className={cx("flex items-center gap-2 text-sm", i === step ? "font-semibold text-ink" : "text-muted hover:text-ink")}
                aria-current={i === step ? "step" : undefined}
              >
                <span
                  className={cx(
                    "flex size-6 items-center justify-center rounded-full border text-xs font-bold",
                    i < step ? "border-ok bg-ok text-white" : i === step ? "border-ink bg-ink text-ivory" : "border-line bg-white",
                  )}
                >
                  {i < step ? <Check className="size-3.5" /> : i + 1}
                </span>
                {s}
              </button>
            </li>
          ))}
        </ol>

        <Card className="p-5 sm:p-7">
          <h1 className="display text-2xl font-semibold">{STEPS[step]}</h1>
          <div className="mt-5">
            {step === 0 && <ProfileForm r={d.restaurant} onSaved={next} submitLabel="Save and continue" />}
            {step === 1 && <BrandingForm r={d.restaurant} onSaved={next} submitLabel="Save and continue" />}
            {step === 2 && <HoursForm r={d.restaurant} onSaved={next} submitLabel="Save and continue" />}
            {step === 3 && (
              <div className="space-y-5">
                <p className="text-sm text-muted">
                  Pick the QR type that fits your place: one code per dining seat, or one code for a parcel counter or a stall. You can add more types later.
                </p>
                {seats.data.length > 0 && (
                  <Alert tone="ok">
                    {seats.data.length} QR {seats.data.length === 1 ? "code" : "codes"} created.
                  </Alert>
                )}
                <AddSeatsForm initial={seats.data.length ? 1 : 10} kinds={d.access.kinds} />
                <Button variant="outline" onClick={next} disabled={!seats.data.length}>
                  Continue
                </Button>
              </div>
            )}
            {step === 4 && (
              <div className="space-y-5">
                <p className="text-sm text-muted">Add a few categories and dishes now. You can complete the menu any time from the dashboard.</p>
                <MenuManager rid={d.rid} />
                <Button variant="outline" onClick={next}>
                  Continue
                </Button>
              </div>
            )}
            {step === 5 && (
              <div className="space-y-4">
                <p className="text-muted">
                  Your restaurant is ready. Print the QR cards from <strong className="text-ink">Seats &amp; QR</strong>, place one on every seat, and open the{" "}
                  <strong className="text-ink">Kitchen</strong> screen on the kitchen phone.
                </p>
                {error && <Alert tone="bad">{error}</Alert>}
                <Button size="lg" onClick={finish} loading={busy}>
                  Open dashboard
                </Button>
              </div>
            )}
          </div>
        </Card>
        {step < 5 && (
          <button type="button" onClick={next} className="mt-4 text-sm text-muted underline underline-offset-4 hover:text-ink">
            Skip this step for now
          </button>
        )}
      </div>
    </div>
  );
}
