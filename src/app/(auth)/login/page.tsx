"use client";
import { sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { ChefHat, Store } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { PasswordInput } from "@/components/password-input";
import { useSession } from "@/components/session";
import { Alert, Button, Field, Input, cx } from "@/components/ui";
import { api, errorText } from "@/lib/api";
import { fb } from "@/lib/firebase/client";
import { homeFor } from "@/lib/landing";
import type { MeResponse } from "@/lib/types";

export default function LoginPage() {
  return (
    <Suspense>
      <Login />
    </Suspense>
  );
}

function Login() {
  const router = useRouter();
  const params = useSearchParams();
  const { me, loading, refresh } = useSession();
  const [tab, setTab] = useState<"owner" | "staff">(params.get("as") === "staff" ? "staff" : "owner");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    if (!loading && me?.restaurant && !busy) router.replace(homeFor(me));
  }, [loading, me, router, busy]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setBusy(true);
    try {
      await signInWithEmailAndPassword(fb().auth, email.trim(), password);
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
      return;
    }
    let m: MeResponse;
    try {
      m = await api<MeResponse>("/api/me");
    } catch (err) {
      setError(`Signed in, but your restaurant could not be opened: ${errorText(err)} Please try again in a minute.`);
      await signOut(fb().auth);
      setBusy(false);
      return;
    }
    if (!m.restaurant) {
      if (tab === "staff") {
        await signOut(fb().auth);
        setError("This login is not part of any restaurant. Ask your restaurant owner to add your email under Staff.");
        setBusy(false);
        return;
      }
      await refresh();
      router.replace("/register");
      return;
    }
    await refresh();
    router.replace(homeFor(m));
  }

  async function reset() {
    setError("");
    if (!email.trim()) {
      setError("Enter your email above, then tap “Forgot password”.");
      return;
    }
    try {
      await sendPasswordResetEmail(fb().auth, email.trim());
      setInfo("If an account exists for this email, a reset link is on its way. Check your inbox and spam folder.");
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <div>
      <h1 className="display text-3xl font-semibold">Sign in</h1>
      <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl border border-line bg-ivory p-1" role="tablist" aria-label="Who is signing in">
        {(
          [
            ["owner", "Owner", Store],
            ["staff", "Staff", ChefHat],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => {
              setTab(id);
              setError("");
            }}
            className={cx(
              "flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors active:scale-[0.98]",
              tab === id ? "bg-navy text-ivory shadow-sm" : "text-muted hover:text-ink",
            )}
          >
            <Icon className="size-4" /> {label}
          </button>
        ))}
      </div>
      <p className="mt-4 text-sm text-muted">
        {tab === "owner"
          ? "For the restaurant owner who registered the restaurant."
          : "For staff added by the owner. Use the email and password your owner gave you. Staff do not register."}
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <Field label="Email" htmlFor="email">
          <Input id="email" type="email" inputMode="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@gmail.com" />
        </Field>
        <Field label="Password" htmlFor="password">
          <PasswordInput id="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {error && <Alert tone="bad">{error}</Alert>}
        {info && <Alert tone="ok">{info}</Alert>}
        <Button type="submit" size="lg" className="w-full" loading={busy}>
          {tab === "owner" ? "Sign in as owner" : "Sign in as staff"}
        </Button>
      </form>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
        {tab === "owner" ? (
          <button type="button" onClick={reset} className="font-semibold text-ink underline underline-offset-4">
            Forgot password
          </button>
        ) : (
          <span className="text-muted">Forgot your password? Ask your owner to set a new one.</span>
        )}
        {tab === "owner" && (
          <Link href="/register" className="text-muted hover:text-ink">
            New restaurant? <span className="font-semibold text-ink underline underline-offset-4">Register</span>
          </Link>
        )}
      </div>
    </div>
  );
}
