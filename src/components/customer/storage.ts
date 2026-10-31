"use client";

/** Browser storage that never throws (private mode, blocked storage). */
export function load<T>(key: string, fallback: T, session = false): T {
  try {
    const s = (session ? window.sessionStorage : window.localStorage).getItem(key);
    return s ? (JSON.parse(s) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown, session = false) {
  try {
    (session ? window.sessionStorage : window.localStorage).setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable; the app still works without it */
  }
}

export function drop(key: string, session = false) {
  try {
    (session ? window.sessionStorage : window.localStorage).removeItem(key);
  } catch {
    /* ignore */
  }
}

export function newKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    try {
      return crypto.randomUUID();
    } catch {
      /* not a secure context */
    }
  }
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

export interface SeatOrderRef {
  token: string;
  number: number;
  at: number;
}
