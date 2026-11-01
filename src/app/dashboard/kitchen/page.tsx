"use client";
import { BellRing, ChefHat, History, Repeat, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDash } from "@/components/dash-context";
import { NoAccess } from "@/components/dash-shell";
import { Modal } from "@/components/modal";
import { NextStepButton, useOrderAction } from "@/components/order-actions";
import { load, save } from "@/components/customer/storage";
import { Alert, Badge, Button, EmptyState, Spinner, Toggle, cx } from "@/components/ui";
import { useOrdersSince } from "@/lib/orders-client";
import { enablePush } from "@/lib/push-client";
import { STATUS_LABEL, can, canTransition } from "@/lib/roles";
import { ago, formatTime } from "@/lib/time";
import type { Order } from "@/lib/types";
import { announcementText, chime, hasVoiceFor, loadVoices, reminderText, speak, speechSupported, unlockAudio, type VoiceLang } from "@/lib/voice";

interface Prefs {
  voice: boolean;
  volume: number;
  lang: VoiceLang;
  remind: boolean;
}

interface Announcement {
  at: number;
  text: string;
  ok: boolean;
  orderId: string;
}

export default function KitchenPage() {
  const d = useDash();
  if (!can(d.role, "orders.kitchen")) return <NoAccess />;
  return <Kitchen />;
}

function Kitchen() {
  const d = useDash();
  const [since] = useState(() => Date.now() - 18 * 3600000);
  const orders = useOrdersSince(d.rid, since);
  const act = useOrderAction();
  const [started, setStarted] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>({ voice: true, volume: 1, lang: d.restaurant.settings.voiceLang, remind: true });
  const [history, setHistory] = useState<Announcement[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [flash, setFlash] = useState<Order | null>(null);
  const [notice, setNotice] = useState("");
  const [now, setNow] = useState(Date.now());
  const seen = useRef<Set<string> | null>(null);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;
  const startedRef = useRef(started);
  startedRef.current = started;

  const [, setVoicesTick] = useState(0);
  const [resume, setResume] = useState(false);

  useEffect(() => {
    const p = load<Partial<Prefs>>("dx-kitchen-prefs", {});
    setPrefs((x) => ({ ...x, ...p }));
    setHistory(load<Announcement[]>("dx-kitchen-history", []));
    loadVoices(() => setVoicesTick((t) => t + 1));
    // Kitchen mode stays on until sign-out. Phones need one tap after a reload before sound can play.
    if (load<boolean>("dx-kitchen-on", false)) {
      setResume(true);
      const once = () => {
        unlockAudio();
        setStarted(true);
        setResume(false);
      };
      document.addEventListener("pointerdown", once, { once: true });
      return () => document.removeEventListener("pointerdown", once);
    }
  }, []);
  useEffect(() => save("dx-kitchen-prefs", prefs), [prefs]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const announce = useCallback((text: string, orderId: string) => {
    queue.current = queue.current.then(async () => {
      const p = prefsRef.current;
      chime(p.volume);
      let ok = false;
      if (p.voice && startedRef.current) {
        await new Promise((r) => setTimeout(r, 700));
        ok = await speak(text, { lang: p.lang, volume: p.volume });
      }
      setHistory((h) => {
        const n = [{ at: Date.now(), text, ok, orderId }, ...h].slice(0, 50);
        save("dx-kitchen-history", n);
        return n;
      });
    });
  }, []);

  // Detect orders that arrive after the screen opened.
  useEffect(() => {
    if (orders.loading) return;
    if (!seen.current) {
      seen.current = new Set(orders.data.map((o) => o.id));
      return;
    }
    for (const o of orders.data) {
      if (seen.current.has(o.id)) continue;
      seen.current.add(o.id);
      if (o.status !== "new") continue;
      setFlash(o);
      if ("vibrate" in navigator) navigator.vibrate?.([300, 150, 300]);
      announce(announcementText(o, prefsRef.current.lang), o.id);
    }
  }, [orders.data, orders.loading, announce]);

  const waiting = orders.data.filter((o) => o.status === "new");
  useEffect(() => {
    document.title = waiting.length ? `(${waiting.length}) New order · Kitchen` : "Kitchen";
  }, [waiting.length]);

  // Reminder while orders wait to be accepted.
  const ordersRef = useRef(orders.data);
  ordersRef.current = orders.data;
  useEffect(() => {
    if (!started || !prefs.remind) return;
    const t = setInterval(() => {
      const w = ordersRef.current.filter((o) => o.status === "new" && Date.now() - o.createdAt > 60000);
      if (w.length) announce(reminderText(w.length, prefsRef.current.lang), "");
    }, 90000);
    return () => clearInterval(t);
  }, [started, prefs.remind, announce]);

  // Keep the screen on while kitchen mode runs.
  useEffect(() => {
    if (!started || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    const get = async () => {
      try {
        lock = await navigator.wakeLock.request("screen");
      } catch {
        /* not allowed now */
      }
    };
    void get();
    const vis = () => document.visibilityState === "visible" && get();
    document.addEventListener("visibilitychange", vis);
    return () => {
      document.removeEventListener("visibilitychange", vis);
      void lock?.release();
    };
  }, [started]);

  async function start() {
    unlockAudio();
    setStarted(true);
    setResume(false);
    save("dx-kitchen-on", true);
    chime(prefs.volume);
    const msg = await enablePush();
    setNotice(msg);
  }

  function stop() {
    setStarted(false);
    save("dx-kitchen-on", false);
  }

  const columns = useMemo(() => {
    const active = orders.data.filter((o) => o.status !== "served" && o.status !== "cancelled");
    return {
      new: active.filter((o) => o.status === "new"),
      cooking: active.filter((o) => o.status === "accepted" || o.status === "preparing"),
      ready: active.filter((o) => o.status === "ready"),
    };
  }, [orders.data]);

  const flashLive = flash ? orders.data.find((o) => o.id === flash.id) || null : null;
  const [inApp, setInApp] = useState(false);
  useEffect(() => setInApp(navigator.userAgent.includes("DinexesApp")), []);
  const voiceMissing = started && prefs.voice && speechSupported() && !hasVoiceFor(prefs.lang);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="display mr-auto text-2xl font-semibold">Kitchen</h1>
        <label className="flex items-center gap-2 text-sm font-medium">
          {prefs.voice ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />} Voice
          <Toggle label="Voice announcements" checked={prefs.voice} onChange={(v) => setPrefs({ ...prefs, voice: v })} />
        </label>
        <select
          aria-label="Voice language"
          value={prefs.lang}
          onChange={(e) => setPrefs({ ...prefs, lang: e.target.value as VoiceLang })}
          className="h-9 rounded-lg border border-line bg-white px-2 text-sm"
        >
          <option value="en">English</option>
          <option value="hi">हिंदी</option>
        </select>
        <label className="flex items-center gap-2 text-sm">
          Volume
          <input
            type="range"
            min={0.2}
            max={1}
            step={0.1}
            value={prefs.volume}
            onChange={(e) => setPrefs({ ...prefs, volume: Number(e.target.value) })}
            aria-label="Announcement volume"
            className="w-24 accent-[#d29b3a]"
          />
        </label>
        <Button
          size="sm"
          variant="outline"
          disabled={!started}
          onClick={() => announce(announcementText({ number: 101, seatNumber: 2, seatLabel: "Seat 2", items: [{ name: "Chicken Biryani", qty: 1 }, { name: "Cold Coffee", qty: 2 }] }, prefs.lang), "")}
        >
          Test voice
        </Button>
        <Button size="sm" variant="outline" onClick={() => setShowHistory(true)}>
          <History className="size-4" /> History
        </Button>
      </div>

      {inApp ? (
        <div className="mb-6 rounded-2xl border border-ok/40 bg-ok-soft p-4 text-sm text-ok" data-testid="app-voice">
          <p className="font-semibold">Voice is handled by the Dinexes app</p>
          <p className="mt-0.5">New orders are spoken even when the app is closed or the phone is locked. Change voice settings from the app menu.</p>
        </div>
      ) : !started && resume ? (
        <button type="button" className="dx-pulse mb-6 w-full rounded-2xl bg-amber p-5 text-left text-ink" data-testid="resume-kitchen">
          <p className="text-lg font-bold">Tap anywhere to turn the voice back on</p>
          <p className="text-sm">Kitchen mode is on for this phone. Phones need one tap after the page reloads.</p>
        </button>
      ) : !started ? (
        <div className="mb-6 rounded-2xl border border-amber/50 bg-amber-soft p-5">
          <p className="font-semibold">Start kitchen mode to hear new orders</p>
          <p className="mt-1 text-sm text-muted">
            Phones block sound until you tap the screen once. Kitchen mode turns on the chime and voice, asks for notification permission, and keeps
            the screen awake. Keep this page open on the kitchen phone, plugged in.
          </p>
          <Button size="lg" className="mt-4" onClick={start} data-testid="start-kitchen">
            <BellRing className="size-4" /> Start kitchen mode
          </Button>
        </div>
      ) : (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          <Badge tone="ok">Kitchen mode on</Badge>
          <button type="button" onClick={stop} className="text-xs font-semibold text-muted underline underline-offset-2">
            Turn off
          </button>
          <label className="flex items-center gap-2 text-muted">
            Remind me about orders not accepted
            <Toggle label="Reminders" checked={prefs.remind} onChange={(v) => setPrefs({ ...prefs, remind: v })} />
          </label>
        </div>
      )}
      {notice && <Alert tone="info" className="mb-4">{notice} New orders still appear here and play the chime while this page is open.</Alert>}
      {voiceMissing && (
        <Alert tone="amber" className="mb-4" title={prefs.lang === "hi" ? "Hindi voice is not installed on this phone" : "No voice installed"}>
          {prefs.lang === "hi"
            ? "Orders are spoken in Hinglish for now (“Naya order. Seat number 2 …”). For proper Hindi: Android Settings → search “Text-to-speech” → Preferred engine: Speech Services by Google → ⚙ → Install voice data → Hindi (India). Then reload this page."
            : "Install a voice in Android Settings → Text-to-speech → Speech Services by Google → Install voice data."}
        </Alert>
      )}
      {!speechSupported() && <Alert tone="amber" className="mb-4">This browser cannot speak. Orders will show on screen with a chime. Chrome on Android is recommended.</Alert>}
      {(orders.error || act.error) && <Alert tone="bad" className="mb-4">{orders.error || act.error}</Alert>}

      {flashLive && flashLive.status === "new" && (
        <button
          type="button"
          onClick={() => setFlash(null)}
          className="dx-pulse mb-5 flex w-full items-center gap-3 rounded-xl bg-amber px-5 py-4 text-left text-ink"
          data-testid="new-order-banner"
        >
          <BellRing className="size-6" />
          <span className="text-lg font-bold">
            New order #{flashLive.number} · {flashLive.seatLabel}
          </span>
          <span className="ml-auto text-sm font-semibold underline">Dismiss</span>
        </button>
      )}

      {orders.loading ? (
        <div className="flex justify-center py-20 text-muted">
          <Spinner />
        </div>
      ) : columns.new.length + columns.cooking.length + columns.ready.length === 0 ? (
        <EmptyState icon={<ChefHat className="size-7" />} title="No orders right now">
          New orders appear here the moment a guest places them.
        </EmptyState>
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          {(
            [
              ["New", columns.new],
              ["Cooking", columns.cooking],
              ["Ready to serve", columns.ready],
            ] as const
          ).map(([title, list]) => (
            <section key={title}>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted">
                {title} <span className="rounded bg-sand px-1.5 text-ink">{list.length}</span>
              </h2>
              <div className="space-y-3">
                {list.map((o) => (
                  <Ticket
                    key={o.id}
                    o={o}
                    now={now}
                    busy={act.busy}
                    onStatus={act.setStatus}
                    onRepeat={() => announce(announcementText(o, prefs.lang), o.id)}
                    canCancel={canTransition(d.role, o.status, "cancelled")}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <Modal open={showHistory} onClose={() => setShowHistory(false)} title="Announcement history">
        {history.length === 0 ? (
          <p className="text-sm text-muted">Nothing announced on this device yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {history.map((h, i) => (
              <li key={i} className="py-2.5 text-sm">
                <p>{h.text}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {formatTime(h.at)} · {h.ok ? "spoken" : "shown on screen (voice off or unavailable)"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  );
}

function Ticket({
  o,
  now,
  busy,
  onStatus,
  onRepeat,
  canCancel,
}: {
  o: Order;
  now: number;
  busy: string;
  onStatus: ReturnType<typeof useOrderAction>["setStatus"];
  onRepeat: () => void;
  canCancel: boolean;
}) {
  const d = useDash();
  const late = o.status === "new" && now - o.createdAt > 3 * 60000;
  return (
    <article
      className={cx("rounded-xl border bg-white p-4", o.status === "new" ? "border-amber" : o.status === "ready" ? "border-ok" : "border-line")}
      data-testid={`ticket-${o.number}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Order #{o.number} · {formatTime(o.createdAt)}
          </p>
          <p className="mt-0.5 text-4xl font-bold leading-none" data-testid="ticket-seat">
            {o.seatLabel}
          </p>
        </div>
        <Badge tone={o.status === "new" ? "amber" : o.status === "ready" ? "ok" : "info"}>{STATUS_LABEL[o.status]}</Badge>
      </div>
      <ul className="mt-3 space-y-1.5 border-t border-line pt-3">
        {o.items.map((it) => (
          <li key={it.dishId} className="flex justify-between gap-3 text-[17px]">
            <span>{it.name}</span>
            <span className="font-bold">× {it.qty}</span>
          </li>
        ))}
      </ul>
      {o.note && <p className="mt-3 rounded-md bg-amber-soft px-3 py-2 text-sm font-medium text-amber-deep">Note: {o.note}</p>}
      <p className={cx("mt-2 text-xs", late ? "font-semibold text-bad" : "text-muted")}>{ago(o.createdAt, now)}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <NextStepButton o={o} role={d.role} busy={busy} onStatus={onStatus} size="lg" />
        <Button size="lg" variant="outline" onClick={onRepeat} aria-label={`Repeat announcement for order ${o.number}`}>
          <Repeat className="size-4" />
        </Button>
        {canCancel && (
          <Button size="lg" variant="ghost" className="text-bad" loading={busy === `${o.id}-cancelled`} onClick={() => onStatus(o, "cancelled")}>
            Cancel
          </Button>
        )}
      </div>
    </article>
  );
}
