"use client";
import { orderBy, where } from "firebase/firestore";
import { useLiveCollection } from "./firebase/hooks";
import { mapDay } from "./mappers";
import { lastDayKeys } from "./time";
import type { DayStats } from "./types";

/** Daily sales records for the last n days (India time), with empty days filled in as zero. */
export function useDays(rid: string, n: number) {
  const keys = lastDayKeys(n);
  const live = useLiveCollection(`restaurants/${rid}/days`, [where("day", ">=", keys[0]), orderBy("day")], `${keys[0]}`, mapDay);
  const byKey = new Map(live.data.map((d) => [d.day, d]));
  const days: DayStats[] = keys.map((k) => byKey.get(k) || { day: k, orders: 0, cancelled: 0, salesPaise: 0, collectedPaise: 0, dishes: {} });
  return { days, loading: live.loading, error: live.error };
}

export function topDishes(days: DayStats[], limit = 5) {
  const m = new Map<string, { name: string; qty: number }>();
  for (const d of days) {
    for (const [id, x] of Object.entries(d.dishes)) {
      const cur = m.get(id) || { name: x.name, qty: 0 };
      cur.qty += x.qty || 0;
      cur.name = x.name || cur.name;
      m.set(id, cur);
    }
  }
  return [...m.values()].filter((x) => x.qty > 0).sort((a, b) => b.qty - a.qty).slice(0, limit);
}
