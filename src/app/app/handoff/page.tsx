"use client";
import { signInWithCustomToken } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Mark } from "@/components/brand";
import { useSession } from "@/components/session";
import { Spinner } from "@/components/ui";
import { fb } from "@/lib/firebase/client";
import { homeFor } from "@/lib/landing";

/** Used only by the Android app: signs this built-in browser in with the app's login. */
export default function Handoff() {
  const router = useRouter();
  const { refresh } = useSession();
  const [error, setError] = useState("");

  useEffect(() => {
    const p = new URLSearchParams(window.location.hash.slice(1));
    const token = p.get("t") || "";
    const next = p.get("next") || "";
    history.replaceState(null, "", "/app/handoff");
    (async () => {
      try {
        if (token) await signInWithCustomToken(fb().auth, token);
        const m = await refresh();
        router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : homeFor(m));
      } catch {
        setError("Could not open your restaurant. Please sign in again.");
      }
    })();
  }, [refresh, router]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-navy text-ivory">
      <Mark className="size-14" />
      {error ? <p className="px-6 text-center text-sm">{error}</p> : <Spinner className="size-6 text-amber" />}
    </div>
  );
}
