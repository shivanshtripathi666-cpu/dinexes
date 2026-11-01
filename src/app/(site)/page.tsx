import { ArrowRight, BellRing, ChefHat, LayoutDashboard, QrCode, Receipt, ShieldCheck, Smartphone, UtensilsCrossed, Volume2 } from "lucide-react";
import { PlanGrid } from "@/components/plans";
import { ButtonLink } from "@/components/ui";
import { PLAN_PRICE_INR, TRIAL_DAYS, MAX_STAFF } from "@/lib/config";

const steps = [
  { icon: QrCode, title: "Scan the seat's QR code", text: "Every seat has its own code. The phone camera opens your menu with the seat already known." },
  { icon: UtensilsCrossed, title: "Choose dishes and order", text: "Photos, prices and sold-out marks. No app to install, no login for your guests." },
  { icon: Volume2, title: "The kitchen hears it", text: "The kitchen phone chimes and reads the order aloud: seat, dishes and quantities." },
  { icon: Receipt, title: "Prepare, serve, collect", text: "Kitchen marks it ready, the counter sees it, the waiter serves and payment is taken at the counter." },
];

const roles = [
  { icon: Smartphone, title: "Guests", text: "A clean menu on their own phone. They can order again from the same seat and watch the status change." },
  { icon: ChefHat, title: "Kitchen", text: "Large seat numbers, one tap to accept, preparing and ready. Voice in English or Hindi." },
  { icon: Receipt, title: "Counter", text: "Every order with its seat, total, kitchen status and paid or unpaid, updating live." },
  { icon: LayoutDashboard, title: "Owner", text: "Menu, seats and QR cards, staff logins, daily sales and best-selling dishes." },
];

export default function Home() {
  return (
    <>
      <section className="relative overflow-hidden bg-navy text-ivory">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 pb-20 pt-14 md:grid-cols-[1.1fr_0.9fr] md:pt-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-md border border-amber/40 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-amber">
              Dine-in QR ordering
            </p>
            <h1 className="display mt-5 text-4xl font-semibold leading-[1.08] sm:text-5xl">
              Your guests order from their seat. <span className="text-amber">Your kitchen hears it.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-ivory/75">
              A QR code on every seat, a menu that opens in the phone browser, and orders that reach the kitchen and counter instantly. Works on the
              Android phone you already have. No POS machine, no special speaker.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ButtonLink href="/register" size="lg">
                Start {TRIAL_DAYS}-day free trial <ArrowRight className="size-4" />
              </ButtonLink>
              <ButtonLink href="/#plans" variant="outline" size="lg" className="border-white/25 text-ivory hover:bg-white/5">
                See plans
              </ButtonLink>
            </div>
            <p className="mt-3 text-sm text-ivory/55">No card needed for the trial. No commission on your orders.</p>
          </div>

          <div className="relative mx-auto w-full max-w-md md:mx-0" aria-label="Preview of the guest menu and the kitchen screen">
            <div className="relative z-10 ml-auto w-[78%] rounded-[28px] border-[6px] border-ink bg-paper p-3 text-ink shadow-2xl">
              <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-ink/80" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-muted">Royal Biryani House</p>
                  <p className="text-sm font-bold">Main course</p>
                </div>
                <span className="rounded bg-amber px-1.5 py-0.5 text-[11px] font-bold">Seat 2</span>
              </div>
              {[
                ["Chicken Biryani", "₹180", "4.8", true],
                ["Paneer Butter Masala", "₹220", "4.6", false],
                ["Cold Coffee", "₹90", "4.7", true],
              ].map(([n, p, r, added]) => (
                <div key={n as string} className="mt-2.5 flex items-center gap-2.5 rounded-xl border border-line bg-white p-2">
                  <div className="size-10 shrink-0 rounded-lg bg-[linear-gradient(135deg,#e9c48a,#b9772f)]" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold">{n}</p>
                    <p className="text-[11px] text-muted">
                      {p} · <span className="text-amber-deep">★ {r}</span>
                    </p>
                  </div>
                  <span className={`rounded-md px-2 py-1 text-[10px] font-bold ${added ? "bg-ink text-ivory" : "border border-ink"}`}>{added ? "1" : "ADD"}</span>
                </div>
              ))}
              <div className="mt-3 flex items-center justify-between rounded-xl bg-navy px-3 py-2.5 text-ivory">
                <span className="text-[12px]">3 items · ₹360</span>
                <span className="rounded-md bg-amber px-2 py-1 text-[11px] font-bold text-ink">Place order</span>
              </div>
            </div>

            <div className="relative -mt-24 w-[70%] rounded-2xl border border-white/10 bg-navy-2 p-3.5 shadow-2xl md:-mt-28">
              <div className="flex items-center justify-between text-[11px] text-slate">
                <span className="inline-flex items-center gap-1.5">
                  <BellRing className="size-3.5 text-amber" /> Kitchen
                </span>
                <span>Preview</span>
              </div>
              <div className="mt-2.5 rounded-xl bg-paper p-3 text-ink">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Order #104</p>
                    <p className="text-2xl font-bold leading-tight">Seat 2</p>
                  </div>
                  <span className="rounded bg-amber px-1.5 py-0.5 text-[10px] font-bold">NEW</span>
                </div>
                <p className="mt-2 border-t border-line pt-2 text-[12px]">Chicken Biryani × 1 · Cold Coffee × 2</p>
              </div>
              <p className="mt-2.5 text-[12px] text-ivory/80">
                <Volume2 className="mr-1 inline size-3.5 text-amber" />
                “New order. Seat number 2 …”
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20">
        <h2 className="display text-3xl font-semibold">How it works</h2>
        <p className="mt-2 max-w-2xl text-muted">Four steps from table to kitchen. Set-up takes about fifteen minutes.</p>
        <ol className="mt-10 grid gap-6 md:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title} className="border-t-2 border-ink pt-5">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-amber-deep">0{i + 1}</span>
                <s.icon className="size-5 text-ink" />
              </div>
              <h3 className="mt-3 font-semibold">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-line bg-ivory">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="display text-3xl font-semibold">One system, four screens</h2>
          <p className="mt-2 max-w-2xl text-muted">Up to {MAX_STAFF} staff logins share the same restaurant. Each person sees what their job needs.</p>
          <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
            {roles.map((r) => (
              <div key={r.title} className="bg-paper p-6">
                <r.icon className="size-6 text-amber-deep" />
                <h3 className="mt-3 text-lg font-semibold">{r.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{r.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-20 md:grid-cols-2">
        <div>
          <h2 className="display text-3xl font-semibold">Voice orders on an ordinary phone</h2>
          <p className="mt-3 text-muted">
            Open the kitchen screen on any Android phone or tablet and tap <strong className="text-ink">Start kitchen mode</strong>. Every new order
            plays a chime, appears in large type and is read aloud. Repeat it with one tap; the full history stays on screen.
          </p>
          <p className="mt-3 text-muted">
            Phones do not let a website speak while the screen is locked or the browser is closed. Keep the kitchen phone on charge with the kitchen
            screen open; Dinexes keeps the screen awake while kitchen mode is on, and sends a push notification as a back-up.
          </p>
        </div>
        <div className="grid gap-4">
          {[
            { icon: ShieldCheck, t: "Prices are checked on our server", d: "Guests cannot change prices or totals from their phone." },
            { icon: QrCode, t: "A secret code for every seat", d: "Codes cannot be guessed, and you can replace any code if it is copied." },
            { icon: Receipt, t: "Pay at the counter", d: "Guests pay as they do today. You mark orders paid at the counter." },
          ].map((x) => (
            <div key={x.t} className="flex gap-4 rounded-xl border border-line bg-white p-5">
              <x.icon className="mt-0.5 size-5 shrink-0 text-amber-deep" />
              <div>
                <p className="font-semibold">{x.t}</p>
                <p className="mt-1 text-sm text-muted">{x.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="plans" className="scroll-mt-20 border-t border-line bg-ivory">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="mb-10 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="display text-3xl font-semibold">Plans</h2>
              <p className="mt-2 text-muted">Every plan includes everything. Start free for {TRIAL_DAYS} days, pay only if you keep it.</p>
            </div>
            <p className="text-sm text-muted">No commission on food orders · No card for the trial</p>
          </div>
          <PlanGrid />
        </div>
      </section>

      <section className="bg-navy text-ivory">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-14 md:flex-row md:items-center">
          <div>
            <h2 className="display text-3xl font-semibold">Set up tonight, take orders tomorrow</h2>
            <p className="mt-2 text-ivory/70">
              From ₹{PLAN_PRICE_INR} a month, or ₹899 for 3 months and ₹1,499 for 6 months. {TRIAL_DAYS} days free.
            </p>
          </div>
          <ButtonLink href="/register" size="lg">
            Register your restaurant <ArrowRight className="size-4" />
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
