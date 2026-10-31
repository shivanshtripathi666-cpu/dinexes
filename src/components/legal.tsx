import { APP_NAME } from "@/lib/config";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-14 text-[15px] leading-relaxed text-ink [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:mt-1.5 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
      <h1 className="display text-3xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-muted">
        {APP_NAME} · Last updated {updated}
      </p>
      {children}
    </article>
  );
}
