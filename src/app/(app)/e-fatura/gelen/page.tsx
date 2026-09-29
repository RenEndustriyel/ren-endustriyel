"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Inbox,
  Eye,
  FileCode,
  Download,
  CheckCircle2,
  Clock,
  ArrowDownLeft,
  FileSpreadsheet,
  Building2,
  Search,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DataTable, type Column } from "@/components/ui/data-table";
import { formatMoney } from "@/lib/format";
import { exportExcel } from "@/lib/excel";
import {
  EInvoice,
  useEInvoices,
  markAsImported,
  downloadXmlFile,
} from "@/lib/e-invoice";
import { GibPreviewModal } from "@/components/e-invoice/gib-preview-modal";

export default function GelenEFaturalarPage() {
  const router = useRouter();
  const { data: invoices } = useEInvoices("incoming");

  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<"all" | "imported" | "pending">("all");

  const [selectedInvoice, setSelectedInvoice] = React.useState<EInvoice | null>(null);
  const [previewOpen, setPreviewOpen] = React.useState(false);

  // Filtreleme
  const filtered = React.useMemo(() => {
    return invoices.filter((inv) => {
      const matchSearch =
        inv.party_name.toLowerCase().includes(search.toLowerCase()) ||
        inv.invoice_no.toLowerCase().includes(search.toLowerCase()) ||
        (inv.party_vkn_tckn && inv.party_vkn_tckn.includes(search));

      if (!matchSearch) return false;
      if (filter === "imported") return inv.is_imported_to_purchase;
      if (filter === "pending") return !inv.is_imported_to_purchase;
      return true;
    });
  }, [invoices, search, filter]);

  // Toplamlar
  const totalAmount = filtered.reduce((s, i) => s + i.grand_total, 0);
  const totalVat = filtered.reduce((s, i) => s + i.vat_total, 0);

  // Alış faturasına aktarma eylemi
  const handleImportToPurchase = (inv: EInvoice) => {
    markAsImported(inv.id);
    toast.success(
      `${inv.invoice_no} numaralı e-fatura sisteme Alış Faturası olarak kaydedildi!`
    );
  };

  const columns: Column<EInvoice>[] = [
    {
      id: "invoice_no",
      header: "Fatura No",
      sortValue: (r) => r.invoice_no,
      cell: (r) => (
        <div className="flex flex-col">
          <span className="font-mono font-semibold text-primary">{r.invoice_no}</span>
          <span className="text-[11px] font-mono text-muted">{r.ettn.slice(0, 8)}...</span>
        </div>
      ),
    },
    {
      id: "issue_date",
      header: "Tarih",
      sortValue: (r) => r.issue_date,
      cell: (r) => (
        <div className="flex flex-col">
          <span className="font-medium text-text">{r.issue_date}</span>
          <span className="text-[11px] text-muted">{r.issue_time?.slice(0, 5) || "12:00"}</span>
        </div>
      ),
    },
    {
      id: "party_name",
      header: "Gönderici (Tedarikçi)",
      sortValue: (r) => r.party_name,
      cell: (r) => (
        <div className="flex flex-col max-w-[280px]">
          <span className="truncate font-semibold text-text">{r.party_name}</span>
          <span className="text-[11px] text-muted">VKN: {r.party_vkn_tckn} • {r.party_tax_office || "Vergi Dairesi"}</span>
        </div>
      ),
    },
    {
      id: "profile",
      header: "Senaryo",
      sortValue: (r) => r.profile,
      cell: (r) => (
        <span className="rounded bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-muted">
          {r.profile}
        </span>
      ),
    },
    {
      id: "vat_total",
      header: "KDV Tutarı",
      align: "right",
      sortValue: (r) => r.vat_total,
      cell: (r) => (
        <span className="font-mono text-xs text-muted">
          {formatMoney(r.vat_total)} {r.currency}
        </span>
      ),
    },
    {
      id: "grand_total",
      header: "Genel Toplam (Borç)",
      align: "right",
      sortValue: (r) => r.grand_total,
      cell: (r) => (
        <span className="font-mono text-sm font-bold text-text">
          {formatMoney(r.grand_total)} {r.currency}
        </span>
      ),
    },
    {
      id: "status",
      header: "Durum",
      sortValue: (r) => (r.is_imported_to_purchase ? "Aktarıldı" : "Bekliyor"),
      cell: (r) => (
        <div>
          {r.is_imported_to_purchase ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-3.5" /> Alışa Aktarıldı
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
              <Clock className="size-3.5" /> GİB&apos;den Alındı
            </span>
          )}
        </div>
      ),
    },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (r) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="ghost"
            title="GİB Görsel Önizleme"
            onClick={() => {
              setSelectedInvoice(r);
              setPreviewOpen(true);
            }}
          >
            <Eye className="size-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            title="UBL XML İndir"
            onClick={() => downloadXmlFile(r)}
          >
            <FileCode className="size-4" />
          </Button>
          {!r.is_imported_to_purchase && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={() => handleImportToPurchase(r)}
            >
              <ArrowDownLeft className="size-3.5" /> Alışa Aktar
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-4 pb-16">
      <PageHeader
        title="Gelen E-Faturalar"
        description="Tedarikçileriniz tarafından Gelir İdaresi Başkanlığı üzerinden firmanıza gönderilen e-faturalar"
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                exportExcel("gelen-e-faturalar", [
                  {
                    name: "Gelen Faturalar",
                    rows: filtered,
                    columns: [
                      { header: "Fatura No", value: (r) => r.invoice_no },
                      { header: "ETTN", value: (r) => r.ettn },
                      { header: "Tarih", value: (r) => r.issue_date },
                      { header: "Tedarikçi", value: (r) => r.party_name },
                      { header: "VKN", value: (r) => r.party_vkn_tckn },
                      { header: "KDV Tutarı", value: (r) => r.vat_total, type: "money" },
                      { header: "Toplam Tutar", value: (r) => r.grand_total, type: "money" },
                      {
                        header: "Muhasebe Durumu",
                        value: (r) => (r.is_imported_to_purchase ? "Aktarıldı" : "Bekliyor"),
                      },
                    ],
                  },
                ])
              }
            >
              <FileSpreadsheet className="size-4" /> Excel İndir
            </Button>
          </div>
        }
      />

      {/* Özet Kartları */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="p-4 shadow-sm">
          <div className="text-xs font-medium text-muted">Gelen Toplam Fatura</div>
          <div className="mt-1 text-2xl font-bold text-text">{filtered.length} Adet</div>
          <div className="mt-0.5 text-[11px] text-muted">GİB üzerinden gelen kayıtlar</div>
        </Card>

        <Card className="p-4 shadow-sm">
          <div className="text-xs font-medium text-muted">İndirilecek Toplam KDV</div>
          <div className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatMoney(totalVat)} TRY
          </div>
          <div className="mt-0.5 text-[11px] text-muted">Alış KDV beyannamesine konu</div>
        </Card>

        <Card className="p-4 shadow-sm">
          <div className="text-xs font-medium text-muted">Toplam Fatura Tutarı (Borç)</div>
          <div className="mt-1 text-2xl font-bold text-text">
            {formatMoney(totalAmount)} TRY
          </div>
          <div className="mt-0.5 text-[11px] text-muted">Tedarikçi borç tahakkuku</div>
        </Card>
      </div>

      {/* Arama ve Filtre Çubuğu */}
      <Card className="p-3 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 size-4 text-muted" />
            <Input
              placeholder="Tedarikçi adı, fatura no veya VKN ile ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-surface-2 p-1 border border-border">
            <button
              onClick={() => setFilter("all")}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                filter === "all" ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text"
              }`}
            >
              Tümü ({invoices.length})
            </button>
            <button
              onClick={() => setFilter("pending")}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                filter === "pending" ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text"
              }`}
            >
              Bekleyenler ({invoices.filter((i) => !i.is_imported_to_purchase).length})
            </button>
            <button
              onClick={() => setFilter("imported")}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                filter === "imported" ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text"
              }`}
            >
              Aktarılanlar ({invoices.filter((i) => i.is_imported_to_purchase).length})
            </button>
          </div>
        </div>
      </Card>

      {/* Tablo */}
      <Card className="overflow-hidden shadow-sm">
        <DataTable<EInvoice>
          columns={columns}
          rows={filtered}
          rowKey={(r) => r.id}
          onRowClick={(row) => {
            setSelectedInvoice(row);
            setPreviewOpen(true);
          }}
          empty={<div className="p-8 text-center text-sm text-muted">Kriterlere uygun gelen e-fatura bulunamadı.</div>}
        />
      </Card>

      {/* GİB Önizleme Modalı */}
      <GibPreviewModal
        invoice={selectedInvoice}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </div>
  );
}
