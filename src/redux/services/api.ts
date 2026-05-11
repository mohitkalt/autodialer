/**
 * Shared RTK Query API shell: same-origin base URL, credentials, and Bearer from cookies when present.
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
      const token = Cookies.get("token") ?? Cookies.get("accessToken");

      if (token) {
        headers.set("authorization", `Bearer ${token}`);
      }
      headers.set("accept", "application/json");

      return headers;
    },
  }),
  endpoints: () => ({}),
});