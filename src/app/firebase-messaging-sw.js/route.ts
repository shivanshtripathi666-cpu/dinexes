import { publicConfig } from "@/lib/publicConfig";

export const dynamic = "force-dynamic";

/** Service worker for background push notifications (Firebase Cloud Messaging). */
export async function GET() {
  const c = publicConfig();
  const body = `importScripts("https://www.gstatic.com/firebasejs/11.9.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.9.1/firebase-messaging-compat.js");
firebase.initializeApp(${JSON.stringify(c.firebase)});
const messaging = firebase.messaging();
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const tag = event.notification.tag || "";
  const url = new URL(tag.startsWith("ready-") ? "/dashboard/counter" : "/dashboard/kitchen", self.location.origin).href;
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for (const c of list) { if (c.url.startsWith(url) && "focus" in c) return c.focus(); }
    return clients.openWindow(url);
  }));
});
`;
  return new Response(body, { headers: { "Content-Type": "application/javascript; charset=utf-8", "Cache-Control": "no-cache", "Service-Worker-Allowed": "/" } });
}
