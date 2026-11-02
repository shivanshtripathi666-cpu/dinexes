"use client";
import { BellRing, Check, Download, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { api, errorText } from "@/lib/api";
import { cfg } from "@/lib/firebase/client";
import { enablePush } from "@/lib/push-client";
import { Button } from "./ui";

interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    __dxInstall?: InstallPrompt | null;
  }
}

/** Remembers Chrome's "install this site" offer so a button can show it later. */
export function useInstallPrompt() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    setPrompt(window.__dxInstall || null);
    setInstalled(window.matchMedia?.("(display-mode: standalone)").matches || false);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      window.__dxInstall = e as InstallPrompt;
      setPrompt(e as InstallPrompt);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    await prompt.userChoice.catch(() => undefined);
    window.__dxInstall = null;
    setPrompt(null);
  }
  return { canInstall: !!prompt && !installed, installed, install };
}

type State = "loading" | "unsupported" | "ios" | "off" | "denied" | "on";

function readState(): State {
  if (typeof window === "undefined") return "loading";
  if (navigator.userAgent.includes("DinexesApp")) return "on"; // the Android app has its own alerts
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches;
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return ios && !standalone ? "ios" : "unsupported";
  if (Notification.permission === "denied") return "denied";
  if (Notification.permission === "granted") return "on";
  return "off";
}

/**
 * Shown on every staff screen: turns on order alerts for this phone (they arrive even when the
 * website is closed), offers to install Dinexes on the home screen, and sends a test alert.
 */
export function AlertsBar() {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [hidden, setHidden] = useState(false);
  const { canInstall, install } = useInstallPrompt();

  useEffect(() => {
    const s = readState();
    setState(s);
    try {
      setHidden(sessionStorage.getItem("dx-alerts-hide") === "1");
    } catch {
      /* ignore */
    }
    // Alerts already allowed: refresh this phone's registration once per visit (tokens can change).
    if (s === "on" && !navigator.userAgent.includes("DinexesApp") && !cfg().useEmulators) {
      try {
        if (sessionStorage.getItem("dx-push-refreshed") !== "1") {
          sessionStorage.setItem("dx-push-refreshed", "1");
          void enablePush();
        }
      } catch {
        void enablePush();
      }
    }
  }, []);

  async function turnOn() {
    setBusy(true);
    setMsg("");
    const r = await enablePush();
    setMsg(r);
    setState(readState());
    setBusy(false);
  }

  async function test() {
    setBusy(true);
    setMsg("");
    try {
      let token = "";
      try {
        token = localStorage.getItem("dx-push-token") || "";
      } catch {
        /* ignore */
      }
      if (!token) {
        const r = await enablePush();
        if (r) throw new Error(r);
        token = localStorage.getItem("dx-push-token") || "";
      }
      await api("/api/push/test", { method: "POST", body: { token } });
      setMsg("Test alert sent. Close or minimise Chrome: it should arrive in a few seconds with sound.");
    } catch (e) {
      setMsg(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading" || state === "unsupported") return canInstall ? <InstallStrip onInstall={install} /> : null;
  if (navigator.userAgent.includes("DinexesApp")) return null;

  if (state === "on") {
    return (
      <div className="no-print mb-5 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-ok/30 bg-ok-soft px-4 py-2.5 text-sm text-ok" data-testid="alerts-on">
        <Check className="size-4 shrink-0" />
        <span className="font-semibold">Order alerts are on for this phone</span>
        <span className="hidden text-ok/80 sm:inline">They come even when the website is closed.</span>
        <span className="ml-auto flex gap-2">
          <Button size="sm" variant="ghost" onClick={test} loading={busy}>
            Send test alert
          </Button>
          {canInstall && (
            <Button size="sm" variant="outline" onClick={install}>
              <Download className="size-4" /> Install app
            </Button>
          )}
        </span>
        {msg && <p className="w-full text-xs text-ink">{msg}</p>}
      </div>
    );
  }

  if (hidden) return null;

  return (
    <div className="no-print mb-5 rounded-xl border border-amber bg-amber-soft p-4" data-testid="alerts-off">
      <div className="flex flex-wrap items-start gap-3">
        <BellRing className="mt-0.5 size-5 shrink-0 text-amber-deep" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {state === "denied" ? "Order alerts are blocked on this phone" : state === "ios" ? "On iPhone: add Dinexes to the Home Screen first" : "Turn on order alerts for this phone"}
          </p>
          <p className="mt-0.5 text-sm text-muted">
            {state === "denied"
              ? "Tap the lock icon next to the website address → Permissions → Notifications → Allow. Then reload this page."
              : state === "ios"
                ? "Tap Share → Add to Home Screen, open Dinexes from there, then turn on alerts."
                : "Every new order then rings this phone with a notification, even when the website is closed."}
          </p>
          {msg && <p className="mt-1 text-sm font-semibold text-ink">{msg}</p>}
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          {state === "off" && (
            <Button onClick={turnOn} loading={busy} data-testid="alerts-turn-on">
              <BellRing className="size-4" /> Turn on alerts
            </Button>
          )}
          {canInstall && (
            <Button variant="outline" onClick={install}>
              <Download className="size-4" /> Install app
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => {
              setHidden(true);
              try {
                sessionStorage.setItem("dx-alerts-hide", "1");
              } catch {
                /* ignore */
              }
            }}
          >
            Later
          </Button>
        </div>
      </div>
    </div>
  );
}

function InstallStrip({ onInstall }: { onInstall: () => void }) {
  return (
    <div className="no-print mb-5 flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-2.5 text-sm">
      <Smartphone className="size-4 shrink-0 text-muted" />
      <span>Put Dinexes on your home screen for one-tap opening.</span>
      <Button size="sm" variant="outline" className="ml-auto" onClick={onInstall}>
        <Download className="size-4" /> Install
      </Button>
    </div>
  );
}
