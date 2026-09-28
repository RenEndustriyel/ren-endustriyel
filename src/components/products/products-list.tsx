"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Upload, Download, Package, AlertTriangle } from "lucide-react";
import { useCategories, useProducts, useUnits, type Row } from "@/lib/data";
import { formatMoney, formatQty } from "@/lib/format";
import { exportExcel } from "@/lib/excel";
import { useOrg } from "@/providers/org-provider";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { SearchInput, matches } from "@/components/ui/search-input";
import { Segmented } from "@/components/ui/segmented";
import { NativeSelect } from "@/components/ui/input";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Stat } from "@/components/ui/stat";
import { Badge } from "@/components/ui/badge";
import { ScanButton } from "@/components/shared/barcode-scanner";
import { cn } from "@/lib/utils";
import { ProductImport } from "./product-import";

type Product = Row<"products">;

export const isCritical = (p: Product) => p.track_stock && p.type === "product" && p.critical_stock !== null && Number(p.stock_qty) <= Number(p.critical_stock);

export function ProductsList() {
  const router = useRouter();
  const { canWrite, role } = useOrg();
  const products = useProducts();
  const units = useUnits();
  const cats = useCategories("product");
  const [q, setQ] = React.useState("");
  const [cat, setCat] = React.useState("");
  const [filter, setFilter] = React.useState<"active" | "critical" | "service" | "passive">("active");
  const [importOpen, setImportOpen] = React.useState(false);
  const unitName = (id: string | null) => units.data?.find((u) => u.id === id)?.name ?? "";
  const catName = (id: string | null) => cats.data?.find((c) => c.id === id)?.name ?? "";
  const showCost = role !== "staff";

  const all = products.data ?? [];
  const rows = all.filter(
    (p) =>
      matches(`${p.name} ${p.code ?? ""} ${p.barcode ?? ""} ${catName(p.category_id)}`, q) &&
      (!cat || p.category_id === cat) &&
      (filter === "active" ? p.is_active : filter === "passive" ? !p.is_active : filter === "service" ? p.type === "service" : isCritical(p)),
  );
  const criticalCount = all.filter((p) => p.is_active && isCritical(p)).length;
  const totalStockValue = all.reduce((sum, p) => {
    if (p.type !== "product") return sum;
    const qty = Math.max(Number(p.stock_qty || 0), 0);
    const cost = Number(p.avg_cost || p.purchase_price || 0);
    return sum + qty * cost;
  }, 0);

  const columns: Column<Product>[] = [
    {
      key: "name",
      header: "Ürün",
      sortValue: (p) => p.name,
      cell: (p) => (
        <div>
          <div className="font-semibold text-text">{p.name}</div>
          <div className="text-xs text-muted">
            {[p.code, p.barcode].filter(Boolean).join(" · ") || (p.type === "service" ? "Hizmet" : "—")}
          </div>
        </div>
      ),
    },
    {
      key: "category",
      header: "Kategori",
      hideBelow: "md",
      sortValue: (p) => catName(p.category_id),
      cell: (p) => {
        const name = catName(p.category_id);
        return name ? (
          <span className="rounded-md bg-surface-2 px-2 py-0.5 text-xs font-medium text-muted">
            {name}
          </span>
        ) : (
          <span className="text-xs text-muted/60">—</span>
        );
      },
    },
    {
      key: "stock",
      header: "Stok",
      align: "right",
      sortValue: (p) => Number(p.stock_qty),
      cell: (p) =>
        p.type === "service" || !p.track_stock ? (
          <span className="text-xs text-muted">{p.type === "service" ? "Hizmet" : "Takipsiz"}</span>
        ) : (
          <span className={cn("num font-semibold", isCritical(p) ? "text-danger" : "")}>
            {formatQty(p.stock_qty)} <span className="text-xs font-normal text-muted">{unitName(p.unit_id)}</span>
            {isCritical(p) && (
              <span className="block text-[10px] font-medium text-danger">Kritik seviye</span>
            )}
          </span>
        ),
    },
    {
      key: "buy_price",
      header: "Alış fiyatı",
      align: "right",
      hideBelow: "md",
      sortValue: (p) => Number(p.purchase_price),
      cell: (p) => {
        const buy = Number(p.purchase_price ?? 0);
        return buy > 0 ? (
          <span className="num font-medium text-muted">
            {formatMoney(buy, p.purchase_currency || p.sale_currency)}
            <span className="block text-[10px] text-muted/80">{p.purchase_price_includes_vat ? "KDV dahil" : "KDV hariç"}</span>
          </span>
        ) : (
          <span className="text-xs text-muted/60">—</span>
        );
      },
    },
    {
      key: "price",
      header: "Satış fiyatı",
      align: "right",
      sortValue: (p) => Number(p.sale_price),
      cell: (p) => {
        const buy = Number(p.purchase_price ?? 0);
        const sale = Number(p.sale_price ?? 0);
        const profitPct = buy > 0 && sale >= buy ? Math.round(((sale - buy) / buy) * 100) : null;
        return (
          <span className="num font-semibold text-text">
            {formatMoney(p.sale_price, p.sale_currency)}
            <span className="flex items-center justify-end gap-1 text-[10.5px] text-muted">
              {p.sale_price_includes_vat ? "KDV dahil" : "KDV hariç"}
              {profitPct !== null && profitPct > 0 && (
                <span className="inline-flex items-center rounded-sm bg-success-soft px-1 py-0.2 text-[10px] font-bold text-success">
                  +%{profitPct}
                </span>
              )}
            </span>
          </span>
        );
      },
    },
    {
      key: "vat",
      header: "KDV",
      align: "right",
      hideBelow: "md",
      sortValue: (p) => Number(p.vat_rate),
      cell: (p) => (
        <span className="rounded bg-surface-2 px-1.5 py-0.5 text-xs font-semibold text-muted">
          %{Number(p.vat_rate)}
        </span>
      ),
    },
  ];

  const exportRows = () =>
    exportExcel("urunler", [
      {
        name: "Ürünler",
        rows,
        columns: [
          { header: "Ürün adı", value: (p) => p.name, width: 40 },
          { header: "Stok kodu", value: (p) => p.code },
          { header: "Barkod", value: (p) => p.barcode },
          { header: "Kategori", value: (p) => catName(p.category_id) },
          { header: "Birim", value: (p) => unitName(p.unit_id) },
          { header: "KDV oranı", value: (p) => Number(p.vat_rate) },
          { header: "Satış fiyatı", value: (p) => Number(p.sale_price), type: "money" },
          { header: "Alış fiyatı", value: (p) => Number(p.purchase_price), type: "money" },
          ...(showCost ? [{ header: "Ort. maliyet", value: (p: Product) => Number(p.avg_cost), type: "money" as const }] : []),
          { header: "Stok miktarı", value: (p) => Number(p.stock_qty), type: "qty" },
          { header: "Kritik stok", value: (p) => (p.critical_stock === null ? "" : Number(p.critical_stock)) },
        ],
      },
    ]);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Ürün ve Hizmetler"
        description={`${all.length} kayıt`}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportRows}>
              <Download /> <span className="hidden sm:inline">Excel</span>
            </Button>
            {canWrite && (
              <>
                <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                  <Upload /> <span className="hidden sm:inline">İçe aktar</span>
                </Button>
                <Button asChild size="sm">
                  <Link href="/stok/urunler/yeni">
                    <Plus /> Yeni ürün
                  </Link>
                </Button>
              </>
            )}
          </>
        }
      />

      {/* Pusulam Stili Özet İstatistik Kartları */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Toplam Ürün"
          value={all.filter((p) => p.type === "product").length}
          unit="adet"
          sub={`${all.length} kayıt`}
        />
        <Stat
          label="Kritik Stok"
          value={criticalCount}
          unit="adet"
          tone={criticalCount > 0 ? "danger" : undefined}
          sub={criticalCount > 0 ? "Tükenmek üzere" : "Stoklar yeterli"}
        />
        {showCost && (
          <Stat
            label="Stok Değeri"
            value={totalStockValue}
            currency="TRY"
            sub="Maliyet üzerinden"
          />
        )}
        <Stat
          label="Hizmetler"
          value={all.filter((p) => p.type === "service").length}
          unit="adet"
          sub="Stoksuz hizmetler"
        />
      </div>
      <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="flex flex-1 gap-2">
          <SearchInput value={q} onChange={setQ} placeholder="Ad, stok kodu veya barkod…" className="flex-1 lg:max-w-sm" />
          <ScanButton onDetected={setQ} />
          <NativeSelect value={cat} onChange={(e) => setCat(e.target.value)} className="w-40">
            <option value="">Tüm kategoriler</option>
            {cats.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: "active", label: "Aktif" },
            { value: "critical", label: "Kritik stok", count: criticalCount },
            { value: "service", label: "Hizmetler" },
            { value: "passive", label: "Pasif" },
          ]}
        />
      </div>
      <DataTable
        rows={rows}
        loading={products.isPending}
        columns={columns}
        rowKey={(p) => p.id}
        initialSort={{ key: "name", dir: "asc" }}
        onRowClick={(p) => router.push(`/stok/urunler/detay?id=${p.id}`)}
        mobileRow={(p) => (
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 truncate font-medium">
                {isCritical(p) && <AlertTriangle className="size-3.5 shrink-0 text-danger" />}
                {p.name}
              </div>
              <div className="truncate text-xs text-muted">
                {p.type === "service" ? "Hizmet" : `${formatQty(p.stock_qty)} ${unitName(p.unit_id)}`}
                {p.barcode ? ` · ${p.barcode}` : ""}
              </div>
            </div>
            <span className="num text-sm font-semibold">{formatMoney(p.sale_price, p.sale_currency)}</span>
          </div>
        )}
        empty={<EmptyState icon={<Package />} title={q ? "Sonuç bulunamadı" : "Henüz ürün yok"} description={q ? undefined : "Yeni ürün ekleyin veya Excel'den içe aktarın."} />}
      />
      {!canWrite && <Badge className="mt-2">Salt okunur</Badge>}
      <ProductImport open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
