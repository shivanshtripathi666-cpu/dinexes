import "server-only";
import { DEFAULT_SUPPORT_EMAIL } from "@/lib/config";

/** Server-side settings, read from environment variables at run time (see .env.example). */
function clean(v: string | undefined): string {
  return (v || "").trim();
}

export const env = {
  /** Public address of the platform, without a trailing slash, e.g. https://app.dinexes.in */
  platformUrl: clean(process.env.PLATFORM_URL).replace(/\/+$/, "") || "http://localhost:3000",
  /** Bare platform domain for restaurant sub-domains, e.g. dinexes.in (optional). */
  platformDomain: clean(process.env.PLATFORM_DOMAIN).toLowerCase(),
  firebase: {
    apiKey: clean(process.env.FIREBASE_WEB_API_KEY),
    authDomain: clean(process.env.FIREBASE_AUTH_DOMAIN),
    projectId: clean(process.env.FIREBASE_PROJECT_ID) || clean(process.env.GCLOUD_PROJECT) || "demo-dinexes",
    storageBucket: clean(process.env.FIREBASE_STORAGE_BUCKET),
    messagingSenderId: clean(process.env.FIREBASE_MESSAGING_SENDER_ID),
    appId: clean(process.env.FIREBASE_APP_ID),
    vapidKey: clean(process.env.FIREBASE_VAPID_KEY),
  },
  serviceAccountBase64: clean(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64),
  supportEmail: clean(process.env.SUPPORT_EMAIL) || DEFAULT_SUPPORT_EMAIL,
  useEmulators: clean(process.env.USE_FIREBASE_EMULATORS) === "1",
  razorpay: {
    keyId: clean(process.env.RAZORPAY_KEY_ID),
    keySecret: clean(process.env.RAZORPAY_KEY_SECRET),
    webhookSecret: clean(process.env.RAZORPAY_WEBHOOK_SECRET),
  },
};

export function razorpayConfigured(): boolean {
  return !!(env.razorpay.keyId && env.razorpay.keySecret);
}

/** Web push works with Firebase's default key; a custom VAPID key is optional. */
export function pushConfigured(): boolean {
  return !env.useEmulators;
}

export function storageBucketName(): string {
  return env.firebase.storageBucket || `${env.firebase.projectId}.appspot.com`;
}
