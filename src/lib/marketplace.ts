/** Pazaryeri kârlılık hesabı. Komisyon/kargo/reklam faturalarındaki %20 KDV indirilebilir kabul edilir. */

export const SERVICE_VAT = 1.2;

export type MarketplaceInputs = {
  commission: number; // %
  shipping: number; // ₺ KDV dahil
  packaging: number; // ₺
  ads: number; // % (satış fiyatı üzerinden)
  returns: number; // % iade oranı
  fee: number; // ₺ KDV dahil hizmet bedeli
  targetMargin: number; // % (net satış üzerinden)
};

export type MarketplaceResult = {
  netPrice: number;
  commission: number;
  ads: number;
  shipping: number;
  fee: number;
  packaging: number;
  returnLoss: number;
  cost: number;
  profit: number;
  margin: number;
  roi: number;
  breakEven: number | null;
  suggested: number | null;
};

const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** @param cost KDV hariç alış maliyeti, @param price KDV dahil satış fiyatı */
export function calcMarketplace(
  cost: number,
  price: number,
  vatRate: number,
  inp: MarketplaceInputs
): MarketplaceResult {
  const vat = 1 + num(vatRate) / 100;
  const netPrice = price / vat;
  const commission = (price * inp.commission) / 100 / SERVICE_VAT;
  const ads = (price * inp.ads) / 100 / SERVICE_VAT;
  const shipping = inp.shipping / SERVICE_VAT;
  const fee = inp.fee / SERVICE_VAT;
  const returnLoss = (inp.returns / 100) * ((inp.shipping * 2) / SERVICE_VAT + inp.packaging);

  const fixed = cost + shipping + fee + inp.packaging + returnLoss;
  const profit = netPrice - fixed - commission - ads;

  const variableRate = (inp.commission + inp.ads) / 100 / SERVICE_VAT;
  const breakEvenDen = 1 / vat - variableRate;
  const suggestedDen = (1 - inp.targetMargin / 100) / vat - variableRate;

  return {
    netPrice,
    commission,
    ads,
    shipping,
    fee,
    packaging: inp.packaging,
    returnLoss,
    cost,
    profit,
    margin: netPrice > 0 ? (profit / netPrice) * 100 : 0,
    roi: cost > 0 ? (profit / cost) * 100 : 0,
    breakEven: breakEvenDen > 0 ? fixed / breakEvenDen : null,
    suggested: suggestedDen > 0 ? fixed / suggestedDen : null,
  };
}

/** Varsayılanlar yalnızca başlangıç değeridir; kendi tarifenize göre değiştirin. */
export const MARKETPLACE_PRESETS: { id: string; name: string; commission: number }[] = [
  { id: "trendyol", name: "Trendyol", commission: 15 },
  { id: "hepsiburada", name: "Hepsiburada", commission: 14 },
  { id: "n11", name: "n11", commission: 12 },
  { id: "amazon", name: "Amazon TR", commission: 12 },
  { id: "ciceksepeti", name: "Çiçeksepeti", commission: 15 },
  { id: "ozel", name: "Kendi Sitem", commission: 3 },
];
