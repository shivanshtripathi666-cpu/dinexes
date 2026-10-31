import { Logo } from "@/components/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[0.9fr_1.1fr]">
      <aside className="hidden flex-col justify-between bg-navy p-10 text-ivory lg:flex">
        <Logo dark />
        <div>
          <p className="display text-3xl font-semibold leading-snug">
            “Seat 2. One chicken biryani, two cold coffee.”
          </p>
          <p className="mt-3 max-w-sm text-ivory/65">Every order reaches your kitchen and counter the moment it is placed, with the seat number already known.</p>
        </div>
        <p className="text-xs text-ivory/40">Dine-in QR ordering for restaurants in India</p>
      </aside>
      <main className="flex flex-col px-4 py-8 sm:px-8">
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">{children}</div>
      </main>
    </div>
  );
}
