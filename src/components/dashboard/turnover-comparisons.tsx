"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Layers,
  Sparkles,
  ChevronRight,
  Clock,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { formatMoney } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

export type TurnoverComparisonData = {
  today: number;
  yesterday: number;
  todayGrowth: number;
  todayUp: boolean;

  thisMonth: number;
  lastMonth: number;
  monthGrowth: number;
  monthUp: boolean;

  thisYear: number;
  lastYear: number;
  yearGrowth: number;
  yearUp: boolean;
};

export function useTurnoverComparisons(orgId: string) {
  return useQuery({
    queryKey: ["turnover-comparisons", orgId],
    enabled: !!orgId,
    queryFn: async (): Promise<TurnoverComparisonData> => {
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

      const yestDate = new Date(now);
      yestDate.setDate(now.getDate() - 1);
      const yesterdayStr = `${yestDate.getFullYear()}-${pad(yestDate.getMonth() + 1)}-${pad(yestDate.getDate())}`;

      const thisMonthStart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;

      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthStart = `${lastMonthDate.getFullYear()}-${pad(lastMonthDate.getMonth() + 1)}-01`;
      const lastMonthEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
      const lastMonthEnd = `${lastMonthEndDate.getFullYear()}-${pad(lastMonthEndDate.getMonth() + 1)}-${pad(lastMonthEndDate.getDate())}`;

      const thisYearStart = `${now.getFullYear()}-01-01`;
      const lastYearStart = `${now.getFullYear() - 1}-01-01`;
      const lastYearEnd = `${now.getFullYear() - 1}-12-31`;

      // Belgeleri çek
      const { data: rawDocs, error } = await supabase
        .from("documents")
        .select("doc_type, issue_date, total, total_try, exchange_rate")
        .eq("org_id", orgId)
        .is("deleted_at", null)
        .neq("status", "draft")
        .neq("status", "cancelled")
        .in("doc_type", ["sales_invoice", "pos_sale", "sales_return"])
        .gte("issue_date", lastYearStart);

      if (error) throw error;

      let todaySales = 0;
      let yesterdaySales = 0;
      let thisMonthSales = 0;
      let lastMonthSales = 0;
      let thisYearSales = 0;
      let lastYearSales = 0;

      for (const d of rawDocs || []) {
        const rate = Number(d.exchange_rate || 1);
        const amt = Number(d.total_try ?? Number(d.total || 0) * rate);
        const sgn = d.doc_type === "sales_return" ? -1 : 1;
        const val = amt * sgn;
        const dt = d.issue_date;

        if (dt === todayStr) todaySales += val;
        if (dt === yesterdayStr) yesterdaySales += val;

        if (dt >= thisMonthStart && dt <= todayStr) thisMonthSales += val;
        if (dt >= lastMonthStart && dt <= lastMonthEnd) lastMonthSales += val;

        if (dt >= thisYearStart && dt <= todayStr) thisYearSales += val;
        if (dt >= lastYearStart && dt <= lastYearEnd) lastYearSales += val;
      }

      const calcPct = (curr: number, prev: number) => {
        if (prev > 0) return Math.round(((curr - prev) / prev) * 100);
        if (curr > 0) return 100;
        return 0;
      };

      const todayGrowth = calcPct(todaySales, yesterdaySales);
      const monthGrowth = calcPct(thisMonthSales, lastMonthSales);
      const yearGrowth = calcPct(thisYearSales, lastYearSales);

      return {
        today: Math.max(Math.round(todaySales * 100) / 100, 0),
        yesterday: Math.max(Math.round(yesterdaySales * 100) / 100, 0),
        todayGrowth,
        todayUp: todaySales >= yesterdaySales,

        thisMonth: Math.max(Math.round(thisMonthSales * 100) / 100, 0),
        lastMonth: Math.max(Math.round(lastMonthSales * 100) / 100, 0),
        monthGrowth,
        monthUp: thisMonthSales >= lastMonthSales,

        thisYear: Math.max(Math.round(thisYearSales * 100) / 100, 0),
        lastYear: Math.max(Math.round(lastYearSales * 100) / 100, 0),
        yearGrowth,
        yearUp: thisYearSales >= lastYearSales,
      };
    },
    refetchInterval: 60_000,
  });
}

export function TurnoverComparisons({ orgId }: { orgId: string }) {
  const { data, isLoading } = useTurnoverComparisons(orgId);

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
    );
  }

  const items = [
    {
      title: "BUGÜN / DÜN",
      currentLabel: "Bugün",
      currentValue: data.today,
      previousLabel: "Dün",
      previousValue: data.yesterday,
      growth: data.todayGrowth,
      isUp: data.todayUp,
      icon: Clock,
      gradient: "from-sky-500/10 via-sky-500/5 to-transparent",
      accent: "text-sky-600 dark:text-sky-400",
    },
    {
      title: "BU AY / GEÇEN AY",
      currentLabel: "Bu Ay",
      currentValue: data.thisMonth,
      previousLabel: "Geçen Ay",
      previousValue: data.lastMonth,
      growth: data.monthGrowth,
      isUp: data.monthUp,
      icon: Calendar,
      gradient: "from-emerald-500/10 via-emerald-500/5 to-transparent",
      accent: "text-emerald-600 dark:text-emerald-400",
    },
    {
      title: "BU YIL / GEÇEN YIL",
      currentLabel: "Bu Yıl",
      currentValue: data.thisYear,
      previousLabel: "Geçen Yıl",
      previousValue: data.lastYear,
      growth: data.yearGrowth,
      isUp: data.yearUp,
      icon: Layers,
      gradient: "from-indigo-500/10 via-indigo-500/5 to-transparent",
      accent: "text-indigo-600 dark:text-indigo-400",
    },
  ];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
            <TrendingUp className="size-3.5" />
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-muted">
            DÖNEMSEL CİRO KIYASLAMALARI
          </span>
        </div>
        <Link
          href="/raporlar/buyume-skorboard"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted transition-colors hover:text-primary"
        >
          <span>Tüm trendi gör</span>
          <ChevronRight className="size-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Card
              key={item.title}
              className={cn(
                "group relative overflow-hidden rounded-xl border border-border bg-surface p-3 sm:p-3.5 shadow-2xs transition-all hover:border-primary/50 hover:shadow-xs",
              )}
            >
              {/* Hafif arka plan gradyanı */}
              <div
                className={cn(
                  "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-60 transition-opacity group-hover:opacity-100",
                  item.gradient,
                )}
              />

              {/* Arka plan silik ikon */}
              <Icon className="pointer-events-none absolute -bottom-1.5 -right-1.5 size-12 text-muted/10 transition-transform group-hover:scale-110" />

              <div className="relative flex flex-col justify-between gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted">
                    {item.title}
                  </span>

                  {/* Yüzdelik Kıyaslama Rozeti */}
                  <span
                    className={cn(
                      "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10.5px] font-bold tracking-tight shadow-2xs",
                      item.isUp
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25"
                        : "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/25",
                    )}
                  >
                    {item.isUp ? (
                      <ArrowUpRight className="size-3 stroke-[2.5]" />
                    ) : (
                      <ArrowDownRight className="size-3 stroke-[2.5]" />
                    )}
                    <span>
                      {item.isUp ? "+" : ""}{item.growth}%
                    </span>
                  </span>
                </div>

                <div>
                  <div className="text-base sm:text-lg font-bold tracking-tight text-text tabular-nums leading-tight">
                    {formatMoney(item.currentValue)}
                  </div>
                  <div className="mt-0.5 flex items-center justify-between text-[11px] text-muted">
                    <span>{item.previousLabel}:</span>
                    <strong className="text-text/90 font-medium tabular-nums">
                      {formatMoney(item.previousValue)}
                    </strong>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
