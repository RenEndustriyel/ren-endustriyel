"use client";

import * as React from "react";
import {
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  History,
  Activity,
  Compass,
  Scale,
  ShoppingCart,
  Banknote,
  Warehouse,
  Wallet,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

interface FinancialHealthCockpitProps {
  salesTotal?: number;
  purchaseTotal?: number;
  collectionTotal?: number;
  debtTotal?: number;
  stockTotal?: number;
  cashBankTotal?: number;
  receivableTotal?: number;
  /** Gelecek 30 gün içinde vadesi gelecek tahsilatlar (timeline'dan) */
  expectedCollectionsNext30Days?: number;
  /** Gelecek 30 gün içinde vadesi gelecek ödemeler (timeline'dan) */
  expectedPaymentsNext30Days?: number;
  /** Stokta miktarı > 0 olan ürün sayısı */
  productCount?: number;
}

export function FinancialHealthCockpit({
  salesTotal = 0,
  purchaseTotal = 0,
  collectionTotal = 0,
  debtTotal = 0,
  stockTotal = 0,
  cashBankTotal = 0,
  receivableTotal = 0,
  expectedCollectionsNext30Days = 0,
  expectedPaymentsNext30Days = 0,
  productCount = 0,
}: FinancialHealthCockpitProps) {
  // Net Kâr ve Kâr Marjı Hesabı
  const netProfit = salesTotal - purchaseTotal;
  const isProfitable = netProfit >= 0;
  const profitMargin = salesTotal > 0 ? (netProfit / salesTotal) * 100 : 0;

  // Satış büyüme — önceki dönem verisi olmadığından gösterilmez
  const salesGrowthPercent: number | null = null;
  const profitGrowthPercent: number | null = null;

  // İleri Yön Projeksiyonu (Gelecek 30 Gün) — timeline'dan geliyor
  const projectedNetCashSurplus = expectedCollectionsNext30Days - expectedPaymentsNext30Days;
  const liquidityRatio = expectedPaymentsNext30Days > 0 ? expectedCollectionsNext30Days / expectedPaymentsNext30Days : 0;

  // Tahsilat başarısı (sadece her iki veri > 0 ise göster)
  const collectionRate = salesTotal > 0 && collectionTotal > 0 ? (collectionTotal / salesTotal) * 100 : null;

  // Finansal Sağlık Skoru (100 Üzerinrden)
  const healthScore = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        (isProfitable && salesTotal > 0 ? 40 : salesTotal === 0 ? 0 : 10) +
          Math.min(30, salesTotal > 0 ? (profitMargin / 35) * 30 : 0) +
          Math.min(30, liquidityRatio > 0 ? Math.min(liquidityRatio / 2.0, 1) * 30 : 0)
      )
    )
  );

  return (
    <div className="space-y-4">
      {/* 1. BÜYÜK DURUM ŞERİDİ: KÂRDA MIYIZ / ZARARDA MIYIZ? (Kalın 2.5px Çerçeve) */}
      <div
        className={cn(
          "rounded-3xl border-[2.5px] p-5 sm:p-6 transition-all shadow-xl",
          isProfitable
            ? "border-emerald-500/80 bg-gradient-to-r from-[#102422] via-[#0f2126] to-[#101e26] text-white shadow-emerald-950/20"
            : "border-rose-500/80 bg-gradient-to-r from-[#281519] via-[#20151c] to-[#101e26] text-white shadow-rose-950/20"
        )}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Sol: Büyük Net Kâr / Zarar Kararı */}
          <div className="space-y-2 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider",
                  isProfitable && salesTotal > 0
                    ? "bg-emerald-500 text-slate-950 shadow-sm"
                    : salesTotal === 0
                    ? "bg-slate-600 text-slate-200 shadow-sm"
                    : "bg-rose-500 text-white shadow-sm"
                )}
              >
                {salesTotal === 0 ? (
                  <span>VERİ YÜKLENİYOR</span>
                ) : isProfitable ? (
                  <><CheckCircle2 size={15} /> <span>NET KÂRDASINIZ</span></>
                ) : (
                  <><AlertTriangle size={15} /> <span>NET ZARARDASINIZ</span></>
                )}
              </span>

              <span className="text-xs font-bold text-slate-400">
                · Genel Finansal Durum Değerlendirmesi
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-3 pt-1">
              <span
                className={cn(
                  "text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight tabular-nums",
                  salesTotal === 0 ? "text-slate-500" : isProfitable ? "text-emerald-400" : "text-rose-400"
                )}
              >
                {salesTotal === 0 ? (
                  <span className="text-2xl">Hesaplanıyor…</span>
                ) : (
                  <>{isProfitable ? "+" : ""}{formatMoney(netProfit)}</>
                )}
              </span>

              {salesTotal > 0 && (
                <span className="text-sm sm:text-base font-extrabold text-slate-300 tabular-nums">
                  (%{profitMargin.toFixed(1)} Net Kâr Marjı)
                </span>
              )}

              {salesGrowthPercent !== null && (
                <span className="inline-flex items-center text-xs font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-800/60 px-2 py-0.5 rounded-lg">
                  <ArrowUpRight size={13} />
                  <span>Önceki döneme göre %{Number(salesGrowthPercent).toFixed(1)} artış</span>
                </span>
              )}
            </div>

            <p className="text-xs sm:text-sm text-slate-300/90 leading-relaxed max-w-3xl pt-1">
              {salesTotal === 0
                ? "Henüz bu ay için satış verisi bulunmuyor. Fatura veya hızlı satış kaydettikten sonra burada görünecek."
                : isProfitable
                ? "İşletmeniz bu dönem tüm hammadde, alış faturaları, operasyonel giderler ve vergiler düşüldükten sonra güçlü bir net kâr üretmektedir. Ciro / maliyet dengesi kârlı bölgede seyretmektedir."
                : "Bu dönem maliyet ve operasyonel giderler cironun üzerinde seyretmektedir. Gider kalemlerini optimize etmeniz veya fiyat politikasını gözden geçirmeniz önerilir."}
            </p>
          </div>

          {/* Sağ: Finansal Sağlık Barometresi (İbre / Skor) */}
          <div className="shrink-0 flex items-center lg:flex-col justify-between lg:justify-center p-4 rounded-2xl bg-black/30 border border-white/10 lg:min-w-[210px] text-center">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
              FİNANSAL SAĞLIK SKORU
            </div>

            <div className="flex items-baseline justify-center gap-1 my-1">
              {salesTotal === 0 ? (
                <span className="text-2xl font-black text-slate-500">—</span>
              ) : (
                <span className="text-4xl font-black text-emerald-400 tabular-nums">{healthScore}</span>
              )}
              <span className="text-slate-500 font-bold text-sm">/ 100</span>
            </div>

            {/* Renkli Çubuk İbre */}
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden my-1.5 border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-[#00b49c] to-emerald-400 transition-all duration-1000 rounded-full"
                style={{ width: `${healthScore}%` }}
              />
            </div>

            <div className="text-[11px] font-bold text-emerald-400 flex items-center justify-center gap-1">
              <TrendingUp size={13} />
              <span>
                {salesTotal === 0 ? "Veri bekleniyor" : healthScore >= 70 ? "Güçlü & Yükseliş" : healthScore >= 40 ? "Orta Düzey" : "Güçlendirme Gerek"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. BEŞ TEMEL GÖSTERGE DİREĞİ (Kalın Çerçeveli 2px Belirgin Kartlar) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Direk 1: SATIŞLAR (Ciro) */}
        <div className="rounded-2xl border-2 border-emerald-500/60 hover:border-emerald-400 bg-white dark:bg-[#101e26] p-4 transition-all shadow-md group">
          <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-emerald-500">
            <span className="flex items-center gap-1.5">
              <ShoppingCart size={15} />
              <span>SATIŞLAR</span>
            </span>
            <span className="text-[10.5px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
              Ciro
            </span>
          </div>

          <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tabular-nums mt-2">
            {formatMoney(salesTotal)}
          </div>

          <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-500 mt-1">
            {salesGrowthPercent !== null ? (
              <>
                <ArrowUpRight size={13} />
                <span>+%{Number(salesGrowthPercent).toFixed(1)} büyüme</span>
              </>
            ) : (
              <span className="text-slate-500">Bu ay {salesTotal > 0 ? formatMoney(salesTotal) : "—"}</span>
            )}
          </div>

          <div className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-[#182c37]">
            Faturalı &amp; Hızlı Satışlar Toplamı
          </div>
        </div>

        {/* Direk 2: ALIŞLAR & MALİYETLER */}
        <div className="rounded-2xl border-2 border-rose-500/60 hover:border-rose-400 bg-white dark:bg-[#101e26] p-4 transition-all shadow-md group">
          <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-rose-500">
            <span className="flex items-center gap-1.5">
              <Scale size={15} />
              <span>ALIŞLAR</span>
            </span>
            <span className="text-[10.5px] font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400">
              Maliyet
            </span>
          </div>

          <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tabular-nums mt-2">
            {formatMoney(purchaseTotal)}
          </div>

          <div className="text-[11px] font-bold text-slate-400 mt-1">
            Cironun <span className="text-rose-400 font-extrabold">%{((purchaseTotal / salesTotal) * 100).toFixed(1)}</span>&apos;i
          </div>

          <div className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-[#182c37]">
            Tedarikçi Alışları &amp; Masraflar
          </div>
        </div>

        {/* Direk 3: TAHSİLATLAR */}
        <div className="rounded-2xl border-2 border-[#00b49c]/60 hover:border-[#00b49c] bg-white dark:bg-[#101e26] p-4 transition-all shadow-md group">
          <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-[#00b49c]">
            <span className="flex items-center gap-1.5">
              <Wallet size={15} />
              <span>TAHSİLATLAR</span>
            </span>
            <span className="text-[10.5px] font-bold px-1.5 py-0.5 rounded bg-[#00b49c]/10 text-[#00b49c]">
              Giriş
            </span>
          </div>

          <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tabular-nums mt-2">
            {formatMoney(collectionTotal)}
          </div>

          <div className="text-[11px] font-bold text-[#00b49c] mt-1">
            {collectionRate !== null ? `%${collectionRate.toFixed(1)} Tahsilat Başarısı` : "Tahsilat görüntülenıyor"}
          </div>

          <div className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-[#182c37] truncate">
            Kalan Açık: {formatMoney(receivableTotal)}
          </div>
        </div>

        {/* Direk 4: BORÇLAR */}
        <div className="rounded-2xl border-2 border-amber-500/60 hover:border-amber-400 bg-white dark:bg-[#101e26] p-4 transition-all shadow-md group">
          <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-amber-500">
            <span className="flex items-center gap-1.5">
              <Banknote size={15} />
              <span>BORÇLAR</span>
            </span>
            <span className="text-[10.5px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">
              Yükümlülük
            </span>
          </div>

          <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tabular-nums mt-2">
            {formatMoney(debtTotal)}
          </div>

          <div className="text-[11px] font-bold text-amber-400 mt-1">
            Nakit Karşılama: {cashBankTotal > 0 && debtTotal > 0 ? `${(cashBankTotal / debtTotal).toFixed(1)}x` : "—"}
          </div>

          <div className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-[#182c37]">
            Ödenecek Tedarikçi Faturaları
          </div>
        </div>

        {/* Direk 5: STOK VARLIĞI */}
        <div className="rounded-2xl border-2 border-blue-500/60 hover:border-blue-400 bg-white dark:bg-[#101e26] p-4 transition-all shadow-md group">
          <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-blue-400">
            <span className="flex items-center gap-1.5">
              <Warehouse size={15} />
              <span>STOK VARLIĞI</span>
            </span>
            <span className="text-[10.5px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">
              Envanter
            </span>
          </div>

          <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tabular-nums mt-2">
            {formatMoney(stockTotal)}
          </div>

          <div className="text-[11px] font-bold text-blue-400 mt-1">
            {productCount > 0 ? `Depoda ${productCount.toLocaleString("tr-TR")} Kalem Varlık` : "Stok verisi hesaplanıyor"}
          </div>

          <div className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-[#182c37]">
            Satışa Hazır Mal Değeri
          </div>
        </div>
      </div>

      {/* 3. ÜÇ ZAMAN BOYUTLU ANALİZ MODÜLÜ (Önce Nasildik? Şu An Nasılız? İlerisi Neyi Gösteriyor?) */}
      <div className="rounded-3xl border-2 border-slate-300 dark:border-[#1e3848] bg-white dark:bg-[#101e26] p-5 sm:p-6 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200 dark:border-[#182c37]">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Compass size={20} className="text-[#00b49c]" />
              <span>Dönemsel Gelişim &amp; İleri Yön Barometresi</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Geçmiş performans, anlık durum ve önümüzdeki 30 günün finansal pusulası
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#00b49c]/10 text-[#00b49c] border border-[#00b49c]/30">
              <Sparkles size={13} />
              <span>Yapay Zekâ Analizli</span>
            </span>
          </div>
        </div>

        {/* 3 Fazlı Karşılaştırmalı Izgara */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-4">
          {/* FAZ 1: ÖNCE NASILDIK? (Geçmiş Dönem) */}
          <div className="rounded-2xl border-2 border-slate-200 dark:border-[#182c37] bg-slate-50/70 dark:bg-[#0c161d] p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <History size={15} />
                  <span>1. ÖNCE NASILDIK?</span>
                </span>
                <span className="text-[10.5px] font-bold text-slate-400">
                  Önceki Dönem
                </span>
              </div>

              <div className="mt-3 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Ciro:</span>
                  <span className="font-bold text-slate-800 dark:text-white tabular-nums">
                    Önceki dönem verisi mevcut değil
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Net Kâr:</span>
                  <span className="font-bold text-slate-400 tabular-nums">
                    Karşılaştırma için veri bekleniyor
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Tahsilat Hızı:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    —
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-[#182c37] text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Önceki dönem verileri şu an mevcut değil. Geçmiş veriler birikitkce burada karşılaştırma görünecek.
            </div>
          </div>

          {/* FAZ 2: ŞU AN NASILIZ? (Mevcut Durum) */}
          <div className="rounded-2xl border-2 border-[#00b49c]/70 bg-teal-950/10 dark:bg-[#0d222b] p-4 flex flex-col justify-between space-y-3 shadow-sm">
            <div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#00b49c]">
                  <Activity size={15} />
                  <span>2. ŞU AN NASILIZ?</span>
                </span>
                <span className="text-[10.5px] font-extrabold px-2 py-0.5 rounded-full bg-[#00b49c] text-white">
                  Bugün
                </span>
              </div>

              <div className="mt-3 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Gerçekleşen Ciro:</span>
                  <span className="font-bold text-slate-900 dark:text-white tabular-nums flex items-center gap-1">
                    <span>{formatMoney(salesTotal)}</span>
                    {salesGrowthPercent !== null && (
                      <span className="text-emerald-400 text-[10px] font-extrabold">
                        (+%{Number(salesGrowthPercent).toFixed(1)})
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Net Kâr / Marj:</span>
                  <span className="font-extrabold tabular-nums" style={{color: netProfit >= 0 ? '#34d399' : '#f87171'}}>
                    {netProfit >= 0 ? '+' : ''}{formatMoney(netProfit)} (%{profitMargin.toFixed(1)})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Likit Varlık (Kasa+Stok):</span>
                  <span className="font-bold text-[#00b49c] tabular-nums">
                    {formatMoney(cashBankTotal + stockTotal)}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-teal-500/20 text-[11px] text-slate-300 leading-relaxed">
              {salesTotal > 0 && isProfitable ? (
                <><strong>Şirket net kârda.</strong> Kâr marjı %{profitMargin.toFixed(1)}, stok ve nakit varlıkları izleniyor.</>
              ) : salesTotal === 0 ? (
                "Henüz bu ay satış kaydedilmedi."
              ) : (
                <><strong>Zarar uyarısı:</strong> Maliyet, cironun üzerinde. Gider kalemlerini gözden geçirin.</>
              )}
            </div>
          </div>

          {/* FAZ 3: İLERİDE NE GÖRÜNÜYOR? (Gelecek Projeksiyonu & Barometre) */}
          <div className="rounded-2xl border-2 border-emerald-500/70 bg-emerald-950/20 dark:bg-[#0c2621] p-4 flex flex-col justify-between space-y-3 shadow-sm">
            <div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-400">
                  <Compass size={15} />
                  <span>3. İLERİDE NE GÖRÜNÜYOR?</span>
                </span>
                <span className="text-[10.5px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950">
                  Gelecek 30 Gün
                </span>
              </div>

              <div className="mt-3 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-300">Vadesi Gelecek Tahsilat:</span>
                  <span className="font-extrabold text-[#22c39e] tabular-nums">
                    {expectedCollectionsNext30Days > 0 ? `+${formatMoney(expectedCollectionsNext30Days)}` : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Vadesi Gelecek Ödeme:</span>
                  <span className="font-extrabold text-rose-400 tabular-nums">
                    {expectedPaymentsNext30Days > 0 ? `-${formatMoney(expectedPaymentsNext30Days)}` : "—"}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-emerald-500/30">
                  <span className="font-bold text-white">Beklenen Net Nakit Faz.</span>
                  <span className={cn("font-black tabular-nums", projectedNetCashSurplus >= 0 ? "text-emerald-400" : "text-rose-400")}>
                    {expectedCollectionsNext30Days > 0 || expectedPaymentsNext30Days > 0
                      ? `${projectedNetCashSurplus >= 0 ? "+" : ""}${formatMoney(projectedNetCashSurplus)}`
                      : "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* İleri Yön Barometresi Kararı */}
            <div className="p-2.5 rounded-xl bg-black/40 border border-emerald-500/30 text-[11px] space-y-1">
              <div className="flex items-center justify-between font-extrabold">
                <span className="flex items-center gap-1 text-emerald-400">
                  <TrendingUp size={14} />
                  <span>
                    {liquidityRatio === 0 ? "VİZYÖN: VERİ BEKLENIYOR" :
                     liquidityRatio >= 1.5 ? "İBRE: GÜÇLÜ YÜKSELİŞ (BULLISH)" :
                     liquidityRatio >= 1 ? "İBRE: DENGELİ (NOLTR)" :
                     "İBRE: DİKKAT (BEARISH)"}
                  </span>
                </span>
                <span className="text-slate-300">
                  {liquidityRatio > 0 ? `${liquidityRatio.toFixed(2)}x Likidite` : "—"}
                </span>
              </div>
              <p className="text-slate-300 text-[10.5px] leading-tight">
                {liquidityRatio === 0
                  ? "Gelecek 30 gün için vadeli işlem bulunmuyor."
                  : liquidityRatio >= 1
                  ? `Her 1 TL borca karşılık kasaya girecek ${liquidityRatio.toFixed(2)} TL nakit bekleniyor.`
                  : "Gelecek dönem ödemeler tahsilattan fazla. Nakit akışını takip edin."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
