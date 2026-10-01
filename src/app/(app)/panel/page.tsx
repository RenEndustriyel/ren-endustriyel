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
  FileText,
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
  CircleHelp,
  X,
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

export default function PanelPage() {
  const { org } = useOrg();
  const { data } = useDashboard(org?.id || "");
  const [summaryOpen, setSummaryOpen] = React.useState(false);
  const [chartMode, setChartMode] = React.useState<"gun" | "hafta" | "ay">("gun");
  const [helpOpen, setHelpOpen] = React.useState(false);

  const currentMonthName = MONTHS[new Date().getMonth()];

  // Satış grafiği verileri
  const chartData = React.useMemo(() => {
    if (!data?.sales_daily || data.sales_daily.length === 0) {
      // Fallback 14 günlük boş/örnek grafik
      return Array.from({ length: 14 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (13 - i));
        return {
          name: d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" }),
          satış: 0,
        };
      });
    }
    return data.sales_daily.map((d: any) => ({
      name: new Date(d.date).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }),
      satış: Number(d.amount) || 0,
    }));
  }, [data?.sales_daily]);

  const totalSales = chartData.reduce((acc, curr) => acc + curr.satış, 0);

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

  // Modüller listesi (Pusulam 1:1, toplam 23 modül)
  const modules = [
    { to: "/yapay-zeka", label: "REN AI", icon: Sparkles, color: "text-purple-500 animate-pulse-slow" },
    { to: "/hizli-satis", label: "Hızlı Satış", icon: Zap, color: "text-amber-500" },
    { to: "/stok/urunler", label: "Ürünler", icon: Tag, color: "text-violet-500" },
    { to: "/giderler/alis-faturalari", label: "Alışlar", icon: Scale, color: "text-amber-500" },
    { to: "/satislar/faturalar", label: "Satışlar", icon: ShoppingCart, color: "text-emerald-500" },
    { to: "/giderler/masraflar", label: "Masraflar", icon: Banknote, color: "text-rose-500" },
    { to: "/e-fatura", label: "e-Fatura", icon: FileCheck, color: "text-teal-600" },
    { to: "/stok/depolar", label: "Şubeler", icon: Building2, color: "text-sky-600" },
    { to: "/stok/hareketler", label: "Stoklar", icon: Warehouse, color: "text-cyan-500" },
    { to: "/cariler/musteriler", label: "Müşteriler", icon: Users, color: "text-sky-500" },
    { to: "/cariler/tedarikciler", label: "Tedarikçiler", icon: Truck, color: "text-indigo-500" },
    { to: "/satislar/teklifler", label: "Teklifler", icon: FileText, color: "text-purple-500" },
    { to: "/nakit/cek-senet", label: "Çek & Senet", icon: ScrollText, color: "text-orange-600" },
    { to: "/nakit/hesaplar", label: "Hesaplar", icon: Wallet, color: "text-teal-500" },
    { to: "/nakit/ekstre", label: "Banka Ekstresi", icon: Landmark, color: "text-emerald-600" },
    { to: "/cari-kampanya", label: "Kampanya", icon: Megaphone, color: "text-rose-500" },
    { to: "/cari-hatirlatmalar", label: "Hatırlatmalar", icon: Bell, color: "text-amber-600" },
    { to: "/raporlar", label: "Raporlar", icon: BarChart3, color: "text-fuchsia-500" },
    { to: "/ajanda", label: "Ajanda (Takvim & Notlar)", icon: Calendar, color: "text-blue-500" },
    { to: "/e-ticaret", label: "E-Ticaret", icon: Store, color: "text-orange-500" },
    { to: "/giderler/calisanlar", label: "Çalışanlar & Ekip", icon: UsersRound, color: "text-indigo-500" },
    { to: "/akademi", label: "Akademi", icon: GraduationCap, color: "text-indigo-600" },
    { to: "/muhasebeci-agi", label: "Muhasebeci Ağı", icon: Briefcase, color: "text-violet-600" },
  ];

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
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-xs">
              <div className="text-xs text-slate-400">Bugünkü Satış</div>
              <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                {formatMoney(
                  data?.sales_daily?.find((d) => d.date === new Date().toISOString().slice(0, 10))?.amount ?? 0
                )}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-xs">
              <div className="text-xs text-slate-400">Bugünkü Tahsilat</div>
              <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {formatMoney(data?.kpi?.today_collections ?? 0)}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-xs">
              <div className="text-xs text-slate-400">Bu Ayki Masraflar</div>
              <div className="text-base font-bold text-rose-500 mt-0.5">
                {formatMoney(data?.kpi?.month_expenses ?? 0)}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-xs">
              <div className="text-xs text-slate-400">Bu Ay Net Fark</div>
              <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {formatMoney((data?.kpi?.month_sales ?? 0) - (data?.kpi?.month_expenses ?? 0))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 3. Üst 5 KPI Kartı (Pusulam Birebir) */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2.5 sm:gap-3">
        {/* Ekim Cirosu */}
        <div className="rounded-2xl px-4 py-3 text-white bg-gradient-to-br from-amber-400 to-amber-500 shadow-soft min-w-0 overflow-hidden">
          <div className="text-lg sm:text-xl font-bold tabular-nums truncate">
            {formatMoney(data?.kpi?.month_sales ?? 0)}
          </div>
          <div className="text-xs font-medium opacity-90 mt-0.5 truncate">
            {currentMonthName} Cirosu
          </div>
        </div>

        {/* Ekim Masrafları */}
        <div className="rounded-2xl px-4 py-3 text-white bg-gradient-to-br from-rose-400 to-rose-500 shadow-soft min-w-0 overflow-hidden">
          <div className="text-lg sm:text-xl font-bold tabular-nums truncate">
            {formatMoney(data?.kpi?.month_expenses ?? 0)}
          </div>
          <div className="text-xs font-medium opacity-90 mt-0.5 truncate">
            {currentMonthName} Masrafları
          </div>
        </div>

        {/* Bugünkü Tahsilat */}
        <div className="rounded-2xl px-4 py-3 text-white bg-gradient-to-br from-blue-400 to-blue-500 shadow-soft min-w-0 overflow-hidden">
          <div className="text-lg sm:text-xl font-bold tabular-nums truncate">
            {formatMoney(data?.kpi?.today_collections ?? 0)}
          </div>
          <div className="text-xs font-medium opacity-90 mt-0.5 truncate">
            Bugünkü Tahsilat
          </div>
        </div>

        {/* Kasa / Banka (TL) */}
        <div className="rounded-2xl px-4 py-3 text-white bg-gradient-to-br from-slate-600 to-slate-700 shadow-soft min-w-0 overflow-hidden">
          <div className="text-lg sm:text-xl font-bold tabular-nums truncate">
            {formatMoney(cashBankTRY)}
          </div>
          <div className="text-xs font-medium opacity-90 mt-0.5 truncate">
            Kasa / Banka (TL)
          </div>
        </div>

        {/* Açık Hesap (Alacak) */}
        <div className="rounded-2xl px-4 py-3 text-white bg-gradient-to-br from-slate-700 to-slate-900 shadow-soft min-w-0 overflow-hidden col-span-2 md:col-span-1 lg:col-span-1">
          <div className="text-lg sm:text-xl font-bold tabular-nums truncate">
            {formatMoney(receivableTRY)}
          </div>
          <div className="text-xs font-medium opacity-90 mt-0.5 truncate">
            Açık Hesap (Alacak)
          </div>
        </div>
      </div>

      {/* 4. Satış Grafiği */}
      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="font-semibold flex items-center gap-2 text-slate-800 dark:text-slate-100">
              <BarChart3 size={17} className="text-slate-700 dark:text-slate-300" /> Satış Grafiği
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Son 14 gün (TL) · Toplam{" "}
              <span className="font-semibold text-slate-800 dark:text-slate-200">
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
                    ? "bg-slate-900 text-white font-bold"
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
                    ? "bg-slate-900 text-white font-bold"
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
                    ? "bg-slate-900 text-white font-bold"
                    : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                )}
              >
                Aylık
              </button>
            </div>
            <Link
              href="/raporlar"
              className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:underline"
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

      {/* 5. Döviz Özeti */}
      <div className="card p-5">
        <h2 className="font-semibold mb-3 flex items-center gap-2 text-slate-800 dark:text-slate-100">
          <DollarSign size={17} className="text-blue-500" /> Döviz Özeti
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-xs text-slate-400">Bu ay satış (USD)</div>
            <div className="font-bold text-blue-600 dark:text-blue-400 mt-0.5">
              ${monthSalesUSD.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-400">
              ≈ {formatMoney(monthSalesUSD * usdRate)}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Bu ay satış (EUR)</div>
            <div className="font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
              €{monthSalesEUR.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-400">
              ≈ {formatMoney(monthSalesEUR * eurRate)}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">
              Kasa USD · 1$ = {usdRate.toFixed(2)} ₺
            </div>
            <div className="font-bold mt-0.5 text-slate-800 dark:text-slate-100">
              $0,00
            </div>
            <div className="text-[11px] text-slate-400">≈ 0,00 TL</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">
              Kasa EUR · 1€ = {eurRate.toFixed(2)} ₺
            </div>
            <div className="font-bold mt-0.5 text-slate-800 dark:text-slate-100">
              €0,00
            </div>
            <div className="text-[11px] text-slate-400">≈ 0,00 TL</div>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-3">
          Aylık ciro ve kasa toplamı döviz belgeleri kayıtlı kurla TL'ye çevrilir. Güncel kur: Ayarlar → Canlı Kuru Çek.
        </p>
      </div>

      {/* 6. Cari Bakiye Kartları (3 Kart) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Toplam Alacak (Müşteriler)
          </div>
          <div className="text-2xl font-bold text-emerald-500 mt-1">
            {formatMoney(receivableTRY)}
          </div>
        </div>
        <div className="card p-5">
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Toplam Borç (Tedarikçiler)
          </div>
          <div className="text-2xl font-bold text-rose-500 mt-1">
            {formatMoney(payableTRY)}
          </div>
        </div>
        <div className="card p-5">
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Net Durum
          </div>
          <div
            className={cn(
              "text-2xl font-bold mt-1",
              netStatus >= 0 ? "text-slate-800 dark:text-slate-200" : "text-rose-500"
            )}
          >
            {formatMoney(netStatus)}
          </div>
        </div>
      </div>

      {/* 7. Son Hareketler & Yaklaşan / Geciken Ödemeler (2 Sütunlu Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sol Sütun: Son Hareketler */}
        <div className="card p-5">
          <h2 className="font-semibold mb-3 flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <Clock size={17} className="text-slate-700 dark:text-slate-300" /> Son Hareketler
          </h2>
          {(!data?.recent || data.recent.length === 0) ? (
            <p className="text-sm text-slate-400 py-6 text-center">
              Henüz hareket yok.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.recent.slice(0, 10).map((t: any) => {
                const isPositive = t.amount >= 0;
                return (
                  <div key={t.id} className="flex items-center gap-3 py-2.5">
                    <div
                      className={cn(
                        "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                        isPositive
                          ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                          : "bg-rose-50 dark:bg-rose-900/30 text-rose-500"
                      )}
                    >
                      <FileText size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate text-slate-800 dark:text-slate-200">
                        {t.party || t.type}
                      </div>
                      <div className="text-xs text-slate-400 truncate">
                        {formatDate(t.date)} {t.number && `· ${t.number}`}
                      </div>
                    </div>
                    <div
                      className={cn(
                        "font-semibold text-sm shrink-0",
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

        {/* Sağ Sütun: Yaklaşan / Geciken Ödemeler */}
        <div className="card p-5">
          <h2 className="font-semibold mb-3 flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <CalendarClock size={17} className="text-rose-500" /> Yaklaşan / Geciken Ödemeler
          </h2>
          {(!data?.timeline || data.timeline.length === 0) ? (
            <p className="text-sm text-slate-400 py-6 text-center">
              Ödenecek masraf yok.
            </p>
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
                      <div className="text-sm font-medium truncate text-slate-800 dark:text-slate-200">
                        {t.party || "Ödeme"}
                      </div>
                      <div className="text-xs text-slate-400 truncate">
                        Vade: {formatDate(t.due_date)} {isOverdue && "(Gecikmiş)"}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-semibold text-sm text-rose-500">
                        {formatMoney(t.amount)}
                      </div>
                      {isOverdue && (
                        <span className="text-[10px] text-rose-500 font-semibold">
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

      {/* 8. Kritik Stok Uyarısı Banner */}
      {data?.critical_stock && data.critical_stock.length > 0 && (
        <div className="card p-5 border-l-4 border-l-amber-400">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold mb-3">
            <TriangleAlert size={18} />
            <span>Kritik Stok Uyarısı ({data.critical_stock.length})</span>
            <Link
              href="/stok/urunler"
              className="ml-auto text-xs font-medium text-slate-700 dark:text-slate-300 hover:underline"
            >
              Tümünü gör →
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.critical_stock.slice(0, 8).map((p: any) => (
              <Link
                key={p.id}
                href={`/stok/urunler/detay?id=${p.id}`}
                className="chip bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:ring-1 hover:ring-amber-400"
              >
                {p.name} · {p.stock_qty} ad
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 9. Modüller (23 Modüllü Pusulam Izgarası) */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">
          Modüller
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3">
          {modules.map((t) => {
            const Icon = t.icon;
            return (
              <Link
                key={t.to}
                href={t.to}
                className="card p-3 sm:p-4 flex flex-col items-center gap-2 hover:shadow-soft hover:-translate-y-0.5 transition group min-w-0"
              >
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-slate-200/60 dark:group-hover:bg-slate-700 transition shrink-0">
                  <Icon size={20} className={t.color} />
                </div>
                <span className="text-[11px] sm:text-xs font-semibold text-center text-slate-600 dark:text-slate-300 leading-tight line-clamp-2">
                  {t.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 10. Sayfa Yardım Butonu (Pusulam Birebir Sağ Alt Buton & Popover) */}
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
            className="h-9 w-9 rounded-full flex items-center justify-center border transition bg-white/70 dark:bg-slate-900/70 border-slate-200/60 dark:border-slate-700/60 text-slate-400/70 hover:text-slate-500 hover:border-slate-300 dark:hover:text-slate-300 shadow-sm"
          >
            <CircleHelp size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
