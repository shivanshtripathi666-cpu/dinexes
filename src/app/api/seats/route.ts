import { requireMember } from "@/lib/server/auth";
import { HttpError, handle, ok, readJson } from "@/lib/server/http";
import { addSeats, deleteSeat, regenerateSeat, setSeat } from "@/lib/server/seats";
import { QR_KINDS } from "@/lib/config";
import { bool, id, int, oneOf, str } from "@/lib/server/validate";

export const dynamic = "force-dynamic";

export const POST = handle(async (req: Request) => {
  const m = await requireMember(req, "seats.manage");
  const b = await readJson(req);
  const kind = b.kind === undefined ? "dine" : oneOf(b.kind, "QR type", QR_KINDS);
  return ok(await addSeats(m.rid, int(b.count, "Number of QR codes", 1, 100), kind), 201);
});

export const PATCH = handle(async (req: Request) => {
  const m = await requireMember(req, "seats.manage");
  const b = await readJson(req);
  const sid = id(b.id, "Seat");
  if (b.action === "regenerate") return ok(await regenerateSeat(m.rid, sid));
  const patch: { active?: boolean; label?: string } = {};
  if ("active" in b) patch.active = bool(b.active, "Active");
  if ("label" in b) patch.label = str(b.label, "Seat name", { max: 30 });
  if (!Object.keys(patch).length) throw new HttpError(400, "Nothing to update.");
  await setSeat(m.rid, sid, patch);
  return ok();
});

export const DELETE = handle(async (req: Request) => {
  const m = await requireMember(req, "seats.manage");
  const b = await readJson(req);
  await deleteSeat(m.rid, id(b.id, "Seat"));
  return ok();
});
