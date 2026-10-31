"use client";
import { fb } from "./firebase/client";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
  ) {
    super(message);
  }
}

async function authHeader(): Promise<Record<string, string>> {
  const u = fb().auth.currentUser;
  if (!u) return {};
  return { Authorization: `Bearer ${await u.getIdToken()}` };
}

/** JSON call to this app's API. Throws ApiError with a readable message on failure. */
export async function api<T = { ok: true }>(path: string, opts: { method?: string; body?: unknown; auth?: boolean } = {}): Promise<T> {
  const { method = "GET", body, auth = true } = opts;
  const headers: Record<string, string> = auth ? await authHeader() : {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  let res: Response;
  try {
    res = await fetch(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store" });
  } catch {
    throw new ApiError("No internet connection. Please check and try again.", 0, "network");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError((data as { error?: string }).error || "Something went wrong.", res.status, (data as { code?: string }).code || "error");
  return data as T;
}

export async function uploadImage(kind: "logo" | "cover" | "dish", file: File): Promise<string> {
  const form = new FormData();
  form.append("kind", kind);
  form.append("file", file);
  let res: Response;
  try {
    res = await fetch("/api/upload", { method: "POST", headers: await authHeader(), body: form });
  } catch {
    throw new ApiError("No internet connection. Please check and try again.", 0, "network");
  }
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string; code?: string };
  if (!res.ok || !data.url) throw new ApiError(data.error || "Upload failed.", res.status, data.code || "error");
  return data.url;
}

export function errorText(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  const code = (e as { code?: string })?.code || "";
  const map: Record<string, string> = {
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/wrong-password": "Email or password is incorrect.",
    "auth/user-not-found": "No account with this email.",
    "auth/email-already-in-use": "An account with this email already exists. Please sign in.",
    "auth/weak-password": "Please use a stronger password (at least 8 characters).",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/too-many-requests": "Too many attempts. Please wait a minute and try again.",
    "auth/network-request-failed": "No internet connection. Please check and try again.",
    "permission-denied": "You do not have access to this.",
  };
  return map[code] || (e instanceof Error && e.message) || "Something went wrong.";
}
