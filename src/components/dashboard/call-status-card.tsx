"use client";

/**
 * Last dialed lead + call duration from GET `/lead-dialer/last-call` (proxied).
 */

import { useEffect } from "react";
import { readAgentSessionCookies } from "@/lib/auth-cookies";
import { useLazyGetLastCallQuery } from "@/redux/services/dialerApi";
import { useTheme } from "@/components/theme-provider";

/** mm:ss from total seconds (non-negative). */
const formatMmSs = (totalSeconds: number) => {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
};

const formatCallStatusLabel = (status: string | undefined) => {
  const raw = (status ?? "").trim();
  if (!raw) return "—";
  return raw
    .replace(/_/g, " ")
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
};

const isFailedCallStatus = (status: string | undefined) => {
  const s = (status ?? "").trim().toLowerCase();
  return s === "failed";
};

function callStatusBadgeClass(rawStatus: string | undefined, isDark: boolean): string {
  const failed = isFailedCallStatus(rawStatus);
  if (failed) {
    return isDark
      ? "rounded-lg border border-red-800/85 bg-red-950/55 px-2.5 py-1 text-xs font-semibold text-red-100 shadow-sm"
      : "rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-800 shadow-sm";
  }
  return isDark
    ? "rounded-lg border border-emerald-800/70 bg-emerald-950/40 px-2.5 py-1 text-xs font-semibold text-emerald-100 shadow-sm"
    : "rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-900 shadow-sm";
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export type CallStatusCardProps = {
  /**
   * Increment from parent when global refresh runs — effect inside the card refetches `/lead-dialer/last-call`.
   */
  refreshToken?: number;
};

export default function CallStatusCard({ refreshToken = 0 }: CallStatusCardProps) {
  const { isDark } = useTheme();
  const [getLastCall, { data: lastCallResponse, isFetching, isError }] = useLazyGetLastCallQuery();

  useEffect(() => {
    const { accessToken } = readAgentSessionCookies();
    if (!accessToken) return;
    void getLastCall({ accessToken });
  }, [getLastCall, refreshToken]);

  const shell = isDark
    ? "rounded-xl border border-zinc-700/90 bg-gradient-to-b from-zinc-900 via-zinc-900 to-zinc-950 shadow-[0_10px_40px_-14px_rgba(0,0,0,0.75)] ring-1 ring-white/[0.06]"
    : "rounded-xl border border-zinc-200/95 bg-gradient-to-b from-white via-zinc-50/95 to-zinc-100 shadow-[0_4px_28px_-10px_rgba(15,23,42,0.14)] ring-1 ring-zinc-900/[0.05]";

  const divider = isDark ? "border-zinc-700/70" : "border-zinc-200/90";

  const labelMuted = isDark ? "text-zinc-500" : "text-zinc-500";
  const labelStrong = isDark ? "text-zinc-400" : "text-zinc-600";
  const valueText = isDark ? "text-zinc-100" : "text-zinc-900";
  const subText = isDark ? "text-zinc-400" : "text-zinc-600";

  const avatarShell = isDark
    ? "bg-zinc-800 text-zinc-200 ring-1 ring-zinc-600/60"
    : "bg-zinc-200/90 text-zinc-700 ring-1 ring-zinc-300/60";

  const payload = lastCallResponse?.data;
  const lead = payload?.lead;
  const call = payload?.call;

  const displayName = lead?.name?.trim() || "—";
  const email = typeof lead?.email === "string" && lead.email.trim() !== "" ? lead.email.trim() : null;
  const phone = lead?.phone?.trim() || "—";
  const durationLabel =
    call != null && typeof call.duration_seconds === "number" ? formatMmSs(call.duration_seconds) : "—";
  const statusLabel = formatCallStatusLabel(call?.status);

  const initials = initialsFromName(displayName === "—" ? "" : displayName);

  const showEmpty = !isFetching && !isError && (payload == null || lead == null || call == null);

  return (
    <section className={`overflow-hidden ${shell}`} aria-label="Last call and duration">
      <div className="grid md:grid-cols-2">
        <div className={`border-b p-4 sm:p-5 md:border-b-0 md:border-r ${divider}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 gap-3">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatarShell}`}
                aria-hidden
              >
                {isFetching ? "…" : initials}
              </div>
              <div className="min-w-0">
                <p className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${labelMuted}`}>
                  Last called lead
                </p>
                <p className={`mt-1 truncate text-base font-semibold tracking-tight ${valueText}`}>
                  {isFetching ? "Loading…" : showEmpty ? "No recent call" : displayName}
                </p>
                {email ? <p className={`mt-0.5 truncate text-xs ${subText}`}>{email}</p> : null}
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-mid gap-1 sm:self-start sm:pt-0">
              <p className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${labelMuted}`}>Status</p>
              {isFetching ? (
                <span
                  className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-semibold tabular-nums ${
                    isDark
                      ? "border-zinc-600 bg-zinc-800/80 text-zinc-300"
                      : "border-zinc-200 bg-zinc-100 text-zinc-600"
                  }`}
                >
                  …
                </span>
              ) : showEmpty ? (
                <span
                  className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                    isDark ? "border-zinc-700 bg-zinc-900/60 text-zinc-400" : "border-zinc-200 bg-zinc-50 text-zinc-500"
                  }`}
                >
                  —
                </span>
              ) : (
                <span className={`inline-flex ${callStatusBadgeClass(call?.status, isDark)}`}>{statusLabel}</span>
              )}
            </div>
          </div>

          <dl className="mt-4 space-y-1">
            <div>
              <dt className={`text-[11px] font-medium ${labelStrong}`}>Phone</dt>
              <dd className={`mt-0.5 text-sm font-semibold tabular-nums ${valueText}`}>
                {isFetching ? "…" : showEmpty ? "—" : phone}
              </dd>
            </div>
          </dl>

          {isError && <p className={`mt-3 text-xs ${labelMuted}`}>Could not load last call.</p>}
        </div>

        <div className={`flex flex-col justify-center p-4 sm:p-5 ${isDark ? "bg-zinc-950/25" : "bg-zinc-50/40"}`}>
          <p className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${labelMuted}`}>Time taken</p>
          <p className={`mt-1.5 font-mono text-3xl font-bold tabular-nums tracking-tight sm:text-4xl ${valueText}`}>
            {isFetching ? "…" : durationLabel}
          </p>
          <p className={`mt-2 max-w-sm text-[11px] leading-snug ${labelMuted}`}>
            {showEmpty && !isFetching
              ? "Complete a call to see duration here."
              : isError
                ? "—"
                : "Call length from the dialer (mm:ss)."}
          </p>
        </div>
      </div>
    </section>
  );
}
