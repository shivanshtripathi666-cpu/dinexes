import { requireMember } from "@/lib/server/auth";
import { confirmPlanPayment } from "@/lib/server/billing";
import { handle, ok, readJson } from "@/lib/server/http";
import { str } from "@/lib/server/validate";

export const dynamic = "force-dynamic";

export const POST = handle(async (req: Request) => {
  const m = await requireMember(req, "billing.manage");
  const b = await readJson(req);
  const r = await confirmPlanPayment(
    m.rid,
    str(b.razorpay_order_id, "Order", { max: 60 }),
    str(b.razorpay_payment_id, "Payment", { max: 60 }),
    str(b.razorpay_signature, "Signature", { max: 200 }),
  );
  return ok(r);
});
