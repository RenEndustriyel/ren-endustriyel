import catalog from "./catalog.json";
import { STORE_CATEGORIES, type StoreProduct } from "./store-shared";

/**
 * Mağaza kataloğu. Yalnızca sunucu bileşenlerinden içe aktarın (liste tarayıcıya gönderilmesin).
 * catalog.json, ERP ürün listesinden scripts/magaza-katalog.mjs ile üretilir.
 */
export const PRODUCTS = catalog as StoreProduct[];

const fold = (s: string) =>
  s
    .toLocaleLowerCase("tr-TR")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u");

export const brandSlug = (brand: string) =>
  fold(brand)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const findProduct = (slug: string) => PRODUCTS.find((p) => p.slug === slug);

export const CATEGORY_COUNTS: Record<string, number> = Object.fromEntries(
  STORE_CATEGORIES.map((c) => [c.slug, PRODUCTS.filter((p) => p.cat === c.slug).length]),
);

export type StoreBrand = { name: string; slug: string; count: number };

export const STORE_BRANDS: StoreBrand[] = Object.values(
  PRODUCTS.reduce<Record<string, StoreBrand>>((acc, p) => {
    if (!p.brand) return acc;
    const slug = brandSlug(p.brand);
    acc[slug] ??= { name: p.brand, slug, count: 0 };
    acc[slug].count += 1;
    return acc;
  }, {}),
).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "tr"));

export const SORTS = [
  { value: "onerilen", label: "Önerilen sıralama" },
  { value: "az", label: "Ada göre (A-Z)" },
  { value: "za", label: "Ada göre (Z-A)" },
  { value: "fiyat-artan", label: "Fiyat (artan)" },
  { value: "fiyat-azalan", label: "Fiyat (azalan)" },
] as const;

export type SortValue = (typeof SORTS)[number]["value"];

export type ProductQuery = { kategori?: string; marka?: string; q?: string; sirala?: string };

export function queryProducts({ kategori, marka, q, sirala }: ProductQuery) {
  const words = fold(q ?? "")
    .split(/\s+/)
    .filter(Boolean);
  const list = PRODUCTS.filter((p) => {
    if (kategori && p.cat !== kategori) return false;
    if (marka && brandSlug(p.brand) !== marka) return false;
    if (words.length) {
      const hay = fold(`${p.name} ${p.brand} ${p.barcode ?? ""}`);
      if (!words.every((w) => hay.includes(w))) return false;
    }
    return true;
  });
  const byName = (a: StoreProduct, b: StoreProduct) => a.name.localeCompare(b.name, "tr");
  // Fiyatı olmayanlar fiyat sıralamasında sona kalır
  const byPrice = (dir: 1 | -1) => (a: StoreProduct, b: StoreProduct) =>
    a.price === undefined || b.price === undefined ? Number(a.price === undefined) - Number(b.price === undefined) || byName(a, b) : (a.price - b.price) * dir;
  if (sirala === "az") list.sort(byName);
  else if (sirala === "za") list.sort((a, b) => byName(b, a));
  else if (sirala === "fiyat-artan") list.sort(byPrice(1));
  else if (sirala === "fiyat-azalan") list.sort(byPrice(-1));
  return list;
}

/** Vitrin: görseli olan ürünler */
export const FEATURED = PRODUCTS.filter((p) => p.image);

export const relatedProducts = (p: StoreProduct, n = 6) => {
  const same = PRODUCTS.filter((x) => x.cat === p.cat && x.slug !== p.slug);
  const sameBrand = same.filter((x) => p.brand && x.brand === p.brand);
  const rest = same.filter((x) => !sameBrand.includes(x));
  return [...sameBrand, ...rest].slice(0, n);
};
