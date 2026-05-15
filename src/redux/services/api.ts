/**
 * Shared RTK Query API shell: same-origin `/`, credentials, optional Bearer from cookies.
 * Endpoints are injected from `authApi.ts` (login, OTP, permission) and `dialerApi.ts` (leads, dialer, shifts).
 */
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import Cookies from "js-cookie";

export const api = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: "/",
    credentials: "include",
    prepareHeaders: (headers) => {
      const token = Cookies.get("accessToken") ?? Cookies.get("token");

      /* Ignore literal flag cookie `token=true` so OTP JWT (`accessToken`) wins for Bearer. */
      if (token && token !== "true") {
        headers.set("authorization", `Bearer ${token}`);
      }
      headers.set("accept", "application/json");

      return headers;
    },
  }),
  endpoints: () => ({}),
});