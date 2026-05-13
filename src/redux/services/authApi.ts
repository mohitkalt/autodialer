/**
 * Auth-only RTK endpoints: login, OTP verification, permission.
 * Lead / dialer / shift endpoints: `dialerApi.ts`.
 *
 * @see `./api.ts` — shared `createApi` instance and `fetchBaseQuery`.
 */
import { api } from "./api";

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
  }),
});

export const { useLoginWithEmailMutation, useVerifyOtpMutation, useLazyGetPermissionQuery } = authApi;
