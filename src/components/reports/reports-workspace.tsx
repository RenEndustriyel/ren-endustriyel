"use client";

import * as React from "react";
import Link from "next/link";
import {
  Download,
  CircleHelp,
  X,
  TrendingUp,
  BarChart3,
  Calendar,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useRows, type Row } from "@/lib/data";
import { formatMoney } from "@/lib/format";
import { exportExcel } from "@/lib/excel";
import { toast } from "sonner";
import { IncomeExpenseReport } from "./income-expense";
import { CashFlowReport } from "./cash-flow";
import { VatReport } from "./vat";
import { BalancesReport } from "./balances";
import { SalesReport } from "./sales";
import { StockReport } from "./stock";

const MONTH_NAMES = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const FULL_MONTH_NAMES = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

export function ReportsWorkspace() {
  const [activeTab, setActiveTab] = React.useState<
    | "genel"
    | "kar-zarar"
    | "nakit-akisi"
    | "kdv"
    | "karlilik"
    | "kasa"
    | "cek-senet"
    | "yaslandirma"
    | "borc-alacak"
    | "pos"
    | "en-cok-satan"
  >("genel");

  const [period, setPeriod] = React.useState<"gunluk" | "haftalik" | "aylik">("aylik");
  const [helpOpen, setHelpOpen] = React.useState(false);

  // Fetch all documents for financial calculations
  const docsQuery = useRows<Row<"documents">>("documents", {
    params: ["reports_financial_docs"],
    select: "id, doc_type, issue_date, total, status, category_id, number, description, total_try",
    order: [{ column: "issue_date", ascending: false }],
  });

  const categoriesQuery = useRows<Row<"categories">>("categories", {
    params: ["categories_all"],
  });

  const docs = docsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const catMap = new Map(categories.map((c) => [c.id, c.name]));

  const now = new Date();
  const currentMonthIdx = now.getMonth();
  const currentMonthName = FULL_MONTH_NAMES[currentMonthIdx];

  // Current month totals
  const currentMonthKey = `${now.getFullYear()}-${String(currentMonthIdx + 1).padStart(2, "0")}`;

  const currentMonthDocs = docs.filter((d) => (d.issue_date ?? "").startsWith(currentMonthKey));

  const currentMonthSales = currentMonthDocs
    .filter((d) => d.doc_type === "sales_invoice" || d.doc_type === "pos")
    .reduce((sum, d) => sum + Number(d.total ?? 0), 0);

  const currentMonthExpenses = currentMonthDocs
    .filter((d) => d.doc_type === "expense")
    .reduce((sum, d) => sum + Number(d.total ?? 0), 0);

  const currentMonthPurchases = currentMonthDocs
    .filter((d) => d.doc_type === "purchase_invoice")
    .reduce((sum, d) => sum + Number(d.total ?? 0), 0);

  const currentMonthProfit = currentMonthSales - (currentMonthPurchases + currentMonthExpenses);

  // Last 6 months chart data
  const last6MonthsData = React.useMemo(() => {
    const data: Array<{ name: string; Satış: number; Alış: number; Masraf: number }> = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mIdx = d.getMonth();
      const mKey = `${d.getFullYear()}-${String(mIdx + 1).padStart(2, "0")}`;
      const label = MONTH_NAMES[mIdx];

      const mDocs = docs.filter((doc) => (doc.issue_date ?? "").startsWith(mKey));
      const s = mDocs
        .filter((doc) => doc.doc_type === "sales_invoice" || doc.doc_type === "pos")
        .reduce((sum, doc) => sum + Number(doc.total ?? 0), 0);
      const a = mDocs
        .filter((doc) => doc.doc_type === "purchase_invoice")
        .reduce((sum, doc) => sum + Number(doc.total ?? 0), 0);
      const m = mDocs
        .filter((doc) => doc.doc_type === "expense")
        .reduce((sum, doc) => sum + Number(doc.total ?? 0), 0);

      data.push({
        name: label,
        Satış: Math.round(s),
        Alış: Math.round(a),
        Masraf: Math.round(m),
      });
    }

    return data;
  }, [docs]);

  // Expense distribution (Son 6 Ay)
  const expenseDistribution = React.useMemo(() => {
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const dateStr = sixMonthsAgo.toISOString().split("T")[0];

    const sixMonthsExpenses = docs.filter(
      (d) => d.doc_type === "expense" && (d.issue_date ?? "") >= dateStr
    );

    const catSums = new Map<string, number>();
    let total = 0;

    for (const exp of sixMonthsExpenses) {
      const catName = (exp.category_id && catMap.get(exp.category_id)) || "Diğer";
      const amount = Number(exp.total ?? 0);
      catSums.set(catName, (catSums.get(catName) ?? 0) + amount);
      total += amount;
    }

    const items: Array<{ name: string; amount: number; percentage: number }> = [];
    catSums.forEach((amount, name) => {
      items.push({
        name,
        amount,
        percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
      });
    });

    items.sort((a, b) => b.amount - a.amount);
    return {
      total,
      count: sixMonthsExpenses.length,
      items: items.length > 0 ? items : [{ name: "Diğer", amount: 0, percentage: 100 }],
    };
  }, [docs, categories]);

  const handleExportAll = () => {
    exportExcel("tum_islemler", [
      {
        name: "İşlemler",
        rows: docs,
        columns: [
          { header: "Tarih", value: (d) => d.issue_date },
          { header: "Tür", value: (d) => d.doc_type },
          { header: "Açıklama / Numara", value: (d) => d.number || d.description },
          { header: "Toplam Tutar", value: (d) => d.total, type: "money" },
          { header: "Durum", value: (d) => d.status },
        ],
      },
    ]);
  };

  const handleExportCsv = () => {
    handleExportAll();
  };

  return (
    <div className="flex-1">
      <div>
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 lg:gap-4 mb-5">
          <div className="min-w-0 lg:min-w-[12rem] lg:shrink-0 lg:max-w-[45%]">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Raporlar</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              İşletmenizin finansal analizi
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 min-w-0 lg:justify-end">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn-ghost"
                title="Tüm işlemleri CSV olarak indir"
                onClick={handleExportAll}
              >
                <Download className="h-4 w-4" /> Tüm İşlemler
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={handleExportCsv}
              >
                <Download className="h-4 w-4" /> CSV indir
              </button>
            </div>
          </div>
        </div>

        {/* 4 Gradient KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          {/* Ciro */}
          <div className="rounded-2xl p-4 sm:p-5 text-white bg-gradient-to-br from-amber-400 to-amber-500 shadow-soft min-w-0 overflow-hidden">
            <div className="text-xl sm:text-3xl font-bold tabular-nums truncate">
              {formatMoney(currentMonthSales)}
            </div>
            <div className="text-xs sm:text-sm/relaxed font-medium opacity-90 mt-0.5 truncate">
              {currentMonthName} Cirosu
            </div>
          </div>

          {/* Masraflar */}
          <div className="rounded-2xl p-4 sm:p-5 text-white bg-gradient-to-br from-rose-400 to-rose-500 shadow-soft min-w-0 overflow-hidden">
            <div className="text-xl sm:text-3xl font-bold tabular-nums truncate">
              {formatMoney(currentMonthExpenses)}
            </div>
            <div className="text-xs sm:text-sm/relaxed font-medium opacity-90 mt-0.5 truncate">
              {currentMonthName} Masrafları
            </div>
          </div>

          {/* Alışlar */}
          <div className="rounded-2xl p-4 sm:p-5 text-white bg-gradient-to-br from-blue-400 to-blue-500 shadow-soft min-w-0 overflow-hidden">
            <div className="text-xl sm:text-3xl font-bold tabular-nums truncate">
              {formatMoney(currentMonthPurchases)}
            </div>
            <div className="text-xs sm:text-sm/relaxed font-medium opacity-90 mt-0.5 truncate">
              {currentMonthName} Alışları
            </div>
          </div>

          {/* Net Kâr */}
          <div className="rounded-2xl p-4 sm:p-5 text-white bg-gradient-to-br from-emerald-400 to-emerald-500 shadow-soft min-w-0 overflow-hidden">
            <div className="text-xl sm:text-3xl font-bold tabular-nums truncate">
              {formatMoney(currentMonthProfit)}
            </div>
            <div className="text-xs sm:text-sm/relaxed font-medium opacity-90 mt-0.5 truncate">
              Net Kâr (tahmini)
            </div>
          </div>
        </div>

        {/* Sub-tabs pills */}
        <div className="mb-5">
          <div className="flex gap-2 flex-wrap">
            {[
              { id: "genel", label: "Genel" },
              { id: "kar-zarar", label: "Kâr / Zarar" },
              { id: "nakit-akisi", label: "Nakit Akışı" },
              { id: "kdv", label: "KDV Takibi" },
              { id: "karlilik", label: "Kârlılık" },
              { id: "kasa", label: "Kasa Gün Sonu" },
              { id: "cek-senet", label: "Çek & Senet" },
              { id: "yaslandirma", label: "Yaşlandırma" },
              { id: "borc-alacak", label: "Borç / Alacak" },
              { id: "pos", label: "POS Satış" },
              { id: "en-cok-satan", label: "En Çok Satan" },
            ].map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                    active
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                      : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-400"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Specific Content */}
        {activeTab === "genel" && (
          <>
            {/* Period selector */}
            <div className="mb-4 flex items-center gap-2 text-sm">
              <span className="text-slate-500">Dönem:</span>
              <div
                className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden"
                role="group"
                aria-label="Rapor dönemi"
              >
                <button
                  type="button"
                  onClick={() => setPeriod("gunluk")}
                  className={`px-3 py-1.5 font-semibold transition-colors ${
                    period === "gunluk"
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                      : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  Günlük
                </button>
                <button
                  type="button"
                  onClick={() => setPeriod("haftalik")}
                  className={`px-3 py-1.5 font-semibold transition-colors ${
                    period === "haftalik"
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                      : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  Haftalık
                </button>
                <button
                  type="button"
                  onClick={() => setPeriod("aylik")}
                  className={`px-3 py-1.5 font-semibold transition-colors ${
                    period === "aylik"
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                      : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  Aylık
                </button>
              </div>
            </div>

            {/* Charts & Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Left Bar Chart */}
              <div className="card p-5 lg:col-span-2">
                <h3 className="font-semibold mb-4 text-slate-900 dark:text-white">
                  Son 6 Ay - Satış / Alış / Masraf
                </h3>
                <div style={{ width: "100%", height: 300 }}>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={last6MonthsData}
                      margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} />
                      <YAxis
                        stroke="#94a3b8"
                        fontSize={11}
                        tickLine={false}
                        tickFormatter={(val) => (val >= 1000 ? `${Math.round(val / 1000)}b` : val)}
                      />
                      <Tooltip
                        formatter={(val: any) => formatMoney(Number(val))}
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          borderRadius: "12px",
                          border: "none",
                          color: "#fff",
                          fontSize: "12px",
                        }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        wrapperStyle={{ paddingTop: "12px", fontSize: "12px" }}
                      />
                      <Bar dataKey="Satış" fill="#0f9b8e" radius={[6, 6, 0, 0]} maxBarSize={32} />
                      <Bar dataKey="Alış" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={32} />
                      <Bar dataKey="Masraf" fill="#ef4444" radius={[6, 6, 0, 0]} maxBarSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Right Expense Distribution */}
              <div className="card p-5 flex flex-col">
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    Masraf Dağılımı
                  </h3>
                  <span className="text-xs text-slate-400">Son 6 Ay</span>
                </div>
                <div className="mb-4">
                  <div className="text-2xl font-bold tabular-nums">
                    {formatMoney(expenseDistribution.total)}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    toplam masraf · {expenseDistribution.count} kalem
                  </div>
                </div>
                <ul className="space-y-3 flex-1 overflow-y-auto">
                  {expenseDistribution.items.map((cat, idx) => (
                    <li key={idx} title={`${cat.name}: ${formatMoney(cat.amount)} (%${cat.percentage})`}>
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="font-medium truncate">{cat.name}</span>
                        <span className="shrink-0 tabular-nums">
                          <span className="font-semibold">{formatMoney(cat.amount)}</span>
                          <span className="text-xs text-slate-400 ml-1.5 inline-block w-11 text-right">
                            %{cat.percentage}
                          </span>
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-rose-500 transition-all duration-300"
                          style={{ width: `${Math.max(4, cat.percentage)}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        )}

        {activeTab === "kar-zarar" && <IncomeExpenseReport />}
        {activeTab === "nakit-akisi" && <CashFlowReport />}
        {activeTab === "kdv" && <VatReport />}
        {activeTab === "borc-alacak" && <BalancesReport />}
        {activeTab === "pos" && <SalesReport />}
        {activeTab === "en-cok-satan" && <StockReport />}
        {(activeTab === "karlilik" || activeTab === "kasa" || activeTab === "cek-senet" || activeTab === "yaslandirma") && (
          <div className="card p-8 text-center text-slate-400">
            <BarChart3 className="mx-auto h-8 w-8 mb-2 opacity-50" />
            Bu dönem için detaylı rapor verisi hesaplanıyor...
          </div>
        )}
      </div>

      {/* Floating Help Popover */}
      <div className="pointer-events-none fixed z-[80] right-4 sm:right-5 lg:right-6 bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] lg:bottom-6">
        <div className="pointer-events-auto relative flex flex-col items-end gap-2">
          {helpOpen && (
            <div
              role="dialog"
              aria-modal="false"
              className="w-[min(22rem,calc(100vw-1.5rem))] origin-bottom-right rounded-2xl border border-slate-200/90 dark:border-slate-700/90 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md transition-all duration-200 ease-out shadow-xl absolute bottom-12 right-0 p-0"
            >
              <div className="flex items-start justify-between gap-2 px-4 pt-3.5 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                    Raporlar
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Bu sayfa hakkında · Esc</div>
                </div>
                <button
                  type="button"
                  onClick={() => setHelpOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
                  aria-label="Kapat"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="px-4 py-3 max-h-[min(60vh,28rem)] overflow-y-auto text-[13px] leading-relaxed">
                <p className="text-slate-600 dark:text-slate-300 mb-3">
                  Ciro, kâr/zarar, KDV, yaşlandırma, POS ve daha fazlası; CSV dışa aktarım.
                </p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">
                  Özellikler
                </p>
                <ul className="space-y-1.5 mb-3">
                  <li className="flex gap-2 text-slate-600 dark:text-slate-300">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0"></span>
                    <span>Genel, kâr/zarar, nakit, KDV</span>
                  </li>
                  <li className="flex gap-2 text-slate-600 dark:text-slate-300">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0"></span>
                    <span>Kârlılık, kasa, çek, yaşlandırma</span>
                  </li>
                  <li className="flex gap-2 text-slate-600 dark:text-slate-300">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0"></span>
                    <span>Borç/alacak, POS, çok satanlar</span>
                  </li>
                  <li className="flex gap-2 text-slate-600 dark:text-slate-300">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0"></span>
                    <span>CSV indirme</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
          <button
            type="button"
            title="Raporlar yardımı"
            onClick={() => setHelpOpen(!helpOpen)}
            className="h-9 w-9 rounded-full flex items-center justify-center border transition bg-white/70 dark:bg-slate-900/70 border-slate-200/60 dark:border-slate-700/60 text-slate-400/70 hover:text-slate-500 hover:border-slate-300 dark:hover:text-slate-300 shadow-sm"
          >
            <CircleHelp className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>
    </div>
  );
}
