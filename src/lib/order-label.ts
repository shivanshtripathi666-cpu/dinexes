import type { QrKind } from "./config";

/** How an order is named on screens and notifications: "Seat 4", "Parcel · Shivansh" or "Shivansh · Counter 1". */
export function orderWho(o: { seatLabel: string; kind?: QrKind; customerName?: string }) {
  if (o.kind === "takeaway") return `Parcel · ${o.customerName || o.seatLabel}`;
  if (o.kind === "counter") return o.customerName ? `${o.customerName} · ${o.seatLabel}` : o.seatLabel;
  return o.seatLabel;
}
