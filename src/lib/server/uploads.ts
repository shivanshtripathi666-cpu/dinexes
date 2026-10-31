import "server-only";
import { randomUUID } from "node:crypto";
import { env } from "./env";
import { bucket } from "./firebaseAdmin";
import { HttpError } from "./http";

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_BYTES = 2 * 1024 * 1024;

function sniff(buf: Buffer): string | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.length > 12 && buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP") return "image/webp";
  return null;
}

/** Saves an image under restaurants/<rid>/<kind>/ and returns a public download address. */
export async function saveImage(rid: string, kind: "logo" | "cover" | "dish", file: File): Promise<string> {
  if (file.size > MAX_BYTES) throw new HttpError(413, "Image is too large. Please use one under 2 MB.");
  const buf = Buffer.from(await file.arrayBuffer());
  const type = sniff(buf);
  if (!type || !TYPES[type]) throw new HttpError(415, "Please upload a JPG, PNG or WebP image.");
  const token = randomUUID();
  const path = `restaurants/${rid}/${kind}/${randomUUID()}.${TYPES[type]}`;
  const b = bucket();
  await b.file(path).save(buf, {
    resumable: false,
    contentType: type,
    metadata: { cacheControl: "public, max-age=31536000, immutable", metadata: { firebaseStorageDownloadTokens: token } },
  });
  const host = env.useEmulators
    ? `http://${process.env.FIREBASE_STORAGE_EMULATOR_HOST || "127.0.0.1:9199"}`
    : "https://firebasestorage.googleapis.com";
  return `${host}/v0/b/${b.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}
