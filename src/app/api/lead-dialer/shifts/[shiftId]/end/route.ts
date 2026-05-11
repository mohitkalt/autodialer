/** Proxies end-shift PATCH. */
import { NextRequest, NextResponse } from "next/server";
import { authenticatedJsonWriteHeaders, requireApiBaseUrl } from "../../../../_lib/upstream-headers";

type RouteContext = {
  params: Promise<{
    shiftId: string;
  }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const base = requireApiBaseUrl();
  if (typeof base !== "string") return base;

  const { shiftId } = await context.params;
  const body = await request.json();

  const upstream = await fetch(`${base}/lead-dialer/shifts/${shiftId}/end`, {
    method: "PATCH",
    headers: authenticatedJsonWriteHeaders(request),
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const data = await upstream.json().catch(() => ({}));
  return NextResponse.json(data, { status: upstream.status });
}
