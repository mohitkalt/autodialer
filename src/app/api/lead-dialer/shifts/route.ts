/** Proxies latest shift for the authenticated agent (`GET …/lead-dialer/shifts`). */
import { NextRequest, NextResponse } from "next/server";
import { authenticatedProxyHeaders, requireApiBaseUrl } from "../../_lib/upstream-headers";

export async function GET(request: NextRequest) {
  const base = requireApiBaseUrl();
  if (typeof base !== "string") return base;

  const upstream = await fetch(`${base}/lead-dialer/shifts`, {
    method: "GET",
    headers: authenticatedProxyHeaders(request),
    cache: "no-store",
  });

  const data = await upstream.json().catch(() => ({}));
  return NextResponse.json(data, { status: upstream.status });
}
