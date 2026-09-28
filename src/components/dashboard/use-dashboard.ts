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
      return res;
    },
    refetchInterval: 60_000,
  });
}
