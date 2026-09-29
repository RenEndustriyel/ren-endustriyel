"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Send,
  Eye,
  FileCode,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileSpreadsheet,
  Plus,
  Search,
  Building2,
  UserCheck,
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
  updateEInvoiceStatus,
  downloadXmlFile,
} from "@/lib/e-invoice";
import { GibPreviewModal } from "@/components/e-invoice/gib-preview-modal";

export default function GidenEFaturalarPage() {
  const router = useRouter();
  const { data: invoices } = useEInvoices("outgoing");

  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<"all" | "e-fatura" | "e-arsiv">("all");

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
      if (filter === "e-fatura") return inv.type === "e-fatura";
      if (filter === "e-arsiv") return inv.type === "e-arsiv";
      return true;
    });
  }, [invoices, search, filter]);

  // Toplamlar
  const totalAmount = filtered.reduce((s, i) => s + i.grand_total, 0);
  const totalVat = filtered.reduce((s, i) => s + i.vat_total, 0);

  // İptal Etme
  const handleCancelInvoice = (inv: EInvoice) => {
    if (confirm(`${inv.invoice_no} numaralı faturayı iptal etmek istediğinize emin misiniz?`)) {
      updateEInvoiceStatus(inv.id, "cancelled", "GİB Portalı Üzerinden İptal Talebi Oluşturuldu");
      toast.info(`${inv.invoice_no} faturası iptal edildi olarak işaretlendi.`);
    }
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
      id: "type",
      header: "Tür / Tip",
      sortValue: (r) => (r.type === "e-fatura" ? "e-Fatura" : "e-Arşiv"),
      cell: (r) => (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
            r.type === "e-fatura"
              ? "bg-primary/10 text-primary"
              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          }`}
        >
          {r.type === "e-fatura" ? <Building2 className="size-3" /> : <UserCheck className="size-3" />}
          {r.type === "e-fatura" ? "e-Fatura" : "e-Arşiv"}
        </span>
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
      header: "Alıcı (Müşteri)",
      sortValue: (r) => r.party_name,
      cell: (r) => (
        <div className="flex flex-col max-w-[260px]">
          <span className="truncate font-semibold text-text">{r.party_name}</span>
          <span className="text-[11px] text-muted">VKN/TCKN: {r.party_vkn_tckn} • {r.party_city || "İstanbul"}</span>
        </div>
      ),
    },
    {
      id: "vat_total",
      header: "Hesaplanan KDV",
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
      header: "Genel Toplam (Alacak)",
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
      header: "GİB Durumu",
      sortValue: (r) => r.status,
      cell: (r) => {
        if (r.status === "cancelled") {
          return (
            <span className="inline-flex items-center gap-1 rounded-full bg-danger-soft px-2 py-0.5 text-xs font-semibold text-danger">
              <XCircle className="size-3.5" /> İptal Edildi
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-3.5" /> GİB Onaylandı
          </span>
        );
      },
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
          {r.status !== "cancelled" && (
            <Button
              size="sm"
              variant="ghost"
              className="text-danger hover:text-danger hover:bg-danger-soft text-xs"
              title="Faturayı İptal Et"
              onClick={() => handleCancelInvoice(r)}
            >
              İptal
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-4 pb-16">
      <PageHeader
        title="Giden E-Faturalar"
        description="Müşterilerinize Gelir İdaresi Başkanlığı üzerinden kesilen e-Fatura ve e-Arşiv Faturalar"
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                exportExcel("giden-e-faturalar", [
                  {
                    name: "Giden Faturalar",
                    rows: filtered,
                    columns: [
                      { header: "Fatura No", value: (r) => r.invoice_no },
                      { header: "Tür", value: (r) => (r.type === "e-fatura" ? "e-Fatura" : "e-Arşiv") },
                      { header: "ETTN", value: (r) => r.ettn },
                      { header: "Tarih", value: (r) => r.issue_date },
                      { header: "Alıcı Firma", value: (r) => r.party_name },
                      { header: "VKN/TCKN", value: (r) => r.party_vkn_tckn },
                      { header: "Hesaplanan KDV", value: (r) => r.vat_total, type: "money" },
                      { header: "Toplam Tutar", value: (r) => r.grand_total, type: "money" },
                      { header: "GİB Durumu", value: (r) => r.status_description },
                    ],
                  },
                ])
              }
            >
              <FileSpreadsheet className="size-4" /> Excel İndir
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => router.push("/e-fatura/olustur")}
            >
              <Plus className="size-4" /> Fatura Oluştur
            </Button>
          </div>
        }
      />

      {/* Özet Kartları */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="p-4 shadow-sm">
          <div className="text-xs font-medium text-muted">Kesilen Toplam Fatura</div>
          <div className="mt-1 text-2xl font-bold text-text">{filtered.length} Adet</div>
          <div className="mt-0.5 text-[11px] text-muted">e-Fatura ve e-Arşiv toplamı</div>
        </Card>

        <Card className="p-4 shadow-sm">
          <div className="text-xs font-medium text-muted">Hesaplanan Toplam KDV</div>
          <div className="mt-1 text-2xl font-bold text-primary">
            {formatMoney(totalVat)} TRY
          </div>
          <div className="mt-0.5 text-[11px] text-muted">Satış KDV beyannamesine konu</div>
        </Card>

        <Card className="p-4 shadow-sm">
          <div className="text-xs font-medium text-muted">Toplam Satış Tutarı (Alacak)</div>
          <div className="mt-1 text-2xl font-bold text-text">
            {formatMoney(totalAmount)} TRY
          </div>
          <div className="mt-0.5 text-[11px] text-muted">Müşteri alacak tahakkuku</div>
        </Card>
      </div>

      {/* Arama ve Filtre Çubuğu */}
      <Card className="p-3 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 size-4 text-muted" />
            <Input
              placeholder="Müşteri adı, fatura no veya VKN ile ara..."
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
              onClick={() => setFilter("e-fatura")}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                filter === "e-fatura" ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text"
              }`}
            >
              e-Fatura ({invoices.filter((i) => i.type === "e-fatura").length})
            </button>
            <button
              onClick={() => setFilter("e-arsiv")}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                filter === "e-arsiv" ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text"
              }`}
            >
              e-Arşiv ({invoices.filter((i) => i.type === "e-arsiv").length})
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
          empty={<div className="p-8 text-center text-sm text-muted">Kriterlere uygun giden fatura bulunamadı.</div>}
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
