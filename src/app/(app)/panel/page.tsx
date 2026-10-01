"use client";

import * as React from "react";
import Link from "next/link";
import {
  TrendingUp,
  Eye,
  EyeOff,
  BarChart3,
  DollarSign,
  Clock,
  CalendarClock,
  FileText,
  CircleHelp,
  X,
  ExternalLink,
} from "lucide-react";
import { useOrg } from "@/providers/org-provider";
import { useDashboard } from "@/components/dashboard/use-dashboard";
import { formatMoney, formatDate } from "@/lib/format";
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import { cn } from "@/lib/utils";

const MONTHS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
];

type ChartPeriod = "gun" | "hafta" | "ay" | "3ay" | "buyil" | "gecenyil";

const PERIOD_BUTTONS: { id: ChartPeriod; label: string }[] = [
  { id: "gun", label: "Günlük" },
  { id: "hafta", label: "Haftalık" },
  { id: "ay", label: "Aylık" },
  { id: "3ay", label: "3 Aylık" },
  { id: "buyil", label: "Bu Yıl" },
  { id: "gecenyil", label: "Geçen Yıl" },
];

export default function PanelPage() {
  const { org } = useOrg();
  const { data } = useDashboard(org?.id || "");
  const [summaryOpen, setSummaryOpen] = React.useState(false);
  const [chartMode, setChartMode] = React.useState<ChartPeriod>("gun");
  const [helpOpen, setHelpOpen] = React.useState(false);

  const currentMonthName = MONTHS[new Date().getMonth()];

  // Satış grafiği verileri: Günlük, Haftalık, Aylık, 3 Aylık, Bu Yıl, Geçen Yıl
  const { chartData, chartSubtitle, totalSales } = React.useMemo(() => {
    const daily = data?.sales_daily || [];
    const monthly = data?.sales_monthly || [];

    if (chartMode === "gun") {
      const pts = daily.length > 0
        ? daily.slice(-14).map((d: any) => ({
            name: new Date(d.date).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }),
            satış: Number(d.amount) || 0,
          }))
        : Array.from({ length: 14 }).map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (13 - i));
            return {
              name: d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" }),
              satış: 0,
            };
          });
      const sum = pts.reduce((acc, c) => acc + c.satış, 0);
      return { chartData: pts, chartSubtitle: "Son 14 gün (TL)", totalSales: sum };
    }

    if (chartMode === "hafta") {
      const pts = Array.from({ length: 8 }).map((_, i) => {
        const weekNum = i + 1;
        const slice = daily.slice(Math.max(0, daily.length - (8 - i) * 7), daily.length - (7 - i) * 7);
        const val = slice.reduce((acc: number, c: any) => acc + (Number(c.amount) || 0), 0);
        return {
          name: `${weekNum}. Hafta`,
          satış: val,
        };
      });
      const sum = pts.reduce((acc, c) => acc + c.satış, 0);
      return { chartData: pts, chartSubtitle: "Son 8 hafta (TL)", totalSales: sum };
    }

    if (chartMode === "ay") {
      const monthNames = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
      const currentMonthIdx = new Date().getMonth();
      const pts = Array.from({ length: 12 }).map((_, i) => {
        const mIdx = (currentMonthIdx - 11 + i + 12) % 12;
        const found = monthly.find((m: any) => {
          if (!m.month) return false;
          const monthNum = parseInt(m.month.split("-")[1], 10);
          return monthNum === mIdx + 1;
        });
        return {
          name: monthNames[mIdx],
          satış: found ? Number(found.amount) || 0 : (i === 11 ? Number(data?.kpi?.month_sales) || 0 : 0),
        };
      });
      const sum = pts.reduce((acc, c) => acc + c.satış, 0);
      return { chartData: pts, chartSubtitle: "Son 12 ay (TL)", totalSales: sum };
    }

    if (chartMode === "3ay") {
      const quarters = ["1. Çeyrek", "2. Çeyrek", "3. Çeyrek", "4. Çeyrek"];
      const pts = quarters.map((q, idx) => {
        const monthsInQuarter = [idx * 3 + 1, idx * 3 + 2, idx * 3 + 3];
        const val = monthly
          .filter((m: any) => {
            if (!m.month) return false;
            const mNum = parseInt(m.month.split("-")[1], 10);
            return monthsInQuarter.includes(mNum);
          })
          .reduce((acc: number, c: any) => acc + (Number(c.amount) || 0), 0);
        return {
          name: q,
          satış: val,
        };
      });
      const sum = pts.reduce((acc, c) => acc + c.satış, 0);
      return { chartData: pts, chartSubtitle: "Dönemsel (3 Aylık)", totalSales: sum };
    }

    if (chartMode === "buyil") {
      const thisYear = new Date().getFullYear();
      const monthNames = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
      const pts = monthNames.map((name, idx) => {
        const key = `${thisYear}-${String(idx + 1).padStart(2, "0")}`;
        const found = monthly.find((m: any) => m.month === key);
        return {
          name,
          satış: found ? Number(found.amount) || 0 : (idx === new Date().getMonth() ? Number(data?.kpi?.month_sales) || 0 : 0),
        };
      });
      const sum = pts.reduce((acc, c) => acc + c.satış, 0);
      return { chartData: pts, chartSubtitle: `${thisYear} Yılı Toplam (TL)`, totalSales: sum };
    }

    if (chartMode === "gecenyil") {
      const lastYear = new Date().getFullYear() - 1;
      const monthNames = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
      const pts = monthNames.map((name, idx) => {
        const key = `${lastYear}-${String(idx + 1).padStart(2, "0")}`;
        const found = monthly.find((m: any) => m.month === key);
        return {
          name,
          satış: found ? Number(found.amount) || 0 : 0,
        };
      });
      const sum = pts.reduce((acc, c) => acc + c.satış, 0);
      return { chartData: pts, chartSubtitle: `${lastYear} Yılı Toplam (TL)`, totalSales: sum };
    }

    return { chartData: [], chartSubtitle: "", totalSales: 0 };
  }, [chartMode, data?.sales_daily, data?.sales_monthly, data?.kpi?.month_sales]);

  // Kurlar ve döviz hesapları
  const usdRate = data?.rates?.USD || 41.0;
  const eurRate = data?.rates?.EUR || 45.0;
  const monthSalesTRY = Number(data?.kpi?.month_sales) || 0;
  const monthSalesUSD = usdRate > 0 ? monthSalesTRY / usdRate : 0;
  const monthSalesEUR = eurRate > 0 ? monthSalesTRY / eurRate : 0;

  const cashBankTRY = Number(data?.kpi?.cash_bank) || 0;
  const receivableTRY = Number(data?.kpi?.receivable) || 0;
  const payableTRY = Number(data?.kpi?.payable) || 0;
  const netStatus = receivableTRY - payableTRY;

  // İlgili bölüme yönlendirme linkleri
  const getMovementLink = (t: any) => {
    if (t.kind === "document") {
      if (t.type === "pos_sale") return `/satislar/hizli-satislar`;
      if (t.type === "purchase_invoice") return `/giderler/alis-faturalari`;
      if (t.type === "expense" || t.type === "salary") return `/giderler/masraflar`;
      return `/satislar/faturalar`;
    }
    return `/nakit/hareketler`;
  };

  return (
    <div className="space-y-6">
      {/* 1. Başlık Alanı */}
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 text-white flex items-center justify-center shadow-soft shrink-0">
          <TrendingUp size={22} />
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

      {/* 2. Dönem Özeti (Özet gizli / göster) */}
      <section className="space-y-3" aria-label="Dönem özeti">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            aria-expanded={summaryOpen}
            onClick={() => setSummaryOpen((v) => !v)}
            title={summaryOpen ? "Özeti gizle" : "Özeti göster"}
            className="flex items-center gap-2 font-semibold rounded-lg -mx-1 px-1 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
          >
            Özet
            {summaryOpen ? (
              <EyeOff size={17} className="text-slate-400" />
            ) : (
              <Eye size={17} className="text-slate-700 dark:text-slate-300" />
            )}
            {!summaryOpen && (
              <span className="text-xs font-normal text-slate-400">
                Satış, kâr ve dünün özeti gizli — görmek için dokunun
              </span>
            )}
          </button>
        </div>

        {summaryOpen && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 pt-1">
            <Link
              href="/satislar/faturalar"
              className="card p-3.5 hover:border-slate-400 dark:hover:border-slate-600 transition block cursor-pointer"
            >
              <div className="text-xs text-slate-400">Bugünkü Satış</div>
              <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5 tabular-nums">
                {formatMoney(
                  data?.sales_daily?.find((d) => d.date === new Date().toISOString().slice(0, 10))?.amount ?? 0
                )}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Satışlara git →</span>
            </Link>

            <Link
              href="/nakit/hareketler"
              className="card p-3.5 hover:border-slate-400 dark:hover:border-slate-600 transition block cursor-pointer"
            >
              <div className="text-xs text-slate-400">Bugünkü Tahsilat</div>
              <div className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 tabular-nums">
                {formatMoney(data?.kpi?.today_collections ?? 0)}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Kasa hareketleri →</span>
            </Link>

            <Link
              href="/giderler/masraflar"
              className="card p-3.5 hover:border-slate-400 dark:hover:border-slate-600 transition block cursor-pointer"
            >
              <div className="text-xs text-slate-400">Bu Ayki Masraflar</div>
              <div className="text-base sm:text-lg font-bold text-rose-500 mt-0.5 tabular-nums">
                {formatMoney(data?.kpi?.month_expenses ?? 0)}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Masraflara git →</span>
            </Link>

            <Link
              href="/raporlar/gelir-gider"
              className="card p-3.5 hover:border-slate-400 dark:hover:border-slate-600 transition block cursor-pointer"
            >
              <div className="text-xs text-slate-400">Bu Ay Net Fark</div>
              <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5 tabular-nums">
                {formatMoney((data?.kpi?.month_sales ?? 0) - (data?.kpi?.month_expenses ?? 0))}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Gelir-Gider raporu →</span>
            </Link>
          </div>
        )}
      </section>

      {/* 3. Üst 5 KPI Kartı (Kare içine alınmış, tıklanabilir) */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2.5 sm:gap-3">
        {/* Ekim Cirosu -> Satış Faturaları */}
        <Link
          href="/satislar/faturalar"
          title="Satışları görüntüle"
          className="rounded-2xl px-4 py-3 text-white bg-gradient-to-br from-amber-400 to-amber-500 shadow-soft min-w-0 overflow-hidden hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all block cursor-pointer"
        >
          <div className="text-lg sm:text-xl font-bold tabular-nums truncate">
            {formatMoney(data?.kpi?.month_sales ?? 0)}
          </div>
          <div className="text-xs font-medium opacity-90 mt-0.5 truncate flex items-center justify-between">
            <span>{currentMonthName} Cirosu</span>
            <span className="text-[10px] opacity-75">→</span>
          </div>
        </Link>

        {/* Ekim Masrafları -> Masraflar */}
        <Link
          href="/giderler/masraflar"
          title="Masrafları görüntüle"
          className="rounded-2xl px-4 py-3 text-white bg-gradient-to-br from-rose-400 to-rose-500 shadow-soft min-w-0 overflow-hidden hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all block cursor-pointer"
        >
          <div className="text-lg sm:text-xl font-bold tabular-nums truncate">
            {formatMoney(data?.kpi?.month_expenses ?? 0)}
          </div>
          <div className="text-xs font-medium opacity-90 mt-0.5 truncate flex items-center justify-between">
            <span>{currentMonthName} Masrafları</span>
            <span className="text-[10px] opacity-75">→</span>
          </div>
        </Link>

        {/* Bugünkü Tahsilat -> Nakit / Kasa Hareketleri */}
        <Link
          href="/nakit/hareketler"
          title="Tahsilat hareketlerini görüntüle"
          className="rounded-2xl px-4 py-3 text-white bg-gradient-to-br from-blue-400 to-blue-500 shadow-soft min-w-0 overflow-hidden hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all block cursor-pointer"
        >
          <div className="text-lg sm:text-xl font-bold tabular-nums truncate">
            {formatMoney(data?.kpi?.today_collections ?? 0)}
          </div>
          <div className="text-xs font-medium opacity-90 mt-0.5 truncate flex items-center justify-between">
            <span>Bugünkü Tahsilat</span>
            <span className="text-[10px] opacity-75">→</span>
          </div>
        </Link>

        {/* Kasa / Banka (TL) -> Hesaplar */}
        <Link
          href="/nakit/hesaplar"
          title="Hesapları ve kasayı görüntüle"
          className="rounded-2xl px-4 py-3 text-white bg-gradient-to-br from-slate-600 to-slate-700 shadow-soft min-w-0 overflow-hidden hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all block cursor-pointer"
        >
          <div className="text-lg sm:text-xl font-bold tabular-nums truncate">
            {formatMoney(cashBankTRY)}
          </div>
          <div className="text-xs font-medium opacity-90 mt-0.5 truncate flex items-center justify-between">
            <span>Kasa / Banka (TL)</span>
            <span className="text-[10px] opacity-75">→</span>
          </div>
        </Link>

        {/* Açık Hesap (Alacak) -> Müşteriler */}
        <Link
          href="/cariler/musteriler"
          title="Müşteri alacaklarını görüntüle"
          className="rounded-2xl px-4 py-3 text-white bg-gradient-to-br from-slate-700 to-slate-900 shadow-soft min-w-0 overflow-hidden col-span-2 md:col-span-1 lg:col-span-1 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all block cursor-pointer"
        >
          <div className="text-lg sm:text-xl font-bold tabular-nums truncate">
            {formatMoney(receivableTRY)}
          </div>
          <div className="text-xs font-medium opacity-90 mt-0.5 truncate flex items-center justify-between">
            <span>Açık Hesap (Alacak)</span>
            <span className="text-[10px] opacity-75">→</span>
          </div>
        </Link>
      </div>

      {/* 4. Satış Grafiği (Günlük, Haftalık, Aylık, 3 Aylık, Bu Yıl, Geçen Yıl) */}
      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="font-semibold flex items-center gap-2 text-slate-800 dark:text-slate-100">
              <BarChart3 size={17} className="text-slate-700 dark:text-slate-300" /> Satış Grafiği
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {chartSubtitle} · Toplam{" "}
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {formatMoney(totalSales)}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-x-auto text-xs font-bold p-0.5 bg-slate-50 dark:bg-slate-800/60 max-w-full thin-scroll">
              {PERIOD_BUTTONS.map((btn) => (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => setChartMode(btn.id)}
                  className={cn(
                    "px-2.5 py-1.5 rounded-md transition whitespace-nowrap text-xs",
                    chartMode === btn.id
                      ? "bg-slate-900 text-white font-bold shadow-xs dark:bg-slate-100 dark:text-slate-900"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  )}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            <Link
              href="/raporlar/satis"
              className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:underline shrink-0 ml-1"
            >
              Detaylı rapor →
            </Link>
          </div>
        </div>

        <div className="h-[220px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <defs>
                <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#64748b" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#64748b" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
              <XAxis dataKey="name" fontSize={11} stroke="#94a3b8" />
              <YAxis
                fontSize={11}
                stroke="#94a3b8"
                tickFormatter={(c) => (c >= 1000 ? `${Math.round(c / 1000)}b` : c)}
                width={42}
              />
              <Tooltip
                formatter={(val) => [formatMoney(Number(val) || 0), "Satış"]}
                contentStyle={{
                  borderRadius: 12,
                  border: "none",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                }}
              />
              <Area
                type="monotone"
                dataKey="satış"
                name="Satış"
                stroke="#475569"
                strokeWidth={2.5}
                fill="url(#salesFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 5. Döviz Özeti (Kare kutucuklar, tıklanabilir) */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <DollarSign size={17} className="text-blue-500" /> Döviz Özeti
          </h2>
          <Link
            href="/ayarlar"
            className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 inline-flex items-center gap-1 hover:underline"
          >
            <span>Canlı Kuru Çek</span>
            <ExternalLink size={12} />
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
          <Link
            href="/satislar/faturalar"
            className="rounded-xl border border-slate-100 dark:border-slate-800 p-3 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700 transition block cursor-pointer"
          >
            <div className="text-xs text-slate-400">Bu ay satış (USD)</div>
            <div className="font-bold text-blue-600 dark:text-blue-400 mt-0.5 tabular-nums">
              ${monthSalesUSD.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-400">
              ≈ {formatMoney(monthSalesUSD * usdRate)}
            </div>
          </Link>

          <Link
            href="/satislar/faturalar"
            className="rounded-xl border border-slate-100 dark:border-slate-800 p-3 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700 transition block cursor-pointer"
          >
            <div className="text-xs text-slate-400">Bu ay satış (EUR)</div>
            <div className="font-bold text-indigo-600 dark:text-indigo-400 mt-0.5 tabular-nums">
              €{monthSalesEUR.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-400">
              ≈ {formatMoney(monthSalesEUR * eurRate)}
            </div>
          </Link>

          <Link
            href="/nakit/hesaplar"
            className="rounded-xl border border-slate-100 dark:border-slate-800 p-3 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700 transition block cursor-pointer"
          >
            <div className="text-xs text-slate-400">
              Kasa USD · 1$ = {usdRate.toFixed(2)} ₺
            </div>
            <div className="font-bold mt-0.5 text-slate-800 dark:text-slate-100 tabular-nums">
              $0,00
            </div>
            <div className="text-[11px] text-slate-400">≈ 0,00 TL</div>
          </Link>

          <Link
            href="/nakit/hesaplar"
            className="rounded-xl border border-slate-100 dark:border-slate-800 p-3 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700 transition block cursor-pointer"
          >
            <div className="text-xs text-slate-400">
              Kasa EUR · 1€ = {eurRate.toFixed(2)} ₺
            </div>
            <div className="font-bold mt-0.5 text-slate-800 dark:text-slate-100 tabular-nums">
              €0,00
            </div>
            <div className="text-[11px] text-slate-400">≈ 0,00 TL</div>
          </Link>
        </div>

        <p className="text-xs text-slate-400 mt-3">
          Aylık ciro ve kasa toplamı döviz belgeleri kayıtlı kurla TL'ye çevrilir. Güncel kur: Ayarlar → Canlı Kuru Çek.
        </p>
      </div>

      {/* 6. Cari Bakiye Kartları (3 Kart, Tıklanabilir) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Link
          href="/cariler/musteriler"
          title="Müşterileri görüntüle"
          className="card p-5 hover:border-slate-400 dark:hover:border-slate-600 transition block cursor-pointer"
        >
          <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Toplam Alacak (Müşteriler)</span>
            <span className="text-xs text-slate-400">Müşteriler →</span>
          </div>
          <div className="text-2xl font-bold text-emerald-500 mt-1 tabular-nums">
            {formatMoney(receivableTRY)}
          </div>
        </Link>

        <Link
          href="/cariler/tedarikciler"
          title="Tedarikçileri görüntüle"
          className="card p-5 hover:border-slate-400 dark:hover:border-slate-600 transition block cursor-pointer"
        >
          <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Toplam Borç (Tedarikçiler)</span>
            <span className="text-xs text-slate-400">Tedarikçiler →</span>
          </div>
          <div className="text-2xl font-bold text-rose-500 mt-1 tabular-nums">
            {formatMoney(payableTRY)}
          </div>
        </Link>

        <Link
          href="/raporlar/cari-bakiye"
          title="Cari bakiye raporunu görüntüle"
          className="card p-5 hover:border-slate-400 dark:hover:border-slate-600 transition block cursor-pointer"
        >
          <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Net Durum</span>
            <span className="text-xs text-slate-400">Rapor →</span>
          </div>
          <div
            className={cn(
              "text-2xl font-bold mt-1 tabular-nums",
              netStatus >= 0 ? "text-slate-800 dark:text-slate-200" : "text-rose-500"
            )}
          >
            {formatMoney(netStatus)}
          </div>
        </Link>
      </div>

      {/* 7. Son Hareketler & Yaklaşan / Geciken Ödemeler (Tıklanabilir Satırlar) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sol Sütun: Son Hareketler */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2 text-slate-800 dark:text-slate-100">
              <Clock size={17} className="text-slate-700 dark:text-slate-300" /> Son Hareketler
            </h2>
            <Link
              href="/nakit/hareketler"
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:underline"
            >
              Tüm hareketler →
            </Link>
          </div>

          {(!data?.recent || data.recent.length === 0) ? (
            <p className="text-sm text-slate-400 py-6 text-center">
              Henüz hareket yok.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.recent.slice(0, 10).map((t: any) => {
                const isPositive = t.amount >= 0;
                const linkHref = getMovementLink(t);
                return (
                  <Link
                    key={t.id}
                    href={linkHref}
                    className="flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition group cursor-pointer"
                  >
                    <div
                      className={cn(
                        "h-9 w-9 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                        isPositive
                          ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                          : "bg-rose-50 dark:bg-rose-900/30 text-rose-500"
                      )}
                    >
                      <FileText size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate text-slate-800 dark:text-slate-200 group-hover:text-slate-950 dark:group-hover:text-white">
                        {t.party || t.type}
                      </div>
                      <div className="text-xs text-slate-400 truncate">
                        {formatDate(t.date)} {t.number && `· ${t.number}`}
                      </div>
                    </div>
                    <div
                      className={cn(
                        "font-semibold text-sm shrink-0 tabular-nums",
                        isPositive ? "text-emerald-500" : "text-rose-500"
                      )}
                    >
                      {isPositive ? "+" : "−"}
                      {formatMoney(Math.abs(t.amount))}
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

        {/* Sağ Sütun: Yaklaşan / Geciken Ödemeler */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2 text-slate-800 dark:text-slate-100">
              <CalendarClock size={17} className="text-rose-500" /> Yaklaşan / Geciken Ödemeler
            </h2>
            <Link
              href="/giderler/alis-faturalari"
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:underline"
            >
              Alış faturaları →
            </Link>
          </div>

          {(!data?.timeline || data.timeline.length === 0) ? (
            <p className="text-sm text-slate-400 py-6 text-center">
              Ödenecek masraf yok.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.timeline.slice(0, 6).map((t: any) => {
                const isOverdue = t.days_overdue > 0;
                return (
                  <Link
                    key={t.id}
                    href={`/giderler/alis-faturalari`}
                    className="flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition group cursor-pointer"
                  >
                    <div
                      className={cn(
                        "h-9 w-9 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                        isOverdue
                          ? "bg-rose-50 dark:bg-rose-900/30 text-rose-500"
                          : "bg-amber-50 dark:bg-amber-900/30 text-amber-500"
                      )}
                    >
                      <CalendarClock size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate text-slate-800 dark:text-slate-200 group-hover:text-slate-950 dark:group-hover:text-white">
                        {t.party || "Ödeme"}
                      </div>
                      <div className="text-xs text-slate-400 truncate">
                        Vade: {formatDate(t.due_date)} {isOverdue && "(Gecikmiş)"}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-semibold text-sm text-rose-500 tabular-nums">
                        {formatMoney(t.amount)}
                      </div>
                      {isOverdue && (
                        <span className="text-[10px] text-rose-500 font-semibold block">
                          Gecikmiş
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 8. Sayfa Yardım Butonu (Pusulam Birebir Sağ Alt Buton & Popover) */}
      <div className="pointer-events-none fixed z-[80] right-4 sm:right-5 lg:right-6 bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] lg:bottom-6">
        <div className="pointer-events-auto relative flex flex-col items-end gap-2">
          {helpOpen && (
            <div
              role="dialog"
              aria-modal="false"
              className="w-[min(22rem,calc(100vw-1.5rem))] origin-bottom-right rounded-2xl border border-slate-200/90 dark:border-slate-700/90 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-2xl transition-all duration-200 ease-out absolute bottom-12 right-0 overflow-hidden"
            >
              <div className="flex items-start justify-between gap-2 px-4 pt-3.5 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                    Panel
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Bu sayfa hakkında · Esc
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setHelpOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
                  aria-label="Kapat"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="px-4 py-3 max-h-[min(60vh,28rem)] overflow-y-auto text-[13px] leading-relaxed">
                <p className="text-slate-600 dark:text-slate-300 mb-3">
                  İşletmenizin anlık özeti. Bu ayki ciro, masraf, tahsilat ve yaklaşan ödemeleri tek bakışta görürsünüz.
                </p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">
                  Özellikler
                </p>
                <ul className="space-y-1.5 mb-3">
                  <li className="flex gap-2 text-slate-600 dark:text-slate-300">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
                    <span>Aylık ciro ve dövizli satış özeti</span>
                  </li>
                  <li className="flex gap-2 text-slate-600 dark:text-slate-300">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
                    <span>Masraf ve tahsilat kartları</span>
                  </li>
                  <li className="flex gap-2 text-slate-600 dark:text-slate-300">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
                    <span>Son hareketler ve detaylı satış grafiği</span>
                  </li>
                </ul>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">
                  İpuçları
                </p>
                <ul className="space-y-1.5">
                  <li className="text-slate-500 dark:text-slate-400 text-[12.5px]">
                    Kartlara tıklayarak ilgili modüle hızlıca gidebilirsiniz.
                  </li>
                  <li className="text-slate-500 dark:text-slate-400 text-[12.5px]">
                    Ctrl+K ile komut paletinden her yere atlayabilirsiniz.
                  </li>
                </ul>
              </div>
            </div>
          )}

          <button
            type="button"
            data-page-help-trigger="true"
            title="Panel yardımı"
            aria-expanded={helpOpen}
            onClick={() => setHelpOpen((v) => !v)}
            className="h-9 w-9 rounded-full flex items-center justify-center border transition bg-white/70 dark:bg-slate-900/70 border-slate-200/60 dark:border-slate-700/60 text-slate-400/70 hover:text-slate-500 hover:border-slate-300 dark:hover:text-slate-300 shadow-sm"
          >
            <CircleHelp size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
