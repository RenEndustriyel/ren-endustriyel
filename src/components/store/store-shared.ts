import {
  Brush,
  Coffee,
  CupSoda,
  Droplets,
  Hand,
  ScrollText,
  Shirt,
  SprayCan,
  Trash2,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import { CONTACT } from "@/components/landing/contact";

/** Mağaza önizleme aşamasında: fiyatlar örnektir, çevrimiçi tahsilat kapalıdır. Canlıya alırken false yapın. */
export const STORE_PREVIEW = true;

export type StoreProduct = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  cat: string;
  image: string;
  barcode?: string;
  /** Fiyat yoksa ürün "fiyat sorunuz" olarak listelenir */
  price?: number;
  unit?: string;
  pack?: string;
};

export type StoreCategory = { slug: string; title: string; short: string; icon: LucideIcon; tint: string; ink: string };

export const STORE_CATEGORIES: StoreCategory[] = [
  { slug: "yuzey", title: "Yüzey & Genel Temizlik", short: "Yüzey Temizlik", icon: SprayCan, tint: "#e8f3ee", ink: "#1f5a3f" },
  { slug: "camasir-suyu", title: "Çamaşır Suyu", short: "Çamaşır Suyu", icon: Droplets, tint: "#e6f1fa", ink: "#1d5f8f" },
  { slug: "bulasik", title: "Bulaşık Grubu", short: "Bulaşık", icon: Utensils, tint: "#fff3d9", ink: "#96690a" },
  { slug: "camasir-bakim", title: "Çamaşır Bakımı", short: "Çamaşır Bakımı", icon: Shirt, tint: "#ece9fb", ink: "#5446a8" },
  { slug: "sabun", title: "Sıvı Sabun & Kişisel Bakım", short: "Sıvı Sabun", icon: Hand, tint: "#fbe9f0", ink: "#a13a66" },
  { slug: "kagit", title: "Kağıt Ürünleri", short: "Kağıt", icon: ScrollText, tint: "#f3efe6", ink: "#7a5c2e" },
  { slug: "ambalaj", title: "Tek Kullanımlık & Ambalaj", short: "Ambalaj", icon: CupSoda, tint: "#fdeee4", ink: "#a8501a" },
  { slug: "poset", title: "Çöp Poşeti & Poşet", short: "Poşet", icon: Trash2, tint: "#e9eeec", ink: "#3c4a44" },
  { slug: "ekipman", title: "Temizlik Ekipmanları", short: "Ekipman", icon: Brush, tint: "#e4f4f4", ink: "#12686b" },
  { slug: "diger", title: "Gıda & Diğer", short: "Gıda", icon: Coffee, tint: "#f0ede9", ink: "#5f5346" },
];

/** Üst menü grupları (alt kategorileriyle) */
export const STORE_GROUPS: { title: string; cats: string[] }[] = [
  { title: "Temizlik", cats: ["yuzey", "camasir-suyu", "bulasik", "camasir-bakim"] },
  { title: "Hijyen", cats: ["sabun", "kagit"] },
  { title: "Ambalaj", cats: ["ambalaj"] },
  { title: "Sarf", cats: ["poset", "ekipman"] },
  { title: "Gıda", cats: ["diger"] },
];

export const categoryOf = (slug: string) => STORE_CATEGORIES.find((c) => c.slug === slug) ?? STORE_CATEGORIES[STORE_CATEGORIES.length - 1];

export const money = (value: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

export const productHref = (slug: string) => `/magaza/urun/${slug}`;

export const listHref = (params: Record<string, string | number | undefined | null>) => {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  const s = q.toString();
  return s ? `/magaza/urunler?${s}` : "/magaza/urunler";
};

export const waLink = (text: string) => `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(text)}`;

export { CONTACT };
