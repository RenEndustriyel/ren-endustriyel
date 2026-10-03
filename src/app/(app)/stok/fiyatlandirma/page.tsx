"use client";

import * as React from "react";
import {
  Sparkles,
  Flame,
  TrendingUp,
  Store,
  RefreshCw,
  ArrowRight,
  Check,
  Search,
  SlidersHorizontal,
  ExternalLink,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { SmartPricingCard } from "@/components/pricing/smart-pricing-card";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PRESET_MARKET_DATABASE } from "@/lib/pricing/marketPriceService";
import { calculateSmartPrice } from "@/lib/pricing/calculateSmartPrice";
import { useProducts } from "@/lib/data";

export default function SmartPricingPage() {
  const productsQuery = useProducts();
  const [selectedProduct, setSelectedProduct] = React.useState<{
    name: string;
    barcode: string;
    purchasePrice: number;
    vatRate: number;
  }>({
    name: "SIVI EL SABUNU SEDEFLİ 20 LT",
    barcode: "8690506090123",
    purchasePrice: 925.0,
    vatRate: 20,
  });

  const [activeTab, setActiveTab] = React.useState<"calculator" | "catalog">("calculator");
  const [searchFilter, setSearchFilter] = React.useState("");

  // Katalog ürünleri için fırsat kârı analiz tablosu
  const catalogAnalysis = React.useMemo(() => {
    return PRESET_MARKET_DATABASE.map((item) => {
      // Örnek alış maliyeti türet
      const estimatedPurchase = Number((item.medianPrice * 0.58).toFixed(2));
      const calc = calculateSmartPrice({
        purchasePrice: estimatedPurchase,
        overheadPercent: 13,
        targetProfitPercent: 25,
        vatRate: 20,
        vatIncludedMode: true,
        marketMedianPrice: item.medianPrice,
        marketMinPrice: item.minPrice,
        marketMaxPrice: item.maxPrice,
      });

      return {
        ...item,
        purchasePrice: estimatedPurchase,
        calc,
      };
    });
  }, []);

  const filteredCatalog = catalogAnalysis.filter((item) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      item.productName.toLowerCase().includes(q) ||
      item.barcode.includes(q) ||
      (item.category && item.category.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. Üst Başlık & Açıklama */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-[#00b49c] text-white flex items-center justify-center shadow-md shadow-[#00b49c]/25">
              <Sparkles size={18} strokeWidth={2.5} />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Akıllı Satış Fiyatlandırma ve Piyasa Motoru
            </h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40">
              v2.4.70
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Dükkân operasyonel gider payı (%12-15), hedef kâr marjı ve canlı e-ticaret piyasa fiyatlarına göre otomatik fırsat kârı optimizasyonu.
          </p>
        </div>

        {/* Sekmeler: Hesaplayıcı / Toplu Katalog Analizi */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-[#14232c] border border-slate-200 dark:border-[#1e3544] self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab("calculator")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
              activeTab === "calculator"
                ? "bg-[#00b49c] text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            Fiyat Hesaplayıcı
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("catalog")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
              activeTab === "catalog"
                ? "bg-[#00b49c] text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <span>Katalog Piyasa Radarı</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-extrabold animate-pulse">
              Fırsatlar
            </span>
          </button>
        </div>
      </div>

      {/* 2. TAB: Akıllı Fiyat Hesaplayıcı Kartı */}
      {activeTab === "calculator" && (
        <div className="space-y-6">
          <SmartPricingCard
            key={`${selectedProduct.name}-${selectedProduct.purchasePrice}`}
            initialProductName={selectedProduct.name}
            initialBarcode={selectedProduct.barcode}
            initialPurchasePrice={selectedProduct.purchasePrice}
            initialVatRate={selectedProduct.vatRate}
            onApplyPrice={(price, isVatInc) => {
              toast.success(
                `${selectedProduct.name} için ${formatMoney(price)} ${
                  isVatInc ? "KDV Dahil" : "KDV Hariç"
                } fiyat uygulandı!`
              );
            }}
          />

          {/* Motor Çalışma İlkeleri Bilgi Kartları (3 Kolon) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-[#182c37] bg-white dark:bg-[#101e26] space-y-2 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                <Store size={16} className="text-[#00b49c]" />
                <span>1. Dükkân Operasyonel Gider Payı (Overhead)</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Yalnızca ürünün faturasını değil; dükkânın kira, elektrik, çalışan ve nakliye giderlerini (%12-%15) taban maliyete ekleyerek gerçek başabaş noktanızı korur.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-[#182c37] bg-white dark:bg-[#101e26] space-y-2 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                <Flame size={16} className="text-amber-500" />
                <span>2. Eski Maliyet Tuzağı Koruması (Fırsat Kârı)</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Piyasa genelinde ürüne zam gelmişse (piyasa &gt; standart * 1.20), eski ucuz maliyette kalıp sermayenizi eritmez; fiyatı piyasa medyanının %6 altına çekerek ekstra kâr yakalar.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-[#182c37] bg-white dark:bg-[#101e26] space-y-2 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                <Zap size={16} className="text-purple-500" />
                <span>3. Psikolojik Fiyat Yuvarlama Motoru</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Perakende satış standardına uygun olarak tüm hesaplanan nihai KDV dahil fiyatları otomatik olarak <strong>.90 kuruş</strong> bitişli profesyonel raf fiyatına dönüştürür.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. TAB: Katalog Piyasa Radarı ve Fırsat Listesi */}
      {activeTab === "catalog" && (
        <div className="space-y-4">
          {/* Arama ve Filtre */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Ürün adı veya barkod ile filtrele..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-xl bg-white dark:bg-[#12202a] border border-slate-200 dark:border-[#182c37] text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-[#00b49c]"
              />
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Toplam <strong>{filteredCatalog.length}</strong> piyasa izlenen ürün
            </div>
          </div>

          {/* Fırsat Tablosu */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-[#182c37] bg-white dark:bg-[#101e26] shadow-sm">
            <table className="w-full text-left text-xs min-w-[850px]">
              <thead>
                <tr className="border-b border-slate-200 dark:border-[#182c37] text-[10.5px] font-extrabold uppercase text-slate-400 bg-slate-50/70 dark:bg-[#0d1820]">
                  <th className="py-3 px-4">ÜRÜN BİLGİSİ</th>
                  <th className="py-3 px-3 text-right">NET ALIŞ</th>
                  <th className="py-3 px-3 text-right">PİYASA MEDYANI</th>
                  <th className="py-3 px-3 text-right">STANDART FİYAT</th>
                  <th className="py-3 px-3 text-right">AKILLI ÖNERİLEN FİYAT</th>
                  <th className="py-3 px-3 text-center">FIRSAT / DURUM</th>
                  <th className="py-3 px-4 text-center">İŞLEM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#152733]">
                {filteredCatalog.map((item) => {
                  const isOpp = item.calc.isOpportunity;
                  return (
                    <tr
                      key={item.barcode}
                      className={cn(
                        "hover:bg-slate-50/80 dark:hover:bg-[#13222c] transition-colors",
                        isOpp && "bg-amber-500/5 dark:bg-amber-500/5"
                      )}
                    >
                      {/* 1. Ürün Adı */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                          {item.productName}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                          <span>{item.barcode}</span>
                          <span>·</span>
                          <span className="text-teal-600 dark:text-teal-400 font-medium">{item.category}</span>
                        </div>
                      </td>

                      {/* 2. Net Alış */}
                      <td className="py-3 px-3 text-right font-medium tabular-nums text-slate-700 dark:text-slate-300">
                        {formatMoney(item.purchasePrice)}
                      </td>

                      {/* 3. Piyasa Medyanı */}
                      <td className="py-3 px-3 text-right tabular-nums">
                        <span className="font-extrabold text-slate-800 dark:text-slate-200">
                          {formatMoney(item.medianPrice)}
                        </span>
                        <span className="block text-[10px] text-slate-400">
                          min {formatMoney(item.minPrice)}
                        </span>
                      </td>

                      {/* 4. Standart Fiyat */}
                      <td className="py-3 px-3 text-right font-medium tabular-nums text-slate-500 dark:text-slate-400">
                        {formatMoney(item.calc.standardRoundedInclVat)}
                      </td>

                      {/* 5. Akıllı Önerilen Fiyat */}
                      <td className="py-3 px-3 text-right tabular-nums">
                        <div className="font-black text-sm sm:text-base text-[#00b49c]">
                          {formatMoney(item.calc.recommendedPriceInclVat)}
                        </div>
                        <div className="text-[10px] text-emerald-500 font-bold">
                          %{item.calc.netProfitMarginPercent} Net Kâr
                        </div>
                      </td>

                      {/* 6. Durum / Fırsat Rozeti */}
                      <td className="py-3 px-3 text-center">
                        {isOpp ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300/40">
                            <Flame size={12} className="text-amber-500 animate-pulse" />
                            <span>+{formatMoney(item.calc.opportunityDiffAmount)} Fırsat</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-[#14232c] text-slate-500 dark:text-slate-400">
                            <span>Dengeli</span>
                          </span>
                        )}
                      </td>

                      {/* 7. Hesaplayıcıya Aktar Butonu */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProduct({
                              name: item.productName,
                              barcode: item.barcode,
                              purchasePrice: item.purchasePrice,
                              vatRate: 20,
                            });
                            setActiveTab("calculator");
                            toast.info(`${item.productName} hesaplayıcıya aktarıldı.`);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#00b49c] hover:bg-[#009e89] text-white transition active:scale-95 cursor-pointer shadow-2xs"
                        >
                          <span>Hesapla</span>
                          <ArrowRight size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
