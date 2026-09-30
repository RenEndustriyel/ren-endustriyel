"use client";

import * as React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";
import { formatNumber, formatQty, formatDate } from "@/lib/format";
import { DOC_TYPES, type DocType } from "@/lib/doc-types";
import type { Tables } from "@/lib/supabase/client";

type Org = Tables<"organizations">;
type Document = Tables<"documents">;
type DocumentLine = Tables<"document_lines"> & { unit_name?: string | null; product_name?: string | null };

type ExtendedDocument = Document & {
  lines: DocumentLine[];
  contact_balance_info?: { current_balance?: number | null } | null;
  e_invoice_no?: string | null;
  gib_invoice_number?: string | null;
  waybill_number?: string | null;
  e_waybill_number?: string | null;
  sales_rep?: string | null;
  representative?: string | null;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doc: ExtendedDocument;
  org: Org | null;
  balanceInfo?: { previous_balance: number; this_amount: number; current_balance: number } | null;
  contactPhone?: string;
  onDownloadPdf?: () => void;
}

function formatInvoiceDate(d: string | Date | null | undefined): string {
  if (!d) return "";
  try {
    const s = typeof d === "string" ? d : d.toISOString();
    const [y, m, day] = s.slice(0, 10).split("-");
    if (!y || !m || !day) return String(d);
    return `${parseInt(day, 10)}.${parseInt(m, 10)}.${y}`;
  } catch {
    return String(d);
  }
}

function getInvoiceTitle(docType: string): string {
  if (docType === "purchase_invoice") return "ALIŞ FATURASI";
  if (docType === "purchase_return") return "ALIŞ İADE FATURASI";
  if (docType === "sales_return") return "SATIŞ İADE FATURASI";
  return "SATIŞ FATURASI";
}

export function DocumentPrintModal({
  open,
  onOpenChange,
  doc,
  org,
  balanceInfo,
  contactPhone,
  onDownloadPdf,
}: Props) {
  if (!doc) return null;

  const snap = ((doc.contact_snapshot as Record<string, string | null>) ?? {}) || {};
  const isInvoice =
    doc.doc_type === "sales_invoice" ||
    doc.doc_type === "purchase_invoice" ||
    doc.doc_type === "sales_return" ||
    doc.doc_type === "purchase_return";
  const isOrder = doc.doc_type === "sales_order" || doc.doc_type === "purchase_order";
  const isQuote = doc.doc_type === "quote";
  const isPurchase = doc.doc_type.startsWith("purchase");

  const cfg = DOC_TYPES[doc.doc_type as DocType] ?? DOC_TYPES.sales_invoice;

  const orgName = org?.legal_name || org?.name || "Ren Endüstriyel";
  const orgAddress = org?.address || "Han Mh. Yeni Cadde No:23/D";
  const orgCity = [org?.district, org?.city].filter(Boolean).join(" / ") || "Susurluk / Balıkesir";

  const customerName = snap.name || "Perakende Müşteri";
  const customerAddress =
    [snap.address, [snap.district, snap.city].filter(Boolean).join(" / ")].filter(Boolean).join(" - ") ||
    "TÜRKİYE";
  const taxOffice = snap.tax_office || "";
  const taxNumber = snap.tax_number || "";

  const invoiceTitle = getInvoiceTitle(doc.doc_type);
  const invoiceDate = formatInvoiceDate(doc.issue_date);
  const docNumber = doc.number || "";

  // Totaller
  const subtotal =
    Number(doc.subtotal || 0) > 0
      ? Number(doc.subtotal)
      : (doc.lines || []).reduce((sum, l) => sum + Number(l.quantity || 0) * Number(l.unit_price || 0), 0);
  const discountTotal = Number(doc.discount_total || 0);
  const netTotal = Number(doc.net_total || 0) > 0 ? Number(doc.net_total) : subtotal - discountTotal;
  const vatTotal =
    Number(doc.vat_total || 0) > 0
      ? Number(doc.vat_total)
      : (doc.lines || []).reduce((sum, l) => sum + Number(l.vat_amount || 0), 0);
  const grandTotal = Number(doc.total || 0) > 0 ? Number(doc.total) : netTotal + vatTotal;

  // Son Bakiye
  const currentBalance =
    balanceInfo?.current_balance ?? doc.contact_balance_info?.current_balance ?? 0;

  // Grup bazlı KDV toplamları
  const vatGroups = Object.entries(
    (doc.lines || []).reduce<Record<string, { base: number; vat: number }>>((acc, l) => {
      const k = String(l.vat_rate || 0);
      acc[k] = acc[k] ?? { base: 0, vat: 0 };
      acc[k].base += Number(l.net_amount || 0);
      acc[k].vat += Number(l.vat_amount || 0);
      return acc;
    }, {}),
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={`Belge Çıktısı — ${doc.number || "Taslak"}`}
        description="Baskı ve yazdırma önizlemesi"
        className="sm:max-w-4xl max-h-[92dvh] overflow-y-auto thin-scroll p-4 sm:p-6 print:p-0 print:border-none print:shadow-none"
      >
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @media print {
                @page {
                  size: A4 portrait;
                  margin: 8mm;
                }
                body {
                  background: #ffffff !important;
                  color: #000000 !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                .print-invoice-sheet {
                  min-height: 275mm !important;
                  height: 275mm !important;
                  border: 1px solid #000000 !important;
                  display: flex !important;
                  flex-direction: column !important;
                  justify-content: space-between !important;
                  page-break-inside: avoid !important;
                  box-shadow: none !important;
                }
              }
            `,
          }}
        />

        {/* İşlem Butonları (Yazdırma esnasında gizlenir) */}
        <div className="flex items-center justify-between border-b border-border pb-3 print:hidden">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {isInvoice ? "Fatura Formatı" : "Satış & Sipariş Notu Formatı"}
            </span>
            <span className="text-xs text-muted">{cfg.label}</span>
          </div>
          <div className="flex items-center gap-2">
            {onDownloadPdf && (
              <Button size="sm" variant="outline" onClick={onDownloadPdf}>
                <Download className="size-4" /> PDF İndir
              </Button>
            )}
            <Button size="sm" variant="primary" onClick={handlePrint}>
              <Printer className="size-4" /> Yazdır
            </Button>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* GÖRÜNÜM 1: FATURA ŞABLONU (EKTEKİ FOTOĞRAF İLE BİREBİR AYNISI) */}
        {/* ------------------------------------------------------------- */}
        {isInvoice ? (
          <div className="mx-auto w-full max-w-[820px] bg-white p-2 sm:p-6 text-black font-sans print:m-0 print:p-0">
            <div className="print-invoice-sheet border border-black bg-white flex flex-col justify-between min-h-[920px]">
              {/* 1. Kısım: Üst Başlık (SATIŞ FATURASI / ALIŞ FATURASI) */}
              <div className="border-b border-black py-1.5 text-center font-bold text-sm tracking-wide uppercase text-black">
                {invoiceTitle}
              </div>

              {/* 2. Kısım: Firma Adı ve Sayfa Bölü */}
              <div className="border-b border-black px-4 py-3 flex justify-end">
                <div className="text-right">
                  <div className="font-bold text-sm text-black">{orgName}</div>
                  <div className="text-xs text-black mt-2 pr-2">/</div>
                </div>
              </div>

              {/* 3. Kısım: Müşteri ve Belge Meta Bilgileri */}
              <div className="border-b border-black p-4 grid grid-cols-2 gap-4 text-xs text-black">
                {/* Sol: Müşteri / Cari Bilgileri */}
                <div className="flex flex-col justify-between">
                  <div>
                    <div className="font-bold text-sm uppercase text-black">{customerName}</div>
                    <div className="uppercase text-black mt-0.5 text-[11px] leading-tight">
                      {customerAddress}
                    </div>
                  </div>
                  <div className="mt-4 space-y-0.5 text-[11px] text-black">
                    <div className="flex">
                      <span className="w-24">Vergi Dairesi</span>
                      <span className="mr-2">:</span>
                      <span>{taxOffice}</span>
                    </div>
                    <div className="flex">
                      <span className="w-24">Vergi No</span>
                      <span className="mr-2">:</span>
                      <span>{taxNumber}</span>
                    </div>
                  </div>
                </div>

                {/* Sağ: Fatura ve Belge Bilgileri */}
                <div className="flex justify-end">
                  <div className="space-y-0.5 text-[11px] text-black min-w-[210px]">
                    <div className="flex">
                      <span className="w-28">Tarih</span>
                      <span className="mr-2">:</span>
                      <span>{invoiceDate}</span>
                    </div>
                    <div className="flex">
                      <span className="w-28">Belge No</span>
                      <span className="mr-2">:</span>
                      <span className="font-medium">{docNumber}</span>
                    </div>
                    <div className="flex">
                      <span className="w-28">e-Fatura</span>
                      <span className="mr-2">:</span>
                      <span>{doc.e_invoice_no || doc.gib_invoice_number || ""}</span>
                    </div>
                    <div className="flex">
                      <span className="w-28">İrsaliye</span>
                      <span className="mr-2">:</span>
                      <span>{doc.waybill_number || ""}</span>
                    </div>
                    <div className="flex">
                      <span className="w-28">e-İrsaliye</span>
                      <span className="mr-2">:</span>
                      <span>{doc.e_waybill_number || ""}</span>
                    </div>
                    <div className="flex">
                      <span className="w-28">{isPurchase ? "Satın Alma Temsilcisi" : "Satış Temsilcisi"}</span>
                      <span className="mr-2">:</span>
                      <span>{doc.sales_rep || doc.representative || ""}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Kısım: Tablo Başlıkları */}
              <div className="border-b border-black flex py-1 px-3 text-xs font-bold text-black">
                <div className="w-[42%] text-left">Stok</div>
                <div className="w-[18%] text-right">Miktar</div>
                <div className="w-[12%] text-right">Fiyat</div>
                <div className="w-[8%] text-right">Kdv</div>
                <div className="w-[8%] text-right">%İsk</div>
                <div className="w-[12%] text-right">Tutar</div>
              </div>

              {/* 5. Kısım: Tablo Satırları */}
              <div className="flex-1 flex flex-col justify-start">
                {doc.lines.map((l, idx) => (
                  <div key={l.id || idx} className="flex px-3 py-1 text-xs text-black leading-snug">
                    <div className="w-[42%] text-left font-medium uppercase truncate pr-2">
                      {l.description || l.product_name || "—"}
                    </div>
                    <div className="w-[18%] text-right font-mono tabular-nums">
                      {formatNumber(l.quantity)} {(l.unit_name || "ADET").toUpperCase()}
                    </div>
                    <div className="w-[12%] text-right font-mono tabular-nums">
                      {formatNumber(l.unit_price)}
                    </div>
                    <div className="w-[8%] text-right font-mono tabular-nums">
                      {Math.round(Number(l.vat_rate || 0))}
                    </div>
                    <div className="w-[8%] text-right font-mono tabular-nums">
                      {formatNumber(l.discount_rate || 0)}
                    </div>
                    <div className="w-[12%] text-right font-mono tabular-nums">
                      {formatNumber(l.net_amount || (Number(l.quantity || 0) * Number(l.unit_price || 0) * (1 - Number(l.discount_rate || 0) / 100)))}
                    </div>
                  </div>
                ))}
              </div>

              {/* 6. Kısım: Alt Bilgi (Son Bakiye & Toplamlar) */}
              <div className="p-3 flex items-end justify-between text-xs text-black">
                {/* Sol: Son Bakiye */}
                <div className="font-bold text-black text-xs sm:text-sm">
                  Son Bakiye : {formatNumber(currentBalance)} TL
                </div>

                {/* Sağ: Toplamlar Tablosu */}
                <div className="space-y-0.5 text-xs text-black min-w-[210px]">
                  <div className="flex justify-between">
                    <span className="w-24">Toplam</span>
                    <span className="mr-2">:</span>
                    <span className="flex-1 text-right font-mono tabular-nums">{formatNumber(subtotal)} TL</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="w-24">İskonto</span>
                    <span className="mr-2">:</span>
                    <span className="flex-1 text-right font-mono tabular-nums">{formatNumber(discountTotal)} TL</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="w-24">Ara Toplam</span>
                    <span className="mr-2">:</span>
                    <span className="flex-1 text-right font-mono tabular-nums">{formatNumber(netTotal)} TL</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="w-24">Kdv</span>
                    <span className="mr-2">:</span>
                    <span className="flex-1 text-right font-mono tabular-nums">{formatNumber(vatTotal)} TL</span>
                  </div>
                  <div className="flex justify-between font-bold text-black">
                    <span className="w-24">Genel Toplam</span>
                    <span className="mr-2">:</span>
                    <span className="flex-1 text-right font-mono tabular-nums">{formatNumber(grandTotal)} TL</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ------------------------------------------------------------- */
          /* GÖRÜNÜM 2: SATIŞ NOTU FORMATI (EKTEKİ 2. FOTOĞRAF İLE BİREBİR)  */
          /* ------------------------------------------------------------- */
          <div className="mx-auto w-full max-w-[800px] bg-white p-6 sm:p-8 text-zinc-900 font-sans shadow-xs border border-zinc-200 print:border-none print:shadow-none print:p-0">
            {/* Üst Alan (Sol: Firma Başlığı, Orta: SATIŞ NOTU, Sağ: Tarih & No) */}
            <div className="grid grid-cols-12 items-start gap-2 pb-4">
              {/* Sol: Firma Bilgileri */}
              <div className="col-span-5 text-xs leading-relaxed">
                <div className="font-bold text-zinc-950 uppercase tracking-tight">{orgName}</div>
                <div className="text-zinc-700 font-medium">Endüstriyel Temizlik Ürünleri</div>
                <div className="text-zinc-600">{orgAddress}</div>
                <div className="text-zinc-600">{orgCity}</div>
              </div>

              {/* Orta: Başlık (SATIŞ NOTU / SİPARİŞ NOTU) */}
              <div className="col-span-4 flex justify-center text-center pt-2">
                <h2 className="text-lg font-bold tracking-wider text-zinc-950 uppercase">
                  {isOrder ? "SİPARİŞ NOTU" : isQuote ? "TEKLİF NOTU" : "SATIŞ NOTU"}
                </h2>
              </div>

              {/* Sağ: Tarih & Belge No */}
              <div className="col-span-3 flex flex-col items-end text-right text-xs space-y-1">
                <div>
                  <span className="font-semibold text-zinc-700">Tarih: </span>
                  <span className="text-zinc-900">{formatDate(doc.issue_date)}</span>
                </div>
                <div>
                  <span className="font-semibold text-zinc-700">No: </span>
                  <span className="font-mono text-zinc-900 font-medium">{doc.number || "20260000913"}</span>
                </div>
              </div>
            </div>

            {/* Müşteri ve Tebligat / Sayın Yetkili Bölümü */}
            <div className="py-3 text-xs leading-relaxed border-t border-zinc-200">
              <div className="font-bold text-sm text-zinc-950">{snap.name || "Perakende Müşteri"}</div>
              {contactPhone && <div className="font-mono text-zinc-700">{contactPhone}</div>}
              {(snap.tax_office || snap.tax_number) && (
                <div className="text-zinc-600 font-mono text-[11px]">
                  VD:{snap.tax_office || "Susurluk"} VN:{snap.tax_number || "—"}
                </div>
              )}
              <div className="mt-2 font-medium text-zinc-800">Sayın Yetkili dikkatine;</div>
              <div className="text-zinc-600">Satış işlemine ait bilgiler aşağıdaki gibidir.</div>
            </div>

            {/* Kalemler Tablosu (Açıklama, Miktar, Fiyat, İndirim (%), Tutar (KDV Hariç)) */}
            <div className="py-3">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-t border-b border-zinc-300 text-[11px] font-semibold text-zinc-700">
                    <th className="py-2 text-left pl-1">Açıklama</th>
                    <th className="py-2 text-right pr-2">Miktar</th>
                    <th className="py-2 text-right pr-2">Fiyat</th>
                    <th className="py-2 text-right pr-2">İndirim (%)</th>
                    <th className="py-2 text-right pr-1">Tutar (KDV Hariç)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {doc.lines.map((l, idx) => (
                    <tr key={l.id || idx}>
                      <td className="py-2 text-left pl-1 text-zinc-900">
                        <span className="font-mono text-zinc-400 mr-2">{idx + 1}</span>
                        <span className="font-medium">{l.description || l.product_name || "—"}</span>
                      </td>
                      <td className="py-2 text-right pr-2 font-mono whitespace-nowrap">
                        {formatQty(l.quantity)} {l.unit_name || "ad"}
                      </td>
                      <td className="py-2 text-right pr-2 font-mono whitespace-nowrap">
                        {formatNumber(l.unit_price)} ₺
                      </td>
                      <td className="py-2 text-right pr-2 font-mono">
                        %{Number(l.discount_rate || 0).toFixed(2)}
                      </td>
                      <td className="py-2 text-right pr-1 font-mono font-medium whitespace-nowrap">
                        {formatNumber(l.net_amount)} ₺
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Alt Bakiye ve Toplamlar Çizgisi */}
            <div className="flex items-start justify-between pt-4 border-t border-zinc-300 text-xs">
              {/* Sol: Güncel Bakiyeniz */}
              <div>
                <div className="font-medium text-zinc-800">
                  Güncel bakiyeniz:{" "}
                  <span className="font-bold font-mono text-zinc-950">
                    {balanceInfo
                      ? `${formatNumber(Math.abs(balanceInfo.current_balance))} TL`
                      : "0,00 TL"}
                  </span>
                </div>
              </div>

              {/* Sağ: Net, KDV Dağılımı ve Toplam */}
              <div className="space-y-1 text-right min-w-[200px]">
                <div className="flex justify-between text-zinc-700">
                  <span>Net</span>
                  <span className="font-mono font-medium">{formatNumber(doc.net_total || doc.subtotal)} ₺</span>
                </div>
                {vatGroups.map(([rate, g]) => (
                  <div key={rate} className="flex justify-between text-zinc-700">
                    <span>KDV (%{Math.round(Number(rate))})</span>
                    <span className="font-mono">{formatNumber(g.vat)} ₺</span>
                  </div>
                ))}
                <div className="flex justify-between pt-1 border-t border-zinc-200 font-bold text-sm text-zinc-950">
                  <span>Toplam</span>
                  <span className="font-mono">{formatNumber(doc.total)} ₺</span>
                </div>
              </div>
            </div>

            {/* Dipnot Teşekkür */}
            <div className="mt-8 pt-4 border-t border-zinc-200 text-xs text-zinc-700">
              Teşekkür ederiz.
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
