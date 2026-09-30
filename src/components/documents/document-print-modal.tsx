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
  onPrintPdf?: () => void;
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

function getDocumentTitle(docType: string): string {
  switch (docType) {
    case "sales_order":
      return "SİPARİŞ NOTU";
    case "purchase_order":
      return "ALIŞ SİPARİŞİ";
    case "sales_invoice":
      return "SATIŞ FATURASI";
    case "purchase_invoice":
      return "ALIŞ FATURASI";
    case "sales_return":
      return "SATIŞ İADE FATURASI";
    case "purchase_return":
      return "ALIŞ İADE FATURASI";
    case "quote":
      return "TEKLİF NOTU";
    case "sales_delivery":
      return "SATIŞ İRSALİYESİ";
    case "purchase_delivery":
      return "ALIŞ İRSALİYESİ";
    case "pos_sale":
      return "SATIŞ NOTU";
    default:
      return "BELGE NOTU";
  }
}

function getDocumentIntro(docType: string): string {
  if (docType.startsWith("purchase")) return "Alış işlemine ait bilgiler aşağıdaki gibidir.";
  if (docType === "quote") return "Teklif işlemine ait bilgiler aşağıdaki gibidir.";
  if (docType.includes("return")) return "İade işlemine ait bilgiler aşağıdaki gibidir.";
  return "Satış işlemine ait bilgiler aşağıdaki gibidir.";
}

export function DocumentPrintModal({
  open,
  onOpenChange,
  doc,
  org,
  balanceInfo,
  contactPhone,
  onDownloadPdf,
  onPrintPdf,
}: Props) {
  if (!doc) return null;

  const snap = ((doc.contact_snapshot as Record<string, string | null>) ?? {}) || {};
  const cfg = DOC_TYPES[doc.doc_type as DocType] ?? DOC_TYPES.sales_invoice;

  const orgName = org?.legal_name || org?.name || "REN ENDÜSTRİYEL";
  const orgAddress = org?.address || "Han Mahallesi Yeni Cadde No:23/D";
  const orgCity = [org?.district, org?.city].filter(Boolean).join(" / ") || "Susurluk / Balıkesir";

  const customerName = snap.name || (doc.doc_type?.startsWith("purchase") ? "Tedarikçi Firma" : "Perakende Müşteri");
  const docTitle = getDocumentTitle(doc.doc_type);
  const docIntro = getDocumentIntro(doc.doc_type);
  const invoiceDate = formatDate(doc.issue_date);
  const docNumber = doc.number || "—";

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
    if (onPrintPdf) {
      onPrintPdf();
    } else if (onDownloadPdf) {
      onDownloadPdf();
    } else {
      window.print();
    }
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
                body > *:not([data-radix-portal]) {
                  display: none !important;
                }
                .print-hide {
                  display: none !important;
                }
              }
            `,
          }}
        />

        {/* İşlem Butonları (Yazdırma esnasında gizlenir) */}
        <div className="flex items-center justify-between border-b border-border pb-3 print:hidden print-hide">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {docTitle} Formatı
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
              <Printer className="size-4" /> Yazdır / PDF
            </Button>
          </div>
        </div>

        {/* TEK VE BİRLEŞİK ŞABLON: TÜM ALIŞ/SATIŞ SİPARİŞ VE FATURALAR İÇİN */}
        <div className="mx-auto w-full max-w-[800px] bg-white p-6 sm:p-8 text-zinc-900 font-sans shadow-xs border border-zinc-200 print:border-none print:shadow-none print:p-0">
          {/* Üst Alan (Sol: Firma Başlığı, Orta: Belge Başlığı, Sağ: Tarih & No) */}
          <div className="grid grid-cols-12 items-start gap-2 pb-4">
            {/* Sol: Firma Bilgileri */}
            <div className="col-span-5 text-xs leading-relaxed">
              <div className="font-bold text-zinc-950 uppercase tracking-tight">{orgName}</div>
              <div className="text-zinc-700 font-medium">Endüstriyel Temizlik Ürünleri</div>
              <div className="text-zinc-600">{orgAddress}</div>
              <div className="text-zinc-600">{orgCity}</div>
            </div>

            {/* Orta: Başlık */}
            <div className="col-span-4 flex justify-center text-center pt-2">
              <h2 className="text-lg font-bold tracking-wider text-zinc-950 uppercase">
                {docTitle}
              </h2>
            </div>

            {/* Sağ: Tarih & Belge No */}
            <div className="col-span-3 flex flex-col items-end text-right text-xs space-y-1">
              <div>
                <span className="font-semibold text-zinc-700">Tarih: </span>
                <span className="text-zinc-900">{invoiceDate}</span>
              </div>
              <div>
                <span className="font-semibold text-zinc-700">No: </span>
                <span className="font-mono text-zinc-900 font-medium">{docNumber}</span>
              </div>
            </div>
          </div>

          {/* Müşteri ve Tebligat / Sayın Yetkili Bölümü */}
          <div className="py-3 text-xs leading-relaxed border-t border-zinc-200">
            <div className="font-bold text-sm text-zinc-950">{customerName}</div>
            {contactPhone && <div className="font-mono text-zinc-700">{contactPhone}</div>}
            {(snap.tax_office || snap.tax_number) && (
              <div className="text-zinc-600 font-mono text-[11px]">
                VD:{snap.tax_office || "—"} VN:{snap.tax_number || "—"}
              </div>
            )}
            <div className="mt-2 font-medium text-zinc-800">Sayın Yetkili dikkatine;</div>
            <div className="text-zinc-600">{docIntro}</div>
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
                      {formatNumber(l.net_amount || (Number(l.quantity || 0) * Number(l.unit_price || 0) * (1 - Number(l.discount_rate || 0) / 100)))} ₺
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

          {doc.notes && (
            <div className="mt-4 p-2.5 rounded bg-zinc-50 border border-zinc-200 text-xs text-zinc-700">
              <span className="font-semibold text-zinc-900">Not: </span>
              {doc.notes}
            </div>
          )}

          {/* Dipnot Teşekkür */}
          <div className="mt-8 pt-4 border-t border-zinc-200 text-xs text-zinc-700">
            Teşekkür ederiz.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
