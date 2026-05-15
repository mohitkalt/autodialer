/** Redux store + RTK Query middleware. Side-effect imports register `authApi` / `dialerApi` endpoints on `api`. */
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