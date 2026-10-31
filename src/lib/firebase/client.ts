"use client";
import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore";
import type { PublicConfig } from "@/lib/publicConfigType";

declare global {
  interface Window {
    __DX?: PublicConfig;
  }
}

/** Settings injected by the root layout at request time (see src/app/layout.tsx). */
export function cfg(): PublicConfig {
  if (typeof window === "undefined" || !window.__DX) throw new Error("Configuration not loaded");
  return window.__DX;
}

let cache: { app: FirebaseApp; auth: Auth; db: Firestore } | null = null;

export function fb() {
  if (cache) return cache;
  const c = cfg();
  const app = getApps()[0] ?? initializeApp(c.firebase);
  const auth = getAuth(app);
  const db = getFirestore(app);
  if (c.useEmulators) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
  }
  cache = { app, auth, db };
  return cache;
}
