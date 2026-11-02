import "server-only";
import { accessOf, kindAllowed } from "@/lib/access";
import { MAX_SEATS, QR_KIND_INFO, TIERS, type QrKind } from "@/lib/config";
import { db } from "./firebaseAdmin";
import { HttpError } from "./http";
import { randomToken } from "./ids";
import { kindOf, toRestaurant } from "./restaurants";

/**
 * Adds QR codes of one kind (dining seats, parcel or stall counters), numbered after the highest of
 * that kind, each with its own secret token. The plan decides which kinds can be added.
 */
export async function addSeats(rid: string, count: number, kind: QrKind = "dine") {
  const f = db();
  const restRef = f.doc(`restaurants/${rid}`);
  return f.runTransaction(async (tx) => {
    const r = await tx.get(restRef);
    if (!r.exists) throw new HttpError(404, "Restaurant not found.");
    const a = accessOf(toRestaurant(r));
    if (!kindAllowed(a, kind)) {
      throw new HttpError(403, `${QR_KIND_INFO[kind].plural} QR codes are part of the ${TIERS.premium.name} plan.`, "not_in_plan");
    }
    const current = (r.get("seatCount") as number) || 0;
    // At most a few hundred QR codes, so reading them all is cheap and needs no extra index.
    const all = await tx.get(f.collection(`restaurants/${rid}/seats`).select("number", "kind"));
    const highest = all.docs.filter((d) => kindOf(d.get("kind")) === kind).reduce((m, d) => Math.max(m, (d.get("number") as number) || 0), 0);
    if (current + count > MAX_SEATS) throw new HttpError(400, `A restaurant can have at most ${MAX_SEATS} QR codes.`);
    for (let i = 1; i <= count; i++) {
      const n = highest + i;
      const ref = f.collection(`restaurants/${rid}/seats`).doc();
      const token = randomToken();
      tx.set(ref, { number: n, label: `${QR_KIND_INFO[kind].label} ${n}`, kind, token, active: true, recent: [], createdAt: Date.now() });
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
