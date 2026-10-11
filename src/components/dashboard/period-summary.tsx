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

type PeriodType = "day" | "week" | "month" | "year";

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
      if (saved === "week" || saved === "month" || saved === "year") return saved as PeriodType;
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

  // Belgeleri ve işlemleri çekip güncel vs önceki periyodu hesaplayalım (Hızlı Satış + Satış Faturası)
  const { data } = useQuery({
    queryKey: ["period-summary", orgId, period],
    enabled: !!orgId,
    queryFn: async () => {
      const now = new Date();
      const toIso = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
      };

      const todayStr = toIso(now);
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const yesterdayStr = toIso(yesterday);

      // Periyot tarih aralıkları
      let curStartStr = todayStr;
      let curEndStr = todayStr;
      let prevStartStr = yesterdayStr;
      let prevEndStr = yesterdayStr;
      let queryStartStr = yesterdayStr;
      let prevLabel = "düne göre";

      if (period === "day") {
        curStartStr = todayStr;
        curEndStr = todayStr;
        prevStartStr = yesterdayStr;
        prevEndStr = yesterdayStr;
        prevLabel = "düne göre";
        const d14 = new Date(now);
        d14.setDate(now.getDate() - 14);
        queryStartStr = toIso(d14);
      } else if (period === "week") {
        // Bu Hafta (Pazartesi'den Bugüne) vs Geçen Hafta
        const dayOfWeek = (now.getDay() + 6) % 7; // 0: Pazartesi
        const curWeekStart = new Date(now);
        curWeekStart.setDate(now.getDate() - dayOfWeek);
        curStartStr = toIso(curWeekStart);
        curEndStr = todayStr;

        const prevWeekStart = new Date(curWeekStart);
        prevWeekStart.setDate(curWeekStart.getDate() - 7);
        prevStartStr = toIso(prevWeekStart);
        const prevWeekEnd = new Date(curWeekStart);
        prevWeekEnd.setDate(curWeekStart.getDate() - 1);
        prevEndStr = toIso(prevWeekEnd);

        prevLabel = "geçen haftaya göre";
        const d60 = new Date(now);
        d60.setDate(now.getDate() - 60);
        queryStartStr = toIso(d60);
      } else if (period === "month") {
        // Bu Ay vs Geçen Ay
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        curStartStr = toIso(thisMonthStart);
        curEndStr = todayStr;

        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        prevStartStr = toIso(lastMonthStart);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        prevEndStr = toIso(lastMonthEnd);

        prevLabel = "geçen aya göre";
        const d180 = new Date(now.getFullYear(), now.getMonth() - 7, 1);
        queryStartStr = toIso(d180);
      } else if (period === "year") {
        // Bu Yıl vs Geçen Yıl
        curStartStr = `${now.getFullYear()}-01-01`;
        curEndStr = todayStr;

        prevStartStr = `${now.getFullYear() - 1}-01-01`;
        prevEndStr = `${now.getFullYear() - 1}-12-31`;

        prevLabel = "geçen yıla göre";
        queryStartStr = prevStartStr;
      }

      const { data: docs } = await supabase
        .from("documents")
        .select("id, doc_type, issue_date, total_try, total, exchange_rate, status, payment_status")
        .eq("org_id", orgId)
        .is("deleted_at", null)
        .neq("status", "draft")
        .neq("status", "cancelled")
        .gte("issue_date", queryStartStr)
        .limit(30000);

      const { data: txns } = await supabase
        .from("transactions")
        .select("id, type, direction, txn_date, amount, amount_try")
        .eq("org_id", orgId)
        .is("deleted_at", null)
        .gte("txn_date", queryStartStr)
        .limit(30000);

      // Dünün verileri (üst şerit için)
      let ySales = 0;
      let yCollections = 0;
      let yReturns = 0;
      let yOperations = 0;

      // Seçili periyot (gün, hafta, ay, yıl)
      let curSales = 0;
      let prevSales = 0;
      let curCollections = 0;
      let prevCollections = 0;
      let curReturns = 0;
      let prevReturns = 0;
      let curOps = 0;
      let prevOps = 0;

      for (const d of docs || []) {
        const rate = Number(d.exchange_rate || 1);
        const val = Number(d.total_try ?? Number(d.total || 0) * rate);
        const dt = d.issue_date ?? "";
        const isSale = d.doc_type === "sales_invoice" || d.doc_type === "pos_sale" || d.doc_type === "pos";
        const isReturn = d.doc_type === "sales_return";

        if (dt === yesterdayStr) {
          if (isReturn) yReturns += val;
          else if (isSale) {
            ySales += val;
            yOperations += 1;
          }
        }

        if (dt >= curStartStr && dt <= curEndStr) {
          if (isReturn) curReturns += val;
          else if (isSale) {
            curSales += val;
            curOps += 1;
          }
        } else if (dt >= prevStartStr && dt <= prevEndStr) {
          if (isReturn) prevReturns += val;
          else if (isSale) {
            prevSales += val;
            prevOps += 1;
          }
        }
      }

      for (const p of txns || []) {
        const amt = Number(p.amount_try ?? p.amount ?? 0);
        const dt = p.txn_date ?? "";
        const isCollection = p.direction === "in" || p.type === "collection" || p.type === "other_income";

        if (dt === yesterdayStr && isCollection) {
          yCollections += amt;
        }

        if (dt >= curStartStr && dt <= curEndStr && isCollection) {
          curCollections += amt;
        } else if (dt >= prevStartStr && dt <= prevEndStr && isCollection) {
          prevCollections += amt;
        }
      }

      const yBasket = yOperations > 0 ? ySales / yOperations : 0;
      const curBasket = curOps > 0 ? curSales / curOps : 0;
      const prevBasket = prevOps > 0 ? prevSales / prevOps : 0;

      // 7 adımlı dinamik sparkline serisi
      const sparkBuckets: Array<{ sales: number; collections: number; returns: number; ops: number }> = [];
      for (let i = 6; i >= 0; i--) {
        let bStart = "";
        let bEnd = "";

        if (period === "day") {
          const d = new Date(now);
          d.setDate(now.getDate() - i);
          bStart = toIso(d);
          bEnd = bStart;
        } else if (period === "week") {
          const dEnd = new Date(now);
          dEnd.setDate(now.getDate() - i * 7);
          const dStart = new Date(dEnd);
          dStart.setDate(dEnd.getDate() - 6);
          bStart = toIso(dStart);
          bEnd = toIso(dEnd);
        } else if (period === "month") {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          bStart = toIso(d);
          const dEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
          bEnd = toIso(dEnd);
        } else {
          // Year: Son 7 ayın dağılımı
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          bStart = toIso(d);
          const dEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
          bEnd = toIso(dEnd);
        }

        let bSales = 0;
        let bReturns = 0;
        let bOps = 0;
        for (const d of docs || []) {
          const dt = d.issue_date ?? "";
          if (dt >= bStart && dt <= bEnd) {
            const rate = Number(d.exchange_rate || 1);
            const val = Number(d.total_try ?? Number(d.total || 0) * rate);
            if (d.doc_type === "sales_return") bReturns += val;
            else if (d.doc_type === "sales_invoice" || d.doc_type === "pos_sale" || d.doc_type === "pos") {
              bSales += val;
              bOps += 1;
            }
          }
        }

        let bColls = 0;
        for (const p of txns || []) {
          const dt = p.txn_date ?? "";
          if (dt >= bStart && dt <= bEnd && (p.direction === "in" || p.type === "collection" || p.type === "other_income")) {
            bColls += Number(p.amount_try ?? p.amount ?? 0);
          }
        }

        sparkBuckets.push({ sales: bSales, collections: bColls, returns: bReturns, ops: bOps });
      }

      const normalizeSpark = (arr: number[]) => {
        const max = Math.max(...arr, 1);
        return arr.map((v) => Math.max(12, Math.round((v / max) * 100)));
      };

      const sparkSales = normalizeSpark(sparkBuckets.map((b) => b.sales));
      const sparkCollections = normalizeSpark(sparkBuckets.map((b) => b.collections));
      const sparkReturns = normalizeSpark(sparkBuckets.map((b) => b.returns));
      const sparkProfit = normalizeSpark(sparkBuckets.map((b) => Math.max(0, b.sales - b.returns)));
      const sparkOps = normalizeSpark(sparkBuckets.map((b) => b.ops));
      const sparkBasket = normalizeSpark(sparkBuckets.map((b) => (b.ops > 0 ? b.sales / b.ops : 0)));

      return {
        prevLabel,
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
          basket: prevBasket,
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

  const prevLabel = data?.prevLabel ?? (period === "day" ? "düne göre" : period === "week" ? "geçen haftaya göre" : period === "month" ? "geçen aya göre" : "geçen yıla göre");

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
      growth: data?.previous.basket ? ((data.current.basket - data.previous.basket) / data.previous.basket) * 100 : 0,
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
              { key: "year", label: "Bu Yıl" },
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
