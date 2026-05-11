/** Proxies latest shift for an agent (`GET …/vehicle/lead-dialer/shifts`). */
import { NextRequest, NextResponse } from "next/server";
import { authenticatedProxyHeaders, requireApiBaseUrl } from "../../../_lib/upstream-headers";

export async function GET(request: NextRequest) {
  const base = requireApiBaseUrl();
  if (typeof base !== "string") return base;

  const agentEmail = request.nextUrl.searchParams.get("agentEmail");
  if (!agentEmail) {
    return NextResponse.json({ message: "agentEmail is required" }, { status: 400 });
  }

  const upstream = await fetch(
    `${base}/vehicle/lead-dialer/shifts?agentEmail=${encodeURIComponent(agentEmail)}`,
    {
      method: "GET",
      headers: authenticatedProxyHeaders(request),
      cache: "no-store",
    },
  );

  const data = await upstream.json().catch(() => ({}));
  return NextResponse.json(data, { status: upstream.status });
}
