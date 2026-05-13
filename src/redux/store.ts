/** Redux store wiring RTK Query reducer + middleware for `api`. */
// src/redux/store.ts
import { configureStore } from "@reduxjs/toolkit";
import { api } from "./services/api";
import "./services/authApi";
import "./services/dialerApi";

export const store = configureStore({
  reducer: {
    [api.reducerPath]: api.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(api.middleware),
});