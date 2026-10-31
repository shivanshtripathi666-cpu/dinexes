import { ArrowRight, BellRing, ChefHat, LayoutDashboard, QrCode, Receipt, ShieldCheck, Smartphone, UtensilsCrossed, Volume2 } from "lucide-react";
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
              <ButtonLink href="/pricing" variant="outline" size="lg" className="border-white/25 text-ivory hover:bg-white/5">
                ₹{PLAN_PRICE_INR} per month
              </ButtonLink>
            </div>
            <p className="mt-3 text-sm text-ivory/55">No card needed for the trial. No commission on your orders.</p>
          </div>

          <div className="relative" aria-label="Example of a kitchen order ticket">
            <div className="rounded-2xl border border-white/10 bg-navy-2 p-5">
              <div className="flex items-center justify-between text-xs text-slate">
                <span className="inline-flex items-center gap-1.5">
                  <BellRing className="size-3.5 text-amber" /> Kitchen screen
                </span>
                <span>Example</span>
              </div>
              <div className="mt-4 rounded-xl bg-paper p-4 text-ink">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">Order #104</p>
                    <p className="mt-1 text-4xl font-bold">Seat 2</p>
                  </div>
                  <span className="rounded-md bg-amber px-2 py-1 text-xs font-bold text-ink">NEW</span>
                </div>
                <ul className="mt-4 space-y-2 border-t border-line pt-3 text-[15px]">
                  <li className="flex justify-between">
                    <span>Chicken Biryani</span>
                    <span className="font-bold">× 1</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Cold Coffee</span>
                    <span className="font-bold">× 2</span>
                  </li>
                </ul>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <span className="rounded-lg bg-navy py-2.5 text-center text-sm font-semibold text-ivory">Accept</span>
                  <span className="rounded-lg border border-line py-2.5 text-center text-sm font-semibold">Repeat voice</span>
                </div>
              </div>
              <p className="mt-4 rounded-lg border border-white/10 px-3 py-2.5 text-sm text-ivory/80">
                <Volume2 className="mr-1.5 inline size-4 text-amber" />
                “New order 104. Seat 2. One chicken biryani, two cold coffee.”
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

      <section className="bg-navy text-ivory">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-14 md:flex-row md:items-center">
          <div>
            <h2 className="display text-3xl font-semibold">₹{PLAN_PRICE_INR} a month per restaurant</h2>
            <p className="mt-2 text-ivory/70">
              Everything included. {TRIAL_DAYS}-day free trial. No commission on food orders.
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
