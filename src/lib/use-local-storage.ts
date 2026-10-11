"use client";

import * as React from "react";

const EVENT = "ren-local-storage";

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** localStorage değeri — sunucuda ve ilk hidrasyonda null, sonra gerçek değer; sekmeler arası senkron. */
export function useLocalStorage(key: string): [string | null, (value: string | null) => void] {
  const value = React.useSyncExternalStore(
    (cb) => {
      const onStorage = (e: Event) => {
        if (e instanceof StorageEvent ? e.key === key : (e as CustomEvent).detail === key) cb();
      };
      window.addEventListener("storage", onStorage);
      window.addEventListener(EVENT, onStorage);
      return () => {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener(EVENT, onStorage);
      };
    },
    () => read(key),
    () => null,
  );

  const set = React.useCallback(
    (v: string | null) => {
      try {
        if (v === null) localStorage.removeItem(key);
        else localStorage.setItem(key, v);
      } catch {}
      window.dispatchEvent(new CustomEvent(EVENT, { detail: key }));
    },
    [key],
  );

  return [value, set];
}

/** Tarayıcıda olup olmadığımız (hidrasyon sonrası true) */
export function useIsClient() {
  return React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}
