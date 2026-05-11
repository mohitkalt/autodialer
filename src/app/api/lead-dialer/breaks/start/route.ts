/** Proxies start-break mutation to the upstream lead-dialer API. */
import { NextRequest, NextResponse } from "next/server";
import { authenticatedJsonWriteHeaders, requireApiBaseUrl } from "../../../_lib/upstream-headers";

export async function POST(request: NextRequest) {
  const base = requireApiBaseUrl();
  if (typeof base !== "string") return base;

  const body = await request.json();
  const upstream = await fetch(`${base}/lead-dialer/breaks/start`, {
    method: "POST",
    headers: authenticatedJsonWriteHeaders(request),
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const data = await upstream.json().catch(() => ({}));
  return NextResponse.json(data, { status: upstream.status });
}
