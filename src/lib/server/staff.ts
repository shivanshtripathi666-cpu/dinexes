import "server-only";
import { MAX_STAFF } from "@/lib/config";
import type { Role } from "@/lib/roles";
import { adminAuth, db } from "./firebaseAdmin";
import { HttpError } from "./http";

/**
 * Adds a staff login to the owner's restaurant. A restaurant has at most MAX_STAFF logins in total,
 * the owner included; the limit is checked again inside a transaction so two requests at the same
 * time cannot both pass.
 */
export async function addStaff(rid: string, input: { name: string; email: string; role: Exclude<Role, "owner">; password: string }) {
  const f = db();
  const members = f.collection(`restaurants/${rid}/members`);
  const count = (await members.count().get()).data().count;
  if (count >= MAX_STAFF) throw new HttpError(409, `Your plan includes ${MAX_STAFF} logins. Remove someone before adding a new login.`, "limit");

  let uid: string;
  let created = false;
  try {
    const existing = await adminAuth().getUserByEmail(input.email);
    uid = existing.uid;
    const u = await f.doc(`users/${uid}`).get();
    if (u.exists && u.get("rid")) throw new HttpError(409, "This email already belongs to a restaurant account.", "taken");
  } catch (e) {
    if (e instanceof HttpError) throw e;
    if ((e as { code?: string }).code !== "auth/user-not-found") throw e;
    const u = await adminAuth().createUser({ email: input.email, password: input.password, displayName: input.name });
    uid = u.uid;
    created = true;
  }

  try {
    await f.runTransaction(async (tx) => {
      const all = await tx.get(members);
      if (all.size >= MAX_STAFF) throw new HttpError(409, `Your plan includes ${MAX_STAFF} logins. Remove someone before adding a new login.`, "limit");
      const userRef = f.doc(`users/${uid}`);
      const u = await tx.get(userRef);
      if (u.exists && u.get("rid")) throw new HttpError(409, "This email already belongs to a restaurant account.", "taken");
      tx.set(f.doc(`restaurants/${rid}/members/${uid}`), { name: input.name, email: input.email, role: input.role, createdAt: Date.now() });
      tx.set(userRef, { rid, role: input.role, email: input.email }, { merge: true });
    });
  } catch (e) {
    if (created) await adminAuth().deleteUser(uid).catch(() => undefined);
    throw e;
  }
  return { uid, created };
}

/** Removes a staff member's access at once: membership deleted and their sessions signed out. */
export async function removeStaff(rid: string, ownerUid: string, uid: string) {
  if (uid === ownerUid) throw new HttpError(400, "The owner cannot be removed.");
  const f = db();
  const ref = f.doc(`restaurants/${rid}/members/${uid}`);
  const m = await ref.get();
  if (!m.exists) throw new HttpError(404, "Staff member not found.");
  if (m.get("role") === "owner") throw new HttpError(400, "The owner cannot be removed.");
  await f.runTransaction(async (tx) => {
    tx.delete(ref);
    tx.set(f.doc(`users/${uid}`), { rid: null, role: null }, { merge: true });
  });
  const tokens = await f.collection(`restaurants/${rid}/pushTokens`).where("uid", "==", uid).get();
  await Promise.all(tokens.docs.map((d) => d.ref.delete()));
  await adminAuth().revokeRefreshTokens(uid).catch(() => undefined);
}
