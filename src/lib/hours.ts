import type { Hours } from "./types";

/** Restaurants are in India: all opening-hour checks use India time, whatever the phone or server clock zone. */
const TZ = "Asia/Kolkata";
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export interface OpenRules {
  hours: Hours[];
  /** Take orders only inside the opening hours. */
  followHours: boolean;
  /** Whole days off, as "YYYY-MM-DD" (India date). */
  closedDates: string[];
}

export interface OpenState {
  open: boolean;
  /** Why it is closed, for guests. Empty when open. */
  reason: string;
  /** When it opens next, for example "today at 6:00 PM". Empty when unknown or open. */
  opensAt: string;
}

/** India date parts for a moment: date key, weekday (0 = Monday) and minutes since midnight. */
function partsAt(ms: number): { key: string; weekday: number; minutes: number } {
  const f = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const p: Record<string, string> = {};
  for (const x of f.formatToParts(new Date(ms))) p[x.type] = x.value;
  const weekday = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(p.weekday);
  return { key: `${p.year}-${p.month}-${p.day}`, weekday: weekday < 0 ? 0 : weekday, minutes: Number(p.hour) * 60 + Number(p.minute) };
}

function toMinutes(t: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t || "");
  return m ? Math.min(23, Number(m[1])) * 60 + Math.min(59, Number(m[2])) : 0;
}

/** "18:00" -> "6:00 PM" */
export function niceTime(t: string): string {
  const m = toMinutes(t);
  const h = Math.floor(m / 60);
  const mm = String(m % 60).padStart(2, "0");
  return `${h % 12 || 12}:${mm} ${h < 12 ? "AM" : "PM"}`;
}

function dayRule(rules: OpenRules, weekday: number): Hours | null {
  const h = rules.hours.find((x) => x.day === DAY_NAMES[weekday]) || rules.hours[weekday];
  return h || null;
}

/** Is the kitchen open at this India minute of this day (ignores closed dates)? */
function openInHours(rules: OpenRules, weekday: number, minutes: number): boolean {
  const today = dayRule(rules, weekday);
  if (today && !today.closed) {
    const o = toMinutes(today.open);
    const c = toMinutes(today.close);
    if (o === c) return true; // open all day
    if (c > o ? minutes >= o && minutes < c : minutes >= o) return true;
  }
  // Late night spill-over from yesterday, for example 6 PM to 2 AM.
  const y = dayRule(rules, (weekday + 6) % 7);
  if (y && !y.closed) {
    const o = toMinutes(y.open);
    const c = toMinutes(y.close);
    if (c < o && minutes < c) return true;
  }
  return false;
}

function label(dayOffset: number, key: string, time: string): string {
  if (dayOffset === 0) return `today at ${niceTime(time)}`;
  if (dayOffset === 1) return `tomorrow at ${niceTime(time)}`;
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  const nice = new Intl.DateTimeFormat("en-IN", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" }).format(date);
  return `${nice} at ${niceTime(time)}`;
}

/** Whether a restaurant is open now, and if not, when it opens next. */
export function openState(rules: OpenRules, now: number = Date.now()): OpenState {
  const t = partsAt(now);
  const closedToday = rules.closedDates.includes(t.key);
  const open = !closedToday && (!rules.followHours || !rules.hours.length || openInHours(rules, t.weekday, t.minutes));
  if (open) return { open: true, reason: "", opensAt: "" };

  // Look ahead up to three weeks for the next opening.
  let opensAt = "";
  for (let i = 0; i < 21 && !opensAt; i++) {
    const p = partsAt(now + i * 86400000);
    if (rules.closedDates.includes(p.key)) continue;
    if (!rules.followHours || !rules.hours.length) {
      if (i > 0) opensAt = i === 1 ? "tomorrow" : label(i, p.key, "00:00").replace(/ at .*$/, "");
      continue;
    }
    const h = dayRule(rules, p.weekday);
    if (!h || h.closed) continue;
    if (i === 0 && toMinutes(h.open) <= t.minutes) continue;
    opensAt = label(i, p.key, h.open);
  }

  const why = closedToday ? "Closed today." : "Closed right now.";
  return { open: false, reason: opensAt ? `${why} We open ${opensAt}.` : `${why} Please check back later.`, opensAt };
}

/** Today's India date as "YYYY-MM-DD". */
export function todayKey(now: number = Date.now()): string {
  return partsAt(now).key;
}
