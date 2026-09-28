"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";

export type Rate = { rate_date: string; currency: string; forex_buying: number | null; forex_selling: number | null };

/** Son TCMB kurları (USD, EUR, ...) — her 1 dakikada bir otomatik güncellenir */
export function useRates() {
  return useQuery({
    queryKey: ["rates"],
    staleTime: 1000 * 60, // 1 dakika
    refetchInterval: 1000 * 60, // her 1 dakikada bir otomatik yenile
    queryFn: async () => {
      const { data, error } = await supabase.from("exchange_rates").select("rate_date, currency, forex_buying, forex_selling").order("rate_date", { ascending: false }).limit(60);
      if (error) throw error;
      const latest: Record<string, Rate> = {};
      for (const r of data as Rate[]) if (!latest[r.currency]) latest[r.currency] = r;
      return latest;
    },
  });
}

/** TCMB canlı kur edge fonksiyonunu tetikler */
export async function triggerLiveRatesRefresh() {
  try {
    const { data, error } = await supabase.functions.invoke("fetch-rates", { body: {} });
    if (error) console.warn("TCMB kur çekme uyarısı:", error);
    return data;
  } catch (e) {
    console.warn("TCMB kur çekme hatası:", e);
    return null;
  }
}

export function rateFor(rates: Record<string, Rate> | undefined, currency: string): number {
  if (currency === "TRY") return 1;
  return Number(rates?.[currency]?.forex_buying ?? 0) || 0;
}
