"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useOrg } from "@/providers/org-provider";
import { runRecurringExpenses } from "@/lib/recurring-expense";

const LAST_RUN_KEY = "ren-tekrarlayan-masraf-son";
const MIN_GAP_MS = 5 * 60_000;
const INTERVAL_MS = 30 * 60_000;

/** Zamanı gelen tekrarlayan masrafları arka planda "ödenecek" olarak oluşturur */
export function RecurringExpenseRunner() {
  const { org, canWrite } = useOrg();
  const qc = useQueryClient();
  const orgId = org?.id;
  const running = React.useRef(false);

  React.useEffect(() => {
    if (!orgId || !canWrite) return;
    let cancelled = false;

    const tick = async () => {
      if (cancelled || running.current || !navigator.onLine || document.visibilityState !== "visible") return;
      try {
        const last = Number(localStorage.getItem(LAST_RUN_KEY) || 0);
        if (Date.now() - last < MIN_GAP_MS) return;
        localStorage.setItem(LAST_RUN_KEY, String(Date.now()));
      } catch {}
      running.current = true;
      try {
        const n = await runRecurringExpenses(orgId);
        if (n > 0) {
          qc.invalidateQueries();
          toast.success("Tekrarlayan masraf", { description: `${n} masraf "Ödenecek" olarak oluşturuldu` });
        }
      } catch (e) {
        console.warn("Tekrarlayan masraflar oluşturulamadı:", e);
      } finally {
        running.current = false;
      }
    };

    const first = setTimeout(tick, 6000);
    const timer = setInterval(tick, INTERVAL_MS);
    const onVisible = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearTimeout(first);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [orgId, canWrite, qc]);

  return null;
}
