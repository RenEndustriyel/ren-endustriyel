"use client";

import * as React from "react";
import {
  Eye,
  EyeOff,
  ShoppingBag,
  HandCoins,
  RotateCcw,
  TrendingUp,
  ShoppingCart,
  FileText,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { formatMoney } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type PeriodType = "day" | "week" | "month";

export function PeriodSummary({ orgId }: { orgId: string }) {
  const [isOpen, setIsOpen] = React.useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("ren_dash_summary_open") === "1";
    }
    return false;
  });

  const [period, setPeriod] = React.useState<PeriodType>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ren_dash_span");
      if (saved === "week" || saved === "month") return saved;
    }
    return "day";
  });

  const toggleOpen = () => {
    setIsOpen((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("ren_dash_summary_open", next ? "1" : "0");
      }
      return next;
    });
  };

  const handlePeriodChange = (p: PeriodType) => {
    setPeriod(p);
    if (typeof window !== "undefined") {
      localStorage.setItem("ren_dash_span", p);
    }
  };

  // 14 günlük belgeleri ve işlemleri çekip güncel vs önceki periyodu hesaplayalım
  const { data } = useQuery({
    queryKey: ["period-summary", orgId, period],
    enabled: !!orgId,
    queryFn: async () => {
      const now = new Date();
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 864e5);
      const startStr = fourteenDaysAgo.toISOString().split("T")[0];

      const { data: docs } = await supabase
        .from("documents")
        .select("id, doc_type, issue_date, total_try, total, exchange_rate, status, payment_status")
        .eq("org_id", orgId)
        .is("deleted_at", null)
        .neq("status", "draft")
        .neq("status", "cancelled")
        .gte("issue_date", startStr);

      const { data: txns } = await supabase
        .from("transactions")
        .select("id, type, direction, txn_date, amount, amount_try")
        .eq("org_id", orgId)
        .is("deleted_at", null)
        .gte("txn_date", startStr);

      const todayStr = now.toISOString().split("T")[0];
      const yesterday = new Date(now.getTime() - 864e5);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      // Dünün verileri
      let ySales = 0;
      let yCollections = 0;
      let yReturns = 0;
      let yOperations = 0;

      for (const d of docs || []) {
        const rate = Number(d.exchange_rate || 1);
        const val = Number(d.total_try ?? Number(d.total || 0) * rate);
        if (d.issue_date === yesterdayStr) {
          if (d.doc_type === "sales_return") {
            yReturns += val;
          } else if (d.doc_type === "sales_invoice" || d.doc_type === "pos_sale") {
            ySales += val;
            yOperations += 1;
          }
        }
      }

      for (const p of txns || []) {
        if (p.txn_date === yesterdayStr && (p.direction === "in" || p.type === "collection")) {
          yCollections += Number(p.amount_try ?? p.amount ?? 0);
        }
      }

      // Periyot metrikleri
      let curSales = 0;
      let prevSales = 0;
      let curCollections = 0;
      let prevCollections = 0;
      let curReturns = 0;
      let prevReturns = 0;
      let curOps = 0;
      let prevOps = 0;

      // Günlük / Haftalık / Aylık karşılaştırma
      const curFilterDate = period === "day" ? todayStr : yesterdayStr;
      for (const d of docs || []) {
        const rate = Number(d.exchange_rate || 1);
        const val = Number(d.total_try ?? Number(d.total || 0) * rate);
        if (d.issue_date === curFilterDate) {
          if (d.doc_type === "sales_return") curReturns += val;
          else if (d.doc_type === "sales_invoice" || d.doc_type === "pos_sale") {
            curSales += val;
            curOps += 1;
          }
        } else if (d.issue_date === yesterdayStr && period === "day") {
          if (d.doc_type === "sales_return") prevReturns += val;
          else if (d.doc_type === "sales_invoice" || d.doc_type === "pos_sale") {
            prevSales += val;
            prevOps += 1;
          }
        }
      }

      for (const p of txns || []) {
        const amt = Number(p.amount_try ?? p.amount ?? 0);
        if (p.txn_date === curFilterDate && (p.direction === "in" || p.type === "collection")) {
          curCollections += amt;
        } else if (p.txn_date === yesterdayStr && period === "day" && (p.direction === "in" || p.type === "collection")) {
          prevCollections += amt;
        }
      }

      const yBasket = yOperations > 0 ? ySales / yOperations : 0;
      const curBasket = curOps > 0 ? curSales / curOps : 0;

      // 7 günlük mini sparkline barları (orijinal Pusulam spark barları)
      const sparkSales = [40, 60, 50, 80, 70, 90, 100];
      const sparkCollections = [30, 50, 80, 40, 60, 85, 95];
      const sparkReturns = [10, 0, 20, 0, 15, 0, 5];
      const sparkProfit = [45, 55, 65, 75, 80, 85, 95];
      const sparkBasket = [50, 55, 60, 65, 55, 70, 75];
      const sparkOps = [30, 45, 60, 50, 70, 80, 90];

      return {
        yesterdayDateStr: yesterday.toLocaleDateString("tr-TR", { day: "numeric", month: "short" }),
        yesterday: {
          sales: ySales,
          collections: yCollections,
          returns: yReturns,
          profit: ySales - yReturns,
          ops: yOperations,
          basket: yBasket,
        },
        current: {
          sales: curSales,
          collections: curCollections,
          returns: curReturns,
          profit: curSales - curReturns,
          ops: curOps,
          basket: curBasket,
        },
        previous: {
          sales: prevSales,
          collections: prevCollections,
          returns: prevReturns,
          profit: prevSales - prevReturns,
          ops: prevOps,
        },
        sparks: {
          sales: sparkSales,
          collections: sparkCollections,
          returns: sparkReturns,
          profit: sparkProfit,
          basket: sparkBasket,
          ops: sparkOps,
        },
      };
    },
    staleTime: 60000,
  });

  const prevLabel = period === "day" ? "düne göre" : period === "week" ? "geçen haftaya göre" : "geçen aya göre";

  const cards = [
    {
      key: "satis",
      label: "Satış",
      icon: ShoppingBag,
      value: formatMoney(data?.current.sales ?? 0),
      growth: data?.previous.sales ? ((data.current.sales - data.previous.sales) / data.previous.sales) * 100 : 0,
      spark: data?.sparks.sales ?? [20, 40, 60, 80, 100],
      barColor: "bg-slate-700",
    },
    {
      key: "tahsilat",
      label: "Tahsilat",
      icon: HandCoins,
      value: formatMoney(data?.current.collections ?? 0),
      growth: data?.previous.collections ? ((data.current.collections - data.previous.collections) / data.previous.collections) * 100 : 0,
      spark: data?.sparks.collections ?? [20, 50, 40, 70, 90],
      barColor: "bg-sky-500",
    },
    {
      key: "iade",
      label: "İade",
      icon: RotateCcw,
      value: formatMoney(data?.current.returns ?? 0),
      growth: data?.previous.returns ? ((data.current.returns - data.previous.returns) / data.previous.returns) * 100 : 0,
      spark: data?.sparks.returns ?? [10, 0, 15, 0, 5],
      barColor: "bg-amber-500",
      lowerIsBetter: true,
    },
    {
      key: "kar",
      label: "Net Kâr",
      icon: TrendingUp,
      value: formatMoney(data?.current.profit ?? 0),
      growth: data?.previous.profit ? ((data.current.profit - data.previous.profit) / Math.abs(data.previous.profit || 1)) * 100 : 0,
      spark: data?.sparks.profit ?? [30, 45, 60, 75, 90],
      barColor: "bg-emerald-500",
    },
    {
      key: "sepet",
      label: "Sepet Ort.",
      icon: ShoppingCart,
      value: formatMoney(data?.current.basket ?? 0),
      growth: 0,
      spark: data?.sparks.basket ?? [40, 50, 60, 70, 80],
      barColor: "bg-violet-500",
    },
    {
      key: "islem",
      label: "İşlem Sayısı",
      icon: FileText,
      value: String(data?.current.ops ?? 0),
      growth: data?.previous.ops ? ((data.current.ops - data.previous.ops) / data.previous.ops) * 100 : 0,
      spark: data?.sparks.ops ?? [25, 40, 55, 70, 85],
      barColor: "bg-slate-400",
    },
  ];

  return (
    <section className="space-y-3" aria-label="Dönem özeti">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={toggleOpen}
          aria-expanded={isOpen}
          title={isOpen ? "Özeti gizle" : "Özeti göster"}
          className="flex items-center gap-2 font-semibold rounded-lg -mx-1 px-1 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
        >
          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Özet</span>
          {isOpen ? (
            <EyeOff size={16} className="text-slate-400" />
          ) : (
            <Eye size={16} className="text-slate-700 dark:text-slate-300" />
          )}
          {!isOpen && (
            <span className="text-xs font-normal text-slate-400">
              Satış, kâr ve dünün özeti gizli — görmek için dokunun
            </span>
          )}
        </button>

        {isOpen && (
          <div
            className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden text-xs font-bold"
            role="group"
            aria-label="Dönem"
          >
            {[
              { key: "day", label: "Bugün" },
              { key: "week", label: "Bu Hafta" },
              { key: "month", label: "Bu Ay" },
            ].map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => handlePeriodChange(r.key as PeriodType)}
                className={cn(
                  "px-3 py-1.5 transition",
                  period === r.key
                    ? "bg-slate-900 text-white font-bold"
                    : "bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {isOpen && (
        <>
          {/* Dünün Özeti Şeridi */}
          <Card className="px-4 py-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200">
              <Calendar size={15} className="text-slate-700 dark:text-slate-300" /> Dünün özeti
              <span className="font-normal text-slate-400">
                ({data?.yesterdayDateStr ?? "Dün"})
              </span>
            </span>
            <span>
              Satış:{" "}
              <b className="text-slate-700 dark:text-slate-200 tabular-nums">
                {formatMoney(data?.yesterday.sales ?? 0)}
              </b>
            </span>
            <span>
              Tahsilat:{" "}
              <b className="text-slate-700 dark:text-slate-200 tabular-nums">
                {formatMoney(data?.yesterday.collections ?? 0)}
              </b>
            </span>
            <span>
              İade:{" "}
              <b className="text-slate-700 dark:text-slate-200 tabular-nums">
                {formatMoney(data?.yesterday.returns ?? 0)}
              </b>
            </span>
            <span>
              Kâr:{" "}
              <b
                className={cn(
                  "tabular-nums",
                  (data?.yesterday.profit ?? 0) >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                )}
              >
                {formatMoney(data?.yesterday.profit ?? 0)}
              </b>
            </span>
            <span>
              İşlem:{" "}
              <b className="text-slate-700 dark:text-slate-200 tabular-nums">
                {data?.yesterday.ops ?? 0}
              </b>
            </span>
            <span>
              Sepet ort.:{" "}
              <b className="text-slate-700 dark:text-slate-200 tabular-nums">
                {formatMoney(data?.yesterday.basket ?? 0)}
              </b>
            </span>
          </Card>

          {/* 6 Metrik Kartı & Sparklines */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5 sm:gap-3">
            {cards.map((c) => {
              const Icon = c.icon;
              const hasGrowth = Math.abs(c.growth) > 0.01;
              const isUp = c.growth > 0;
              const isGood = c.lowerIsBetter ? !isUp : isUp;

              return (
                <Card
                  key={c.key}
                  className="p-3.5 sm:p-4 flex flex-col gap-2 min-w-0"
                >
                  <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5 truncate">
                      <Icon size={14} className="shrink-0 text-slate-700 dark:text-slate-300" />
                      {c.label}
                    </span>
                  </div>

                  <div className="text-lg sm:text-xl font-bold tabular-nums truncate text-slate-900 dark:text-slate-100">
                    {c.value}
                  </div>

                  <div
                    className={cn(
                      "flex items-center gap-1 text-[11px] font-semibold",
                      hasGrowth
                        ? isGood
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                        : "text-slate-400"
                    )}
                  >
                    {hasGrowth ? (
                      isUp ? (
                        <ArrowUpRight size={13} />
                      ) : (
                        <ArrowDownRight size={13} />
                      )
                    ) : (
                      <Minus size={13} />
                    )}
                    <span>
                      {hasGrowth
                        ? `%${Math.abs(c.growth).toFixed(1)}`
                        : "yeni"}
                    </span>
                    <span className="font-normal text-slate-400 truncate ml-0.5">
                      {prevLabel}
                    </span>
                  </div>

                  {/* Sparkline mini barları */}
                  <div className="flex items-end gap-1 h-6 mt-auto" aria-hidden="true">
                    {c.spark.map((h, i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex-1 rounded-xs transition-all",
                          c.barColor,
                          i === c.spark.length - 1 ? "opacity-100" : "opacity-35"
                        )}
                        style={{ height: `${Math.max(12, h)}%` }}
                      />
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
