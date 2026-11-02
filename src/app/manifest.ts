import type { MetadataRoute } from "next";
import { APP_NAME } from "@/lib/config";

/** Lets staff install Dinexes on the phone's home screen ("Add to Home screen" / "Install app"). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${APP_NAME} · Kitchen and counter`,
    short_name: APP_NAME,
    description: "QR ordering for restaurants and stalls. Orders arrive with a chime, voice and notification.",
    start_url: "/dashboard/kitchen?source=app",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#131b2b",
    theme_color: "#131b2b",
    lang: "en-IN",
    categories: ["business", "food"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
    shortcuts: [
      { name: "Kitchen", url: "/dashboard/kitchen", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Counter", url: "/dashboard/counter", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
