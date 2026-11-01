import { requireUser } from "@/lib/server/auth";
import { adminAuth } from "@/lib/server/firebaseAdmin";
import { handle, ok } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/**
 * The Android app signs in natively, then opens the restaurant screens in its built-in browser.
 * This turns the app's sign-in into a one-time token for that browser, so the person does not sign
 * in twice. The token is valid for one hour and only for the same user.
 */
export const POST = handle(async (req: Request) => {
  const user = await requireUser(req);
  const token = await adminAuth().createCustomToken(user.uid);
  return ok({ token });
});
