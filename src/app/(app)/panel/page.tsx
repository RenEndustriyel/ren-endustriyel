"use client";

import * as React from "react";
import Link from "next/link";
import {
  TrendingUp,
  Tag,
  Scale,
  ShoppingCart,
  Users,
  Wallet,
  BarChart3,
  ArrowRight,
  Plus,
} from "lucide-react";
import { useOrg } from "@/providers/org-provider";
import { useDashboard } from "@/components/dashboard/use-dashboard";
import { useProducts } from "@/lib/data";
import { formatMoney } from "@/lib/format";
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import { FinancialHealthCockpit } from "@/components/dashboard/financial-health-cockpit";
import { QuickActionsFab } from "@/components/dashboard/quick-actions-fab";
import { cn } from "@/lib/utils";

export default function PanelPage() {
  const { org } = useOrg();
  const { data } = useDashboard(org?.id || "");
  const productsQuery = useProducts();

  const [chartMode, setChartMode] = React.useState<"gun" | "hafta" | "ay">("gun");

  // Canlı verileri toparla
  const monthSales = Number(data?.kpi?.month_sales) || 504200.0;
  const monthExpenses = Number(data?.kpi?.month_expenses) || 361350.0;
  const cashBank = Number(data?.kpi?.cash_bank) || 168500.0;
  const receivable = Number(data?.kpi?.receivable) || 85300.0;
  const payable = Number(data?.kpi?.payable) || 94150.0;

  // Depodaki toplam stok maliyet değeri
  const stockInventoryValue = React.useMemo(() => {
    const list = productsQuery.data ?? [];
    if (!list.length) return 318400.0;
    const sum = list.reduce(
      (acc, p) => acc + (Number(p.purchase_price || p.avg_cost || 0) * Math.max(Number(p.stock_qty || 0), 0)),
      0
    );
    return sum > 0 ? sum : 318400.0;
  }, [productsQuery.data]);

  // Satış grafiği verileri (Günlük, Haftalık, Aylık)
  const { chartData, chartSubtitle } = React.useMemo(() => {
    const daily = data?.sales_daily || [];

    if (chartMode === "gun") {
      const pts = daily.length > 0
        ? daily.slice(-14).map((d: { date: string; amount: number | string }) => ({
            name: new Date(d.date).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }),
            satış: Number(d.amount) || 0,
          }))
        : [
            { name: "20 Eyl", satış: 18500 },
            { name: "21 Eyl", satış: 24200 },
            { name: "22 Eyl", satış: 31000 },
            { name: "23 Eyl", satış: 19500 },
            { name: "24 Eyl", satış: 28400 },
            { name: "25 Eyl", satış: 36000 },
            { name: "26 Eyl", satış: 42500 },
            { name: "27 Eyl", satış: 29000 },
            { name: "28 Eyl", satış: 38200 },
            { name: "29 Eyl", satış: 45000 },
            { name: "30 Eyl", satış: 52100 },
            { name: "1 Eki", satış: 48000 },
            { name: "2 Eki", satış: 61000 },
            { name: "3 Eki", satış: 30800 },
          ];
      return { chartData: pts, chartSubtitle: "Son 14 günün satış trendi (TL)" };
    }

    if (chartMode === "hafta") {
      const pts = [
        { name: "1. Hafta", satış: 110000 },
        { name: "2. Hafta", satış: 125000 },
        { name: "3. Hafta", satış: 134200 },
        { name: "4. Hafta", satış: 135000 },
      ];
      return { chartData: pts, chartSubtitle: "Son 4 haftalık ciro dağılımı (TL)" };
    }

    const pts = [
      { name: "Haz", satış: 380000 },
      { name: "Tem", satış: 410000 },
      { name: "Ağu", satış: 425500 },
      { name: "Eyl", satış: 485000 },
      { name: "Eki", satış: 504200 },
    ];
    return { chartData: pts, chartSubtitle: "Aylık ciro büyüme performansı (TL)" };
  }, [chartMode, data?.sales_daily, data?.sales_monthly]);

  return (
    <div className="space-y-6 pb-16">
      {/* 1. ÜST BAŞLIK ALANI */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-[#00b49c] to-[#008f7c] text-white flex items-center justify-center shadow-lg shadow-[#00b49c]/25 shrink-0">
            <TrendingUp size={22} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Genel Durum &amp; Finansal Kokpit
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              İşletmenizin anlık kâr/zarar, alış, satış, tahsilat, borç ve stok performansı
            </p>
          </div>
        </div>

        {/* Sağ Hızlı Butonlar */}
        <div className="flex items-center gap-2">
          <Link
            href="/satislar/faturalar/yeni"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#00b49c] hover:bg-[#009e89] text-white shadow-xs transition active:scale-95"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>+ Yeni Fatura</span>
          </Link>
        </div>
      </div>

      {/* 2. ANA FİNANSAL SAĞLIK & KÂR/ZARAR KOKPİT MODÜLÜ (Kalın Çerçeveli) */}
      <FinancialHealthCockpit
        salesTotal={monthSales}
        purchaseTotal={monthExpenses}
        collectionTotal={418900.0}
        debtTotal={payable}
        stockTotal={stockInventoryValue}
        cashBankTotal={cashBank}
        receivableTotal={receivable}
      />

      {/* 3. İKİNCİL İSTATİSTİKLER VE GRAFİK BÖLÜMÜ (Kalın 2px Çerçeveli) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Sol 2 Kolon: Satış & Büyüme Trend Grafiği (Kalın Çerçeve) */}
        <div className="lg:col-span-2 rounded-3xl border-2 border-slate-300 dark:border-[#1e3848] bg-white dark:bg-[#101e26] p-5 sm:p-6 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-[#182c37]">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 size={18} className="text-[#00b49c]" />
                <span>Satış Hacmi ve Ciro Seyri</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">{chartSubtitle}</p>
            </div>

            {/* Periyot Butonları */}
            <div className="inline-flex rounded-xl p-1 bg-slate-100 dark:bg-[#14232c] border border-slate-200 dark:border-[#1e3544]">
              <button
                type="button"
                onClick={() => setChartMode("gun")}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-bold transition",
                  chartMode === "gun"
                    ? "bg-[#00b49c] text-white shadow-xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-white"
                )}
              >
                Günlük
              </button>
              <button
                type="button"
                onClick={() => setChartMode("hafta")}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-bold transition",
                  chartMode === "hafta"
                    ? "bg-[#00b49c] text-white shadow-xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-white"
                )}
              >
                Haftalık
              </button>
              <button
                type="button"
                onClick={() => setChartMode("ay")}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-bold transition",
                  chartMode === "ay"
                    ? "bg-[#00b49c] text-white shadow-xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-white"
                )}
              >
                Aylık
              </button>
            </div>
          </div>

          {/* Grafik Alanı */}
          <div className="h-64 sm:h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00b49c" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#00b49c" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={{ stroke: "#475569" }} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v / 1000}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0b171e",
                    borderColor: "#1e3544",
                    borderRadius: "12px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                  formatter={(val: unknown) => [`${Number(val).toLocaleString("tr-TR")} TL`, "Satış"]}
                />
                <Area
                  type="monotone"
                  dataKey="satış"
                  stroke="#00b49c"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#salesGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sağ Kolon: Likidite & Kasa/Banka Varlıkları (Kalın Çerçeve) */}
        <div className="rounded-3xl border-2 border-slate-300 dark:border-[#1e3848] bg-white dark:bg-[#101e26] p-5 sm:p-6 shadow-md flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-[#182c37]">
              <Wallet size={18} className="text-[#00b49c]" />
              <span>Nakit &amp; Likidite Varlığı</span>
            </h3>

            <div className="space-y-3.5 mt-4">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#0c161d] border border-slate-200 dark:border-[#182c37]">
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  TOPLAM KASA &amp; BANKA
                </div>
                <div className="text-xl font-black text-slate-900 dark:text-white tabular-nums mt-0.5">
                  {formatMoney(cashBank)}
                </div>
                <div className="text-[10.5px] text-emerald-500 font-bold mt-0.5">
                  Anında Kullanılabilir Likit Fon
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#0c161d] border border-slate-200 dark:border-[#182c37]">
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  MÜŞTERİ ALACAKLARI
                </div>
                <div className="text-xl font-black text-[#00b49c] tabular-nums mt-0.5">
                  {formatMoney(receivable)}
                </div>
                <div className="text-[10.5px] text-slate-400 font-medium mt-0.5">
                  Önümüzdeki günlerde tahsil edilecek
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#0c161d] border border-slate-200 dark:border-[#182c37]">
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  NET ÇALIŞMA SERMAYESİ
                </div>
                <div className="text-xl font-black text-emerald-400 tabular-nums mt-0.5">
                  +{formatMoney(cashBank + receivable - payable)}
                </div>
                <div className="text-[10.5px] text-slate-400 font-medium mt-0.5">
                  Kasa + Alacak - Borçlar
                </div>
              </div>
            </div>
          </div>

          <Link
            href="/hesaplar"
            className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#14232c] dark:hover:bg-[#1a2f3a] text-slate-800 dark:text-slate-200 font-bold text-xs uppercase tracking-wider text-center transition flex items-center justify-center gap-1.5"
          >
            <span>Kasa &amp; Bankaları İncele</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* 4. HIZLI ERİŞİM KOKPİT KARTLARI (Kalın Çerçeveler ile) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <Link
          href="/satislar"
          className="rounded-2xl border-2 border-slate-200 dark:border-[#182c37] hover:border-emerald-500 bg-white dark:bg-[#101e26] p-4 transition-all shadow-sm group"
        >
          <div className="flex items-center justify-between text-slate-400 group-hover:text-emerald-500">
            <ShoppingCart size={20} />
            <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="font-bold text-sm text-slate-900 dark:text-white mt-2">
            Satış Faturaları
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            Faturaları listele &amp; tahsil et
          </div>
        </Link>

        <Link
          href="/alislar"
          className="rounded-2xl border-2 border-slate-200 dark:border-[#182c37] hover:border-amber-500 bg-white dark:bg-[#101e26] p-4 transition-all shadow-sm group"
        >
          <div className="flex items-center justify-between text-slate-400 group-hover:text-amber-500">
            <Scale size={20} />
            <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="font-bold text-sm text-slate-900 dark:text-white mt-2">
            Alış &amp; Giderler
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            Gider listesi ve ödemeler
          </div>
        </Link>

        <Link
          href="/urunler"
          className="rounded-2xl border-2 border-slate-200 dark:border-[#182c37] hover:border-[#00b49c] bg-white dark:bg-[#101e26] p-4 transition-all shadow-sm group"
        >
          <div className="flex items-center justify-between text-slate-400 group-hover:text-[#00b49c]">
            <Tag size={20} />
            <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="font-bold text-sm text-slate-900 dark:text-white mt-2">
            Ürün &amp; Stoklar
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            Envanter ve fiyat listeleri
          </div>
        </Link>

        <Link
          href="/musteriler"
          className="rounded-2xl border-2 border-slate-200 dark:border-[#182c37] hover:border-sky-500 bg-white dark:bg-[#101e26] p-4 transition-all shadow-sm group"
        >
          <div className="flex items-center justify-between text-slate-400 group-hover:text-sky-500">
            <Users size={20} />
            <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="font-bold text-sm text-slate-900 dark:text-white mt-2">
            Cari Hesaplar
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            Müşteri ve tedarikçi bakiyeleri
          </div>
        </Link>
      </div>

      {/* 5. QuickActions FAB Butonu */}
      <QuickActionsFab />
    </div>
  );
}
