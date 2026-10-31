import { STAFF_ROLES } from "@/lib/roles";
import { requireMember } from "@/lib/server/auth";
import { HttpError, handle, ok, readJson } from "@/lib/server/http";
import { addStaff, removeStaff, setStaffPassword, updateStaff } from "@/lib/server/staff";
import { email, id, oneOf, str } from "@/lib/server/validate";

export const dynamic = "force-dynamic";

function password(v: unknown): string {
  const p = str(v, "Password", { min: 8, max: 64 });
  if (!/[A-Za-z]/.test(p) || !/\d/.test(p)) throw new HttpError(400, "Password must have at least 8 characters with letters and numbers.");
  return p;
}

/** Owner adds a staff login (name, email, duty, password). */
export const POST = handle(async (req: Request) => {
  const m = await requireMember(req, "staff.manage");
  const b = await readJson(req);
  const r = await addStaff(m.rid, {
    name: str(b.name, "Name", { min: 2, max: 60 }),
    email: email(b.email),
    role: oneOf(b.role, "Duty", STAFF_ROLES),
    duty: str(b.duty, "Duty title", { max: 40, optional: true }),
    password: password(b.password),
  });
  return ok(r, 201);
});

/** Owner edits a staff member: {uid, role?, duty?, name?} or {uid, password}. */
export const PATCH = handle(async (req: Request) => {
  const m = await requireMember(req, "staff.manage");
  const b = await readJson(req);
  const uid = id(b.uid, "Staff member");
  if ("password" in b) {
    await setStaffPassword(m.rid, uid, password(b.password));
    return ok();
  }
  const patch: { role?: (typeof STAFF_ROLES)[number]; duty?: string; name?: string } = {};
  if ("role" in b) patch.role = oneOf(b.role, "Duty", STAFF_ROLES);
  if ("duty" in b) patch.duty = str(b.duty, "Duty title", { max: 40, optional: true });
  if ("name" in b) patch.name = str(b.name, "Name", { min: 2, max: 60 });
  if (!Object.keys(patch).length) throw new HttpError(400, "Nothing to update.");
  await updateStaff(m.rid, uid, patch);
  return ok();
});

/** Owner removes a staff member; their login is deleted. */
export const DELETE = handle(async (req: Request) => {
  const m = await requireMember(req, "staff.manage");
  const b = await readJson(req);
  await removeStaff(m.rid, id(b.uid, "Staff member"));
  return ok();
});
