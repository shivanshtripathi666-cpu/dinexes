import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/** Dinexes UI kit. Plain components, one visual language, no decoration that does not help. */
export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

type Variant = "primary" | "dark" | "outline" | "ghost" | "danger" | "ok";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary: "bg-amber text-ink hover:bg-[#c58d2c] border border-amber",
  dark: "bg-navy text-ivory hover:bg-navy-2 border border-navy",
  outline: "bg-transparent text-ink border border-line hover:border-ink/40 hover:bg-white",
  ghost: "bg-transparent text-ink border border-transparent hover:bg-sand/60",
  danger: "bg-bad text-white border border-bad hover:bg-[#9c3727]",
  ok: "bg-ok text-white border border-ok hover:bg-[#276a4b]",
};
const SIZE: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-[15px]",
  lg: "h-13 px-6 text-base",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra = "") {
  return cx(
    "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none select-none whitespace-nowrap",
    VARIANT[variant],
    SIZE[size],
    extra,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  loading,
  className,
  children,
  ...rest
}: ComponentProps<"button"> & { variant?: Variant; size?: Size; loading?: boolean }) {
  return (
    <button {...rest} disabled={rest.disabled || loading} className={buttonClass(variant, size, className)}>
      {loading && <Spinner className="size-4" />}
      {children}
    </button>
  );
}

export function ButtonLink({ href, variant = "primary", size = "md", className, children }: { href: string; variant?: Variant; size?: Size; className?: string; children: ReactNode }) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)}>
      {children}
    </Link>
  );
}

export function Spinner({ className = "size-5" }: { className?: string }) {
  return (
    <svg className={cx("animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Field({ label, hint, error, children, htmlFor }: { label: string; hint?: string; error?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-ink">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && <p className="text-xs font-medium text-bad">{error}</p>}
    </div>
  );
}

const inputBase =
  "w-full rounded-lg border border-line bg-white px-3 text-[15px] text-ink placeholder:text-muted/70 focus:border-amber focus:outline-none focus:ring-2 focus:ring-amber/25 disabled:bg-ivory";

export function Input({ className, ...rest }: ComponentProps<"input">) {
  return <input {...rest} className={cx(inputBase, "h-11", className)} />;
}

export function Textarea({ className, ...rest }: ComponentProps<"textarea">) {
  return <textarea {...rest} className={cx(inputBase, "min-h-24 py-2.5", className)} />;
}

export function Select({ className, children, ...rest }: ComponentProps<"select">) {
  return (
    <select {...rest} className={cx(inputBase, "h-11 pr-8", className)}>
      {children}
    </select>
  );
}

export function Card({ className, children, ...rest }: ComponentProps<"div">) {
  return (
    <div {...rest} className={cx("rounded-[var(--radius-card)] border border-line bg-white", className)}>
      {children}
    </div>
  );
}

type Tone = "neutral" | "amber" | "ok" | "bad" | "info" | "dark";
const TONE: Record<Tone, string> = {
  neutral: "bg-ivory text-muted border-line",
  amber: "bg-amber-soft text-amber-deep border-amber/40",
  ok: "bg-ok-soft text-ok border-ok/30",
  bad: "bg-bad-soft text-bad border-bad/30",
  info: "bg-info-soft text-info border-info/30",
  dark: "bg-navy text-ivory border-navy",
};

export function Badge({ tone = "neutral", className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return <span className={cx("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold", TONE[tone], className)}>{children}</span>;
}

export function Alert({ tone = "info", title, children, className }: { tone?: Tone; title?: string; children?: ReactNode; className?: string }) {
  return (
    <div role={tone === "bad" ? "alert" : "status"} className={cx("rounded-lg border px-4 py-3 text-sm", TONE[tone], className)}>
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={cx(title && "mt-0.5", "font-normal")}>{children}</div>}
    </div>
  );
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-line bg-white/60 px-6 py-12 text-center">
      {icon && <div className="mb-3 text-muted">{icon}</div>}
      <p className="font-semibold text-ink">{title}</p>
      {children && <div className="mt-1 max-w-md text-sm text-muted">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="display text-2xl font-semibold text-ink sm:text-[28px]">{title}</h1>
        {subtitle && <div className="mt-1 text-sm text-muted">{subtitle}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold text-ink tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </Card>
  );
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx("relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors disabled:opacity-50", checked ? "border-ok bg-ok" : "border-line bg-sand")}
    >
      <span className={cx("inline-block size-5 rounded-full bg-white shadow-sm transition-transform", checked ? "translate-x-5" : "translate-x-0.5")} />
    </button>
  );
}

export function VegMark({ veg }: { veg: boolean }) {
  return (
    <span title={veg ? "Vegetarian" : "Non-vegetarian"} className={cx("inline-flex size-4 shrink-0 items-center justify-center rounded-[3px] border-[1.5px]", veg ? "border-ok" : "border-bad")}>
      <span className={cx("size-2 rounded-full", veg ? "bg-ok" : "bg-bad")} />
    </span>
  );
}
