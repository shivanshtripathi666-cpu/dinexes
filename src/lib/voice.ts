"use client";
import type { OrderLine } from "./types";

/**
 * Kitchen announcements with the browser's built-in text-to-speech (no microphone, no server).
 * Browsers only allow sound after the user taps something on the page, so the kitchen screen
 * calls unlockAudio() from the "Start kitchen mode" button.
 */
export type VoiceLang = "en" | "hi";

const EN_NUM = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];
const HI_NUM = ["शून्य", "एक", "दो", "तीन", "चार", "पाँच", "छह", "सात", "आठ", "नौ", "दस", "ग्यारह", "बारह", "तेरह", "चौदह", "पंद्रह", "सोलह", "सत्रह", "अठारह", "उन्नीस", "बीस"];

function list(parts: string[], and: string) {
  if (parts.length <= 1) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} ${and} ${parts[parts.length - 1]}`;
}

export function announcementText(o: { number: number; seatNumber: number; seatLabel: string; items: Pick<OrderLine, "name" | "qty">[] }, lang: VoiceLang): string {
  if (lang === "hi") {
    const items = list(o.items.map((i) => `${HI_NUM[i.qty] || i.qty} ${i.name}`), "और");
    return `नया ऑर्डर। सीट नंबर ${o.seatNumber}। ${items}। ऑर्डर नंबर ${o.number}।`;
  }
  const items = list(o.items.map((i) => `${EN_NUM[i.qty] || i.qty} ${i.name}`), "and");
  return `New order. Seat number ${o.seatNumber}. ${items}. Order number ${o.number}.`;
}

export function reminderText(waiting: number, lang: VoiceLang) {
  return lang === "hi" ? `याद दिलाना। ${waiting} ऑर्डर स्वीकार होने का इंतज़ार कर रहे हैं।` : `Reminder. ${waiting} ${waiting === 1 ? "order is" : "orders are"} waiting to be accepted.`;
}

let ctx: AudioContext | null = null;

export function speechSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

/** Must be called from a tap. Unlocks Web Audio and speech for this page. */
export function unlockAudio() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AC && !ctx) ctx = new AC();
    void ctx?.resume();
  } catch {
    /* no Web Audio */
  }
  if (speechSupported()) {
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    window.speechSynthesis.speak(u);
  }
}

/** Short two-tone chime. */
export function chime(volume = 1) {
  if (!ctx) return;
  const now = ctx.currentTime;
  [880, 1320].forEach((f, i) => {
    const o = ctx!.createOscillator();
    const g = ctx!.createGain();
    o.type = "sine";
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, now + i * 0.22);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, 0.35 * volume), now + i * 0.22 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.22 + 0.5);
    o.connect(g).connect(ctx!.destination);
    o.start(now + i * 0.22);
    o.stop(now + i * 0.22 + 0.55);
  });
}

function pickVoice(lang: VoiceLang): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  const want = lang === "hi" ? ["hi-IN", "hi"] : ["en-IN", "en-GB", "en-US", "en"];
  for (const w of want) {
    const v = voices.find((x) => x.lang.toLowerCase().startsWith(w.toLowerCase()));
    if (v) return v;
  }
  return null;
}

export function hasVoiceFor(lang: VoiceLang): boolean {
  return speechSupported() && !!pickVoice(lang);
}

declare global {
  interface Window {
    __dxSpoken?: string[];
  }
}

/** Speaks text; resolves when finished (or after a timeout if the phone's speech engine never answers). */
export function speak(text: string, opts: { lang: VoiceLang; volume: number; rate?: number }): Promise<boolean> {
  window.__dxSpoken = [...(window.__dxSpoken || []), text];
  if (!speechSupported()) return Promise.resolve(false);
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice(opts.lang);
    if (v) u.voice = v;
    u.lang = v?.lang || (opts.lang === "hi" ? "hi-IN" : "en-IN");
    u.volume = Math.max(0, Math.min(1, opts.volume));
    u.rate = opts.rate ?? 0.95;
    let done = false;
    const finish = (ok: boolean) => {
      if (!done) {
        done = true;
        resolve(ok);
      }
    };
    u.onend = () => finish(true);
    u.onerror = () => finish(false);
    setTimeout(() => finish(false), 15000 + text.length * 120);
    window.speechSynthesis.speak(u);
  });
}
