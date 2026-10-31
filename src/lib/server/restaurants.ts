import "server-only";
import type { DocumentSnapshot } from "firebase-admin/firestore";
import { accessOf } from "@/lib/access";
import type { Category, Dish, Member, Restaurant, Seat } from "@/lib/types";
import { db } from "./firebaseAdmin";
import { HttpError } from "./http";

export function toRestaurant(d: DocumentSnapshot): Restaurant {
  const x = d.data() || {};
  return {
    id: d.id,
    name: x.name || "",
    slug: x.slug || "",
    ownerUid: x.ownerUid || "",
    logoUrl: x.logoUrl || "",
    coverUrl: x.coverUrl || "",
    tagline: x.tagline || "",
    address: x.address || "",
    city: x.city || "",
    phone: x.phone || "",
    email: x.email || "",
    cuisines: x.cuisines || [],
    hours: x.hours || [],
    seatCount: x.seatCount || 0,
    onboarded: !!x.onboarded,
    createdAt: x.createdAt || 0,
    trialEndsAt: x.trialEndsAt || 0,
    subscription: { status: x.subscription?.status || "trialing", currentPeriodEnd: x.subscription?.currentPeriodEnd || null },
    settings: { voiceLang: x.settings?.voiceLang === "hi" ? "hi" : "en", acceptingOrders: x.settings?.acceptingOrders !== false },
  };
}

export function toMember(d: DocumentSnapshot): Member {
  const x = d.data() || {};
  return { uid: d.id, name: x.name || "", email: x.email || "", role: x.role, createdAt: x.createdAt || 0 };
}

export function toSeat(d: DocumentSnapshot): Seat {
  const x = d.data() || {};
  return { id: d.id, number: x.number, label: x.label || `Seat ${x.number}`, token: x.token, active: x.active !== false };
}

export async function getRestaurant(rid: string): Promise<Restaurant> {
  const d = await db().doc(`restaurants/${rid}`).get();
  if (!d.exists) throw new HttpError(404, "Restaurant not found.");
  return toRestaurant(d);
}

/** Published menu: categories in order, dishes in order. */
export async function getMenu(rid: string): Promise<{ categories: Category[]; dishes: Dish[] }> {
  const [cs, ds] = await Promise.all([
    db().collection(`restaurants/${rid}/categories`).orderBy("sort").get(),
    db().collection(`restaurants/${rid}/dishes`).orderBy("sort").get(),
  ]);
  return {
    categories: cs.docs.map((d) => ({ id: d.id, name: d.get("name"), sort: d.get("sort") })),
    dishes: ds.docs.map((d) => {
      const x = d.data();
      return {
        id: d.id,
        categoryId: x.categoryId,
        name: x.name,
        description: x.description || "",
        pricePaise: x.pricePaise,
        photoUrl: x.photoUrl || "",
        veg: !!x.veg,
        available: x.available !== false,
        sort: x.sort || 0,
      };
    }),
  };
}

export async function resolveSlug(slug: string): Promise<string | null> {
  if (!/^[a-z0-9-]{2,60}$/.test(slug)) return null;
  const d = await db().doc(`slugs/${slug}`).get();
  return d.exists ? (d.get("rid") as string) : null;
}

/** For future custom domains: domains/{host} -> { rid }. */
export async function resolveHost(host: string): Promise<string | null> {
  const h = host.toLowerCase().replace(/:\d+$/, "");
  if (!/^[a-z0-9.-]{3,253}$/.test(h)) return null;
  const d = await db().doc(`domains/${h}`).get();
  return d.exists ? (d.get("rid") as string) : null;
}

export function canTakeOrders(r: Restaurant): { ok: boolean; reason: string } {
  const a = accessOf(r);
  if (!a.canOrder) return { ok: false, reason: "This restaurant is not taking online orders right now. Please order with the staff." };
  if (!r.settings.acceptingOrders) return { ok: false, reason: "Ordering is paused right now. Please order with the staff." };
  return { ok: true, reason: "" };
}
