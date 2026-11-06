import { accessOf } from "@/lib/access";
import { deleteAccount } from "@/lib/server/account";
import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/firebaseAdmin";
import { HttpError, handle, ok, readJson } from "@/lib/server/http";
import { toMember, toRestaurant } from "@/lib/server/restaurants";
import type { MeResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

/** The signed-in user, their membership and their restaurant (or nulls during registration). */
export const GET = handle(async (req: Request) => {
  const user = await requireUser(req);
  const u = await db().doc(`users/${user.uid}`).get();
  const rid = u.exists ? (u.get("rid") as string | null) : null;
  const out: MeResponse = { uid: user.uid, email: user.email, emailVerified: user.emailVerified, member: null, restaurant: null, access: null };
  if (rid) {
    const [m, r] = await Promise.all([db().doc(`restaurants/${rid}/members/${user.uid}`).get(), db().doc(`restaurants/${rid}`).get()]);
    if (m.exists && r.exists) {
      out.member = toMember(m);
      out.restaurant = toRestaurant(r);
      out.access = accessOf(out.restaurant);
    }
  }
  return ok(out);
});

/**
 * Deletes the signed-in account (staff: their login; owner: the whole restaurant).
 * Needs a sign-in from the last 15 minutes, so a phone left signed in cannot be used to delete everything.
 */
export const DELETE = handle(async (req: Request) => {
  const user = await requireUser(req);
  if (Date.now() / 1000 - user.authTime > 15 * 60) {
    throw new HttpError(401, "For your safety, sign out and sign in again, then delete within 15 minutes.", "recent_login");
  }
  const b = await readJson(req);
  const out = await deleteAccount(user, typeof b.confirmName === "string" ? b.confirmName : "");
  return ok(out);
});
