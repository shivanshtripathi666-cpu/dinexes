import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { PLAN_PERIOD_DAYS, PLAN_PRICE_PAISE } from "@/lib/config";
import { env, razorpayConfigured } from "./env";
import { db } from "./firebaseAdmin";
import { HttpError } from "./http";

/**
 * Monthly plan payments with Razorpay. Nothing is marked paid unless Razorpay's signature checks out
 * on the server. Card details never touch this app (Razorpay Checkout collects them).
 */
function authHeader() {
  return "Basic " + Buffer.from(`${env.razorpay.keyId}:${env.razorpay.keySecret}`).toString("base64");
}

export async function createPlanOrder(rid: string, uid: string) {
  if (!razorpayConfigured()) throw new HttpError(503, "Online payment is not connected yet.", "payments_off");
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({ amount: PLAN_PRICE_PAISE, currency: "INR", receipt: `dx_${rid.slice(0, 20)}_${Date.now()}`.slice(0, 40), notes: { rid } }),
  });
  if (!res.ok) throw new HttpError(502, "Could not start the payment. Please try again.");
  const o = (await res.json()) as { id: string; amount: number };
  await db().doc(`restaurants/${rid}/payments/${o.id}`).set({
    amountPaise: o.amount,
    status: "created",
    provider: "razorpay",
    providerOrderId: o.id,
    providerPaymentId: "",
    periodStart: null,
    periodEnd: null,
    createdBy: uid,
    createdAt: Date.now(),
  });
  return { orderId: o.id, amount: o.amount, keyId: env.razorpay.keyId };
}

export function validSignature(orderId: string, paymentId: string, signature: string): boolean {
  const expected = createHmac("sha256", env.razorpay.keySecret).update(`${orderId}|${paymentId}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature || "");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** After a verified payment: one more period, starting when the current trial or paid period ends. */
export async function confirmPlanPayment(rid: string, orderId: string, paymentId: string, signature: string) {
  if (!razorpayConfigured()) throw new HttpError(503, "Online payment is not connected yet.", "payments_off");
  if (!validSignature(orderId, paymentId, signature)) throw new HttpError(400, "Payment could not be verified.", "bad_signature");
  const f = db();
  const payRef = f.doc(`restaurants/${rid}/payments/${orderId}`);
  const restRef = f.doc(`restaurants/${rid}`);
  return f.runTransaction(async (tx) => {
    const p = await tx.get(payRef);
    const r = await tx.get(restRef);
    if (!p.exists) throw new HttpError(404, "Payment not found.");
    if (p.get("status") === "paid") return { periodEnd: p.get("periodEnd") as number };
    const now = Date.now();
    const start = Math.max(now, (r.get("subscription.currentPeriodEnd") as number) || 0, (r.get("trialEndsAt") as number) || 0);
    const end = start + PLAN_PERIOD_DAYS * 86400000;
    tx.update(payRef, { status: "paid", providerPaymentId: paymentId, periodStart: start, periodEnd: end, paidAt: now });
    tx.update(restRef, { "subscription.status": "active", "subscription.currentPeriodEnd": end });
    return { periodEnd: end };
  });
}
