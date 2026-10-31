import { RESTAURANT_CATEGORIES } from "@/lib/config";
import { requireMember, requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/firebaseAdmin";
import { HttpError, handle, ok, readJson } from "@/lib/server/http";
import { createRestaurant } from "@/lib/server/setup";
import { bool, email, httpsUrl, oneOf, phone, str, time } from "@/lib/server/validate";
import type { Hours } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Registration: creates the restaurant workspace for the signed-in owner. */
export const POST = handle(async (req: Request) => {
  const user = await requireUser(req);
  const b = await readJson(req);
  const out = await createRestaurant(user, {
    name: str(b.name, "Restaurant name", { min: 2, max: 60 }),
    ownerName: str(b.ownerName, "Your name", { min: 2, max: 60 }),
    phone: phone(b.phone, "Phone"),
    city: str(b.city, "City", { min: 2, max: 40 }),
  });
  return ok(out, 201);
});

/** Updates the restaurant profile, hours, cuisines and settings. Owner only. */
export const PATCH = handle(async (req: Request) => {
  const m = await requireMember(req, "settings.edit");
  const b = await readJson(req);
  const patch: Record<string, unknown> = {};
  if ("name" in b) patch.name = str(b.name, "Restaurant name", { min: 2, max: 60 });
  if ("tagline" in b) patch.tagline = str(b.tagline, "Tagline", { max: 90, optional: true });
  if ("address" in b) patch.address = str(b.address, "Address", { max: 200, optional: true });
  if ("city" in b) patch.city = str(b.city, "City", { min: 2, max: 40 });
  if ("phone" in b) patch.phone = phone(b.phone, "Phone");
  if ("email" in b) patch.email = b.email ? email(b.email, "Contact email") : "";
  if ("logoUrl" in b) patch.logoUrl = httpsUrl(b.logoUrl, "Logo");
  if ("coverUrl" in b) patch.coverUrl = httpsUrl(b.coverUrl, "Cover image");
  if ("onboarded" in b) patch.onboarded = bool(b.onboarded, "Onboarded");
  if ("cuisines" in b) {
    if (!Array.isArray(b.cuisines) || b.cuisines.length > 6) throw new HttpError(400, "Choose up to 6 categories.");
    patch.cuisines = b.cuisines.map((c) => oneOf(c, "Category", RESTAURANT_CATEGORIES));
  }
  if ("hours" in b) {
    if (!Array.isArray(b.hours) || b.hours.length !== 7) throw new HttpError(400, "Opening hours are invalid.");
    patch.hours = (b.hours as Record<string, unknown>[]).map(
      (h, i): Hours => ({
        day: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][i],
        open: time(h.open, "Opening time"),
        close: time(h.close, "Closing time"),
        closed: bool(h.closed, "Closed"),
      }),
    );
  }
  if ("voiceLang" in b) patch["settings.voiceLang"] = oneOf(b.voiceLang, "Voice language", ["en", "hi"] as const);
  if ("acceptingOrders" in b) patch["settings.acceptingOrders"] = bool(b.acceptingOrders, "Accepting orders");
  if (!Object.keys(patch).length) throw new HttpError(400, "Nothing to update.");
  await db().doc(`restaurants/${m.rid}`).update(patch);
  return ok();
});
