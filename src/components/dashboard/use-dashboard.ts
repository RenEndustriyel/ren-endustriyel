"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { isoDate } from "@/lib/format";
import type { DashboardSummary } from "./types";

import { reconcileContactAllocations } from "@/lib/reconcile-allocations";

export function useDashboard(orgId: string) {
  return useQuery({
    queryKey: ["dashboard", orgId],
    queryFn: async () => {
      // Önce açık carilerdeki kısmi veya serbest tahsilatları açık belgelere otomatik eşle
      try {
        await reconcileContactAllocations(orgId);
      } catch (err) {
        console.warn("Otomatik tahsilat eşleştirmesi atlandı:", err);
      }

      const { data, error } = await supabase.rpc("dashboard_summary", { p_org: orgId, p_today: isoDate() });
      if (error) throw error;
      const res = data as unknown as DashboardSummary;
      if (res && Array.isArray(res.timeline)) {
        res.timeline = res.timeline.filter((t) => Number(t.amount) > 0.009);
      }
      if (res && Array.isArray(res.recent)) {
        const seenIds = new Set<string>();
        let list = res.recent.filter((item) => {
          if (!item.id) return true;
          if (seenIds.has(item.id)) return false;
          seenIds.add(item.id);
          return true;
        });

        // Masraf ve maaş belgelerini al
        const expenseDocs = list.filter(
          (r) => r.kind === "document" && (r.type === "expense" || r.type === "salary")
        );

        // Belge ile aynı anda otomatik oluşturulan ödeme hareketini listeden çıkar (mükerrerliği önle)
        list = list.filter((r) => {
          if (r.kind !== "transaction" || r.type !== "payment") return true;
          const isDup = expenseDocs.some((d) => {
            const sameDate = d.date === r.date;
            const sameAmt = Math.abs(Number(d.amount)) === Math.abs(Number(r.amount));
            const normDParty = (d.party || "").trim().toLowerCase();
            const normRParty = (r.party || "").trim().toLowerCase();
            const sameParty = !normDParty || !normRParty || normDParty === normRParty;
            return sameDate && sameAmt && sameParty;
          });
          return !isDup;
        });

        res.recent = list;
      }
      return res;
    },
    refetchInterval: 60_000,
  });
}
