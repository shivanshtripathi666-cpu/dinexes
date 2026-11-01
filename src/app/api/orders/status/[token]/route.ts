import { db } from "@/lib/server/firebaseAdmin";
import { HttpError, handle, ok } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** Public: status of one order, by its secret public token (fallback when live updates are unavailable). */
export const GET = handle(async (_req: Request, ctx: { params: Promise<{ token: string }> }) => {
  const { token } = await ctx.params;
  if (!/^[A-Za-z0-9]{16,40}$/.test(token)) throw new HttpError(404, "Order not found.");
  const d = await db().doc(`orderStatus/${token}`).get();
  if (!d.exists) throw new HttpError(404, "Order not found.");
  const x = d.data()!;
  return ok({
    restaurantName: x.restaurantName,
    restaurantSlug: x.restaurantSlug,
    rated: !!x.rated,
    number: x.number,
    seatLabel: x.seatLabel,
    items: x.items,
    totalPaise: x.totalPaise,
    status: x.status,
    createdAt: x.createdAt,
    updatedAt: x.updatedAt,
  });
});
