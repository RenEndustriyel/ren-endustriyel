"use client";

import * as React from "react";
import Link from "next/link";
import {
  DollarSign,
  RefreshCw,
  ArrowRightLeft,
  Wallet,
  TrendingUp,
  ExternalLink,
  Coins,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { formatMoney } from "@/lib/format";
import { useRates, triggerLiveRatesRefresh, rateFor } from "@/lib/rates";
import { cn } from "@/lib/utils";
import type { DashboardSummary } from "./types";

interface CurrencySalesFooterProps {
  data?: DashboardSummary;
}

export function CurrencySalesFooter({ data }: CurrencySalesFooterProps) {
  const ratesQuery = useRates();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Kurlar
  const usdRate = rateFor(ratesQuery.data, "USD") || data?.rates?.USD || 35.0;
  const eurRate = rateFor(ratesQuery.data, "EUR") || data?.rates?.EUR || 38.0;
  const gbpRate = rateFor(ratesQuery.data, "GBP") || Math.round(usdRate * 1.3 * 100) / 100 || 45.5;
  const goldRate = rateFor(ratesQuery.data, "XAU") || Math.round(usdRate * 73) || 3050.0;

  // Aylık ciro
  const monthSalesTRY = Number(data?.kpi?.month_sales) || 0;
  const monthSalesUSD = usdRate > 0 ? monthSalesTRY / usdRate : 0;
  const monthSalesEUR = eurRate > 0 ? monthSalesTRY / eurRate : 0;
  const monthSalesGBP = gbpRate > 0 ? monthSalesTRY / gbpRate : 0;
  const goldGrams = goldRate > 0 ? monthSalesTRY / goldRate : 0;

  // Kasa varlıkları
  const cashUSD = Number(data?.currency?.cash_usd || 0);
  const cashEUR = Number(data?.currency?.cash_eur || 0);
  const cashGBP = 0;
  const totalFxInTRY = cashUSD * usdRate + cashEUR * eurRate + cashGBP * gbpRate;

  // Hızlı hesap makinesi / çevirici state
  const [convertAmount, setConvertAmount] = React.useState<number>(1000);
  const [convertCurrency, setConvertCurrency] = React.useState<"TRY" | "USD" | "EUR" | "GBP">("TRY");

  const handleRefreshRates = async () => {
    setIsRefreshing(true);
    try {
      await triggerLiveRatesRefresh();
      await ratesQuery.refetch();
      toast.success("TCMB ve serbest piyasa kurları başarıyla güncellendi.");
    } catch {
      toast.error("Kurlar güncellenirken bir sorun oluştu.");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Çevirici hesaplama
  const convertedValues = React.useMemo(() => {
    let amtTRY = convertAmount;
    if (convertCurrency === "USD") amtTRY = convertAmount * usdRate;
    else if (convertCurrency === "EUR") amtTRY = convertAmount * eurRate;
    else if (convertCurrency === "GBP") amtTRY = convertAmount * gbpRate;

    return {
      TRY: amtTRY,
      USD: usdRate > 0 ? amtTRY / usdRate : 0,
      EUR: eurRate > 0 ? amtTRY / eurRate : 0,
      GBP: gbpRate > 0 ? amtTRY / gbpRate : 0,
      GramAltın: goldRate > 0 ? amtTRY / goldRate : 0,
    };
  }, [convertAmount, convertCurrency, usdRate, eurRate, gbpRate, goldRate]);

  return (
    <div className="card p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm space-y-5 animate-fade-in">
      {/* 1. ÜST BAŞLIK & BUTONLAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="size-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400 flex items-center justify-center">
              <DollarSign size={20} />
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              Döviz Kurları & Anlık Kura Göre Aylık Satışlarımız
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Aylık satış cironuzun güncel TCMB döviz kurları ile USD, EUR, GBP ve Altın karşılığı
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefreshRates}
            disabled={isRefreshing}
            className="btn-ghost !text-xs !py-1.5 !px-3 gap-1.5"
            title="TCMB canlı kurlarını sunucudan çek"
          >
            <RefreshCw size={13} className={cn(isRefreshing && "animate-spin text-brand-600")} />
            <span>{isRefreshing ? "Güncelleniyor..." : "Canlı Kurları Güncelle"}</span>
          </button>

          <Link
            href="/ayarlar"
            className="btn-ghost !text-xs !py-1.5 !px-2.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            title="Kur ayarları"
          >
            <ExternalLink size={13} />
          </Link>
        </div>
      </div>

      {/* 2. ANLIK KURA GÖRE AYLIK SATIŞLAR (5 KARTLIK GRİD) */}
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
          <TrendingUp size={14} className="text-emerald-500" />
          <span>Bu Ayki Satış Cironuzun Döviz Karşılıkları</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* TRY - Baz Satış */}
          <Link
            href="/satislar/faturalar"
            className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 bg-slate-50/70 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700 transition block cursor-pointer"
          >
            <div className="text-xs text-slate-400 font-medium">Aylık Satış (TRY)</div>
            <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 mt-1 tabular-nums truncate">
              {formatMoney(monthSalesTRY)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Baz Satış Cirosu</div>
          </Link>

          {/* USD Karşılığı */}
          <Link
            href="/satislar/faturalar"
            className="rounded-xl border border-blue-100 dark:border-blue-900/40 p-3.5 bg-blue-50/40 dark:bg-blue-950/20 hover:border-blue-300 dark:hover:border-blue-700 transition block cursor-pointer"
          >
            <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">Bu Ay Satış (USD)</div>
            <div className="text-base sm:text-lg font-bold text-blue-700 dark:text-blue-300 mt-1 tabular-nums truncate">
              ${monthSalesUSD.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">1 USD = {usdRate.toFixed(2)} ₺</div>
          </Link>

          {/* EUR Karşılığı */}
          <Link
            href="/satislar/faturalar"
            className="rounded-xl border border-indigo-100 dark:border-indigo-900/40 p-3.5 bg-indigo-50/40 dark:bg-indigo-950/20 hover:border-indigo-300 dark:hover:border-indigo-700 transition block cursor-pointer"
          >
            <div className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">Bu Ay Satış (EUR)</div>
            <div className="text-base sm:text-lg font-bold text-indigo-700 dark:text-indigo-300 mt-1 tabular-nums truncate">
              €{monthSalesEUR.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">1 EUR = {eurRate.toFixed(2)} ₺</div>
          </Link>

          {/* GBP Karşılığı */}
          <Link
            href="/satislar/faturalar"
            className="rounded-xl border border-purple-100 dark:border-purple-900/40 p-3.5 bg-purple-50/40 dark:bg-purple-950/20 hover:border-purple-300 dark:hover:border-purple-700 transition block cursor-pointer"
          >
            <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">Bu Ay Satış (GBP)</div>
            <div className="text-base sm:text-lg font-bold text-purple-700 dark:text-purple-300 mt-1 tabular-nums truncate">
              £{monthSalesGBP.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">1 GBP = {gbpRate.toFixed(2)} ₺</div>
          </Link>

          {/* Gram Altın Karşılığı */}
          <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 p-3.5 bg-amber-50/40 dark:bg-amber-950/20 block">
            <div className="text-xs text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1">
              <Coins size={13} />
              <span>Altın Karşılığı</span>
            </div>
            <div className="text-base sm:text-lg font-bold text-amber-700 dark:text-amber-300 mt-1 tabular-nums truncate">
              ~{goldGrams.toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} gr
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">1 gr ≈ {goldRate.toLocaleString("tr-TR")} ₺</div>
          </div>
        </div>
      </div>

      {/* 3. KASA DÖVİZ VARLIKLARI & HIZLI KUR ÇEVİRİCİ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1">
        {/* Kasa Döviz Varlıkları */}
        <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              <Wallet size={15} className="text-teal-500" />
              <span>Kasa ve Banka Döviz Varlıkları</span>
            </div>
            <Link
              href="/nakit/hesaplar"
              className="text-[11px] text-brand-600 dark:text-brand-400 font-semibold hover:underline"
            >
              Hesaplar →
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-2.5 text-xs">
            <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5">
              <div className="text-slate-400 font-medium">USD Kasa</div>
              <div className="font-bold text-slate-900 dark:text-slate-100 text-sm mt-0.5 tabular-nums">
                ${cashUSD.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                ≈ {formatMoney(cashUSD * usdRate)}
              </div>
            </div>

            <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5">
              <div className="text-slate-400 font-medium">EUR Kasa</div>
              <div className="font-bold text-slate-900 dark:text-slate-100 text-sm mt-0.5 tabular-nums">
                €{cashEUR.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                ≈ {formatMoney(cashEUR * eurRate)}
              </div>
            </div>

            <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5">
              <div className="text-slate-400 font-medium">Toplam Döviz (TL)</div>
              <div className="font-bold text-emerald-600 dark:text-emerald-400 text-sm mt-0.5 tabular-nums">
                {formatMoney(totalFxInTRY)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Nakit Karşılığı</div>
            </div>
          </div>
        </div>

        {/* Hızlı Döviz Çevirici */}
        <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              <ArrowRightLeft size={15} className="text-blue-500" />
              <span>Canlı Kur Hesaplayıcı / Çevirici</span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">TCMB Anlık</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2.5 mb-2.5">
            <input
              type="number"
              value={convertAmount}
              onChange={(e) => setConvertAmount(Number(e.target.value) || 0)}
              className="input h-9 text-xs font-semibold tabular-nums w-full sm:w-36"
              placeholder="Tutar girin..."
              min={0}
            />

            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-white dark:bg-slate-900 text-xs font-bold w-full sm:w-auto">
              {(["TRY", "USD", "EUR", "GBP"] as const).map((curr) => (
                <button
                  key={curr}
                  type="button"
                  onClick={() => setConvertCurrency(curr)}
                  className={cn(
                    "px-2.5 py-1 rounded-md transition text-xs flex-1 sm:flex-none",
                    convertCurrency === curr
                      ? "bg-brand-500 text-white font-bold shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  {curr}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="rounded-lg bg-white dark:bg-slate-900 p-2 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block font-medium">TL Değeri:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                {formatMoney(convertedValues.TRY)}
              </span>
            </div>

            <div className="rounded-lg bg-white dark:bg-slate-900 p-2 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block font-medium">Dolar Değeri:</span>
              <span className="font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                ${convertedValues.USD.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="rounded-lg bg-white dark:bg-slate-900 p-2 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block font-medium">Euro Değeri:</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                €{convertedValues.EUR.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="rounded-lg bg-white dark:bg-slate-900 p-2 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block font-medium">Altın Değeri:</span>
              <span className="font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                ~{convertedValues.GramAltın.toFixed(2)} gr
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
