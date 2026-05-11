"use client";

/**
 * Dashboard: LeadSquared leads, dialer break controls + timer, shift start/end,
 * and sessionStorage persistence for break UI across reloads (same tab).
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Cookies from "js-cookie";
import { readAgentSessionCookies } from "@/lib/auth-cookies";
import { getRtkErrorMessage } from "@/lib/rtk-error-message";
import {
  BreakPolicy,
  LeadRow,
  isShiftActiveFromApi,
  shiftFromActiveShiftResponse,
  useEndBreakMutation,
  useEndShiftMutation,
  useLazyGetActiveShiftQuery,
  useLazyGetDialerConfigQuery,
  useLazyGetLeadsQuery,
  useStartBreakMutation,
  useStartShiftMutation,
} from "@/redux/services/authApi";
import DataTable from "@/components/table/data-table";
import { useTheme } from "@/components/theme-provider";

const LEAD_COLUMNS: Array<{
  key: keyof LeadRow;
  header: string;
  render?: (value: LeadRow[keyof LeadRow]) => React.ReactNode;
}> = [
  { key: "sequence", header: "#" },
  { key: "name", header: "Name" },
  { key: "phone", header: "Phone" },
  { key: "email", header: "Email" },
  { key: "owner_email", header: "Owner" },
  { key: "created_at", header: "Created At" },
  {
    key: "is_dialed",
    header: "Dialed",
    render: (value) => ((value as LeadRow["is_dialed"]) ? "Yes" : "No"),
  },
];

const toFriendlyBreakLabel = (value: string) =>
  value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

/** mm:ss from total seconds (non-negative). */
const formatMmSs = (totalSeconds: number) => {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
};

type ActiveBreakState = {
  id: number;
  breakType: string;
  startedAtMs: number;
  allowedSeconds: number;
};

/** Same-tab reload keeps break UI; closing the tab clears it (unlike localStorage). */
const DASHBOARD_BREAK_UI_KEY = "autodialer_dashboard_break_ui_v1";

/** Accepts finite numbers or numeric strings (API / JSON may use strings). */
const parseFiniteInt = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return Math.trunc(n);
  }
  return null;
};

const normalizeActiveBreakFromStorage = (value: unknown): ActiveBreakState | null => {
  if (!value || typeof value !== "object") return null;
  const o = value as Record<string, unknown>;
  const id = parseFiniteInt(o.id);
  const breakType = typeof o.breakType === "string" ? o.breakType : "";
  const startedAtMs =
    typeof o.startedAtMs === "number" && Number.isFinite(o.startedAtMs)
      ? o.startedAtMs
      : (parseFiniteInt(o.startedAtMs) ?? NaN);
  const allowedSeconds =
    typeof o.allowedSeconds === "number" && Number.isFinite(o.allowedSeconds)
      ? o.allowedSeconds
      : (parseFiniteInt(o.allowedSeconds) ?? NaN);
  if (id === null || !breakType || !Number.isFinite(startedAtMs) || !Number.isFinite(allowedSeconds)) {
    return null;
  }
  return { id, breakType, startedAtMs, allowedSeconds };
};

type BreakEntryLike = {
  id?: unknown;
  started_at?: string;
  break_type?: string;
};

/** Neutral outline style shared by Update Break and shift toggles. */
function toolbarOutlineNeutral(isDark: boolean): string {
  return `rounded-md border px-3 py-2 text-xs ${
    isDark ? "border-zinc-700 text-zinc-200 hover:bg-zinc-800" : "border-zinc-300 text-zinc-800 hover:bg-zinc-100"
  }`;
}

/** Accent outline for the explicit End break control. */
function toolbarOutlineRose(isDark: boolean): string {
  return `rounded-md border px-3 py-2 text-xs ${
    isDark ? "border-rose-800/80 text-rose-100 hover:bg-rose-950/50" : "border-rose-300 text-rose-900 hover:bg-rose-50"
  }`;
}

/** Toast border/background for success vs error in dark or light theme. */
function toastVariantClasses(kind: "success" | "error", isDark: boolean): string {
  if (kind === "success") {
    return isDark ? "border-emerald-700 bg-emerald-900/95 text-emerald-100" : "border-emerald-600 bg-emerald-50 text-emerald-900";
  }
  return isDark ? "border-red-700 bg-red-900/95 text-red-100" : "border-red-600 bg-red-50 text-red-900";
}

const readBreakUiFromSession = (): {
  selectedBreakType: string;
  activeBreakId: number | null;
  activeBreak: ActiveBreakState | null;
} | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(DASHBOARD_BREAK_UI_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as unknown;
    if (!data || typeof data !== "object") return null;
    const o = data as Record<string, unknown>;
    const selectedBreakType = typeof o.selectedBreakType === "string" ? o.selectedBreakType : "NOT_ON_BREAK";
    const activeBreakIdParsed = parseFiniteInt(o.activeBreakId);
    const activeBreak = normalizeActiveBreakFromStorage(o.activeBreak);
    let resolvedBreakId = activeBreakIdParsed;
    if (activeBreak && resolvedBreakId == null) resolvedBreakId = activeBreak.id;
    if (activeBreak && resolvedBreakId !== activeBreak.id) resolvedBreakId = activeBreak.id;
    return { selectedBreakType, activeBreakId: resolvedBreakId, activeBreak };
  } catch {
    return null;
  }
};

export default function DashboardPage() {
  const { isDark } = useTheme();
  const [selectedBreakType, setSelectedBreakType] = useState("NOT_ON_BREAK");
  const [activeBreakId, setActiveBreakId] = useState<number | null>(null);
  const [activeShiftId, setActiveShiftId] = useState<number | null>(null);
  const [isShiftActive, setIsShiftActive] = useState(false);
  const [activeBreak, setActiveBreak] = useState<ActiveBreakState | null>(null);
  const [nowMs, setNowMs] = useState(0);
  const breakUiRestoredRef = useRef(false);
  const skipNextBreakUiPersistRef = useRef(true);
  const [toasts, setToasts] = useState<Array<{ id: number; kind: "success" | "error"; message: string }>>([]);
  const [getLeads, { data: leadsResponse }] = useLazyGetLeadsQuery();
  const [getDialerConfig, { data: dialerConfigResponse }] = useLazyGetDialerConfigQuery();
  const [getActiveShift] = useLazyGetActiveShiftQuery();
  const [startBreak, { isLoading: isStartingBreak }] = useStartBreakMutation();
  const [endBreak, { isLoading: isEndingBreak }] = useEndBreakMutation();
  const [startShift, { isLoading: isStartingShift }] = useStartShiftMutation();
  const [endShift, { isLoading: isEndingShift }] = useEndShiftMutation();

  const syncShiftFromServer = useCallback(async () => {
    const { email: agentEmail, accessToken } = readAgentSessionCookies();
    if (!agentEmail) return;
    try {
      const res = await getActiveShift({
        agentEmail,
        accessToken: accessToken || undefined,
      }).unwrap();
      const shift = shiftFromActiveShiftResponse(res);
      if (isShiftActiveFromApi(shift ?? undefined)) {
        setIsShiftActive(true);
        setActiveShiftId(shift!.id);
      } else {
        setIsShiftActive(false);
        setActiveShiftId(null);
      }
    } catch {
      /* keep existing UI state on fetch failure */
    }
  }, [getActiveShift]);

  useEffect(() => {
    const { email, accessToken } = readAgentSessionCookies();

    if (!email) return;

    getLeads({
      leadOwner: email,
      accessToken,
    });
    getDialerConfig({
      accessToken,
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async GET updates shift state when promise settles (not synchronous cascade)
    void syncShiftFromServer();
  }, [getLeads, getDialerConfig, syncShiftFromServer]);

  useLayoutEffect(() => {
    const stored = readBreakUiFromSession();
    breakUiRestoredRef.current = true;
    if (stored) {
      /* eslint-disable react-hooks/set-state-in-effect -- one-time sessionStorage hydration before paint */
      setSelectedBreakType(stored.selectedBreakType);
      setActiveBreakId(stored.activeBreakId);
      setActiveBreak(stored.activeBreak);
      if (stored.activeBreak) setNowMs(Date.now());
      else setNowMs(0);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
    skipNextBreakUiPersistRef.current = true;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !breakUiRestoredRef.current) return;
    if (skipNextBreakUiPersistRef.current) {
      skipNextBreakUiPersistRef.current = false;
      return;
    }
    try {
      window.sessionStorage.setItem(
        DASHBOARD_BREAK_UI_KEY,
        JSON.stringify({
          selectedBreakType,
          activeBreakId,
          activeBreak,
        }),
      );
    } catch {
      /* ignore quota / private mode */
    }
  }, [selectedBreakType, activeBreakId, activeBreak]);

  const leadRows = useMemo(() => leadsResponse?.data ?? [], [leadsResponse]);
  const breakPolicies = dialerConfigResponse?.data?.breakPolicies ?? [];
  const pushToast = (kind: "success" | "error", message: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, kind, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3500);
  };

  useEffect(() => {
    if (!activeBreak) return;
    const interval = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [activeBreak]);

  // Elapsed counts up from 0 toward allowedSeconds; green → yellow → red when over limit.
  const breakTimerDisplay = useMemo(() => {
    if (!activeBreak) return { text: "", tone: "none" as const };
    const clock = nowMs > 0 ? nowMs : activeBreak.startedAtMs;
    const elapsedRaw = Math.floor((clock - activeBreak.startedAtMs) / 1000);
    const elapsed = Math.max(0, elapsedRaw);
    const allowed = Math.max(1, activeBreak.allowedSeconds);
    const label = toFriendlyBreakLabel(activeBreak.breakType);
    const half = allowed * 0.5;

    if (elapsed <= allowed) {
      const text = `${label} ${formatMmSs(elapsed)} / ${formatMmSs(allowed)}`;
      const tone = elapsed <= half ? ("green" as const) : ("yellow" as const);
      return { text, tone };
    }

    const over = elapsed - allowed;
    const text = `${label} ${formatMmSs(allowed)} limit + ${formatMmSs(over)} over`;
    return { text, tone: "red" as const };
  }, [activeBreak, nowMs]);

  const breakTimerClass =
    breakTimerDisplay.tone === "red"
      ? isDark
        ? "border-red-700 bg-red-900/35 text-red-200"
        : "border-red-600 bg-red-50 text-red-900"
      : breakTimerDisplay.tone === "yellow"
        ? isDark
          ? "border-amber-600 bg-amber-900/35 text-amber-200"
          : "border-amber-500 bg-amber-50 text-amber-900"
        : breakTimerDisplay.tone === "green"
          ? isDark
            ? "border-emerald-700 bg-emerald-900/35 text-emerald-200"
            : "border-emerald-600 bg-emerald-50 text-emerald-900"
          : "";

  /** End break anytime (before or after allowed duration). Sends earlyEnd when still inside allowed window. */
  const performEndBreak = async () => {
    const { email: agentEmail, accessToken } = readAgentSessionCookies();

    if (!agentEmail) {
      pushToast("error", "Agent email not found.");
      return;
    }

    const breakIdToEnd = parseFiniteInt(activeBreakId) ?? parseFiniteInt(activeBreak?.id) ?? null;
    if (breakIdToEnd === null) {
      pushToast("error", "No active break found to end.");
      return;
    }

    const clock = nowMs > 0 ? nowMs : (activeBreak?.startedAtMs ?? Date.now());
    const elapsedSec = activeBreak ? Math.max(0, Math.floor((clock - activeBreak.startedAtMs) / 1000)) : 0;
    const allowedSec = activeBreak ? Math.max(1, activeBreak.allowedSeconds) : 0;
    const earlyEnd = Boolean(activeBreak && elapsedSec < allowedSec);

    try {
      const response = await endBreak({
        breakId: breakIdToEnd,
        agentEmail,
        accessToken,
        ...(earlyEnd ? { earlyEnd: true } : {}),
      }).unwrap();
      setActiveBreakId(null);
      setActiveBreak(null);
      setSelectedBreakType("NOT_ON_BREAK");
      setNowMs(0);
      pushToast("success", response.message || "Break ended successfully.");
    } catch (error) {
      pushToast("error", `Failed to end break. ${getRtkErrorMessage(error)}`.trim());
    }
  };

  // Break update button: NOT_ON_BREAK ends break, other values start break.
  const triggerBreakStatus = async () => {
    const { email: agentEmail, accessToken } = readAgentSessionCookies();

    if (!agentEmail) {
      pushToast("error", "Agent email not found.");
      return;
    }

    if (selectedBreakType === "NOT_ON_BREAK") {
      await performEndBreak();
      return;
    }

    const selectedPolicy = breakPolicies.find((policy: BreakPolicy) => policy.break_type === selectedBreakType);
    if (!selectedPolicy) {
      pushToast("error", "Selected break type is not available in current policy list.");
      return;
    }

    try {
      const response = await startBreak({
        agentEmail,
        breakType: selectedPolicy.break_type,
        reason: `${toFriendlyBreakLabel(selectedPolicy.break_type)} break`,
        accessToken,
      }).unwrap();
      const resData = response.data;
      const entry = resData?.breakEntry ?? (resData as { break_entry?: BreakEntryLike } | undefined)?.break_entry;
      const startedAtRaw = entry?.started_at;
      const parsedStart = startedAtRaw ? Date.parse(startedAtRaw) : NaN;
      const startedAtMs = Number.isFinite(parsedStart) ? parsedStart : Date.now();
      const allowedSeconds =
        resData?.allowedSeconds ??
        (resData as { allowed_seconds?: number } | undefined)?.allowed_seconds ??
        selectedPolicy.allowed_seconds;
      const nextBreakId = parseFiniteInt(entry?.id) ?? parseFiniteInt((resData as { id?: unknown } | undefined)?.id);
      const tick = Date.now();
      setActiveBreakId(nextBreakId);
      if (nextBreakId != null) {
        setActiveBreak({
          id: nextBreakId,
          breakType: selectedPolicy.break_type,
          startedAtMs,
          allowedSeconds,
        });
        setNowMs(tick);
      }
      const minutes = Math.floor((response.data?.allowedSeconds ?? selectedPolicy.allowed_seconds) / 60);
      pushToast("success", `${response.message || "Break started successfully"} (${minutes} min allowed).`);
    } catch (error) {
      pushToast("error", `Failed to start break. ${getRtkErrorMessage(error)}`.trim());
    }
  };

  // Shift button toggles start/end shift using the latest known shift id.
  const triggerShiftStatus = async () => {
    const { email: agentEmail, accessToken } = readAgentSessionCookies();
    const agentNum = Cookies.get("auth_user_phone") ?? "7055170328";

    if (!agentEmail) {
      pushToast("error", "Agent email not found.");
      return;
    }

    if (isShiftActive && activeShiftId) {
      try {
        const response = await endShift({
          shiftId: activeShiftId,
          agentEmail,
          accessToken,
        }).unwrap();
        await syncShiftFromServer();
        pushToast("success", response.message || "Shift ended successfully.");
      } catch (error) {
        pushToast("error", `Failed to end shift. ${getRtkErrorMessage(error)}`.trim());
      }
      return;
    }

    try {
      const response = await startShift({
        agentEmail,
        agentNum,
        accessToken,
      }).unwrap();
      await syncShiftFromServer();
      pushToast("success", response.message || "Shift started successfully.");
    } catch (error) {
      pushToast("error", `Failed to start shift. ${getRtkErrorMessage(error)}`.trim());
    }
  };

  return (
    <main className="px-6 py-10">
      <div className="fixed right-4 top-16 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`min-w-[260px] rounded-md border px-3 py-2 text-sm shadow-lg ${toastVariantClasses(toast.kind, isDark)}`}
          >
            {toast.message}
          </div>
        ))}
      </div>
      <section className="mx-auto w-full max-w-6xl">
        <h1 className="text-3xl font-semibold">Dashboard</h1>
        <p className={`mt-2 text-sm ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
          Leads are fetched and displayed below.
        </p>

        <div className="mt-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Leads</h2>
          <div className="flex items-center gap-2">
            {activeBreak && breakTimerDisplay.text && (
              <div className={`rounded-md border px-3 py-2 text-xs font-medium ${breakTimerClass}`}>
                {breakTimerDisplay.text}
              </div>
            )}
            <div className="relative">
              <select
                value={selectedBreakType}
                onChange={(event) => setSelectedBreakType(event.target.value)}
                className={`h-9 min-w-[190px] appearance-none rounded-md border pl-3 pr-10 text-xs outline-none ${
                  isDark ? "border-zinc-700 bg-zinc-900 text-zinc-100" : "border-zinc-300 bg-white text-zinc-900"
                }`}
              >
                <option value="NOT_ON_BREAK">{toFriendlyBreakLabel("NOT_ON_BREAK")}</option>
                {breakPolicies.map((policy: BreakPolicy) => (
                  <option key={policy.id} value={policy.break_type}>
                    {toFriendlyBreakLabel(policy.break_type)} ({Math.floor(policy.allowed_seconds / 60)}m)
                  </option>
                ))}
              </select>
              <svg
                className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 ${
                  isDark ? "text-zinc-300" : "text-zinc-500"
                }`}
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M5 7.5L10 12.5L15 7.5" />
              </svg>
            </div>
            <button
              type="button"
              onClick={triggerBreakStatus}
              className={toolbarOutlineNeutral(isDark)}
              disabled={isStartingBreak || isEndingBreak}
            >
              {isStartingBreak || isEndingBreak ? "Updating..." : "Update Break"}
            </button>
            {activeBreak && (
              <button
                type="button"
                onClick={() => void performEndBreak()}
                className={toolbarOutlineRose(isDark)}
                disabled={isStartingBreak || isEndingBreak}
              >
                {isEndingBreak ? "Ending..." : "End break"}
              </button>
            )}
            <button
              type="button"
              onClick={triggerShiftStatus}
              className={toolbarOutlineNeutral(isDark)}
              disabled={isStartingShift || isEndingShift}
            >
              {isStartingShift || isEndingShift ? "Updating..." : isShiftActive ? "End Shift" : "Start Shift"}
            </button>
          </div>
        </div>

        <div className="mt-4">
          <DataTable<LeadRow>
            title="LeadSquared Leads"
            columns={LEAD_COLUMNS}
            rows={leadRows}
            emptyText="No leads available."
          />
        </div>
      </section>
    </main>
  );
}
