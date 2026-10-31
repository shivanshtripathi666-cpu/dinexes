import Link from "next/link";
import { APP_NAME } from "@/lib/config";

export function Mark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#131b2b" />
      <path d="M18 16h14c9.4 0 16 6.6 16 16s-6.6 16-16 16H18z" fill="none" stroke="#d29b3a" strokeWidth="5" strokeLinejoin="round" />
      <circle cx="31" cy="32" r="5" fill="#f4eee2" />
    </svg>
  );
}

export function Logo({ dark = false, href = "/" }: { dark?: boolean; href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5" aria-label={`${APP_NAME} home`}>
      <Mark />
      <span className={`display text-xl font-semibold ${dark ? "text-ivory" : "text-ink"}`}>{APP_NAME}</span>
    </Link>
  );
}
