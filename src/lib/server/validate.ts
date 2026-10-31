import "server-only";
import { HttpError } from "./http";

/** Small, explicit validators. Every value from the browser goes through one of these. */
export function str(v: unknown, label: string, opts: { min?: number; max?: number; optional?: boolean } = {}): string {
  const { min = 1, max = 200, optional = false } = opts;
  if (v === undefined || v === null || v === "") {
    if (optional) return "";
    throw new HttpError(400, `${label} is required.`);
  }
  if (typeof v !== "string") throw new HttpError(400, `${label} is invalid.`);
  const s = v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
  if (!optional && s.length < min) throw new HttpError(400, `${label} is too short.`);
  if (s.length > max) throw new HttpError(400, `${label} must be at most ${max} characters.`);
  return s;
}

export function int(v: unknown, label: string, min: number, max: number): number {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isInteger(n) || n < min || n > max) {
    throw new HttpError(400, `${label} must be a whole number from ${min} to ${max}.`);
  }
  return n;
}

export function bool(v: unknown, label: string): boolean {
  if (typeof v !== "boolean") throw new HttpError(400, `${label} is invalid.`);
  return v;
}

export function oneOf<T extends string>(v: unknown, label: string, allowed: readonly T[]): T {
  if (typeof v !== "string" || !allowed.includes(v as T)) throw new HttpError(400, `${label} is invalid.`);
  return v as T;
}

export function id(v: unknown, label = "id"): string {
  if (typeof v !== "string" || !/^[A-Za-z0-9_-]{4,64}$/.test(v)) throw new HttpError(400, `${label} is invalid.`);
  return v;
}

export function email(v: unknown, label = "Email"): string {
  const s = str(v, label, { max: 120 }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)) throw new HttpError(400, `${label} is not a valid email address.`);
  return s;
}

export function phone(v: unknown, label = "Phone", optional = false): string {
  const s = str(v, label, { max: 20, optional });
  if (!s) return "";
  const digits = s.replace(/[\s()-]/g, "");
  if (!/^\+?\d{8,15}$/.test(digits)) throw new HttpError(400, `${label} is not a valid phone number.`);
  return digits;
}

export function httpsUrl(v: unknown, label: string): string {
  const s = str(v, label, { max: 600, optional: true });
  if (!s) return "";
  if (!/^https?:\/\/[^\s"'<>]+$/.test(s)) throw new HttpError(400, `${label} is invalid.`);
  return s;
}

export function time(v: unknown, label: string): string {
  if (typeof v !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) throw new HttpError(400, `${label} must look like 09:30.`);
  return v;
}
