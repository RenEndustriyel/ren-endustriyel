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
  Sparkles,
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
import { useProducts, useSave, newId } from "@/lib/data";

export default function GelenEFaturalarPage() {
  const router = useRouter();
  const { data: invoices } = useEInvoices("incoming");
  const { data: existingProducts = [] } = useProducts();
  const saveProduct = useSave("products");

  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<"all" | "pending" | "imported">("all");
  const [selectedInvoice, setSelectedInvoice] = React.useState<EInvoice | null>(null);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [isImporting, setIsImporting] = React.useState(false);

  // Filtreleme
  const filtered = React.useMemo(() => {
    if (!invoices) return [];
    return invoices.filter((inv) => {
      const q = search.toLowerCase();
      const matchSearch =
        inv.sender_title?.toLowerCase().includes(q) ||
        inv.invoice_no?.toLowerCase().includes(q) ||
        inv.sender_vkn?.includes(q);

      if (!matchSearch) return false;
      if (filter === "imported") return inv.is_imported_to_purchase;
      if (filter === "pending") return !inv.is_imported_to_purchase;
      return true;
    });
  }, [invoices, search, filter]);

  // Toplamlar
  const totalAmount = filtered.reduce((s, i) => s + (i.grand_total || 0), 0);
  const totalVat = filtered.reduce((s, i) => s + (i.vat_total || 0), 0);

  // Alış faturasına aktarma ve OLMAYAN ÜRÜNLERİ OTOMATİK VERİTABANINA EKLEME eylemi
  const handleImportToPurchase = async (inv: EInvoice) => {
    if (isImporting) return;
    setIsImporting(true);

    try {
      let createdProductCount = 0;
      const invoiceItems = (inv as any).items || (inv as any).lines || [];

      // Faturadaki her satırı kontrol et
      for (const item of invoiceItems) {
        const itemName = (item.name || item.product_name || item.description || "").trim();
        const itemBarcode = (item.barcode || item.item_code || "").trim();
        const unitPrice = Number(item.unit_price || item.price || 0);
        const vatRate = Number(item.vat_rate || item.tax_rate || 20);

        if (!itemName) continue;

        // Ürün mevcut listede var mı?
        const exists = existingProducts.some(
          (p: any) =>
            (itemBarcode && p.barcode && p.barcode.trim() === itemBarcode) ||
            (p.name && p.name.trim().toLowerCase() === itemName.toLowerCase())
        );

        // Eğer ürün veritabanında yoksa, otomatik yeni ürün kartı oluştur
        if (!exists) {
          const generatedBarcode = itemBarcode || `PRD-${Date.now().toString().slice(-6)}`;
          await saveProduct.mutateAsync({
            id: newId(),
            name: itemName,
            barcode: generatedBarcode,
            purchase_price: unitPrice,
            sale_price: Number((unitPrice * 1.35).toFixed(2)), // %35 varsayılan kâr marjı
            vat_rate: vatRate,
            stock: 0,
            unit: item.unit || "Adet",
            created_at: new Date().toISOString(),
          } as any);

          createdProductCount++;
        }
      }

      // Faturayı içeri aktarıldı olarak işaretle
      markAsImported(inv.id);

      if (createdProductCount > 0) {
        toast.success(
          `${inv.invoice_no} aktarıldı! Listede olmayan ${createdProductCount} yeni ürün otomatik stok listesine eklendi.`,
          { icon: <Sparkles className="size-4 text-emerald-500" /> }
        );
      } else {
        toast.success(`${inv.invoice_no} numaralı e-fatura sisteme Alış Faturası olarak kaydedildi!`);
      }
    } catch (error) {
      console.error("Fatura aktarma hatası:", error);
      toast.error("Fatura aktarılırken bir hata oluştu.");
    } finally {
      setIsImporting(false);
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
          <span className="text-[11px] font-mono text-muted">{r.ettn?.slice(0, 8)}...</span>
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
      id: "sender",
      header: "Gönderen (Tedarikçi)",
      sortValue: (r) => r.sender_title,
      cell: (r) => (
        <div className="flex flex-col max-w-[260px]">
          <span className="font-medium text-text truncate" title={r.sender_title}>
            {r.sender_title}
          </span>
          <span className="text-[11px] text-muted font-mono">VKN/TCKN: {r.sender_vkn}</span>
        </div>
      ),
    },
    {
      id: "grand_total",
      header: "Ödenecek Tutar",
      align: "right",
      sortValue: (r) => r.grand_total,
      cell: (r) => (
        <div className="flex flex-col items-end">
          <span className="font-semibold text-text">{formatMoney(r.grand_total)}</span>
          <span className="text-[11px] text-muted">KDV: {formatMoney(r.vat_total)}</span>
        </div>
      ),
    },
    {
      id: "status",
      header: "Durum",
      cell: (r) =>
        r.is_imported_to_purchase ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="size-3" />
            Aktarıldı
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600">
            <Clock className="size-3" />
            Bekliyor
          </span>
        ),
    },
    {
      id: "actions",
      header: "İşlemler",
      align: "right",
      cell: (r) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            title="Görüntüle"
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
            title="XML İndir"
            onClick={() => downloadXmlFile(r.id, `${r.invoice_no}.xml`)}
          >
            <Download className="size-4" />
          </Button>
          {!r.is_imported_to_purchase && (
            <Button
              size="sm"
              variant="outline"
              disabled={isImporting}
              className="gap-1 border-primary/30 text-primary hover:bg-primary/10"
              onClick={() => handleImportToPurchase(r)}
            >
              <ArrowDownLeft className="size-3.5" />
              Aktar
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Gelen e-Faturalar"
        description="Tedarikçileriniz tarafından Gelir İdaresi Başkanlığı üzerinden firmanıza gönderilen e-faturalar"
        actions={
          <Button
            variant="outline"
            className="gap-2"
            onClick={() =>
              exportExcel("gelen-e-faturalar", [
                {
                  sheet: "Faturalar",
                  columns: [
                    { header: "Fatura No", key: "invoice_no" },
                    { header: "Tarih", key: "issue_date" },
                    { header: "Tedarikçi", key: "sender_title" },
                    { header: "VKN", key: "sender_vkn" },
                    { header: "Toplam", key: "grand_total" },
                    { header: "KDV", key: "vat_total" },
                  ],
                  data: filtered,
                },
              ])
            }
          >
            <FileSpreadsheet className="size-4" />
            Excel'e Aktar
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <Inbox className="size-6" />
          </div>
          <div>
            <div className="text-sm text-muted">Toplam Gelen Fatura</div>
            <div className="text-2xl font-bold text-text">{filtered.length} Adet</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600">
            <Building2 className="size-6" />
          </div>
          <div>
            <div className="text-sm text-muted">Genel Toplam (KDV Dahil)</div>
            <div className="text-2xl font-bold text-text">{formatMoney(totalAmount)}</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-600">
            <FileCode className="size-6" />
          </div>
          <div>
            <div className="text-sm text-muted">Toplam KDV</div>
            <div className="text-2xl font-bold text-text">{formatMoney(totalVat)}</div>
          </div>
        </Card>
      </div>

      <Card className="p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tedarikçi adı, fatura no veya VKN ile ara..."
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-1.5 p-1 bg-surface-2 rounded-lg border border-border">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                filter === "all" ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text"
              }`}
            >
              Tümü ({invoices?.length || 0})
            </button>
            <button
              onClick={() => setFilter("pending")}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                filter === "pending" ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text"
              }`}
            >
              Aktarılmayanlar
            </button>
            <button
              onClick={() => setFilter("imported")}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                filter === "imported" ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text"
              }`}
            >
              Aktarılanlar
            </button>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={filtered}
          empty={
            <div className="p-8 text-center text-sm text-muted">
              Kriterlere uygun gelen e-fatura bulunamadı.
            </div>
          }
        />
      </Card>

      {selectedInvoice && (
        <GibPreviewModal
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          invoice={selectedInvoice}
        />
      )}
    </div>
  );
}