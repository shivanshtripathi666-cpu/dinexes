"use client";
import { ImagePlus } from "lucide-react";
import { useRef, useState } from "react";
import { errorText, uploadImage } from "@/lib/api";
import { Spinner, cx } from "./ui";

/** Picks an image, uploads it through /api/upload and returns the address. */
export function ImagePicker({
  kind,
  value,
  onChange,
  label,
  aspect = "square",
  onBusy,
}: {
  kind: "logo" | "cover" | "dish";
  value: string;
  onChange: (url: string) => void;
  label: string;
  aspect?: "square" | "wide";
  onBusy?: (busy: boolean) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setError("");
    setBusy(true);
    onBusy?.(true);
    try {
      onChange(await uploadImage(kind, f));
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
      onBusy?.(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => input.current?.click()}
        className={cx(
          "group relative flex items-center justify-center overflow-hidden rounded-xl border border-dashed border-line bg-ivory text-muted hover:border-amber",
          aspect === "wide" ? "aspect-[3/1] w-full" : "size-28",
        )}
        aria-label={label}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-1 text-xs font-medium">
            <ImagePlus className="size-5" /> {label}
          </span>
        )}
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center bg-white/70">
            <Spinner />
          </span>
        )}
      </button>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={pick} data-testid={`upload-${kind}`} />
      <div className="mt-1.5 flex items-center gap-3 text-xs">
        <span className="text-muted">JPG, PNG or WebP, under 2 MB</span>
        {value && (
          <button type="button" className="font-semibold text-bad" onClick={() => onChange("")}>
            Remove
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs font-medium text-bad">{error}</p>}
    </div>
  );
}
