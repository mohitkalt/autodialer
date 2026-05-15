import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Ensures `fetch()` gets a valid absolute URL: trims, strips trailing slashes, and adds `http://`
 * when the env value is `host`, `host:port`, or IP without a scheme (common for internal APIs).
 */
export function normalizeUpstreamBaseUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  const url = new URL(withScheme);
  const path = url.pathname.replace(/\/+$/, "");
  return path ? `${url.origin}${path}` : url.origin;
}

function resolveBaseUrl(
  envValue: string | undefined,
  envName: "NEXT_PUBLIC_API_BASE_URL" | "NEXT_PUBLIC_AUTH_BASE_URL",
): string | NextResponse {
  if (!envValue?.trim()) {
    return NextResponse.json({ message: `${envName} is not configured.` }, { status: 500 });
  }
  try {
    return normalizeUpstreamBaseUrl(envValue);
  } catch {
    return NextResponse.json(
      { message: `${envName} must be a valid URL (e.g. http://172.16.16.77:8000 or https://api.example.com).` },
      { status: 500 },
    );
  }
}

/**
 * Returns configured upstream API base URL (non-login proxies), or a 500 JSON response if missing.
 */
export function requireApiBaseUrl(): string | NextResponse {
  return resolveBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL, "NEXT_PUBLIC_API_BASE_URL");
}

/**
 * Auth service base URL — email login + OTP verification proxies only (`/api/auth/login/email`, `/api/auth/verify-otp`).
 */
export function requireAuthBaseUrl(): string | NextResponse {
  return resolveBaseUrl(process.env.NEXT_PUBLIC_AUTH_BASE_URL, "NEXT_PUBLIC_AUTH_BASE_URL");
}

/** Origin/Referer headers some FleetOS-style upstreams validate; update if deployment origin changes. */
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
