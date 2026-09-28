"use client";

import * as React from "react";
import { toast } from "sonner";

export function ServiceWorkerRegister() {
  React.useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        for (const reg of regs) reg.unregister();
      });
      if ("caches" in window) {
        caches.keys().then((names) => {
          for (const name of names) caches.delete(name);
        });
      }
      return;
    }
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((reg) => {
        reg.addEventListener("updatefound", () => {
          const sw = reg.installing;
          sw?.addEventListener("statechange", () => {
            if (sw.state === "installed" && navigator.serviceWorker.controller) {
              toast("Yeni sürüm hazır", {
                description: "Güncellemek için yenileyin.",
                action: { label: "Yenile", onClick: () => window.location.reload() },
                duration: Infinity,
              });
            }
          });
        });
      })
      .catch(() => {});
  }, []);
  return null;
}
