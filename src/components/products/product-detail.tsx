"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ShoppingCart,
  RotateCcw,
  Scale,
  Tag,
  Star,
  Trash2,
  Pencil,
  Package,
  Warehouse,
  Barcode,
  ArrowLeftRight,
  Check,
  Clock,
  SlidersHorizontal,
  CircleHelp,
  X,
} from "lucide-react";
import {
  useRow,
  useRows,
  useUnits,
  useUpdate,
  useWarehouses,
  useCategories,
  type Row,
} from "@/lib/data";
import { formatDate, formatMoney, formatQty } from "@/lib/format";
import { convertVat } from "@/lib/doc-calc";
import { DOC_TYPES, MOVEMENT_LABELS, type DocType } from "@/lib/doc-types";
import { useOrg } from "@/providers/org-provider";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useConfirm } from "@/components/ui/confirm";
import { cn } from "@/lib/utils";
import { ProductForm } from "./product-form";
import { BarcodeLabelModal } from "./barcode-label-modal";
import { QuickTradeModal } from "./quick-trade-modal";
import { StockAdjustDialog } from "./stock-adjust-dialog";
import { isCritical } from "./products-list";

interface TimelineItem {
  id: string;
  date: string;
  kind: "sale" | "purchase" | "transfer";
  label: string;
  partyName: string;
  qty: number;
  unitPrice?: number;
  lineTotal?: number;
  paid?: boolean;
  note?: string | null;
  link?: string | null;
}

export function ProductDetail({ id }: { id: string }) {
  const router = useRouter();
  const confirm = useConfirm();
  const { canWrite, role, isB2B } = useOrg();

  // Queries
  const product = useRow<Row<"products">>("products", id);
  const units = useUnits();
  const cats = useCategories("product");
  const warehouses = useWarehouses();
  const { remove, update } = useUpdate("products");

  const stocks = useRows<Row<"product_stocks">>("product_stocks", {
    softDelete: false,
    params: ["p_stocks", id],
    filter: (q) => q.eq("product_id", id),
  });

  const moves = useRows<any>("stock_movements", {
    select:
      "*, document:documents(id, doc_type, number, issue_date, contact_id, status, notes, total, contact:contacts(id, name)), warehouse:warehouses(id, name)",
    params: ["p_moves", id],
    filter: (q) => q.eq("product_id", id),
    order: [
      { column: "movement_date", ascending: false },
      { column: "created_at", ascending: false },
    ],
    limit: 1000,
  });

  // document_lines tablosunda deleted_at yok → softDelete kapalı; silinen/iptal belgeler aşağıda elenir
  const docLines = useRows<any>("document_lines", {
    select:
      "*, document:documents(id, doc_type, number, issue_date, contact_id, status, notes, total, currency, exchange_rate, deleted_at, contact:contacts(id, name))",
    softDelete: false,
    params: ["p_lines", id],
    filter: (q) => q.eq("product_id", id),
    order: [{ column: "created_at", ascending: false }],
    limit: 1000,
  });

  const altUnits = useRows<Row<"product_units">>("product_units", {
    params: ["p_units", id],
    filter: (q) => q.eq("product_id", id),
  });

  // State
  const [activeTab, setActiveTab] = React.useState<"ozet" | "satis" | "alis" | "transfer" | "bilgi">("ozet");
  const [quickTradeMode, setQuickTradeMode] = React.useState<"sale" | "purchase" | "return" | null>(null);
  const [barcodeModalOpen, setBarcodeModalOpen] = React.useState<boolean>(false);
  const [editOpen, setEditOpen] = React.useState<boolean>(false);
  const [adjustOpen, setAdjustOpen] = React.useState<boolean>(false);
  const [favorites, setFavorites] = React.useState<Set<string>>(new Set());
  const [helpOpen, setHelpOpen] = React.useState<boolean>(false);

  // Load favorites from localStorage (matching POS and products list)
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("ren-product-favorites");
      if (saved) setFavorites(new Set(JSON.parse(saved)));
    } catch {}
  }, []);

  const isFavorite = favorites.has(id);

  const toggleFavorite = () => {
    const next = new Set(favorites);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setFavorites(next);
    try {
      localStorage.setItem("ren-product-favorites", JSON.stringify([...next]));
    } catch {}
  };

  // Satış / alış istatistikleri — yalnızca kesinleşmiş belgeler; iadeler düşülür, sipariş/irsaliye sayılmaz
  const stats = React.useMemo(() => {
    const salesList: TimelineItem[] = [];
    const purchasesList: TimelineItem[] = [];
    const transfersList: TimelineItem[] = [];
    const seenIds = new Set<string>();
    const prod = product.data;

    // Toplamlar (TL, ana birim)
    let soldQty = 0, soldAmount = 0, soldNet = 0;
    let boughtQty = 0, boughtAmount = 0, boughtNet = 0;

    for (const l of docLines.data ?? []) {
      const doc = l.document;
      if (!doc || doc.deleted_at || doc.status === "draft" || doc.status === "cancelled") continue;

      const docType = doc.doc_type as DocType;
      const isSaleDoc = ["sales_invoice", "pos_sale", "sales_delivery", "sales_order"].includes(docType);
      const isPurchaseDoc = ["purchase_invoice", "purchase_delivery", "purchase_order"].includes(docType);
      const isReturn = docType === "sales_return" || docType === "purchase_return";
      const rate = Number(doc.exchange_rate) || 1;
      const baseQty = Number(l.quantity) * (Number(l.unit_factor) || 1);
      const lineTotal = Number(l.total_amount ?? Number(l.quantity) * Number(l.unit_price)) * rate;
      const lineNet = Number(l.net_amount ?? l.total_amount ?? 0) * rate;

      // Kesin toplamlar: fatura + hızlı satış, eksi iadeler
      if (docType === "sales_invoice" || docType === "pos_sale") {
        soldQty += baseQty; soldAmount += lineTotal; soldNet += lineNet;
      } else if (docType === "sales_return") {
        soldQty -= baseQty; soldAmount -= lineTotal; soldNet -= lineNet;
      } else if (docType === "purchase_invoice") {
        boughtQty += baseQty; boughtAmount += lineTotal; boughtNet += lineNet;
      } else if (docType === "purchase_return") {
        boughtQty -= baseQty; boughtAmount -= lineTotal; boughtNet -= lineNet;
      }

      const contactName = doc.contact?.name ?? (isSaleDoc ? "Perakende / belgesiz" : "—");
      const docLabel = doc.number || DOC_TYPES[docType]?.label || "Belge";
      const uniqueId = `line-${l.id}`;
      seenIds.add(uniqueId);
      const typeLabel = isReturn
        ? "İade"
        : docType === "sales_order" || docType === "purchase_order"
          ? "Sipariş"
          : docType === "sales_delivery" || docType === "purchase_delivery"
            ? "İrsaliye"
            : isSaleDoc
              ? "Satış"
              : "Alış";

      const item: TimelineItem = {
        id: uniqueId,
        date: doc.issue_date || l.created_at,
        kind: isPurchaseDoc || docType === "purchase_return" ? "purchase" : "sale",
        label: `${docLabel} · ${typeLabel}`,
        partyName: contactName,
        qty: Number(l.quantity),
        unitPrice: Number(l.unit_price),
        lineTotal,
        paid: doc.status === "paid" || docType === "pos_sale",
        note: doc.notes || l.description,
        link: `${DOC_TYPES[docType]?.base || "/satislar/faturalar"}/detay?id=${doc.id}`,
      };
      if (isSaleDoc || docType === "sales_return") salesList.push(item);
      else if (isPurchaseDoc || docType === "purchase_return") purchasesList.push(item);
    }

    // Belgesiz stok hareketleri (transfer, sayım, düzeltme) — yalnızca listede, toplamlara girmez
    for (const m of moves.data ?? []) {
      if (m.document_line_id && seenIds.has(`line-${m.document_line_id}`)) continue;
      const qty = Number(m.quantity);
      const uniqueId = `move-${m.id}`;
      const isTransfer = m.transfer_id || m.movement_type === "transfer_in" || m.movement_type === "transfer_out";
      if (isTransfer) {
        transfersList.push({
          id: uniqueId,
          date: m.movement_date || m.created_at,
          kind: "transfer",
          label: "Depo transferi",
          partyName: m.warehouse?.name ? `${m.warehouse.name} Deposu` : "Depo Transferi",
          qty: Math.abs(qty),
          unitPrice: 0,
          lineTotal: 0,
          note: m.description,
          link: null,
        });
      } else if (!m.document_id) {
        const isPos = qty >= 0;
        const cost = Number(m.unit_cost || prod?.avg_cost || prod?.purchase_price || 0);
        const item: TimelineItem = {
          id: uniqueId,
          date: m.movement_date || m.created_at,
          kind: isPos ? "purchase" : "sale",
          label: MOVEMENT_LABELS[m.movement_type] || "Stok Düzeltme",
          partyName: m.warehouse?.name ? `${m.warehouse.name} Deposu` : "Depo",
          qty: Math.abs(qty),
          unitPrice: cost,
          lineTotal: Math.abs(qty) * cost,
          paid: true,
          note: m.description,
          link: null,
        };
        (isPos ? purchasesList : salesList).push(item);
      }
    }

    const byDate = (a: TimelineItem, b: TimelineItem) => new Date(b.date).getTime() - new Date(a.date).getTime();
    salesList.sort(byDate);
    purchasesList.sort(byDate);
    transfersList.sort(byDate);

    const vat = Number(prod?.vat_rate ?? 20);
    const salePrice = Number(prod?.sale_price || 0);
    const purchasePrice = Number(prod?.purchase_price || 0);
    // Liste fiyatlarının KDV hariç karşılıkları
    const saleExcl = convertVat(salePrice, vat, prod?.sale_price_includes_vat ?? true, false);
    const buyExcl = convertVat(purchasePrice, vat, prod?.purchase_price_includes_vat ?? false, false);

    const avgSale = soldQty > 0 ? soldAmount / soldQty : salePrice;
    const avgBuy = boughtQty > 0 ? boughtAmount / boughtQty : purchasePrice;
    // Kâr marjı: gerçekleşen KDV hariç ort. satış ile KDV hariç maliyet (ortalama maliyet → alışlar → liste)
    const netSale = soldQty > 0 ? soldNet / soldQty : saleExcl;
    const netCost = Number(prod?.avg_cost) > 0 ? Number(prod?.avg_cost) : boughtQty > 0 ? boughtNet / boughtQty : buyExcl;
    const margin = netSale - netCost;
    const marginPct = netSale > 0 && netCost > 0 ? (margin / netSale) * 100 : 0;
    const stockQty = Math.max(0, Number(prod?.stock_qty || 0));
    const stockValue = stockQty * netCost;
    const stockSaleValue = stockQty * (salePrice || avgSale);

    return {
      sales: salesList,
      purchases: purchasesList,
      transfers: transfersList,
      soldQty,
      boughtQty,
      soldAmount,
      boughtAmount,
      avgSale,
      avgBuy,
      margin,
      marginPct,
      hasCost: netCost > 0,
      stockValue,
      stockSaleValue,
      firstIn: purchasesList.length ? purchasesList[purchasesList.length - 1] : null,
      lastIn: purchasesList.length ? purchasesList[0] : null,
      firstOut: salesList.length ? salesList[salesList.length - 1] : null,
      lastOut: salesList.length ? salesList[0] : null,
      timeline: [...salesList, ...purchasesList, ...transfersList].sort(byDate),
    };
  }, [docLines.data, moves.data, product.data]);

  const p = product.data;
  if (product.isPending && !p) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-32 rounded-xl" />
        <Skeleton className="h-44 w-full rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!p) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => router.push("/urunler")}
          className="btn-ghost inline-flex items-center gap-2"
        >
          <ArrowLeft size={18} /> Ürünlere dön
        </button>
        <div className="card p-8 text-center">
          <Package size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="font-semibold text-slate-800 dark:text-slate-200">Ürün bulunamadı</p>
          <button
            type="button"
            onClick={() => router.push("/urunler")}
            className="text-brand-600 dark:text-brand-400 text-sm font-semibold mt-2 inline-block hover:underline"
          >
            Listeye git
          </button>
        </div>
      </div>
    );
  }

  const unitName = units.data?.find((u) => u.id === p.unit_id)?.name ?? "ad";
  const categoryName = cats.data?.find((c) => c.id === p.category_id)?.name;
  const brand = (p as any).brand || (p.notes?.match(/Marka:\s*([^\n;]+)/i)?.[1]?.trim());
  const defaultWh = warehouses.data?.find((w) => w.is_default) || warehouses.data?.[0];
  const primaryWarehouseName = defaultWh?.name || "Merkez";
  const stockMap = Object.fromEntries((stocks.data ?? []).map((s) => [s.warehouse_id, Number(s.quantity)]));
  const isStockCritical = isCritical(p);


  const handleDelete = async () => {
    if (
      !(await confirm({
        title: `"${p.name}" kalıcı olarak silinsin mi?`,
        description: "Bu işlem geri alınamaz. Ürün listeden kaldırılır ancak geçmiş belgeler korunur.",
        danger: true,
        confirmText: "Sil",
      }))
    )
      return;

    await remove(p.id, "Ürün silindi");
    router.replace("/urunler");
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* 1. TOP HEADER & ACTION BUTTONS */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => router.push("/urunler")}
          className="btn-ghost inline-flex items-center gap-2"
        >
          <ArrowLeft size={18} /> Ürünler
        </button>

        <div className="ml-auto flex flex-wrap gap-2">
          {canWrite && (
            <>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setQuickTradeMode("sale")}
              >
                <ShoppingCart size={16} /> Satış Yap
              </button>
              <button
                type="button"
                className="btn-ghost !text-rose-600 hover:!bg-rose-50 dark:hover:!bg-rose-900/20"
                onClick={() => setQuickTradeMode("return")}
              >
                <RotateCcw size={16} /> İade Al
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setQuickTradeMode("purchase")}
              >
                <Scale size={16} /> Alış Yap
              </button>
            </>
          )}

          <button
            type="button"
            className="btn-ghost"
            onClick={() => setBarcodeModalOpen(true)}
          >
            <Tag size={16} /> {p.barcode ? "Etiket Yazdır" : "Barkod / Etiket"}
          </button>

          <button
            type="button"
            className="btn-ghost"
            onClick={toggleFavorite}
          >
            <Star
              size={16}
              fill={isFavorite ? "currentColor" : "none"}
              className={isFavorite ? "text-amber-400" : ""}
            />
            {isFavorite ? "Favoriden çıkar" : "Hızlı satışa ekle"}
          </button>

          {canWrite && (
            <>
              <button
                type="button"
                className="btn-ghost !text-rose-600 hover:!bg-rose-50 dark:hover:!bg-rose-900/20"
                onClick={handleDelete}
              >
                <Trash2 size={16} /> Sil
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setEditOpen(true)}
              >
                <Pencil size={16} /> Düzenle
              </button>
            </>
          )}
        </div>
      </div>

      {/* 2. MAIN HERO PRODUCT CARD (Pusulam Birebir) */}
      <div className="card p-5 overflow-hidden relative border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-2xl shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-500/8 via-transparent to-violet-500/5 pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row gap-5">
          {/* Ürün Görseli */}
          <div className="h-28 w-28 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0 border border-slate-300 dark:border-slate-700">
            {p.image_path ? (
              <img src={p.image_path} alt={p.name} className="h-full w-full object-cover" />
            ) : (
              <Package size={44} className="text-slate-400" />
            )}
          </div>

          {/* Ürün Bilgileri & Etiketler */}
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400 mb-1">
              Ürün Detayı
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
              {p.name}
            </h1>

            <div className="flex flex-wrap gap-2 mt-2">
              {p.barcode && (
                <span className="chip inline-flex items-center gap-1 font-mono">
                  <Barcode size={12} /> {p.barcode}
                </span>
              )}
              {brand && <span className="chip">{brand}</span>}
              {categoryName && <span className="chip">{categoryName}</span>}
              {altUnits.data && altUnits.data.length > 0 && (
                <span className="chip bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 border-brand-200 dark:border-brand-800">
                  {altUnits.data.length} varyant
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-sm text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <Warehouse size={14} /> {primaryWarehouseName || "—"}
              </span>
              <span>Birim: {unitName}</span>
              <span>KDV: %{Number(p.vat_rate ?? 20)}</span>
              <span className="text-slate-400">Kayıt: {formatDate(p.created_at)}</span>
            </div>
          </div>

          {/* Güncel Stok & Alış-Satış Kutuları */}
          <div className="shrink-0 text-right lg:min-w-[200px] space-y-3">
            <div>
              <div className="text-xs font-bold uppercase text-slate-400">Güncel Stok</div>
              <div
                className={cn(
                  "text-2xl sm:text-3xl font-black tabular-nums truncate",
                  isStockCritical ? "text-rose-600" : "text-emerald-600"
                )}
              >
                {formatQty(p.stock_qty)} {unitName}
              </div>
              {isStockCritical && (
                <div className="text-xs text-rose-500 font-semibold mt-0.5">
                  Kritik stok altında
                </div>
              )}
            </div>

            <div className={cn("grid gap-3 text-sm", isB2B ? "grid-cols-1" : "grid-cols-2")}>
              {!isB2B && (
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-2.5 text-left border border-slate-300 dark:border-slate-700 shadow-xs">
                  <div className="text-[10px] uppercase text-slate-400 font-bold">Alış</div>
                  <div className="font-bold text-slate-900 dark:text-slate-100">
                    {formatMoney(Number(p.purchase_price ?? 0))}
                  </div>
                </div>
              )}
              <div className="rounded-xl bg-brand-50 dark:bg-brand-900/30 p-2.5 text-left border border-brand-200 dark:border-brand-800 shadow-xs">
                <div className="text-[10px] uppercase text-brand-600/80 dark:text-brand-400/80 font-bold">
                  Satış Fiyatı
                </div>
                <div className="font-bold text-brand-700 dark:text-brand-300">
                  {formatMoney(Number(p.sale_price ?? 0))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. 4-METRIC STATS (Pusulam Birebir - Çerçeve İçi Renkli - B2B değilse) */}
      {!isB2B && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Toplam Satış */}
        <div className="rounded-2xl p-4 sm:p-5 text-white bg-gradient-to-br from-emerald-400 to-emerald-500 shadow-soft min-w-0 overflow-hidden">
          <div className="text-xl sm:text-3xl font-bold tabular-nums truncate">
            {formatQty(stats.soldQty)} {unitName}
          </div>
          <div className="text-xs sm:text-sm/relaxed font-medium opacity-90 mt-0.5 truncate">
            Toplam Satış
          </div>
        </div>

        {/* Satış Tutarı */}
        <div className="rounded-2xl p-4 sm:p-5 text-white bg-gradient-to-br from-emerald-400 to-emerald-500 shadow-soft min-w-0 overflow-hidden">
          <div className="text-xl sm:text-3xl font-bold tabular-nums truncate">
            {formatMoney(stats.soldAmount)}
          </div>
          <div className="text-xs sm:text-sm/relaxed font-medium opacity-90 mt-0.5 truncate">
            Satış Tutarı
          </div>
        </div>

        {/* Toplam Alış */}
        <div className="rounded-2xl p-4 sm:p-5 text-white bg-gradient-to-br from-amber-400 to-amber-500 shadow-soft min-w-0 overflow-hidden">
          <div className="text-xl sm:text-3xl font-bold tabular-nums truncate">
            {formatQty(stats.boughtQty)} {unitName}
          </div>
          <div className="text-xs sm:text-sm/relaxed font-medium opacity-90 mt-0.5 truncate">
            Toplam Alış
          </div>
        </div>

        {/* Kâr Marjı */}
        <div className="rounded-2xl p-4 sm:p-5 text-white bg-gradient-to-br from-blue-400 to-blue-500 shadow-soft min-w-0 overflow-hidden">
          <div className="text-xl sm:text-3xl font-bold tabular-nums truncate">
            {stats.hasCost ? `%${stats.marginPct.toFixed(0)}` : "—"}
          </div>
          <div className="text-xs sm:text-sm/relaxed font-medium opacity-90 mt-0.5 truncate">
            Kâr Marjı
          </div>
        </div>
      </div>
      )}

      {/* 4. 2 SUMMARY CARDS: ALIS & SATIS DETAYLARI (Belirgin Çerçeveli - B2B değilse) */}
      {!isB2B && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Stok Girişleri (Alış) */}
          <div className="card p-4 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-2xl shadow-sm">
            <h3 className="font-semibold flex items-center gap-2 mb-3 text-sm text-slate-800 dark:text-slate-100">
              <Scale size={16} className="text-amber-500" /> Stok Girişleri (Alış)
            </h3>
            <div className="space-y-2 text-sm">
              <SummaryRow label="İlk giriş" value={stats.firstIn ? formatDate(stats.firstIn.date) : "—"} />
              <SummaryRow label="Son giriş" value={stats.lastIn ? formatDate(stats.lastIn.date) : "—"} />
              <SummaryRow label="Ort. alış" value={formatMoney(stats.avgBuy)} />
              <SummaryRow label="Stok maliyeti" value={formatMoney(stats.stockValue)} />
            </div>
          </div>

          {/* Satışlar (Çıkış) */}
          <div className="card p-4 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-2xl shadow-sm">
            <h3 className="font-semibold flex items-center gap-2 mb-3 text-sm text-slate-800 dark:text-slate-100">
              <ShoppingCart size={16} className="text-emerald-500" /> Satışlar (Çıkış)
            </h3>
            <div className="space-y-2 text-sm">
              <SummaryRow label="İlk satış" value={stats.firstOut ? formatDate(stats.firstOut.date) : "—"} />
              <SummaryRow label="Son satış" value={stats.lastOut ? formatDate(stats.lastOut.date) : "—"} />
              <SummaryRow label="Ort. satış" value={formatMoney(stats.avgSale)} />
              <SummaryRow label="Stok satış değeri" value={formatMoney(stats.stockSaleValue)} />
            </div>
          </div>
        </div>
      )}

      {/* 5. TAB NAVIGATION BUTTONS (Belirgin Çerçeveli) */}
      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setActiveTab("ozet")}
          className={cn(
            "px-4 py-2 rounded-xl text-sm font-semibold transition shrink-0",
            activeTab === "ozet"
              ? "bg-brand-500 text-white shadow-sm border border-brand-600"
              : "bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-brand-400 hover:text-brand-600"
          )}
        >
          Hareketler
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("satis")}
          className={cn(
            "px-4 py-2 rounded-xl text-sm font-semibold transition shrink-0",
            activeTab === "satis"
              ? "bg-brand-500 text-white shadow-sm border border-brand-600"
              : "bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-brand-400 hover:text-brand-600"
          )}
        >
          Satışlar ({stats.sales.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("alis")}
          className={cn(
            "px-4 py-2 rounded-xl text-sm font-semibold transition shrink-0",
            activeTab === "alis"
              ? "bg-brand-500 text-white shadow-sm border border-brand-600"
              : "bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-brand-400 hover:text-brand-600"
          )}
        >
          Alışlar ({stats.purchases.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("transfer")}
          className={cn(
            "px-4 py-2 rounded-xl text-sm font-semibold transition shrink-0",
            activeTab === "transfer"
              ? "bg-brand-500 text-white shadow-sm border border-brand-600"
              : "bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-brand-400 hover:text-brand-600"
          )}
        >
          Transfer ({stats.transfers.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("bilgi")}
          className={cn(
            "px-4 py-2 rounded-xl text-sm font-semibold transition shrink-0",
            activeTab === "bilgi"
              ? "bg-brand-500 text-white shadow-sm border border-brand-600"
              : "bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-brand-400 hover:text-brand-600"
          )}
        >
          Bilgi
        </button>
      </div>

      {/* 6. TAB CONTENTS */}
      {activeTab === "ozet" && (
        <MovementList
          items={stats.timeline}
          empty="Henüz hareket yok."
          unit={unitName}
          router={router}
        />
      )}

      {activeTab === "satis" && (
        <MovementList
          items={stats.sales}
          empty="Satış kaydı yok."
          unit={unitName}
          router={router}
        />
      )}

      {activeTab === "alis" && (
        <MovementList
          items={stats.purchases}
          empty="Alış kaydı yok."
          unit={unitName}
          router={router}
        />
      )}

      {activeTab === "transfer" && (
        <MovementList
          items={stats.transfers}
          empty="Depo transferi yok."
          unit={unitName}
          router={router}
        />
      )}

      {activeTab === "bilgi" && (
        <div className="card p-5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-2xl shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
            <InfoItem label="Ürün adı" value={p.name} />
            <InfoItem label="Barkod / SKU" value={p.barcode || p.code || "—"} />
            <InfoItem label="Marka" value={brand || "—"} />
            <InfoItem label="Kategori" value={categoryName || "—"} />
            <InfoItem label="Depo" value={primaryWarehouseName} />
            <InfoItem label="Birim" value={unitName} />
            <InfoItem label="Alış fiyatı" value={formatMoney(Number(p.purchase_price ?? 0))} />
            <InfoItem label="Satış fiyatı" value={formatMoney(Number(p.sale_price ?? 0))} />
            <InfoItem label="2. fiyat (toptan)" value="—" />
            <InfoItem label="KDV" value={`%${Number(p.vat_rate ?? 20)}`} />
            <InfoItem
              label="Kritik stok"
              value={`${formatQty(p.critical_stock ?? 0)} ${unitName}`}
            />
            <InfoItem label="Birim kâr" value={formatMoney(stats.margin)} />
            <InfoItem label="Oluşturulma" value={formatDate(p.created_at)} />
          </div>

          {/* Depolardaki Dağılım */}
          {p.type === "product" && warehouses.data && warehouses.data.length > 0 && (
            <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Warehouse size={16} className="text-slate-400" /> Depolardaki Stok Dağılımı
                </h3>
                {canWrite && (
                  <button
                    type="button"
                    onClick={() => setAdjustOpen(true)}
                    className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                  >
                    <SlidersHorizontal size={13} /> Stok Düzelt
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {warehouses.data.map((w) => {
                  const qty = stockMap[w.id] ?? 0;
                  return (
                    <div
                      key={w.id}
                      className="flex items-center justify-between rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-3.5 py-2.5 text-xs shadow-xs"
                    >
                      <span className="font-medium text-slate-700 dark:text-slate-300 truncate mr-2">
                        {w.name}
                      </span>
                      <span
                        className={cn(
                          "font-bold tabular-nums shrink-0",
                          qty <= 0 ? "text-rose-500" : "text-emerald-600 dark:text-emerald-400"
                        )}
                      >
                        {formatQty(qty)} {unitName}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Alternatif Birimler / Varyantlar */}
          {altUnits.data && altUnits.data.length > 0 && (
            <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800">
              <h3 className="font-semibold mb-3 text-sm text-slate-800 dark:text-slate-100">
                Alternatif Birimler / Varyantlar
              </h3>
              <div className="space-y-2">
                {altUnits.data.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/20"
                  >
                    <div>
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        1 {units.data?.find((x) => x.id === u.unit_id)?.name ?? "Birim"} ={" "}
                        {formatQty(u.factor)} {unitName}
                      </div>
                      {u.barcode && (
                        <div className="text-xs text-slate-400 font-mono mt-0.5">
                          Barkod: {u.barcode}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {p.notes && (
            <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800">
              <h3 className="font-semibold mb-1 text-sm text-slate-800 dark:text-slate-100">
                Açıklama / Notlar
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                {p.notes}
              </p>
            </div>
          )}
        </div>
      )}

      {/* 7. MODALS */}
      {/* Düzenle Modalı */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent
          title="Ürünü düzenle"
          className="w-[96vw] max-w-6xl xl:max-w-7xl max-h-[92vh] overflow-y-auto"
        >
          {editOpen && (
            <ProductForm
              product={p}
              onSaved={() => setEditOpen(false)}
              onCancel={() => setEditOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Barkod / Etiket Modalı */}
      <BarcodeLabelModal
        open={barcodeModalOpen}
        onClose={() => setBarcodeModalOpen(false)}
        initialProductId={p.id}
      />

      {/* Hızlı İşlem Modalı (Satış / Alış / İade) */}
      {quickTradeMode && (
        <QuickTradeModal
          open={!!quickTradeMode}
          onClose={() => setQuickTradeMode(null)}
          mode={quickTradeMode}
          product={p}
          unitName={unitName}
        />
      )}

      {/* Stok Düzeltme Modalı */}
      {adjustOpen && (
        <StockAdjustDialog
          open={adjustOpen}
          onOpenChange={setAdjustOpen}
          productId={p.id}
          productName={p.name}
          stocks={stockMap}
          unit={unitName}
        />
      )}

      {/* 8. PUSULAM SAYFA YARDIMI (Bottom-right floating help) */}
      <div className="pointer-events-none fixed z-[80] right-4 sm:right-5 lg:right-6 bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] lg:bottom-6">
        <div className="pointer-events-auto relative flex flex-col items-end gap-2">
          {helpOpen && (
            <div
              role="dialog"
              className="w-[min(22rem,calc(100vw-1.5rem))] origin-bottom-right rounded-2xl border border-slate-300 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-2xl transition-all duration-200 ease-out absolute bottom-12 right-0 animate-in fade-in slide-in-from-bottom-2"
            >
              <div className="flex items-start justify-between gap-2 px-4 pt-3.5 pb-2 border-b border-slate-200 dark:border-slate-800">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                    Ürün Detayı
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Bu sayfa hakkında · Esc</div>
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
                  Ürünün stok hareketleri ve satış/alış geçmişi.
                </p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">
                  Özellikler
                </p>
                <ul className="space-y-1.5 mb-3">
                  <li className="flex gap-2 text-slate-600 dark:text-slate-300">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
                    <span>Stok timeline</span>
                  </li>
                  <li className="flex gap-2 text-slate-600 dark:text-slate-300">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
                    <span>İlgili faturalar</span>
                  </li>
                  <li className="flex gap-2 text-slate-600 dark:text-slate-300">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
                    <span>Fiyat bilgisi</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={() => setHelpOpen((v) => !v)}
            title="Ürün Detayı yardımı"
            className="h-9 w-9 rounded-full flex items-center justify-center border transition bg-white/90 dark:bg-slate-900/90 border-slate-300 dark:border-slate-700 text-slate-500 hover:text-slate-700 hover:border-slate-400 dark:hover:text-slate-300 shadow-sm"
          >
            <CircleHelp size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper Subcomponents
// ---------------------------------------------------------------------------

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">
        {value}
      </span>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50/70 dark:bg-slate-800/40">
      <div className="text-[11px] uppercase tracking-wide text-slate-400 font-bold">
        {label}
      </div>
      <div className="font-semibold mt-1 text-slate-800 dark:text-slate-200 truncate">
        {value}
      </div>
    </div>
  );
}

function MovementList({
  items,
  empty,
  unit,
  router,
}: {
  items: TimelineItem[];
  empty: string;
  unit: string;
  router: any;
}) {
  const [limit, setLimit] = React.useState(50);
  const visible = items.slice(0, limit);
  const hasMore = items.length > limit;

  if (items.length === 0) {
    return (
      <div className="card p-8 text-center text-sm text-slate-400 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-2xl shadow-sm">
        {empty}
      </div>
    );
  }

  return (
    <div className="card p-2 sm:p-3 overflow-hidden border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-2xl shadow-sm">
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {visible.map((n) => {
          const isSale = n.kind === "sale";
          const isPurchase = n.kind === "purchase";
          const isTransfer = n.kind === "transfer";

          const IconComponent = isSale ? ShoppingCart : isPurchase ? Scale : ArrowLeftRight;
          const iconBg = isSale
            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300"
            : isPurchase
            ? "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300"
            : "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300";

          return (
            <div
              key={n.id}
              onClick={() => {
                if (n.link) router.push(n.link);
              }}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-xl transition border border-transparent hover:border-slate-200 dark:hover:border-slate-700",
                n.link ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40" : ""
              )}
            >
              {/* İkon Kutusu */}
              <div
                className={cn(
                  "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-slate-700/60",
                  iconBg
                )}
              >
                <IconComponent size={18} />
              </div>

              {/* Başlık & Detay */}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                  {n.label}
                </div>
                <div className="text-xs text-slate-400 truncate">
                  {formatDate(n.date)} · {n.partyName}
                  {n.note ? ` · ${n.note.slice(0, 45)}` : ""}
                </div>
              </div>

              {/* Miktar & Tutar */}
              <div className="text-right shrink-0">
                <div
                  className={cn(
                    "font-bold text-sm",
                    isSale
                      ? "text-emerald-600 dark:text-emerald-400"
                      : isPurchase
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-slate-700 dark:text-slate-300"
                  )}
                >
                  {isSale ? "−" : isPurchase ? "+" : ""}
                  {formatQty(Math.abs(n.qty))} {unit}
                </div>

                {!isTransfer && n.lineTotal !== undefined && (
                  <div className="text-xs text-slate-500 tabular-nums">
                    {formatMoney(Math.abs(n.lineTotal))}
                    {n.paid !== undefined && (
                      <span
                        className={cn(
                          "ml-1.5 inline-flex items-center",
                          n.paid ? "text-emerald-500" : "text-amber-500"
                        )}
                        title={n.paid ? "Ödendi" : "Bekliyor"}
                      >
                        {n.paid ? (
                          <Check size={11} className="inline" />
                        ) : (
                          <Clock size={11} className="inline" />
                        )}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <div className="text-center pt-3 pb-1 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            className="btn-ghost text-xs"
            onClick={() => setLimit((prev) => prev + 50)}
          >
            Daha Fazla Göster ({items.length - limit} kaldı)
          </button>
        </div>
      )}
    </div>
  );
}
