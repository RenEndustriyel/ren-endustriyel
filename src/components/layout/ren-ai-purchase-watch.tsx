"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatMoney } from "@/lib/format";
import { syncPurchaseAlerts, type RenAiDiscrepancy } from "@/lib/ren-ai";
import { useOrg } from "@/providers/org-provider";

const LAST_RUN_KEY = "ren-ai-alis-tarama-son";
const MIN_GAP_MS = 5 * 60_000;
const INTERVAL_MS = 15 * 60_000;

/** Alış kaydedilince hemen denetlenmesi için (belge penceresi çağırır) */
export const requestPurchaseCheck = (docId: string) => window.dispatchEvent(new CustomEvent("ren_ai_scan_request", { detail: { docId } }));

/**
 * Alış faturalarını arka planda denetler: aynı tedarikçiden önceki alışa göre net birim fiyat arttıysa
 * (iskonto unutulmuş/düşmüş ya da fiyat yükselmiş) ekranda uyarır ve Ren AI uyarı listesine yazar.
 * Açılışta, 15 dakikada bir, sekmeye dönünce ve her alış kaydından sonra çalışır.
 */
export function RenAiPurchaseWatch() {
  const { org } = useOrg();
  const router = useRouter();
  const orgId = org?.id;
  const running = React.useRef(false);

  React.useEffect(() => {
    if (!orgId) return;
    let cancelled = false;

    const notify = (added: RenAiDiscrepancy[]) => {
      if (cancelled || !added.length) return;
      const first = added[0];
      const total = added.reduce((s, a) => s + a.totalLoss, 0);
      toast.warning(
        added.length === 1
          ? `Ren AI: ${first.productName} önceki alıştan pahalı`
          : `Ren AI: ${added.length} alış kaleminde fiyat / iskonto farkı`,
        {
          description:
            added.length === 1
              ? `${first.contactName} · önceki net ${formatMoney(first.previousNet, first.currency)} (%${first.previousDiscount} iskonto), şimdi ${formatMoney(first.currentNet, first.currency)} (%${first.currentDiscount} iskonto). Fark: ${formatMoney(first.totalLoss, first.currency)} + KDV`
              : `Toplam fark ${formatMoney(total)} + KDV. İlk kalem: ${first.productName} (${first.contactName})`,
          duration: 30000,
          action: { label: "İncele", onClick: () => router.push("/yapay-zeka?tab=alerts") },
        },
      );
    };

    const run = async (docId?: string) => {
      if (cancelled || !navigator.onLine) return;
      if (!docId) {
        if (running.current || document.visibilityState !== "visible") return;
        try {
          const last = Number(localStorage.getItem(LAST_RUN_KEY) || 0);
          if (Date.now() - last < MIN_GAP_MS) return;
          localStorage.setItem(LAST_RUN_KEY, String(Date.now()));
        } catch {}
        running.current = true;
      }
      try {
        notify(await syncPurchaseAlerts(orgId, { docId }));
      } catch (e) {
        console.warn("Ren AI alış denetimi yapılamadı:", e);
      } finally {
        if (!docId) running.current = false;
      }
    };

    const first = setTimeout(() => run(), 6000);
    const timer = setInterval(() => run(), INTERVAL_MS);
    const onVisible = () => document.visibilityState === "visible" && run();
    const onRequest = (e: Event) => run((e as CustomEvent<{ docId?: string }>).detail?.docId);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("ren_ai_scan_request", onRequest);
    return () => {
      cancelled = true;
      clearTimeout(first);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("ren_ai_scan_request", onRequest);
    };
  }, [orgId, router]);

  return null;
}
