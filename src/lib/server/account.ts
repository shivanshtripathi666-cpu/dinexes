import "server-only";
import { type SignedInUser } from "./auth";
import { adminAuth, bucket, db } from "./firebaseAdmin";
import { HttpError } from "./http";
import { sha } from "./ids";
import { removeStaff } from "./staff";

/** Keys that remember "this person already had a free trial", without storing the email or phone itself. */
export function trialKeys(user: Pick<SignedInUser, "email" | "phone">): string[] {
  const keys: string[] = [];
  if (user.email) keys.push(`e-${sha(user.email.trim().toLowerCase(), 32)}`);
  if (user.phone) keys.push(`p-${sha(user.phone.replace(/\s+/g, ""), 32)}`);
  return keys;
}

/** True when this email or phone already used a free trial on a restaurant that was later deleted. */
export async function trialAlreadyUsed(user: Pick<SignedInUser, "email" | "phone">): Promise<boolean> {
  const keys = trialKeys(user);
  if (!keys.length) return false;
  const snaps = await db().getAll(...keys.map((k) => db().doc(`trialUsed/${k}`)));
  return snaps.some((s) => s.exists);
}

async function deleteWhere(collection: string, field: string, value: string) {
  const f = db();
  for (;;) {
    const page = await f.collection(collection).where(field, "==", value).limit(300).get();
    if (page.empty) return;
    const batch = f.batch();
    page.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    if (page.size < 300) return;
  }
}

/**
 * Deletes the signed-in account.
 * - Staff: removes their access and their login.
 * - Owner: deletes the whole restaurant (menu, QR codes, orders, staff logins, photos) and the login.
 *   `confirmName` must match the restaurant name. Payment records at Razorpay are not affected.
 */
export async function deleteAccount(user: SignedInUser, confirmName: string): Promise<{ deleted: "staff" | "owner" | "user" }> {
  const f = db();
  const u = await f.doc(`users/${user.uid}`).get();
  const rid = u.exists ? (u.get("rid") as string | null) : null;

  if (!rid) {
    await f.doc(`users/${user.uid}`).delete().catch(() => undefined);
    await adminAuth().deleteUser(user.uid).catch(() => undefined);
    return { deleted: "user" };
  }

  const member = await f.doc(`restaurants/${rid}/members/${user.uid}`).get();
  const role = member.exists ? (member.get("role") as string) : "";
  if (role !== "owner") {
    if (member.exists) await removeStaff(rid, user.uid);
    else {
      await f.doc(`users/${user.uid}`).delete().catch(() => undefined);
      await adminAuth().deleteUser(user.uid).catch(() => undefined);
    }
    return { deleted: "staff" };
  }

  const rest = await f.doc(`restaurants/${rid}`).get();
  const name = rest.exists ? ((rest.get("name") as string) || "") : "";
  if (name && confirmName.trim().toLowerCase() !== name.trim().toLowerCase()) {
    throw new HttpError(400, "Type your restaurant name exactly to confirm.", "confirm_name");
  }

  // Remember the free trial was used, so a new account with the same email or phone does not get another one.
  const now = Date.now();
  await Promise.all(trialKeys(user).map((k) => f.doc(`trialUsed/${k}`).set({ at: now })));

  // Everyone else in the restaurant loses access and their login.
  const members = await f.collection(`restaurants/${rid}/members`).get();
  for (const m of members.docs) {
    if (m.id === user.uid) continue;
    await f.doc(`users/${m.id}`).delete().catch(() => undefined);
    await adminAuth().deleteUser(m.id).catch(() => undefined);
  }

  // Public links: QR codes, order tracking pages, the web address and any own domain.
  await deleteWhere("seatTokens", "rid", rid);
  await deleteWhere("orderStatus", "rid", rid);
  await deleteWhere("domains", "rid", rid);
  const slug = rest.exists ? (rest.get("slug") as string) : "";
  if (slug) await f.doc(`slugs/${slug}`).delete().catch(() => undefined);

  // Photos.
  await bucket()
    .deleteFiles({ prefix: `restaurants/${rid}/` })
    .catch(() => undefined);

  // The restaurant and everything under it.
  await f.recursiveDelete(f.doc(`restaurants/${rid}`));

  await f.doc(`users/${user.uid}`).delete().catch(() => undefined);
  await adminAuth().deleteUser(user.uid).catch(() => undefined);
  return { deleted: "owner" };
}
