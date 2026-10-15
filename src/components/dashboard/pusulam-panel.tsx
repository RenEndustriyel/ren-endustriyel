"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Area, AreaChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useCiroCompare } from "@/components/reports/turnover";
import {
  ArrowLeftRight,
  CalendarClock,
  ChartColumn,
  CircleHelp,
  Clock,
  DollarSign,
  Eye,
  RefreshCw,
  EyeOff,
  FileText,
  HandCoins,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";
import { useNettedDues, type DueItem } from "./use-netted-dues";
import { useRows } from "@/lib/data";
import { useOrg } from "@/providers/org-provider";
import { criticalStockEnabled } from "@/lib/features";
import { useRates, rateFor, triggerLiveRatesRefresh } from "@/lib/rates";
import { DOC_TYPES, normalizeStatus, statusLabel, statusTone, type DocType } from "@/lib/doc-types";
import { Badge } from "@/components/ui/badge";
import { formatCompact, formatDate, formatMoney, formatNumber, formatQty, isoDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { TYPE_LABELS, type DashboardSummary } from "./types";

// ---------------------------------------------------------------------------
// Sabitler
// ---------------------------------------------------------------------------

const MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const MONTHS_SHORT = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

const SUMMARY_KEY = "ren-panel-ozet-acik";
const HIDE_KEY = "ren-panel-veriler-gizli";

/** Panel "gizli mod": müşteri yanındayken tutarlar ve isimler görünmesin */
const MaskContext = React.createContext(false);
const MASK = "••••••";

function useFmt() {
  const hidden = React.useContext(MaskContext);
  return {
    hidden,
    /** isim gibi hassas metinleri bulanıklaştırır */
    blur: hidden ? "blur-sm select-none" : "",
    formatMoney: (n: number, cur?: string) => (hidden ? `${MASK} TL` : formatMoney(n, cur)),
    formatNumber: (n: number) => (hidden ? MASK : formatNumber(n)),
    formatCompact: (n: number) => (hidden ? "•••" : formatCompact(n)),
  };
}

// ---------------------------------------------------------------------------
// Yardımcılar
// ---------------------------------------------------------------------------

/** "YYYY-MM-DD" → Date (yerel saat) */
const parseDay = (s: string) => {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
};

/** "YYYY-MM-DD" gününü `days` kadar kaydırır */
const shiftDay = (s: string, days: number) => {
  const dt = parseDay(s);
  dt.setDate(dt.getDate() + days);
  return isoDate(dt);
};

const dayDiff = (from: string, to: string) => {
  const [a, b] = [from, to].map((s) => {
    const [y, m, d] = s.slice(0, 10).split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  });
  return Math.round((b - a) / 86400000);
};

const monthRange = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return { from: isoDate(new Date(y, m - 1, 1)), to: isoDate(new Date(y, m, 0)) };
};

const salesUrl = (from: string, to: string) => `/satislar?baslangic=${from}&bitis=${to}`;

/** Kayıt saati (örn. 14:32), tarayıcının saat diliminde */
const clockFmt = new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" });
const formatClock = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : clockFmt.format(d);
};

/** Son hareket satırının gideceği adres */
function recentHref(r: DashboardSummary["recent"][number]): string {
  if (r.kind === "document") {
    const cfg = DOC_TYPES[r.type as DocType];
    return cfg ? `${cfg.base}/detay?id=${r.id}` : "/satislar";
  }
  return "/nakit/hareketler";
}

const METHOD_LABELS: Record<string, string> = {
  cash: "Nakit",
  card: "Kredi kartı",
  credit_card: "Kredi kartı",
  bank: "Havale/EFT",
  bank_transfer: "Havale/EFT",
  transfer: "Havale/EFT",
  note: "Senet",
  other: "Diğer",
  cheque: "Çek",
};

// ---------------------------------------------------------------------------
// Alt bileşenler
// ---------------------------------------------------------------------------

function KpiCard({ href, value, label, gradient, sub }: { href: string; value: number; label: string; gradient: string; sub?: string }) {
  const { formatMoney } = useFmt();
  return (
    <Link
      href={href}
      className={cn(
        "rounded-2xl px-4 py-3 text-white bg-gradient-to-br shadow-soft min-w-0 overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md flex flex-col justify-between",
        gradient,
      )}
    >
      <div>
        <div className="text-lg sm:text-xl font-bold tabular-nums truncate">{formatMoney(value)}</div>
        <div className="text-xs font-medium opacity-90 mt-0.5 truncate">{label}</div>
      </div>
      {sub && (
        <div className="text-[11px] font-semibold opacity-95 mt-1.5 pt-1 border-t border-white/20 truncate">
          {sub}
        </div>
      )}
    </Link>
  );
}

function SummaryStrip({ data }: { data: DashboardSummary | undefined }) {
  const { formatMoney } = useFmt();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    try {
      // Tercih yalnızca bu tarayıcıda saklanır
      if (localStorage.getItem(SUMMARY_KEY) === "1") setOpen(true); // eslint-disable-line react-hooks/set-state-in-effect
    } catch {}
  }, []);

  const toggle = () => {
    setOpen((v) => {
      try {
        localStorage.setItem(SUMMARY_KEY, v ? "0" : "1");
      } catch {}
      return !v;
    });
  };

  const monthSales = Number(data?.kpi?.month_sales) || 0;
  const monthExpenses = Number(data?.kpi?.month_expenses) || 0;
  const yesterday = shiftDay(isoDate(), -1);
  const yesterdaySales = Number(data?.sales_daily?.find((d) => String(d.date).slice(0, 10) === yesterday)?.amount) || 0;

  return (
    <section className="card p-4 space-y-3" aria-label="Dönem özeti">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={toggle}
          className="flex items-center gap-2 font-semibold rounded-lg -mx-1 px-1 hover:text-brand-600"
          title={open ? "Özeti gizle" : "Özeti göster"}
        >
          Özet
          {open ? <EyeOff size={14} className="text-slate-400" /> : <Eye size={14} className="text-slate-400" />}
          {!open && (
            <span className="text-xs font-normal text-slate-400">
              Satış, kâr ve dünün özeti gizli — görmek için dokunun
            </span>
          )}
        </button>
      </div>
      {open && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
          <Link href={salesUrl(monthRange(isoDate().slice(0, 7)).from, isoDate())} className="card p-4 hover:shadow-soft transition">
            <div className="text-xs text-slate-400">Bu ay satış</div>
            <div className="text-lg font-bold tabular-nums mt-0.5">{formatMoney(monthSales)}</div>
          </Link>
          <Link href="/raporlar/gelir-gider" className="card p-4 hover:shadow-soft transition">
            <div className="text-xs text-slate-400">Bu ay kâr (satış − masraf)</div>
            <div
              className={cn(
                "text-lg font-bold tabular-nums mt-0.5",
                monthSales - monthExpenses >= 0 ? "text-emerald-500" : "text-rose-500",
              )}
            >
              {formatMoney(monthSales - monthExpenses)}
            </div>
          </Link>
          <Link href={salesUrl(yesterday, yesterday)} className="card p-4 hover:shadow-soft transition">
            <div className="text-xs text-slate-400">Dün satış</div>
            <div className="text-lg font-bold tabular-nums mt-0.5">{formatMoney(yesterdaySales)}</div>
          </Link>
        </div>
      )}
    </section>
  );
}

type ChartMode = "daily" | "weekly" | "monthly";
type ChartPoint = { label: string; amount: number; from: string; to: string };

function SalesChartCard({ data }: { data: DashboardSummary | undefined }) {
  const { hidden, formatMoney, formatCompact } = useFmt();
  const router = useRouter();
  const [mode, setMode] = React.useState<ChartMode>("daily");
  const compare = useCiroCompare();

  const points = React.useMemo<ChartPoint[]>(() => {
    const daily = (data?.sales_daily ?? []).map((d) => ({ date: String(d.date).slice(0, 10), amount: Number(d.amount) || 0 }));

    if (mode === "daily") {
      return daily.slice(-14).map((d) => {
        const dt = parseDay(d.date);
        return { label: `${dt.getDate()} ${MONTHS_SHORT[dt.getMonth()]}`, amount: d.amount, from: d.date, to: d.date };
      });
    }

    if (mode === "weekly") {
      // Son 30 günü pazartesi başlangıçlı haftalara böl
      const weeks = new Map<string, ChartPoint>();
      for (const d of daily) {
        const dt = parseDay(d.date);
        const monday = new Date(dt);
        monday.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));
        const key = isoDate(monday);
        const w = weeks.get(key) ?? {
          label: `${monday.getDate()} ${MONTHS_SHORT[monday.getMonth()]}`,
          amount: 0,
          from: d.date,
          to: d.date,
        };
        w.amount += d.amount;
        w.to = d.date;
        weeks.set(key, w);
      }
      return [...weeks.values()];
    }

    return (data?.sales_monthly ?? []).map((m) => {
      const ym = String(m.month).slice(0, 7);
      const [y, mm] = ym.split("-").map(Number);
      const { from, to } = monthRange(ym);
      return { label: `${MONTHS_SHORT[mm - 1]} ${String(y).slice(2)}`, amount: Number(m.amount) || 0, from, to };
    });
  }, [mode, data?.sales_daily, data?.sales_monthly]);

  const total = points.reduce((s, p) => s + p.amount, 0);
  const periodLabel = mode === "daily" ? "Son 14 gün" : mode === "weekly" ? "Son 30 gün, haftalık" : "Son 12 ay";

  const openPoint = (p: ChartPoint | undefined) => {
    if (p) router.push(salesUrl(p.from, p.to));
  };

  const modes: { id: ChartMode; label: string }[] = [
    { id: "daily", label: "Günlük" },
    { id: "weekly", label: "Haftalık" },
    { id: "monthly", label: "Aylık" },
  ];

  const [metricView, setMetricView] = React.useState<"average" | "totals">("average");

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="font-semibold flex items-center gap-2">
            <ChartColumn size={17} className="text-brand-500" />
            Satış Grafiği & Ciro Temposu
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {periodLabel} (TL) · Toplam{" "}
            <span className="font-semibold text-brand-600 dark:text-brand-400">{formatMoney(total)}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden text-xs font-bold">
            {modes.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className={cn(
                  "px-3 py-1.5 transition",
                  mode === m.id ? "bg-brand-500 text-white" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
          <Link href="/raporlar/satis" className="text-xs font-semibold text-brand-600 hover:underline">
            Detaylı rapor →
          </Link>
        </div>
      </div>

      {/* Ciro ve Günlük Satış Ortalamaları Seçimi */}
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 p-0.5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMetricView("average")}
            className={cn(
              "px-3 py-1 rounded-md transition flex items-center gap-1.5",
              metricView === "average"
                ? "bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 font-bold shadow-xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200",
            )}
          >
            <span>⚡ Günlük Satış Ortalamaları</span>
          </button>
          <button
            type="button"
            onClick={() => setMetricView("totals")}
            className={cn(
              "px-3 py-1 rounded-md transition flex items-center gap-1.5",
              metricView === "totals"
                ? "bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 font-bold shadow-xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200",
            )}
          >
            <span>📊 Dönem Ciroları</span>
          </button>
        </div>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          {metricView === "average" ? "Günde ortalama yapılan ciro ve tempo" : "Dönem toplamları ve artış/azalış"}
        </span>
      </div>

      {/* Metrik Kartları */}
      {metricView === "average" ? (
        <div className={cn("mb-3 grid grid-cols-2 gap-2 lg:grid-cols-4", hidden && "blur-md select-none")}>
          {/* 1. Bu Ay Günlük Ort. */}
          {compare.dailyAverages && (() => {
            const m = compare.dailyAverages.thisMonth;
            const up = m.change != null && m.change >= 0;
            return (
              <Link
                href={salesUrl(m.from, m.to)}
                className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 transition hover:border-brand-300 dark:border-slate-700 dark:bg-slate-800/40 min-w-0"
                title={`Bu ay ${m.days} günde toplam ${formatMoney(m.totalSales)}`}
              >
                <div className="flex items-center justify-between gap-1 text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                  <span className="truncate">Bu Ay (Günlük Ort.)</span>
                  <span className="text-[10px] text-slate-400 tabular-nums shrink-0">{m.days} gün</span>
                </div>
                <div className="text-base sm:text-lg font-extrabold tabular-nums mt-0.5 text-brand-600 dark:text-brand-400 truncate">
                  {compare.ready ? formatMoney(m.dailyAvg) : "…"}
                  <span className="text-[11px] font-normal text-slate-500 ml-1">/ gün</span>
                </div>
                <div className="text-[11px] text-slate-500 truncate mt-0.5">
                  Toplam: <span className="font-semibold text-slate-700 dark:text-slate-300">{formatMoney(m.totalSales)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs font-semibold">
                  {m.change != null ? (
                    <span className={cn("flex items-center gap-0.5", up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                      <span aria-hidden>{up ? "▲" : "▼"}</span>%{Math.abs(m.change).toFixed(1).replace(".", ",")}
                      <span className="font-normal text-slate-500 dark:text-slate-400 ml-0.5">{m.compLabel}</span>
                    </span>
                  ) : (
                    <span className="text-[11px] font-normal text-slate-400">Karşılaştırma yok</span>
                  )}
                </div>
              </Link>
            );
          })()}

          {/* 2. Geçen Ay Günlük Ort. */}
          {compare.dailyAverages && (() => {
            const lm = compare.dailyAverages.lastMonth;
            return (
              <Link
                href={salesUrl(lm.from, lm.to)}
                className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 transition hover:border-brand-300 dark:border-slate-700 dark:bg-slate-800/40 min-w-0"
                title={`Geçen ay ${lm.days} günde toplam ${formatMoney(lm.totalSales)}`}
              >
                <div className="flex items-center justify-between gap-1 text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                  <span className="truncate">Geçen Ay (Günlük Ort.)</span>
                  <span className="text-[10px] text-slate-400 tabular-nums shrink-0">{lm.days} gün</span>
                </div>
                <div className="text-base sm:text-lg font-extrabold tabular-nums mt-0.5 text-slate-800 dark:text-slate-200 truncate">
                  {compare.ready ? formatMoney(lm.dailyAvg) : "…"}
                  <span className="text-[11px] font-normal text-slate-500 ml-1">/ gün</span>
                </div>
                <div className="text-[11px] text-slate-500 truncate mt-0.5">
                  Toplam: <span className="font-semibold text-slate-700 dark:text-slate-300">{formatMoney(lm.totalSales)}</span>
                </div>
                <div className="mt-1 text-[11px] font-medium text-slate-500 truncate">
                  {lm.compLabel}
                </div>
              </Link>
            );
          })()}

          {/* 3. Bu Hafta Günlük Ort. */}
          {compare.dailyAverages && (() => {
            const w = compare.dailyAverages.thisWeek;
            const up = w.change != null && w.change >= 0;
            return (
              <Link
                href={salesUrl(w.from, w.to)}
                className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 transition hover:border-brand-300 dark:border-slate-700 dark:bg-slate-800/40 min-w-0"
                title={`Bu hafta ${w.days} günde toplam ${formatMoney(w.totalSales)}`}
              >
                <div className="flex items-center justify-between gap-1 text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                  <span className="truncate">Bu Hafta (Günlük Ort.)</span>
                  <span className="text-[10px] text-slate-400 tabular-nums shrink-0">{w.days} gün</span>
                </div>
                <div className="text-base sm:text-lg font-extrabold tabular-nums mt-0.5 text-brand-600 dark:text-brand-400 truncate">
                  {compare.ready ? formatMoney(w.dailyAvg) : "…"}
                  <span className="text-[11px] font-normal text-slate-500 ml-1">/ gün</span>
                </div>
                <div className="text-[11px] text-slate-500 truncate mt-0.5">
                  Toplam: <span className="font-semibold text-slate-700 dark:text-slate-300">{formatMoney(w.totalSales)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs font-semibold">
                  {w.change != null ? (
                    <span className={cn("flex items-center gap-0.5", up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                      <span aria-hidden>{up ? "▲" : "▼"}</span>%{Math.abs(w.change).toFixed(1).replace(".", ",")}
                      <span className="font-normal text-slate-500 dark:text-slate-400 ml-0.5">{w.compLabel}</span>
                    </span>
                  ) : (
                    <span className="text-[11px] font-normal text-slate-400">Karşılaştırma yok</span>
                  )}
                </div>
              </Link>
            );
          })()}

          {/* 4. Geçen Hafta Günlük Ort. */}
          {compare.dailyAverages && (() => {
            const lw = compare.dailyAverages.lastWeek;
            return (
              <Link
                href={salesUrl(lw.from, lw.to)}
                className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 transition hover:border-brand-300 dark:border-slate-700 dark:bg-slate-800/40 min-w-0"
                title={`Geçen hafta 7 günde toplam ${formatMoney(lw.totalSales)}`}
              >
                <div className="flex items-center justify-between gap-1 text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                  <span className="truncate">Geçen Hafta (Günlük Ort.)</span>
                  <span className="text-[10px] text-slate-400 tabular-nums shrink-0">7 gün</span>
                </div>
                <div className="text-base sm:text-lg font-extrabold tabular-nums mt-0.5 text-slate-800 dark:text-slate-200 truncate">
                  {compare.ready ? formatMoney(lw.dailyAvg) : "…"}
                  <span className="text-[11px] font-normal text-slate-500 ml-1">/ gün</span>
                </div>
                <div className="text-[11px] text-slate-500 truncate mt-0.5">
                  Toplam: <span className="font-semibold text-slate-700 dark:text-slate-300">{formatMoney(lw.totalSales)}</span>
                </div>
                <div className="mt-1 text-[11px] font-medium text-slate-500 truncate">
                  {lw.compLabel}
                </div>
              </Link>
            );
          })()}
        </div>
      ) : (
        <div className={cn("mb-3 grid grid-cols-2 gap-2 lg:grid-cols-4", hidden && "blur-md select-none")}>
          {compare.items.map((c) => {
            const up = c.change != null && c.change >= 0;
            return (
              <Link
                key={c.key}
                href="/raporlar"
                className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 transition hover:border-brand-300 dark:border-slate-700 dark:bg-slate-800/40"
                title={`Önceki dönem: ${formatMoney(c.prev)}`}
              >
                <div className="text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">{c.label}</div>
                <div className="text-base font-extrabold tabular-nums">{compare.ready ? formatMoney(c.cur) : "…"}</div>
                <div
                  className={cn(
                    "flex items-center gap-1 text-xs font-semibold",
                    c.change == null ? "text-slate-500" : up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
                  )}
                >
                  {c.change == null ? (
                    "karşılaştırma yok"
                  ) : (
                    <>
                      <span aria-hidden>{up ? "▲" : "▼"}</span>%{Math.abs(c.change).toFixed(1).replace(".", ",")}
                      <span className="truncate font-normal text-slate-500 dark:text-slate-400">{c.vs}</span>
                    </>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Bilgi Akışı Bandı (Smart Insight Flow Bar) */}
      {compare.ready && compare.dailyAverages && (
        <div className={cn("mb-4 rounded-xl border border-brand-200/80 bg-gradient-to-r from-brand-50/80 via-emerald-50/40 to-brand-50/80 dark:border-brand-900/40 dark:from-brand-950/20 dark:via-emerald-950/10 dark:to-brand-950/20 px-3.5 py-2.5 text-xs shadow-xs", hidden && "blur-md select-none")}>
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-500 text-white font-bold shrink-0 shadow-xs">
                ⚡
              </span>
              <div className="text-slate-700 dark:text-slate-300 leading-snug">
                <span className="font-bold text-slate-900 dark:text-white">Satış Temposu & Projeksiyon: </span>
                Bu ay günde ortalama <strong className="text-brand-700 dark:text-brand-300 tabular-nums">{formatMoney(compare.dailyAverages.thisMonth.dailyAvg)}</strong> ciro yapıyorsunuz.
                {compare.dailyAverages.thisMonth.change != null && (
                  <span className={cn("ml-1 font-bold", compare.dailyAverages.thisMonth.change >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                    ({compare.dailyAverages.thisMonth.change >= 0 ? "▲" : "▼"}%{Math.abs(compare.dailyAverages.thisMonth.change).toFixed(1).replace(".", ",")} geçen aya göre)
                  </span>
                )}
                {compare.dailyAverages.thisMonth.projected && (
                  <span className="text-slate-600 dark:text-slate-300 ml-1">
                    · Mevcut tempoyla ay sonu tahmini ciro: <strong className="text-slate-900 dark:text-white tabular-nums">{formatMoney(compare.dailyAverages.thisMonth.projected)}</strong>
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-slate-600 dark:text-slate-400">
                Bugün: <strong className="text-slate-900 dark:text-white tabular-nums">{formatMoney(compare.dailyAverages.today.total)}</strong>
              </span>
              {compare.dailyAverages.today.diffFromMonthAvg != null && (
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[11px] font-bold shadow-xs",
                  compare.dailyAverages.today.diffFromMonthAvg >= 0
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                    : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                )}>
                  {compare.dailyAverages.today.diffFromMonthAvg >= 0 ? "Ortalama üstü 🚀" : "Ortalama altı"}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
      <div className={cn("h-[240px] w-full min-w-0", hidden && "blur-md pointer-events-none select-none")}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={points}
            margin={{ top: 22, right: 16, bottom: 0, left: 0 }}
            onClick={(state) => {
              const idx = Number((state as { activeTooltipIndex?: number | string } | null)?.activeTooltipIndex);
              if (Number.isFinite(idx)) openPoint(points[idx]);
            }}
            className="cursor-pointer"
          >
            <defs>
              <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0f9b8e" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#0f9b8e" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#e2e8f0" strokeOpacity={0.6} strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} minTickGap={12} />
            <YAxis
              tickFormatter={formatCompact}
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              width={62}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ stroke: "#94a3b8", strokeDasharray: "3 3" }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs shadow-lg">
                    <div className="font-semibold mb-0.5">{label}</div>
                    <div className="tabular-nums">Satış: {formatMoney(Number(payload[0].value) || 0)}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Satışları görmek için tıklayın</div>
                  </div>
                ) : null
              }
            />
            <Area
              type="monotone"
              dataKey="amount"
              name="Satış"
              stroke="#0f9b8e"
              strokeWidth={2.5}
              fill="url(#salesFill)"
              fillOpacity={0.6}
              activeDot={{ r: 5, onClick: (_e: unknown, p: unknown) => openPoint((p as { payload?: ChartPoint })?.payload) }}
              dot={{ r: 2.5, fill: "#0f9b8e", strokeWidth: 0 }}
            >
              {/* noktaların üstünde tutar (kısa biçim) */}
              <LabelList
                dataKey="amount"
                position="top"
                offset={8}
                className="fill-slate-600 dark:fill-slate-300"
                style={{ fontSize: 10, fontWeight: 600 }}
                formatter={(v: unknown) => (Number(v) > 0 ? formatCompact(Number(v)) : "")}
              />
            </Area>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

type PendingTab = "quote" | "sales_order" | "purchase_order";
type PendingDoc = {
  id: string;
  doc_type: PendingTab;
  number: string | null;
  issue_date: string;
  status: string;
  total: number;
  total_try: number | null;
  contact: { name: string } | null;
};

const PENDING_TABS: { id: PendingTab; label: string; convertTo: DocType }[] = [
  { id: "quote", label: "Teklifler", convertTo: "sales_invoice" },
  { id: "sales_order", label: "Siparişler", convertTo: "sales_invoice" },
  { id: "purchase_order", label: "Satın alma", convertTo: "purchase_invoice" },
];

/** Faturaya dönüşmeyi bekleyen teklif ve siparişler */
function PendingDocsCard() {
  const { blur, formatMoney } = useFmt();
  // null: kullanıcı seçmedi → içinde belge olan ilk sekme gösterilir
  const [chosen, setTab] = React.useState<PendingTab | null>(null);
  const docs = useRows<PendingDoc>("documents", {
    select: "id, doc_type, number, issue_date, status, total, total_try, contact:contacts(name)",
    params: ["panel_bekleyen"],
    filter: (q) =>
      q.in("doc_type", ["quote", "sales_order", "purchase_order"]).not("status", "in", '("draft","cancelled","converted","rejected")'),
    order: [{ column: "issue_date", ascending: true }],
  });
  const today = isoDate();
  const all = docs.data ?? [];
  const count = (t: PendingTab) => all.filter((d) => d.doc_type === t).length;
  const tab: PendingTab = chosen ?? PENDING_TABS.find((t) => count(t.id) > 0)?.id ?? "quote";
  const rows = all.filter((d) => d.doc_type === tab);
  const total = rows.reduce((s, d) => s + Number(d.total_try ?? d.total ?? 0), 0);
  const cfg = PENDING_TABS.find((t) => t.id === tab)!;
  const age = (d: PendingDoc) => Math.max(0, Math.round((Date.parse(today) - Date.parse(d.issue_date)) / 86400000));

  return (
    <div className="card p-5 flex flex-col h-full min-w-0">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <h2 className="font-semibold flex items-center gap-2">
            <FileText size={17} className="text-violet-500" />
            Bekleyen Teklif & Siparişler
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
            {rows.length} belge · <span className="font-semibold text-brand-700 dark:text-brand-300">{formatMoney(total)}</span>
          </p>
        </div>
        <Link href={DOC_TYPES[tab].base} className="text-xs font-semibold text-brand-600 hover:underline shrink-0">
          Tümü →
        </Link>
      </div>

      <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-semibold mb-2">
        {PENDING_TABS.map((t, i) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "py-1.5 transition",
              i > 0 && "border-l border-slate-300 dark:border-slate-600",
              tab === t.id ? "bg-brand-500 text-white" : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800",
            )}
          >
            {t.label} ({count(t.id)})
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-600 dark:text-slate-300">Bekleyen {cfg.label.toLocaleLowerCase("tr-TR")} yok.</p>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800 overflow-y-auto max-h-[420px] -mx-2">
          {rows.map((d) => {
            const days = age(d);
            return (
              <div key={d.id} className="flex items-center gap-2 px-2 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg">
                <Link href={`${DOC_TYPES[d.doc_type].base}/detay?id=${d.id}`} className="min-w-0 flex-1">
                  <div className={cn("text-sm font-medium truncate", blur)}>{d.contact?.name ?? "Cari seçilmedi"}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 truncate">
                    {d.number ?? "—"} · {formatDate(d.issue_date)} ·{" "}
                    <span className={cn(days > 30 && "font-semibold text-amber-700 dark:text-amber-400")}>{days === 0 ? "bugün" : `${days} gün`}</span>
                  </div>
                  <Badge tone={statusTone(normalizeStatus(d.doc_type, d.status))} className="mt-1">
                    {statusLabel(d.doc_type, d.status)}
                  </Badge>
                </Link>
                <div className="text-right shrink-0">
                  <div className="text-sm font-semibold tabular-nums">{formatMoney(Number(d.total_try ?? d.total ?? 0))}</div>
                  <Link
                    href={`${DOC_TYPES[cfg.convertTo].base}/yeni?kaynak=${d.id}`}
                    className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:underline"
                  >
                    Faturaya çevir →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TopProductsCard({ data }: { data: DashboardSummary | undefined }) {
  const { blur, formatMoney } = useFmt();
  const rows = (data?.top_products ?? []).slice(0, 8);
  if (rows.length === 0) return null;
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">En Çok Satan Ürünler</h2>
        <Link href="/raporlar/satis" className="text-xs font-semibold text-brand-600 hover:underline">
          Tüm rapor →
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {rows.map((p, i) => (
          <Link
            key={p.id}
            href={`/urunler/${p.id}`}
            className="rounded-xl border border-slate-300 dark:border-slate-600 p-3 hover:border-brand-300 dark:hover:border-brand-800 hover:shadow-soft transition"
          >
            <div className="text-[10px] font-bold text-slate-400">#{i + 1}</div>
            <div className={cn("font-semibold text-sm truncate mt-0.5", blur)}>{p.name}</div>
            <div className="text-xs text-slate-500 mt-1">{formatQty(p.quantity)} adet</div>
            <div className="text-sm font-bold text-brand-600 mt-1">{formatMoney(p.amount)}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

type FxCode = "USD" | "EUR";
const FX_SYMBOL: Record<FxCode, string> = { USD: "$", EUR: "€" };

/** Satışları güncel kurla dövize çevirir (panelin en altında) */
function CurrencyCard({ data }: { data: DashboardSummary | undefined }) {
  const { formatMoney, formatNumber } = useFmt();
  const ratesQuery = useRates();
  const [fx, setFx] = React.useState<FxCode>("USD");
  const [amount, setAmount] = React.useState("");
  const [refreshing, setRefreshing] = React.useState(false);

  const rate = rateFor(ratesQuery.data, fx) || Number(data?.rates?.[fx]) || 0;
  const rateDate = ratesQuery.data?.[fx]?.rate_date;
  const sym = FX_SYMBOL[fx];
  const fxText = (tl: number) => (rate > 0 ? `${sym}${formatNumber(tl / rate)}` : "—");

  const today = isoDate();
  const daily = data?.sales_daily ?? [];
  const sumFrom = (from: string) =>
    daily.filter((d) => String(d.date).slice(0, 10) >= from).reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const monthly = data?.sales_monthly ?? [];
  const { from: monthFrom } = monthRange(today.slice(0, 7));
  const weekFrom = shiftDay(today, -6);
  const yearFrom = monthly.length ? monthRange(String(monthly[0].month).slice(0, 7)).from : monthFrom;

  const rows: { label: string; tl: number; href: string }[] = [
    { label: "Bugün satış", tl: sumFrom(today), href: salesUrl(today, today) },
    { label: "Son 7 gün satış", tl: sumFrom(weekFrom), href: salesUrl(weekFrom, today) },
    { label: "Bu ay satış", tl: Number(data?.kpi?.month_sales) || 0, href: salesUrl(monthFrom, today) },
    { label: "Son 12 ay satış", tl: monthly.reduce((s, m) => s + (Number(m.amount) || 0), 0), href: salesUrl(yearFrom, today) },
    { label: "Açık alacak", tl: Number(data?.kpi?.receivable) || 0, href: "/musteriler" },
    { label: "Kasa / Banka", tl: Number(data?.kpi?.cash_bank) || 0, href: "/hesaplar" },
  ];

  // "1.250,50" → 1250.5
  const typed = Number(amount.replace(/\./g, "").replace(",", ".")) || 0;

  const refresh = async () => {
    setRefreshing(true);
    await triggerLiveRatesRefresh();
    await ratesQuery.refetch();
    setRefreshing(false);
  };

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="font-semibold flex items-center gap-2">
            <DollarSign size={17} className="text-blue-500" />
            Döviz — Satışlarım Dövizde
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            TL tutarlar güncel kurla çevrilir
            {rate > 0 && ` · 1${sym} = ${formatNumber(rate)} ₺${rateDate ? ` (${formatDate(rateDate)})` : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden text-xs font-bold">
            {(["USD", "EUR"] as FxCode[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setFx(c)}
                className={cn(
                  "px-3 py-1.5 transition",
                  fx === c ? "bg-brand-500 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800",
                )}
              >
                {FX_SYMBOL[c]} {c}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing}
            className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
            title="Güncel kuru çek"
            aria-label="Güncel kuru çek"
          >
            <RefreshCw size={14} className={cn(refreshing && "animate-spin")} />
          </button>
        </div>
      </div>

      {rate <= 0 ? (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          {fx} kuru bulunamadı. Sağdaki yenile düğmesiyle güncel kuru çekebilirsiniz.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2.5 sm:gap-3">
            {rows.map((r) => (
              <Link
                key={r.label}
                href={r.href}
                className="rounded-xl border border-slate-300 dark:border-slate-600 p-3 hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-soft transition min-w-0"
              >
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{r.label}</div>
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400 tabular-nums truncate mt-0.5">{fxText(r.tl)}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums truncate">{formatMoney(r.tl)}</div>
              </Link>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-600 dark:text-slate-300 font-medium">Çevir:</span>
            <div className="w-40">
              <input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Tutar (TL)"
                className="input tabular-nums"
                aria-label="TL tutar"
              />
            </div>
            <span className="text-slate-500 dark:text-slate-400">TL =</span>
            <span className="font-bold text-blue-600 dark:text-blue-400 tabular-nums">{fxText(typed)}</span>
          </div>
        </>
      )}

      {(Number(data?.currency?.sales_usd) > 0 || Number(data?.currency?.sales_eur) > 0) && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
          Bu ay dövizli kesilen belgeler: ${formatNumber(Number(data?.currency?.sales_usd) || 0)} · €
          {formatNumber(Number(data?.currency?.sales_eur) || 0)}
        </p>
      )}
    </div>
  );
}

function BalanceCards({ data }: { data: DashboardSummary | undefined }) {
  const { formatMoney } = useFmt();
  const receivable = Number(data?.kpi?.receivable) || 0;
  const payable = Number(data?.kpi?.payable) || 0;
  const net = receivable - payable;
  const cls = "card p-5 hover:shadow-soft hover:-translate-y-0.5 transition";
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Link href="/musteriler" className={cls}>
        <div className="text-sm text-slate-500 dark:text-slate-400">Toplam Alacak (Müşteriler)</div>
        <div className="text-2xl font-bold text-emerald-500 mt-1">{formatMoney(receivable)}</div>
      </Link>
      <Link href="/tedarikciler" className={cls}>
        <div className="text-sm text-slate-500 dark:text-slate-400">Toplam Borç (Tedarikçiler)</div>
        <div className="text-2xl font-bold text-rose-500 mt-1">{formatMoney(payable)}</div>
      </Link>
      <Link href="/raporlar/cari-bakiye" className={cls}>
        <div className="text-sm text-slate-500 dark:text-slate-400">Net Durum</div>
        <div className={cn("text-2xl font-bold mt-1", net >= 0 ? "text-brand-500" : "text-rose-500")}>{formatMoney(net)}</div>
      </Link>
    </div>
  );
}

function RecentCard({ data }: { data: DashboardSummary | undefined }) {
  const { blur, formatMoney } = useFmt();
  // Otomatik mahsup kayıtları (kasasız düzeltme çifti) ekranı doldurmasın
  const rows = (data?.recent ?? []).filter((r) => !(r.kind === "transaction" && r.type === "adjustment" && r.method === "other"));
  // Bugünün satış özeti (Pusulam: "Bugün: 1 satış · 2.398,00 TL")
  const today = isoDate();
  const todaySales = rows.filter(
    (r) => r.kind === "document" && (r.type === "sales_invoice" || r.type === "pos_sale") && String(r.date).slice(0, 10) === today,
  );
  const todayAmount = Number(data?.sales_daily?.find((d) => String(d.date).slice(0, 10) === today)?.amount) || 0;
  return (
    <div className="card p-5 h-full min-w-0">
      <h2 className="font-semibold mb-3 flex items-center gap-2">
        <Clock size={17} className="text-brand-500" />
        Son Hareketler
      </h2>
      {todayAmount > 0 && (
        <Link
          href={salesUrl(today, today)}
          className="mb-3 flex flex-wrap gap-1.5"
          aria-label="Bugünün toplamı"
        >
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 self-center mr-1">Bugün:</span>
          <span className="text-xs rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 transition">
            {todaySales.length > 0 ? `${todaySales.length} satış · ` : ""}
            {formatMoney(todayAmount)}
          </span>
        </Link>
      )}
      {rows.length === 0 ? (
        <p className="text-sm text-slate-400 py-6 text-center">Henüz hareket yok.</p>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((r) => {
            const amount = Number(r.amount) || 0;
            const isDoc = r.kind === "document";
            const detail = [formatDate(r.date), r.created_at ? formatClock(r.created_at) : null, r.number, r.method ? METHOD_LABELS[r.method] ?? r.method : null]
              .filter(Boolean)
              .join(" · ");
            return (
              <Link
                key={`${r.kind}-${r.id}`}
                href={recentHref(r)}
                className="flex items-center gap-3 py-2.5 -mx-2 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
              >
                <div
                  className={cn(
                    "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                    isDoc
                      ? "bg-brand-50 dark:bg-brand-900/30 text-brand-500"
                      : "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500",
                  )}
                >
                  {isDoc ? <FileText size={17} /> : <HandCoins size={17} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {TYPE_LABELS[r.type] ?? r.type}
                    {r.party ? <span className={blur}> · {r.party}</span> : ""}
                  </div>
                  <div className="text-xs text-slate-400 truncate">{detail}</div>
                </div>
                <div className={cn("font-semibold text-sm shrink-0", amount >= 0 ? "text-emerald-500" : "text-rose-500")}>
                  {amount >= 0 ? "+" : "-"}
                  {formatMoney(Math.abs(amount))}
                </div>
              </Link>
            );
          })}
        </div>
      )}
      <p className="mt-2 text-[11px] text-slate-400">
        Tahsilat, masraf ve para hareketleri şube bilgisi taşımaz; her şubede görünür.
      </p>
    </div>
  );
}

function DueCard({ flow, items }: { flow: "in" | "out"; items: DueItem[] | undefined }) {
  const { blur, formatMoney } = useFmt();
  const [filterMode, setFilterMode] = React.useState<"all" | "overdue">("all");
  const isIn = flow === "in";
  const rows = items ?? [];
  const total = rows.reduce((s, r) => s + r.amount, 0);
  const overdueItems = rows.filter((r) => r.days_overdue > 0);
  const overdueCount = overdueItems.length;
  const overdueTotal = overdueItems.reduce((s, r) => s + r.amount, 0);
  const accent = isIn ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600/80 dark:text-rose-400/80";
  const today = isoDate();

  const displayRows = filterMode === "overdue" ? overdueItems : rows;

  return (
    <div
      className={cn(
        "card p-5 transition-all shadow-soft",
        isIn
          ? "border-t-2 border-t-emerald-400/70"
          : "border-t-2 border-t-rose-300/80 dark:border-t-rose-800/70",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={cn(
              "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs",
              isIn
                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300"
                : "bg-rose-50 text-rose-500 dark:bg-rose-950/40 dark:text-rose-300/90",
            )}
          >
            <CalendarClock size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-base flex items-center gap-2 truncate">
              {isIn ? "Tahsilatlar (Müşteri Alacakları)" : "Ödemeler (Tedarikçi Borçları)"}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <span>{rows.length} kayıt ·</span>
              <span className={cn("font-bold text-sm tabular-nums", accent)}>{formatMoney(total)}</span>
              {overdueCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-600/90 dark:bg-rose-950/40 dark:text-rose-300/90 border border-rose-200/70 dark:border-rose-900/60">
                  <TriangleAlert size={11} /> {overdueCount} gecikmiş ({formatMoney(overdueTotal)})
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {overdueCount > 0 && (
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden text-xs font-semibold p-0.5 bg-slate-50 dark:bg-slate-800/80">
              <button
                type="button"
                onClick={() => setFilterMode("all")}
                className={cn(
                  "px-2.5 py-1 rounded-md transition",
                  filterMode === "all"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900",
                )}
              >
                Tümü ({rows.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode("overdue")}
                className={cn(
                  "px-2.5 py-1 rounded-md transition flex items-center gap-1",
                  filterMode === "overdue"
                    ? "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 shadow-xs font-bold"
                    : "text-rose-500/90 dark:text-rose-400/90 hover:text-rose-600",
                )}
              >
                <TriangleAlert size={11} />
                Gecikenler ({overdueCount})
              </button>
            </div>
          )}
          <Link
            href={isIn ? "/musteriler" : "/tedarikciler"}
            className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline shrink-0"
          >
            {isIn ? "Müşteriler →" : "Tedarikçiler →"}
          </Link>
        </div>
      </div>

      {!items ? (
        <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">Yükleniyor…</p>
      ) : displayRows.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
          {filterMode === "overdue"
            ? (isIn ? "Gecikmiş tahsilat bulunmuyor. Harika!" : "Gecikmiş ödeme bulunmuyor. Harika!")
            : (isIn ? "Vadesi gelen tahsilat yok." : "Vadesi gelen ödeme yok.")}
        </p>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {displayRows.slice(0, 8).map((t) => {
            const overdue = t.days_overdue > 0;
            const isDueToday = !overdue && t.due === today;
            const daysLeft = t.due ? dayDiff(today, t.due) : null;
            return (
              <Link
                key={t.key}
                href={t.href}
                className={cn(
                  "group flex items-center gap-3 py-2.5 px-2.5 rounded-xl transition my-0.5",
                  overdue
                    ? "bg-rose-50/30 hover:bg-rose-50/70 dark:bg-rose-950/10 dark:hover:bg-rose-950/25 border border-rose-100/80 dark:border-rose-900/30"
                    : isDueToday
                      ? "bg-amber-50/30 hover:bg-amber-50/70 dark:bg-amber-950/10 dark:hover:bg-amber-950/25 border border-amber-100/80 dark:border-amber-900/30"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/50",
                )}
              >
                <div
                  className={cn(
                    "h-9 w-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs",
                    overdue
                      ? "bg-rose-50 text-rose-500 dark:bg-rose-950/40 dark:text-rose-400"
                      : isDueToday
                        ? "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
                        : isIn
                          ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600"
                          : "bg-blue-50 dark:bg-blue-900/30 text-blue-600",
                  )}
                >
                  {overdue ? (
                    <TriangleAlert size={17} />
                  ) : isDueToday ? (
                    <Clock size={17} />
                  ) : t.offset ? (
                    <ArrowLeftRight size={17} />
                  ) : (
                    <CalendarClock size={17} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className={cn(
                      "text-sm font-semibold truncate",
                      blur,
                    )}
                  >
                    {t.title}
                  </div>
                  <div
                    className={cn(
                      "text-xs truncate",
                      overdue
                        ? "text-rose-600/70 dark:text-rose-300/70"
                        : isDueToday
                          ? "text-amber-700/70 dark:text-amber-300/70"
                          : "text-slate-500 dark:text-slate-400",
                    )}
                  >
                    {t.subtitle}
                  </div>
                  {t.offset && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate" title="Aynı carideki alış ve satışlar mahsup edildi">
                      Mahsup: satış {formatMoney(t.offset.receivable)} − alış {formatMoney(t.offset.payable)}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div
                    className={cn(
                      "font-extrabold text-sm tabular-nums",
                      overdue ? "text-rose-600/80 dark:text-rose-400/80" : isDueToday ? "text-amber-600/90 dark:text-amber-400/90" : accent,
                    )}
                  >
                    {formatMoney(t.amount)}
                  </div>
                  {overdue ? (
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-600/90 dark:bg-rose-950/40 dark:text-rose-300/90 border border-rose-200/70 dark:border-rose-900/60">
                      <TriangleAlert size={10} /> {t.days_overdue} gün gecikti
                    </span>
                  ) : isDueToday ? (
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700/90 dark:bg-amber-950/40 dark:text-amber-300/90 border border-amber-200/70 dark:border-amber-900/60">
                      <Clock size={10} /> Bugün vadeli
                    </span>
                  ) : daysLeft !== null && daysLeft > 0 && daysLeft <= 3 ? (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      {daysLeft === 1 ? "Yarın" : `${daysLeft} gün kaldı`}
                    </span>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>
      )}
      <p className="mt-2.5 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/60 pt-2">
        Aynı carideki alış/satış faturaları ve yapılan tahsilat/ödemeler otomatik eşleştirilir; yalnızca net bakiye gösterilir.
      </p>
    </div>
  );
}

function CriticalStockCard({ data }: { data: DashboardSummary | undefined }) {
  const { org } = useOrg();
  const rows = criticalStockEnabled(org?.settings) ? data?.critical_stock ?? [] : [];
  if (rows.length === 0) return null;
  return (
    <div className="card p-5 border-l-4 border-l-amber-400">
      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold mb-3">
        <TriangleAlert size={17} />
        Kritik Stok Uyarısı ({rows.length})
        <Link href="/urunler?filtre=kritik" className="ml-auto text-xs font-medium text-brand-600 hover:underline">
          Tümünü gör →
        </Link>
      </div>
      <div className="flex flex-wrap gap-2">
        {rows.map((p) => (
          <Link
            key={p.id}
            href={`/urunler/${p.id}`}
            className="chip bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:ring-1 hover:ring-amber-400"
          >
            {p.name} · {formatQty(p.stock_qty)} ad
          </Link>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export function PusulamPanel({ data }: { data: DashboardSummary | undefined }) {
  const [helpOpen, setHelpOpen] = React.useState(false);
  const [hidden, setHidden] = React.useState(false);
  React.useEffect(() => {
    try {
      if (localStorage.getItem(HIDE_KEY) === "1") setHidden(true); // eslint-disable-line react-hooks/set-state-in-effect
    } catch {}
  }, []);
  const toggleHidden = () => {
    setHidden((v) => {
      try {
        localStorage.setItem(HIDE_KEY, v ? "0" : "1");
      } catch {}
      return !v;
    });
  };
  const today = isoDate();
  const thisMonth = MONTHS[new Date().getMonth()];
  const { from: monthFrom } = monthRange(today.slice(0, 7));
  const kpi = data?.kpi;
  const { data: dues } = useNettedDues();
  const compare = useCiroCompare();
  const inOverdue = (dues?.incoming ?? []).filter((r) => r.days_overdue > 0);
  const outOverdue = (dues?.outgoing ?? []).filter((r) => r.days_overdue > 0);
  const inOverdueTotal = inOverdue.reduce((s, r) => s + r.amount, 0);
  const outOverdueTotal = outOverdue.reduce((s, r) => s + r.amount, 0);
  const totalOverdueCount = inOverdue.length + outOverdue.length;
  const fmtAlertMoney = (n: number) => (hidden ? "•••••• TL" : formatMoney(n));

  return (
    <MaskContext.Provider value={hidden}>
    <div className="pusulam-panel space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-white flex items-center justify-center shadow-soft">
          <TrendingUp size={22} />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Genel Bakış</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">İşletmenizin anlık durumu</p>
        </div>
        <button
          type="button"
          onClick={toggleHidden}
          className={cn(
            "ml-auto inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition",
            hidden
              ? "border-amber-400 bg-amber-50 text-amber-800 dark:border-amber-600 dark:bg-amber-950/40 dark:text-amber-200"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800",
          )}
          title={hidden ? "Verileri göster" : "Verileri gizle (müşteri yanındayken)"}
          aria-pressed={hidden}
        >
          {hidden ? <Eye size={16} /> : <EyeOff size={16} />}
          <span className="hidden sm:inline">{hidden ? "Verileri göster" : "Verileri gizle"}</span>
        </button>
      </div>

      <SummaryStrip data={data} />

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2.5 sm:gap-3">
        <KpiCard
          href={salesUrl(monthFrom, today)}
          value={Number(kpi?.month_sales) || 0}
          label={`${thisMonth} Cirosu`}
          gradient="from-amber-400 to-amber-500"
          sub={compare.ready && compare.dailyAverages ? `Ort. ${formatMoney(compare.dailyAverages.thisMonth.dailyAvg)} / gün` : undefined}
        />
        <KpiCard
          href="/masraflar"
          value={Number(kpi?.month_expenses) || 0}
          label={`${thisMonth} Masrafları`}
          gradient="from-rose-400 to-rose-500"
        />
        <KpiCard
          href="/nakit/hareketler?donem=bugun&yon=giris"
          value={Number(kpi?.today_collections) || 0}
          label="Bugünkü Tahsilat"
          gradient="from-blue-400 to-blue-500"
        />
        <KpiCard
          href="/hesaplar"
          value={Number(kpi?.cash_bank) || 0}
          label="Kasa / Banka (TL)"
          gradient="from-emerald-400 to-emerald-500"
        />
        <KpiCard
          href="/musteriler"
          value={Number(kpi?.receivable) || 0}
          label="Açık Hesap (Alacak)"
          gradient="from-brand-400 to-brand-600"
        />
      </div>

      {/* Kritik Stok Uyarısı (varsa hemen dikkat çeksin) */}
      <CriticalStockCard data={data} />

      <SalesChartCard data={data} />

      {/* ----------------------------------------------------------------- */}
      {/* TAHSİLATLAR VE ÖDEMELER (Göz Önünde - Vurgulu)                   */}
      {/* ----------------------------------------------------------------- */}
      <section aria-label="Tahsilatlar ve Ödemeler" className="space-y-3">
        {totalOverdueCount > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:px-4 rounded-2xl bg-gradient-to-r from-rose-500/15 via-amber-500/10 to-rose-500/15 border-2 border-rose-300 dark:border-rose-700/60 shadow-soft">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <TriangleAlert size={20} className="animate-bounce" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-slate-900 dark:text-white flex flex-wrap items-center gap-2">
                  <span>Dikkat: Vadesi Geçmiş Kayıtlar Var!</span>
                  {inOverdue.length > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-600 text-white shadow-xs">
                      {inOverdue.length} Tahsilat · {fmtAlertMoney(inOverdueTotal)}
                    </span>
                  )}
                  {outOverdue.length > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-600 text-white shadow-xs">
                      {outOverdue.length} Ödeme · {fmtAlertMoney(outOverdueTotal)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5 truncate">
                  Geciken alacak ve borçlar dikkatten kaçmaması için aşağıda öncelikli olarak listelenmiştir.
                </p>
              </div>
            </div>
            <div className="text-xs font-semibold text-rose-700 dark:text-rose-400 shrink-0">
              Öncelikli Takip Gerekli
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DueCard flow="in" items={dues?.incoming} />
          <DueCard flow="out" items={dues?.outgoing} />
        </div>
      </section>

      <BalanceCards data={data} />
      <TopProductsCard data={data} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        <RecentCard data={data} />
        <PendingDocsCard />
      </div>

      <CurrencyCard data={data} />

      <button
        type="button"
        onClick={() => setHelpOpen(true)}
        className="fixed z-20 h-7 w-7 rounded-full text-slate-500 hover:text-slate-300 flex items-center justify-center transition right-2 bottom-2"
        title="Bu sayfa hakkında"
        aria-label="Bu sayfa hakkında"
      >
        <CircleHelp size={18} />
      </button>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent
          title="Panel"
          description="İşletmenizin anlık özeti. Bu ayki ciro, masraf, tahsilat, kritik stok ve yaklaşan ödemeler tek ekranda."
          className="max-w-md"
        >
          <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Özellikler</div>
              <ul className="list-disc pl-5 space-y-1">
                <li>Aylık ciro ve dövizli satış özeti</li>
                <li>Masraf ve tahsilat kartları</li>
                <li>Kritik stok uyarıları</li>
                <li>Son hareketler ve satış grafiği</li>
              </ul>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">İpuçları</div>
              <ul className="list-disc pl-5 space-y-1">
                <li>Kartlara, grafikteki günlere ve hareketlere tıklayarak ilgili kayda gidebilirsiniz.</li>
                <li>Ctrl+K ile komut paletinden her yere atlayabilirsiniz.</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </MaskContext.Provider>
  );
}
