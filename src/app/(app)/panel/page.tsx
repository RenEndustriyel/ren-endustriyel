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
  TriangleAlert,
  Sparkles,
  Zap,
  Tag,
  Scale,
  ShoppingCart,
  Banknote,
  FileCheck,
  Building2,
  Warehouse,
  Users,
  Truck,
  ScrollText,
  Wallet,
  Landmark,
  Megaphone,
  Bell,
  Calendar,
  Store,
  UsersRound,
  GraduationCap,
  Briefcase,
  HandCoins,
} from "lucide-react";
import { useOrg } from "@/providers/org-provider";
import { useDashboard } from "@/components/dashboard/use-dashboard";
import { formatMoney, formatDate, formatQty, formatNumber } from "@/lib/format";
import { useRates } from "@/lib/rates";
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import { cn } from "@/lib/utils";

const MONTHS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
];

// Pusulam 1:1 Modül Listesi (23 adet)
const MODULES = [
  { title: "Numex AI", href: "/numex-ai", icon: Sparkles, iconColor: "text-purple-500", extraClass: "animate-pulse-slow" },
  { title: "Hızlı Satış", href: "/hizli-satis", icon: Zap, iconColor: "text-amber-500" },
  { title: "Ürünler", href: "/urunler", icon: Tag, iconColor: "text-violet-500" },
  { title: "Alışlar", href: "/alislar", icon: Scale, iconColor: "text-amber-500" },
  { title: "Satışlar", href: "/satislar", icon: ShoppingCart, iconColor: "text-emerald-500" },
  { title: "Masraflar", href: "/masraflar", icon: Banknote, iconColor: "text-rose-500" },
  { title: "e-Fatura", href: "/e-fatura", icon: FileCheck, iconColor: "text-teal-600" },
  { title: "Şubeler", href: "/subeler", icon: Building2, iconColor: "text-sky-600" },
  { title: "Stoklar", href: "/stoklar", icon: Warehouse, iconColor: "text-cyan-500" },
  { title: "Müşteriler", href: "/musteriler", icon: Users, iconColor: "text-sky-500" },
  { title: "Tedarikçiler", href: "/tedarikciler", icon: Truck, iconColor: "text-indigo-500" },
  { title: "Teklifler", href: "/teklifler", icon: FileText, iconColor: "text-purple-500" },
  { title: "Çek & Senet", href: "/cek-senet", icon: ScrollText, iconColor: "text-orange-600" },
  { title: "Hesaplar", href: "/hesaplar", icon: Wallet, iconColor: "text-teal-500" },
  { title: "Banka Ekstresi", href: "/banka", icon: Landmark, iconColor: "text-emerald-600" },
  { title: "Kampanya", href: "/cari-kampanya", icon: Megaphone, iconColor: "text-rose-500" },
  { title: "Hatırlatmalar", href: "/cari-hatirlatmalar", icon: Bell, iconColor: "text-amber-600" },
  { title: "Raporlar", href: "/raporlar", icon: BarChart3, iconColor: "text-fuchsia-500" },
  { title: "Ajanda (Takvim & Notlar)", href: "/ajanda", icon: Calendar, iconColor: "text-blue-500" },
  { title: "E-Ticaret", href: "/e-ticaret", icon: Store, iconColor: "text-orange-500" },
  { title: "Çalışanlar & Ekip", href: "/ekip", icon: UsersRound, iconColor: "text-indigo-500" },
  { title: "Akademi", href: "/akademi", icon: GraduationCap, iconColor: "text-indigo-600" },
  { title: "Muhasebeci Ağı", href: "/muhasebeci-agi", icon: Briefcase, iconColor: "text-violet-600" },
];

export default function PanelPage() {
  const { org } = useOrg();
  const { data } = useDashboard(org?.id || "");
  const ratesQuery = useRates();

  const [summaryOpen, setSummaryOpen] = React.useState(false);
  const [chartMode, setChartMode] = React.useState<"gun" | "hafta" | "ay">("gun");
  const [helpOpen, setHelpOpen] = React.useState(false);

  const currentMonthName = MONTHS[new Date().getMonth()];

  // Satış grafiği verileri (Günlük, Haftalık, Aylık)
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

    return { chartData: [], chartSubtitle: "", totalSales: 0 };
  }, [chartMode, data?.sales_daily, data?.sales_monthly, data?.kpi?.month_sales]);

  // Döviz bilgileri
  const usdRate = Number(data?.rates?.USD) || Number(ratesQuery?.data?.USD?.forex_buying ?? 0) || 49.04;
  const eurRate = Number(data?.rates?.EUR) || Number(ratesQuery?.data?.EUR?.forex_buying ?? 0) || 55.40;
  const monthSalesTRY = Number(data?.kpi?.month_sales) || 0;
  const salesUSD = usdRate > 0 ? monthSalesTRY / usdRate : 0;
  const salesEUR = eurRate > 0 ? monthSalesTRY / eurRate : 0;
  const cashUSD = Number(data?.currency?.cash_usd) || 0;
  const cashEUR = Number(data?.currency?.cash_eur) || 0;

  // Bakiye & net durum
  const cashBankTRY = Number(data?.kpi?.cash_bank) || 0;
  const receivableTRY = Number(data?.kpi?.receivable) || 0;
  const payableTRY = Number(data?.kpi?.payable) || 0;
  const netStatus = receivableTRY - payableTRY;

  return (
    <div className="space-y-6">
      {/* 1. Başlık Alanı */}
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-white flex items-center justify-center shadow-soft shrink-0">
          <TrendingUp size={22} />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Genel Bakış</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">İşletmenizin anlık durumu</p>
        </div>
      </div>

      {/* 2. Dönem Özeti (Özet gizli / göster butonu) */}
      <section className="space-y-3" aria-label="Dönem özeti">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            aria-expanded={summaryOpen}
            onClick={() => setSummaryOpen((v) => !v)}
            title={summaryOpen ? "Özeti gizle" : "Özeti göster"}
            className="flex items-center gap-2 font-semibold rounded-lg -mx-1 px-1 hover:text-brand-600 transition-colors"
          >
            Özet
            {summaryOpen ? (
              <EyeOff size={17} className="text-brand-500" />
            ) : (
              <Eye size={17} className="text-brand-500" />
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
              href="/satislar"
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
              href="/masraflar"
              className="card p-3.5 hover:border-slate-400 dark:hover:border-slate-600 transition block cursor-pointer"
            >
              <div className="text-xs text-slate-400">Bu Ayki Masraflar</div>
              <div className="text-base sm:text-lg font-bold text-rose-500 mt-0.5 tabular-nums">
                {formatMoney(data?.kpi?.month_expenses ?? 0)}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Masraflara git →</span>
            </Link>

            <Link
              href="/raporlar"
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

      {/* 3. Üst 5 KPI Kartı (Pusulam Birebir Renk & Boyut) */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2.5 sm:gap-3">
        {/* 1. Ekim Cirosu */}
        <Link
          href="/satislar"
          className="rounded-2xl px-4 py-3 text-white bg-gradient-to-br from-amber-400 to-amber-500 shadow-soft min-w-0 overflow-hidden hover:opacity-95 transition block cursor-pointer"
        >
          <div className="text-lg sm:text-xl font-bold tabular-nums truncate">
            {formatMoney(data?.kpi?.month_sales ?? 0)}
          </div>
          <div className="text-xs font-medium opacity-90 mt-0.5 truncate">
            {currentMonthName} Cirosu
          </div>
        </Link>

        {/* 2. Ekim Masrafları */}
        <Link
          href="/masraflar"
          className="rounded-2xl px-4 py-3 text-white bg-gradient-to-br from-rose-400 to-rose-500 shadow-soft min-w-0 overflow-hidden hover:opacity-95 transition block cursor-pointer"
        >
          <div className="text-lg sm:text-xl font-bold tabular-nums truncate">
            {formatMoney(data?.kpi?.month_expenses ?? 0)}
          </div>
          <div className="text-xs font-medium opacity-90 mt-0.5 truncate">
            {currentMonthName} Masrafları
          </div>
        </Link>

        {/* 3. Bugünkü Tahsilat */}
        <Link
          href="/nakit/hareketler"
          className="rounded-2xl px-4 py-3 text-white bg-gradient-to-br from-blue-400 to-blue-500 shadow-soft min-w-0 overflow-hidden hover:opacity-95 transition block cursor-pointer"
        >
          <div className="text-lg sm:text-xl font-bold tabular-nums truncate">
            {formatMoney(data?.kpi?.today_collections ?? 0)}
          </div>
          <div className="text-xs font-medium opacity-90 mt-0.5 truncate">
            Bugünkü Tahsilat
          </div>
        </Link>

        {/* 4. Kasa / Banka (TL) */}
        <Link
          href="/hesaplar"
          className="rounded-2xl px-4 py-3 text-white bg-gradient-to-br from-emerald-400 to-emerald-500 shadow-soft min-w-0 overflow-hidden hover:opacity-95 transition block cursor-pointer"
        >
          <div className="text-lg sm:text-xl font-bold tabular-nums truncate">
            {formatMoney(cashBankTRY)}
          </div>
          <div className="text-xs font-medium opacity-90 mt-0.5 truncate">
            Kasa / Banka (TL)
          </div>
        </Link>

        {/* 5. Açık Hesap (Alacak) */}
        <Link
          href="/musteriler"
          className="rounded-2xl px-4 py-3 text-white bg-gradient-to-br from-brand-400 to-brand-600 shadow-soft min-w-0 overflow-hidden col-span-2 sm:col-span-1 lg:col-span-1 hover:opacity-95 transition block cursor-pointer"
        >
          <div className="text-lg sm:text-xl font-bold tabular-nums truncate">
            {formatMoney(receivableTRY)}
          </div>
          <div className="text-xs font-medium opacity-90 mt-0.5 truncate">
            Açık Hesap (Alacak)
          </div>
        </Link>
      </div>

      {/* 4. Satış Grafiği */}
      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="font-semibold flex items-center gap-2">
              <BarChart3 size={17} className="lucide lucide-chart-column text-brand-500" /> Satış Grafiği
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {chartSubtitle} · Toplam{" "}
              <span className="font-semibold text-brand-600 dark:text-brand-400">
                {formatMoney(totalSales)}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden text-xs font-bold">
              <button
                type="button"
                onClick={() => setChartMode("gun")}
                className={cn(
                  "px-3 py-1.5 transition",
                  chartMode === "gun"
                    ? "bg-brand-500 text-white"
                    : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                )}
              >
                Günlük
              </button>
              <button
                type="button"
                onClick={() => setChartMode("hafta")}
                className={cn(
                  "px-3 py-1.5 transition",
                  chartMode === "hafta"
                    ? "bg-brand-500 text-white"
                    : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                )}
              >
                Haftalık
              </button>
              <button
                type="button"
                onClick={() => setChartMode("ay")}
                className={cn(
                  "px-3 py-1.5 transition",
                  chartMode === "ay"
                    ? "bg-brand-500 text-white"
                    : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                )}
              >
                Aylık
              </button>
            </div>

            <Link className="text-xs font-semibold text-brand-600 hover:underline" href="/raporlar">
              Detaylı rapor →
            </Link>
          </div>
        </div>

        <div className="h-[220px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <defs>
                <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0f9b8e" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#0f9b8e" stopOpacity={0.02} />
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
                  backgroundColor: "#ffffff",
                  borderRadius: "12px",
                  border: "none",
                  boxShadow: "rgba(0, 0, 0, 0.1) 0px 4px 20px",
                }}
              />
              <Area
                type="monotone"
                dataKey="satış"
                name="Satış"
                stroke="#0f9b8e"
                strokeWidth={2.5}
                fill="url(#salesFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 5. En Çok Satan Ürünler */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">En Çok Satan Ürünler</h2>
          <Link className="text-xs font-semibold text-brand-600 hover:underline" href="/raporlar">
            Tüm rapor →
          </Link>
        </div>

        {(!data?.top_products || data.top_products.length === 0) ? (
          <p className="text-sm text-slate-400 py-4 text-center">Bu ay henüz satış yok.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {data.top_products.slice(0, 4).map((p: any, idx: number) => (
              <Link
                key={p.id || idx}
                href={`/urunler?q=${encodeURIComponent(p.name)}`}
                className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 hover:border-brand-500/50 transition block group"
              >
                <div className="text-[10px] font-bold text-slate-400">#{idx + 1}</div>
                <div
                  className="font-semibold text-sm truncate mt-0.5 text-slate-900 dark:text-slate-100 group-hover:text-brand-600 transition-colors"
                  title={p.name}
                >
                  {p.name}
                </div>
                <div className="text-xs text-slate-500 mt-1">{formatQty(p.quantity)} adet</div>
                <div className="text-sm font-bold text-brand-600 mt-1">{formatMoney(p.amount)}</div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* 6. Döviz Özeti */}
      <div className="card p-5">
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <DollarSign size={17} className="lucide lucide-dollar-sign text-blue-500" /> Döviz Özeti
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-xs text-slate-400">Bu ay satış (USD)</div>
            <div className="font-bold text-blue-600 dark:text-blue-400 mt-0.5">
              ${formatNumber(salesUSD)}
            </div>
            <div className="text-[11px] text-slate-400">
              ≈ {formatMoney(monthSalesTRY)}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Bu ay satış (EUR)</div>
            <div className="font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
              €{formatNumber(salesEUR)}
            </div>
            <div className="text-[11px] text-slate-400">
              ≈ {formatMoney(monthSalesTRY)}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">
              Kasa USD · 1$ = {formatNumber(usdRate)} ₺
            </div>
            <div className="font-bold mt-0.5">${formatNumber(cashUSD)}</div>
            <div className="text-[11px] text-slate-400">
              ≈ {formatMoney(cashUSD * usdRate)}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">
              Kasa EUR · 1€ = {formatNumber(eurRate)} ₺
            </div>
            <div className="font-bold mt-0.5">€{formatNumber(cashEUR)}</div>
            <div className="text-[11px] text-slate-400">
              ≈ {formatMoney(cashEUR * eurRate)}
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-3">
          Aylık ciro ve kasa toplamı döviz belgeleri kayıtlı kurla TL&apos;ye çevrilir. Güncel kur: Ayarlar → Canlı Kuru Çek.
        </p>
      </div>

      {/* 7. Cari Bakiye Kartları (Toplam Alacak, Borç, Net Durum) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Link
          href="/musteriler"
          className="card p-5 hover:border-slate-400 dark:hover:border-slate-600 transition block cursor-pointer"
        >
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Toplam Alacak (Müşteriler)
          </div>
          <div className="text-2xl font-bold text-emerald-500 mt-1 tabular-nums">
            {formatMoney(receivableTRY)}
          </div>
        </Link>

        <Link
          href="/tedarikciler"
          className="card p-5 hover:border-slate-400 dark:hover:border-slate-600 transition block cursor-pointer"
        >
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Toplam Borç (Tedarikçiler)
          </div>
          <div className="text-2xl font-bold text-rose-500 mt-1 tabular-nums">
            {formatMoney(payableTRY)}
          </div>
        </Link>

        <Link
          href="/raporlar"
          className="card p-5 hover:border-slate-400 dark:hover:border-slate-600 transition block cursor-pointer"
        >
          <div className="text-sm text-slate-500 dark:text-slate-400">Net Durum</div>
          <div className="text-2xl font-bold mt-1 text-brand-500 tabular-nums">
            {formatMoney(netStatus)}
          </div>
        </Link>
      </div>

      {/* 8. Son Hareketler & Yaklaşan / Geciken Ödemeler */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sol: Son Hareketler */}
        <div className="card p-5">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Clock size={17} className="lucide lucide-clock text-brand-500" /> Son Hareketler
          </h2>
          {(!data?.recent || data.recent.length === 0) ? (
            <p className="text-sm text-slate-400 py-6 text-center">Henüz hareket yok.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.recent.slice(0, 10).map((t: any) => {
                const isPositive = Number(t.amount) >= 0;
                const isMoneyTxn = t.kind === "transaction" || t.type === "collection" || t.type === "payment";

                // Başlık
                let titleText = t.party || "İşlem";
                if (t.type === "pos_sale") titleText = `Hızlı satış · ${t.party || "Perakende"}`;
                else if (t.type === "sales_invoice" || t.type === "sale") titleText = `Satış · ${t.party || "Müşteri"}`;
                else if (t.type === "purchase_invoice" || t.type === "purchase") titleText = `Alış · ${t.party || "Tedarikçi"}`;
                else if (t.type === "expense" || t.type === "salary") titleText = `Masraf · ${t.party || "Gider"}`;
                else if (t.type === "collection") titleText = `Tahsilat · ${t.party || "Müşteri"}`;
                else if (t.type === "payment") titleText = `Ödeme · ${t.party || "Tedarikçi"}`;

                // Alt açıklama
                const dateStr = formatDate(t.date);
                const descPart = t.description ? ` · ${t.description}` : (t.number ? ` · ${t.number}` : "");
                const methodStr = t.method === "credit_card" ? " · Kredi Kartı" : t.method === "bank_transfer" ? " · Banka" : t.method === "cash" ? " · Nakit" : "";
                const subText = `${dateStr}${descPart}${methodStr}`;

                return (
                  <div key={t.id} className="flex items-center gap-3 py-2.5">
                    <div
                      className={cn(
                        "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                        isMoneyTxn
                          ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500"
                          : "bg-brand-50 dark:bg-brand-900/30 text-brand-500"
                      )}
                    >
                      {isMoneyTxn ? <HandCoins size={16} /> : <FileText size={16} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{titleText}</div>
                      <div className="text-xs text-slate-400 truncate">{subText}</div>
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
                  </div>
                );
              })}
            </div>
          )}
          <p className="mt-2 text-[11px] text-slate-400">
            Tahsilat, masraf ve para hareketleri şube bilgisi taşımaz; her şubede görünür.
          </p>
        </div>

        {/* Sağ: Yaklaşan / Geciken Ödemeler */}
        <div className="card p-5">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <CalendarClock size={17} className="lucide lucide-calendar-clock text-rose-500" /> Yaklaşan / Geciken Ödemeler
          </h2>
          {(!data?.timeline || data.timeline.length === 0) ? (
            <p className="text-sm text-slate-400 py-6 text-center">Ödenecek masraf yok.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.timeline.slice(0, 6).map((t: any) => {
                const isOverdue = t.days_overdue > 0;
                return (
                  <div key={t.id} className="flex items-center gap-3 py-2.5">
                    <div
                      className={cn(
                        "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                        isOverdue
                          ? "bg-rose-50 dark:bg-rose-900/30 text-rose-500"
                          : "bg-amber-50 dark:bg-amber-900/30 text-amber-500"
                      )}
                    >
                      <CalendarClock size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{t.party || "Ödeme"}</div>
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
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 9. Kritik Stok Uyarısı */}
      {data?.critical_stock && data.critical_stock.length > 0 && (
        <div className="card p-5 border-l-4 border-l-amber-400">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold mb-3">
            <TriangleAlert size={18} className="lucide lucide-triangle-alert" />
            Kritik Stok Uyarısı ({data.critical_stock.length})
            <Link className="ml-auto text-xs font-medium text-brand-600 hover:underline" href="/urunler?filtre=kritik">
              Tümünü gör →
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.critical_stock.map((p: any) => (
              <Link
                key={p.id}
                className="chip bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:ring-1 hover:ring-amber-400"
                href="/urunler?filtre=kritik"
              >
                {p.name} · {formatQty(p.stock_qty)} ad
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 10. Modüller (Pusulam 23 Adet Modül Kartı Grid) */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">
          Modüller
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3">
          {MODULES.map((m) => (
            <Link
              key={m.href}
              className="card p-3 sm:p-4 flex flex-col items-center gap-2 hover:shadow-soft hover:-translate-y-0.5 transition group min-w-0"
              href={m.href}
            >
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-brand-50 dark:group-hover:bg-brand-900/30 transition shrink-0">
                <m.icon size={20} className={cn(m.iconColor, m.extraClass)} />
              </div>
              <span className="text-[11px] sm:text-xs font-semibold text-center text-slate-600 dark:text-slate-300 leading-tight line-clamp-2">
                {m.title}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* 11. Sayfa Yardım Butonu (Pusulam Birebir Sağ Alt Popover) */}
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
                  İşletmenizin anlık özeti. Bu ayki ciro, masraf, tahsilat, kritik stok ve yaklaşan ödemeleri tek bakışta görürsünüz.
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
                    <span>Kritik stok uyarıları</span>
                  </li>
                  <li className="flex gap-2 text-slate-600 dark:text-slate-300">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
                    <span>Son hareketler ve satış grafiği</span>
                  </li>
                  <li className="flex gap-2 text-slate-600 dark:text-slate-300">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
                    <span>Kurulum kontrol listesi (ilk kullanım)</span>
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
            className="h-9 w-9 rounded-full flex items-center justify-center border transition bg-white/70 dark:bg-slate-900/70 border-slate-200/60 dark:border-slate-700/60 text-slate-400/70 hover:text-slate-500 hover:border-slate-300 dark:hover:text-slate-300"
          >
            <CircleHelp size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
