/**
 * Proxies LeadSquared leads list (`GET /leadsquared/leads`). Forwards query string (e.g. `is_dialed=true|false`).
 * Agent identity: upstream reads forwarded cookies / `Authorization`.
 */
import { NextRequest, NextResponse } from "next/server";
import { authenticatedProxyHeaders, requireApiBaseUrl } from "../../../_lib/upstream-headers";

export async function GET(request: NextRequest) {
  const base = requireApiBaseUrl();
  if (typeof base !== "string") return base;

  const query = request.nextUrl.search;
  const upstream = await fetch(`${base}/leadsquared/leads${query}`, {
    method: "GET",
    headers: authenticatedProxyHeaders(request),
    cache: "no-store",
  });

  const data = await upstream.json().catch(() => ({}));
  return NextResponse.json(data, { status: upstream.status });
}
