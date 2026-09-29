"use client";

import * as React from "react";
import { AlertCircle, RotateCw, TrendingUp } from "lucide-react";
import { useOrg } from "@/providers/org-provider";
import { useDashboard } from "@/components/dashboard/use-dashboard";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { SalesChart } from "@/components/dashboard/sales-chart";
import { GrowthHealthBoard } from "@/components/reports/growth-health-board";
import { TurnoverComparisons } from "@/components/dashboard/turnover-comparisons";
import {
  TopProducts,
  BalanceCards,
  RecentActivity,
  UpcomingPaymentsCard,
  CurrencySummary,
} from "@/components/dashboard/widgets";
import { AgendaWidget } from "@/components/dashboard/agenda-widget";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { triggerLiveRatesRefresh } from "@/lib/rates";
import { Card } from "@/components/ui/card";
import { errorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

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
      ]);
    } finally {
      setManualLoading(false);
    }
  };

  const isBusy = isFetching || manualLoading;

  // Eksiye düşen stok kontrolü (Kullanıcı isteği: Sadece eksiye düştüğünde bildirim gelsin)
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
        description: negativeProducts.map((p) => `${p.name}: ${p.stock_qty}`).slice(0, 3).join(", ") + (negativeProducts.length > 3 ? "..." : ""),
        id: "negative-stock-toast",
        duration: 9000,
      });
    }
  }, [negativeProducts]);

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4">
      {/* 1. Başlık Alanı */}
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 text-white shadow-2xs">
            <TrendingUp className="size-4.5 text-white" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-text">Genel Bakış</h1>
            <p className="text-[11px] text-muted">İşletmenizin anlık durumu</p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isBusy}
          className="h-8 gap-1.5 px-2.5 text-xs font-semibold"
        >
          <RotateCw className={cn("size-3.5", isBusy && "animate-spin")} />
          <span className="hidden sm:inline">Yenile</span>
        </Button>
      </div>

      {error && !data && (
        <Card className="flex items-center gap-3 p-4 text-sm text-danger">
          <AlertCircle className="size-5 shrink-0" />
          <span className="flex-1">Panel yüklenemedi: {errorMessage(error)}</span>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Tekrar dene
          </Button>
        </Card>
      )}

      {isPending && !data ? (
        <DashboardSkeleton />
      ) : data ? (
        <>
          {/* 2. Üst 5 KPI Kartı (Pusulam renk ve gradyanları ile) */}
          <KpiCards data={data} hideCash={hideMoney} />

          {/* Dönemsel Ciro Kıyaslamaları (Bugün vs Dün, Bu Ay vs Geçen Ay, Bu Yıl vs Geçen Yıl) */}
          <TurnoverComparisons orgId={org!.id} />

          {/* Büyüme & Sağlık Skorbordu (İşletme büyüme, kârlılık ve fiziksel hacim hibrit analizi) */}
          {!hideMoney && <GrowthHealthBoard orgId={org!.id} variant="dashboard" />}

          {/* 3. Satış Grafiği (Tam genişlikte, Pusulam yeşili) */}
          <SalesChart data={data} />

          {/* 4. En Çok Satan Ürünler (Pusulam tarzı 4 sütunlu kart ızgarası) */}
          <TopProducts data={data} />

          {/* 5. Toplam Alacak / Toplam Borç / Net Durum (3 kart) */}
          {!hideMoney && <BalanceCards data={data} />}

          {/* 6. Son Hareketler & Yaklaşan / Geciken Ödemeler (2 sütunlu ızgara) */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <RecentActivity data={data} />
            <UpcomingPaymentsCard data={data} />
          </div>


          {/* 8. Ajanda (Takvim & Notlar / Hatırlatmalar - Dövizin üstünde) */}
          <AgendaWidget />

          {/* 9. Döviz Özeti / Kur Bilgileri (En altta) */}
          {!hideMoney && <CurrencySummary data={data} />}
        </>
      ) : null}
    </div>
  );
}
