"use client";

import * as React from "react";
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Flame,
  Check,
  Copy,
  RefreshCw,
  Barcode,
  Search,
  Store,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Percent,
} from "lucide-react";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  calculateSmartPrice,
  type SmartPricingInput,
  type SmartPricingResult,
} from "@/lib/pricing/calculateSmartPrice";
import {
  fetchMarketPriceData,
  PRESET_MARKET_DATABASE,
  type MarketProductData,
} from "@/lib/pricing/marketPriceService";
import { useSave, useUpdate, useProducts, type Row } from "@/lib/data";

interface SmartPricingCardProps {
  initialPurchasePrice?: number;
  initialBarcode?: string;
  initialProductName?: string;
  initialVatRate?: number;
  productId?: string;
  onApplyPrice?: (recommendedPrice: number, isVatIncluded: boolean) => void;
  className?: string;
}

export function SmartPricingCard({
  initialPurchasePrice = 120,
  initialBarcode = "",
  initialProductName = "",
  initialVatRate = 20,
  productId,
  onApplyPrice,
  className,
}: SmartPricingCardProps) {
  // Girdi durumları
  const [productName, setProductName] = React.useState(initialProductName);
  const [barcode, setBarcode] = React.useState(initialBarcode);
  const [purchasePrice, setPurchasePrice] = React.useState<number>(initialPurchasePrice);
  const [overheadPercent, setOverheadPercent] = React.useState<number>(13);
  const [targetProfitPercent, setTargetProfitPercent] = React.useState<number>(25);
  const [vatRate, setVatRate] = React.useState<number>(initialVatRate);
  const [vatIncludedMode, setVatIncludedMode] = React.useState<boolean>(true);

  // Canlı piyasa verisi durumu
  const [marketData, setMarketData] = React.useState<MarketProductData | null>(null);
  const [isScanning, setIsScanning] = React.useState(false);
  const [showSourcesDetail, setShowSourcesDetail] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [applied, setApplied] = React.useState(false);

  // Ürün güncelleme için
  const updateProduct = useUpdate("products");
  const productsQuery = useProducts();

  // İlk açılışta veya barkod/ürün adı varsa piyasa verisini tara
  const runMarketScan = React.useCallback(
    async (queryName: string, queryBarcode: string, cost: number) => {
      setIsScanning(true);
      try {
        const data = await fetchMarketPriceData(queryName, queryBarcode, cost);
        setMarketData(data);
        if (!productName && data.productName) {
          setProductName(data.productName);
        }
      } catch (err) {
        console.error("Piyasa tarama hatası:", err);
      } finally {
        setIsScanning(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  React.useEffect(() => {
    runMarketScan(productName, barcode, purchasePrice);
  }, []);

  // Hesaplama sonucunu dinamik olarak reaktif hesapla
  const pricingResult: SmartPricingResult = React.useMemo(() => {
    return calculateSmartPrice({
      purchasePrice,
      overheadPercent,
      targetProfitPercent,
      vatRate,
      vatIncludedMode,
      marketMedianPrice: marketData?.medianPrice ?? null,
      marketMinPrice: marketData?.minPrice ?? null,
      marketMaxPrice: marketData?.maxPrice ?? null,
    });
  }, [
    purchasePrice,
    overheadPercent,
    targetProfitPercent,
    vatRate,
    vatIncludedMode,
    marketData,
  ]);

  // Hızlı hazır ürün seçimi
  const handleSelectPreset = (item: (typeof PRESET_MARKET_DATABASE)[0]) => {
    setProductName(item.productName);
    setBarcode(item.barcode);
    // Gerçekçi bir alış fiyatı türet (medyanın ~%60'ı)
    const derivedPurchase = Number((item.medianPrice * 0.58).toFixed(2));
    setPurchasePrice(derivedPurchase);
    setMarketData(item);
    toast.info(`${item.productName} seçildi ve piyasa verileri yüklendi.`);
  };

  // Fiyatı onayla ve kaydet
  const handleApplyPrice = async () => {
    const finalPrice = pricingResult.recommendedDisplayPrice;

    if (onApplyPrice) {
      onApplyPrice(finalPrice, vatIncludedMode);
      setApplied(true);
      setTimeout(() => setApplied(false), 2000);
      toast.success(
        `Tavsiye satış fiyatı (${formatMoney(finalPrice)} ${
          vatIncludedMode ? "KDV Dahil" : "KDV Hariç"
        }) uygulandı!`
      );
      return;
    }

    // Eğer productId varsa veritabanında güncelle
    if (productId) {
      try {
        await updateProduct.update(
          productId,
          {
            sale_price: finalPrice,
            sale_price_includes_vat: vatIncludedMode,
            purchase_price: purchasePrice,
            vat_rate: vatRate,
          },
          "Satış fiyatı başarıyla güncellendi!"
        );
        setApplied(true);
        setTimeout(() => setApplied(false), 2000);
      } catch (err) {
        toast.error("Fiyat kaydedilirken hata oluştu.");
      }
    } else {
      setApplied(true);
      setTimeout(() => setApplied(false), 2000);
      toast.success(
        `Fiyat ${formatMoney(finalPrice)} olarak onaylandı ve belleğe alındı!`
      );
    }
  };

  // Panoya kopyala
  const handleCopy = () => {
    const text = `${productName || "Ürün"}\nTavsiye Fiyat: ${formatMoney(
      pricingResult.recommendedDisplayPrice
    )} (${vatIncludedMode ? "KDV Dahil" : "KDV Hariç"})\nNet Kâr: %${
      pricingResult.netProfitMarginPercent
    } (+${formatMoney(pricingResult.netProfitAmount)})`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Fiyatlandırma özeti panoya kopyalandı!");
  };

  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 dark:border-[#182c37] bg-white dark:bg-[#101e26] text-slate-900 dark:text-slate-100 shadow-xl overflow-hidden transition-all",
        className
      )}
    >
      {/* 1. Üst Başlık & Gradient Şerit */}
      <div className="relative px-5 py-4 bg-gradient-to-r from-emerald-600/10 via-[#00b49c]/10 to-teal-500/5 dark:from-[#00b49c]/20 dark:to-[#0c1820] border-b border-slate-200 dark:border-[#182c37] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#00b49c] text-white flex items-center justify-center shadow-md shadow-[#00b49c]/25 shrink-0">
            <Sparkles size={20} strokeWidth={2.2} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white tracking-tight">
                Akıllı Fiyatlandırma ve Piyasa Motoru
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40">
                PRO ENGINE
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Dükkân gider payı, KDV ve canlı e-ticaret medyanına göre kâr optimizasyonu
            </p>
          </div>
        </div>

        {/* Hızlı Yenile / Canlı Tarama */}
        <button
          type="button"
          onClick={() => runMarketScan(productName, barcode, purchasePrice)}
          disabled={isScanning}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-[#142530] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#1e3544] hover:bg-slate-50 dark:hover:bg-[#1a303e] transition active:scale-95 shadow-2xs"
          title="Canlı Piyasa Fiyatlarını Yeniden Tara"
        >
          <RefreshCw size={13} className={cn("text-[#00b49c]", isScanning && "animate-spin")} />
          <span>{isScanning ? "Taranıyor..." : "Piyasayı Tara"}</span>
        </button>
      </div>

      {/* 2. Ana Gövde Grid: Sol Form Girdileri, Sağ Canlı Karar Kartı */}
      <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* SOL BÖLÜM (7 Sütun): Parametreler & Piyasa Şeridi */}
        <div className="lg:col-span-7 space-y-4 sm:space-y-5">
          {/* Ürün & Barkod Seçim Alanı */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
              <span>ÜRÜN / BARKOD</span>
              {/* Hızlı Örnek Ürünler Dropdown / Pill */}
              <div className="flex items-center gap-1 text-[11px] font-normal lowercase">
                <span className="text-slate-400">örnek:</span>
                <button
                  type="button"
                  onClick={() => handleSelectPreset(PRESET_MARKET_DATABASE[0])}
                  className="text-[#00b49c] hover:underline font-semibold"
                >
                  Sıvı Sabun
                </button>
                <span className="text-slate-400">·</span>
                <button
                  type="button"
                  onClick={() => handleSelectPreset(PRESET_MARKET_DATABASE[1])}
                  className="text-[#00b49c] hover:underline font-semibold"
                >
                  Çamaşır Suyu
                </button>
                <span className="text-slate-400">·</span>
                <button
                  type="button"
                  onClick={() => handleSelectPreset(PRESET_MARKET_DATABASE[2])}
                  className="text-[#00b49c] hover:underline font-semibold"
                >
                  Glanex 20KG
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-8 relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Ürün adı yazın (örn: Sıvı El Sabunu 20 LT)"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") runMarketScan(productName, barcode, purchasePrice);
                  }}
                  className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-50 dark:bg-[#14242e] border border-slate-200 dark:border-[#1c3342] text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-[#00b49c] transition"
                />
              </div>
              <div className="sm:col-span-4 relative">
                <Barcode size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Barkod (EAN)"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") runMarketScan(productName, barcode, purchasePrice);
                  }}
                  className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-50 dark:bg-[#14242e] border border-slate-200 dark:border-[#1c3342] text-xs font-mono text-slate-800 dark:text-slate-200 placeholder:text-slate-400 outline-none focus:border-[#00b49c] transition"
                />
              </div>
            </div>
          </div>

          {/* Temel Parametreler Grid (Alış Fiyatı, Gider Payı, Hedef Kâr, KDV) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* 1. Alış Fiyatı (KDV Hariç) */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#1b3240] bg-slate-50/70 dark:bg-[#13222b] space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                <span className="uppercase tracking-wider">ALIŞ FİYATI</span>
                <span className="text-[10px] font-semibold text-slate-400">KDV HARİÇ</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={purchasePrice || ""}
                  onChange={(e) => setPurchasePrice(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="0.00"
                  className="w-full h-10 px-3 pr-10 rounded-xl bg-white dark:bg-[#0e1a22] border border-slate-200 dark:border-[#1e3544] text-base font-extrabold text-slate-900 dark:text-white outline-none focus:border-[#00b49c] tabular-nums"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-extrabold text-slate-400">
                  ₺
                </span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center justify-between">
                <span>Fatura net giriş maliyeti</span>
              </div>
            </div>

            {/* 2. Dükkân Gider Payı (Overhead) - Buton Grubu [%12] [%13] [%14] [%15] */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#1b3240] bg-slate-50/70 dark:bg-[#13222b] space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-1.5">
                  <Store size={14} className="text-[#00b49c]" />
                  <span className="uppercase tracking-wider">DÜKKÂN GİDER PAYI</span>
                </div>
                <span className="text-xs font-extrabold text-[#00b49c] tabular-nums">
                  %{overheadPercent} (+{formatMoney(pricingResult.overheadAmount)})
                </span>
              </div>

              {/* 4'lü Buton Grubu */}
              <div className="grid grid-cols-4 gap-1.5">
                {[12, 13, 14, 15].map((val) => {
                  const isActive = overheadPercent === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setOverheadPercent(val)}
                      className={cn(
                        "h-9 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center",
                        isActive
                          ? "bg-[#00b49c] text-white shadow-sm shadow-[#00b49c]/30 scale-102"
                          : "bg-white dark:bg-[#0e1a22] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#1e3544] hover:bg-slate-100 dark:hover:bg-[#162935]"
                      )}
                    >
                      %{val}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-400">
                Kira, elektrik, personel ve nakliye genel işletme gider payı
              </p>
            </div>

            {/* 3. Hedef Kâr Marjı Slider & Input */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#1b3240] bg-slate-50/70 dark:bg-[#13222b] space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-emerald-500" />
                  <span className="uppercase tracking-wider">HEDEF KÂR MARJI</span>
                </div>
                <span className="text-xs font-extrabold text-emerald-500 tabular-nums">
                  %{targetProfitPercent}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="5"
                  max="60"
                  step="1"
                  value={targetProfitPercent}
                  onChange={(e) => setTargetProfitPercent(parseInt(e.target.value) || 25)}
                  className="flex-1 accent-[#00b49c] cursor-pointer"
                />
                <div className="relative w-16">
                  <input
                    type="number"
                    min="1"
                    max="150"
                    value={targetProfitPercent}
                    onChange={(e) => setTargetProfitPercent(parseInt(e.target.value) || 0)}
                    className="w-full h-8 px-2 pr-6 rounded-lg bg-white dark:bg-[#0e1a22] border border-slate-200 dark:border-[#1e3544] text-xs font-bold text-slate-900 dark:text-white tabular-nums text-center outline-none focus:border-[#00b49c]"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">
                    %
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>Varsayılan: %25</span>
                <span>Standart Brüt Kâr</span>
              </div>
            </div>

            {/* 4. KDV Oranı & KDV Modu Toggle */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#1b3240] bg-slate-50/70 dark:bg-[#13222b] space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                <span className="uppercase tracking-wider">KDV ORANI & GÖSTERİM</span>
                <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200">
                  %{vatRate} KDV
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                {/* KDV %10 / %20 Butonları */}
                <div className="flex items-center gap-1.5">
                  {[10, 20].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setVatRate(rate)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer",
                        vatRate === rate
                          ? "bg-[#00b49c] text-white shadow-xs"
                          : "bg-white dark:bg-[#0e1a22] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#1e3544]"
                      )}
                    >
                      %{rate}
                    </button>
                  ))}
                </div>

                {/* KDV Modu Toggle Switch */}
                <button
                  type="button"
                  onClick={() => setVatIncludedMode((prev) => !prev)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all cursor-pointer flex items-center gap-1.5",
                    vatIncludedMode
                      ? "bg-teal-50 dark:bg-[#0e272c] text-[#00b49c] border-teal-300/50 dark:border-[#184a51]"
                      : "bg-slate-100 dark:bg-[#14232c] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-[#1e3544]"
                  )}
                  title="Fiyat gösterim modunu değiştir"
                >
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      vatIncludedMode ? "bg-[#00b49c]" : "bg-slate-400"
                    )}
                  />
                  <span>{vatIncludedMode ? "KDV Dahil" : "KDV Hariç"}</span>
                </button>
              </div>

              <p className="text-[10px] text-slate-400">
                {vatIncludedMode
                  ? "Arayüzdeki tüm tavsiye ve liste fiyatları KDV dahil gösterilir."
                  : "Arayüzdeki fiyatlar KDV hariç net matrah olarak gösterilir."}
              </p>
            </div>
          </div>

          {/* 3. Piyasa Karşılaştırma Şeridi (Market Comparison Strip) */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-[#1b3240] bg-slate-50/60 dark:bg-[#12202a] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  CANLI PİYASA TARAMASI (E-TİCARET & PAZARYERLERİ)
                </span>
                {marketData && (
                  <span className="text-[10px] text-slate-400 font-medium">
                    ({marketData.updatedAt})
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowSourcesDetail((prev) => !prev)}
                className="text-xs font-semibold text-[#00b49c] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>{showSourcesDetail ? "Detayları Gizle" : "Kaynakları İncele"}</span>
                {showSourcesDetail ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            </div>

            {/* 3 Sütunlu Metrik Şeridi */}
            <div className="grid grid-cols-3 gap-2.5">
              {/* En Düşük */}
              <div className="p-3 rounded-xl bg-white dark:bg-[#0c161d] border border-slate-200 dark:border-[#192c37] text-center">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  EN DÜŞÜK PİYASA
                </div>
                <div className="text-sm sm:text-base font-extrabold text-slate-800 dark:text-slate-200 tabular-nums mt-0.5">
                  {marketData?.minPrice ? formatMoney(marketData.minPrice) : "—"}
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">
                  {marketData?.sources[0]?.platform || "Akakçe"}
                </div>
              </div>

              {/* Medyan / Ortalama */}
              <div className="p-3 rounded-xl bg-teal-50/70 dark:bg-[#0e242b] border border-teal-200/60 dark:border-[#16474e] text-center shadow-xs">
                <div className="text-[10px] font-extrabold text-[#00b49c] uppercase tracking-wider flex items-center justify-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#00b49c] animate-pulse" />
                  <span>PİYASA MEDYANI</span>
                </div>
                <div className="text-base sm:text-lg font-black text-[#00b49c] tabular-nums mt-0.5">
                  {marketData?.medianPrice ? formatMoney(marketData.medianPrice) : "—"}
                </div>
                <div className="text-[10px] text-teal-600 dark:text-teal-400 font-medium truncate mt-0.5">
                  Ağırlıklı Ortalama
                </div>
              </div>

              {/* En Yüksek */}
              <div className="p-3 rounded-xl bg-white dark:bg-[#0c161d] border border-slate-200 dark:border-[#192c37] text-center">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  EN YÜKSEK PİYASA
                </div>
                <div className="text-sm sm:text-base font-extrabold text-slate-800 dark:text-slate-200 tabular-nums mt-0.5">
                  {marketData?.maxPrice ? formatMoney(marketData.maxPrice) : "—"}
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">
                  {marketData?.sources[marketData.sources.length - 1]?.platform || "Trendyol"}
                </div>
              </div>
            </div>

            {/* Platform Detay Tablosu (Açılır/Kapanır) */}
            {showSourcesDetail && marketData?.sources && (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-[#1a303e] bg-white dark:bg-[#0e181f] p-2 mt-2 animate-in fade-in duration-200">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-[#182c37] text-[10px] font-bold text-slate-400 uppercase">
                      <th className="py-1.5 px-2">PLATFORM</th>
                      <th className="py-1.5 px-2">SATICI</th>
                      <th className="py-1.5 px-2 text-right">FİYAT</th>
                      <th className="py-1.5 px-2 text-center">DURUM</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#152733]">
                    {marketData.sources.map((s, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-[#14232c]/50">
                        <td className="py-1.5 px-2 font-bold text-slate-700 dark:text-slate-200">
                          {s.platform}
                        </td>
                        <td className="py-1.5 px-2 text-slate-500 dark:text-slate-400">
                          {s.seller}
                        </td>
                        <td className="py-1.5 px-2 font-extrabold text-right tabular-nums text-slate-900 dark:text-white">
                          {formatMoney(s.price)}
                        </td>
                        <td className="py-1.5 px-2 text-center">
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                            Stokta
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* SAĞ BÖLÜM (5 Sütun): Canlı Karar Kartı (Decision Card) */}
        <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl border-2 border-[#00b49c]/40 dark:border-[#00b49c]/50 bg-gradient-to-b from-slate-50 to-white dark:from-[#11222c] dark:to-[#0c171e] p-5 sm:p-6 shadow-xl relative overflow-hidden">
          {/* Arka plan parlama efekti */}
          <div className="absolute top-0 right-0 w-44 h-44 bg-[#00b49c]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-4">
            {/* Karar Kartı Başlığı & Rozet */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                AKILLI FİYAT TAVSİYESİ
              </span>
              <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-[#00b49c]/15 text-[#00b49c] border border-[#00b49c]/30">
                {vatIncludedMode ? "KDV DAHİL" : "KDV HARİÇ"}
              </span>
            </div>

            {/* FIRSAT KÂRI VEYA RİSK UYARI ROZETLERİ */}
            {pricingResult.isOpportunity && (
              <div className="p-3 rounded-xl bg-amber-500/15 dark:bg-amber-500/20 border border-amber-500/40 text-amber-900 dark:text-amber-200 flex items-start gap-2.5 animate-pulse">
                <Flame size={18} className="text-amber-500 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <div className="font-extrabold">{pricingResult.opportunityBadge}</div>
                  <p className="text-[11px] opacity-90 mt-0.5 leading-tight">
                    Piyasa genelinde ürüne zam geldi! Sistem, sermaye erimesini önleyerek fiyatı piyasa medyanının %6 altına konumlandırdı.
                  </p>
                </div>
              </div>
            )}

            {pricingResult.isAtRisk && (
              <div className="p-3 rounded-xl bg-rose-500/15 dark:bg-rose-500/20 border border-rose-500/40 text-rose-900 dark:text-rose-200 flex items-start gap-2.5">
                <AlertTriangle size={18} className="text-rose-500 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <div className="font-extrabold">{pricingResult.riskWarning}</div>
                  <p className="text-[11px] opacity-90 mt-0.5 leading-tight">
                    Piyasa satış fiyatı taban maliyetinizin altına inmiş. Fiyat başabaş maliyet tabanında korundu.
                  </p>
                </div>
              </div>
            )}

            {/* Büyük Tavsiye Satış Fiyatı */}
            <div className="py-3 px-4 rounded-xl bg-white dark:bg-[#0c161d] border border-slate-200 dark:border-[#1a303e] shadow-inner text-center space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                ÖNERİLEN OPTİMİZE SATIŞ FİYATI
              </div>
              <div className="text-3xl sm:text-4xl font-black tracking-tight text-[#00b49c] tabular-nums">
                {formatMoney(pricingResult.recommendedDisplayPrice)}
              </div>
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Psikolojik yuvarlama uygulandı (.90 kuruş)
              </div>
            </div>

            {/* Detaylı Metrik Dökümü */}
            <div className="space-y-2 pt-1 border-t border-slate-200/80 dark:border-[#1a303e] text-xs">
              {/* Taban Başabaş Maliyeti */}
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <span>Taban Başabaş Maliyeti:</span>
                  <span className="text-[10px] text-slate-400">(Alış + Gider)</span>
                </span>
                <span className="font-bold tabular-nums text-slate-800 dark:text-slate-200">
                  {formatMoney(pricingResult.breakevenDisplay)}
                </span>
              </div>

              {/* Standart Maliyet Fiyatı */}
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500 dark:text-slate-400">
                  Standart Fiyat (%{targetProfitPercent} kâr):
                </span>
                <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                  {formatMoney(pricingResult.standardDisplay)}
                </span>
              </div>

              {/* Net Kâr Marjı ve Tutarı */}
              <div className="flex items-center justify-between py-1 border-t border-dashed border-slate-200 dark:border-[#1c3342] pt-2">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  Gerçekleşen Net Kâr:
                </span>
                <div className="text-right">
                  <span className="font-extrabold text-emerald-500 tabular-nums text-sm">
                    %{pricingResult.netProfitMarginPercent} Net Kâr
                  </span>
                  <span className="text-[11px] text-slate-400 block tabular-nums">
                    (+{formatMoney(pricingResult.netProfitAmount)} / adet)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Alt Aksiyon Butonları */}
          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-[#1a303e] space-y-2">
            <button
              type="button"
              onClick={handleApplyPrice}
              className={cn(
                "w-full py-3 px-4 rounded-xl text-sm font-extrabold text-white transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-2",
                applied
                  ? "bg-emerald-600 shadow-emerald-600/30"
                  : "bg-[#00b49c] hover:bg-[#009e89] shadow-[#00b49c]/30 hover:scale-[1.01]"
              )}
            >
              {applied ? (
                <>
                  <Check size={18} strokeWidth={2.5} />
                  <span>Fiyat Başarıyla Uygulandı!</span>
                </>
              ) : (
                <>
                  <Sparkles size={17} strokeWidth={2.2} />
                  <span>Fiyatı Onayla ve Kaydet</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="w-full py-2 px-3 rounded-xl text-xs font-semibold bg-white dark:bg-[#14232c] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#1e3544] hover:bg-slate-50 dark:hover:bg-[#192f3c] transition active:scale-98 flex items-center justify-center gap-1.5"
            >
              {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              <span>{copied ? "Kopyalandı!" : "Fiyat Özetini Kopyala"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
