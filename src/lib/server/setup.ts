import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { DAYS, TRIAL_DAYS } from "@/lib/config";
import type { Hours } from "@/lib/types";
import { db } from "./firebaseAdmin";
import { HttpError } from "./http";
import { RESERVED_SLUGS, randomToken, slugify } from "./ids";
import { trialAlreadyUsed } from "./account";
import type { SignedInUser } from "./auth";

export const DEFAULT_HOURS: Hours[] = DAYS.map((day) => ({ day, open: "10:00", close: "23:00", closed: false }));

/**
 * Creates the one restaurant workspace for a new owner: restaurant, owner membership, unique slug,
 * 30-day trial. A user can belong to only one restaurant.
 */
export async function createRestaurant(user: SignedInUser, input: { name: string; ownerName: string; phone: string; city: string }) {
  if (!user.emailVerified && !user.phone) throw new HttpError(403, "Please verify your email first. Open the link we sent to your inbox.", "unverified");
  const f = db();
  const base = slugify(input.name);
  const userRef = f.doc(`users/${user.uid}`);
  const restRef = f.collection("restaurants").doc();
  const now = Date.now();
  // One free trial per email / phone, even after deleting an account and signing up again.
  const trialEndsAt = (await trialAlreadyUsed(user)) ? now : now + TRIAL_DAYS * 86400000;

  return f.runTransaction(async (tx) => {
    const u = await tx.get(userRef);
    if (u.exists && u.get("rid")) throw new HttpError(409, "This account already has a restaurant.", "exists");

    // Find a free slug: name, name-2, name-3 ... or a random suffix.
    let slug = "";
    const candidates = [base, `${base}-${input.city ? slugify(input.city) : "2"}`, `${base}-2`, `${base}-3`, `${base}-${randomToken(4).toLowerCase()}`];
    for (const c of candidates) {
      if (RESERVED_SLUGS.has(c) || c.length < 2) continue;
      const s = await tx.get(f.doc(`slugs/${c}`));
      if (!s.exists) {
        slug = c;
        break;
      }
    }
    if (!slug) slug = `${base}-${randomToken(6).toLowerCase()}`;

    tx.set(restRef, {
      name: input.name,
      slug,
      ownerUid: user.uid,
      logoUrl: "",
      coverUrl: "",
      tagline: "",
      address: "",
      city: input.city,
      phone: input.phone,
      email: user.email,
      cuisines: [],
      hours: DEFAULT_HOURS,
      seatCount: 0,
      orderSeq: 100,
      onboarded: false,
      createdAt: now,
      trialEndsAt,
      subscription: { status: "trialing", currentPeriodEnd: null },
      settings: { voiceLang: "en", acceptingOrders: true, followHours: false },
      closedDates: [],
    });
    tx.set(f.doc(`slugs/${slug}`), { rid: restRef.id });
    tx.set(f.doc(`restaurants/${restRef.id}/members/${user.uid}`), {
      name: input.ownerName,
      email: user.email,
      role: "owner",
      createdAt: now,
    });
    tx.set(userRef, { rid: restRef.id, role: "owner", email: user.email, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return { rid: restRef.id, slug };
  });
}
