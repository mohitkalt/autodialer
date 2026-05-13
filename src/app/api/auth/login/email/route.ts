/**
 * Proxies email/password login to the upstream auth API (FleetOS-style Origin/Referer).
 */
import { NextRequest, NextResponse } from "next/server";
import { loginProxyJsonHeaders, requireAuthBaseUrl } from "../../../_lib/upstream-headers";

export async function POST(request: NextRequest) {
  const base = requireAuthBaseUrl();
  if (typeof base !== "string") return base;

  const body = await request.json();
  const upstream = await fetch(`${base}/auth/login/email`, {
    method: "POST",
    headers: loginProxyJsonHeaders(),
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const data = await upstream.json().catch(() => ({}));
  return NextResponse.json(data, { status: upstream.status });
}
