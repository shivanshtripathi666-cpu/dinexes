import Link from "next/link";
import { APP_NAME } from "@/lib/config";
import { Logo } from "./brand";
import { ButtonLink } from "./ui";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-navy/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Logo dark />
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link href="/#how" className="hidden rounded-md px-3 py-2 text-sm text-ivory/80 hover:text-ivory sm:block">
            How it works
          </Link>
          <Link href="/pricing" className="hidden rounded-md px-3 py-2 text-sm text-ivory/80 hover:text-ivory sm:block">
            Pricing
          </Link>
          <Link href="/login" className="rounded-md px-3 py-2 text-sm text-ivory/80 hover:text-ivory">
            Sign in
          </Link>
          <ButtonLink href="/register" size="sm" className="ml-1">
            Start free trial
          </ButtonLink>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-ink text-ivory/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Logo dark />
          <p className="mt-2 text-sm">QR ordering for dine-in restaurants in India.</p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Link href="/pricing" className="hover:text-ivory">
            Pricing
          </Link>
          <Link href="/register" className="hover:text-ivory">
            Register your restaurant
          </Link>
          <Link href="/login" className="hover:text-ivory">
            Staff sign in
          </Link>
        </div>
        <p className="text-xs">
          © {new Date().getFullYear()} {APP_NAME}
        </p>
      </div>
    </footer>
  );
}
