/**
 * Proxies agent permission lookup (`GET …/auth/permission?email=`).
 * Client hook: `useLazyGetPermissionQuery` in `authApi.ts`; forwards cookies/bearer like other authenticated proxies.
 */
import { NextRequest, NextResponse } from "next/server";
import { authenticatedProxyHeaders, requireApiBaseUrl } from "../../_lib/upstream-headers";

export async function GET(request: NextRequest) {
  const base = requireApiBaseUrl();
  if (typeof base !== "string") return base;

  const email = request.nextUrl.searchParams.get("email");
  if (!email) {
    return NextResponse.json({ message: "email is required" }, { status: 400 });
  }

  const upstream = await fetch(`${base}/auth/permission?email=${encodeURIComponent(email)}`, {
    method: "GET",
    headers: authenticatedProxyHeaders(request),
    cache: "no-store",
  });

  const data = await upstream.json().catch(() => ({}));
  return NextResponse.json(data, { status: upstream.status });
}
