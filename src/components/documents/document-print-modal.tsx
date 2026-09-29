"use client";

import * as React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download, QrCode, FileText } from "lucide-react";
import { formatMoney, formatNumber, formatQty, formatDate } from "@/lib/format";
import { amountInWords } from "@/lib/pdf/words";
import { DOC_TYPES, type DocType } from "@/lib/doc-types";
import type { Tables } from "@/lib/supabase/client";

type Org = Tables<"organizations">;
type Document = Tables<"documents">;
type DocumentLine = Tables<"document_lines"> & { unit_name?: string | null; product_name?: string | null };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doc: Document & { lines: DocumentLine[] };
  org: Org | null;
  balanceInfo?: { previous_balance: number; this_amount: number; current_balance: number } | null;
  contactPhone?: string;
  onDownloadPdf?: () => void;
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
  const isInvoice = doc.doc_type === "sales_invoice" || doc.doc_type === "purchase_invoice";
  const isOrder = doc.doc_type === "sales_order" || doc.doc_type === "purchase_order";
  const isQuote = doc.doc_type === "quote";

  const cfg = DOC_TYPES[doc.doc_type as DocType] ?? DOC_TYPES.sales_invoice;

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

  const orgName = org?.legal_name || org?.name || "REN ENDÜSTRİYEL";
  const orgAddress = org?.address || "Han Mh. Yeni Cadde No:23/D";
  const orgCity = [org?.district, org?.city].filter(Boolean).join(" / ") || "Susurluk / Balıkesir";
  const orgTaxNo = org?.tax_number || "21856457480";
  const orgTaxOffice = org?.tax_office ? `(${org.tax_office.toLowerCase()})` : "(susurluk)";
  const orgIban = org?.iban || "TR290001000313509372275007";

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={`Belge Çıktısı — ${doc.number || "Taslak"}`}
        description="Baskı ve yazdırma önizlemesi"
        className="sm:max-w-4xl max-h-[92dvh] overflow-y-auto thin-scroll p-4 sm:p-6"
      >
        {/* İşlem Butonları (Yazdırma esnasında gizlenir) */}
        <div className="flex items-center justify-between border-b border-border pb-3 print:hidden">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {isInvoice ? "Resmi GİB Formatı (e-Fatura)" : "Satış & Sipariş Notu Formatı"}
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
        {/* GÖRÜNÜM 1: E-FATURA FORMATI (EKTEKİ 1. FOTOĞRAF İLE BİREBİR)     */}
        {/* ------------------------------------------------------------- */}
        {isInvoice ? (
          <div className="mx-auto w-full max-w-[800px] bg-white p-6 sm:p-8 text-zinc-900 font-sans shadow-xs border border-zinc-200 print:border-none print:shadow-none print:p-0">
            {/* Üst Başlık (Sol: Ren Logo & Şirket, Orta: GİB Logo & e-Fatura, Sağ: Karekod) */}
            <div className="grid grid-cols-12 items-start gap-4 pb-6 border-b border-zinc-200">
              {/* Sol: REN Logo & Firma Bilgileri */}
              <div className="col-span-5 flex flex-col gap-2">
                <div className="flex size-14 items-center justify-center rounded-full border-2 border-zinc-900 bg-zinc-900 text-white font-bold text-lg tracking-wider">
                  REN
                </div>
                <div className="text-xs leading-relaxed">
                  <div className="font-bold text-zinc-950 uppercase">{orgName}</div>
                  <div>{orgAddress}</div>
                  <div>{orgCity} – Türkiye</div>
                  <div className="mt-1 text-zinc-600">Vergi No</div>
                  <div className="font-semibold text-zinc-900">{orgTaxNo} {orgTaxOffice}</div>
                </div>
              </div>

              {/* Orta: GİB Logo & e-Fatura */}
              <div className="col-span-4 flex flex-col items-center justify-center text-center pt-1">
                {/* GİB Amblemi */}
                <div className="flex size-16 items-center justify-center rounded-full border-2 border-red-600 p-1 shadow-2xs">
                  <div className="flex size-full items-center justify-center rounded-full bg-red-600 text-white font-black text-sm tracking-tighter">
                    GİB
                  </div>
                </div>
                <div className="mt-1 text-sm font-bold text-zinc-800 tracking-tight">
                  e-Fatura
                </div>
              </div>

              {/* Sağ: Karekod (QR Code) */}
              <div className="col-span-3 flex flex-col items-end">
                <div className="flex size-24 items-center justify-center border border-zinc-300 p-1 bg-zinc-50 rounded">
                  <QrCode className="size-full text-zinc-900" />
                </div>
              </div>
            </div>

            {/* Müşteri (Sayın) ve Fatura Meta Bilgileri */}
            <div className="grid grid-cols-12 gap-4 py-4 border-b border-zinc-200 text-xs">
              {/* Sayın / Alıcı */}
              <div className="col-span-7">
                <div className="font-medium text-zinc-500 mb-1">Sayın</div>
                <div className="font-bold text-zinc-950 uppercase">{snap.name || "Perakende Müşteri"}</div>
                <div className="text-zinc-700">{[snap.address, snap.district, snap.city].filter(Boolean).join(" ")} – Türkiye</div>
                {snap.tax_number && (
                  <div className="mt-1.5">
                    <span className="text-zinc-500">Vergi No: </span>
                    <span className="font-semibold">{snap.tax_number} {snap.tax_office ? `(${snap.tax_office})` : ""}</span>
                  </div>
                )}
              </div>

              {/* Fatura No / Tarih / Ödeme Tarihi */}
              <div className="col-span-5 flex flex-col items-end justify-start text-right space-y-1.5">
                <div>
                  <div className="text-[11px] text-zinc-500">Fatura Numarası</div>
                  <div className="font-bold font-mono text-zinc-950 text-sm">{doc.number || "SF02026000000004"}</div>
                </div>
                <div>
                  <div className="text-[11px] text-zinc-500">Fatura Tarihi</div>
                  <div className="font-medium text-zinc-900">{formatDate(doc.issue_date)}</div>
                </div>
                {doc.due_date && (
                  <div>
                    <div className="text-[11px] text-zinc-500">Ödeme Tarihi</div>
                    <div className="font-medium text-zinc-900">{formatDate(doc.due_date)}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Fatura Kalemleri Tablosu */}
            <div className="py-4">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-300 text-[11px] font-semibold text-zinc-600">
                    <th className="py-2 text-left w-8">No</th>
                    <th className="py-2 text-left">Hizmet / Ürün</th>
                    <th className="py-2 text-right w-16">Miktar</th>
                    <th className="py-2 text-right w-24">Birim Fiyat</th>
                    <th className="py-2 text-right w-16">KDV</th>
                    <th className="py-2 text-right w-24">Toplam</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {doc.lines.map((l, idx) => (
                    <tr key={l.id || idx}>
                      <td className="py-2.5 text-left text-zinc-500">{idx + 1}</td>
                      <td className="py-2.5 text-left font-medium text-zinc-900">
                        {l.description || l.product_name || "—"}
                      </td>
                      <td className="py-2.5 text-right font-mono">{formatQty(l.quantity)}</td>
                      <td className="py-2.5 text-right font-mono">{formatNumber(l.unit_price)} TL</td>
                      <td className="py-2.5 text-right font-mono">%{Number(l.vat_rate || 0).toFixed(2)}</td>
                      <td className="py-2.5 text-right font-mono font-medium">{formatNumber(l.net_amount || l.total_amount)} TL</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Alt Alan (Sol: Senaryo & ETTN, Sağ: Toplamlar) */}
            <div className="grid grid-cols-12 gap-4 pt-4 border-t border-zinc-300 text-xs">
              {/* Sol: Senaryo, Fatura Tipi, Özelleştirme No, ETTN */}
              <div className="col-span-5 space-y-2 text-zinc-700">
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Senaryo</div>
                  <div className="font-semibold text-zinc-900">TEMELFATURA</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Fatura Tipi</div>
                  <div className="font-semibold text-zinc-900">SATIS</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Özelleştirme No</div>
                  <div className="font-medium text-zinc-900">TR1.2</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider">ETTN</div>
                  <div className="font-mono text-[10.5px] text-zinc-800 break-all">
                    {doc.id ? `${doc.id}-471a-bfe7-ee908adc353d` : "49703fd2-c3cc-471a-bfe7-ee908adc353d"}
                  </div>
                </div>
              </div>

              {/* Sağ: Vergi ve Toplamlar Tablosu */}
              <div className="col-span-7 space-y-1.5 text-right">
                <div className="flex justify-between py-0.5">
                  <span className="text-zinc-600">Mal Hizmet Toplam Tutarı</span>
                  <span className="font-mono font-medium">{formatNumber(doc.subtotal || doc.net_total)} TL</span>
                </div>
                {Number(doc.discount_total || 0) > 0 && (
                  <div className="flex justify-between py-0.5 text-zinc-600">
                    <span>Toplam İndirim</span>
                    <span className="font-mono">{formatNumber(doc.discount_total)} TL</span>
                  </div>
                )}
                {vatGroups.map(([rate, g]) => (
                  <div key={rate} className="flex justify-between py-0.5 text-zinc-700">
                    <span>Hesaplanan KDV GERÇEK (%{Number(rate).toFixed(1)})</span>
                    <span className="font-mono">{formatNumber(g.vat)} TL</span>
                  </div>
                ))}
                <div className="flex justify-between py-1 border-t border-zinc-200 font-semibold text-zinc-900">
                  <span>Vergiler Dahil Toplam Tutar</span>
                  <span className="font-mono">{formatNumber(doc.total)} TL</span>
                </div>
                <div className="flex justify-between py-1.5 font-bold text-sm text-zinc-950 border-t border-zinc-300">
                  <span>Ödenecek Tutar</span>
                  <span className="font-mono text-base">{formatNumber(doc.total)} TL</span>
                </div>
              </div>
            </div>

            {/* En Alt: Fatura Notu (IBAN) ve Yazıyla Toplam Tutar */}
            <div className="mt-6 pt-4 border-t border-zinc-200 text-xs text-zinc-700 space-y-2">
              <div>
                <div className="font-semibold text-zinc-900">Fatura Notu</div>
                <div className="font-mono text-[11px] text-zinc-800">
                  Ziraat Bankası Susurluk IBAN (TRL) {orgIban}
                  {doc.notes ? ` · ${doc.notes}` : ""}
                </div>
              </div>
              <div className="font-semibold text-zinc-900">
                Yazıyla Toplam Tutar: <span className="font-medium text-zinc-800">{amountInWords(Number(doc.total || 0), "TRY").replace("Yalnız: ", "").replace(/\s+/g, "")}</span>
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
