import "server-only";
import { env, razorpayConfigured, storageBucketName } from "./server/env";

import type { PublicConfig } from "./publicConfigType";

/** The only settings the browser receives. Never put secrets here. */
export function publicConfig(): PublicConfig {
  return {
    platformUrl: env.platformUrl,
    firebase: {
      apiKey: env.firebase.apiKey || (env.useEmulators ? "demo-key" : ""),
      authDomain: env.firebase.authDomain || `${env.firebase.projectId}.firebaseapp.com`,
      projectId: env.firebase.projectId,
      storageBucket: storageBucketName(),
      messagingSenderId: env.firebase.messagingSenderId,
      appId: env.firebase.appId,
    },
    vapidKey: env.firebase.vapidKey,
    useEmulators: env.useEmulators,
    razorpayKeyId: razorpayConfigured() ? env.razorpay.keyId : "",
    paymentsEnabled: razorpayConfigured(),
    supportEmail: env.supportEmail,
  };
}
