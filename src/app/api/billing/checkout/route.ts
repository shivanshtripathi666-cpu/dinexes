import { requireMember } from "@/lib/server/auth";
import { createPlanOrder } from "@/lib/server/billing";
import { handle, ok, readJson } from "@/lib/server/http";
import { str } from "@/lib/server/validate";

export const dynamic = "force-dynamic";

export const POST = handle(async (req: Request) => {
  const m = await requireMember(req, "billing.manage");
  const b = await readJson(req);
  return ok(await createPlanOrder(m.rid, m.uid, str(b.plan, "Plan", { max: 10 })), 201);
});
