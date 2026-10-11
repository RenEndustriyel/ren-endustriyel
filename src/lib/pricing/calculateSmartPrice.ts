/**
 * Akıllı Satış Fiyatlandırma Motoru (Smart Pricing Engine)
 *
 * Perakende ve toptan ürünlerde kâr optimizasyonu yapan, dükkân operasyonel giderlerini
 * (overhead) hesaba katan, saf matematik temelli fiyat hesaplama servisi.
 *
 * NOT: Piyasa karşılaştırması (Trendyol, Akakçe vb.) gerçek API olmadığı için
 * kapsam dışı bırakılmıştır. Hesaplama yalnızca gerçek veriye dayanır.
 */

export interface SmartPricingInput {
  /** Alış Fiyatı (KDV Hariç net fatura giriş maliyeti) */
  purchasePrice: number;
  /** Dükkân Gider Payı yüzdesi (örn: 12, 13, 14, 15 - varsayılan 13) */
  overheadPercent?: number;
  /** Hedef Kâr Marjı yüzdesi (varsayılan 25) */
  targetProfitPercent?: number;
  /** KDV Oranı (örn: 0, 1, 10, 20 - varsayılan 20) */
  vatRate?: number;
  /** KDV Gösterim Modu (true: KDV Dahil, false: KDV Hariç) */
  vatIncludedMode?: boolean;
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
}

/**
 * Psikolojik Fiyat Yuvarlama Motoru
 * Sayının tam kısmı alınıp sonu .90 kuruş olacak şekilde biter.
 * Örnek: 168.15 TL → 168.90 TL | 234.10 TL → 234.90 TL
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

  // 4. Önerilen Fiyat = Standart Fiyat (piyasa taraması yok)
  const recommendedPriceInclVat = standardRoundedInclVat;

  // 5. Maliyet Güvenlik Tabanı
  const minSafePriceInclVat = roundToPsychological90(breakevenInclVat);
  const finalRecommendedInclVat = Math.max(recommendedPriceInclVat, minSafePriceInclVat);

  // 6. KDV Hariç Karşılığı
  const recommendedPriceExclVat = Number((finalRecommendedInclVat / (1 + vatRate / 100)).toFixed(2));

  // 7. Net Kâr ve Brüt Kâr Analizi
  const netProfitAmount = Number((recommendedPriceExclVat - costExclVat).toFixed(2));
  const netProfitMarginPercent =
    costExclVat > 0 ? Number(((netProfitAmount / costExclVat) * 100).toFixed(1)) : 0;

  const grossProfitAmount = Number((recommendedPriceExclVat - purchasePrice).toFixed(2));
  const grossProfitMarginPercent =
    purchasePrice > 0 ? Number(((grossProfitAmount / purchasePrice) * 100).toFixed(1)) : 0;

  // 8. Gösterim Değerleri
  const breakevenDisplay = vatIncludedMode ? breakevenInclVat : breakevenExclVat;
  const standardDisplay = vatIncludedMode
    ? standardRoundedInclVat
    : Number((standardRoundedInclVat / (1 + vatRate / 100)).toFixed(2));
  const recommendedDisplayPrice = vatIncludedMode ? finalRecommendedInclVat : recommendedPriceExclVat;

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

    recommendedPriceInclVat: finalRecommendedInclVat,
    recommendedPriceExclVat,
    recommendedDisplayPrice,

    netProfitAmount,
    netProfitMarginPercent,
    grossProfitAmount,
    grossProfitMarginPercent,
  };
}
