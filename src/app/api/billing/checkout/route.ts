import { requireMember } from "@/lib/server/auth";
import { createPlanOrder } from "@/lib/server/billing";
import { handle, ok } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export const POST = handle(async (req: Request) => {
  const m = await requireMember(req, "billing.manage");
  return ok(await createPlanOrder(m.rid, m.uid), 201);
});
