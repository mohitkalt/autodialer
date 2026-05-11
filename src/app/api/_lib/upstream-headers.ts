import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Returns configured upstream API base URL, or a 500 JSON response if missing.
 */
export function requireApiBaseUrl(): string | NextResponse {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!base) {
    return NextResponse.json({ message: "NEXT_PUBLIC_API_BASE_URL is not configured." }, { status: 500 });
  }
  return base;
}

/** Origin / Referer sent to FleetOS-style upstream APIs (matches existing proxy behavior). */
// will make it the same as the new url once deployed so that the proxy works
export function fleetOsOriginHeaders(): Record<string, string> {
  return {
    origin: "https://fleetos.alt-mobility.com",
    referer: "https://fleetos.alt-mobility.com/",
  };
}

/**
 * For authenticated proxied GET/POST/PATCH: forwards Cookie + Authorization from the browser request.
 */
export function authenticatedProxyHeaders(request: NextRequest): HeadersInit {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const authorizationHeader = request.headers.get("authorization") ?? "";
  return {
    accept: "application/json",
    ...(cookieHeader ? { cookie: cookieHeader } : {}),
    ...(authorizationHeader ? { authorization: authorizationHeader } : {}),
    ...fleetOsOriginHeaders(),
  };
}

/** Login-style JSON POST (email / OTP) — no cookie forwarding, only FleetOS origin headers. */
export function loginProxyJsonHeaders(): HeadersInit {
  return {
    "content-type": "application/json",
    accept: "application/json",
    ...fleetOsOriginHeaders(),
  };
}

/** Authenticated JSON body write (POST/PATCH) to upstream. */
export function authenticatedJsonWriteHeaders(request: NextRequest): HeadersInit {
  return {
    "content-type": "application/json",
    ...authenticatedProxyHeaders(request),
  };
}
