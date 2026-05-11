import Cookies from "js-cookie";

/**
 * Agent identity + bearer token from cookies written after OTP verification.
 * Used by the dashboard when calling proxied `/api/*` routes with optional Authorization.
 */
export function readAgentSessionCookies(): {
  email: string;
  accessToken: string | undefined;
} {
  const email = Cookies.get("auth_user_email") || "";
  const raw = Cookies.get("accessToken") ?? Cookies.get("token") ?? "";
  return { email, accessToken: raw || undefined };
}
