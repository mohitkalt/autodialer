/**
 * RTK Query endpoints for this app. Requests target same-origin `/api/*` route handlers,
 * which proxy to `NEXT_PUBLIC_API_BASE_URL` with FleetOS-style Origin/Referer where needed.
 *
 * @see `src/redux/services/api.ts` — shared `createApi` instance and `fetchBaseQuery`.
 */
// src/redux/services/authApi.ts
import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
  FetchBaseQueryMeta,
} from "@reduxjs/toolkit/query";
import type { TypedUseLazyQuery } from "@reduxjs/toolkit/query/react";
import { api } from "./api";

type AppBaseQuery = BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError, unknown, FetchBaseQueryMeta>;

type LoginPayload = {
  email: string;
  password: string;
};

export type LoginResponse = {
  token?: string;
  phoneNumber?: string;
  mobile?: string;
  number?: string;
  data?: {
    token?: string;
    /** Masked mobile shown on OTP step (e.g. `9******647`). */
    phoneNo?: string;
    phoneNumber?: string;
    mobile?: string;
    number?: string;
  };
};

type VerifyOtpPayload = {
  email: string;
  otp: string;
  token: string;
};

type VerifyOtpResponse = {
  token?: string;
  accessToken?: string;
};

type PermissionPayload = {
  email: string;
  accessToken?: string;
};

type PermissionResponse = {
  message?: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
};

type LeadsPayload = {
  leadOwner: string;
  accessToken?: string;
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
  statusCode: number;
  status: string;
  message: string;
  data: LeadRow[];
};

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
  agentEmail: string;
  breakType: string;
  reason: string;
  accessToken?: string;
};

type EndBreakPayload = {
  breakId: number;
  agentEmail: string;
  accessToken?: string;
  /** When true, request ending before the allowed duration (server must support). */
  earlyEnd?: boolean;
};

type StartShiftPayload = {
  agentEmail: string;
  agentNum: string;
  accessToken?: string;
};

type EndShiftPayload = {
  shiftId: number;
  agentEmail: string;
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

export type ActiveShiftQueryPayload = {
  agentEmail: string;
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

export const authApi = api.injectEndpoints({
  endpoints: (builder) => ({
    loginWithEmail: builder.mutation<LoginResponse, LoginPayload>({
      query: (body: LoginPayload) => ({
        url: "/api/auth/login/email",
        method: "POST",
        body,
      }),
    }),

    verifyOtp: builder.mutation<VerifyOtpResponse, VerifyOtpPayload>({
      query: (body: VerifyOtpPayload) => ({
        url: "/api/auth/verify-otp",
        method: "POST",
        body,
      }),
    }),

    /** Permission/modules gate — reserved for upcoming UI; hook exported as `useLazyGetPermissionQuery`. */
    getPermission: builder.query<PermissionResponse, PermissionPayload>({
      query: ({ email, accessToken }: PermissionPayload) => ({
        url: `/api/auth/permission?email=${encodeURIComponent(email)}`,
        headers: accessToken
          ? {
              authorization: `Bearer ${accessToken}`,
            }
          : undefined,
      }),
    }),

    getLeads: builder.query<LeadsResponse, LeadsPayload>({
      query: ({ leadOwner, accessToken }: LeadsPayload) => ({
        url: `/api/vehicle/leadsquared/leads?leadOwner=${encodeURIComponent(leadOwner)}`,
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
      query: ({ agentEmail, accessToken }: ActiveShiftQueryPayload) => ({
        url: `/api/vehicle/lead-dialer/shifts?agentEmail=${encodeURIComponent(agentEmail)}`,
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
          agentEmail: payload.agentEmail,
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
          agentEmail: payload.agentEmail,
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
        body: {
          agentEmail: payload.agentEmail,
          agentNum: payload.agentNum,
        },
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
        body: {
          agentEmail: payload.agentEmail,
        },
        headers: payload.accessToken
          ? {
              authorization: `Bearer ${payload.accessToken}`,
            }
          : undefined,
      }),
    }),
  }),
});

// Hooks from injected endpoints. Permission lazy query kept for upcoming module gating.
export const {
  useLoginWithEmailMutation,
  useVerifyOtpMutation,
  useLazyGetPermissionQuery,
  useLazyGetLeadsQuery,
  useLazyGetDialerConfigQuery,
  useStartBreakMutation,
  useEndBreakMutation,
  useStartShiftMutation,
  useEndShiftMutation,
} = authApi;

/**
 * RTK `injectEndpoints` registers this hook at runtime; some TS configs omit it on the `Api` type.
 * Assert the merged API so `useLazyGetActiveShiftQuery` is a proper named export for imports.
 */
export const useLazyGetActiveShiftQuery = (
  authApi as typeof authApi & {
    useLazyGetActiveShiftQuery: TypedUseLazyQuery<
      ActiveShiftResponse,
      ActiveShiftQueryPayload,
      AppBaseQuery
    >;
  }
).useLazyGetActiveShiftQuery;