import { env } from "@/lib/server/env";
import { adminAuth, bucket, db } from "@/lib/server/firebaseAdmin";

export const dynamic = "force-dynamic";

/** Checks that the server can reach the database, logins and photo storage. No secrets are shown. */
export async function GET() {
  const check = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      return "ok";
    } catch (e) {
      const x = e as { code?: string | number };
      return `failed (${String(x.code ?? "error")})`;
    }
  };
  const [database, logins, photos] = await Promise.all([
    check(() => db().collection("slugs").limit(1).get()),
    check(() => adminAuth().listUsers(1)),
    check(() => bucket().getFiles({ maxResults: 1 })),
  ]);
  const body = {
    webConfig: env.firebase.apiKey || env.useEmulators ? "ok" : "missing",
    database,
    logins,
    photos,
    payments: env.razorpay.keyId ? "connected" : "not connected",
    googleSignIn: env.android.webClientId ? "on" : "off (Firebase > Authentication > Sign-in method > Google)",
    address: env.platformUrl || "not set",
  };
  const healthy = database === "ok" && logins === "ok" && body.webConfig === "ok";
  return Response.json(body, { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
