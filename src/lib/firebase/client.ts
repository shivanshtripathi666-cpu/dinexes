"use client";
import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import {
  clearIndexedDbPersistence,
  connectFirestoreEmulator,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  terminate,
  type Firestore,
} from "firebase/firestore";
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
  // On the live site, keep a copy of menus and orders on the phone: screens open instantly, keep
  // showing the last data without internet, and fewer reads hit the server. Tests use the plain cache.
  let db: Firestore;
  if (c.useEmulators) db = getFirestore(app);
  else {
    try {
      db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
    } catch {
      db = getFirestore(app); // already started, or the browser has no storage (private mode)
    }
  }
  if (c.useEmulators) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
  }
  cache = { app, auth, db };
  return cache;
}

/** Removes this phone's saved copy of restaurant data (used on sign-out, so the next person sees nothing). */
export async function clearLocalData() {
  if (!cache) return;
  const { db } = cache;
  cache = null;
  try {
    await terminate(db);
    await clearIndexedDbPersistence(db);
  } catch {
    /* nothing saved, or another tab still open */
  }
}
