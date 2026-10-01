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
} from "lucide-react";
import { useCategories, useProducts, useUnits, useUpdate, type Row } from "@/lib/data";
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
      <div className="mb-4 flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab("products")}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-semibold transition",
              activeTab === "products"
                ? "bg-slate-900 text-white shadow-sm dark:bg-slate-100 dark:text-slate-900"
                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-400"
            )}
          >
            Ürünler
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("brands")}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-semibold transition",
              activeTab === "brands"
                ? "bg-slate-900 text-white shadow-sm dark:bg-slate-100 dark:text-slate-900"
                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-400"
            )}
          >
            Marka & Kategori Yönetimi
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("catalogs")}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-semibold transition",
              activeTab === "catalogs"
                ? "bg-slate-900 text-white shadow-sm dark:bg-slate-100 dark:text-slate-900"
                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-400"
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
                    "btn-ghost text-xs sm:text-sm flex items-center gap-1.5",
                    slideSelectMode && "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white"
                  )}
                >
                  <Presentation size={16} />
                  <span>{slideSelectMode ? "Seçimi Bitir" : "Slayt için seç"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("brands")}
                  className="btn-ghost text-xs sm:text-sm flex items-center gap-1.5"
                >
                  <Tags size={16} />
                  <span>Marka & Kategori</span>
                </button>

                <button
                  type="button"
                  onClick={exportRows}
                  className="btn-ghost text-xs sm:text-sm flex items-center gap-1.5"
                >
                  <Download size={16} />
                  <span>Excel'e Aktar</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBulkImageOpen(true)}
                  className="btn-ghost text-xs sm:text-sm flex items-center gap-1.5"
                >
                  <Images size={16} />
                  <span>Toplu Resim</span>
                </button>

                <button
                  type="button"
                  onClick={() => setImportOpen(true)}
                  className="btn-ghost text-xs sm:text-sm flex items-center gap-1.5"
                >
                  <FileSpreadsheet size={16} />
                  <span>Excel'den Yükle</span>
                </button>

                {canWrite && (
                  <button
                    type="button"
                    onClick={() => router.push("/urunler/yeni")}
                    className="btn-primary text-xs sm:text-sm flex items-center gap-1.5 bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
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

      {/* Marka & Kategori Sekmesi */}
      {activeTab === "brands" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Marka & Kategori Yönetimi
              </h2>
              <p className="text-sm text-slate-500">
                Ürünlerinizi markalarına ve kategorilerine göre gruplayın.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {cats.data?.map((cat) => {
              const count = all.filter((p) => p.category_id === cat.id).length;
              return (
                <div key={cat.id} className="card p-4 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm text-slate-900 dark:text-white">
                      {cat.name}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">{count} ürün</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setQ(cat.name);
                      setActiveTab("products");
                    }}
                    className="btn-ghost text-xs"
                  >
                    Ürünleri Gör →
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Kataloglar Sekmesi */}
      {activeTab === "catalogs" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Ürün Katalogları
              </h2>
              <p className="text-sm text-slate-500">
                Müşterilerinize paylaşabileceğiniz fiyat ve ürün katalogları.
              </p>
            </div>
            <Link href="/katalog" className="btn-primary text-xs bg-slate-900 text-white">
              Katalog Görüntüle
            </Link>
          </div>
          <div className="card p-6 text-center text-sm text-slate-500">
            Aktif ürünleriniz üzerinden anlık dijital katalog oluşturulabilir.
          </div>
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
        <DialogContent title="Ürün Düzenle" className="max-w-2xl max-h-[90vh] overflow-y-auto">
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

      {/* Pusulam Birebir Datalist Elemanları */}
      <datalist id="units-list">
        {units.data?.map((u) => (
          <option key={u.id} value={u.name} />
        ))}
      </datalist>
      <datalist id="brands-list">
        {Array.from(new Set(all.map((p) => (p as any).brand).filter(Boolean))).map((b) => (
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
