import { requireMember } from "@/lib/server/auth";
import { db } from "@/lib/server/firebaseAdmin";
import { HttpError, handle, ok, readJson } from "@/lib/server/http";
import { nextSort } from "@/lib/server/menu";
import { id, int, str } from "@/lib/server/validate";

export const dynamic = "force-dynamic";

export const POST = handle(async (req: Request) => {
  const m = await requireMember(req, "menu.edit");
  const b = await readJson(req);
  const name = str(b.name, "Category name", { max: 40 });
  const col = db().collection(`restaurants/${m.rid}/categories`);
  if ((await col.count().get()).data().count >= 40) throw new HttpError(400, "A menu can have at most 40 categories.");
  const ref = await col.add({ name, sort: await nextSort(col.path) });
  return ok({ id: ref.id }, 201);
});

export const PATCH = handle(async (req: Request) => {
  const m = await requireMember(req, "menu.edit");
  const b = await readJson(req);
  const ref = db().doc(`restaurants/${m.rid}/categories/${id(b.id)}`);
  if (!(await ref.get()).exists) throw new HttpError(404, "Category not found.");
  const patch: Record<string, unknown> = {};
  if ("name" in b) patch.name = str(b.name, "Category name", { max: 40 });
  if ("sort" in b) patch.sort = int(b.sort, "Order", 0, 10000);
  await ref.update(patch);
  return ok();
});

export const DELETE = handle(async (req: Request) => {
  const m = await requireMember(req, "menu.edit");
  const b = await readJson(req);
  const cid = id(b.id);
  const dishes = await db().collection(`restaurants/${m.rid}/dishes`).where("categoryId", "==", cid).limit(1).get();
  if (!dishes.empty) throw new HttpError(409, "Move or delete the dishes in this category first.");
  await db().doc(`restaurants/${m.rid}/categories/${cid}`).delete();
  return ok();
});
