import { requireMember } from "@/lib/server/auth";
import { db } from "@/lib/server/firebaseAdmin";
import { HttpError, handle, ok, readJson } from "@/lib/server/http";
import { sha } from "@/lib/server/ids";
import { sendTestAlert } from "@/lib/server/push";
import { str } from "@/lib/server/validate";

export const dynamic = "force-dynamic";

/** Staff: send a test alert to this device. Only a token already registered for this restaurant is accepted. */
export const POST = handle(async (req: Request) => {
  const m = await requireMember(req);
  const b = await readJson(req);
  const token = str(b.token, "Token", { max: 4096 });
  const reg = await db().doc(`restaurants/${m.rid}/pushTokens/${sha(token, 32)}`).get();
  if (!reg.exists || reg.get("token") !== token) throw new HttpError(404, "Turn on alerts on this phone first.", "no_token");
  let sent = false;
  try {
    sent = await sendTestAlert(token);
  } catch {
    throw new HttpError(400, "Could not reach this phone. Reload the page and turn alerts on again.", "push_failed");
  }
  if (!sent) throw new HttpError(503, "Alerts are not set up on the server yet.", "push_off");
  return ok();
});
