import { ORDER_STATUSES } from "@/lib/roles";
import { requireMember } from "@/lib/server/auth";
import { HttpError, handle, ok, readJson } from "@/lib/server/http";
import { setPayment, updateStatus } from "@/lib/server/orders";
import { notifyReady } from "@/lib/server/push";
import { bool, id, oneOf } from "@/lib/server/validate";

export const dynamic = "force-dynamic";

/** Staff: change an order's status ({status}) or payment ({paid, method}). */
export const PATCH = handle(async (req: Request, ctx: { params: Promise<{ oid: string }> }) => {
  const { oid } = await ctx.params;
  const b = await readJson(req);
  if ("status" in b) {
    const to = oneOf(b.status, "Status", ORDER_STATUSES);
    // Every staff role may call this; canTransition() decides which status changes each role can make.
    const m = await requireMember(req, "orders.counter");
    const o = await updateStatus(m, id(oid, "Order"), to);
    if (to === "ready") await notifyReady(m.rid, o);
    return ok();
  }
  if ("paid" in b) {
    const m = await requireMember(req, "payments.mark");
    const paid = bool(b.paid, "Paid");
    const method = paid ? oneOf(b.method ?? "cash", "Payment method", ["cash", "upi", "card"] as const) : "";
    await setPayment(m, id(oid, "Order"), paid, method);
    return ok();
  }
  throw new HttpError(400, "Nothing to update.");
});
