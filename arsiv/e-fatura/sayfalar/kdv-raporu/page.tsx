"use client";

import * as React from "react";
import {
  Percent,
  Download,
  FileSpreadsheet,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Building2,
  Receipt,
  Scale,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { formatMoney } from "@/lib/format";
import { exportExcel } from "@/lib/excel";
import { useEInvoices, EInvoice } from "@/lib/e-invoice";

type KdvDocRow = {
  id: string;
  invoice_no: string;
  date: string;
  party_name: string;
  type_label: string;
  direction: "sales" | "purchase";
  base_20: number;
  vat_20: number;
  base_10: number;
  vat_10: number;
  base_1: number;
  vat_1: number;
  base_0: number;
  total_base: number;
  total_vat: number;
  grand_total: number;
};

export default function FaturaKdvRaporuPage() {
  const { data: allInvoices } = useEInvoices();

  const [period, setPeriod] = React.useState<"this_month" | "last_month" | "q3" | "year">("this_month");
  const [filterDirection, setFilterDirection] = React.useState<"all" | "sales" | "purchase">("all");

  // Dönem filtrelemesi (2026 yılı referans alınarak)
  const filtered = React.useMemo(() => {
    return allInvoices.filter((inv) => {
      if (inv.status === "cancelled") return false;
      const d = inv.issue_date; // YYYY-MM-DD
      if (period === "this_month") {
        return d.startsWith("2026-09");
      }
      if (period === "last_month") {
        return d.startsWith("2026-08");
      }
      if (period === "q3") {
        return d.startsWith("2026-07") || d.startsWith("2026-08") || d.startsWith("2026-09");
      }
      return d.startsWith("2026");
    });
  }, [allInvoices, period]);

  // Satır bazında KDV dökümü oluştur
  const docRows: KdvDocRow[] = React.useMemo(() => {
    return filtered
      .filter((inv) => {
        if (filterDirection === "sales") return inv.direction === "outgoing";
        if (filterDirection === "purchase") return inv.direction === "incoming";
        return true;
      })
      .map((inv) => {
        let base_20 = 0, vat_20 = 0;
        let base_10 = 0, vat_10 = 0;
        let base_1 = 0, vat_1 = 0;
        let base_0 = 0;

        inv.lines.forEach((l) => {
          const rate = Number(l.vat_rate || 0);
          const lineTotal = l.total;
          const lineVat = (lineTotal * rate) / 100;
          if (rate === 20) {
            base_20 += lineTotal;
            vat_20 += lineVat;
          } else if (rate === 10) {
            base_10 += lineTotal;
            vat_10 += lineVat;
          } else if (rate === 1) {
            base_1 += lineTotal;
            vat_1 += lineVat;
          } else {
            base_0 += lineTotal;
          }
        });

        // Eğer lines boşsa veya tek kalemse doğrudan inv toplamından çek
        if (!inv.lines.length && inv.vat_total > 0) {
          base_20 = inv.subtotal;
          vat_20 = inv.vat_total;
        }

        const isOutgoing = inv.direction === "outgoing";
        const type_label = isOutgoing
          ? inv.type === "e-fatura"
            ? "e-Fatura Satış"
            : "e-Arşiv Satış"
          : "Gelen e-Fatura Alış";

        return {
          id: inv.id,
          invoice_no: inv.invoice_no,
          date: inv.issue_date,
          party_name: inv.party_name,
          type_label,
          direction: isOutgoing ? "sales" : "purchase",
          base_20,
          vat_20,
          base_10,
          vat_10,
          base_1,
          vat_1,
          base_0,
          total_base: inv.subtotal,
          total_vat: inv.vat_total,
          grand_total: inv.grand_total,
        };
      });
  }, [filtered, filterDirection]);

  // Satış (Hesaplanan) ve Alış (İndirilecek) Genel Toplamları
  const salesDocs = docRows.filter((r) => r.direction === "sales");
  const purchaseDocs = docRows.filter((r) => r.direction === "purchase");

  const salesBase = salesDocs.reduce((s, r) => s + r.total_base, 0);
  const salesVat = salesDocs.reduce((s, r) => s + r.total_vat, 0);

  const purchaseBase = purchaseDocs.reduce((s, r) => s + r.total_base, 0);
  const purchaseVat = purchaseDocs.reduce((s, r) => s + r.total_vat, 0);

  const netVatDiff = salesVat - purchaseVat;
  const isPayable = netVatDiff >= 0;

  const columns: Column<KdvDocRow>[] = [
    {
      id: "invoice_no",
      header: "Belge No",
      sortValue: (r) => r.invoice_no,
      cell: (r) => <span className="font-mono font-semibold text-primary">{r.invoice_no}</span>,
    },
    {
      id: "date",
      header: "Tarih",
      sortValue: (r) => r.date,
      cell: (r) => <span className="text-text">{r.date}</span>,
    },
    {
      id: "party_name",
      header: "Cari / Firma Adı",
      sortValue: (r) => r.party_name,
      cell: (r) => <span className="truncate font-semibold text-text max-w-[200px] block">{r.party_name}</span>,
    },
    {
      id: "type_label",
      header: "İşlem Türü",
      sortValue: (r) => r.type_label,
      cell: (r) => (
        <span
          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold ${
            r.direction === "sales"
              ? "bg-primary/10 text-primary"
              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          }`}
        >
          {r.direction === "sales" ? <ArrowUpRight className="size-3" /> : <ArrowDownLeft className="size-3" />}
          {r.type_label}
        </span>
      ),
    },
    {
      id: "total_base",
      header: "Matrah",
      align: "right",
      sortValue: (r) => r.total_base,
      cell: (r) => <span className="font-mono text-xs">{formatMoney(r.total_base)} TRY</span>,
    },
    {
      id: "vat_20",
      header: "%20 KDV",
      align: "right",
      sortValue: (r) => r.vat_20,
      cell: (r) => (
        <span className="font-mono text-xs text-muted">
          {r.vat_20 > 0 ? `${formatMoney(r.vat_20)}` : "—"}
        </span>
      ),
    },
    {
      id: "total_vat",
      header: "Toplam KDV",
      align: "right",
      sortValue: (r) => r.total_vat,
      cell: (r) => (
        <span
          className={`font-mono text-xs font-bold ${
            r.direction === "sales" ? "text-primary" : "text-emerald-600 dark:text-emerald-400"
          }`}
        >
          {formatMoney(r.total_vat)} TRY
        </span>
      ),
    },
    {
      id: "grand_total",
      header: "Genel Toplam",
      align: "right",
      sortValue: (r) => r.grand_total,
      cell: (r) => <span className="font-mono text-xs font-bold text-text">{formatMoney(r.grand_total)} TRY</span>,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-4 pb-16">
      <PageHeader
        title="Fatura KDV Raporu"
        description="Gelir İdaresi Başkanlığı e-Fatura ve e-Arşiv belgelerine ait matrah, oran ve KDV beyanname analizi"
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              exportExcel("fatura-kdv-raporu", [
                {
                  name: "KDV Raporu",
                  rows: docRows,
                  columns: [
                    { header: "Belge No", value: (r) => r.invoice_no },
                    { header: "Tarih", value: (r) => r.date },
                    { header: "Cari / Firma", value: (r) => r.party_name },
                    { header: "İşlem Türü", value: (r) => r.type_label },
                    { header: "Matrah", value: (r) => r.total_base, type: "money" },
                    { header: "%20 KDV", value: (r) => r.vat_20, type: "money" },
                    { header: "Toplam KDV", value: (r) => r.total_vat, type: "money" },
                    { header: "Genel Toplam", value: (r) => r.grand_total, type: "money" },
                  ],
                },
              ])
            }
          >
            <FileSpreadsheet className="size-4" /> Excel Raporu İndir
          </Button>
        }
      />

      {/* Dönem ve Kapsam Seçici */}
      <Card className="p-3 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1 rounded-lg bg-surface-2 p-1 border border-border">
            <button
              onClick={() => setPeriod("this_month")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                period === "this_month" ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text"
              }`}
            >
              Bu Ay (Eylül 2026)
            </button>
            <button
              onClick={() => setPeriod("last_month")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                period === "last_month" ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text"
              }`}
            >
              Geçen Ay (Ağustos 2026)
            </button>
            <button
              onClick={() => setPeriod("q3")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                period === "q3" ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text"
              }`}
            >
              3. Çeyrek (Tem-Ağu-Eyl)
            </button>
            <button
              onClick={() => setPeriod("year")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                period === "year" ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text"
              }`}
            >
              Tüm Yıl (2026)
            </button>
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-surface-2 p-1 border border-border">
            <button
              onClick={() => setFilterDirection("all")}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                filterDirection === "all" ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text"
              }`}
            >
              Tümü
            </button>
            <button
              onClick={() => setFilterDirection("sales")}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                filterDirection === "sales" ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text"
              }`}
            >
              Sadece Satışlar
            </button>
            <button
              onClick={() => setFilterDirection("purchase")}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                filterDirection === "purchase" ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text"
              }`}
            >
              Sadece Alışlar
            </button>
          </div>
        </div>
      </Card>

      {/* KPI Kartları */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* Satış KDV (Hesaplanan) */}
        <Card className="p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium text-muted">
            <span>Hesaplanan KDV (Satışlar)</span>
            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
              391 Hesap
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-primary">
            {formatMoney(salesVat)} TRY
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-muted">
            <span>Toplam Satış Matrahı:</span>
            <span className="font-mono font-medium text-text">{formatMoney(salesBase)} TRY</span>
          </div>
        </Card>

        {/* Alış KDV (İndirilecek) */}
        <Card className="p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium text-muted">
            <span>İndirilecek KDV (Alışlar)</span>
            <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              191 Hesap
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatMoney(purchaseVat)} TRY
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-muted">
            <span>Toplam Alış Matrahı:</span>
            <span className="font-mono font-medium text-text">{formatMoney(purchaseBase)} TRY</span>
          </div>
        </Card>

        {/* Net KDV Durumu */}
        <Card className={`p-4 shadow-sm border-l-4 ${isPayable ? "border-l-danger" : "border-l-success"}`}>
          <div className="flex items-center justify-between text-xs font-medium text-muted">
            <span>{isPayable ? "Net Ödenecek KDV" : "Sonraki Döneme Devreden KDV"}</span>
            <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-muted">
              {isPayable ? "360 Hesap" : "190 Hesap"}
            </span>
          </div>
          <div className={`mt-2 text-2xl font-bold ${isPayable ? "text-danger" : "text-success"}`}>
            {formatMoney(Math.abs(netVatDiff))} TRY
          </div>
          <div className="mt-1 text-xs text-muted">
            {isPayable
              ? "Vergi dairesine ödenecek tahakkuk tutarı"
              : "Gelecek ay mahsup edilmek üzere devreden KDV"}
          </div>
        </Card>
      </div>

      {/* Oran Bazında Matrah ve KDV Dağılım Tablosu */}
      <Card className="p-4 shadow-sm">
        <div className="mb-3 text-sm font-semibold text-text">Oran Bazında KDV Dağılım Özeti (GİB Beyanname Formatı)</div>
        <div className="overflow-x-auto thin-scroll">
          <table className="w-full text-xs">
            <thead className="border-b border-border text-[11px] font-semibold uppercase tracking-wider text-muted">
              <tr>
                <th className="py-2 text-left">KDV Oranı</th>
                <th className="py-2 text-right">Satış Matrahı (Gelir)</th>
                <th className="py-2 text-right">Hesaplanan KDV</th>
                <th className="py-2 text-right">Alış Matrahı (Gider)</th>
                <th className="py-2 text-right">İndirilecek KDV</th>
                <th className="py-2 text-right">Net Fark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 font-mono">
              <tr className="hover:bg-surface-2/40">
                <td className="py-2.5 font-sans font-bold text-text">%20 (Genel Oran)</td>
                <td className="py-2.5 text-right font-medium">{formatMoney(salesBase)} TRY</td>
                <td className="py-2.5 text-right font-semibold text-primary">{formatMoney(salesVat)} TRY</td>
                <td className="py-2.5 text-right font-medium">{formatMoney(purchaseBase)} TRY</td>
                <td className="py-2.5 text-right font-semibold text-emerald-600 dark:text-emerald-400">{formatMoney(purchaseVat)} TRY</td>
                <td className={`py-2.5 text-right font-bold ${isPayable ? "text-danger" : "text-success"}`}>
                  {isPayable ? `+${formatMoney(netVatDiff)}` : `-${formatMoney(Math.abs(netVatDiff))}`} TRY
                </td>
              </tr>
              <tr className="hover:bg-surface-2/40">
                <td className="py-2.5 font-sans font-bold text-text">%10 (İndirimli Oran)</td>
                <td className="py-2.5 text-right text-muted">0,00 TRY</td>
                <td className="py-2.5 text-right text-muted">0,00 TRY</td>
                <td className="py-2.5 text-right text-muted">0,00 TRY</td>
                <td className="py-2.5 text-right text-muted">0,00 TRY</td>
                <td className="py-2.5 text-right text-muted">0,00 TRY</td>
              </tr>
              <tr className="hover:bg-surface-2/40">
                <td className="py-2.5 font-sans font-bold text-text">%1 (Temel İndirimli)</td>
                <td className="py-2.5 text-right text-muted">0,00 TRY</td>
                <td className="py-2.5 text-right text-muted">0,00 TRY</td>
                <td className="py-2.5 text-right text-muted">0,00 TRY</td>
                <td className="py-2.5 text-right text-muted">0,00 TRY</td>
                <td className="py-2.5 text-right text-muted">0,00 TRY</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Belge Dökümü Tablosu */}
      <Card className="overflow-hidden shadow-sm">
        <div className="border-b border-border p-3 text-sm font-semibold text-text">
          Belge Bazlı KDV Dağılım Listesi ({docRows.length} Belge)
        </div>
        <DataTable<KdvDocRow>
          columns={columns}
          rows={docRows}
          rowKey={(r) => r.id}
          empty={<div className="p-8 text-center text-sm text-muted">Seçilen dönemde KDV&apos;li fatura hareketi bulunamadı.</div>}
        />
      </Card>
    </div>
  );
}
