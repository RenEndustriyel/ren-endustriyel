"use client";

import * as React from "react";
import {
  Sparkles,
  TrendingUp,
  Check,
  Copy,
  Barcode,
  Search,
  Store,
  ArrowRight,
  Percent,
  Calculator,
  Info,
} from "lucide-react";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  calculateSmartPrice,
  type SmartPricingInput,
  type SmartPricingResult,
} from "@/lib/pricing/calculateSmartPrice";
import { useUpdate, useProducts } from "@/lib/data";

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
  initialPurchasePrice = 0,
  initialBarcode = "",
  initialProductName = "",
  initialVatRate = 20,
  productId,
  onApplyPrice,
  className,
}: SmartPricingCardProps) {
  const [productName, setProductName] = React.useState(initialProductName);
  const [barcode, setBarcode] = React.useState(initialBarcode);
  const [purchasePrice, setPurchasePrice] = React.useState<number>(initialPurchasePrice);
  const [overheadPercent, setOverheadPercent] = React.useState<number>(13);
  const [targetProfitPercent, setTargetProfitPercent] = React.useState<number>(25);
  const [vatRate, setVatRate] = React.useState<number>(initialVatRate);
  const [vatIncludedMode, setVatIncludedMode] = React.useState<boolean>(true);
  const [copied, setCopied] = React.useState(false);
  const [applied, setApplied] = React.useState(false);

  const updateProduct = useUpdate("products");

  // Hesaplama reaktif
  const pricingResult: SmartPricingResult = React.useMemo(() => {
    return calculateSmartPrice({
      purchasePrice,
      overheadPercent,
      targetProfitPercent,
      vatRate,
      vatIncludedMode,
    });
  }, [purchasePrice, overheadPercent, targetProfitPercent, vatRate, vatIncludedMode]);

  // Fiyatı onayla ve kaydet
  const handleApplyPrice = async () => {
    if (!purchasePrice || purchasePrice <= 0) {
      toast.error("Lütfen önce alış fiyatı giriniz.");
      return;
    }
    const finalPrice = pricingResult.recommendedDisplayPrice;

    if (onApplyPrice) {
      onApplyPrice(finalPrice, vatIncludedMode);
      setApplied(true);
      setTimeout(() => setApplied(false), 2000);
      toast.success(
        `${productName || "Ürün"} için ${formatMoney(finalPrice)} ${vatIncludedMode ? "KDV Dahil" : "KDV Hariç"} fiyat uygulandı!`
      );
      return;
    }

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
      } catch {
        toast.error("Fiyat kaydedilirken hata oluştu.");
      }
    } else {
      setApplied(true);
      setTimeout(() => setApplied(false), 2000);
      toast.success(`Fiyat ${formatMoney(finalPrice)} olarak hesaplandı!`);
    }
  };

  const handleCopy = () => {
    const text = `${productName || "Ürün"}\nAlış: ${formatMoney(purchasePrice)} TL\nÖnerilen Satış: ${formatMoney(pricingResult.recommendedDisplayPrice)} (${vatIncludedMode ? "KDV Dahil" : "KDV Hariç"})\nNet Kâr: %${pricingResult.netProfitMarginPercent} (+${formatMoney(pricingResult.netProfitAmount)} TL)`;
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
      {/* Üst Başlık */}
      <div className="relative px-5 py-4 bg-gradient-to-r from-emerald-600/10 via-[#00b49c]/10 to-teal-500/5 dark:from-[#00b49c]/20 dark:to-[#0c1820] border-b border-slate-200 dark:border-[#182c37] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#00b49c] text-white flex items-center justify-center shadow-md shadow-[#00b49c]/25 shrink-0">
            <Calculator size={20} strokeWidth={2.2} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white tracking-tight">
                Fiyat Hesaplayıcı
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40">
                GERÇEK VERİ
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Alış maliyeti + dükkân gider payı + hedef kâr marjı + KDV
            </p>
          </div>
        </div>

        {/* Bilgi notu */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white dark:bg-[#142530] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-[#1e3544]">
          <Info size={13} className="text-slate-400" />
          <span>Yalnızca girdiğiniz gerçek maliyete göre hesaplar</span>
        </div>
      </div>

      {/* Ana Gövde Grid: Sol Form, Sağ Karar Kartı */}
      <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* SOL BÖLÜM (7 Sütun): Parametreler */}
        <div className="lg:col-span-7 space-y-4 sm:space-y-5">
          {/* Ürün & Barkod */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
              ÜRÜN / BARKOD (İsteğe Bağlı)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-8 relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Ürün adı (referans için)"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
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
                  className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-50 dark:bg-[#14242e] border border-slate-200 dark:border-[#1c3342] text-xs font-mono text-slate-800 dark:text-slate-200 placeholder:text-slate-400 outline-none focus:border-[#00b49c] transition"
                />
              </div>
            </div>
          </div>

          {/* Temel Parametreler Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* 1. Alış Fiyatı (KDV Hariç) */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#1b3240] bg-slate-50/70 dark:bg-[#13222b] space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                <span className="uppercase tracking-wider">ALIŞ FİYATI *</span>
                <span className="text-[10px] font-semibold text-slate-400">KDV HARİÇ NET</span>
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
              <p className="text-[11px] text-slate-400">
                Faturadaki KDV hariç net giriş maliyeti
              </p>
            </div>

            {/* 2. Dükkân Gider Payı */}
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

            {/* 3. Hedef Kâr Marjı */}
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
                  max="100"
                  step="1"
                  value={targetProfitPercent}
                  onChange={(e) => setTargetProfitPercent(parseInt(e.target.value) || 25)}
                  className="flex-1 accent-[#00b49c] cursor-pointer"
                />
                <div className="relative w-16">
                  <input
                    type="number"
                    min="1"
                    max="200"
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
                <span>Min: %5</span>
                <span>Varsayılan: %25</span>
                <span>Max: %100</span>
              </div>
            </div>

            {/* 4. KDV Oranı & Gösterim */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#1b3240] bg-slate-50/70 dark:bg-[#13222b] space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                <span className="uppercase tracking-wider">KDV ORANI & GÖSTERİM</span>
                <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200">
                  %{vatRate} KDV
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {[0, 10, 20].map((rate) => (
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
                  ? "Tavsiye fiyat KDV dahil olarak gösterilir."
                  : "Tavsiye fiyat KDV hariç net matrah olarak gösterilir."}
              </p>
            </div>
          </div>

          {/* Maliyet Özeti Şeridi */}
          {purchasePrice > 0 && (
            <div className="p-4 rounded-xl border border-slate-200 dark:border-[#1b3240] bg-slate-50/60 dark:bg-[#12202a] space-y-2.5">
              <div className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-1">
                MALİYET ANALİZİ
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl bg-white dark:bg-[#0c161d] border border-slate-200 dark:border-[#192c37] text-center">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">NET ALIŞ</div>
                  <div className="text-sm font-extrabold text-slate-800 dark:text-slate-200 tabular-nums mt-0.5">
                    {formatMoney(purchasePrice)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">KDV Hariç</div>
                </div>
                <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-[#1a1e0e] border border-amber-200/60 dark:border-[#3a3a1a] text-center">
                  <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">GİDER PAYI</div>
                  <div className="text-sm font-extrabold text-amber-700 dark:text-amber-300 tabular-nums mt-0.5">
                    +{formatMoney(pricingResult.overheadAmount)}
                  </div>
                  <div className="text-[10px] text-amber-500 mt-0.5">%{overheadPercent}</div>
                </div>
                <div className="p-3 rounded-xl bg-rose-50/70 dark:bg-[#1a0e0e] border border-rose-200/60 dark:border-[#3a1a1a] text-center">
                  <div className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">BAŞABAŞ</div>
                  <div className="text-sm font-extrabold text-rose-700 dark:text-rose-300 tabular-nums mt-0.5">
                    {formatMoney(pricingResult.breakevenDisplay)}
                  </div>
                  <div className="text-[10px] text-rose-500 mt-0.5">{vatIncludedMode ? "KDV Dahil" : "KDV Hariç"}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SAĞ BÖLÜM (5 Sütun): Karar Kartı */}
        <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl border-2 border-[#00b49c]/40 dark:border-[#00b49c]/50 bg-gradient-to-b from-slate-50 to-white dark:from-[#11222c] dark:to-[#0c171e] p-5 sm:p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-44 h-44 bg-[#00b49c]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-4">
            {/* Karar Kartı Başlığı */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                ÖNERİLEN SATIŞ FİYATI
              </span>
              <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-[#00b49c]/15 text-[#00b49c] border border-[#00b49c]/30">
                {vatIncludedMode ? "KDV DAHİL" : "KDV HARİÇ"}
              </span>
            </div>

            {purchasePrice <= 0 && (
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-[#13222b] border border-slate-200 dark:border-[#1e3544] text-center text-xs text-slate-500 dark:text-slate-400">
                Hesaplama için solda alış fiyatı giriniz
              </div>
            )}

            {/* Büyük Tavsiye Fiyatı */}
            {purchasePrice > 0 && (
              <div className="py-3 px-4 rounded-xl bg-white dark:bg-[#0c161d] border border-slate-200 dark:border-[#1a303e] shadow-inner text-center space-y-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  OPTİMİZE SATIŞ FİYATI
                </div>
                <div className="text-3xl sm:text-4xl font-black tracking-tight text-[#00b49c] tabular-nums">
                  {formatMoney(pricingResult.recommendedDisplayPrice)}
                </div>
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Psikolojik yuvarlama (.90 kuruş)
                </div>
              </div>
            )}

            {/* Detaylı Metrik Dökümü */}
            {purchasePrice > 0 && (
              <div className="space-y-2 pt-1 border-t border-slate-200/80 dark:border-[#1a303e] text-xs">
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <span>Başabaş Maliyeti:</span>
                    <span className="text-[10px] text-slate-400">(Alış + Gider)</span>
                  </span>
                  <span className="font-bold tabular-nums text-slate-800 dark:text-slate-200">
                    {formatMoney(pricingResult.breakevenDisplay)}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500 dark:text-slate-400">
                    Standart Fiyat (%{targetProfitPercent} kâr):
                  </span>
                  <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                    {formatMoney(pricingResult.standardDisplay)}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-t border-dashed border-slate-200 dark:border-[#1c3342] pt-2">
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    Net Kâr (Gider Sonrası):
                  </span>
                  <div className="text-right">
                    <span className="font-extrabold text-emerald-500 tabular-nums text-sm">
                      %{pricingResult.netProfitMarginPercent}
                    </span>
                    <span className="text-[11px] text-slate-400 block tabular-nums">
                      (+{formatMoney(pricingResult.netProfitAmount)} / adet)
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500 dark:text-slate-400">
                    Brüt Kâr (Gider Öncesi):
                  </span>
                  <div className="text-right">
                    <span className="font-semibold text-teal-600 dark:text-teal-400 tabular-nums">
                      %{pricingResult.grossProfitMarginPercent}
                    </span>
                    <span className="text-[11px] text-slate-400 block tabular-nums">
                      (+{formatMoney(pricingResult.grossProfitAmount)} / adet)
                    </span>
                  </div>
                </div>

                {vatIncludedMode && (
                  <div className="flex items-center justify-between py-1 border-t border-slate-100 dark:border-[#1c3342] pt-2">
                    <span className="text-slate-400 text-[11px]">KDV Hariç karşılığı:</span>
                    <span className="font-mono text-slate-500 dark:text-slate-400 text-[11px] tabular-nums">
                      {formatMoney(pricingResult.recommendedPriceExclVat)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Alt Aksiyon Butonları */}
          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-[#1a303e] space-y-2">
            <button
              type="button"
              onClick={handleApplyPrice}
              disabled={purchasePrice <= 0}
              className={cn(
                "w-full py-3 px-4 rounded-xl text-sm font-extrabold text-white transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed",
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
              disabled={purchasePrice <= 0}
              className="w-full py-2 px-3 rounded-xl text-xs font-semibold bg-white dark:bg-[#14232c] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#1e3544] hover:bg-slate-50 dark:hover:bg-[#192f3c] transition active:scale-98 flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
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
