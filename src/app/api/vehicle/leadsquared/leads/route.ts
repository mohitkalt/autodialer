/** Proxies LeadSquared leads list for the dashboard table. */
import { NextRequest, NextResponse } from "next/server";
import { authenticatedProxyHeaders, requireApiBaseUrl } from "../../../_lib/upstream-headers";

export async function GET(request: NextRequest) {
  const base = requireApiBaseUrl();
  if (typeof base !== "string") return base;

  const leadOwner = request.nextUrl.searchParams.get("leadOwner");
  if (!leadOwner) {
    return NextResponse.json({ message: "leadOwner is required" }, { status: 400 });
  }

  const upstream = await fetch(
    `${base}/vehicle/leadsquared/leads?leadOwner=${encodeURIComponent(leadOwner)}`,
    {
      method: "GET",
      headers: authenticatedProxyHeaders(request),
      cache: "no-store",
    },
  );

  const data = await upstream.json().catch(() => ({}));
  return NextResponse.json(data, { status: upstream.status });
}
