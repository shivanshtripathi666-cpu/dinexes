import { env } from "@/lib/server/env";

export const dynamic = "force-dynamic";

/** Public settings for the Android app (all of these are public identifiers, no secrets). */
export async function GET() {
  return Response.json(
    {
      platformUrl: env.platformUrl,
      apiKey: env.firebase.apiKey,
      projectId: env.firebase.projectId,
      storageBucket: env.firebase.storageBucket,
      senderId: env.firebase.messagingSenderId,
      androidAppId: env.android.appId,
      webClientId: env.android.webClientId,
    },
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
}
