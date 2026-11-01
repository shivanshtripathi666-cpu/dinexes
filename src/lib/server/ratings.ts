import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "./firebaseAdmin";
import { HttpError } from "./http";

/**
 * A guest rates the dishes of their own order, once, after it has been served. The secret order
 * token proves it is their order; each dish keeps a running sum and count for its average.
 */
export async function rateOrder(publicToken: string, ratings: { dishId: string; stars: number }[], comment: string) {
  if (!/^[A-Za-z0-9]{16,40}$/.test(publicToken)) throw new HttpError(404, "Order not found.");
  const f = db();
  const sref = f.doc(`orderStatus/${publicToken}`);
  await f.runTransaction(async (tx) => {
    const s = await tx.get(sref);
    if (!s.exists) throw new HttpError(404, "Order not found.");
    if (s.get("status") !== "served") throw new HttpError(409, "You can rate your food after it has been served.");
    if (s.get("rated")) throw new HttpError(409, "Thank you, you have already rated this order.");
    const rid = s.get("rid") as string;
    const allowed = new Set(((s.get("items") as { dishId?: string }[]) || []).map((i) => i.dishId).filter(Boolean));
    const seen = new Set<string>();
    const clean = ratings.filter((r) => {
      if (!allowed.has(r.dishId) || seen.has(r.dishId)) return false;
      seen.add(r.dishId);
      return true;
    });
    if (!clean.length) throw new HttpError(400, "Please rate at least one dish.");
    const refs = clean.map((r) => f.doc(`restaurants/${rid}/dishes/${r.dishId}`));
    const dishes = await tx.getAll(...refs);
    dishes.forEach((d, i) => {
      if (d.exists) tx.update(d.ref, { ratingSum: FieldValue.increment(clean[i].stars), ratingCount: FieldValue.increment(1) });
    });
    tx.set(f.doc(`restaurants/${rid}/ratings/${publicToken}`), {
      orderNumber: s.get("number"),
      seatLabel: s.get("seatLabel"),
      ratings: clean,
      comment,
      createdAt: Date.now(),
    });
    tx.update(sref, { rated: true });
  });
}
