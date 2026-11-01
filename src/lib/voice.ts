"use client";
import type { OrderLine } from "./types";

/**
 * Kitchen announcements with the browser's built-in text-to-speech (no microphone, no server).
 * Browsers only allow sound after the user taps something on the page, so the kitchen screen
 * calls unlockAudio() from the "Start kitchen mode" button.
 */
export type VoiceLang = "en" | "hi";

const EN_NUM = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];
const HI_ROMAN = ["shunya", "ek", "do", "teen", "chaar", "paanch", "chhah", "saat", "aath", "nau", "das", "gyaarah", "baarah", "terah", "chaudah", "pandrah", "solah", "satrah", "athaarah", "unnees", "bees"];
const HI_NUM = ["शून्य", "एक", "दो", "तीन", "चार", "पाँच", "छह", "सात", "आठ", "नौ", "दस", "ग्यारह", "बारह", "तेरह", "चौदह", "पंद्रह", "सोलह", "सत्रह", "अठारह", "उन्नीस", "बीस"];

function list(parts: string[], and: string) {
  if (parts.length <= 1) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} ${and} ${parts[parts.length - 1]}`;
}

export function announcementText(o: { number: number; seatNumber: number; seatLabel: string; items: Pick<OrderLine, "name" | "qty">[] }, lang: VoiceLang): string {
  if (lang === "hi" && !hindiVoiceReady()) {
    // No Hindi voice on this phone: say it in Hinglish with the Indian English voice, which reads it clearly.
    const items = list(o.items.map((i) => `${HI_ROMAN[i.qty] || i.qty} ${i.name}`), "aur");
    return `Naya order. Seat number ${o.seatNumber}. ${items}. Order number ${o.number}.`;
  }
  if (lang === "hi") {
    const items = list(o.items.map((i) => `${HI_NUM[i.qty] || i.qty} ${i.name}`), "और");
    return `नया ऑर्डर। सीट नंबर ${o.seatNumber}। ${items}। ऑर्डर नंबर ${o.number}।`;
  }
  const items = list(o.items.map((i) => `${EN_NUM[i.qty] || i.qty} ${i.name}`), "and");
  return `New order. Seat number ${o.seatNumber}. ${items}. Order number ${o.number}.`;
}

export function reminderText(waiting: number, lang: VoiceLang) {
  if (lang === "hi" && !hindiVoiceReady()) return `Dhyaan dijiye. ${waiting} order abhi accept nahi hue hain.`;
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

let voiceCache: SpeechSynthesisVoice[] = [];

/** Phones load their voices a moment after the page opens; keep the list fresh. */
export function loadVoices(onChange?: () => void) {
  if (!speechSupported()) return;
  const read = () => {
    const v = window.speechSynthesis.getVoices();
    if (v.length) voiceCache = v;
    onChange?.();
  };
  read();
  window.speechSynthesis.addEventListener("voiceschanged", read);
}

function voices(): SpeechSynthesisVoice[] {
  if (!speechSupported()) return [];
  const v = window.speechSynthesis.getVoices();
  if (v.length) voiceCache = v;
  return voiceCache;
}

function hindiVoiceReady(): boolean {
  return voices().some((v) => v.lang.toLowerCase().replace("_", "-").startsWith("hi"));
}

function pickVoice(lang: VoiceLang): SpeechSynthesisVoice | null {
  const list = voices();
  const want = lang === "hi" && hindiVoiceReady() ? ["hi-in", "hi"] : ["en-in", "en-gb", "en-us", "en"];
  for (const w of want) {
    const v = list.find((x) => x.lang.toLowerCase().replace("_", "-").startsWith(w));
    if (v) return v;
  }
  return null;
}

/** True when the phone has a real voice for the language (Hindi falls back to Hinglish otherwise). */
export function hasVoiceFor(lang: VoiceLang): boolean {
  return speechSupported() && (lang === "hi" ? hindiVoiceReady() : !!pickVoice("en"));
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
    u.lang = v?.lang || (opts.lang === "hi" && hindiVoiceReady() ? "hi-IN" : "en-IN");
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
    // Android Chrome sometimes gets stuck "paused"; clear and resume before speaking.
    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();
    window.speechSynthesis.speak(u);
  });
}
