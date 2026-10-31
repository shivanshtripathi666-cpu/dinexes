import "server-only";
import { MAX_SEATS } from "@/lib/config";
import { db } from "./firebaseAdmin";
import { HttpError } from "./http";
import { randomToken } from "./ids";

/** Adds seats numbered after the current highest, each with its own secret QR token. */
export async function addSeats(rid: string, count: number) {
  const f = db();
  const restRef = f.doc(`restaurants/${rid}`);
  return f.runTransaction(async (tx) => {
    const r = await tx.get(restRef);
    const current = (r.get("seatCount") as number) || 0;
    const existing = await tx.get(f.collection(`restaurants/${rid}/seats`).orderBy("number", "desc").limit(1));
    const highest = existing.empty ? 0 : (existing.docs[0].get("number") as number);
    if (current + count > MAX_SEATS) throw new HttpError(400, `A restaurant can have at most ${MAX_SEATS} seats.`);
    for (let i = 1; i <= count; i++) {
      const n = highest + i;
      const ref = f.collection(`restaurants/${rid}/seats`).doc();
      const token = randomToken();
      tx.set(ref, { number: n, label: `Seat ${n}`, token, active: true, recent: [], createdAt: Date.now() });
      tx.set(f.doc(`seatTokens/${token}`), { rid, sid: ref.id });
    }
    tx.update(restRef, { seatCount: current + count });
    return { added: count };
  });
}

/** New token for a seat; the old QR code stops working at once. */
export async function regenerateSeat(rid: string, sid: string) {
  const f = db();
  const ref = f.doc(`restaurants/${rid}/seats/${sid}`);
  return f.runTransaction(async (tx) => {
    const s = await tx.get(ref);
    if (!s.exists) throw new HttpError(404, "Seat not found.");
    const token = randomToken();
    tx.delete(f.doc(`seatTokens/${s.get("token")}`));
    tx.set(f.doc(`seatTokens/${token}`), { rid, sid });
    tx.update(ref, { token });
    return { token };
  });
}

export async function setSeat(rid: string, sid: string, data: { active?: boolean; label?: string }) {
  const ref = db().doc(`restaurants/${rid}/seats/${sid}`);
  const s = await ref.get();
  if (!s.exists) throw new HttpError(404, "Seat not found.");
  await ref.update(data);
}

export async function deleteSeat(rid: string, sid: string) {
  const f = db();
  const ref = f.doc(`restaurants/${rid}/seats/${sid}`);
  const restRef = f.doc(`restaurants/${rid}`);
  await f.runTransaction(async (tx) => {
    const s = await tx.get(ref);
    const r = await tx.get(restRef);
    if (!s.exists) throw new HttpError(404, "Seat not found.");
    tx.delete(f.doc(`seatTokens/${s.get("token")}`));
    tx.delete(ref);
    tx.update(restRef, { seatCount: Math.max(0, ((r.get("seatCount") as number) || 1) - 1) });
  });
}
