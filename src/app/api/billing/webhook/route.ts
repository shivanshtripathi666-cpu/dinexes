import { creditPayment, validWebhook } from "@/lib/server/billing";

export const dynamic = "force-dynamic";

/**
 * Razorpay webhook. In the Razorpay dashboard add  <PLATFORM_URL>/api/billing/webhook  with the
 * "order.paid" event and the same secret as RAZORPAY_WEBHOOK_SECRET.
 */
export async function POST(req: Request) {
  if (Number(req.headers.get("content-length") || 0) > 200_000) return new Response("too large", { status: 413 });
  const raw = await req.text();
  if (!validWebhook(raw, req.headers.get("x-razorpay-signature") || "")) return new Response("bad signature", { status: 400 });
  try {
    const ev = JSON.parse(raw) as {
      event?: string;
      payload?: { order?: { entity?: { id?: string; notes?: { rid?: string } } }; payment?: { entity?: { id?: string } } };
    };
    if (ev.event === "order.paid") {
      const orderId = ev.payload?.order?.entity?.id || "";
      const rid = ev.payload?.order?.entity?.notes?.rid || "";
      const paymentId = ev.payload?.payment?.entity?.id || "";
      if (/^[A-Za-z0-9]{6,64}$/.test(rid) && orderId && paymentId) await creditPayment(rid, orderId, paymentId);
    }
    return new Response("ok");
  } catch (e) {
    console.error("webhook", e);
    return new Response("error", { status: 500 });
  }
}
