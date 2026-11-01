"use client";
import { api } from "./api";
import { cfg, fb } from "./firebase/client";

/**
 * Background push for this device (Firebase Cloud Messaging). Returns a short status message.
 * Works only on HTTPS, in browsers that support web push, after the user allows notifications.
 */
export async function enablePush(): Promise<string> {
  const c = cfg();
  if (c.useEmulators) return "Push notifications are off in test mode.";
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return "This browser does not support push notifications.";
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return "Notifications were not allowed. You can allow them in the browser's site settings.";
  try {
    const { getMessaging, getToken, isSupported } = await import("firebase/messaging");
    if (!(await isSupported())) return "This browser does not support push notifications.";
    const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    const token = await getToken(getMessaging(fb().app), { ...(c.vapidKey ? { vapidKey: c.vapidKey } : {}), serviceWorkerRegistration: reg });
    if (!token) return "Could not turn on push notifications.";
    await api("/api/push", { method: "POST", body: { token } });
    try {
      localStorage.setItem("dx-push-token", token);
    } catch {
      /* ignore */
    }
    return "";
  } catch {
    return "Could not turn on push notifications on this device.";
  }
}

/** On sign-out: stop alerts to this device and forget kitchen mode. */
export async function disablePushOnThisDevice() {
  let token = "";
  try {
    token = localStorage.getItem("dx-push-token") || "";
    localStorage.removeItem("dx-push-token");
    localStorage.removeItem("dx-kitchen-on");
  } catch {
    /* ignore */
  }
  if (token) await api("/api/push", { method: "DELETE", body: { token } }).catch(() => undefined);
}
