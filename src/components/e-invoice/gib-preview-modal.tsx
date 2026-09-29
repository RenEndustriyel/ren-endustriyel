"use client";

import * as React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download, QrCode, FileCode } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { EInvoice, downloadXmlFile } from "@/lib/e-invoice";

interface Props {
  invoice: EInvoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GibPreviewModal({ invoice, open, onOpenChange }: Props) {
  if (!invoice) return null;

  const isIncoming = invoice.direction === "incoming";
  const isEArsiv = invoice.type === "e-arsiv";

  const supplierName = isIncoming ? invoice.party_name : "REN ENDÜSTRİYEL OTOMASYON ELEKTRİK TİC. LTD. ŞTİ.";
  const supplierVkn = isIncoming ? invoice.party_vkn_tckn : "7340058491";
  const supplierTaxOffice = isIncoming ? (invoice.party_tax_office || "Pendik") : "Pendik";
  const supplierAddress = isIncoming ? (invoice.party_address || "İstanbul") : "Şeyhli Mah. Ankara Cad. No:340 Pendik / İstanbul";

  const receiverName = isIncoming ? "REN ENDÜSTRİYEL OTOMASYON ELEKTRİK TİC. LTD. ŞTİ." : invoice.party_name;
  const receiverVkn = isIncoming ? "7340058491" : invoice.party_vkn_tckn;
  const receiverTaxOffice = isIncoming ? "Pendik" : (invoice.party_tax_office || "Kadıköy");
  const receiverAddress = isIncoming ? "Şeyhli Mah. Ankara Cad. No:340 Pendik / İstanbul" : (invoice.party_address || invoice.party_city || "İstanbul");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={`GİB Fatura Önizleme — ${invoice.invoice_no}`}
        description={`ETTN: ${invoice.ettn}`}
        className="sm:max-w-4xl max-h-[92dvh]"
      >
        <div className="flex flex-col gap-4">
          {/* Eylemler Barı */}
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                {isEArsiv ? "e-Arşiv Fatura" : "e-Fatura"}
              </span>
              <span className="text-xs text-muted">Senaryo: {invoice.profile}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => downloadXmlFile(invoice)}>
                <FileCode className="size-4" /> UBL XML İndir
              </Button>
              <Button size="sm" variant="primary" onClick={() => window.print()}>
                <Printer className="size-4" /> Yazdır / PDF
              </Button>
            </div>
          </div>

          {/* GİB Standart Fatura Formatı Konteyner */}
          <div className="rounded-xl border border-zinc-300 bg-white p-6 text-zinc-900 shadow-sm print:m-0 print:border-none print:p-0">
            {/* Üst Logo ve Başlık */}
            <div className="grid grid-cols-12 items-center gap-4 border-b-2 border-red-700 pb-4">
              <div className="col-span-8 flex items-center gap-3">
                <div className="flex size-14 items-center justify-center rounded-lg bg-red-700 text-xl font-black tracking-wider text-white shadow-sm">
                  GİB
                </div>
                <div>
                  <h2 className="text-lg font-black tracking-tight text-red-700">
                    T.C. GELİR İDARESİ BAŞKANLIĞI
                  </h2>
                  <div className="text-xs font-bold tracking-widest text-zinc-600 uppercase">
                    {isEArsiv ? "e-ARŞİV FATURA" : "e-FATURA"}
                  </div>
                </div>
              </div>
              <div className="col-span-4 flex flex-col items-end justify-center text-right">
                <div className="flex items-center gap-1.5 rounded border border-zinc-300 p-1.5 bg-zinc-50">
                  <QrCode className="size-10 text-zinc-800" />
                  <div className="text-[10px] text-zinc-500 text-left font-mono leading-tight">
                    Karekod<br />Doğrulama<br />Uyumlu
                  </div>
                </div>
              </div>
            </div>

            {/* Fatura Bilgileri Tablosu */}
            <div className="my-4 grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
              {/* Gönderici / Satıcı */}
              <div className="rounded border border-zinc-200 p-3 bg-zinc-50/70">
                <div className="mb-1 text-[11px] font-bold text-red-700 uppercase tracking-wide">
                  SATICI / GÖNDERİCİ BİLGİLERİ
                </div>
                <div className="text-sm font-bold text-zinc-900">{supplierName}</div>
                <div className="mt-1 text-zinc-600">
                  <span className="font-semibold text-zinc-700">VKN/TCKN:</span> {supplierVkn}
                </div>
                <div className="text-zinc-600">
                  <span className="font-semibold text-zinc-700">Vergi Dairesi:</span> {supplierTaxOffice}
                </div>
                <div className="text-zinc-600">
                  <span className="font-semibold text-zinc-700">Adres:</span> {supplierAddress}
                </div>
              </div>

              {/* Alıcı / Müşteri */}
              <div className="rounded border border-zinc-200 p-3 bg-zinc-50/70">
                <div className="mb-1 text-[11px] font-bold text-red-700 uppercase tracking-wide">
                  ALICI / MÜŞTERİ BİLGİLERİ
                </div>
                <div className="text-sm font-bold text-zinc-900">{receiverName}</div>
                <div className="mt-1 text-zinc-600">
                  <span className="font-semibold text-zinc-700">VKN/TCKN:</span> {receiverVkn}
                </div>
                <div className="text-zinc-600">
                  <span className="font-semibold text-zinc-700">Vergi Dairesi:</span> {receiverTaxOffice}
                </div>
                <div className="text-zinc-600">
                  <span className="font-semibold text-zinc-700">Adres:</span> {receiverAddress}
                </div>
              </div>
            </div>

            {/* Belge Parametreleri */}
            <div className="mb-4 grid grid-cols-2 gap-2 rounded border border-zinc-200 bg-zinc-100/60 p-2.5 text-[11px] sm:grid-cols-4">
              <div>
                <span className="text-zinc-500 block">Fatura No:</span>
                <span className="font-mono font-bold text-zinc-900">{invoice.invoice_no}</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Fatura Tarihi / Saat:</span>
                <span className="font-semibold text-zinc-900">{invoice.issue_date} - {invoice.issue_time?.slice(0, 5) || "12:00"}</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Fatura Tipi / Senaryo:</span>
                <span className="font-semibold text-zinc-900">SATIS / {invoice.profile}</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Para Birimi:</span>
                <span className="font-semibold text-zinc-900">{invoice.currency} (Türk Lirası)</span>
              </div>
              <div className="col-span-2 sm:col-span-4 border-t border-zinc-200 pt-1 mt-1 text-[10px] text-zinc-500 font-mono truncate">
                ETTN (Evrensel Tekil Tanımlayıcı): {invoice.ettn}
              </div>
            </div>

            {/* Mal / Hizmet Satırları Tablosu */}
            <div className="overflow-x-auto border border-zinc-300">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-zinc-300 bg-zinc-100 text-[11px] font-bold text-zinc-700">
                  <tr>
                    <th className="p-2 text-center w-8">#</th>
                    <th className="p-2">Mal / Hizmet Açıklaması</th>
                    <th className="p-2 text-right">Miktar</th>
                    <th className="p-2 text-right">Birim Fiyat</th>
                    <th className="p-2 text-right">KDV %</th>
                    <th className="p-2 text-right">KDV Tutarı</th>
                    <th className="p-2 text-right">Tutar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 text-zinc-800">
                  {invoice.lines.map((line, idx) => {
                    const lineVat = (line.total * line.vat_rate) / 100;
                    return (
                      <tr key={line.id || idx} className="hover:bg-zinc-50">
                        <td className="p-2 text-center text-zinc-500">{idx + 1}</td>
                        <td className="p-2 font-medium">{line.name}</td>
                        <td className="p-2 text-right">
                          {line.quantity} {line.unit}
                        </td>
                        <td className="p-2 text-right font-mono">{formatMoney(line.unit_price)}</td>
                        <td className="p-2 text-right font-semibold">%{line.vat_rate}</td>
                        <td className="p-2 text-right font-mono">{formatMoney(lineVat)}</td>
                        <td className="p-2 text-right font-mono font-bold">{formatMoney(line.total)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Alt Toplamlar ve KDV Dağılımı */}
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
              {/* Notlar & İmzalanma Bilgisi */}
              <div className="rounded border border-zinc-200 p-3 bg-zinc-50 flex flex-col justify-between">
                <div>
                  <div className="font-bold text-zinc-700 mb-1">Açıklama & Notlar:</div>
                  <div className="text-zinc-600 text-[11px] leading-relaxed">
                    {invoice.notes || "Bu fatura 213 sayılı VUK ve 433 Sıra No'lu Genel Tebliği hükümlerine uygun olarak düzenlenmiştir."}
                  </div>
                </div>
                <div className="mt-4 pt-2 border-t border-zinc-200 text-[10px] text-zinc-500">
                  {isEArsiv
                    ? "Elektronik ortamda iletilen ve saklanan bu belge yasal geçerliliğe sahiptir."
                    : "Gelir İdaresi Başkanlığı e-Fatura sistemi üzerinden elektronik mali mühür ile onaylanmıştır."}
                </div>
              </div>

              {/* Tutar Özeti */}
              <div className="rounded border border-zinc-200 p-3 bg-zinc-50/90 text-right space-y-1.5">
                <div className="flex justify-between text-zinc-600">
                  <span>Mal / Hizmet Toplamı:</span>
                  <span className="font-mono font-semibold">{formatMoney(invoice.subtotal)} {invoice.currency}</span>
                </div>
                {invoice.discount_total > 0 && (
                  <div className="flex justify-between text-zinc-600">
                    <span>Toplam İskonto:</span>
                    <span className="font-mono text-danger font-semibold">-{formatMoney(invoice.discount_total)} {invoice.currency}</span>
                  </div>
                )}
                <div className="flex justify-between text-zinc-600">
                  <span>Hesaplanan KDV (%20 / Genel):</span>
                  <span className="font-mono font-semibold">{formatMoney(invoice.vat_total)} {invoice.currency}</span>
                </div>
                <div className="flex justify-between border-t border-zinc-300 pt-2 text-sm font-bold text-zinc-900">
                  <span>Ödenecek Tutar (Genel Toplam):</span>
                  <span className="font-mono text-base text-red-700">{formatMoney(invoice.grand_total)} {invoice.currency}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
