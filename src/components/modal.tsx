"use client";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";

/** Accessible dialog using the native <dialog> element (Esc closes, focus is trapped by the browser). */
export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={`m-auto w-[calc(100%-24px)] ${wide ? "max-w-2xl" : "max-w-lg"} rounded-2xl border border-line bg-paper p-0 text-ink backdrop:bg-navy/60`}
    >
      {open && (
        <div className="max-h-[85dvh] overflow-y-auto">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-paper px-5 py-4">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button type="button" onClick={onClose} className="rounded-md p-1.5 text-muted hover:bg-sand" aria-label="Close">
              <X className="size-5" />
            </button>
          </div>
          <div className="px-5 py-5">{children}</div>
        </div>
      )}
    </dialog>
  );
}
