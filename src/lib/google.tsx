"use client";
import { GoogleAuthProvider, getRedirectResult, signInWithPopup, signInWithRedirect } from "firebase/auth";
import { fb } from "./firebase/client";

/**
 * "Continue with Google". Uses a pop-up, and falls back to a full-page redirect where pop-ups are
 * blocked. Returns true when signed in now; false if the user closed the window or a redirect started.
 */
/**
 * Google blocks its sign-in inside app browsers (WhatsApp, Instagram, Facebook, Telegram, Snapchat,
 * LinkedIn...). There the page is reopened in Chrome (Android), or the user is told what to do (iPhone).
 */
export function inAppBrowser(): "android" | "ios" | null {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent;
  if (ua.includes("DinexesApp")) return null;
  const inApp = /WhatsApp|Instagram|FBAN|FBAV|FB_IAB|FBIOS|Line\/|Snapchat|LinkedInApp|Telegram|TwitterAndroid|MicroMessenger|; wv\)/i.test(ua);
  if (!inApp) return null;
  return /iPhone|iPad|iPod/.test(ua) ? "ios" : "android";
}

/** Opens the current page in Chrome (Android). */
export function openInChrome() {
  const { host, pathname, search, hash } = window.location;
  window.location.href = `intent://${host}${pathname}${search}${hash}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(window.location.href)};end`;
}

export async function googleSignIn(): Promise<boolean> {
  const inApp = inAppBrowser();
  if (inApp === "android") {
    openInChrome();
    return false;
  }
  if (inApp === "ios") {
    throw Object.assign(new Error("Google sign-in does not work inside this app. Tap the ••• or share button and choose \"Open in Safari\", then try again."), {
      code: "dx/in-app-browser",
    });
  }
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    await signInWithPopup(fb().auth, provider);
    return true;
  } catch (e) {
    const code = (e as { code?: string }).code || "";
    if (code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment") {
      await signInWithRedirect(fb().auth, provider);
      return false;
    }
    if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return false;
    throw e;
  }
}

/** Finishes a redirect sign-in when the page loads again. */
export async function finishGoogleRedirect(): Promise<boolean> {
  try {
    return !!(await getRedirectResult(fb().auth));
  } catch {
    return false;
  }
}

export function GoogleMark({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  );
}
