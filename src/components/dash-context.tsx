"use client";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect } from "react";
import { accessOf } from "@/lib/access";
import { useLiveDoc } from "@/lib/firebase/hooks";
import { mapRestaurant } from "@/lib/mappers";
import type { Role } from "@/lib/roles";
import type { Access, Restaurant } from "@/lib/types";
import { useSession } from "./session";
import { Alert, Button, Spinner } from "./ui";

export interface Dash {
  uid: string;
  email: string;
  name: string;
  role: Role;
  rid: string;
  restaurant: Restaurant;
  access: Access;
}

const Ctx = createContext<Dash | null>(null);

export function useDash(): Dash {
  const d = useContext(Ctx);
  if (!d) throw new Error("useDash outside dashboard");
  return d;
}

/** Signed-in staff with a restaurant; the restaurant document stays live (name, trial, settings). */
export function RequireRestaurant({ children, allowNotOnboarded = false }: { children: React.ReactNode; allowNotOnboarded?: boolean }) {
  const router = useRouter();
  const { user, me, loading, error, refresh, signOut } = useSession();
  const rid = me?.restaurant?.id || null;
  const live = useLiveDoc(rid ? `restaurants/${rid}` : null, mapRestaurant);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (me && !me.restaurant) router.replace("/register");
    else if (me?.member?.role === "owner" && me.restaurant && !me.restaurant.onboarded && !allowNotOnboarded) router.replace("/onboarding");
  }, [loading, user, me, router, allowNotOnboarded]);

  if (error && !me) {
    return (
      <div className="mx-auto max-w-md px-4 py-20">
        <Alert tone="bad" title="Could not load your restaurant">
          {error}
        </Alert>
        <div className="mt-4 flex gap-2">
          <Button onClick={() => refresh()}>Try again</Button>
          <Button variant="outline" onClick={() => signOut()}>
            Sign out
          </Button>
        </div>
      </div>
    );
  }
  if (loading || !me?.restaurant || !me.member || (live.loading && !live.data)) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-muted">
        <Spinner className="size-7" />
      </div>
    );
  }
  const restaurant = live.data || me.restaurant;
  const value: Dash = {
    uid: me.uid,
    email: me.email,
    name: me.member.name,
    role: me.member.role,
    rid: restaurant.id,
    restaurant,
    access: accessOf(restaurant),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
