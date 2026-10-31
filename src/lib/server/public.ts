import "server-only";
import type { Category, Dish, Restaurant } from "@/lib/types";
import { db } from "./firebaseAdmin";
import { canTakeOrders, getMenu, toRestaurant } from "./restaurants";

export interface PublicMenu {
  restaurant: Pick<Restaurant, "id" | "name" | "slug" | "logoUrl" | "coverUrl" | "tagline" | "address" | "city" | "phone" | "hours" | "cuisines">;
  categories: Category[];
  dishes: Dish[];
  ordering: { ok: boolean; reason: string };
}

function publicRestaurant(r: Restaurant): PublicMenu["restaurant"] {
  const { id, name, slug, logoUrl, coverUrl, tagline, address, city, phone, hours, cuisines } = r;
  return { id, name, slug, logoUrl, coverUrl, tagline, address, city, phone, hours, cuisines };
}

export async function menuForRestaurant(rid: string): Promise<PublicMenu | null> {
  const d = await db().doc(`restaurants/${rid}`).get();
  if (!d.exists) return null;
  const r = toRestaurant(d);
  const { categories, dishes } = await getMenu(rid);
  const used = new Set(dishes.map((x) => x.categoryId));
  return { restaurant: publicRestaurant(r), categories: categories.filter((c) => used.has(c.id)), dishes, ordering: canTakeOrders(r) };
}

/** Menu for a seat's QR code, with the seat resolved on the server. */
export async function menuForSeat(token: string): Promise<(PublicMenu & { seat: { label: string; number: number; active: boolean } }) | null> {
  if (!/^[A-Za-z0-9]{16,40}$/.test(token)) return null;
  const t = await db().doc(`seatTokens/${token}`).get();
  if (!t.exists) return null;
  const rid = t.get("rid") as string;
  const seat = await db().doc(`restaurants/${rid}/seats/${t.get("sid")}`).get();
  if (!seat.exists || seat.get("token") !== token) return null;
  const menu = await menuForRestaurant(rid);
  if (!menu) return null;
  const active = seat.get("active") !== false;
  return {
    ...menu,
    seat: { label: (seat.get("label") as string) || `Seat ${seat.get("number")}`, number: seat.get("number") as number, active },
    ordering: active ? menu.ordering : { ok: false, reason: "This seat is not taking orders right now. Please ask the staff." },
  };
}
