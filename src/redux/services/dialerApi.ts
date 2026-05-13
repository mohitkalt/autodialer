/**
 * Lead / dialer RTK endpoints (same-origin `/api/*` → Next proxies).
 * Auth flows live in `authApi.ts`.
 */
import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
  FetchBaseQueryMeta,
} from "@reduxjs/toolkit/query";
import type { TypedUseLazyQuery } from "@reduxjs/toolkit/query/react";
import { api } from "./api";

type AppBaseQuery = BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError, unknown, FetchBaseQueryMeta>;

type LeadsPayload = {
  accessToken?: string;
  /** Passed through as `?is_dialed=true` / `false` on the upstream leads list. */
  is_dialed: boolean;
};

export type LeadRow = {
  id: number;
  leadsquared_id: string;
  name: string;
  phone: string;
  email: string | null;
  owner_email: string;
  owner_id: string;
  sequence: number;
  is_dialed: boolean;
  created_at: string;
  updated_at: string;
};

type LeadsResponse = {
  statusCode?: number;
  status?: string;
  message?: string;
  /** Upstream may return a bare array or wrap rows (e.g. `{ leads: [...] }`). */
  data?: LeadRow[] | Record<string, unknown> | null;
};

/** Normalize leads API payloads so callers always get an array (never rely on `data` shape alone). */
export function leadsArrayFromResponse(res: LeadsResponse | undefined | null): LeadRow[] {
  const raw = res?.data as unknown;
  if (Array.isArray(raw)) return raw as LeadRow[];
  if (raw != null && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    for (const key of ["leads", "items", "results", "rows", "data"]) {
      const v = o[key];
      if (Array.isArray(v)) return v as LeadRow[];
    }
  }
  return [];
}

export type BreakPolicy = {
  id: number;
  break_type: string;
  allowed_seconds: number;
};

type DialerConfiguration = {
  id: number;
  gap_between_leads_seconds: number;
  updated_by_email: string;
};

export type DialerConfigResponse = {
  statusCode: number;
  status: string;
  message: string;
  data: {
    configuration: DialerConfiguration;
    breakPolicies: BreakPolicy[];
  };
};

type StartBreakPayload = {
  breakType: string;
  reason: string;
  accessToken?: string;
};

type EndBreakPayload = {
  breakId: number;
  accessToken?: string;
  /** When true, request ending before the allowed duration (server must support). */
  earlyEnd?: boolean;
};

type StartShiftPayload = {
  accessToken?: string;
};

type EndShiftPayload = {
  shiftId: number;
  accessToken?: string;
};

type StartBreakResponse = {
  statusCode: number;
  status: string;
  message: string;
  data?: {
    breakEntry?: {
      id: number;
      break_type: string;
      started_at: string;
      ended_at: string | null;
    };
    allowedSeconds?: number;
  };
};

type EndBreakResponse = {
  statusCode: number;
  status: string;
  message: string;
  data?: {
    id: number;
    ended_at: string | null;
  };
};

type StartShiftResponse = {
  statusCode: number;
  status: string;
  message: string;
  data?: {
    shift?: {
      id: number;
      status: string;
      started_at: string;
      ended_at: string | null;
    };
  };
};

type EndShiftResponse = {
  statusCode: number;
  status: string;
  message: string;
  data?: {
    id: number;
    status: string;
    ended_at: string | null;
  };
};

export type ShiftRecord = {
  id: number;
  agent_email?: string;
  started_at?: string;
  ended_at?: string | null;
  status?: string;
  created_at?: string;
  updated_at?: string;
};

/** Active shift GET — identity from bearer / cookies only (no query params). */
export type ActiveShiftQueryPayload = {
  accessToken?: string;
};

/** GET latest shift: `data` is the shift row, or legacy `{ shift: {...} }`. */
export type ActiveShiftResponse = {
  statusCode: number;
  status: string;
  message: string;
  data?: ShiftRecord | { shift?: ShiftRecord | null } | null;
};

/** Normalize active-shift API payloads (flat `data` vs nested `data.shift`). */
export function shiftFromActiveShiftResponse(res: ActiveShiftResponse): ShiftRecord | null {
  const d = res.data;
  if (d == null || typeof d !== "object") return null;
  const o = d as Record<string, unknown>;
  if ("shift" in o && o.shift != null && typeof o.shift === "object") {
    return o.shift as ShiftRecord;
  }
  if ("id" in o && typeof o.id === "number") {
    return d as ShiftRecord;
  }
  return null;
}

/** True when API indicates an in-progress shift (ACTIVE + not ended). */
export const isShiftActiveFromApi = (shift: ShiftRecord | null | undefined): boolean => {
  if (!shift || shift.id == null) return false;
  if (shift.ended_at != null && shift.ended_at !== "") return false;
  const st = (shift.status ?? "").toUpperCase();
  return st === "ACTIVE";
};

/** Latest dialer call row returned with the lead snapshot (GET `/lead-dialer/last-call`). */
export type LastCallRecord = {
  id: number;
  exotel_call_sid: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  recording_url: string | null;
  duration_seconds: number;
};

export type LastCallLeadSnapshot = Pick<
  LeadRow,
  | "id"
  | "leadsquared_id"
  | "name"
  | "phone"
  | "email"
  | "owner_email"
  | "owner_id"
  | "sequence"
  | "is_dialed"
  | "created_at"
  | "updated_at"
>;

export type LastCallResponse = {
  statusCode?: number;
  status?: string;
  message?: string;
  data?: {
    call: LastCallRecord;
    lead: LastCallLeadSnapshot;
  } | null;
};

export const dialerApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getLeads: builder.query<LeadsResponse, LeadsPayload>({
      query: ({ accessToken, is_dialed }: LeadsPayload) => ({
        url: `/api/vehicle/leadsquared/leads?${new URLSearchParams({ is_dialed: String(is_dialed) })}`,
        headers: accessToken
          ? {
              authorization: `Bearer ${accessToken}`,
            }
          : undefined,
      }),
    }),

    getDialerConfig: builder.query<DialerConfigResponse, { accessToken?: string }>({
      query: ({ accessToken }) => ({
        url: "/api/lead-dialer/config",
        headers: accessToken
          ? {
              authorization: `Bearer ${accessToken}`,
            }
          : undefined,
      }),
    }),

    getActiveShift: builder.query<ActiveShiftResponse, ActiveShiftQueryPayload>({
      query: ({ accessToken }: ActiveShiftQueryPayload) => ({
        url: "/api/lead-dialer/shifts",
        headers: accessToken
          ? {
              authorization: `Bearer ${accessToken}`,
            }
          : undefined,
      }),
    }),

    getLastCall: builder.query<LastCallResponse, { accessToken?: string }>({
      query: ({ accessToken }) => ({
        url: "/api/lead-dialer/last-call",
        headers: accessToken
          ? {
              authorization: `Bearer ${accessToken}`,
            }
          : undefined,
      }),
    }),

    startBreak: builder.mutation<StartBreakResponse, StartBreakPayload>({
      query: (payload: StartBreakPayload) => ({
        url: "/api/lead-dialer/breaks/start",
        method: "POST",
        body: {
          breakType: payload.breakType,
          reason: payload.reason,
        },
        headers: payload.accessToken
          ? {
              authorization: `Bearer ${payload.accessToken}`,
            }
          : undefined,
      }),
    }),

    endBreak: builder.mutation<EndBreakResponse, EndBreakPayload>({
      query: (payload: EndBreakPayload) => ({
        url: `/api/lead-dialer/breaks/${payload.breakId}/end`,
        method: "PATCH",
        body: {
          ...(payload.earlyEnd === true
            ? { earlyEnd: true, early_end: true }
            : {}),
        },
        headers: payload.accessToken
          ? {
              authorization: `Bearer ${payload.accessToken}`,
            }
          : undefined,
      }),
    }),

    startShift: builder.mutation<StartShiftResponse, StartShiftPayload>({
      query: (payload: StartShiftPayload) => ({
        url: "/api/lead-dialer/shifts/start",
        method: "POST",
        body: {},
        headers: payload.accessToken
          ? {
              authorization: `Bearer ${payload.accessToken}`,
            }
          : undefined,
      }),
    }),

    endShift: builder.mutation<EndShiftResponse, EndShiftPayload>({
      query: (payload: EndShiftPayload) => ({
        url: `/api/lead-dialer/shifts/${payload.shiftId}/end`,
        method: "PATCH",
        body: {},
        headers: payload.accessToken
          ? {
              authorization: `Bearer ${payload.accessToken}`,
            }
          : undefined,
      }),
    }),
  }),
});

export const {
  useGetLeadsQuery,
  useLazyGetLeadsQuery,
  useLazyGetDialerConfigQuery,
  useLazyGetLastCallQuery,
  useStartBreakMutation,
  useEndBreakMutation,
  useStartShiftMutation,
  useEndShiftMutation,
} = dialerApi;

/**
 * RTK `injectEndpoints` registers this hook at runtime; some TS configs omit it on the `Api` type.
 */
export const useLazyGetActiveShiftQuery = (
  dialerApi as typeof dialerApi & {
    useLazyGetActiveShiftQuery: TypedUseLazyQuery<
      ActiveShiftResponse,
      ActiveShiftQueryPayload,
      AppBaseQuery
    >;
  }
).useLazyGetActiveShiftQuery;
