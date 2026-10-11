"use client";

import * as React from "react";
import { QueryClient, onlineManager } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { get, set, del } from "idb-keyval";
import { registerMutationDefaults } from "@/lib/data";

/**
 * Sorgu önbelleği IndexedDB'de saklanır: uygulama çevrimdışı açıldığında
 * son görülen veriler ekranda kalır.
 */
const idbStorage = {
  getItem: (key: string) => get<string>(key).then((v) => v ?? null),
  setItem: (key: string, value: string) => set(key, value),
  removeItem: (key: string) => del(key),
};

export const CACHE_BUSTER = "v2";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(() => {
    const qc = new QueryClient({
        defaultOptions: {
          queries: {
            networkMode: "offlineFirst",
            staleTime: 30_000,
            gcTime: 1000 * 60 * 60 * 24 * 7,
            retry: (count, err) => {
              const msg = (err as Error)?.message ?? "";
              if (/JWT|permission|row-level/i.test(msg)) return false;
              return count < 2;
            },
            refetchOnWindowFocus: true,
          },
          // çevrimdışıyken mutasyon duraklatılır, bağlantı gelince devam eder
          mutations: { networkMode: "online" },
        },
      });
    registerMutationDefaults(qc);
    return qc;
  });

  // Depolama yalnızca tarayıcıda (effect içinde) kullanılır; sunucuda oluşturmak zararsızdır.
  const [persister] = React.useState(() =>
    createAsyncStoragePersister({ storage: idbStorage, key: "ren-query-cache", throttleTime: 1500 }),
  );

  React.useEffect(() => {
    const update = () => onlineManager.setOnline(navigator.onLine);
    update(); // uygulama çevrimdışı açıldıysa hemen yansıt
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={{ persister, buster: CACHE_BUSTER, maxAge: 1000 * 60 * 60 * 24 * 7 }}
      onSuccess={() => client.resumePausedMutations()}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
