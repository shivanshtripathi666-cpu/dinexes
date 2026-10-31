import { HttpError, handle, ok, readJson } from "@/lib/server/http";
import { createOrder } from "@/lib/server/orders";
import { notifyNewOrder } from "@/lib/server/push";
import { str } from "@/lib/server/validate";

export const dynamic = "force-dynamic";

/** Public: a customer at a seat places an order. No login; the seat token from the QR code identifies the seat. */
export const POST = handle(async (req: Request) => {
  const b = await readJson(req);
  if (!Array.isArray(b.items)) throw new HttpError(400, "Your cart is empty.");
  const r = await createOrder({
    seatToken: str(b.seatToken, "Seat", { max: 40 }),
    idempotencyKey: str(b.idempotencyKey, "Request", { max: 64 }),
    note: str(b.note, "Instructions", { max: 200, optional: true }),
    items: (b.items as { dishId: unknown; qty: unknown }[]).map((i) => ({ dishId: String(i?.dishId ?? ""), qty: Number(i?.qty) })),
  });
  if (r.created && "lines" in r && r.lines) {
    await notifyNewOrder(r.rid, { number: r.number, seatLabel: r.seatLabel!, lines: r.lines });
  }
  return ok({ number: r.number, publicToken: r.publicToken, created: r.created }, r.created ? 201 : 200);
});
