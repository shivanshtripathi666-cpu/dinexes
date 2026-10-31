"use client";
import { sendPasswordResetEmail, signInWithEmailAndPassword } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "@/components/session";
import { Alert, Button, Field, Input } from "@/components/ui";
import { errorText } from "@/lib/api";
import { fb } from "@/lib/firebase/client";
import { homeFor } from "@/lib/landing";

export default function LoginPage() {
  const router = useRouter();
  const { me, loading, refresh } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    if (!loading && me) router.replace(homeFor(me));
  }, [loading, me, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setBusy(true);
    try {
      await signInWithEmailAndPassword(fb().auth, email.trim(), password);
      const m = await refresh();
      router.replace(homeFor(m));
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }

  async function reset() {
    setError("");
    if (!email.trim()) {
      setError("Enter your email above, then tap “Forgot password”.");
      return;
    }
    try {
      await sendPasswordResetEmail(fb().auth, email.trim());
      setInfo("If an account exists for this email, a reset link is on its way.");
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <div>
      <h1 className="display text-3xl font-semibold">Sign in</h1>
      <p className="mt-2 text-muted">For restaurant owners and staff.</p>
      <form onSubmit={submit} className="mt-7 space-y-4">
        <Field label="Email" htmlFor="email">
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password" htmlFor="password">
          <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {error && <Alert tone="bad">{error}</Alert>}
        {info && <Alert tone="ok">{info}</Alert>}
        <Button type="submit" size="lg" className="w-full" loading={busy}>
          Sign in
        </Button>
      </form>
      <div className="mt-6 flex flex-wrap justify-between gap-3 text-sm">
        <button type="button" onClick={reset} className="font-semibold text-ink underline underline-offset-4">
          Forgot password
        </button>
        <Link href="/register" className="text-muted hover:text-ink">
          New restaurant? <span className="font-semibold text-ink underline underline-offset-4">Register</span>
        </Link>
      </div>
    </div>
  );
}
