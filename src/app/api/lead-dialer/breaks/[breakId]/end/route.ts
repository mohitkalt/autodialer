/** Proxies end-break PATCH for the current agent break. */
import { NextRequest, NextResponse } from "next/server";
import { authenticatedJsonWriteHeaders, requireApiBaseUrl } from "../../../../_lib/upstream-headers";

type RouteContext = {
  params: Promise<{
    breakId: string;
  }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const base = requireApiBaseUrl();
  if (typeof base !== "string") return base;

  const { breakId } = await context.params;
  const body = await request.json();

  const upstream = await fetch(`${base}/lead-dialer/breaks/${breakId}/end`, {
    method: "PATCH",
    headers: authenticatedJsonWriteHeaders(request),
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const data = await upstream.json().catch(() => ({}));
  return NextResponse.json(data, { status: upstream.status });
}
