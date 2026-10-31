import { NextResponse, type NextRequest } from "next/server";

/**
 * Domain-based restaurant pages (optional, set PLATFORM_DOMAIN to turn on):
 *   royal-biryani.<PLATFORM_DOMAIN>/   -> /r/royal-biryani
 *   <restaurant's own domain>/         -> /d/<host>  (when CUSTOM_DOMAINS=1 and the domain is registered)
 * Everything else (dashboards, /t/ seat links, API) works the same on every host.
 */
export function middleware(req: NextRequest) {
  const domain = (process.env.PLATFORM_DOMAIN || "").toLowerCase();
  if (!domain || req.nextUrl.pathname !== "/") return NextResponse.next();
  const host = (req.headers.get("host") || "").toLowerCase().replace(/:\d+$/, "");
  if (!host || host === domain || host === `www.${domain}` || host === `app.${domain}`) return NextResponse.next();
  if (host.endsWith(`.${domain}`)) {
    const sub = host.slice(0, -(domain.length + 1));
    if (/^[a-z0-9-]{2,60}$/.test(sub)) return NextResponse.rewrite(new URL(`/r/${sub}`, req.url));
    return NextResponse.next();
  }
  if (process.env.CUSTOM_DOMAINS === "1" && !host.endsWith(".run.app") && host !== "localhost" && !/^[\d.]+$/.test(host)) {
    return NextResponse.rewrite(new URL(`/d/${encodeURIComponent(host)}`, req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/"] };
