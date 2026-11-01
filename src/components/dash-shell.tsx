"use client";
import { BarChart3, ChefHat, CreditCard, Ellipsis, LayoutDashboard, LogOut, Menu as MenuIcon, QrCode, Receipt, Settings, Users, UtensilsCrossed, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { can, ROLE_LABEL, type Perm } from "@/lib/roles";
import { cfg } from "@/lib/firebase/client";
import { Mark } from "./brand";
import { useDash } from "./dash-context";
import { useSession } from "./session";
import { Alert, Badge, buttonClass, cx } from "./ui";

const NAV: { href: string; label: string; icon: typeof LayoutDashboard; perm: Perm | null; exact?: boolean }[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, perm: "reports.view", exact: true },
  { href: "/dashboard/kitchen", label: "Kitchen", icon: ChefHat, perm: "orders.kitchen" },
  { href: "/dashboard/counter", label: "Counter", icon: Receipt, perm: "orders.counter" },
  { href: "/dashboard/menu", label: "Menu", icon: UtensilsCrossed, perm: "menu.availability" },
  { href: "/dashboard/qr", label: "Seats & QR", icon: QrCode, perm: "seats.manage" },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3, perm: "reports.view" },
  { href: "/dashboard/staff", label: "Staff", icon: Users, perm: "staff.manage" },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard, perm: "billing.manage" },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, perm: "settings.edit" },
];

export function DashShell({ children }: { children: React.ReactNode }) {
  const d = useDash();
  const { signOut } = useSession();
  const router = useRouter();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const items = NAV.filter((n) => !n.perm || can(d.role, n.perm));
  const active = (n: (typeof NAV)[number]) => (n.exact ? path === n.href : path.startsWith(n.href));

  const nav = (
    <nav className="space-y-0.5">
      {items.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          onClick={() => setOpen(false)}
          className={cx(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
            active(n) ? "bg-navy-3 text-ivory" : "text-ivory/65 hover:bg-navy-2 hover:text-ivory",
          )}
        >
          <n.icon className={cx("size-[18px]", active(n) ? "text-amber" : "")} />
          {n.label}
        </Link>
      ))}
    </nav>
  );

  const trial =
    d.access.state === "trialing" ? (
      <Badge tone="amber">Trial · {d.access.daysLeft} {d.access.daysLeft === 1 ? "day" : "days"} left</Badge>
    ) : d.access.state === "expired" ? (
      <Badge tone="bad">Subscription expired</Badge>
    ) : null;

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="no-print hidden flex-col bg-navy px-3 py-4 lg:sticky lg:top-0 lg:flex lg:h-dvh">
        <div className="flex items-center gap-2.5 px-2 pb-5">
          <Mark className="size-8" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ivory">{d.restaurant.name}</p>
            <p className="text-xs text-slate">{ROLE_LABEL[d.role]}</p>
          </div>
        </div>
        {nav}
        <div className="mt-auto border-t border-white/10 px-2 pt-4">
          <p className="truncate text-xs text-slate">{d.email}</p>
          <button
            type="button"
            onClick={async () => {
              await signOut();
              router.replace("/login");
            }}
            className="mt-2 inline-flex items-center gap-2 text-sm text-ivory/70 hover:text-ivory"
          >
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="no-print sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-paper/95 px-4 backdrop-blur lg:px-8">
          <button type="button" className="rounded-md p-1.5 hover:bg-sand lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <MenuIcon className="size-5" />
          </button>
          <p className="truncate font-semibold lg:hidden">{d.restaurant.name}</p>
          <div className="ml-auto flex items-center gap-2">
            {trial}
            {d.access.state !== "active" && can(d.role, "billing.manage") && (d.access.state === "expired" || cfg().paymentsEnabled) && (
              <Link href="/dashboard/billing" className={buttonClass("primary", "sm")}>
                {d.access.state === "expired" ? "Renew" : "Subscribe"}
              </Link>
            )}
          </div>
        </header>

        {open && (
          <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-navy/60" onClick={() => setOpen(false)} />
            <div className="absolute inset-y-0 left-0 flex w-72 flex-col overflow-y-auto bg-navy px-3 py-4">
              <div className="mb-4 flex items-center justify-between px-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ivory">{d.restaurant.name}</p>
                  <p className="text-xs text-slate">{ROLE_LABEL[d.role]}</p>
                </div>
                <button type="button" onClick={() => setOpen(false)} className="rounded-md p-1.5 text-ivory hover:bg-navy-2" aria-label="Close menu">
                  <X className="size-5" />
                </button>
              </div>
              {nav}
              <button
                type="button"
                onClick={async () => {
                  await signOut();
                  router.replace("/login");
                }}
                className="mt-auto inline-flex items-center gap-2 px-3 py-2 text-sm text-ivory/70"
              >
                <LogOut className="size-4" /> Sign out
              </button>
            </div>
          </div>
        )}

        <main className="px-4 pb-28 pt-6 lg:px-8 lg:py-8">
          {d.access.state === "expired" && (
            <Alert tone="bad" title="Your subscription has ended" className="no-print mb-6">
              Guests cannot place new orders until the plan is renewed.{" "}
              {can(d.role, "billing.manage") ? (
                <Link href="/dashboard/billing" className="font-semibold underline">
                  Renew now
                </Link>
              ) : (
                "Please ask the owner to renew."
              )}
            </Alert>
          )}
          {children}
        </main>

        <nav className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-navy pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="Quick menu">
          <div className="mx-auto flex max-w-lg">
            {items.slice(0, 4).map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={cx("flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium active:scale-95", active(n) ? "text-amber" : "text-ivory/70")}
              >
                <n.icon className="size-5" />
                {n.label}
              </Link>
            ))}
            <button type="button" onClick={() => setOpen(true)} className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium text-ivory/70 active:scale-95">
              <Ellipsis className="size-5" />
              More
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}

/** Shown when someone opens a page their role cannot use. */
export function NoAccess() {
  return (
    <Alert tone="info" title="Not available for your role">
      Ask the restaurant owner if you need access to this page.
    </Alert>
  );
}
