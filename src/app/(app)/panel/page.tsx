"use client";

import * as React from "react";
import { AlertCircle, RotateCw, TrendingUp } from "lucide-react";
import { useOrg } from "@/providers/org-provider";
import { useDashboard } from "@/components/dashboard/use-dashboard";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { SalesChart } from "@/components/dashboard/sales-chart";
import {
  TopProducts,
  BalanceCards,
  RecentActivity,
  UpcomingPaymentsCard,
  CriticalStock,
  CurrencySummary,
} from "@/components/dashboard/widgets";
import { AgendaWidget } from "@/components/dashboard/agenda-widget";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
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

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
      {/* 1. Başlık Alanı (Pusulam tarzı) */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 text-white shadow-sm">
            <TrendingUp className="size-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text">Genel Bakış</h1>
            <p className="text-xs sm:text-sm text-muted">İşletmenizin anlık durumu</p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isBusy}
          className="gap-1.5 text-xs font-semibold"
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

          {/* 7. Kritik Stok Uyarısı */}
          <CriticalStock data={data} />

          {/* 8. Ajanda (Takvim & Notlar / Hatırlatmalar - Dövizin üstünde) */}
          <AgendaWidget />

          {/* 9. Döviz Özeti / Kur Bilgileri (En altta) */}
          {!hideMoney && <CurrencySummary data={data} />}
        </>
      ) : null}
    </div>
  );
}
