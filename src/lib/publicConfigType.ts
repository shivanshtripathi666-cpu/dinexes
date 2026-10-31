export interface PublicConfig {
  platformUrl: string;
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  };
  vapidKey: string;
  useEmulators: boolean;
  razorpayKeyId: string;
  paymentsEnabled: boolean;
}
