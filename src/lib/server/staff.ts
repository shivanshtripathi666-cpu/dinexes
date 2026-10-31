import "server-only";
import { MAX_STAFF } from "@/lib/config";
import type { Role } from "@/lib/roles";
import { adminAuth, db } from "./firebaseAdmin";
import { HttpError } from "./http";

type StaffRole = Exclude<Role, "owner">;

/**
 * Staff logins are created only by the owner. A restaurant has at most MAX_STAFF logins in total,
 * the owner included; the limit is checked again inside a transaction so two requests at the same
 * time cannot both pass. Staff never register themselves.
 */
export async function addStaff(rid: string, input: { name: string; email: string; role: StaffRole; duty: string; password: string }) {
  const f = db();
  const members = f.collection(`restaurants/${rid}/members`);
  const count = (await members.count().get()).data().count;
  if (count >= MAX_STAFF) throw new HttpError(409, `Your plan includes ${MAX_STAFF} logins. Remove someone before adding a new login.`, "limit");

  // An email that already has any Dinexes login cannot be taken over by another restaurant's owner.
  const existing = await adminAuth()
    .getUserByEmail(input.email)
    .catch((e: { code?: string }) => {
      if (e.code === "auth/user-not-found") return null;
      throw e;
    });
  if (existing) throw new HttpError(409, "This email already has a Dinexes login. Please use a different email.", "taken");

  const user = await adminAuth().createUser({ email: input.email, password: input.password, displayName: input.name, emailVerified: false });
  try {
    await f.runTransaction(async (tx) => {
      const all = await tx.get(members);
      if (all.size >= MAX_STAFF) throw new HttpError(409, `Your plan includes ${MAX_STAFF} logins. Remove someone before adding a new login.`, "limit");
      tx.set(f.doc(`restaurants/${rid}/members/${user.uid}`), {
        name: input.name,
        email: input.email,
        role: input.role,
        duty: input.duty,
        createdAt: Date.now(),
      });
      tx.set(f.doc(`users/${user.uid}`), { rid, role: input.role, email: input.email, staff: true });
    });
  } catch (e) {
    await adminAuth().deleteUser(user.uid).catch(() => undefined);
    throw e;
  }
  return { uid: user.uid };
}

async function staffMember(rid: string, uid: string) {
  const ref = db().doc(`restaurants/${rid}/members/${uid}`);
  const m = await ref.get();
  if (!m.exists) throw new HttpError(404, "Staff member not found.");
  if (m.get("role") === "owner") throw new HttpError(400, "This changes staff logins only. Change your own password from the sign-in page.");
  return ref;
}

/** Owner changes a staff member's role or duty title. */
export async function updateStaff(rid: string, uid: string, patch: { role?: StaffRole; duty?: string; name?: string }) {
  const ref = await staffMember(rid, uid);
  await ref.update(patch);
  if (patch.role) await db().doc(`users/${uid}`).set({ role: patch.role }, { merge: true });
}

/** Owner sets a new password for a staff member. Their other sessions are signed out. */
export async function setStaffPassword(rid: string, uid: string, password: string) {
  await staffMember(rid, uid);
  await adminAuth().updateUser(uid, { password });
  await adminAuth().revokeRefreshTokens(uid);
}

/** Removes a staff member completely: membership and login are deleted, so they can never sign in again. */
export async function removeStaff(rid: string, uid: string) {
  const ref = await staffMember(rid, uid);
  const f = db();
  await f.runTransaction(async (tx) => {
    tx.delete(ref);
    tx.delete(f.doc(`users/${uid}`));
  });
  const tokens = await f.collection(`restaurants/${rid}/pushTokens`).where("uid", "==", uid).get();
  await Promise.all(tokens.docs.map((d) => d.ref.delete()));
  await adminAuth().revokeRefreshTokens(uid).catch(() => undefined);
  await adminAuth().deleteUser(uid).catch(() => undefined);
}
