/** Proxies last completed / attempted call + lead snapshot to the upstream lead-dialer API. */
import { NextRequest, NextResponse } from "next/server";
import { authenticatedProxyHeaders, requireApiBaseUrl } from "../../_lib/upstream-headers";

export async function GET(request: NextRequest) {
  const base = requireApiBaseUrl();
  if (typeof base !== "string") return base;

  const upstream = await fetch(`${base}/lead-dialer/last-call`, {
    method: "GET",
    headers: authenticatedProxyHeaders(request),
    cache: "no-store",
  });

  const data = await upstream.json().catch(() => ({}));
  return NextResponse.json(data, { status: upstream.status });
}
