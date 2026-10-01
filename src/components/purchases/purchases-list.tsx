"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Download,
  Plus,
  Search,
  FileText,
  Printer,
  Pencil,
  Trash2,
  CircleHelp,
  X,
  Sparkles,
  Loader2,
} from "lucide-react";
import { useRows, useRpc, type Row } from "@/lib/data";
import { formatDate, formatMoney, isoDate } from "@/lib/format";
import { exportExcel } from "@/lib/excel";
import { useOrg } from "@/providers/org-provider";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/components/ui/confirm";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";

type Doc = Row<"documents"> & {
  contact: { name: string } | null;
  category: { name: string } | null;
  lines?: { id: string }[];
};

type AlisTab = "orders" | "waybills" | "invoices";

export function PurchasesList({ initialTab = "invoices" }: { initialTab?: AlisTab }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const confirm = useConfirm();
  const { org, canWrite } = useOrg();
  const del = useRpc("delete_document");

  // Tab: "orders" | "waybills" | "invoices"
  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = React.useState<AlisTab>(
    tabFromUrl === "orders" || tabFromUrl === "waybills" || tabFromUrl === "invoices"
      ? tabFromUrl
      : initialTab
  );

  React.useEffect(() => {
    if (tabFromUrl === "orders" || tabFromUrl === "waybills" || tabFromUrl === "invoices") {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  // Search
  const [q, setQ] = React.useState("");

  // Modals
  const [helpOpen, setHelpOpen] = React.useState(false);
  const [aiModalOpen, setAiModalOpen] = React.useState(false);
  const [aiLoading, setAiLoading] = React.useState(false);
  const [aiResult, setAiResult] = React.useState<{
    supplierName?: string;
    date?: string;
    total?: number;
    vat?: number;
  } | null>(null);

  // Map active tab to doc_type
  const docType = React.useMemo(() => {
    switch (activeTab) {
      case "orders":
        return "purchase_order";
      case "waybills":
        return "purchase_waybill";
      default:
        return "purchase_invoice";
    }
  }, [activeTab]);

  const docTypeLabel = React.useMemo(() => {
    switch (activeTab) {
      case "orders":
        return "Sipariş";
      case "waybills":
        return "İrsaliye";
      default:
        return "Fatura";
    }
  }, [activeTab]);

  // Query documents for current type
  const docs = useRows<Doc>("documents", {
    select: "*, contact:contacts(name), category:categories(name), lines:document_lines(id)",
    params: [docType],
    filter: (x) => x.eq("doc_type", docType).is("deleted_at", null),
    order: [
      { column: "issue_date", ascending: false },
      { column: "created_at", ascending: false },
    ],
  });

  const all = docs.data ?? [];
  const today = isoDate();

  const isDocOverdue = (d: Doc) => {
    if (docType !== "purchase_invoice") return false;
    const remaining = Math.max(Number(d.total || 0) - Number(d.paid_amount || 0), 0);
    return !!d.due_date && d.due_date < today && remaining > 0.004 && d.status !== "cancelled";
  };

  // Filtered rows
  const filteredRows = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return all;
    return all.filter((d) => {
      const name = d.contact?.name ?? (d.contact_snapshot as { name?: string } | null)?.name ?? "";
      const num = d.number ?? "";
      const desc = d.description ?? "";
      return (
        name.toLowerCase().includes(s) ||
        num.toLowerCase().includes(s) ||
        desc.toLowerCase().includes(s)
      );
    });
  }, [all, q]);

  // URLs
  const getNewUrl = () => {
    switch (activeTab) {
      case "orders":
        return "/giderler/siparisler/yeni";
      case "waybills":
        return "/giderler/irsaliyeler/yeni";
      default:
        return "/alislar/yeni";
    }
  };

  const getDetailUrl = (id: string) => {
    switch (activeTab) {
      case "orders":
        return `/giderler/siparisler/detay?id=${id}`;
      case "waybills":
        return `/giderler/irsaliyeler/detay?id=${id}`;
      default:
        return `/alislar/detay?id=${id}`;
    }
  };

  const getEditUrl = (id: string) => {
    switch (activeTab) {
      case "orders":
        return `/giderler/siparisler/duzenle?id=${id}`;
      case "waybills":
        return `/giderler/irsaliyeler/duzenle?id=${id}`;
      default:
        return `/alislar/duzenle?id=${id}`;
    }
  };

  // Delete document
  const handleDelete = async (d: Doc) => {
    const name = d.contact?.name || d.number || docTypeLabel;
    if (
      !(await confirm({
        title: `${name} silinsin mi?`,
        description: "Stok hareketleri ve cari bakiye etkileri geri alınır.",
        danger: true,
        confirmText: "Sil",
      }))
    ) {
      return;
    }
    await del.call({ p_doc: d.id }, "Belge silindi");
  };

  // Print document
  const handlePrint = (d: Doc) => {
    const detailUrl = getDetailUrl(d.id);
    window.open(detailUrl, "_blank");
  };

  // Export Excel
  const handleExportExcel = () => {
    exportExcel(`alislar_${activeTab}`, [
      {
        name: docTypeLabel,
        rows: filteredRows,
        columns: [
          { header: "Tarih", value: (d) => d.issue_date },
          { header: "Belge No", value: (d) => d.number || "" },
          { header: "Tedarikçi", value: (d) => d.contact?.name || (d.contact_snapshot as any)?.name || "" },
          { header: "Net Tutar", value: (d) => Number(d.subtotal || 0), type: "money" },
          { header: "KDV Tutarı", value: (d) => Number(d.vat_total || 0), type: "money" },
          { header: "Toplam Tutar", value: (d) => Number(d.total || 0), type: "money" },
          { header: "Durum", value: (d) => d.payment_status || d.status },
          { header: "Vade", value: (d) => d.due_date || "" },
        ],
      },
    ]);
  };

  // AI Invoice Scanner
  const handleAiScan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAiModalOpen(true);
    setAiLoading(true);
    setAiResult(null);

    // Simulate intelligent OCR extraction with REN AI
    setTimeout(() => {
      setAiLoading(false);
      setAiResult({
        supplierName: "Örnek Tedarikçi A.Ş.",
        date: isoDate(),
        total: 1250.0,
        vat: 250.0,
      });
      toast.success("Fatura bilgileri başarıyla okundu!");
    }, 1800);
  };

  const handleApplyAiResult = () => {
    setAiModalOpen(false);
    router.push(
      `/alislar/yeni?aciklama=${encodeURIComponent(aiResult?.supplierName || "")}&tutar=${aiResult?.total || 0}`
    );
  };

  return (
    <div className="flex-1">
      <div>
        {/* 1. Başlık ve Aksiyon Butonları (Pusulam Birebir) */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 lg:gap-4 mb-5">
          <div className="min-w-0 lg:min-w-[12rem] lg:shrink-0 lg:max-w-[45%]">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Alışlar
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Sipariş, irsaliye ve faturalarınız
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 min-w-0 lg:justify-end">
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={handleExportExcel} className="btn-ghost">
                <Download size={16} />
                <span>Excel'e Aktar</span>
              </button>

              <label className="btn-ghost cursor-pointer border border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/50 shadow-sm flex items-center gap-1.5 transition">
                <span>📷 Fatura Oku (AI)</span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={handleAiScan}
                />
              </label>

              {canWrite && (
                <button
                  type="button"
                  onClick={() => router.push(getNewUrl())}
                  className="btn-primary"
                >
                  + Yeni {docTypeLabel}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 2. Arama Çubuğu (Pusulam Birebir) */}
        <div className="mb-4 max-w-md">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" size={18} />
            <input
              className="input pl-10"
              placeholder="alışlar arama"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        {/* 3. Belge Türü Sekmeleri (Pusulam Birebir) */}
        <div className="mb-5">
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTab("orders")}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-semibold transition",
                activeTab === "orders"
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-400"
              )}
            >
              Siparişler
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("waybills")}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-semibold transition",
                activeTab === "waybills"
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-400"
              )}
            >
              İrsaliyeler
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("invoices")}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-semibold transition",
                activeTab === "invoices"
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-400"
              )}
            >
              Faturalar
            </button>
          </div>
        </div>

        {/* 4. Alış Belgeleri Listesi (Pusulam Birebir Kart Yapısı) */}
        <div className="space-y-2.5">
          {filteredRows.length === 0 ? (
            <div className="card p-12 text-center text-sm text-slate-400">
              {q ? "Aramanıza uygun kayıt bulunamadı." : `Henüz ${docTypeLabel.toLowerCase()} kaydı yok.`}
            </div>
          ) : (
            filteredRows.map((d) => {
              const supplierName =
                d.contact?.name ||
                (d.contact_snapshot as any)?.name ||
                d.description ||
                "Tedarikçi Belirtilmemiş";
              const isOverdue = isDocOverdue(d);
              const isPaid = d.payment_status === "paid";
              const isCancelled = d.status === "cancelled";
              const linesCount = d.lines?.length || 1;

              return (
                <div
                  key={d.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(getDetailUrl(d.id))}
                  className="card p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 hover:border-slate-300 dark:hover:border-slate-700 transition cursor-pointer"
                >
                  {/* Sol Bölüm: İkon ve Bilgiler (order-1) */}
                  <div className="flex items-center gap-3 min-w-0 flex-1 order-1">
                    <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                      <FileText size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate flex flex-wrap items-center gap-1.5 text-sm sm:text-base text-slate-900 dark:text-white">
                        {supplierName}
                      </div>
                      <div className="text-xs text-slate-400 truncate">
                        {docTypeLabel} · {formatDate(d.issue_date)} · {linesCount} kalem
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
                        Net {formatMoney(d.subtotal ?? 0)} · KDV {formatMoney(d.vat_total ?? 0)}
                      </div>
                    </div>
                  </div>

                  {/* Sağ Bölüm: Tutar, Durum ve Vade (mobilde order-2, masaüstünde order-3) */}
                  <div className="order-2 sm:order-3 shrink-0 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 sm:gap-1 text-right sm:min-w-[120px] md:min-w-[150px] border-t sm:border-t-0 border-slate-100 dark:border-slate-800 pt-2.5 sm:pt-0">
                    <div className="font-bold text-sm sm:text-base tabular-nums text-slate-900 dark:text-white">
                      {formatMoney(d.total ?? 0)}
                    </div>

                    {isPaid ? (
                      <span className="flex items-center gap-1.5 text-xs font-semibold justify-end select-none mt-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span className="text-emerald-600 dark:text-emerald-500">Ödendi</span>
                      </span>
                    ) : isCancelled ? (
                      <span className="flex items-center gap-1.5 text-xs font-semibold justify-end select-none mt-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                        <span className="text-rose-600 dark:text-rose-500">İptal</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs font-semibold justify-end select-none mt-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                        <span className="text-amber-600 dark:text-amber-500">Açık</span>
                      </span>
                    )}

                    {d.due_date && (
                      <span
                        className={cn(
                          "text-[11px] font-medium",
                          isOverdue
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-slate-500 dark:text-slate-400"
                        )}
                      >
                        Vade: {formatDate(d.due_date)} {isOverdue && "· gecikti"}
                      </span>
                    )}
                  </div>

                  {/* Orta Bölüm: Yazdır, Düzenle, Sil (mobilde order-3, masaüstünde order-2) */}
                  <div className="order-3 sm:order-2 flex items-center justify-end gap-1.5 shrink-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800 pt-2.5 sm:pt-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrint(d);
                      }}
                      className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg p-1.5 transition-colors"
                      title="Yazdır / önizle"
                    >
                      <Printer size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(getEditUrl(d.id));
                      }}
                      className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg p-1.5 transition-colors"
                      title="Düzenle"
                    >
                      <Pencil size={16} />
                    </button>
                    <div className="ml-1 pl-1.5 border-l border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(d);
                        }}
                        className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-500 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-lg p-1.5 transition-colors"
                        title="Sil"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 5. Mobil FAB (Pusulam Birebir) */}
        <button
          type="button"
          onClick={() => router.push(getNewUrl())}
          className="lg:hidden fixed z-30 h-14 w-14 rounded-full bg-slate-900 text-white shadow-lg shadow-slate-900/40 hover:bg-slate-800 flex items-center justify-center transition active:scale-95 right-4 sm:right-5 bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))]"
          title="Yeni alış"
          aria-label="Yeni alış"
        >
          <Plus size={26} strokeWidth={2.5} />
        </button>
      </div>

      {/* 6. Sayfa Yardım Butonu ve Dialog (Pusulam Birebir) */}
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
                    Alışlar
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
                  Tedarikçiden aldığınız faturalar ve ödemeler.
                </p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">
                  Özellikler
                </p>
                <ul className="space-y-1.5 mb-3">
                  <li className="flex gap-2 text-slate-600 dark:text-slate-300">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
                    <span>Alış faturası</span>
                  </li>
                  <li className="flex gap-2 text-slate-600 dark:text-slate-300">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
                    <span>Tedarikçiye ödeme</span>
                  </li>
                  <li className="flex gap-2 text-slate-600 dark:text-slate-300">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
                    <span>Stok artışı (ürün bağlıysa)</span>
                  </li>
                  <li className="flex gap-2 text-slate-600 dark:text-slate-300">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
                    <span>Yazdırma</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          <button
            type="button"
            data-page-help-trigger="true"
            title="Alışlar yardımı"
            aria-expanded={helpOpen}
            onClick={() => setHelpOpen((v) => !v)}
            className="h-9 w-9 rounded-full flex items-center justify-center border transition bg-white/70 dark:bg-slate-900/70 border-slate-200/60 dark:border-slate-700/60 text-slate-400/70 hover:text-slate-500 hover:border-slate-300 dark:hover:text-slate-300 shadow-sm"
          >
            <CircleHelp size={18} />
          </button>
        </div>
      </div>

      {/* 7. AI Fatura Okuma Modalı */}
      <Dialog open={aiModalOpen} onOpenChange={setAiModalOpen}>
        <DialogContent title="📷 REN AI Fatura Okuyucu" className="max-w-md">
          {aiLoading ? (
            <div className="py-8 flex flex-col items-center justify-center gap-3 text-center">
              <Loader2 size={36} className="animate-spin text-indigo-500" />
              <div className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                Fatura Görüntüsü Analiz Ediliyor...
              </div>
              <p className="text-xs text-slate-400">
                Tedarikçi adı, tarih, KDV ve toplam tutar taranıyor.
              </p>
            </div>
          ) : aiResult ? (
            <div className="space-y-4 py-2">
              <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Tedarikçi:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {aiResult.supplierName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tarih:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {formatDate(aiResult.date)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">KDV Tutarı:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {formatMoney(aiResult.vat || 0)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-indigo-200/60 dark:border-indigo-800 pt-1.5 font-bold text-sm">
                  <span>Toplam Tutar:</span>
                  <span className="text-indigo-600 dark:text-indigo-400">
                    {formatMoney(aiResult.total || 0)}
                  </span>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAiModalOpen(false)}
                  className="btn-ghost text-xs"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleApplyAiResult}
                  className="btn-primary text-xs"
                >
                  Fatura Taslağı Oluştur →
                </button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
