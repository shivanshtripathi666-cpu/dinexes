import "server-only";
import { db, messaging } from "./firebaseAdmin";
import { env, pushConfigured } from "./env";

/**
 * Tells every kitchen/counter device about a new order. Best effort: the order is already saved and
 * visible on the live screens even if this fails.
 * - Web browsers get a notification (shown by the browser).
 * - The Android app gets a high-priority data message, so it can speak the order aloud even when the
 *   app is closed or the phone is locked.
 */
export async function notifyNewOrder(
  rid: string,
  o: { id?: string; number: number; seatNumber?: number; seatLabel: string; lines: { name: string; qty: number }[] },
) {
  if (!pushConfigured()) return;
  try {
    const snap = await db().collection(`restaurants/${rid}/pushTokens`).limit(100).get();
    const web = snap.docs.filter((d) => d.get("platform") !== "android").map((d) => d.get("token") as string);
    const android = snap.docs.filter((d) => d.get("platform") === "android").map((d) => d.get("token") as string);
    const body = o.lines.map((l) => `${l.qty} × ${l.name}`).join(", ").slice(0, 180);
    const dead: string[] = [];
    const collect = (tokens: string[], res: { responses: { error?: { code?: string } }[] }) =>
      res.responses.forEach((r, i) => {
        const code = r.error?.code || "";
        if (code.includes("registration-token-not-registered") || code.includes("invalid-argument")) dead.push(tokens[i]);
      });
    if (web.length) {
      const res = await messaging().sendEachForMulticast({
        tokens: web,
        webpush: {
          headers: { Urgency: "high", TTL: "600" },
          notification: {
            title: `New order #${o.number} · ${o.seatLabel}`,
            body,
            tag: `order-${o.number}`,
            renotify: true,
            requireInteraction: true,
            vibrate: [400, 150, 400, 150, 400],
            icon: `${env.platformUrl}/icon.svg`,
          },
          fcmOptions: { link: `${env.platformUrl}/dashboard/kitchen` },
        },
      });
      collect(web, res);
    }
    if (android.length) {
      const res = await messaging().sendEachForMulticast({
        tokens: android,
        android: { priority: "high", ttl: 600000 },
        data: {
          type: "new_order",
          orderId: o.id || String(o.number),
          number: String(o.number),
          seatNumber: String(o.seatNumber ?? ""),
          seatLabel: o.seatLabel,
          items: JSON.stringify(o.lines.map((l) => ({ name: l.name, qty: l.qty }))).slice(0, 3000),
        },
      });
      collect(android, res);
    }
    await Promise.all(snap.docs.filter((d) => dead.includes(d.get("token") as string)).map((d) => d.ref.delete()));
  } catch (e) {
    console.error("push failed", e);
  }
}
