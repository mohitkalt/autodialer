/**
 * Shared RTK Query API shell: same-origin base URL, credentials, and Bearer from cookies when present.
 * Endpoints are injected from `authApi.ts` (login / permission) and `dialerApi.ts` (leads / dialer / shifts).
 */
// src/redux/services/api.ts
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import Cookies from "js-cookie";

export const api = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: "/",
    credentials: "include",
    prepareHeaders: (headers) => {
      const token = Cookies.get("accessToken") ?? Cookies.get("token");

      if (token && token !== "true") {
        headers.set("authorization", `Bearer ${token}`);
      }
      headers.set("accept", "application/json");

      return headers;
    },
  }),
  endpoints: () => ({}),
});