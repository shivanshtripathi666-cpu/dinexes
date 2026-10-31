import "server-only";
import { createHash, randomBytes } from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

/** Random, non-guessable token (default 22 characters, about 128 bits). Used in seat QR codes. */
export function randomToken(length = 22): string {
  const bytes = randomBytes(length * 2);
  let out = "";
  for (let i = 0; i < bytes.length && out.length < length; i++) {
    const b = bytes[i];
    if (b < ALPHABET.length * 4) out += ALPHABET[b % ALPHABET.length];
  }
  return out.length === length ? out : randomToken(length);
}

export function sha(text: string, length = 24): string {
  return createHash("sha256").update(text).digest("hex").slice(0, length);
}

export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "restaurant"
  );
}

export const RESERVED_SLUGS = new Set(["www", "app", "api", "admin", "dashboard", "login", "register", "pricing", "static", "assets", "mail", "help", "support"]);
