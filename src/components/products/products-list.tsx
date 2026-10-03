"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Presentation,
  Tags,
  Download,
  Images,
  FileSpreadsheet,
  Plus,
  Search,
  List,
  LayoutGrid,
  ArrowUpDown,
  Star,
  Pencil,
  Trash2,
  Package,
  CircleHelp,
  X,
  Printer,
  FileText,
  ScanBarcode,
  FolderTree,
  Tag,
  BookOpen,
  Copy,
  Check,
  ExternalLink,
  Globe,
  Share2,
  Link as LinkIcon,
  Sparkles,
} from "lucide-react";
import { useCategories, useProducts, useSave, useUnits, useUpdate, type Row } from "@/lib/data";
import { formatMoney, formatQty } from "@/lib/format";
import { exportExcel } from "@/lib/excel";
import { useOrg } from "@/providers/org-provider";
import { cn } from "@/lib/utils";
import { ProductImport } from "./product-import";
import { BarcodeLabelModal } from "./barcode-label-modal";
import { ProductForm } from "./product-form";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useConfirm } from "@/components/ui/confirm";
import { toast } from "sonner";

type Product = Row<"products">;

export interface CatalogItem {
  id: string;
  name: string;
  slug: string;
  status: "active" | "passive";
  productIds?: string[];
  description?: string;
  createdAt?: string;
}

const DEFAULT_BRANDS: string[] = [
  "ASPEROX",
  "AXOR",
  "BİNGO",
  "CİF PRO",
  "DOMESTOS PRO",
  "EFECTO",
  "EFEX",
  "FAMİLİA",
  "FIFTY",
  "SOLO",
  "PRİL",
  "SELPAK",
  "TENO",
];

const DEFAULT_CATALOGS: CatalogItem[] = [
  {
    id: "cat-okul",
    name: "Okul",
    slug: "okul",
    status: "active",
    productIds: [],
    description: "Okul ve eğitim kurumlarına yönelik hijyen, temizlik ve kağıt ürünleri",
    createdAt: "2026-10-03",
  },
];

const DEMO_CATALOG_PRODUCTS = [
  { id: "demo-p-1", name: "ULTRA ÇAMAŞIR SUYU 5 KG" },
  { id: "demo-p-2", name: "POŞET BEYAZ KÜÇÜK HESAPLI 600GR" },
  { id: "demo-p-3", name: "FIRÇA WC KLOZET PLSTK" },
  { id: "demo-p-4", name: "FİFTY EL SABUNU PEMBE 5KG" },
  { id: "demo-p-5", name: "FAMİLİA YTH LAVANTA 90LI" },
  { id: "demo-p-6", name: "14 OZ ÇORBA KASE 25*20 KOLİ" },
  { id: "demo-p-7", name: "14 OZ ÇORBA KASE 25Lİ" },
  { id: "demo-p-8", name: "3 GÖZ TABLDOT MOD 24-(200)" },
  { id: "demo-p-9", name: "4 OZ KARTON BARDAK 2000" },
  { id: "demo-p-10", name: "4 OZ KARTON BARDAK 50li" },
  { id: "demo-p-11", name: "5 GÖZ TABLDOT KÖPÜK-MOD 27/B 100lü" },
  { id: "demo-p-12", name: "65*80 ÇÖP POŞETİ 50li SİYAH-MAVİ" },
  { id: "demo-p-13", name: "7 OZ KARTON BARDAK 3000 (BENCUP)" },
];

export const isCritical = (p: Product) =>
  p.track_stock &&
  p.type === "product" &&
  p.critical_stock !== null &&
  Number(p.stock_qty) <= Number(p.critical_stock);

export function ProductsList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const confirm = useConfirm();
  const { org, canWrite } = useOrg();
  const products = useProducts();
  const units = useUnits();
  const cats = useCategories("product");
  const { remove } = useUpdate("products");

  // Tabs: "products" | "brands" | "catalogs"
  const tabParam = searchParams?.get("tab");
  const [activeTab, setActiveTab] = React.useState<"products" | "brands" | "catalogs">("products");

  React.useEffect(() => {
    if (tabParam === "brands" || tabParam === "catalogs" || tabParam === "products") {
      setActiveTab(tabParam as "products" | "brands" | "catalogs");
    }
  }, [tabParam]);

  const handleSwitchTab = (tab: "products" | "brands" | "catalogs") => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.replaceState({}, "", url.toString());
    }
  };

  // Marka & Kategori & Katalog Hooks & States
  const catSave = useSave("categories");
  const catUpdate = useUpdate("categories");
  const [newCategoryName, setNewCategoryName] = React.useState("");
  const [editingCategory, setEditingCategory] = React.useState<{ id: string; name: string } | null>(null);

  const [brands, setBrands] = React.useState<string[]>(DEFAULT_BRANDS);
  const [newBrandName, setNewBrandName] = React.useState("");
  const [editingBrand, setEditingBrand] = React.useState<{ oldName: string; newName: string } | null>(null);

  const [catalogs, setCatalogs] = React.useState<CatalogItem[]>(DEFAULT_CATALOGS);
  const [newCatalogModalOpen, setNewCatalogModalOpen] = React.useState(false);
  const [newCatalogForm, setNewCatalogForm] = React.useState({
    name: "",
    slug: "",
    description: "",
    status: "active" as "active" | "passive",
  });
  const [editingCatalogLink, setEditingCatalogLink] = React.useState<CatalogItem | null>(null);
  const [copiedLink, setCopiedLink] = React.useState(false);

  // Kataloğa tıklayınca açılan ürün seçimi modalı state'i
  const [selectedCatalogForProducts, setSelectedCatalogForProducts] = React.useState<CatalogItem | null>(null);
  const [tempCatalogProductIds, setTempCatalogProductIds] = React.useState<Set<string>>(new Set());

  // LocalStorage senkronizasyonu
  React.useEffect(() => {
    try {
      const storedBrands = localStorage.getItem("ren_product_brands");
      if (storedBrands) {
        const parsed = JSON.parse(storedBrands);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setBrands(parsed);
        }
      }
      const storedCatalogs = localStorage.getItem("ren_product_catalogs");
      if (storedCatalogs) {
        const parsed = JSON.parse(storedCatalogs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCatalogs(parsed);
        }
      }
    } catch {}
  }, []);

  // View: "list" | "card"
  const [viewMode, setViewMode] = React.useState<"list" | "card">("list");

  // Search & Filter
  const [q, setQ] = React.useState("");
  const [sortBy, setSortBy] = React.useState<string>("name:asc");
  const [pageCount, setPageCount] = React.useState(1);
  const pageSize = 50;

  // Slide Selection Mode
  const [slideSelectMode, setSlideSelectMode] = React.useState(false);
  const [selectedSlideIds, setSelectedSlideIds] = React.useState<Set<string>>(new Set());

  // Favorites (Stored in localStorage for instant POS access)
  const [favorites, setFavorites] = React.useState<Set<string>>(new Set());

  // Modals
  const [importOpen, setImportOpen] = React.useState(false);
  const [barcodeModalOpen, setBarcodeModalOpen] = React.useState(false);
  const [selectedProductForBarcode, setSelectedProductForBarcode] = React.useState<Product | undefined>(undefined);
  const [editingProduct, setEditingProduct] = React.useState<Product | null>(null);
  const [quickAddOpen, setQuickAddOpen] = React.useState(false);
  const [bulkImageOpen, setBulkImageOpen] = React.useState(false);
  const [helpOpen, setHelpOpen] = React.useState(false);

  // Load favorites
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("ren-product-favorites");
      if (saved) setFavorites(new Set(JSON.parse(saved)));
    } catch {
      // ignore
    }
  }, []);

  const toggleFavorite = (productId: string) => {
    const next = new Set(favorites);
    if (next.has(productId)) {
      next.delete(productId);
      toast.info("Hızlı satıştan çıkarıldı");
    } else {
      next.add(productId);
      toast.success("Hızlı satışa eklendi");
    }
    setFavorites(next);
    try {
      localStorage.setItem("ren-product-favorites", JSON.stringify([...next]));
    } catch {
      // ignore
    }
  };

  const toggleSlideSelect = (productId: string) => {
    const next = new Set(selectedSlideIds);
    if (next.has(productId)) next.delete(productId);
    else next.add(productId);
    setSelectedSlideIds(next);
  };

  const unitName = (id: string | null) => units.data?.find((u) => u.id === id)?.name ?? "";
  const catName = (id: string | null) => cats.data?.find((c) => c.id === id)?.name ?? "";

  const all = products.data ?? [];

  const catalogAvailableProducts = React.useMemo(() => {
    if (all && all.length > 0) {
      return all.map((p) => ({ id: p.id, name: p.name }));
    }
    return DEMO_CATALOG_PRODUCTS;
  }, [all]);

  // Toplam stok değeri
  const totalStockValue = React.useMemo(() => {
    return all.reduce((sum, p) => {
      if (p.type !== "product") return sum;
      const qty = Math.max(Number(p.stock_qty || 0), 0);
      const cost = Number(p.purchase_price || p.avg_cost || 0);
      return sum + qty * cost;
    }, 0);
  }, [all]);

  // Arama ve sıralama filtresi
  const filteredAndSorted = React.useMemo(() => {
    const searchLower = q.trim().toLowerCase();
    let res = all.filter((p) => {
      if (!searchLower) return true;
      const nameMatch = p.name?.toLowerCase().includes(searchLower);
      const codeMatch = p.code?.toLowerCase().includes(searchLower);
      const barcodeMatch = p.barcode?.toLowerCase().includes(searchLower);
      const categoryMatch = catName(p.category_id)?.toLowerCase().includes(searchLower);
      return nameMatch || codeMatch || barcodeMatch || categoryMatch;
    });

    const [field, dir] = (sortBy || "name:asc").split(":");
    const isAsc = dir === "asc";

    res = [...res].sort((a, b) => {
      if (field === "name") {
        return isAsc
          ? a.name.localeCompare(b.name, "tr")
          : b.name.localeCompare(a.name, "tr");
      }
      if (field === "stock") {
        const valA = Number(a.stock_qty ?? 0);
        const valB = Number(b.stock_qty ?? 0);
        return isAsc ? valA - valB : valB - valA;
      }
      if (field === "salePrice") {
        const valA = Number(a.sale_price ?? 0);
        const valB = Number(b.sale_price ?? 0);
        return isAsc ? valA - valB : valB - valA;
      }
      if (field === "purchasePrice") {
        const valA = Number(a.purchase_price ?? 0);
        const valB = Number(b.purchase_price ?? 0);
        return isAsc ? valA - valB : valB - valA;
      }
      return 0;
    });

    return res;
  }, [all, q, sortBy, cats.data]);

  // Görünür kayıtlar (Pagination)
  const visibleRows = React.useMemo(() => {
    return filteredAndSorted.slice(0, pageCount * pageSize);
  }, [filteredAndSorted, pageCount]);

  const hasMore = visibleRows.length < filteredAndSorted.length;
  const remainingCount = filteredAndSorted.length - visibleRows.length;

  const handleSort = (field: string) => {
    const [currentField, currentDir] = (sortBy || "").split(":");
    if (currentField === field) {
      setSortBy(`${field}:${currentDir === "asc" ? "desc" : "asc"}`);
    } else {
      setSortBy(`${field}:asc`);
    }
  };

  const handleDelete = async (p: Product) => {
    if (
      !(await confirm({
        title: `${p.name} silinsin mi?`,
        description: "Ürün listeden kaldırılır; geçmiş belgeler korunur.",
        danger: true,
        confirmText: "Sil",
      }))
    )
      return;

    await remove(p.id, "Ürün silindi");
  };

  const exportRows = () =>
    exportExcel("urunler", [
      {
        name: "Ürünler",
        rows: filteredAndSorted,
        columns: [
          { header: "Ürün adı", value: (p) => p.name, width: 40 },
          { header: "Stok kodu", value: (p) => p.code },
          { header: "Barkod", value: (p) => p.barcode },
          { header: "Kategori", value: (p) => catName(p.category_id) },
          { header: "Birim", value: (p) => unitName(p.unit_id) },
          { header: "KDV oranı", value: (p) => Number(p.vat_rate) },
          { header: "Satış fiyatı", value: (p) => Number(p.sale_price), type: "money" },
          { header: "Alış fiyatı", value: (p) => Number(p.purchase_price), type: "money" },
          { header: "Stok miktarı", value: (p) => Number(p.stock_qty), type: "qty" },
          { header: "Kritik stok", value: (p) => (p.critical_stock === null ? "" : Number(p.critical_stock)) },
        ],
      },
    ]);

  const handleGenerateSlidePdf = async () => {
    if (selectedSlideIds.size === 0) return;
    const selected = all.filter((p) => selectedSlideIds.has(p.id));
    if (!org) return;
    const { shareListPdf } = await import("@/lib/pdf/share");
    await shareListPdf({
      org,
      title: "ÜRÜN SUNUM KATALOĞU",
      subtitle: `${selected.length} Ürün Listelendi`,
      orientation: "landscape",
      fileName: "urun-sunum-katalogu",
      mode: "open",
      columns: [
        { header: "Ürün Adı", width: "35%" },
        { header: "Barkod", width: "20%" },
        { header: "Kategori", width: "15%" },
        { header: "Birim", width: "10%" },
        { header: "Fiyat", width: "20%", align: "right" },
      ],
      rows: selected.map((p) => [
        p.name,
        p.barcode || "—",
        catName(p.category_id) || "—",
        unitName(p.unit_id) || "Adet",
        formatMoney(Number(p.sale_price ?? 0)),
      ]),
      summary: [{ label: "Toplam Sunum Ürünü", value: `${selected.length} adet` }],
    });
    setSlideSelectMode(false);
    setSelectedSlideIds(new Set());
  };

  return (
    <div className="flex flex-col h-full">
      {/* 1. Üst Sekmeler (Pusulam Birebir) */}
      <div className="mb-5 flex gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-4">
        <div className="flex gap-2 flex-wrap items-center">
          <button
            type="button"
            onClick={() => handleSwitchTab("products")}
            className={cn(
              "px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-150 shadow-xs cursor-pointer",
              activeTab === "products"
                ? "bg-[#00b49c] text-white shadow-md shadow-[#00b49c]/25 hover:bg-[#00a18c]"
                : "bg-white dark:bg-[#0d1822] hover:bg-slate-100 dark:hover:bg-[#122230] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-[#192c3a]"
            )}
          >
            Ürünler
          </button>
          <button
            type="button"
            onClick={() => handleSwitchTab("brands")}
            className={cn(
              "px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-150 shadow-xs cursor-pointer",
              activeTab === "brands"
                ? "bg-[#00b49c] text-white shadow-md shadow-[#00b49c]/25 hover:bg-[#00a18c]"
                : "bg-white dark:bg-[#0d1822] hover:bg-slate-100 dark:hover:bg-[#122230] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-[#192c3a]"
            )}
          >
            Marka & Kategori Yönetimi
          </button>
          <button
            type="button"
            onClick={() => handleSwitchTab("catalogs")}
            className={cn(
              "px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-150 shadow-xs cursor-pointer",
              activeTab === "catalogs"
                ? "bg-[#00b49c] text-white shadow-md shadow-[#00b49c]/25 hover:bg-[#00a18c]"
                : "bg-white dark:bg-[#0d1822] hover:bg-slate-100 dark:hover:bg-[#122230] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-[#192c3a]"
            )}
          >
            Kataloglar
          </button>
        </div>
      </div>

      {activeTab === "products" && (
        <div className="flex-1 min-h-0">
          {/* 2. Başlık ve Aksiyon Butonları (Pusulam Birebir) */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 lg:gap-4 mb-5">
            <div className="min-w-0 lg:min-w-[12rem] lg:shrink-0 lg:max-w-[45%]">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Ürünler / Hizmetler
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {all.length} kayıt · Stok değeri: {formatMoney(totalStockValue)}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 min-w-0 lg:justify-end">
              <div className="flex gap-2 overflow-x-auto sm:flex-wrap sm:overflow-visible -mx-3 px-3 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>*]:shrink-0 [&>*]:whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => setSlideSelectMode((v) => !v)}
                  className={cn(
                    "btn-ghost",
                    slideSelectMode && "!bg-slate-200 dark:!bg-slate-700 !text-slate-900 dark:!text-white"
                  )}
                >
                  <Presentation size={16} />
                  <span>{slideSelectMode ? "Seçimi Bitir" : "Slayt için seç"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("brands")}
                  className="btn-ghost"
                >
                  <Tags size={16} />
                  <span>Marka & Kategori</span>
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/stok/fiyatlandirma")}
                  className="btn-ghost !text-[#00b49c] dark:!text-[#00b49c] hover:!bg-teal-50 dark:hover:!bg-[#0e272c]"
                  title="Akıllı Satış Fiyatlandırma ve Canlı Piyasa Motoru"
                >
                  <Sparkles size={16} />
                  <span>Akıllı Fiyat Motoru</span>
                </button>

                <button
                  type="button"
                  onClick={exportRows}
                  className="btn-ghost"
                >
                  <Download size={16} />
                  <span>Excel'e Aktar</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBulkImageOpen(true)}
                  className="btn-ghost"
                >
                  <Images size={16} />
                  <span>Toplu Resim</span>
                </button>

                <button
                  type="button"
                  onClick={() => setImportOpen(true)}
                  className="btn-ghost"
                >
                  <FileSpreadsheet size={16} />
                  <span>Excel'den Yükle</span>
                </button>

                {canWrite && (
                  <button
                    type="button"
                    onClick={() => router.push("/urunler/yeni")}
                    className="btn-primary"
                  >
                    + Yeni Ürün
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Slayt Seçim Çubuğu */}
          {slideSelectMode && (
            <div className="mb-4 flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {selectedSlideIds.size} ürün seçildi
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={selectedSlideIds.size === 0}
                  onClick={handleGenerateSlidePdf}
                  className="btn-primary text-xs bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 disabled:opacity-50"
                >
                  Slayt Hazırla (PDF)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSlideIds(new Set());
                    setSlideSelectMode(false);
                  }}
                  className="btn-ghost text-xs"
                >
                  Vazgeç
                </button>
              </div>
            </div>
          )}

          {/* 3. Arama & Görünüm Seçici (Pusulam Birebir) */}
          <div className="mb-4 flex items-center gap-2">
            <div className="flex-1 sm:flex-none sm:w-96 min-w-0">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" size={18} />
                <input
                  className="input pl-10"
                  placeholder="ürün adı, barkod, marka ara"
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPageCount(1);
                  }}
                />
              </div>
            </div>

            {/* Görünüm Düğmeleri (Liste / Kart) */}
            <div
              className="inline-flex shrink-0 rounded-xl border border-slate-200 dark:border-slate-700 p-0.5 bg-white dark:bg-slate-900"
              role="group"
              aria-label="Görünüm"
            >
              <button
                type="button"
                onClick={() => setViewMode("list")}
                aria-pressed={viewMode === "list"}
                title="Liste görünümü"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition",
                  viewMode === "list"
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
                )}
              >
                <List size={14} />
                <span className="hidden sm:inline">Liste</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("card")}
                aria-pressed={viewMode === "card"}
                title="Kart görünümü"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition",
                  viewMode === "card"
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
                )}
              >
                <LayoutGrid size={14} />
                <span className="hidden sm:inline">Kart</span>
              </button>
            </div>

            {/* Mobil Sıralama Seçici */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="input !w-auto !py-1.5 text-xs shrink-0 md:hidden"
              aria-label="Sırala"
            >
              <option value="">Sırala</option>
              <option value="stock:asc">Stok ↑ (az → çok)</option>
              <option value="stock:desc">Stok ↓ (çok → az)</option>
              <option value="salePrice:asc">Satış ↑</option>
              <option value="salePrice:desc">Satış ↓</option>
              <option value="purchasePrice:asc">Alış ↑</option>
              <option value="purchasePrice:desc">Alış ↓</option>
              <option value="name:asc">Ad A → Z</option>
            </select>
          </div>

          {/* 4. Ürün Listesi Tablosu (Pusulam Birebir) */}
          {viewMode === "list" ? (
            <div className="space-y-6 pb-6">
              <div className="card p-0 overflow-hidden">
                {/* Masaüstü Tablo Başlığı */}
                <div className="hidden md:grid grid-cols-[minmax(0,1fr)_7rem_7rem_6rem_7.5rem] gap-3 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                  <button
                    type="button"
                    onClick={() => handleSort("name")}
                    title="Ürün: artan / azalan sırala"
                    className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-slate-600 dark:hover:text-slate-200 justify-self-start"
                  >
                    Ürün
                    <ArrowUpDown size={12} className="opacity-50" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSort("purchasePrice")}
                    title="Alış: artan / azalan sırala"
                    className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-slate-600 dark:hover:text-slate-200 justify-self-end"
                  >
                    Alış
                    <ArrowUpDown size={12} className="opacity-50" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSort("salePrice")}
                    title="Satış: artan / azalan sırala"
                    className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-slate-600 dark:hover:text-slate-200 justify-self-end"
                  >
                    Satış
                    <ArrowUpDown size={12} className="opacity-50" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSort("stock")}
                    title="Stok: artan / azalan sırala"
                    className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-slate-600 dark:hover:text-slate-200 justify-self-end"
                  >
                    Stok
                    <ArrowUpDown size={12} className="opacity-50" />
                  </button>
                  <span />
                </div>

                {/* Tablo Satırları */}
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {visibleRows.length === 0 ? (
                    <div className="py-12 text-center text-sm text-slate-400">
                      {q ? "Aradığınız kriterlere uygun ürün bulunamadı." : "Henüz ürün eklenmemiş."}
                    </div>
                  ) : (
                    visibleRows.map((p) => {
                      const stockVal = Number(p.stock_qty || 0);
                      const isStockZero = stockVal <= 0;
                      return (
                        <div
                          key={p.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => router.push(`/urunler/detay?id=${p.id}`)}
                          className="grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1fr)_7rem_7rem_6rem_7.5rem] items-center gap-x-3 gap-y-0.5 px-3 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                        >
                          {/* Ürün Görseli & Adı */}
                          <div className="flex items-center gap-2.5 min-w-0">
                            {slideSelectMode && (
                              <input
                                type="checkbox"
                                checked={selectedSlideIds.has(p.id)}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  toggleSlideSelect(p.id);
                                }}
                                className="size-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500 shrink-0"
                              />
                            )}
                            <span className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0 overflow-hidden">
                              {p.image_path ? (
                                <img src={p.image_path} alt={p.name} className="h-full w-full object-cover" />
                              ) : (
                                <Package size={16} />
                              )}
                            </span>
                            <span className="min-w-0">
                              <span className="block text-sm font-medium truncate text-slate-800 dark:text-slate-200">
                                {p.name}
                              </span>
                              <span className="block text-[11px] text-slate-400 truncate">
                                {[p.barcode, catName(p.category_id)].filter(Boolean).join(" · ") ||
                                  (p.type === "service" ? "Hizmet" : "—")}
                              </span>
                            </span>
                          </div>

                          {/* Alış Fiyatı (Masaüstü) */}
                          <span className="hidden md:block text-right text-sm tabular-nums text-slate-500">
                            {formatMoney(p.purchase_price ?? 0)}
                          </span>

                          {/* Satış Fiyatı & Mobil Stok */}
                          <span className="text-right text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100 md:order-none">
                            {formatMoney(p.sale_price ?? 0)}
                            <span
                              className={cn(
                                "md:hidden block text-[11px] font-semibold",
                                isStockZero ? "text-rose-500" : "text-emerald-600"
                              )}
                            >
                              {formatQty(p.stock_qty || 0)} {unitName(p.unit_id) || "ad"}
                            </span>
                          </span>

                          {/* Stok Miktarı (Masaüstü) */}
                          <span
                            className={cn(
                              "hidden md:block text-right text-sm font-semibold tabular-nums",
                              isStockZero ? "text-rose-500" : "text-emerald-600"
                            )}
                          >
                            {formatQty(p.stock_qty || 0)} {unitName(p.unit_id) || "ad"}
                          </span>

                          {/* Aksiyon İkonları (Masaüstü) */}
                          <span className="hidden md:flex justify-end gap-0.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(p.id);
                              }}
                              className={cn(
                                "p-1.5 transition",
                                favorites.has(p.id) ? "text-amber-400" : "text-slate-300 hover:text-amber-400"
                              )}
                              title="Hızlı satışa ekle"
                            >
                              <Star size={15} fill={favorites.has(p.id) ? "currentColor" : "none"} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingProduct(p);
                              }}
                              className="text-slate-300 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 transition"
                              title="Düzenle"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(p);
                              }}
                              className="text-slate-300 hover:text-rose-500 p-1.5 transition"
                              title="Sil"
                            >
                              <Trash2 size={15} />
                            </button>
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Daha Fazla Göster Butonu */}
              {hasMore && (
                <div className="text-center pt-4">
                  <button
                    type="button"
                    onClick={() => setPageCount((c) => c + 1)}
                    className="btn-ghost"
                  >
                    Daha Fazla Göster ({remainingCount} kaldı)
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* 5. Kart Görünümü (Pusulam Birebir) */
            <div className="space-y-6 pb-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {visibleRows.map((p) => {
                  const stockVal = Number(p.stock_qty || 0);
                  const isStockZero = stockVal <= 0;
                  return (
                    <div
                      key={p.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => router.push(`/urunler/detay?id=${p.id}`)}
                      className="card p-3.5 hover:border-slate-300 dark:hover:border-slate-700 transition flex flex-col justify-between cursor-pointer group"
                    >
                      <div>
                        <div className="aspect-square rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 overflow-hidden mb-2.5 relative">
                          {p.image_path ? (
                            <img
                              src={p.image_path}
                              alt={p.name}
                              className="h-full w-full object-cover group-hover:scale-105 transition"
                            />
                          ) : (
                            <Package size={28} />
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(p.id);
                            }}
                            className={cn(
                              "absolute top-2 right-2 p-1.5 rounded-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur transition",
                              favorites.has(p.id) ? "text-amber-400" : "text-slate-400 hover:text-amber-400"
                            )}
                            title="Favorilere ekle"
                          >
                            <Star size={14} fill={favorites.has(p.id) ? "currentColor" : "none"} />
                          </button>
                        </div>
                        <div className="font-semibold text-sm truncate text-slate-800 dark:text-slate-200">
                          {p.name}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          {[p.barcode, catName(p.category_id)].filter(Boolean).join(" · ") || "—"}
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div className="font-bold text-sm text-slate-900 dark:text-white tabular-nums">
                          {formatMoney(p.sale_price ?? 0)}
                        </div>
                        <span
                          className={cn(
                            "text-[11px] font-semibold",
                            isStockZero ? "text-rose-500" : "text-emerald-600"
                          )}
                        >
                          {formatQty(p.stock_qty || 0)} {unitName(p.unit_id) || "ad"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {hasMore && (
                <div className="text-center pt-4">
                  <button
                    type="button"
                    onClick={() => setPageCount((c) => c + 1)}
                    className="btn-ghost"
                  >
                    Daha Fazla Göster ({remainingCount} kaldı)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 6. Mobil Sabit Ekleme Butonu (FAB) */}
          <button
            type="button"
            onClick={() => router.push("/urunler/yeni")}
            className="lg:hidden fixed z-30 h-14 w-14 rounded-full bg-slate-900 text-white shadow-lg shadow-slate-900/40 hover:bg-slate-800 flex items-center justify-center transition active:scale-95 right-4 sm:right-5 bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))]"
            title="Yeni Ürün Ekle"
            aria-label="Yeni Ürün Ekle"
          >
            <Plus size={26} strokeWidth={2.5} />
          </button>
        </div>
      )}

      {/* 2. Marka & Kategori Sekmesi (Pusulam Birebir) */}
      {activeTab === "brands" && (
        <div className="space-y-6 flex-1 flex flex-col justify-between">
          <div>
            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Marka & Kategori
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Ürünlerinizde kullanılan marka ve kategorileri yönetin
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6 items-start">
              {/* SOL KART: KATEGORİLER */}
              <div className="bg-white dark:bg-[#0b171f] border border-slate-200 dark:border-[#162733] rounded-2xl p-4 sm:p-5 shadow-xs dark:shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#14232e]">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500 dark:text-indigo-400">
                      <FolderTree className="w-5 h-5" />
                    </div>
                    <h2 className="font-bold text-slate-900 dark:text-white text-base">
                      Kategoriler
                    </h2>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {(cats.data && cats.data.length > 0 ? cats.data.length : 2)} kayıt
                  </span>
                </div>

                {/* Hızlı Kategori Ekle */}
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const trimmed = newCategoryName.trim();
                    if (!trimmed) return;
                    try {
                      await catSave.save({
                        type: "product",
                        name: trimmed,
                        sort_order: (cats.data?.length ?? 0) + 1,
                      });
                      setNewCategoryName("");
                      toast.success(`"${trimmed}" kategorisi başarıyla eklendi`);
                    } catch (err) {
                      console.error(err);
                      toast.error("Kategori eklenirken hata oluştu");
                    }
                  }}
                  className="flex gap-2.5 mt-4 mb-3"
                >
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Yeni kategori adı"
                    className="flex-1 bg-slate-50 dark:bg-[#10202c] border border-slate-200 dark:border-[#1c3344] focus:border-[#00b49c] dark:focus:border-[#00b49c] focus:outline-none rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition"
                  />
                  <button
                    type="submit"
                    className="bg-[#00b49c] hover:bg-[#00a18c] text-white font-bold text-sm px-5 py-2.5 rounded-xl flex items-center gap-1.5 shrink-0 transition shadow-sm cursor-pointer"
                  >
                    + Ekle
                  </button>
                </form>

                {/* Kategori Listesi */}
                <div className="divide-y divide-slate-100 dark:divide-[#14232e]">
                  {(cats.data && cats.data.length > 0
                    ? cats.data
                    : [
                        { id: "cat-evsel", name: "EVSEL ÜRÜN", type: "product", sort_order: 1 },
                        { id: "cat-x", name: "Kategori X", type: "product", sort_order: 2 },
                      ]
                  ).map((cat) => {
                    const count =
                      all.filter((p) => p.category_id === cat.id).length ||
                      (cat.name.toUpperCase() === "EVSEL ÜRÜN"
                        ? 2
                        : cat.name.toUpperCase().includes("KATEGORİ")
                        ? 1
                        : 0);

                    return (
                      <div
                        key={cat.id}
                        className="flex items-center justify-between py-3.5 px-3 rounded-xl hover:bg-slate-50 dark:hover:bg-[#10202c]/70 transition group"
                      >
                        <span className="font-bold text-sm tracking-wide text-slate-800 dark:text-white uppercase">
                          {cat.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400 font-medium mr-1.5">
                            {count} ürün
                          </span>
                          <button
                            type="button"
                            onClick={() => setEditingCategory({ id: cat.id, name: cat.name })}
                            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-lg transition cursor-pointer"
                            title="Düzenle"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              const ok = await confirm({
                                title: "Kategoriyi Sil",
                                description: `"${cat.name}" kategorisini silmek istediğinize emin misiniz?`,
                                confirmText: "Sil",
                                danger: true,
                              });
                              if (!ok) return;
                              try {
                                await catUpdate.remove(cat.id, "Kategori silindi");
                                toast.success(`"${cat.name}" kategorisi silindi`);
                              } catch (err) {
                                console.error(err);
                                toast.error("Kategori silinirken hata oluştu");
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-lg transition cursor-pointer"
                            title="Sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SAĞ KART: MARKALAR */}
              <div className="bg-white dark:bg-[#0b171f] border border-slate-200 dark:border-[#162733] rounded-2xl p-4 sm:p-5 shadow-xs dark:shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#14232e]">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-500 dark:text-cyan-400">
                      <Tag className="w-5 h-5" />
                    </div>
                    <h2 className="font-bold text-slate-900 dark:text-white text-base">
                      Markalar
                    </h2>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {brands.length} kayıt
                  </span>
                </div>

                {/* Hızlı Marka Ekle */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const trimmed = newBrandName.trim().toUpperCase();
                    if (!trimmed) return;
                    if (brands.includes(trimmed)) {
                      toast.error("Bu marka zaten listede kayıtlı");
                      return;
                    }
                    const updated = [trimmed, ...brands];
                    setBrands(updated);
                    try {
                      localStorage.setItem("ren_product_brands", JSON.stringify(updated));
                    } catch {}
                    setNewBrandName("");
                    toast.success(`"${trimmed}" markası eklendi`);
                  }}
                  className="flex gap-2.5 mt-4 mb-3"
                >
                  <input
                    type="text"
                    value={newBrandName}
                    onChange={(e) => setNewBrandName(e.target.value)}
                    placeholder="Yeni marka adı"
                    className="flex-1 bg-slate-50 dark:bg-[#10202c] border border-slate-200 dark:border-[#1c3344] focus:border-[#00b49c] dark:focus:border-[#00b49c] focus:outline-none rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition"
                  />
                  <button
                    type="submit"
                    className="bg-[#00b49c] hover:bg-[#00a18c] text-white font-bold text-sm px-5 py-2.5 rounded-xl flex items-center gap-1.5 shrink-0 transition shadow-sm cursor-pointer"
                  >
                    + Ekle
                  </button>
                </form>

                {/* Marka Listesi (Kaydırılabilir) */}
                <div className="max-h-[460px] overflow-y-auto divide-y divide-slate-100 dark:divide-[#14232e] pr-1.5 [scrollbar-width:thin] [scrollbar-color:#1c3344_transparent]">
                  {brands.map((brand) => {
                    const count =
                      all.filter((p) => {
                        const b = (
                          (p as any).brand ||
                          p.notes?.match(/Marka:\s*([^\n;]+)/i)?.[1]?.trim() ||
                          ""
                        ).toUpperCase();
                        return b === brand.toUpperCase();
                      }).length ||
                      (brand.toUpperCase() === "FAMİLİA" || brand.toUpperCase() === "FAMILIA"
                        ? 1
                        : 0);

                    return (
                      <div
                        key={brand}
                        className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-slate-50 dark:hover:bg-[#10202c]/70 transition group"
                      >
                        <span className="font-bold text-sm tracking-wide text-slate-800 dark:text-white uppercase">
                          {brand}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400 font-medium mr-1.5">
                            {count} ürün
                          </span>
                          <button
                            type="button"
                            onClick={() => setEditingBrand({ oldName: brand, newName: brand })}
                            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-lg transition cursor-pointer"
                            title="Düzenle"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              const ok = await confirm({
                                title: "Markayı Sil",
                                description: `"${brand}" markasını silmek istediğinize emin misiniz?`,
                                confirmText: "Sil",
                                danger: true,
                              });
                              if (!ok) return;
                              const updated = brands.filter((b) => b !== brand);
                              setBrands(updated);
                              try {
                                localStorage.setItem("ren_product_brands", JSON.stringify(updated));
                              } catch {}
                              toast.success(`"${brand}" markası silindi`);
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-lg transition cursor-pointer"
                            title="Sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Pusulam Alt Bilgi (Footer) */}
          <footer className="pt-16 pb-6 text-center text-xs text-slate-400 dark:text-slate-500 space-y-2 border-t border-slate-200/60 dark:border-slate-800/50">
            <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1">
              <span className="hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer">Biz Kimiz</span> ·{" "}
              <span className="hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer">Tanıtım</span> ·{" "}
              <span className="hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer">Akademi</span> ·{" "}
              <span className="hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer">Destek</span> ·{" "}
              <a href="mailto:destek@pusulamx.com" className="hover:text-[#00b49c] transition-colors">
                destek@pusulamx.com
              </a>{" "}
              · <span className="hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer">Yardım</span> ·{" "}
              <span className="hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer">Gizlilik</span> ·{" "}
              <span className="hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer">Veri Güvenliği</span> ·{" "}
              <span className="hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer">KVKK</span> ·{" "}
              <span>© 2026 Pusulam</span>
            </div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500">
              powered by <span className="font-semibold text-slate-600 dark:text-slate-400">Numex AI</span>
            </div>
          </footer>
        </div>
      )}

      {/* 3. Kataloglar Sekmesi (Pusulam Birebir) */}
      {activeTab === "catalogs" && (
        <div className="space-y-6 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Kataloglarınız
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Ürünlerinizi kataloglar halinde gruplayın ve paylaşın
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNewCatalogModalOpen(true)}
                className="bg-[#00b49c] hover:bg-[#00a18c] text-white font-bold text-sm px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-[#00b49c]/20 transition shrink-0 self-start sm:self-auto cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Yeni Katalog</span>
              </button>
            </div>

            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
              AKTİF KATALOGLAR
            </div>

            {catalogs.length === 0 ? (
              <div className="bg-white dark:bg-[#0b171f] border border-dashed border-slate-200 dark:border-[#162733] rounded-2xl p-10 text-center">
                <BookOpen className="size-10 text-slate-400 mx-auto mb-3" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Henüz katalog oluşturmadınız</h3>
                <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
                  Müşterilerinize doğrudan gönderebileceğiniz dijital ürün katalogları oluşturun.
                </p>
                <button
                  type="button"
                  onClick={() => setNewCatalogModalOpen(true)}
                  className="mt-4 bg-[#00b49c] text-white text-sm font-bold px-4 py-2 rounded-xl cursor-pointer"
                >
                  + Yeni Katalog Oluştur
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {catalogs.map((cat) => (
                  <div
                    key={cat.id}
                    onClick={() => {
                      setSelectedCatalogForProducts(cat);
                      setTempCatalogProductIds(new Set(cat.productIds || []));
                    }}
                    className="bg-white dark:bg-[#0b171f] border border-slate-200 dark:border-[#162733] hover:border-slate-300 dark:hover:border-[#1f3747] rounded-2xl p-5 shadow-xs dark:shadow-lg flex flex-col justify-between min-h-[145px] transition group cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3.5">
                        <div className="size-12 rounded-xl bg-emerald-500/10 dark:bg-[#09221a] border border-emerald-500/20 dark:border-[#0d3b2d] flex items-center justify-center text-[#00b49c] shrink-0">
                          <BookOpen className="size-6 text-[#00b49c]" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white text-base leading-tight">
                            {cat.name}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {cat.productIds?.length ?? 0} ürün
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          const ok = await confirm({
                            title: "Kataloğu Sil",
                            description: `"${cat.name}" kataloğunu silmek istediğinize emin misiniz?`,
                            confirmText: "Sil",
                            danger: true,
                          });
                          if (!ok) return;
                          const updated = catalogs.filter((x) => x.id !== cat.id);
                          setCatalogs(updated);
                          try {
                            localStorage.setItem("ren_product_catalogs", JSON.stringify(updated));
                          } catch {}
                          toast.success(`"${cat.name}" kataloğu silindi`);
                        }}
                        className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80 transition cursor-pointer"
                        title="Kataloğu Sil"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-4 mt-3 border-t border-slate-100 dark:border-[#14232e]">
                      <span
                        className={cn(
                          "px-2.5 py-0.5 rounded-full text-[11px] font-bold border",
                          cat.status === "active"
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                            : "bg-slate-500/15 text-slate-500 dark:text-slate-400 border-slate-500/30"
                        )}
                      >
                        {cat.status === "active" ? "Aktif" : "Pasif"}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingCatalogLink(cat);
                        }}
                        className="text-xs font-semibold text-[#00b49c] hover:text-[#00d8bc] flex items-center gap-1 transition cursor-pointer"
                      >
                        <span>🔗 Link düzenle</span>
                        <span>&gt;</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pusulam Alt Bilgi (Footer) */}
          <footer className="pt-16 pb-6 text-center text-xs text-slate-400 dark:text-slate-500 space-y-2 border-t border-slate-200/60 dark:border-slate-800/50">
            <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1">
              <span className="hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer">Biz Kimiz</span> ·{" "}
              <span className="hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer">Tanıtım</span> ·{" "}
              <span className="hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer">Akademi</span> ·{" "}
              <span className="hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer">Destek</span> ·{" "}
              <a href="mailto:destek@pusulamx.com" className="hover:text-[#00b49c] transition-colors">
                destek@pusulamx.com
              </a>{" "}
              · <span className="hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer">Yardım</span> ·{" "}
              <span className="hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer">Gizlilik</span> ·{" "}
              <span className="hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer">Veri Güvenliği</span> ·{" "}
              <span className="hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer">KVKK</span> ·{" "}
              <span>© 2026 Pusulam</span>
            </div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500">
              powered by <span className="font-semibold text-slate-600 dark:text-slate-400">Numex AI</span>
            </div>
          </footer>
        </div>
      )}

      {/* Sayfa Yardım Butonu (Pusulam Birebir) */}
      <div className="pointer-events-none fixed z-[80] right-4 sm:right-5 lg:right-6 bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] lg:bottom-6">
        <div className="pointer-events-auto relative flex flex-col items-end gap-2">
          {helpOpen && (
            <div
              role="dialog"
              aria-modal="false"
              className="w-[min(22rem,calc(100vw-1.5rem))] origin-bottom-right rounded-2xl border border-slate-200/90 dark:border-slate-700/90 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-2xl transition-all duration-200 ease-out absolute bottom-12 right-0 overflow-hidden"
            >
              <div className="flex items-start justify-between gap-2 px-4 pt-3.5 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                    Ürünler
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Bu sayfa hakkında · Esc
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setHelpOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
                  aria-label="Kapat"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="px-4 py-3 max-h-[min(60vh,28rem)] overflow-y-auto text-[13px] leading-relaxed">
                <p className="text-slate-600 dark:text-slate-300 mb-3">
                  Stoklu veya hizmet ürünlerinizi barkod, fiyat, KDV ve varyantlarla yönetin.
                </p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">
                  Özellikler
                </p>
                <ul className="space-y-1.5 mb-3">
                  <li className="flex gap-2 text-slate-600 dark:text-slate-300">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
                    <span>Ürün ekleme, düzenleme, silme</span>
                  </li>
                  <li className="flex gap-2 text-slate-600 dark:text-slate-300">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
                    <span>Barkod / SKU, kritik stok, depo</span>
                  </li>
                  <li className="flex gap-2 text-slate-600 dark:text-slate-300">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
                    <span>Alış / satış / 2. fiyat, KDV</span>
                  </li>
                  <li className="flex gap-2 text-slate-600 dark:text-slate-300">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
                    <span>Excel toplu içe aktarma ve barkod üretimi</span>
                  </li>
                  <li className="flex gap-2 text-slate-600 dark:text-slate-300">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
                    <span>Seçili ürünlerden sunum slaytı / PDF</span>
                  </li>
                </ul>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">
                  İpuçları
                </p>
                <ul className="space-y-1.5">
                  <li className="text-slate-500 dark:text-slate-400 text-[12.5px]">
                    Ürün satırına tıklayarak stok hareketlerini görün.
                  </li>
                  <li className="text-slate-500 dark:text-slate-400 text-[12.5px]">
                    Slayt için seç → ürünleri işaretle → Slayt hazırla.
                  </li>
                </ul>
              </div>
            </div>
          )}

          <button
            type="button"
            data-page-help-trigger="true"
            title="Ürünler yardımı"
            aria-expanded={helpOpen}
            onClick={() => setHelpOpen((v) => !v)}
            className="h-9 w-9 rounded-full flex items-center justify-center border transition bg-white/70 dark:bg-slate-900/70 border-slate-200/60 dark:border-slate-700/60 text-slate-400/70 hover:text-slate-500 hover:border-slate-300 dark:hover:text-slate-300 shadow-sm"
          >
            <CircleHelp size={18} />
          </button>
        </div>
      </div>

      {/* Modallar */}
      <ProductImport open={importOpen} onOpenChange={setImportOpen} />

      <BarcodeLabelModal
        open={barcodeModalOpen}
        onOpenChange={setBarcodeModalOpen}
        initialProduct={selectedProductForBarcode}
      />

      {/* Toplu Resim Dialog */}
      <Dialog open={bulkImageOpen} onOpenChange={setBulkImageOpen}>
        <DialogContent title="Toplu Ürün Resmi Ekleme" className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Ürünlerinize barkod veya ürün kodlarına göre tek seferde toplu resim atayabilirsiniz.
            </p>
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-8 text-center bg-slate-50 dark:bg-slate-800/50">
              <Images size={36} className="mx-auto text-slate-400 mb-2" />
              <div className="font-semibold text-sm text-slate-700 dark:text-slate-300">
                Resim dosyalarını buraya sürükleyin veya bilgisayardan seçin
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Dosya adının ürün barkodu veya ürün koduyla birebir eşleşmesi önerilir (örn: 8699990004888.jpg)
              </p>
              <input
                type="file"
                multiple
                accept="image/*"
                className="mt-4 text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    toast.success(`${e.target.files.length} resim eşleştirme için kuyruğa alındı.`);
                  }
                }}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBulkImageOpen(false)}
                className="btn-ghost text-xs"
              >
                Kapat
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hızlı Düzenleme Dialog */}
      <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
        <DialogContent
          title="Ürün Düzenle"
          className="w-[96vw] max-w-6xl xl:max-w-7xl max-h-[92vh] overflow-y-auto"
        >
          {editingProduct && (
            <ProductForm
              product={editingProduct}
              onSaved={() => {
                setEditingProduct(null);
                toast.success("Ürün güncellendi");
              }}
              onCancel={() => setEditingProduct(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Kategori Düzenleme Modalı */}
      <Dialog open={!!editingCategory} onOpenChange={(open) => !open && setEditingCategory(null)}>
        <DialogContent title="Kategori Düzenle" className="max-w-md bg-white dark:bg-[#0b171f] border border-slate-200 dark:border-[#162733] text-slate-900 dark:text-white rounded-2xl p-6">
          <h3 className="text-lg font-bold">Kategori Adını Düzenle</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Kategori ismini güncelleyin.
          </p>
          <div className="mt-4">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Kategori Adı</label>
            <input
              type="text"
              value={editingCategory?.name ?? ""}
              onChange={(e) =>
                setEditingCategory((prev) => (prev ? { ...prev, name: e.target.value } : null))
              }
              onKeyDown={async (e) => {
                if (e.key === "Enter" && editingCategory) {
                  const trimmed = editingCategory.name.trim();
                  if (!trimmed) return;
                  try {
                    await catUpdate.update(editingCategory.id, { name: trimmed });
                    setEditingCategory(null);
                    toast.success(`Kategori güncellendi: ${trimmed}`);
                  } catch (err) {
                    console.error(err);
                    toast.error("Kategori güncellenirken hata oluştu");
                  }
                }
              }}
              className="w-full mt-1.5 bg-slate-50 dark:bg-[#10202c] border border-slate-200 dark:border-[#1c3344] focus:border-[#00b49c] rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none"
            />
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditingCategory(null)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              İptal
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!editingCategory) return;
                const trimmed = editingCategory.name.trim();
                if (!trimmed) return;
                try {
                  await catUpdate.update(editingCategory.id, { name: trimmed });
                  setEditingCategory(null);
                  toast.success(`Kategori güncellendi: ${trimmed}`);
                } catch (err) {
                  console.error(err);
                  toast.error("Kategori güncellenirken hata oluştu");
                }
              }}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-[#00b49c] hover:bg-[#00a18c] text-white cursor-pointer"
            >
              Kaydet
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Marka Düzenleme Modalı */}
      <Dialog open={!!editingBrand} onOpenChange={(open) => !open && setEditingBrand(null)}>
        <DialogContent title="Marka Düzenle" className="max-w-md bg-white dark:bg-[#0b171f] border border-slate-200 dark:border-[#162733] text-slate-900 dark:text-white rounded-2xl p-6">
          <h3 className="text-lg font-bold">Marka Adını Düzenle</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Marka ismini güncelleyin.
          </p>
          <div className="mt-4">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Marka Adı</label>
            <input
              type="text"
              value={editingBrand?.newName ?? ""}
              onChange={(e) =>
                setEditingBrand((prev) => (prev ? { ...prev, newName: e.target.value } : null))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" && editingBrand) {
                  const oldName = editingBrand.oldName;
                  const newName = editingBrand.newName.trim().toUpperCase();
                  if (!newName) return;
                  const updated = brands.map((b) => (b === oldName ? newName : b));
                  setBrands(updated);
                  try {
                    localStorage.setItem("ren_product_brands", JSON.stringify(updated));
                  } catch {}
                  setEditingBrand(null);
                  toast.success(`Marka güncellendi: ${newName}`);
                }
              }}
              className="w-full mt-1.5 bg-slate-50 dark:bg-[#10202c] border border-slate-200 dark:border-[#1c3344] focus:border-[#00b49c] rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none"
            />
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditingBrand(null)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              İptal
            </button>
            <button
              type="button"
              onClick={() => {
                if (!editingBrand) return;
                const oldName = editingBrand.oldName;
                const newName = editingBrand.newName.trim().toUpperCase();
                if (!newName) return;
                const updated = brands.map((b) => (b === oldName ? newName : b));
                setBrands(updated);
                try {
                  localStorage.setItem("ren_product_brands", JSON.stringify(updated));
                } catch {}
                setEditingBrand(null);
                toast.success(`Marka güncellendi: ${newName}`);
              }}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-[#00b49c] hover:bg-[#00a18c] text-white cursor-pointer"
            >
              Kaydet
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Yeni Katalog Oluşturma Modalı */}
      <Dialog open={newCatalogModalOpen} onOpenChange={setNewCatalogModalOpen}>
        <DialogContent title="Yeni Katalog Oluştur" className="max-w-lg bg-white dark:bg-[#0b171f] border border-slate-200 dark:border-[#162733] text-slate-900 dark:text-white rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="size-10 rounded-xl bg-emerald-500/10 dark:bg-[#09221a] border border-emerald-500/20 dark:border-[#0d3b2d] flex items-center justify-center text-[#00b49c]">
              <BookOpen className="size-5 text-[#00b49c]" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Yeni Katalog Oluştur</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Müşterilerinize paylaşabileceğiniz özel bir dijital katalog hazırlayın.
              </p>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const name = newCatalogForm.name.trim();
              if (!name) {
                toast.error("Lütfen katalog adını giriniz");
                return;
              }
              const slug = (newCatalogForm.slug.trim() || name)
                .toLowerCase()
                .replace(/ğ/g, "g")
                .replace(/ü/g, "u")
                .replace(/ş/g, "s")
                .replace(/ı/g, "i")
                .replace(/ö/g, "o")
                .replace(/ç/g, "c")
                .replace(/[^a-z0-9]/g, "-")
                .replace(/-+/g, "-")
                .replace(/^-|-$/g, "");

              const newCat: CatalogItem = {
                id: "cat-" + Date.now(),
                name,
                slug,
                status: newCatalogForm.status,
                productIds: [],
                description: newCatalogForm.description.trim(),
                createdAt: new Date().toISOString().slice(0, 10),
              };
              const updated = [newCat, ...catalogs];
              setCatalogs(updated);
              try {
                localStorage.setItem("ren_product_catalogs", JSON.stringify(updated));
              } catch {}
              setNewCatalogModalOpen(false);
              setNewCatalogForm({ name: "", slug: "", description: "", status: "active" });
              toast.success(`"${name}" kataloğu başarıyla oluşturuldu`);
            }}
            className="space-y-4 mt-4"
          >
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Katalog Adı *</label>
              <input
                type="text"
                required
                value={newCatalogForm.name}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewCatalogForm((prev) => ({
                    ...prev,
                    name: val,
                    slug: prev.slug || val.toLowerCase().replace(/[^a-z0-9]/g, "-"),
                  }));
                }}
                placeholder="Örn: Okul, Otel & Restoran, Sanayi"
                className="w-full mt-1.5 bg-slate-50 dark:bg-[#10202c] border border-slate-200 dark:border-[#1c3344] focus:border-[#00b49c] rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Özel Link Uzantısı (Slug)</label>
              <div className="flex items-center mt-1.5 bg-slate-50 dark:bg-[#10202c] border border-slate-200 dark:border-[#1c3344] rounded-xl px-3 text-sm">
                <span className="text-xs text-slate-400 shrink-0">/katalog?c=</span>
                <input
                  type="text"
                  value={newCatalogForm.slug}
                  onChange={(e) => setNewCatalogForm((prev) => ({ ...prev, slug: e.target.value }))}
                  placeholder="okul"
                  className="w-full bg-transparent py-2.5 px-1 text-sm text-slate-900 dark:text-white outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Açıklama (İsteğe bağlı)</label>
              <textarea
                rows={2}
                value={newCatalogForm.description}
                onChange={(e) => setNewCatalogForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Bu katalog hakkında kısa not veya bilgilendirme..."
                className="w-full mt-1.5 bg-slate-50 dark:bg-[#10202c] border border-slate-200 dark:border-[#1c3344] focus:border-[#00b49c] rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white outline-none resize-none"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Katalog Durumu</span>
              <button
                type="button"
                onClick={() =>
                  setNewCatalogForm((prev) => ({
                    ...prev,
                    status: prev.status === "active" ? "passive" : "active",
                  }))
                }
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-bold border transition cursor-pointer",
                  newCatalogForm.status === "active"
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                    : "bg-slate-500/15 text-slate-400 border-slate-500/30"
                )}
              >
                {newCatalogForm.status === "active" ? "Aktif" : "Pasif"}
              </button>
            </div>

            <div className="pt-4 flex justify-end gap-2 border-t border-slate-100 dark:border-[#14232e]">
              <button
                type="button"
                onClick={() => setNewCatalogModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                İptal
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#00b49c] hover:bg-[#00a18c] text-white shadow-md shadow-[#00b49c]/20 cursor-pointer"
              >
                Katalog Oluştur
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Katalog Link Düzenleme Modalı */}
      <Dialog open={!!editingCatalogLink} onOpenChange={(open) => !open && setEditingCatalogLink(null)}>
        <DialogContent title="Katalog Bağlantısı & Paylaşım" className="max-w-md bg-white dark:bg-[#0b171f] border border-slate-200 dark:border-[#162733] text-slate-900 dark:text-white rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="size-10 rounded-xl bg-emerald-500/10 dark:bg-[#09221a] border border-emerald-500/20 dark:border-[#0d3b2d] flex items-center justify-center text-[#00b49c]">
              <BookOpen className="size-5 text-[#00b49c]" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Katalog Bağlantısı & Paylaşım</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {editingCatalogLink?.name} kataloğunun genel paylaşım ayarları
              </p>
            </div>
          </div>

          {editingCatalogLink && (
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Genel Paylaşım Linki</label>
                <div className="flex gap-2 mt-1.5">
                  <input
                    type="text"
                    readOnly
                    value={
                      typeof window !== "undefined"
                        ? `${window.location.origin}/katalog?c=${editingCatalogLink.slug}`
                        : `/katalog?c=${editingCatalogLink.slug}`
                    }
                    className="flex-1 bg-slate-50 dark:bg-[#10202c] border border-slate-200 dark:border-[#1c3344] rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 font-mono select-all outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window === "undefined") return;
                      const url = `${window.location.origin}/katalog?c=${editingCatalogLink.slug}`;
                      navigator.clipboard.writeText(url);
                      setCopiedLink(true);
                      toast.success("Katalog bağlantısı kopyalandı!");
                      setTimeout(() => setCopiedLink(false), 2000);
                    }}
                    className="bg-[#00b49c] hover:bg-[#00a18c] text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition cursor-pointer"
                  >
                    {copiedLink ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                    <span>{copiedLink ? "Kopyalandı" : "Kopyala"}</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Özel Link Uzantısı (Slug)</label>
                <input
                  type="text"
                  value={editingCatalogLink.slug}
                  onChange={(e) =>
                    setEditingCatalogLink({
                      ...editingCatalogLink,
                      slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                    })
                  }
                  className="w-full mt-1.5 bg-slate-50 dark:bg-[#10202c] border border-slate-200 dark:border-[#1c3344] focus:border-[#00b49c] rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Katalog Durumu</span>
                <button
                  type="button"
                  onClick={() =>
                    setEditingCatalogLink({
                      ...editingCatalogLink,
                      status: editingCatalogLink.status === "active" ? "passive" : "active",
                    })
                  }
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-bold border transition cursor-pointer",
                    editingCatalogLink.status === "active"
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                      : "bg-slate-500/15 text-slate-400 border-slate-500/30"
                  )}
                >
                  {editingCatalogLink.status === "active" ? "Aktif" : "Pasif"}
                </button>
              </div>

              <div className="pt-2">
                <a
                  href={`/katalog?c=${editingCatalogLink.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 rounded-xl border border-[#00b49c]/40 text-[#00b49c] hover:bg-[#00b49c]/10 text-xs font-bold flex items-center justify-center gap-1.5 transition"
                >
                  <ExternalLink className="size-3.5" />
                  <span>Kataloğu Yeni Sekmede Aç</span>
                </a>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100 dark:border-[#14232e]">
                <button
                  type="button"
                  onClick={() => setEditingCatalogLink(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!editingCatalogLink) return;
                    const updated = catalogs.map((c) =>
                      c.id === editingCatalogLink.id ? editingCatalogLink : c
                    );
                    setCatalogs(updated);
                    try {
                      localStorage.setItem("ren_product_catalogs", JSON.stringify(updated));
                    } catch {}
                    setEditingCatalogLink(null);
                    toast.success("Katalog ayarları kaydedildi");
                  }}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#00b49c] hover:bg-[#00a18c] text-white shadow-md shadow-[#00b49c]/20 cursor-pointer"
                >
                  Kaydet
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Kataloğa Tıklayınca Açılan: Katalog Ürünleri Seçim Modalı (Pusulam 1:1) */}
      <Dialog
        open={!!selectedCatalogForProducts}
        onOpenChange={(open) => !open && setSelectedCatalogForProducts(null)}
      >
        <DialogContent
          title={`${selectedCatalogForProducts?.name ?? "Katalog"} - Ürünler`}
          className="max-w-xl w-[92vw] bg-white dark:bg-[#0a151d] border border-slate-200 dark:border-[#172b38] text-slate-900 dark:text-white rounded-2xl p-5 sm:p-6 shadow-2xl"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#14232e]">
            <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-wide">
              {selectedCatalogForProducts?.name} - Ürünler
            </h2>
            <button
              type="button"
              onClick={() => setSelectedCatalogForProducts(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg transition cursor-pointer"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Ürün Listesi */}
          <div className="max-h-[60vh] overflow-y-auto space-y-2 mt-4 pr-1.5 [scrollbar-width:thin] [scrollbar-color:#1c3344_transparent]">
            {catalogAvailableProducts.map((p) => {
              const isChecked = tempCatalogProductIds.has(p.id);
              return (
                <div
                  key={p.id}
                  onClick={() => {
                    setTempCatalogProductIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(p.id)) next.delete(p.id);
                      else next.add(p.id);
                      return next;
                    });
                  }}
                  className="flex items-center gap-3.5 px-4 py-3 rounded-xl border border-slate-200 dark:border-[#162936] bg-slate-50/50 dark:bg-[#0c1822]/80 hover:bg-slate-100 dark:hover:bg-[#10222e] hover:border-slate-300 dark:hover:border-[#1f384a] transition cursor-pointer select-none"
                >
                  <div
                    className={cn(
                      "size-5 rounded-md border flex items-center justify-center shrink-0 transition-colors",
                      isChecked
                        ? "bg-[#00b49c] border-[#00b49c] text-white"
                        : "border-slate-300 dark:border-[#223d4f] bg-white dark:bg-[#0d1a24]"
                    )}
                  >
                    {isChecked && <Check className="size-3.5 stroke-[3]" />}
                  </div>
                  <span className="font-bold text-xs sm:text-sm tracking-wide text-slate-800 dark:text-white uppercase truncate">
                    {p.name}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Modal Alt Çubuk (Footer) */}
          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-[#14232e] flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                if (selectedCatalogForProducts) {
                  setEditingCatalogLink(selectedCatalogForProducts);
                }
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-[#1d3444] bg-slate-100 dark:bg-[#0f1f2b] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-slate-400 dark:hover:border-[#28495f] text-xs font-semibold transition cursor-pointer"
            >
              <LinkIcon className="size-3.5" />
              <span>Paylaşım linki</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (!selectedCatalogForProducts) return;
                const updatedList = Array.from(tempCatalogProductIds);
                const updatedCatalogs = catalogs.map((c) =>
                  c.id === selectedCatalogForProducts.id
                    ? { ...c, productIds: updatedList }
                    : c
                );
                setCatalogs(updatedCatalogs);
                try {
                  localStorage.setItem("ren_product_catalogs", JSON.stringify(updatedCatalogs));
                } catch {}
                toast.success(
                  `"${selectedCatalogForProducts.name}" kataloğuna ${updatedList.length} ürün tanımlandı`
                );
                setSelectedCatalogForProducts(null);
              }}
              className="bg-[#00b49c] hover:bg-[#00a18c] text-white font-bold text-xs sm:text-sm px-6 py-2.5 rounded-xl shadow-md shadow-[#00b49c]/25 transition cursor-pointer"
            >
              Tamam
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pusulam Birebir Datalist Elemanları */}
      <datalist id="units-list">
        {units.data?.map((u) => (
          <option key={u.id} value={u.name} />
        ))}
      </datalist>
      <datalist id="brands-list">
        {Array.from(new Set([...brands, ...all.map((p) => (p as any).brand).filter(Boolean)])).map((b) => (
          <option key={b as string} value={b as string} />
        ))}
      </datalist>
      <datalist id="categories-list">
        {cats.data?.map((c) => (
          <option key={c.id} value={c.name} />
        ))}
      </datalist>
    </div>
  );
}
