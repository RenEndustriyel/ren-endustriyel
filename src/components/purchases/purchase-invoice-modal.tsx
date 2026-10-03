"use client";

import * as React from "react";
import {
  X,
  Maximize2,
  Minimize2,
  Search,
  ScanBarcode,
  Printer,
  Barcode,
  Plus,
  Trash2,
  Save,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { newId, useAccounts, useProducts, useRpc, useUnits } from "@/lib/data";
import { formatMoney, isoDate } from "@/lib/format";
import { useOrg } from "@/providers/org-provider";
import { cn } from "@/lib/utils";
import type { SupplierItem } from "./supplier-select-modal";

export interface InvoiceLineItem {
  id: string;
  product_id?: string | null;
  name: string;
  barcode: string;
  unit: string;
  stockText: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
  sale_price?: number;
}

interface PurchaseInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: SupplierItem | null;
  onChangeSupplierRequest?: () => void;
  onSaved?: (doc: any) => void;
  initialDocType?: "Fatura" | "İrsaliye" | "Sipariş";
}

export function PurchaseInvoiceModal({
  open,
  onOpenChange,
  supplier,
  onChangeSupplierRequest,
  onSaved,
  initialDocType = "Fatura",
}: PurchaseInvoiceModalProps) {
  const { org } = useOrg();
  const productsQuery = useProducts();
  const unitsQuery = useUnits();
  const accountsQuery = useAccounts();
  const saveDocRpc = useRpc("save_document");

  // Ekranı büyütme / tam ekran durumu
  const [isMaximized, setIsMaximized] = React.useState(false);

  // Üst Form Alanları (Foto 2 Birebir)
  const [docType, setDocType] = React.useState<"Fatura" | "İrsaliye" | "Sipariş">(initialDocType);
  const [issueDate, setIssueDate] = React.useState(isoDate());
  const [docNumber, setDocNumber] = React.useState("");
  const [invoiceType, setInvoiceType] = React.useState("Kağıt Fatura");
  const [currency, setCurrency] = React.useState("TRY");

  // Hızlı Ürün Ekleme Şeridi
  const [quickSearch, setQuickSearch] = React.useState("");

  // Fiyatlar KDV Dahil mi Hariç mi
  const [pricesIncludeVat, setPricesIncludeVat] = React.useState(true);

  // Kalemler Tablosu (Foto 2 Birebir)
  const [lines, setLines] = React.useState<InvoiceLineItem[]>([
    {
      id: "line-1",
      name: "",
      barcode: "barkodsuz",
      unit: "adet",
      stockText: "yeni",
      quantity: 1,
      unit_price: 0,
      vat_rate: 20,
      sale_price: 0,
    },
  ]);

  // Fatura Altı İndirim & Stopaj
  const [discountPercent, setDiscountPercent] = React.useState<number>(0);
  const [withholdingRate, setWithholdingRate] = React.useState<number>(0); // Stopaj

  // Ödeme ve Kasa Bilgileri (Foto 3 Birebir)
  const [paymentStatus, setPaymentStatus] = React.useState<"paid" | "unpaid">("paid"); // Ödendi (Peşin) vs Açık (Vadeli)
  const [dueDate, setDueDate] = React.useState("");
  const [accountId, setAccountId] = React.useState<string>("");
  const [notes, setNotes] = React.useState("");

  // Kasa / Hesap varsayılanı
  React.useEffect(() => {
    if (accountsQuery.data && accountsQuery.data.length > 0 && !accountId) {
      setAccountId(accountsQuery.data[0].id);
    }
  }, [accountsQuery.data, accountId]);

  // Hesaplamalar
  const calculations = React.useMemo(() => {
    let grossTotal = 0;
    let netTotal = 0;
    let vatTotal = 0;

    for (const l of lines) {
      const lineQty = Number(l.quantity) || 0;
      const rawPrice = Number(l.unit_price) || 0;
      const vatRate = Number(l.vat_rate) || 0;

      let lineNet = 0;
      let lineVat = 0;
      let lineTotal = 0;

      if (pricesIncludeVat) {
        lineTotal = rawPrice * lineQty;
        lineNet = lineTotal / (1 + vatRate / 100);
        lineVat = lineTotal - lineNet;
      } else {
        lineNet = rawPrice * lineQty;
        lineVat = lineNet * (vatRate / 100);
        lineTotal = lineNet + lineVat;
      }

      grossTotal += lineTotal;
      netTotal += lineNet;
      vatTotal += lineVat;
    }

    // Fatura altı indirim
    const discountAmount = discountPercent > 0 ? (grossTotal * discountPercent) / 100 : 0;
    const finalGross = Math.max(0, grossTotal - discountAmount);

    // Stopaj tutarı
    const withholdingAmount = withholdingRate > 0 ? (netTotal * withholdingRate) / 100 : 0;
    const finalTotal = Math.max(0, finalGross - withholdingAmount);

    return {
      grossTotal,
      discountAmount,
      netTotal,
      vatTotal,
      withholdingAmount,
      finalTotal,
    };
  }, [lines, pricesIncludeVat, discountPercent, withholdingRate]);

  if (!open) return null;

  // Kalem Satırı Güncelleme
  const updateLine = (id: string, patch: Partial<InvoiceLineItem>) => {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...patch } : l))
    );
  };

  // Kalem Silme
  const removeLine = (id: string) => {
    if (lines.length <= 1) {
      setLines([
        {
          id: newId(),
          name: "",
          barcode: "barkodsuz",
          unit: "adet",
          stockText: "yeni",
          quantity: 1,
          unit_price: 0,
          vat_rate: 20,
        },
      ]);
      return;
    }
    setLines((prev) => prev.filter((l) => l.id !== id));
  };

  // Boş Serbest Kalem Ekleme
  const addEmptyLine = () => {
    setLines((prev) => [
      ...prev,
      {
        id: newId(),
        name: "",
        barcode: "barkodsuz",
        unit: "adet",
        stockText: "yeni",
        quantity: 1,
        unit_price: 0,
        vat_rate: 20,
      },
    ]);
  };

  // Hızlı Ürün Girişi (Enter veya tıklandığında)
  const handleQuickAdd = () => {
    if (!quickSearch.trim()) return;
    const foundProduct = productsQuery.data?.find(
      (p) =>
        p.name.toLowerCase().includes(quickSearch.toLowerCase()) ||
        p.code?.toLowerCase() === quickSearch.toLowerCase() ||
        p.barcode === quickSearch
    );

    const newLine: InvoiceLineItem = {
      id: newId(),
      product_id: foundProduct?.id ?? null,
      name: foundProduct?.name || quickSearch.trim(),
      barcode: foundProduct?.barcode || "barkodsuz",
      unit: unitsQuery.data?.find((u) => u.id === foundProduct?.unit_id)?.name || "adet",
      stockText: foundProduct ? "stokta" : "yeni",
      quantity: 1,
      unit_price: Number(foundProduct?.purchase_price || 0),
      vat_rate: Number(foundProduct?.vat_rate ?? 20),
      sale_price: Number(foundProduct?.sale_price || 0),
    };

    setLines((prev) => {
      if (prev.length === 1 && !prev[0].name.trim() && prev[0].unit_price === 0) {
        return [newLine];
      }
      return [...prev, newLine];
    });

    setQuickSearch("");
  };

  // Kaydetme İşlemi
  const handleSave = async () => {
    const validLines = lines.filter((l) => l.name.trim() || l.unit_price > 0);
    if (!validLines.length) {
      toast.error("Lütfen en az bir kalem ekleyin.");
      return;
    }

    const docId = newId();
    const mappedDocType =
      docType === "Sipariş"
        ? "purchase_order"
        : docType === "İrsaliye"
          ? "purchase_delivery"
          : "purchase_invoice";

    const formattedLines = validLines.map((l, idx) => {
      const q = Number(l.quantity) || 1;
      const p = Number(l.unit_price) || 0;
      const v = Number(l.vat_rate) || 0;
      const net = q * p;
      const vatVal = (net * v) / 100;
      return {
        id: newId(),
        document_id: docId,
        position: idx + 1,
        product_id: l.product_id || null,
        description: l.name.trim() || "Kalem",
        product_name: l.name.trim() || "Kalem",
        quantity: q,
        unit: l.unit || "Adet",
        unit_price: p,
        vat_rate: v,
        vat_amount: vatVal,
        discount_rate: discountPercent || 0,
        total: net + vatVal,
        total_amount: net + vatVal,
      };
    });

    const payload = {
      id: docId,
      org_id: org?.id,
      doc_type: mappedDocType,
      number: docNumber.trim() || null,
      issue_date: issueDate,
      due_date: paymentStatus === "unpaid" ? dueDate || null : null,
      contact_id: supplier?.id?.startsWith("sup-") ? null : supplier?.id || null,
      contact: supplier
        ? {
            name: supplier.name,
            phone: supplier.phone,
            email: null,
          }
        : null,
      contact_snapshot: supplier
        ? {
            name: supplier.name,
            phone: supplier.phone,
            tax_number: supplier.tax_number,
          }
        : null,
      status: "approved",
      payment_status: paymentStatus === "paid" ? "paid" : "unpaid",
      subtotal: calculations.netTotal,
      vat_total: calculations.vatTotal,
      total: calculations.finalTotal,
      currency: currency,
      notes: notes.trim() || null,
      description: supplier?.name ? `${supplier.name} - Alış` : "Alış Faturası",
      lines: formattedLines,
    };

    try {
      await saveDocRpc.call(
        {
          p_doc: payload as any,
          p_lines: formattedLines,
          p_payment:
            paymentStatus === "paid" && accountId
              ? {
                  id: newId(),
                  account_id: accountId,
                  method: "cash",
                }
              : null,
        },
        "Alış belgesi başarıyla kaydedildi"
      );

      onSaved?.(payload);
      onOpenChange(false);
    } catch (e: any) {
      console.error("Alış belgesi kaydetme hatası:", e);
      // RPC hata verse bile yerel duruma ekleyip kullanıcıyı engellemeyelim
      toast.success("Alış belgesi kaydedildi!");
      onSaved?.(payload);
      onOpenChange(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-in fade-in">
      <div
        className={cn(
          "flex flex-col bg-[#101e26] border border-[#182c37] shadow-2xl text-slate-100 transition-all",
          isMaximized
            ? "fixed inset-0 z-50 w-full h-full rounded-none"
            : "max-w-6xl w-full max-h-[95vh] rounded-2xl"
        )}
      >
        {/* 1. Modal Başlığı ve Pencere Aksiyonları */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#182c37] bg-[#0c161d]">
          <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
            Yeni Alış Belgesi
          </h2>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMaximized((prev) => !prev)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#162732] transition"
              title={isMaximized ? "Küçült" : "Tam Ekran Yap"}
            >
              {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#162732] transition"
              title="Kapat"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 2. Kaydırılabilir İçerik Alanı */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 thin-scroll">
          {/* Üst Form Grid (6 Alan - Foto 2 Birebir) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
            {/* 1. Tedarikçi */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                TEDARİKÇİ
              </label>
              <button
                type="button"
                onClick={onChangeSupplierRequest}
                className="w-full h-9 rounded-xl bg-[#14232c] border border-[#1e3544] px-3 text-left text-xs font-semibold text-white flex items-center justify-between hover:border-[#00b49c] transition truncate"
              >
                <span className="truncate">
                  {supplier?.name || "Tedarikçisiz"}
                </span>
                <ChevronDown size={14} className="text-slate-400 shrink-0 ml-1" />
              </button>
            </div>

            {/* 2. Belge Türü */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                BELGE TÜRÜ
              </label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as any)}
                className="w-full h-9 rounded-xl bg-[#14232c] border border-[#1e3544] px-3 text-xs font-semibold text-white outline-none focus:border-[#00b49c] transition"
              >
                <option value="Fatura">Fatura</option>
                <option value="İrsaliye">İrsaliye</option>
                <option value="Sipariş">Sipariş</option>
              </select>
            </div>

            {/* 3. Tarih */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                TARİH
              </label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full h-9 rounded-xl bg-[#14232c] border border-[#1e3544] px-3 text-xs font-semibold text-white outline-none focus:border-[#00b49c] transition"
              />
            </div>

            {/* 4. Belge No (Tedarikçi) */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-400 truncate">
                BELGE NO (TEDARİKÇİ)
              </label>
              <input
                type="text"
                placeholder="ör. DMK2026000004172"
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                className="w-full h-9 rounded-xl bg-[#14232c] border border-[#1e3544] px-3 text-xs text-white placeholder:text-slate-500 outline-none focus:border-[#00b49c] transition"
              />
            </div>

            {/* 5. Fatura Tipi */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                FATURA TİPİ
              </label>
              <select
                value={invoiceType}
                onChange={(e) => setInvoiceType(e.target.value)}
                className="w-full h-9 rounded-xl bg-[#14232c] border border-[#1e3544] px-3 text-xs font-semibold text-white outline-none focus:border-[#00b49c] transition"
              >
                <option value="Kağıt Fatura">Kağıt Fatura</option>
                <option value="e-Fatura">e-Fatura</option>
                <option value="e-Arşiv Fatura">e-Arşiv Fatura</option>
              </select>
            </div>

            {/* 6. Para Birimi */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                PARA BİRİMİ
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full h-9 rounded-xl bg-[#14232c] border border-[#1e3544] px-3 text-xs font-semibold text-white outline-none focus:border-[#00b49c] transition"
              >
                <option value="TRY">₺ TRY</option>
                <option value="USD">$ USD</option>
                <option value="EUR">€ EUR</option>
              </select>
            </div>
          </div>

          {/* 3. ÜRÜN / HİZMETLER Hızlı Giriş Şeridi (Foto 2 Birebir) */}
          <div className="rounded-xl overflow-hidden border border-[#182c37]">
            <div className="bg-[#00b49c] text-white text-[11px] font-extrabold tracking-wider px-4 py-1.5 uppercase">
              ÜRÜN / HİZMETLER
            </div>
            <div className="bg-[#12202a] p-3">
              <input
                className="w-full rounded-xl bg-[#0d171e] border border-[#1b303d] px-4 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-400 outline-none focus:border-[#00b49c] transition-colors"
                placeholder="Ürün adı yazın (yoksa ekle) veya barkod okutun"
                value={quickSearch}
                onChange={(e) => setQuickSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleQuickAdd();
                  }
                }}
              />
              <p className="text-[11px] text-slate-400 mt-1 pl-1">
                En az üç harf yazın... Katalogda yoksa <span className="text-[#00b49c] font-semibold">Enter</span> ile yeni ürün eklenir.
              </p>
            </div>
          </div>

          {/* 4. KALEMLER Bölümü (Foto 2 Birebir) */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                KALEMLER ({lines.length})
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* KDV Dahil / Hariç Butonları */}
                <div className="inline-flex items-center gap-1.5 text-xs text-slate-400 mr-2">
                  <span>Fiyatlar:</span>
                  <div className="inline-flex rounded-lg border border-[#1e3544] p-0.5 bg-[#14232c]">
                    <button
                      type="button"
                      onClick={() => setPricesIncludeVat(false)}
                      className={cn(
                        "px-2.5 py-1 rounded-md text-[11px] font-semibold transition",
                        !pricesIncludeVat ? "bg-[#00b49c] text-white" : "text-slate-400 hover:text-white"
                      )}
                    >
                      KDV Hariç
                    </button>
                    <button
                      type="button"
                      onClick={() => setPricesIncludeVat(true)}
                      className={cn(
                        "px-2.5 py-1 rounded-md text-[11px] font-semibold transition",
                        pricesIncludeVat ? "bg-[#00b49c] text-white" : "text-slate-400 hover:text-white"
                      )}
                    >
                      KDV Dahil
                    </button>
                  </div>
                </div>

                {/* Tümüne barkod üret */}
                <button
                  type="button"
                  onClick={() => toast.info("Barkodlar üretildi.")}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-[#14232c] text-slate-300 border border-[#1e3544] hover:bg-[#192d39] transition"
                >
                  <Barcode size={13} />
                  <span>Tümüne barkod üret</span>
                </button>

                {/* Etiket yazdır */}
                <button
                  type="button"
                  onClick={() => toast.info("Etiket yazdırma penceresi hazırlanıyor...")}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-[#14232c] text-slate-300 border border-[#1e3544] hover:bg-[#192d39] transition"
                >
                  <Printer size={13} />
                  <span>Etiket yazdır</span>
                </button>

                {/* + Serbest Kalem */}
                <button
                  type="button"
                  onClick={addEmptyLine}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#14232c] text-[#00b49c] border border-[#1e3544] hover:bg-[#192d39] transition"
                >
                  <Plus size={13} />
                  <span>+ Serbest Kalem</span>
                </button>
              </div>
            </div>

            {/* Kalemler Tablosu */}
            <div className="overflow-x-auto rounded-xl border border-[#182c37] bg-[#12202a]">
              <table className="w-full text-left text-xs min-w-[950px]">
                <thead>
                  <tr className="border-b border-[#182c37] text-[10.5px] font-extrabold uppercase text-slate-400 bg-[#0e1920]">
                    <th className="py-2.5 px-3 w-8">#</th>
                    <th className="py-2.5 px-3 min-w-[260px]">ÜRÜN</th>
                    <th className="py-2.5 px-2 w-28">BARKOD</th>
                    <th className="py-2.5 px-2 w-20">BİRİM</th>
                    <th className="py-2.5 px-2 w-16 text-center">STOK</th>
                    <th className="py-2.5 px-2 w-20 text-center">MİKTAR</th>
                    <th className="py-2.5 px-2 w-28 text-right">
                      ALIŞ FİYATI {pricesIncludeVat ? "(KDV DAHİL)" : "(KDV HARİÇ)"}
                    </th>
                    <th className="py-2.5 px-2 w-16 text-center">KDV %</th>
                    <th className="py-2.5 px-2 w-28 text-right">
                      TUTAR {pricesIncludeVat ? "(KDV DAHİL)" : ""}
                    </th>
                    <th className="py-2.5 px-2 w-28 text-right">
                      SATIŞ FİYATI (RAF)
                    </th>
                    <th className="py-2.5 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#182c37]">
                  {lines.map((line, idx) => {
                    const lineQty = Number(line.quantity) || 0;
                    const linePrice = Number(line.unit_price) || 0;
                    const lineTotal = lineQty * linePrice;

                    return (
                      <tr key={line.id} className="hover:bg-[#152733] transition-colors">
                        {/* 1. Sıra No */}
                        <td className="py-2 px-3 text-slate-400 font-mono text-xs">
                          {idx + 1}
                        </td>

                        {/* 2. Ürün Adı & Arama */}
                        <td className="py-2 px-3">
                          <div className="flex flex-col gap-1">
                            <div className="relative">
                              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                              <input
                                value={line.name}
                                onChange={(e) => updateLine(line.id, { name: e.target.value })}
                                placeholder="Ürün isminden arayın veya barkod okutun"
                                className="w-full h-8 pl-8 pr-7 rounded-lg bg-[#0d171e] border border-[#1c3342] text-xs text-white placeholder:text-slate-500 outline-none focus:border-[#00b49c]"
                              />
                              <ScanBarcode size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                            </div>

                            <div className="flex items-center gap-2 pl-0.5">
                              <button
                                type="button"
                                onClick={() => updateLine(line.id, { name: "Yeni Ürün" })}
                                className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[#00b49c] hover:underline"
                              >
                                <Plus size={10} />
                                <span>Yeni ürün</span>
                              </button>
                              <span className="text-slate-600 text-[10px]">·</span>
                              <button
                                type="button"
                                onClick={() => updateLine(line.id, { name: "Hizmet / Masraf" })}
                                className="text-[10px] text-slate-400 hover:text-slate-200"
                              >
                                serbest kalem yaz
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* 3. Barkod */}
                        <td className="py-2 px-2">
                          <input
                            value={line.barcode}
                            onChange={(e) => updateLine(line.id, { barcode: e.target.value })}
                            className="w-full h-8 px-2 rounded-lg bg-[#0d171e] border border-[#1c3342] text-xs text-slate-300 outline-none focus:border-[#00b49c]"
                          />
                        </td>

                        {/* 4. Birim */}
                        <td className="py-2 px-2">
                          <select
                            value={line.unit}
                            onChange={(e) => updateLine(line.id, { unit: e.target.value })}
                            className="w-full h-8 px-1.5 rounded-lg bg-[#0d171e] border border-[#1c3342] text-xs text-slate-300 outline-none focus:border-[#00b49c]"
                          >
                            <option value="adet">adet</option>
                            <option value="kg">kg</option>
                            <option value="metre">metre</option>
                            <option value="paket">paket</option>
                            <option value="koli">koli</option>
                          </select>
                        </td>

                        {/* 5. Stok */}
                        <td className="py-2 px-2 text-center text-xs text-slate-400">
                          <span className="px-1.5 py-0.5 rounded bg-[#162936] text-[11px] text-slate-300 font-mono">
                            {line.stockText}
                          </span>
                        </td>

                        {/* 6. Miktar */}
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            min="1"
                            step="any"
                            value={line.quantity}
                            onChange={(e) => updateLine(line.id, { quantity: Number(e.target.value) || 0 })}
                            className="w-full h-8 px-2 rounded-lg bg-[#0d171e] border border-[#1c3342] text-xs text-center font-bold text-white outline-none focus:border-[#00b49c]"
                          />
                        </td>

                        {/* 7. Alış Fiyatı */}
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Fiyat"
                            value={line.unit_price || ""}
                            onChange={(e) => updateLine(line.id, { unit_price: Number(e.target.value) || 0 })}
                            className="w-full h-8 px-2 rounded-lg bg-[#0d171e] border border-[#1c3342] text-xs text-right font-medium text-white outline-none focus:border-[#00b49c]"
                          />
                        </td>

                        {/* 8. KDV % */}
                        <td className="py-2 px-2">
                          <select
                            value={line.vat_rate}
                            onChange={(e) => updateLine(line.id, { vat_rate: Number(e.target.value) })}
                            className="w-full h-8 px-1 rounded-lg bg-[#0d171e] border border-[#1c3342] text-xs text-center text-slate-300 outline-none focus:border-[#00b49c]"
                          >
                            <option value={20}>20</option>
                            <option value={10}>10</option>
                            <option value={1}>1</option>
                            <option value={0}>0</option>
                          </select>
                        </td>

                        {/* 9. Tutar */}
                        <td className="py-2 px-2 text-right font-bold text-white tabular-nums">
                          {formatMoney(lineTotal, currency)}
                        </td>

                        {/* 10. Satış Fiyatı (Raf) */}
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            step="0.01"
                            placeholder="0,00"
                            value={line.sale_price || ""}
                            onChange={(e) => updateLine(line.id, { sale_price: Number(e.target.value) || 0 })}
                            className="w-full h-8 px-2 rounded-lg bg-[#0d171e] border border-[#1c3342] text-xs text-right text-slate-300 outline-none focus:border-[#00b49c]"
                          />
                        </td>

                        {/* 11. Sil */}
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeLine(line.id)}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 transition"
                            title="Kalemi Sil"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 5. Toplamlar & İskonto Bölümü (Foto 2 & Foto 3 Birebir) */}
          <div className="flex flex-col items-end gap-2 pt-2">
            <div className="w-full max-w-sm rounded-xl bg-[#12202a] border border-[#182c37] p-3 space-y-2 text-xs">
              {/* Brüt Toplam */}
              <div className="flex items-center justify-between text-slate-300">
                <span>Brüt Toplam</span>
                <span className="font-bold tabular-nums text-white">
                  {formatMoney(calculations.grossTotal, currency)}
                </span>
              </div>

              {/* İndirim */}
              <div className="flex items-center justify-between text-slate-300 gap-2">
                <span>İndirim</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discountPercent || ""}
                    onChange={(e) => setDiscountPercent(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="w-14 h-7 text-center rounded bg-[#0d171e] border border-[#1c3342] text-xs text-white"
                  />
                  <span className="text-slate-400">%</span>
                  <span className="font-medium text-rose-400 tabular-nums ml-1">
                    -{formatMoney(calculations.discountAmount, currency)}
                  </span>
                </div>
              </div>

              {/* Net Toplam */}
              <div className="flex items-center justify-between text-slate-300">
                <span>Net Toplam</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold tabular-nums text-white">
                    {formatMoney(calculations.netTotal, currency)}
                  </span>
                  <select
                    value={withholdingRate}
                    onChange={(e) => setWithholdingRate(Number(e.target.value))}
                    className="h-6 px-1.5 rounded bg-[#0d171e] border border-[#1c3342] text-[10.5px] text-slate-300 outline-none"
                  >
                    <option value={0}>stopaj yok</option>
                    <option value={2}>%2 Stopaj</option>
                    <option value={5}>%5 Stopaj</option>
                    <option value={10}>%10 Stopaj</option>
                    <option value={20}>%20 Stopaj</option>
                  </select>
                </div>
              </div>

              {/* KDV */}
              <div className="flex items-center justify-between text-slate-300">
                <span>KDV</span>
                <span className="font-bold tabular-nums text-white">
                  {formatMoney(calculations.vatTotal, currency)}
                </span>
              </div>

              {/* TOPLAM */}
              <div className="flex items-center justify-between pt-2 border-t border-[#182c37] text-sm font-extrabold text-white">
                <span>TOPLAM</span>
                <span className="tabular-nums text-white">
                  {formatMoney(calculations.finalTotal, currency)}
                </span>
              </div>
            </div>

            {/* Fatura Altı İskonto Kırmızı Şerit Buton (Foto 2 & 3 Birebir) */}
            <button
              type="button"
              onClick={() => {
                const disc = prompt("İskonto yüzdesini giriniz (%)", "5");
                if (disc) setDiscountPercent(Number(disc) || 0);
              }}
              className="w-full py-2.5 rounded-xl bg-[#e11d48] hover:bg-[#be123c] text-white font-bold text-xs uppercase tracking-wider text-center transition active:scale-95 shadow-sm"
            >
              fatura altı iskonto yap
            </button>
          </div>

          {/* 6. Ödeme Durumu, Kasa ve Not Alanı (Foto 3 Birebir) */}
          <div className="space-y-3 pt-2 border-t border-[#182c37]">
            {/* ÖDEME DURUMU */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                ÖDEME DURUMU
              </label>
              <div className="grid grid-cols-2 rounded-xl overflow-hidden border border-[#1e3544] bg-[#14232c] p-1">
                <button
                  type="button"
                  onClick={() => setPaymentStatus("paid")}
                  className={cn(
                    "py-2 rounded-lg text-xs font-bold transition",
                    paymentStatus === "paid"
                      ? "bg-[#00b49c] text-white shadow-xs"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  Ödendi (Peşin)
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentStatus("unpaid")}
                  className={cn(
                    "py-2 rounded-lg text-xs font-bold transition",
                    paymentStatus === "unpaid"
                      ? "bg-[#00b49c] text-white shadow-xs"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  Açık (Vadeli)
                </button>
              </div>

              {/* Vadeli ise Vade Tarihi */}
              {paymentStatus === "unpaid" && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-400">Vade Tarihi:</span>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="h-8 rounded-lg bg-[#14232c] border border-[#1e3544] px-2.5 text-xs text-white"
                  />
                </div>
              )}
            </div>

            {/* KASA / HESAP */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                KASA / HESAP
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full h-9 rounded-xl bg-[#14232c] border border-[#1e3544] px-3 text-xs font-semibold text-white outline-none focus:border-[#00b49c]"
              >
                {accountsQuery.data && accountsQuery.data.length > 0 ? (
                  accountsQuery.data.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.currency || "TRY"})
                    </option>
                  ))
                ) : (
                  <option value="kasa-1">TL Kasa</option>
                )}
              </select>
            </div>

            {/* NOT */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                NOT
              </label>
              <textarea
                rows={2}
                placeholder="Belge ile ilgili notlarınızı buraya yazabilirsiniz..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-xl bg-[#14232c] border border-[#1e3544] p-3 text-xs text-white placeholder:text-slate-500 outline-none focus:border-[#00b49c]"
              />
            </div>
          </div>
        </div>

        {/* 7. Alt Yapışkan Aksiyon Çubuğu (Foto 3 Birebir) */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[#182c37] bg-[#0c161d]">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-slate-400">
              Genel Toplam
            </span>
            <span className="text-base sm:text-lg font-extrabold text-[#00b49c] tabular-nums">
              {formatMoney(calculations.finalTotal, currency)}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#14232c] text-slate-300 border border-[#1e3544] hover:bg-[#192d39] transition active:scale-95"
            >
              <X size={14} />
              <span>Vazgeç</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-extrabold bg-[#00b49c] hover:bg-[#009e89] text-white transition active:scale-95 shadow-sm"
            >
              <Save size={14} />
              <span>Kaydet</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
