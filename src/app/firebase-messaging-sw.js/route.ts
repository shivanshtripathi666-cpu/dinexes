import { publicConfig } from "@/lib/publicConfig";

export const dynamic = "force-dynamic";

/**
 * The one service worker for the site:
 * - background order notifications (Firebase Cloud Messaging), and
 * - a phone-side cache so Dinexes opens fast and keeps working on weak or no internet:
 *   app files are kept for good, photos are kept and refreshed quietly, pages are fetched fresh
 *   when the network answers within a few seconds and otherwise shown from the last copy.
 *   Order and payment calls (/api) always go to the server and are never cached.
 */
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

const V = "v1";
const STATIC = "dx-static-" + V, IMAGES = "dx-img-" + V, PAGES = "dx-pages-" + V;
const KEEP = [STATIC, IMAGES, PAGES];
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith("dx-") && !KEEP.includes(k)).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
async function trim(name, max) {
  const c = await caches.open(name);
  const keys = await c.keys();
  for (let i = 0; i < keys.length - max; i++) await c.delete(keys[i]);
}
async function cacheFirst(req, name) {
  const hit = await caches.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) (await caches.open(name)).put(req, res.clone());
  return res;
}
async function staleWhileRevalidate(req, name, max) {
  const c = await caches.open(name);
  const hit = await c.match(req);
  const fresh = fetch(req).then((res) => {
    if (res.ok || res.type === "opaque") c.put(req, res.clone()).then(() => trim(name, max));
    return res;
  }).catch(() => hit);
  return hit || fresh;
}
const OFFLINE = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title><body style="font-family:system-ui;padding:32px;text-align:center;background:#f7f3ea;color:#131b2b"><h1 style="font-size:22px">No internet</h1><p>Dinexes will open as soon as the connection is back.</p><button onclick="location.reload()" style="padding:12px 20px;border-radius:10px;border:0;background:#131b2b;color:#fff;font-size:16px">Try again</button></body>';
async function networkFirst(req) {
  const c = await caches.open(PAGES);
  try {
    const res = await Promise.race([fetch(req), new Promise((_, no) => setTimeout(() => no(new Error("slow")), 6000))]);
    if (res.ok) c.put(req, res.clone()).then(() => trim(PAGES, 40));
    return res;
  } catch (e) {
    const hit = await c.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try { return await fetch(req); } catch (_) {
      return new Response(OFFLINE, { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } });
    }
  }
}
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const same = url.origin === self.location.origin;
  if (same && (url.pathname.startsWith("/api/") || url.pathname === "/firebase-messaging-sw.js")) return;
  if (same && (url.pathname.startsWith("/_next/static/") || /\.(?:png|svg|ico|webp|woff2?)$/.test(url.pathname))) {
    event.respondWith(cacheFirst(req, STATIC));
    return;
  }
  if (req.destination === "image" && (same || url.hostname === "firebasestorage.googleapis.com" || url.hostname === "storage.googleapis.com")) {
    event.respondWith(staleWhileRevalidate(req, IMAGES, 150));
    return;
  }
  if (same && req.mode === "navigate") event.respondWith(networkFirst(req));
});
`;
  return new Response(body, { headers: { "Content-Type": "application/javascript; charset=utf-8", "Cache-Control": "no-cache", "Service-Worker-Allowed": "/" } });
}
