import "server-only";
import { can, type Perm, type Role } from "@/lib/roles";
import { adminAuth, db } from "./firebaseAdmin";
import { HttpError } from "./http";

export interface SignedInUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  phone: string;
  /** When the person last actually signed in (seconds), for actions that need a fresh sign-in. */
  authTime: number;
}

export interface MemberContext extends SignedInUser {
  rid: string;
  role: Role;
  name: string;
}

/** Verifies the Firebase ID token sent as "Authorization: Bearer <token>". */
export async function requireUser(req: Request): Promise<SignedInUser> {
  const header = req.headers.get("authorization") || "";
  const m = /^Bearer (.+)$/.exec(header);
  if (!m) throw new HttpError(401, "Please sign in.", "unauthenticated");
  try {
    const t = await adminAuth().verifyIdToken(m[1], true);
    return { uid: t.uid, email: (t.email || "").toLowerCase(), emailVerified: !!t.email_verified, phone: t.phone_number || "", authTime: t.auth_time || 0 };
  } catch {
    throw new HttpError(401, "Your session has expired. Please sign in again.", "unauthenticated");
  }
}

/**
 * The signed-in user's restaurant and role, read from the database on every request, so revoking a
 * staff member takes effect immediately. Optionally requires a permission.
 */
export async function requireMember(req: Request, perm?: Perm): Promise<MemberContext> {
  const user = await requireUser(req);
  const u = await db().doc(`users/${user.uid}`).get();
  const rid = u.exists ? (u.get("rid") as string | null) : null;
  if (!rid) throw new HttpError(403, "You are not part of a restaurant yet.", "no_restaurant");
  const m = await db().doc(`restaurants/${rid}/members/${user.uid}`).get();
  if (!m.exists) throw new HttpError(403, "Your access to this restaurant has been removed.", "revoked");
  const role = m.get("role") as Role;
  if (perm && !can(role, perm)) throw new HttpError(403, "Your role does not allow this.", "forbidden");
  return { ...user, rid, role, name: (m.get("name") as string) || "" };
}
