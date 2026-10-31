import "server-only";
import { db } from "./firebaseAdmin";
import { HttpError } from "./http";

export async function nextSort(path: string): Promise<number> {
  const last = await db().collection(path).orderBy("sort", "desc").limit(1).get();
  return last.empty ? 1 : ((last.docs[0].get("sort") as number) || 0) + 1;
}

export async function assertCategory(rid: string, cid: string) {
  const c = await db().doc(`restaurants/${rid}/categories/${cid}`).get();
  if (!c.exists) throw new HttpError(404, "Category not found.");
}
