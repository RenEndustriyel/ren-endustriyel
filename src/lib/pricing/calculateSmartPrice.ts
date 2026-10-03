/**
 * Akıllı Satış Fiyatlandırma ve Dinamik Piyasa Motoru (Smart Pricing Engine)
 * 
 * Perakende ve toptan ürünlerde kâr optimizasyonu yapan, dükkân operasyonel giderlerini
 * (overhead) hesaba katan ve canlı piyasa verisine göre fırsat kârı yakalayan saf servis fonksiyonu.
 */

export interface SmartPricingInput {
  /** Alış Fiyatı (KDV Hariç net fatura giriş maliyeti) */
  purchasePrice: number;
  /** Dükkân Gider Payı yüzdesi (örn: 12, 13, 14, 15 - varsayılan 13) */
  overheadPercent?: number;
  /** Hedef Kâr Marjı yüzdesi (varsayılan 25) */
  targetProfitPercent?: number;
  /** KDV Oranı (örn: 10 veya 20 - varsayılan 20) */
  vatRate?: number;
  /** KDV Gösterim Modu (true: KDV Dahil, false: KDV Hariç) */
  vatIncludedMode?: boolean;
  /** Canlı Piyasa Medyan / Ortalama Perakende Fiyatı (KDV Dahil) */
  marketMedianPrice?: number | null;
  /** Piyasa Minimum Fiyatı (KDV Dahil) */
  marketMinPrice?: number | null;
  /** Piyasa Maksimum Fiyatı (KDV Dahil) */
  marketMaxPrice?: number | null;
}

export interface SmartPricingResult {
  // Girdi parametreleri
  purchasePrice: number;
  overheadPercent: number;
  targetProfitPercent: number;
  vatRate: number;
  vatIncludedMode: boolean;

  // Maliyet & Başabaş
  overheadAmount: number;
  costExclVat: number;
  breakevenExclVat: number;
  breakevenInclVat: number;
  breakevenDisplay: number;

  // Standart Maliyet Bazlı Fiyat
  standardExclVat: number;
  standardInclVat: number;
  standardRoundedInclVat: number;
  standardDisplay: number;

  // Nihai Sistem Tavsiye Fiyatı
  recommendedPriceInclVat: number;
  recommendedPriceExclVat: number;
  recommendedDisplayPrice: number;

  // Kâr ve Marj Metrikleri
  netProfitAmount: number;
  netProfitMarginPercent: number;
  grossProfitAmount: number;
  grossProfitMarginPercent: number;

  // Fırsat Kârı (Eski Maliyet Tuzağı Koruması)
  isOpportunity: boolean;
  opportunityDiffAmount: number;
  opportunityBadge: string | null;

  // Zarar Riski (Maliyet Koruma Kuralı)
  isAtRisk: boolean;
  riskWarning: string | null;

  // Piyasa Özeti
  marketComparison: {
    min: number | null;
    median: number | null;
    max: number | null;
    ratioToMarket: number | null;
  };
}

/**
 * Psikolojik Fiyat Yuvarlama Motoru
 * Sayının tam kısmı alınıp sonu .90 kuruş olacak şekilde bitmelidir.
 * Örnek: 168.15 TL -> 168.90 TL | 234.10 TL -> 234.90 TL
 */
export function roundToPsychological90(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  const intPart = Math.floor(value);
  return Number((intPart + 0.9).toFixed(2));
}

/**
 * Akıllı Fiyat Hesaplayıcı
 */
export function calculateSmartPrice(input: SmartPricingInput): SmartPricingResult {
  const purchasePrice = Math.max(0, Number(input.purchasePrice) || 0);
  const overheadPercent = Number.isFinite(input.overheadPercent) ? Number(input.overheadPercent) : 13;
  const targetProfitPercent = Number.isFinite(input.targetProfitPercent) ? Number(input.targetProfitPercent) : 25;
  const vatRate = Number.isFinite(input.vatRate) ? Number(input.vatRate) : 20;
  const vatIncludedMode = input.vatIncludedMode ?? true;

  const marketMedian = input.marketMedianPrice && input.marketMedianPrice > 0 ? Number(input.marketMedianPrice) : null;
  const marketMin = input.marketMinPrice && input.marketMinPrice > 0 ? Number(input.marketMinPrice) : null;
  const marketMax = input.marketMaxPrice && input.marketMaxPrice > 0 ? Number(input.marketMaxPrice) : null;

  // 1. Dükkân Gideri ve Toplam Taban Maliyeti (KDV Hariç)
  const overheadAmount = Number((purchasePrice * (overheadPercent / 100)).toFixed(2));
  const costExclVat = Number((purchasePrice + overheadAmount).toFixed(2));

  // 2. Taban Başabaş Maliyeti
  const breakevenExclVat = costExclVat;
  const breakevenInclVat = Number((costExclVat * (1 + vatRate / 100)).toFixed(2));

  // 3. Standart Maliyet Bazlı Satış Fiyatı
  const standardExclVat = Number((costExclVat * (1 + targetProfitPercent / 100)).toFixed(2));
  const standardInclVat = Number((standardExclVat * (1 + vatRate / 100)).toFixed(2));
  const standardRoundedInclVat = roundToPsychological90(standardInclVat);

  // 4. Canlı Piyasa Taraması & Fırsat Kârı Algoritması
  let isOpportunity = false;
  let opportunityDiffAmount = 0;
  let opportunityBadge: string | null = null;
  let recommendedPriceInclVat = standardRoundedInclVat;

  // KURAL: Eğer Piyasa Ortalama Fiyatı > Standart Fiyat * 1.20 ise:
  // (Piyasa ürüne ciddi zam yapmış, eski maliyette kalmayıp fırsat kârı yakalayalım)
  if (marketMedian && standardRoundedInclVat > 0 && marketMedian > standardRoundedInclVat * 1.2) {
    isOpportunity = true;
    // Piyasa ortalamasının %6 altına konumlandırılır (piyasaya göre hem ucuz kalır hem ekstra kâr yakalar)
    const targetOpportunityPrice = marketMedian * (1 - 0.06);
    recommendedPriceInclVat = roundToPsychological90(targetOpportunityPrice);
    opportunityDiffAmount = Number((recommendedPriceInclVat - standardRoundedInclVat).toFixed(2));
    opportunityBadge = `🔥 Fırsat Kârı Tespit Edildi (+${opportunityDiffAmount.toLocaleString("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} TL Ekstra Kâr)`;
  }

  // 5. Maliyet Koruma Kuralı
  // Önerilen fiyat hiçbir koşulda Alış + Gider Payı + KDV tabanının altına inemez.
  const minSafePriceInclVat = roundToPsychological90(breakevenInclVat);
  if (recommendedPriceInclVat < minSafePriceInclVat) {
    recommendedPriceInclVat = minSafePriceInclVat;
  }

  let isAtRisk = false;
  let riskWarning: string | null = null;
  if (marketMedian && marketMedian < breakevenInclVat) {
    isAtRisk = true;
    riskWarning = "⚠️ Zarar Riski: Piyasa Fiyatı Maliyetinizin Altında";
  }

  // 6. Tavsiye Fiyatının KDV Hariç Karşılığı
  const recommendedPriceExclVat = Number((recommendedPriceInclVat / (1 + vatRate / 100)).toFixed(2));

  // 7. Net Kâr ve Brüt Kâr Analizi
  // Net Kâr = Net Satış Fiyatı - (Alış Fiyatı + Dükkân Gider Payı)
  const netProfitAmount = Number((recommendedPriceExclVat - costExclVat).toFixed(2));
  const netProfitMarginPercent =
    costExclVat > 0 ? Number(((netProfitAmount / costExclVat) * 100).toFixed(1)) : 0;

  // Brüt Kâr = Net Satış Fiyatı - Alış Fiyatı
  const grossProfitAmount = Number((recommendedPriceExclVat - purchasePrice).toFixed(2));
  const grossProfitMarginPercent =
    purchasePrice > 0 ? Number(((grossProfitAmount / purchasePrice) * 100).toFixed(1)) : 0;

  // 8. Gösterim Değerleri (KDV Dahil / KDV Hariç Switch'e Göre)
  const breakevenDisplay = vatIncludedMode ? breakevenInclVat : breakevenExclVat;
  const standardDisplay = vatIncludedMode
    ? standardRoundedInclVat
    : Number((standardRoundedInclVat / (1 + vatRate / 100)).toFixed(2));
  const recommendedDisplayPrice = vatIncludedMode ? recommendedPriceInclVat : recommendedPriceExclVat;

  const ratioToMarket = marketMedian && marketMedian > 0 ? Number((recommendedPriceInclVat / marketMedian).toFixed(2)) : null;

  return {
    purchasePrice,
    overheadPercent,
    targetProfitPercent,
    vatRate,
    vatIncludedMode,

    overheadAmount,
    costExclVat,
    breakevenExclVat,
    breakevenInclVat,
    breakevenDisplay,

    standardExclVat,
    standardInclVat,
    standardRoundedInclVat,
    standardDisplay,

    recommendedPriceInclVat,
    recommendedPriceExclVat,
    recommendedDisplayPrice,

    netProfitAmount,
    netProfitMarginPercent,
    grossProfitAmount,
    grossProfitMarginPercent,

    isOpportunity,
    opportunityDiffAmount,
    opportunityBadge,

    isAtRisk,
    riskWarning,

    marketComparison: {
      min: marketMin,
      median: marketMedian,
      max: marketMax,
      ratioToMarket,
    },
  };
}
