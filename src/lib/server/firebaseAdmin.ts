import "server-only";
import { cert, getApps, initializeApp, type App, type AppOptions } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { getStorage } from "firebase-admin/storage";
import { env, storageBucketName } from "./env";

/**
 * One Firebase Admin app per server process. On Google Cloud Run it uses the service's own identity
 * (no key file). Elsewhere, FIREBASE_SERVICE_ACCOUNT_BASE64 can hold a service account key.
 * With USE_FIREBASE_EMULATORS=1 it talks to the local emulators (FIRESTORE_EMULATOR_HOST etc.).
 */
function app(): App {
  const existing = getApps()[0];
  if (existing) return existing;
  const options: AppOptions = { projectId: env.firebase.projectId, storageBucket: storageBucketName() };
  if (env.serviceAccountBase64) {
    options.credential = cert(JSON.parse(Buffer.from(env.serviceAccountBase64, "base64").toString("utf8")));
  }
  return initializeApp(options);
}

let settingsApplied = false;

export function db() {
  const f = getFirestore(app());
  if (!settingsApplied) {
    f.settings({ ignoreUndefinedProperties: true });
    settingsApplied = true;
  }
  return f;
}

export const adminAuth = () => getAuth(app());
export const bucket = () => getStorage(app()).bucket();
export const messaging = () => getMessaging(app());
