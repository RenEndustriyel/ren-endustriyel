"use client";

import * as React from "react";
import Link from "next/link";
import {
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  CheckCircle2,
  AlertTriangle,
  Info,
  Calendar,
  Layers,
  ChevronRight,
  Download,
  Activity,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { useGrowthHealth, type PeriodType, type GrowthPoint } from "./use-growth-health";
import { formatCompact, formatMoney, formatNumber } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Hacim indeksi çubukları için dinamik gradyan paleti (Açık maviden zümrüt yeşiline)
const VOLUME_GRADIENT = [
  "#38bdf8", // Sky 400
  "#38bdf8",
  "#0ea5e9", // Sky 500
  "#0284c7", // Sky 600
  "#06b6d4", // Cyan 500
  "#0891b2", // Cyan 600
  "#14b8a6", // Teal 500
  "#0d9488", // Teal 600
  "#10b981", // Emerald 500
  "#059669", // Emerald 600
  "#16a34a", // Green 600
  "#15803d", // Green 700
];

export function GrowthHealthBoard({
  orgId,
  variant = "dashboard",
}: {
  orgId: string;
  variant?: "dashboard" | "full";
}) {
  const [periodType, setPeriodType] = React.useState<PeriodType>("monthly");
  const { data, isLoading } = useGrowthHealth(orgId, periodType);

  if (isLoading || !data) {
    return <Skeleton className="h-[520px] w-full rounded-2xl" />;
  }

  const { periods, kpi, health } = data;

  return (
    <Card className="overflow-hidden rounded-2xl border border-border/80 bg-surface/95 p-4 shadow-sm backdrop-blur-sm sm:p-6">
      {/* 1. Üst Başlık ve Durum Özeti */}
      <div className="flex flex-col justify-between gap-4 border-b border-border/70 pb-5 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex size-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:bg-sky-400/10 dark:text-sky-400">
              <Activity className="size-5" />
            </span>
            <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">
              <span className="text-text">BÜYÜME & SAĞLIK </span>
              <span className="bg-gradient-to-r from-sky-500 to-teal-500 bg-clip-text text-transparent">
                SKORBORDU
              </span>
            </h2>
          </div>
          <p className="mt-1 text-xs text-muted">
            İşletmenizin ciro artışı, brüt kârlılık marjı ve fiziksel hacim trendi
          </p>
        </div>

        {/* Durum Özeti Rozet Kartı (Mockup sağ üst) */}
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-border/80 bg-surface-2/80 p-2.5 shadow-xs">
            <div className="mb-1 text-center text-[10px] font-bold uppercase tracking-wider text-muted">
              DURUM ÖZETİ
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold shadow-xs",
                  health.tone === "success" && "bg-emerald-500 text-white dark:bg-emerald-600",
                  health.tone === "warning" && "bg-amber-500 text-white dark:bg-amber-600",
                  health.tone === "primary" && "bg-sky-600 text-white dark:bg-sky-500",
                  health.tone === "danger" && "bg-red-500 text-white dark:bg-red-600",
                  health.tone === "neutral" && "bg-teal-600 text-white dark:bg-teal-500",
                )}
              >
                <CheckCircle2 className="size-3.5 shrink-0" />
                <span>{health.statusText}</span>
              </div>
              <div className="flex items-center gap-2.5 text-[11px] font-semibold text-text">
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5",
                    health.ciroTrendUp ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
                  )}
                >
                  Ciro {health.ciroTrendUp ? "↑" : "↓"}
                </span>
                <span className="text-border">·</span>
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5",
                    health.adetTrendUp ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
                  )}
                >
                  Adet {health.adetTrendUp ? "↑" : "↓"}
                </span>
                <span className="text-border">·</span>
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5",
                    health.karMarjiTrendUp ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400",
                  )}
                >
                  Kâr Marjı {health.karMarjiTrendUp ? "↗" : "↘"}
                </span>
              </div>
            </div>
          </div>

          {variant === "dashboard" && (
            <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex text-xs font-semibold">
              <Link href="/raporlar/buyume-skorboard" className="gap-1.5">
                <span>Rapor Detayı</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* 2. Üst 3 KPI Kartı */}
      <div className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-3">
        {/* Net Ciro */}
        <div className="relative overflow-hidden rounded-xl border border-border/70 bg-gradient-to-br from-surface to-surface-2/60 p-4 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted">NET CİRO</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              className={cn(
                "text-2xl font-black tracking-tight sm:text-3xl",
                kpi.netCiroGrowth >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-danger",
              )}
            >
              {kpi.netCiroGrowth >= 0 ? "↑" : "↓"} {Math.abs(kpi.netCiroGrowth)}%
            </span>
          </div>
          <div className="mt-1 text-xs text-muted">
            Mevcut: <strong className="text-text">{formatMoney(kpi.currentCiro)}</strong>
          </div>
          {/* Watermark Arrow */}
          <div className="pointer-events-none absolute -bottom-1 -right-1 text-sky-500/10 dark:text-sky-400/10">
            <TrendingUp className="size-20" />
          </div>
        </div>

        {/* Brüt Kâr */}
        <div className="relative overflow-hidden rounded-xl border border-border/70 bg-gradient-to-br from-surface to-surface-2/60 p-4 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted">BRÜT KÂR</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              className={cn(
                "text-2xl font-black tracking-tight sm:text-3xl",
                kpi.brutKarGrowth >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-danger",
              )}
            >
              {kpi.brutKarGrowth >= 0 ? "↑" : "↓"} {Math.abs(kpi.brutKarGrowth)}%
            </span>
          </div>
          <div className="mt-1 text-xs text-muted">
            Mevcut: <strong className="text-text">{formatMoney(kpi.currentKar)}</strong> (%{kpi.currentMargin} marj)
          </div>
          {/* Watermark Arrow */}
          <div className="pointer-events-none absolute -bottom-1 -right-1 text-teal-500/10 dark:text-teal-400/10">
            <ArrowUpRight className="size-20" />
          </div>
        </div>

        {/* Hacim ve Müşteri */}
        <div className="relative overflow-hidden rounded-xl border border-border/70 bg-gradient-to-br from-surface to-surface-2/60 p-4 shadow-xs sm:col-span-2 md:col-span-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted">HACİM VE MÜŞTERİ</div>
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between text-xs sm:text-sm font-bold">
              <span className="text-muted">Aktif Cari:</span>
              <span className={cn(kpi.aktifCariGrowth >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-danger")}>
                {kpi.aktifCariGrowth >= 0 ? "+" : ""}{kpi.aktifCariGrowth}%
                <span className="ml-1 text-[11px] font-normal text-muted">({kpi.currentContacts} cari)</span>
              </span>
            </div>
            <div className="flex items-center justify-between text-xs sm:text-sm font-bold">
              <span className="text-muted">Satış Hacmi:</span>
              <span className={cn(kpi.satisHacmiGrowth >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-danger")}>
                {kpi.satisHacmiGrowth >= 0 ? "+" : ""}{kpi.satisHacmiGrowth}%
                <span className="ml-1 text-[11px] font-normal text-muted">({formatNumber(kpi.currentVolume)} adet)</span>
              </span>
            </div>
          </div>
          {/* Watermark Users */}
          <div className="pointer-events-none absolute -bottom-1 -right-1 text-indigo-500/10 dark:text-indigo-400/10">
            <Users className="size-20" />
          </div>
        </div>
      </div>

      {/* 3. Hibrit Trend Grafiği */}
      <div className="mt-6 rounded-xl border border-border/80 bg-surface p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-text sm:text-base">
              HİBRİT TREND GRAFİĞİ
            </h3>
            <p className="text-xs text-muted">Net Ciro, Brüt Kâr ve Kâr Marjı gelişimi</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Legend Açıklamaları */}
            <div className="flex items-center gap-3 text-[11px] font-medium text-muted">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-[#38bdf8]" />
                <span>Net Ciro (₺)</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-[#1e40af] dark:bg-[#3b82f6]" />
                <span>Brüt Kâr (₺)</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
                <span className="size-2 rounded-full bg-[#f97316]" />
                <span>Brüt Kâr Marjı (%)</span>
              </span>
            </div>

            {/* Zaman Sekmeleri */}
            <div className="inline-flex rounded-lg border border-border bg-surface-2 p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setPeriodType("weekly")}
                className={cn(
                  "rounded-md px-2.5 py-1 transition-all",
                  periodType === "weekly" ? "bg-primary text-white shadow-xs" : "text-muted hover:text-text",
                )}
              >
                Haftalık
              </button>
              <button
                type="button"
                onClick={() => setPeriodType("monthly")}
                className={cn(
                  "rounded-md px-2.5 py-1 transition-all",
                  periodType === "monthly" ? "bg-primary text-white shadow-xs" : "text-muted hover:text-text",
                )}
              >
                Aylık
              </button>
              <button
                type="button"
                onClick={() => setPeriodType("quarterly")}
                className={cn(
                  "rounded-md px-2.5 py-1 transition-all",
                  periodType === "quarterly" ? "bg-primary text-white shadow-xs" : "text-muted hover:text-text",
                )}
              >
                Çeyreklik
              </button>
            </div>
          </div>
        </div>

        {/* Hibrit Recharts Grafiği */}
        <div className="h-64 sm:h-72 w-full pt-3">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={periods} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" opacity={0.6} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--muted)" }}
                axisLine={false}
                tickLine={false}
              />
              {/* Sol Y-Axis: Tutarlar (TL) */}
              <YAxis
                yAxisId="left"
                tickFormatter={(v) => formatCompact(v)}
                tick={{ fontSize: 11, fill: "var(--muted)" }}
                axisLine={false}
                tickLine={false}
                width={50}
              />
              {/* Sağ Y-Axis: Marj Yüzdesi (%) */}
              <YAxis
                yAxisId="right"
                orientation="right"
                tickFormatter={(v) => `%${v}`}
                domain={[0, (max: number) => Math.max(Math.ceil(max / 10) * 10, 50)]}
                tick={{ fontSize: 11, fill: "var(--muted)" }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip content={<HybridChartTooltip />} />

              {/* Net Ciro Çubuğu (Açık Mavi) */}
              <Bar
                yAxisId="left"
                dataKey="netRevenue"
                name="Net Ciro"
                fill="#38bdf8"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
              {/* Brüt Kâr Çubuğu (Koyu Mavi/İndigo) */}
              <Bar
                yAxisId="left"
                dataKey="grossProfit"
                name="Brüt Kâr"
                fill="#1e40af"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
              {/* Brüt Kâr Marjı Çizgisi (Turuncu) */}
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="profitMargin"
                name="Kâr Marjı"
                stroke="#f97316"
                strokeWidth={3}
                dot={{ r: 4, fill: "#f97316", stroke: "#fff", strokeWidth: 1.5 }}
                activeDot={{ r: 6, fill: "#f97316", stroke: "#fff", strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. Fiziksel Hacim Değişimi İndeksi */}
      <div className="mt-5 rounded-xl border border-border/80 bg-surface p-4 shadow-xs">
        <div className="flex items-center justify-between pb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text sm:text-sm">
            FİZİKSEL HACİM DEĞİŞİMİ İNDEKSİ
          </h3>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted">
            <span className="size-2.5 rounded-sm bg-gradient-to-r from-sky-400 to-emerald-500" />
            <span>Hacim İndeksi</span>
          </span>
        </div>

        <div className="h-28 w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={periods} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "var(--muted)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide domain={[0, 110]} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0].payload as GrowthPoint;
                  return (
                    <div className="rounded-lg border border-border bg-surface p-2 text-xs shadow-lg">
                      <div className="font-semibold text-text">{item.label}</div>
                      <div className="text-muted">Hacim İndeksi: <strong className="text-primary">{item.volumeIndex}</strong></div>
                      <div className="text-muted">Satış Adedi: <strong className="text-text">{formatNumber(item.volume)}</strong></div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="volumeIndex" name="Hacim İndeksi" radius={[3, 3, 0, 0]} maxBarSize={28}>
                {periods.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={VOLUME_GRADIENT[index % VOLUME_GRADIENT.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-1 text-center text-[10px] uppercase tracking-wider text-muted">
          Hacim İndeksi (Dönemsel Satış Miktarı & İşlem Hızı)
        </div>
      </div>

      {/* 5. Tam Rapor Görünümü için Veri Tablosu */}
      {variant === "full" && (
        <div className="mt-6 overflow-hidden rounded-xl border border-border">
          <div className="bg-surface-2 px-4 py-2.5 font-bold text-xs uppercase tracking-wider text-text">
            Dönemsel Performans Dökümü
          </div>
          <div className="thin-scroll overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-surface-2/60 text-muted font-semibold">
                <tr>
                  <th className="p-3">Dönem</th>
                  <th className="p-3 text-right">Net Ciro</th>
                  <th className="p-3 text-right">Brüt Kâr</th>
                  <th className="p-3 text-right">Kâr Marjı</th>
                  <th className="p-3 text-right">Satış Adedi</th>
                  <th className="p-3 text-right">Hacim İndeksi</th>
                  <th className="p-3 text-right">Aktif Cari</th>
                  <th className="p-3 text-right">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {periods.map((p) => (
                  <tr key={p.key} className="hover:bg-surface-2/50 transition-colors">
                    <td className="p-3 font-semibold text-text">{p.label}</td>
                    <td className="p-3 text-right num font-medium text-text">{formatMoney(p.netRevenue)}</td>
                    <td className="p-3 text-right num font-medium text-text">{formatMoney(p.grossProfit)}</td>
                    <td className="p-3 text-right num font-bold text-amber-600 dark:text-amber-400">%{p.profitMargin}</td>
                    <td className="p-3 text-right num text-muted">{formatNumber(p.volume)}</td>
                    <td className="p-3 text-right num font-bold text-sky-600 dark:text-sky-400">{p.volumeIndex}</td>
                    <td className="p-3 text-right num text-text">{p.activeContacts}</td>
                    <td className="p-3 text-right num">
                      <span
                        className={cn(
                          "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-bold",
                          p.growthRate >= 0 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-red-500/10 text-red-600 dark:text-red-400",
                        )}
                      >
                        {p.growthRate >= 0 ? "+" : ""}{p.growthRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
}

function HybridChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload as GrowthPoint;
  if (!p) return null;

  return (
    <div className="rounded-xl border border-border bg-surface p-3 text-xs shadow-xl backdrop-blur-md">
      <div className="border-b border-border pb-1.5 font-bold text-sm text-text">
        {p.label} {p.growthRate !== 0 && (
          <span className={cn("ml-1.5 text-xs font-semibold", p.growthRate >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-danger")}>
            ({p.growthRate >= 0 ? "+" : ""}{p.growthRate}%)
          </span>
        )}
      </div>
      <div className="mt-2 space-y-1.5 text-[11px]">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted">
            <span className="size-2 rounded-sm bg-[#38bdf8]" />
            Net Ciro:
          </span>
          <span className="num font-bold text-text">{formatMoney(p.netRevenue)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted">
            <span className="size-2 rounded-sm bg-[#1e40af] dark:bg-[#3b82f6]" />
            Brüt Kâr:
          </span>
          <span className="num font-bold text-text">{formatMoney(p.grossProfit)}</span>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-border/70 pt-1 text-amber-600 dark:text-amber-400">
          <span className="flex items-center gap-1.5 font-semibold">
            <span className="size-2 rounded-full bg-[#f97316]" />
            Brüt Kâr Marjı:
          </span>
          <span className="num font-black text-sm">%{p.profitMargin}</span>
        </div>
      </div>
    </div>
  );
}
