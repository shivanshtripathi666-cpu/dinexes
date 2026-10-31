import { TIME_ZONE } from "./config";

/** Calendar day in India for a moment, as YYYY-MM-DD (used for daily sales records). */
export function dayKey(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** Start of today (India time) as a Date. */
export function startOfDayIST(d: Date = new Date()): Date {
  const key = dayKey(d);
  return new Date(`${key}T00:00:00+05:30`);
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86400000);
}

export function lastDayKeys(n: number, end: Date = new Date()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(dayKey(addDays(end, -i)));
  return out;
}

export function formatTime(ms: number): string {
  return new Intl.DateTimeFormat("en-IN", { timeZone: TIME_ZONE, hour: "numeric", minute: "2-digit" }).format(new Date(ms));
}

export function formatDate(ms: number): string {
  return new Intl.DateTimeFormat("en-IN", { timeZone: TIME_ZONE, day: "numeric", month: "short", year: "numeric" }).format(new Date(ms));
}

export function formatDayKey(key: string): string {
  return new Intl.DateTimeFormat("en-IN", { timeZone: TIME_ZONE, day: "numeric", month: "short" }).format(new Date(`${key}T12:00:00+05:30`));
}

/** "4 min ago" style label. */
export function ago(ms: number, now: number = Date.now()): string {
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return `${h} h ago`;
}
