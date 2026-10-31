import "server-only";
import { NextResponse } from "next/server";

/** An error with an HTTP status and a message that is safe to show to the user. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code: string = "error",
  ) {
    super(message);
  }
}

export function ok(data: unknown = { ok: true }, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

/** Wraps a route handler: known errors become JSON with their status, anything else becomes a 500. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof HttpError) {
        return NextResponse.json({ error: e.message, code: e.code }, { status: e.status, headers: { "Cache-Control": "no-store" } });
      }
      console.error("Unhandled error", e);
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
  };
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  const type = req.headers.get("content-type") || "";
  if (!type.includes("application/json")) throw new HttpError(415, "Send JSON.");
  const text = await req.text();
  if (text.length > 100_000) throw new HttpError(413, "Request is too large.");
  try {
    const v = JSON.parse(text);
    if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error();
    return v as Record<string, unknown>;
  } catch {
    throw new HttpError(400, "Invalid request.");
  }
}
