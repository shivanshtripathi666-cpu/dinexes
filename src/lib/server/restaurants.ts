import "server-only";
import type { DocumentSnapshot } from "firebase-admin/firestore";
import { accessOf, kindAllowed } from "@/lib/access";
import { QR_KINDS, type QrKind } from "@/lib/config";
import { openState } from "@/lib/hours";
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
    planTier: x.planTier === "pro" || x.planTier === "premium" ? x.planTier : "",
    settings: { voiceLang: x.settings?.voiceLang === "hi" ? "hi" : "en", acceptingOrders: x.settings?.acceptingOrders !== false, followHours: x.settings?.followHours === true },
    closedDates: Array.isArray(x.closedDates) ? x.closedDates : [],
  };
}

/** Seats made before QR kinds existed are dining seats. */
export function kindOf(v: unknown): QrKind {
  return QR_KINDS.includes(v as QrKind) ? (v as QrKind) : "dine";
}

export function toMember(d: DocumentSnapshot): Member {
  const x = d.data() || {};
  return { uid: d.id, name: x.name || "", email: x.email || "", role: x.role, duty: x.duty || "", createdAt: x.createdAt || 0 };
}

export function toSeat(d: DocumentSnapshot): Seat {
  const x = d.data() || {};
  return { id: d.id, number: x.number, label: x.label || `Seat ${x.number}`, token: x.token, active: x.active !== false, kind: kindOf(x.kind) };
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
        ratingAvg: x.ratingCount ? Math.round(((x.ratingSum || 0) / x.ratingCount) * 10) / 10 : 0,
        ratingCount: x.ratingCount || 0,
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

export function canTakeOrders(r: Restaurant, kind?: QrKind): { ok: boolean; reason: string } {
  const a = accessOf(r);
  if (!a.canOrder) return { ok: false, reason: "This restaurant is not taking online orders right now. Please order with the staff." };
  if (kind && !kindAllowed(a, kind)) return { ok: false, reason: "This QR code is not active right now. Please order at the counter." };
  if (!r.settings.acceptingOrders) return { ok: false, reason: "Ordering is paused right now. Please order with the staff." };
  const o = openState({ hours: r.hours, followHours: r.settings.followHours, closedDates: r.closedDates });
  if (!o.open) return { ok: false, reason: o.reason };
  return { ok: true, reason: "" };
}
