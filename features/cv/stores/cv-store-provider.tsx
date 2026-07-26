"use client";

import { createContext, type ReactNode, useContext, useRef } from "react";
import { useStore } from "zustand";
import {
  type CvState,
  type CvStore,
  type CvStoreInit,
  createCvStore,
} from "@/features/cv/stores/cv-store";

const CvStoreContext = createContext<CvStore | null>(null);

/**
 * Provides a per-request CV store seeded with SSR data. Created once via a ref
 * so it survives client re-renders; born holding the data so the first paint
 * already renders the real CV.
 */
export function CvStoreProvider({
  init,
  children,
}: {
  init: CvStoreInit;
  children: ReactNode;
}) {
  const storeRef = useRef<CvStore | null>(null);
  if (storeRef.current === null) {
    storeRef.current = createCvStore(init);
  }

  return (
    <CvStoreContext.Provider value={storeRef.current}>
      {children}
    </CvStoreContext.Provider>
  );
}

/** Reads from the request-scoped CV store. Must be used under the provider. */
export function useCvStore<T>(selector: (state: CvState) => T): T {
  const store = useContext(CvStoreContext);
  if (!store) {
    throw new Error("useCvStore must be used within a CvStoreProvider");
  }
  return useStore(store, selector);
}

/** Returns the store api for imperative access (getState/setState/subscribe). */
export function useCvStoreApi(): CvStore {
  const store = useContext(CvStoreContext);
  if (!store) {
    throw new Error("useCvStoreApi must be used within a CvStoreProvider");
  }
  return store;
}
