import {
  LayoutDashboard,
  FileText,
  FileSignature,
  ClipboardList,
  Truck,
  Zap,
  Users,
  Receipt,
  ShoppingCart,
  Wallet,
  Building2,
  UserRound,
  Landmark,
  ScrollText,
  FileSpreadsheet,
  Package,
  Warehouse,
  ArrowLeftRight,
  History,
  Tags,
  BarChart3,
  Percent,
  TrendingUp,
  CalendarDays,
  Settings,
  Undo2,
  ClipboardCheck,
  PieChart,
  BookUser,
  Boxes,
  Activity,
  FileCheck,
  FilePlus,
  Inbox,
  Send,
  Sparkles,
  Monitor,
  Globe,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/providers/org-provider";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Bu rollere gizlenir */
  hideFor?: Role[];
  /** Hangi fazda gelecek (yoksa hazır) */
  phase?: number;
  keywords?: string;
};

export type NavGroup = { title: string; icon?: LucideIcon; items: NavItem[] };

export const NAV: NavGroup[] = [
  {
    title: "",
    items: [
      { title: "Güncel Durum", href: "/panel", icon: LayoutDashboard, keywords: "panel özet dashboard" },
      { title: "REN Yapay Zeka", href: "/yapay-zeka", icon: Sparkles, keywords: "yapay zeka ai zarar önleme kâr koruma fiyat farkı asistan" },
      { title: "Hızlı Satış", href: "/hizli-satis", icon: Zap, keywords: "pos kasa barkod" },
      { title: "Fiyat Gör Kiosk", href: "/fiyat-gor", icon: Monitor, keywords: "fiyat gör kiosk barkod okuyucu müşteri ekranı" },
    ],
  },
  {
    title: "Satışlar",
    icon: ShoppingCart,
    items: [
      { title: "Teklifler", href: "/satislar/teklifler", icon: FileSignature },
      { title: "Siparişler", href: "/satislar/siparisler", icon: ClipboardList },
      { title: "Faturalar", href: "/satislar/faturalar", icon: FileText, keywords: "satış faturası" },
      { title: "Giden İrsaliyeler", href: "/satislar/irsaliyeler", icon: Truck },
      { title: "Satış İadeleri", href: "/satislar/iadeler", icon: Undo2 },
      { title: "Müşteriler", href: "/cariler/musteriler", icon: Users, keywords: "cari" },
    ],
  },
  {
    title: "Giderler",
    icon: Receipt,
    items: [
      { title: "Alış Faturaları", href: "/giderler/alis-faturalari", icon: ShoppingCart },
      { title: "Masraflar", href: "/giderler/masraflar", icon: Receipt, keywords: "fiş gider" },
      { title: "Satın Alma Siparişleri", href: "/giderler/siparisler", icon: ClipboardList },
      { title: "Gelen İrsaliyeler", href: "/giderler/irsaliyeler", icon: Truck },
      { title: "Alış İadeleri", href: "/giderler/iadeler", icon: Undo2 },
      { title: "Tedarikçiler", href: "/cariler/tedarikciler", icon: Building2, keywords: "cari" },
      { title: "Çalışanlar", href: "/giderler/calisanlar", icon: UserRound, keywords: "maaş personel", hideFor: ["staff"] },
    ],
  },
  {
    title: "Nakit",
    icon: Wallet,
    items: [
      { title: "Kasa ve Bankalar", href: "/nakit/hesaplar", icon: Landmark, keywords: "hesap kredi kartı" },
      { title: "Tahsilat / Ödemeler", href: "/nakit/hareketler", icon: Wallet, keywords: "virman" },
      { title: "Çek & Senet", href: "/nakit/cek-senet", icon: ScrollText },
      { title: "Banka Ekstresi", href: "/nakit/ekstre", icon: FileSpreadsheet, hideFor: ["staff"] },
    ],
  },
  {
    title: "Stok",
    icon: Package,
    items: [
      { title: "Ürün ve Hizmetler", href: "/stok/urunler", icon: Package, keywords: "ürün barkod" },
      { title: "Online Katalog", href: "/stok/katalog", icon: Globe, keywords: "katalog online ürünler web" },
      { title: "Depolar", href: "/stok/depolar", icon: Warehouse },
      { title: "Depo Transferleri", href: "/stok/transfer", icon: ArrowLeftRight },
      { title: "Stok Sayımı", href: "/stok/sayim", icon: ClipboardCheck },
      { title: "Stok Geçmişi", href: "/stok/hareketler", icon: History },
      { title: "Fiyat Listeleri", href: "/stok/fiyat-listeleri", icon: Tags },
    ],
  },
  {
    title: "E-Fatura / E-Arşiv",
    icon: FileCheck,
    items: [
      { title: "Fatura Oluştur", href: "/e-fatura/olustur", icon: FilePlus, keywords: "e-fatura e-arşiv fatura kes oluştur gib" },
      { title: "Gelen E-Faturalar", href: "/e-fatura/gelen", icon: Inbox, keywords: "gelen e-fatura gib gelen kutusu alış faturası" },
      { title: "Giden E-Faturalar", href: "/e-fatura/giden", icon: Send, keywords: "giden e-fatura e-arşiv satış faturası gib" },
      { title: "Fatura KDV Raporu", href: "/e-fatura/kdv-raporu", icon: Percent, keywords: "fatura kdv raporu matrah tevkifat beyanname" },
    ],
  },
  {
    title: "Raporlar",
    icon: BarChart3,
    items: [
      { title: "Büyüme & Sağlık", href: "/raporlar/buyume-skorboard", icon: Activity, hideFor: ["staff"], keywords: "skorbord büyüme sağlık ciro trend kâr marjı hacim" },
      { title: "Gelir Gider", href: "/raporlar/gelir-gider", icon: TrendingUp, hideFor: ["staff"], keywords: "kâr kar karlılık" },
      { title: "KDV Raporu", href: "/raporlar/kdv", icon: Percent, hideFor: ["staff"] },
      { title: "Nakit Akışı", href: "/raporlar/nakit-akisi", icon: BarChart3, hideFor: ["staff"] },
      { title: "Satış Analizi", href: "/raporlar/satis", icon: PieChart, hideFor: ["staff"] },
      { title: "Cari Bakiyeler", href: "/raporlar/cari-bakiye", icon: BookUser, hideFor: ["staff"], keywords: "yaşlandırma alacak borç" },
      { title: "Stok Raporu", href: "/raporlar/stok", icon: Boxes, hideFor: ["staff"] },
    ],
  },
  {
    title: "",
    items: [
      { title: "Ajanda", href: "/ajanda", icon: CalendarDays, keywords: "hatırlatma takvim not" },
      { title: "Ayarlar", href: "/ayarlar", icon: Settings, keywords: "firma kullanıcı numara birim kur" },
    ],
  },
];

export const ALL_NAV_ITEMS = NAV.flatMap((g) => g.items);

export function findNavItem(pathname: string): NavItem | undefined {
  return [...ALL_NAV_ITEMS].sort((a, b) => b.href.length - a.href.length).find((i) => pathname.startsWith(i.href));
}

/** Hızlı işlemler (+ butonu) */
export const QUICK_ACTIONS: { title: string; href: string; icon: LucideIcon; tone: string }[] = [
  { title: "Satış Faturası", href: "/satislar/faturalar/yeni", icon: FileText, tone: "text-primary bg-primary-soft" },
  { title: "Hızlı Satış", href: "/hizli-satis", icon: Zap, tone: "text-warning bg-warning-soft" },
  { title: "Fiyat Gör", href: "/fiyat-gor", icon: Monitor, tone: "text-slate-700 bg-slate-100 dark:bg-slate-800 dark:text-slate-200" },
  { title: "Tahsilat", href: "/nakit/hareketler/yeni?tip=tahsilat", icon: Wallet, tone: "text-slate-800 bg-slate-200 dark:bg-slate-700 dark:text-slate-100" },
  { title: "Masraf / Fiş", href: "/giderler/masraflar/yeni", icon: Receipt, tone: "text-danger bg-danger-soft" },
  { title: "Alış Faturası", href: "/giderler/alis-faturalari/yeni", icon: ShoppingCart, tone: "text-brown bg-surface-2" },
  { title: "Müşteri", href: "/cariler/musteriler/yeni", icon: Users, tone: "text-primary bg-primary-soft" },
];
