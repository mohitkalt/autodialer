/**
 * Proxies OTP verification; forwards Set-Cookie from upstream with localhost-safe tweaks.
 */
import { NextRequest, NextResponse } from "next/server";
import { loginProxyJsonHeaders, requireAuthBaseUrl } from "../../_lib/upstream-headers";

const normalizeCookieForLocalhost = (cookie: string) =>
  cookie
    .replace(/;\s*Domain=[^;]*/gi, "")
    .replace(/;\s*Secure/gi, "")
    .replace(/;\s*SameSite=None/gi, "; SameSite=Lax");

export async function POST(request: NextRequest) {
  const base = requireAuthBaseUrl();
  if (typeof base !== "string") return base;

  const body = await request.json();
  const upstream = await fetch(`${base}/auth/login/verify-otp`, {
    method: "POST",
    headers: loginProxyJsonHeaders(),
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const data = await upstream.json().catch(() => ({}));
  const response = NextResponse.json(data, { status: upstream.status });

  const setCookies =
    (upstream.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];

  setCookies.forEach((cookie) => {
    response.headers.append("set-cookie", normalizeCookieForLocalhost(cookie));
  });

  return response;
}
