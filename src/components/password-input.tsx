"use client";
import { Eye, EyeOff } from "lucide-react";
import { useState, type ComponentProps } from "react";
import { Input, cx } from "./ui";

/** Password box with a show/hide eye button. */
export function PasswordInput({ className, ...rest }: Omit<ComponentProps<"input">, "type">) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input {...rest} type={show ? "text" : "password"} className={cx("pr-12", className)} />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-muted hover:text-ink active:scale-90"
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
      >
        {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
      </button>
    </div>
  );
}

/** Simple strength rules shared by owner registration and staff passwords. */
export function passwordProblem(p: string): string {
  if (p.length < 8) return "Use at least 8 characters.";
  if (!/[A-Za-z]/.test(p) || !/\d/.test(p)) return "Use both letters and numbers.";
  return "";
}

export function PasswordHint({ value }: { value: string }) {
  const rules = [
    { ok: value.length >= 8, t: "8+ characters" },
    { ok: /[A-Za-z]/.test(value), t: "a letter" },
    { ok: /\d/.test(value), t: "a number" },
  ];
  return (
    <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
      {rules.map((r) => (
        <span key={r.t} className={r.ok ? "font-semibold text-ok" : "text-muted"}>
          {r.ok ? "✓" : "○"} {r.t}
        </span>
      ))}
    </p>
  );
}

export function randomPassword(): string {
  const a = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
  const d = "23456789";
  const b = new Uint32Array(10);
  crypto.getRandomValues(b);
  let s = "";
  for (let i = 0; i < 8; i++) s += a[b[i] % a.length];
  return s + d[b[8] % d.length] + d[b[9] % d.length];
}
