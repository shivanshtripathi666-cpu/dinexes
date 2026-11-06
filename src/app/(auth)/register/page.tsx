"use client";
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from "firebase/auth";
import { MailCheck, Smartphone } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { PasswordHint, PasswordInput, passwordProblem } from "@/components/password-input";
import { PhoneLogin } from "@/components/phone-login";
import { useSession } from "@/components/session";
import { Alert, Button, Field, Input, Spinner } from "@/components/ui";
import { api, errorText } from "@/lib/api";
import { LOWEST_MONTHLY_INR, TIERS, TRIAL_DAYS, planById } from "@/lib/config";
import { fb } from "@/lib/firebase/client";
import { GoogleMark, finishGoogleRedirect, googleSignIn } from "@/lib/google";
import { homeFor } from "@/lib/landing";

export default function RegisterPage() {
  return (
    <Suspense>
      <Register />
    </Suspense>
  );
}

function Divider() {
  return (
    <div className="my-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-muted">
      <span className="h-px flex-1 bg-line" /> or with email <span className="h-px flex-1 bg-line" />
    </div>
  );
}

function Register() {
  const router = useRouter();
  const chosen = planById(useSearchParams().get("plan") || "");
  const { user, me, loading, refresh } = useSession();
  const [acct, setAcct] = useState({ ownerName: "", email: "", password: "" });
  const [rest, setRest] = useState({ name: "", phone: "", city: "" });
  const [ownerName, setOwnerName] = useState("");
  const [usePhone, setUsePhone] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (!chosen) return;
    try {
      localStorage.setItem("dx-plan", chosen.id);
    } catch {
      /* ignore */
    }
  }, [chosen]);

  useEffect(() => {
    void finishGoogleRedirect();
  }, []);

  useEffect(() => {
    if (!loading && me?.restaurant) router.replace(homeFor(me));
  }, [loading, me, router]);

  useEffect(() => {
    // Google and verified email count as verified; a mobile number signed in with OTP is verified too.
    setVerified(!!user?.emailVerified || !!user?.phoneNumber);
    if (user?.phoneNumber) setRest((r) => (r.phone ? r : { ...r, phone: user.phoneNumber!.replace(/^\+91/, "") }));
  }, [user]);

  const step: "account" | "verify" | "restaurant" = !user ? "account" : !verified ? "verify" : "restaurant";

  async function google() {
    setError("");
    setBusy("google");
    try {
      if (await googleSignIn()) await refresh();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy("");
    }
  }

  async function createAccount(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const problem = passwordProblem(acct.password);
    if (problem) return setError(`Password: ${problem}`);
    if (acct.ownerName.trim().length < 2) return setError("Please enter your name.");
    setBusy("account");
    try {
      const cred = await createUserWithEmailAndPassword(fb().auth, acct.email.trim(), acct.password);
      await updateProfile(cred.user, { displayName: acct.ownerName.trim() });
      await sendEmailVerification(cred.user);
      setInfo(`We sent a verification link to ${cred.user.email}.`);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy("");
    }
  }

  async function checkVerified() {
    const u = fb().auth.currentUser;
    if (!u) return;
    setError("");
    setBusy("check");
    try {
      await u.reload();
      if (u.emailVerified) {
        await u.getIdToken(true);
        setVerified(true);
      } else {
        setError("Not verified yet. Open the email from Dinexes (check Spam too) and tap the link, then try again.");
      }
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy("");
    }
  }

  async function resend() {
    const u = fb().auth.currentUser;
    if (!u) return;
    setError("");
    try {
      await sendEmailVerification(u);
      setInfo(`A new link was sent to ${u.email}.`);
    } catch (err) {
      setError(errorText(err));
    }
  }

  async function createRestaurant(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy("restaurant");
    try {
      await fb().auth.currentUser?.getIdToken(true);
      await api("/api/restaurants", {
        method: "POST",
        body: { ...rest, ownerName: user?.displayName || acct.ownerName || ownerName.trim() || "Owner" },
      });
      await refresh();
      router.push("/onboarding");
    } catch (err) {
      setError(errorText(err));
      setBusy("");
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
      <ol className="mb-6 flex gap-2 text-xs font-semibold" aria-label="Steps">
        {["Account", "Verify", "Restaurant"].map((s, i) => {
          const idx = step === "account" ? 0 : step === "verify" ? 1 : 2;
          return (
            <li key={s} className={`flex-1 rounded-full py-1 text-center ${i <= idx ? "bg-navy text-ivory" : "bg-sand text-muted"}`}>
              {i + 1}. {s}
            </li>
          );
        })}
      </ol>
      <h1 className="display text-3xl font-semibold">Register your restaurant</h1>
      <p className="mt-1 text-sm font-medium text-amber-deep">For restaurant owners. Staff are added by the owner later.</p>
      <p className="mt-2 text-muted">
        {chosen
          ? `${TRIAL_DAYS} days free with everything, then ${TIERS[chosen.tier].name} ${chosen.label} for ₹${chosen.priceInr.toLocaleString("en-IN")} if you continue. No card needed now.`
          : `${TRIAL_DAYS} days free with everything, then from ₹${LOWEST_MONTHLY_INR} a month. No card needed now.`}
      </p>

      {step === "account" && (
        <>
          <Button type="button" variant="outline" size="lg" className="mt-7 w-full bg-white" onClick={google} loading={busy === "google"} data-testid="google-signup">
            <GoogleMark /> Continue with Google
          </Button>
          {usePhone ? (
            <div className="mt-4 rounded-xl border border-line bg-white p-4">
              <PhoneLogin cta="Verify and continue" onSignedIn={() => refresh()} />
            </div>
          ) : (
            <Button type="button" variant="outline" size="lg" className="mt-3 w-full bg-white" onClick={() => setUsePhone(true)} data-testid="phone-signup">
              <Smartphone className="size-4" /> Continue with mobile number (OTP)
            </Button>
          )}
          <Divider />
          <form onSubmit={createAccount} className="space-y-4" noValidate>
            <Field label="Your name" htmlFor="ownerName">
              <Input id="ownerName" autoComplete="name" required value={acct.ownerName} onChange={(e) => setAcct({ ...acct, ownerName: e.target.value })} />
            </Field>
            <Field label="Email" htmlFor="email">
              <Input id="email" type="email" inputMode="email" autoComplete="email" required value={acct.email} onChange={(e) => setAcct({ ...acct, email: e.target.value })} placeholder="you@gmail.com" />
            </Field>
            <Field label="Password" htmlFor="password">
              <PasswordInput id="password" autoComplete="new-password" required value={acct.password} onChange={(e) => setAcct({ ...acct, password: e.target.value })} />
            </Field>
            <PasswordHint value={acct.password} />
            {error && <Alert tone="bad">{error}</Alert>}
            <Button type="submit" size="lg" className="w-full" loading={busy === "account"}>
              Create account
            </Button>
          </form>
        </>
      )}

      {step === "verify" && (
        <div className="mt-7 space-y-4">
          <div className="flex gap-4 rounded-xl border border-amber/50 bg-amber-soft p-5">
            <MailCheck className="size-7 shrink-0 text-amber-deep" />
            <div>
              <p className="font-semibold">Verify your email</p>
              <p className="mt-1 text-sm">
                {info || `We sent a verification link to ${user?.email}.`} Open Gmail, tap the link, then come back here.
              </p>
            </div>
          </div>
          {error && <Alert tone="bad">{error}</Alert>}
          <Button size="lg" className="w-full" onClick={checkVerified} loading={busy === "check"}>
            I have verified my email
          </Button>
          <button type="button" onClick={resend} className="w-full text-center text-sm font-semibold text-ink underline underline-offset-4">
            Send the link again
          </button>
        </div>
      )}

      {step === "restaurant" && (
        <form onSubmit={createRestaurant} className="mt-7 space-y-4" noValidate>
          <Alert tone="ok">Signed in as {user?.email || user?.phoneNumber}. Now add your restaurant.</Alert>
          {!user?.displayName && !acct.ownerName && (
            <Field label="Your name" htmlFor="ownerName2">
              <Input id="ownerName2" autoComplete="name" required value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="e.g. Shivansh" />
            </Field>
          )}
          <Field label="Restaurant name" htmlFor="name">
            <Input id="name" required value={rest.name} onChange={(e) => setRest({ ...rest, name: e.target.value })} placeholder="e.g. Royal Biryani House" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone" htmlFor="phone">
              <Input id="phone" type="tel" inputMode="tel" autoComplete="tel" required value={rest.phone} onChange={(e) => setRest({ ...rest, phone: e.target.value })} placeholder="98765 43210" />
            </Field>
            <Field label="City" htmlFor="city">
              <Input id="city" required value={rest.city} onChange={(e) => setRest({ ...rest, city: e.target.value })} placeholder="Prayagraj" />
            </Field>
          </div>
          {error && <Alert tone="bad">{error}</Alert>}
          <Button type="submit" size="lg" className="w-full" loading={busy === "restaurant"}>
            Start {TRIAL_DAYS}-day free trial
          </Button>
        </form>
      )}

      <p className="mt-4 text-center text-xs text-muted">
        By registering you agree to the{" "}
        <Link href="/terms" className="underline">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline">
          Privacy policy
        </Link>
        .
      </p>
      <p className="mt-6 text-sm text-muted">
        Already registered?{" "}
        <Link href="/login" className="font-semibold text-ink underline underline-offset-4">
          Owner sign in
        </Link>
        {" · "}
        <Link href="/login?as=staff" className="font-semibold text-ink underline underline-offset-4">
          Staff sign in
        </Link>
      </p>
    </div>
  );
}
