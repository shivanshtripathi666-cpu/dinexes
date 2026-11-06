"use client";
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from "firebase/auth";
import { Smartphone } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { errorText } from "@/lib/api";
import { fb } from "@/lib/firebase/client";
import { Alert, Button, Field, Input } from "./ui";

/** Indian mobile number in +91 form, or "" when it is not a valid 10-digit mobile number. */
export function indianMobile(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? `+91${d}` : "";
}

const PHONE_ERRORS: Record<string, string> = {
  "auth/invalid-phone-number": "Please enter a valid 10-digit mobile number.",
  "auth/too-many-requests": "Too many tries from this phone. Please wait a while and try again.",
  "auth/quota-exceeded": "OTP limit reached for today. Please sign in with Google or email instead.",
  "auth/invalid-verification-code": "That OTP is not correct. Check the SMS and try again.",
  "auth/code-expired": "This OTP has expired. Tap “Send OTP again”.",
  "auth/captcha-check-failed": "Security check failed. Reload the page and try again.",
  "auth/operation-not-allowed": "Phone sign-in is not switched on yet. Please use Google or email for now.",
  "auth/unauthorized-domain": "Phone sign-in is not allowed on this web address yet. Please use Google or email.",
  "auth/missing-phone-number": "Please enter your mobile number.",
};

function phoneError(e: unknown): string {
  const code = (e as { code?: string })?.code || "";
  return PHONE_ERRORS[code] || errorText(e);
}

/**
 * Sign in or sign up with a mobile number and a 6-digit SMS code (OTP).
 * Calls onSignedIn after Firebase has signed the person in.
 */
export function PhoneLogin({ onSignedIn, cta = "Continue" }: { onSignedIn: () => void | Promise<void>; cta?: string }) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState<ConfirmationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [wait, setWait] = useState(0);
  const verifier = useRef<RecaptchaVerifier | null>(null);
  const boxId = "dx-recaptcha";

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  useEffect(
    () => () => {
      verifier.current?.clear();
      verifier.current = null;
    },
    [],
  );

  async function send() {
    setError("");
    const num = indianMobile(phone);
    if (!num) return setError("Please enter a valid 10-digit mobile number.");
    setBusy(true);
    try {
      if (!verifier.current) verifier.current = new RecaptchaVerifier(fb().auth, boxId, { size: "invisible" });
      const r = await signInWithPhoneNumber(fb().auth, num, verifier.current);
      setSent(r);
      setCode("");
      setWait(30);
    } catch (e) {
      setError(phoneError(e));
      verifier.current?.clear();
      verifier.current = null;
    } finally {
      setBusy(false);
    }
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (!sent) return;
    setError("");
    if (!/^\d{6}$/.test(code)) return setError("Enter the 6-digit OTP from the SMS.");
    setBusy(true);
    try {
      await sent.confirm(code);
      await onSignedIn();
    } catch (err) {
      setError(phoneError(err));
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4" data-testid="phone-login">
      {!sent ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
          className="space-y-4"
        >
          <Field label="Mobile number" htmlFor="dx-phone">
            <div className="flex">
              <span className="inline-flex h-11 items-center rounded-l-lg border border-r-0 border-line bg-ivory px-3 text-sm font-semibold">+91</span>
              <Input
                id="dx-phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                maxLength={14}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="98765 43210"
                className="rounded-l-none"
              />
            </div>
          </Field>
          {error && <Alert tone="bad">{error}</Alert>}
          <Button type="submit" size="lg" className="w-full" loading={busy} data-testid="send-otp">
            <Smartphone className="size-4" /> Send OTP
          </Button>
        </form>
      ) : (
        <form onSubmit={confirm} className="space-y-4">
          <p className="text-sm">
            OTP sent to <strong>{indianMobile(phone)}</strong>.{" "}
            <button type="button" className="font-semibold underline underline-offset-4" onClick={() => setSent(null)}>
              Change number
            </button>
          </p>
          <Field label="6-digit OTP" htmlFor="dx-otp">
            <Input
              id="dx-otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="text-center text-xl tracking-[0.5em]"
              autoFocus
            />
          </Field>
          {error && <Alert tone="bad">{error}</Alert>}
          <Button type="submit" size="lg" className="w-full" loading={busy} data-testid="confirm-otp">
            {cta}
          </Button>
          <button type="button" disabled={wait > 0 || busy} onClick={send} className="w-full text-center text-sm font-semibold underline underline-offset-4 disabled:text-muted disabled:no-underline">
            {wait > 0 ? `Send OTP again in ${wait}s` : "Send OTP again"}
          </button>
        </form>
      )}
      <div id={boxId} />
    </div>
  );
}
