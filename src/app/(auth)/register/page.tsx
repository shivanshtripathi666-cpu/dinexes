"use client";
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "@/components/session";
import { Alert, Button, Field, Input, Spinner } from "@/components/ui";
import { api, errorText } from "@/lib/api";
import { PLAN_PRICE_INR, TRIAL_DAYS } from "@/lib/config";
import { fb } from "@/lib/firebase/client";
import { homeFor } from "@/lib/landing";

export default function RegisterPage() {
  const router = useRouter();
  const { user, me, loading, refresh } = useSession();
  const [form, setForm] = useState({ ownerName: "", email: "", password: "", name: "", phone: "", city: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && me?.restaurant) router.replace(homeFor(me));
  }, [loading, me, router]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const accountExists = !!user && !me?.restaurant;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!accountExists && form.password.length < 8) {
      setError("Please use a password of at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      if (!accountExists) {
        const cred = await createUserWithEmailAndPassword(fb().auth, form.email.trim(), form.password);
        await updateProfile(cred.user, { displayName: form.ownerName.trim() });
        sendEmailVerification(cred.user).catch(() => undefined);
      }
      await api("/api/restaurants", {
        method: "POST",
        body: { name: form.name, ownerName: form.ownerName || user?.displayName || "Owner", phone: form.phone, city: form.city },
      });
      await refresh();
      router.push("/onboarding");
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-muted">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <h1 className="display text-3xl font-semibold">Register your restaurant</h1>
      <p className="mt-2 text-muted">
        {TRIAL_DAYS} days free, then ₹{PLAN_PRICE_INR} a month. No card needed now.
      </p>
      {accountExists && (
        <Alert tone="info" className="mt-5">
          You are signed in as {user?.email}. Add your restaurant details to continue.
        </Alert>
      )}
      <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
        {!accountExists && (
          <>
            <Field label="Your name" htmlFor="ownerName">
              <Input id="ownerName" autoComplete="name" required value={form.ownerName} onChange={set("ownerName")} />
            </Field>
            <Field label="Email" htmlFor="email">
              <Input id="email" type="email" autoComplete="email" required value={form.email} onChange={set("email")} />
            </Field>
            <Field label="Password" htmlFor="password" hint="At least 8 characters.">
              <Input id="password" type="password" autoComplete="new-password" required minLength={8} value={form.password} onChange={set("password")} />
            </Field>
          </>
        )}
        <Field label="Restaurant name" htmlFor="name">
          <Input id="name" required value={form.name} onChange={set("name")} placeholder="e.g. Royal Biryani House" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone" htmlFor="phone">
            <Input id="phone" type="tel" inputMode="tel" autoComplete="tel" required value={form.phone} onChange={set("phone")} placeholder="98765 43210" />
          </Field>
          <Field label="City" htmlFor="city">
            <Input id="city" required value={form.city} onChange={set("city")} placeholder="Prayagraj" />
          </Field>
        </div>
        {error && <Alert tone="bad">{error}</Alert>}
        <Button type="submit" size="lg" className="w-full" loading={busy}>
          Create restaurant
        </Button>
      </form>
      <p className="mt-6 text-sm text-muted">
        Already registered?{" "}
        <Link href="/login" className="font-semibold text-ink underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </div>
  );
}
