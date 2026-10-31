import "server-only";
import { db, messaging } from "./firebaseAdmin";
import { env, pushConfigured } from "./env";

/**
 * Sends a web push to every kitchen/counter device that turned on notifications. Best effort: the
 * order is already saved and visible on the live dashboards even if this fails.
 */
export async function notifyNewOrder(rid: string, o: { number: number; seatLabel: string; lines: { name: string; qty: number }[] }) {
  if (!pushConfigured()) return;
  try {
    const snap = await db().collection(`restaurants/${rid}/pushTokens`).limit(50).get();
    const tokens = snap.docs.map((d) => d.get("token") as string).filter(Boolean);
    if (!tokens.length) return;
    const body = o.lines.map((l) => `${l.qty} × ${l.name}`).join(", ").slice(0, 180);
    const res = await messaging().sendEachForMulticast({
      tokens,
      webpush: {
        notification: {
          title: `New order #${o.number} · ${o.seatLabel}`,
          body,
          tag: `order-${o.number}`,
          requireInteraction: true,
          icon: `${env.platformUrl}/icon.svg`,
        },
        fcmOptions: { link: `${env.platformUrl}/dashboard/kitchen` },
      },
    });
    const dead: string[] = [];
    res.responses.forEach((r, i) => {
      const code = r.error?.code || "";
      if (code.includes("registration-token-not-registered") || code.includes("invalid-argument")) dead.push(tokens[i]);
    });
    await Promise.all(
      snap.docs.filter((d) => dead.includes(d.get("token") as string)).map((d) => d.ref.delete()),
    );
  } catch (e) {
    console.error("push failed", e);
  }
}
