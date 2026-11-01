import { requireMember } from "@/lib/server/auth";
import { db } from "@/lib/server/firebaseAdmin";
import { handle, ok, readJson } from "@/lib/server/http";
import { sha } from "@/lib/server/ids";
import { str } from "@/lib/server/validate";

export const dynamic = "force-dynamic";

/** A kitchen or counter device registers its push token after the staff turns on notifications. */
export const POST = handle(async (req: Request) => {
  const m = await requireMember(req);
  const b = await readJson(req);
  const token = str(b.token, "Token", { max: 4096 });
  const platform = b.platform === "android" ? "android" : "web";
  await db().doc(`restaurants/${m.rid}/pushTokens/${sha(token, 32)}`).set({ token, uid: m.uid, role: m.role, platform, createdAt: Date.now() });
  return ok();
});

export const DELETE = handle(async (req: Request) => {
  const m = await requireMember(req);
  const b = await readJson(req);
  const token = str(b.token, "Token", { max: 4096 });
  await db().doc(`restaurants/${m.rid}/pushTokens/${sha(token, 32)}`).delete();
  return ok();
});
