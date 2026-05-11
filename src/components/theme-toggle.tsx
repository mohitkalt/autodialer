"use client";

/** Pill button toggling dark/light theme — placement controlled via `variant`. */
import { useTheme } from "@/components/theme-provider";

type ThemeToggleProps = {
  /** Login uses fixed corner placement; nav uses inline. */
  variant?: "corner" | "inline";
};

export default function ThemeToggle({ variant = "inline" }: ThemeToggleProps) {
  const { isDark, toggleTheme } = useTheme();

  const base =
    "rounded-full border px-3 py-1 text-xs font-medium transition whitespace-nowrap shrink-0";

  const styles = isDark
    ? "border-zinc-700 bg-zinc-900/80 text-zinc-200 hover:bg-zinc-800"
    : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50";

  const position =
    variant === "corner" ? "absolute right-4 top-4 z-10" : "";

  return (
    <button type="button" onClick={toggleTheme} className={`${base} ${styles} ${position}`}>
      {isDark ? "Light mode" : "Dark mode"}
    </button>
  );
}
