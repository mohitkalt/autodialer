"use client";

/** Authenticated chrome: logo, nav links, logout, theme toggle, and background keyed off theme. */
import Link from "next/link";
import ThemeToggle from "@/components/theme-toggle";
import { useTheme } from "@/components/theme-provider";
import LogoutButton from "./logout-button";

export default function ProtectedShell({ children }: { children: React.ReactNode }) {
  const { isDark } = useTheme();

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        isDark ? "bg-zinc-950 text-zinc-100" : "bg-zinc-100 text-zinc-900"
      }`}
    >
      <header
        className={`border-b transition-colors duration-300 ${
          isDark ? "border-zinc-800 bg-zinc-900/80" : "border-zinc-200 bg-white/90"
        }`}
      >
        <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <p className="text-sm font-semibold tracking-wide">Autodialer</p>
          <div className="flex items-center gap-4 text-sm">
            <Link
              className={isDark ? "text-zinc-300 hover:text-white" : "text-zinc-600 hover:text-zinc-900"}
              href="/dashboard"
            >
              Dashboard
            </Link>
            <LogoutButton />
            <ThemeToggle variant="inline" />
          </div>
        </nav>
      </header>
      {children}
    </div>
  );
}
