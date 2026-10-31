import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope } from "next/font/google";
import { APP_NAME } from "@/lib/config";
import { publicConfig } from "@/lib/publicConfig";
import { SessionProvider } from "@/components/session";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap", weight: ["500", "600"] });

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: `${APP_NAME} · QR ordering for restaurants`, template: `%s · ${APP_NAME}` },
  description: "Customers scan the QR code on their seat and order from their phone. Your kitchen hears every order. ₹399 a month.",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#131b2b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const config = JSON.stringify(publicConfig()).replace(/</g, "\\u003c");
  return (
    <html lang="en" className={`${manrope.variable} ${fraunces.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `window.__DX=${config};` }} />
      </head>
      <body className="min-h-dvh antialiased">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
