"use client";

/** Clears auth cookies and navigates to `/login`. */
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/theme-provider";

const AUTH_COOKIES = [
  "token",
  "accessToken",
  "auth_user_email",
  "refreshToken",
  "refreshTokenID",
  "authSession",
];

export default function LogoutButton() {
  const router = useRouter();
  const { isDark } = useTheme();

  const onLogout = () => {
    AUTH_COOKIES.forEach((cookieName) => {
      Cookies.remove(cookieName);
      Cookies.remove(cookieName, { path: "/" });
    });

    router.replace("/login");
  };

  return (
    <button
      type="button"
      onClick={onLogout}
      className={`cursor-pointer ${isDark ? "hover:text-white" : "hover:text-zinc-900"}`}
    >
      Logout
    </button>
  );
}
