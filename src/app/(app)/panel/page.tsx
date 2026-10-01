"use client";

import * as React from "react";
import { AlertCircle, RotateCw, TrendingUp } from "lucide-react";
import { useOrg } from "@/providers/org-provider";
import { useDashboard } from "@/components/dashboard/use-dashboard";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { PeriodSummary } from "@/components/dashboard/period-summary";
import { SalesChart } from "@/components/dashboard/sales-chart";
import { GrowthHealthBoard } from "@/components/reports/growth-health-board";
import { TurnoverComparisons } from "@/components/dashboard/turnover-comparisons";
import {
  TopProducts,
  BalanceCards,
  RecentActivity,
  UpcomingPaymentsCard,
  CurrencySummary,
  CriticalStock,
} from "@/components/dashboard/widgets";
import { AgendaWidget } from "@/components/dashboard/agenda-widget";
import { ModulesGrid } from "@/components/dashboard/modules-grid";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { triggerLiveRatesRefresh } from "@/lib/rates";
import { Card } from "@/components/ui/card";
import { errorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { DailyBriefingWidget } from "@/components/ai/daily-briefing-widget";

export default function PanelPage() {
  const { org, role } = useOrg();
  const qc = useQueryClient();
  const { data, error, isPending, refetch, isFetching } = useDashboard(org!.id);
  const [manualLoading, setManualLoading] = React.useState(false);
  const hideMoney = role === "staff";

  const handleRefresh = async () => {
    setManualLoading(true);
    try {
      await Promise.allSettled([
        triggerLiveRatesRefresh(),
        refetch(),
        qc.invalidateQueries({ queryKey: ["rates"] }),
        qc.invalidateQueries({ queryKey: ["reminders"] }),
        qc.invalidateQueries({ queryKey: ["period-summary"] }),
        qc.invalidateQueries({ queryKey: ["turnover-comparisons"] }),
      ]);
    } finally {
      setManualLoading(false);
    }
  };

  const isBusy = isFetching || manualLoading;

  // Eksiye düşen stok kontrolü
  const { data: negativeProducts } = useQuery({
    queryKey: ["negative_stock_alert", org?.id],
    enabled: !!org?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, code, stock_qty")
        .eq("org_id", org!.id)
        .eq("is_active", true)
        .eq("track_stock", true)
        .lt("stock_qty", 0);
      if (error) return [];
      return data ?? [];
    },
    refetchInterval: 30000,
  });

  React.useEffect(() => {
    if (negativeProducts && negativeProducts.length > 0) {
      toast.error(`⚠️ Eksiye Düşen Stok Bildirimi (${negativeProducts.length} Ürün)`, {
        description:
          negativeProducts
            .map((p) => `${p.name}: ${p.stock_qty}`)
            .slice(0, 3)
            .join(", ") + (negativeProducts.length > 3 ? "..." : ""),
        id: "negative-stock-toast",
        duration: 9000,
      });
    }
  }, [negativeProducts]);

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
      {/* 1. Başlık Alanı - Pusulam Birebir Tipografi ve İkon Boyutu */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 text-white flex items-center justify-center shadow-soft shrink-0">
            <TrendingUp size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Genel Bakış
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              İşletmenizin anlık durumu
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isBusy}
          className="h-9 gap-1.5 px-3 text-xs font-semibold rounded-xl border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <RotateCw className={cn("size-3.5", isBusy && "animate-spin")} />
          <span className="hidden sm:inline">Yenile</span>
        </Button>
      </div>

      {error && !data && (
        <Card className="flex items-center gap-3 p-4 text-sm text-danger rounded-2xl border-rose-200 bg-rose-50/50">
          <AlertCircle className="size-5 shrink-0" />
          <span className="flex-1">Panel yüklenemedi: {errorMessage(error)}</span>
          <Button size="sm" variant="outline" onClick={() => refetch()} className="rounded-xl">
            Tekrar dene
          </Button>
        </Card>
      )}

      {isPending && !data ? (
        <DashboardSkeleton />
      ) : data ? (
        <>
          {/* REN AI Günlük Sabah Brifingi Banner */}
          {!hideMoney && <DailyBriefingWidget variant="banner" />}

          {/* Dönem Özeti (Özet gizleme/gösterme, Dünün özeti şeridi ve 6 sparkline kartı) */}
          {!hideMoney && <PeriodSummary orgId={org!.id} />}

          {/* 2. Üst 5 KPI Kartı (Pusulam birebir rounded-2xl, gradyanlar ve metrikler) */}
          <KpiCards data={data} hideCash={hideMoney} />

          {/* Dönemsel Ciro Kıyaslamaları */}
          <TurnoverComparisons orgId={org!.id} />

          {/* Büyüme & Sağlık Skorbordu */}
          {!hideMoney && <GrowthHealthBoard orgId={org!.id} variant="dashboard" />}

          {/* 3. Satış Grafiği */}
          <SalesChart data={data} />

          {/* 4. En Çok Satan Ürünler */}
          <TopProducts data={data} />

          {/* 5. Toplam Alacak / Toplam Borç / Net Durum (3 kart) */}
          {!hideMoney && <BalanceCards data={data} />}

          {/* 6. Son Hareketler & Yaklaşan / Geciken Ödemeler (2 sütunlu ızgara) */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <RecentActivity data={data} />
            <UpcomingPaymentsCard data={data} />
          </div>

          {/* 7. Kritik Stok Uyarısı Banner */}
          <CriticalStock data={data} />

          {/* 8. Ajanda (Takvim & Notlar / Hatırlatmalar) */}
          <AgendaWidget />

          {/* 9. Döviz Özeti / Kur Bilgileri */}
          {!hideMoney && <CurrencySummary data={data} />}

          {/* 10. Modüller (Pusulam birebir modül listesi) */}
          <ModulesGrid />
        </>
      ) : null}
    </div>
  );
}
