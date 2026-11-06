"use client";
import { onAuthStateChanged, signOut as fbSignOut, type User } from "firebase/auth";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { ApiError, api } from "@/lib/api";
import { clearLocalData, fb } from "@/lib/firebase/client";
import type { MeResponse } from "@/lib/types";

interface Session {
  user: User | null;
  me: MeResponse | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<MeResponse | null>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<Session>({
  user: null,
  me: null,
  loading: true,
  error: "",
  refresh: async () => null,
  signOut: async () => undefined,
});

/** Firebase sign-in state plus the user's restaurant and role from /api/me. */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (u: User | null) => {
    if (!u) {
      setMe(null);
      return null;
    }
    try {
      const m = await api<MeResponse>("/api/me");
      setMe(m);
      setError("");
      return m;
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        // The login was removed or its session revoked: sign out on this device too.
        await fbSignOut(fb().auth).catch(() => undefined);
        setMe(null);
        return null;
      }
      setError(e instanceof Error ? e.message : "Could not load your account.");
      return null;
    }
  }, []);

  useEffect(() => {
    let alive = true;
    const unsub = onAuthStateChanged(fb().auth, async (u) => {
      setLoading(true);
      setUser(u);
      await load(u);
      if (alive) setLoading(false);
    });
    return () => {
      alive = false;
      unsub();
    };
  }, [load]);

  const refresh = useCallback(() => load(fb().auth.currentUser), [load]);
  const signOut = useCallback(async () => {
    const { disablePushOnThisDevice } = await import("@/lib/push-client");
    await disablePushOnThisDevice();
    await fbSignOut(fb().auth);
    await clearLocalData();
    (window as unknown as { DinexesApp?: { signOut?: () => void } }).DinexesApp?.signOut?.();
    setMe(null);
  }, []);

  return <Ctx.Provider value={{ user, me, loading, error, refresh, signOut }}>{children}</Ctx.Provider>;
}

export const useSession = () => useContext(Ctx);
