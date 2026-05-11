"use client";

/** Client boundary that mounts the Redux `<Provider>` with the app store. */
import { ReactNode } from "react";
import { Provider } from "react-redux";
import { store } from "./store";

type ReduxProviderProps = {
  children: ReactNode;
};

export default function ReduxProvider({ children }: ReduxProviderProps) {
  return <Provider store={store}>{children}</Provider>;
}
