import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { MAX_ORDERS_PER_SEAT_WINDOW, MAX_ORDER_LINES, MAX_QTY_PER_LINE, SEAT_WINDOW_MINUTES } from "@/lib/config";
import { canTransition, type OrderStatus } from "@/lib/roles";
import type { OrderLine } from "@/lib/types";
import { dayKey } from "@/lib/time";
import type { MemberContext } from "./auth";
import { db } from "./firebaseAdmin";
import { HttpError } from "./http";
import { randomToken, sha } from "./ids";
import { canTakeOrders, toRestaurant } from "./restaurants";

export interface NewOrderInput {
  seatToken: string;
  items: { dishId: string; qty: number }[];
  note: string;
  idempotencyKey: string;
}

/**
 * Creates one order with all its lines, inside a single transaction.
 * - The seat comes from the secret QR token, never from the browser.
 * - Prices come from the menu in the database; the browser only sends dish ids and quantities.
 * - The same idempotency key always returns the same order, so a double tap or a retry after a
 *   network error never creates a second ticket.
 */
export async function createOrder(input: NewOrderInput) {
  if (!/^[A-Za-z0-9]{16,40}$/.test(input.seatToken)) throw new HttpError(404, "This QR code is not valid.", "bad_seat");
  if (!/^[A-Za-z0-9-]{16,64}$/.test(input.idempotencyKey)) throw new HttpError(400, "Invalid request.");
  if (!Array.isArray(input.items) || input.items.length === 0) throw new HttpError(400, "Your cart is empty.");
  if (input.items.length > MAX_ORDER_LINES) throw new HttpError(400, "Too many different dishes in one order.");

  const qtyById = new Map<string, number>();
  for (const it of input.items) {
    if (!it || typeof it.dishId !== "string" || !/^[A-Za-z0-9]{6,40}$/.test(it.dishId)) throw new HttpError(400, "Invalid dish.");
    if (!Number.isInteger(it.qty) || it.qty < 1 || it.qty > MAX_QTY_PER_LINE) {
      throw new HttpError(400, `Quantity must be between 1 and ${MAX_QTY_PER_LINE}.`);
    }
    qtyById.set(it.dishId, Math.min(MAX_QTY_PER_LINE, (qtyById.get(it.dishId) || 0) + it.qty));
  }

  const f = db();
  const tokenDoc = await f.doc(`seatTokens/${input.seatToken}`).get();
  if (!tokenDoc.exists) throw new HttpError(404, "This QR code is no longer active. Please ask the staff.", "bad_seat");
  const rid = tokenDoc.get("rid") as string;
  const sid = tokenDoc.get("sid") as string;

  const restRef = f.doc(`restaurants/${rid}`);
  const seatRef = f.doc(`restaurants/${rid}/seats/${sid}`);
  const oid = sha(`${rid}:${sid}:${input.idempotencyKey}`, 20);
  const orderRef = f.doc(`restaurants/${rid}/orders/${oid}`);

  const result = await f.runTransaction(async (tx) => {
    const existing = await tx.get(orderRef);
    if (existing.exists) {
      return { created: false, rid, oid, number: existing.get("number") as number, publicToken: existing.get("publicToken") as string };
    }
    const [restSnap, seatSnap] = await Promise.all([tx.get(restRef), tx.get(seatRef)]);
    if (!restSnap.exists || !seatSnap.exists) throw new HttpError(404, "This QR code is no longer active.", "bad_seat");
    if (seatSnap.get("token") !== input.seatToken || seatSnap.get("active") === false) {
      throw new HttpError(403, "This seat is not taking orders. Please ask the staff.", "seat_disabled");
    }
    const restaurant = toRestaurant(restSnap);
    const gate = canTakeOrders(restaurant);
    if (!gate.ok) throw new HttpError(403, gate.reason, "not_accepting");

    const now = Date.now();
    const recent = ((seatSnap.get("recent") as number[]) || []).filter((t) => t > now - SEAT_WINDOW_MINUTES * 60000);
    if (recent.length >= MAX_ORDERS_PER_SEAT_WINDOW) {
      throw new HttpError(429, "Too many orders from this seat in a short time. Please ask the staff.", "rate_limited");
    }

    const dishRefs = [...qtyById.keys()].map((id) => f.doc(`restaurants/${rid}/dishes/${id}`));
    const dishSnaps = await tx.getAll(...dishRefs);
    const lines: OrderLine[] = [];
    for (const d of dishSnaps) {
      if (!d.exists) throw new HttpError(409, "A dish in your cart is no longer on the menu. Please refresh.", "menu_changed");
      if (d.get("available") === false) {
        throw new HttpError(409, `${d.get("name")} is sold out. Please remove it from your cart.`, "sold_out");
      }
      const qty = qtyById.get(d.id)!;
      const unit = d.get("pricePaise") as number;
      lines.push({ dishId: d.id, name: d.get("name") as string, qty, unitPaise: unit, linePaise: unit * qty });
    }
    const total = lines.reduce((s, l) => s + l.linePaise, 0);
    const number = ((restSnap.get("orderSeq") as number) || 100) + 1;
    const publicToken = randomToken(24);
    const day = dayKey(new Date(now));
    const seatNumber = seatSnap.get("number") as number;
    const seatLabel = (seatSnap.get("label") as string) || `Seat ${seatNumber}`;

    tx.update(restRef, { orderSeq: number });
    tx.update(seatRef, { recent: [...recent, now] });
    tx.set(orderRef, {
      number,
      seatId: sid,
      seatNumber,
      seatLabel,
      items: lines,
      note: input.note,
      totalPaise: total,
      status: "new",
      paymentStatus: "unpaid",
      paymentMethod: "",
      createdAt: now,
      updatedAt: now,
      acceptedAt: null,
      readyAt: null,
      dayKey: day,
      publicToken,
      idempotencyKey: input.idempotencyKey,
      history: [{ status: "new", at: now, by: "customer" }],
    });
    tx.set(f.doc(`orderStatus/${publicToken}`), {
      rid,
      oid,
      restaurantName: restaurant.name,
      restaurantSlug: restaurant.slug,
      number,
      seatLabel,
      items: lines.map((l) => ({ dishId: l.dishId, name: l.name, qty: l.qty })),
      rated: false,
      totalPaise: total,
      status: "new",
      createdAt: now,
      updatedAt: now,
    });
    const dishes: Record<string, unknown> = {};
    for (const l of lines) dishes[l.dishId] = { name: l.name, qty: FieldValue.increment(l.qty) };
    tx.set(
      f.doc(`restaurants/${rid}/days/${day}`),
      { day, orders: FieldValue.increment(1), salesPaise: FieldValue.increment(total), dishes },
      { merge: true },
    );
    return { created: true, rid, oid, number, publicToken, seatLabel, seatNumber, lines, total };
  });
  return result;
}

/** Moves an order to a new status if the member's role allows that step. */
export async function updateStatus(m: MemberContext, oid: string, to: OrderStatus) {
  const f = db();
  const ref = f.doc(`restaurants/${m.rid}/orders/${oid}`);
  await f.runTransaction(async (tx) => {
    const o = await tx.get(ref);
    if (!o.exists) throw new HttpError(404, "Order not found.");
    const from = o.get("status") as OrderStatus;
    if (!canTransition(m.role, from, to)) throw new HttpError(409, `Cannot change this order from ${from} to ${to}.`, "bad_transition");
    const now = Date.now();
    const patch: Record<string, unknown> = {
      status: to,
      updatedAt: now,
      history: FieldValue.arrayUnion({ status: to, at: now, by: m.uid }),
    };
    if (to === "accepted" || (from === "new" && to !== "cancelled")) patch.acceptedAt = now;
    if (to === "ready") patch.readyAt = now;
    tx.update(ref, patch);
    tx.update(f.doc(`orderStatus/${o.get("publicToken")}`), { status: to, updatedAt: now });
    if (to === "cancelled") {
      const dishes: Record<string, unknown> = {};
      for (const l of o.get("items") as OrderLine[]) dishes[l.dishId] = { name: l.name, qty: FieldValue.increment(-l.qty) };
      const day = o.get("dayKey") as string;
      const back: Record<string, unknown> = {
        day,
        orders: FieldValue.increment(-1),
        cancelled: FieldValue.increment(1),
        salesPaise: FieldValue.increment(-(o.get("totalPaise") as number)),
        dishes,
      };
      if (o.get("paymentStatus") === "paid") back.collectedPaise = FieldValue.increment(-(o.get("totalPaise") as number));
      tx.set(f.doc(`restaurants/${m.rid}/days/${day}`), back, { merge: true });
      if (o.get("paymentStatus") === "paid") tx.update(ref, { paymentStatus: "unpaid", paymentMethod: "" });
    }
  });
}

export async function setPayment(m: MemberContext, oid: string, paid: boolean, method: "" | "cash" | "upi" | "card") {
  const f = db();
  const ref = f.doc(`restaurants/${m.rid}/orders/${oid}`);
  await f.runTransaction(async (tx) => {
    const o = await tx.get(ref);
    if (!o.exists) throw new HttpError(404, "Order not found.");
    if (o.get("status") === "cancelled") throw new HttpError(409, "This order was cancelled.");
    const was = o.get("paymentStatus") === "paid";
    if (was === paid && o.get("paymentMethod") === method) return;
    tx.update(ref, { paymentStatus: paid ? "paid" : "unpaid", paymentMethod: paid ? method : "", updatedAt: Date.now() });
    if (was !== paid) {
      const amount = o.get("totalPaise") as number;
      tx.set(
        f.doc(`restaurants/${m.rid}/days/${o.get("dayKey")}`),
        { day: o.get("dayKey"), collectedPaise: FieldValue.increment(paid ? amount : -amount) },
        { merge: true },
      );
    }
  });
}
