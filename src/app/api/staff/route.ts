import { STAFF_ROLES } from "@/lib/roles";
import { requireMember } from "@/lib/server/auth";
import { HttpError, handle, ok, readJson } from "@/lib/server/http";
import { addStaff, removeStaff } from "@/lib/server/staff";
import { email, id, oneOf, str } from "@/lib/server/validate";

export const dynamic = "force-dynamic";

export const POST = handle(async (req: Request) => {
  const m = await requireMember(req, "staff.manage");
  const b = await readJson(req);
  const password = str(b.password, "Temporary password", { min: 8, max: 64 });
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) throw new HttpError(400, "Use letters and numbers in the temporary password.");
  const r = await addStaff(m.rid, {
    name: str(b.name, "Name", { min: 2, max: 60 }),
    email: email(b.email),
    role: oneOf(b.role, "Role", STAFF_ROLES),
    password,
  });
  return ok(r, 201);
});

export const DELETE = handle(async (req: Request) => {
  const m = await requireMember(req, "staff.manage");
  const b = await readJson(req);
  await removeStaff(m.rid, m.uid, id(b.uid, "Staff member"));
  return ok();
});
