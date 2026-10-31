import { accessOf } from "@/lib/access";
import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/firebaseAdmin";
import { handle, ok } from "@/lib/server/http";
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
