import { rupeesToPaise } from "@/lib/money";
import { can } from "@/lib/roles";
import { requireMember } from "@/lib/server/auth";
import { db } from "@/lib/server/firebaseAdmin";
import { HttpError, handle, ok, readJson } from "@/lib/server/http";
import { assertCategory, nextSort } from "@/lib/server/menu";
import { bool, httpsUrl, id, int, str } from "@/lib/server/validate";

export const dynamic = "force-dynamic";

function price(v: unknown): number {
  const p = rupeesToPaise(typeof v === "number" ? String(v) : (v as string) ?? "");
  if (p === null || p < 100 || p > 10_000_000) throw new HttpError(400, "Price must be between ₹1 and ₹1,00,000.");
  return p;
}

export const POST = handle(async (req: Request) => {
  const m = await requireMember(req, "menu.edit");
  const b = await readJson(req);
  const categoryId = id(b.categoryId, "Category");
  await assertCategory(m.rid, categoryId);
  const col = db().collection(`restaurants/${m.rid}/dishes`);
  if ((await col.count().get()).data().count >= 500) throw new HttpError(400, "A menu can have at most 500 dishes.");
  const ref = await col.add({
    categoryId,
    name: str(b.name, "Dish name", { max: 60 }),
    description: str(b.description, "Description", { max: 240, optional: true }),
    pricePaise: price(b.price),
    photoUrl: httpsUrl(b.photoUrl, "Photo"),
    veg: b.veg === undefined ? true : bool(b.veg, "Veg"),
    available: true,
    sort: await nextSort(col.path),
    createdAt: Date.now(),
  });
  return ok({ id: ref.id }, 201);
});

/** Full edit needs menu.edit; kitchen staff may only switch "available" (sold out). */
export const PATCH = handle(async (req: Request) => {
  const b = await readJson(req);
  const onlyAvailability = Object.keys(b).every((k) => k === "id" || k === "available");
  const m = await requireMember(req, onlyAvailability ? "menu.availability" : "menu.edit");
  const ref = db().doc(`restaurants/${m.rid}/dishes/${id(b.id)}`);
  if (!(await ref.get()).exists) throw new HttpError(404, "Dish not found.");
  const patch: Record<string, unknown> = {};
  if ("available" in b) patch.available = bool(b.available, "Available");
  if (!onlyAvailability && can(m.role, "menu.edit")) {
    if ("name" in b) patch.name = str(b.name, "Dish name", { max: 60 });
    if ("description" in b) patch.description = str(b.description, "Description", { max: 240, optional: true });
    if ("price" in b) patch.pricePaise = price(b.price);
    if ("photoUrl" in b) patch.photoUrl = httpsUrl(b.photoUrl, "Photo");
    if ("veg" in b) patch.veg = bool(b.veg, "Veg");
    if ("sort" in b) patch.sort = int(b.sort, "Order", 0, 100000);
    if ("categoryId" in b) {
      const cid = id(b.categoryId, "Category");
      await assertCategory(m.rid, cid);
      patch.categoryId = cid;
    }
  }
  if (!Object.keys(patch).length) throw new HttpError(400, "Nothing to update.");
  await ref.update(patch);
  return ok();
});

export const DELETE = handle(async (req: Request) => {
  const m = await requireMember(req, "menu.edit");
  const b = await readJson(req);
  await db().doc(`restaurants/${m.rid}/dishes/${id(b.id)}`).delete();
  return ok();
});
