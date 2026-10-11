"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import { useCategories, useProducts, useUnits } from "@/lib/data";
import { formatMoney, formatQty } from "@/lib/format";
import { exportExcel } from "@/lib/excel";
import { rateFor, useRates } from "@/lib/rates";
import { convertVat } from "@/lib/doc-calc";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { DataTable } from "@/components/ui/data-table";
import { Stat } from "@/components/ui/stat";
import { Card, CardHeader } from "@/components/ui/card";
import { isCritical } from "@/components/products/products-list";
import { cn } from "@/lib/utils";

export function StockReport() {
  const router = useRouter();
  const products = useProducts();
  const units = useUnits();
  const cats = useCategories("product");
  const rates = useRates();
  const [filter, setFilter] = React.useState<"all" | "critical" | "negative">("all");
  const rows = (products.data ?? [])
    .filter((p) => p.type === "product" && p.track_stock && p.is_active)
    .map((p) => {
      const qty = Number(p.stock_qty);
      const salePrice = convertVat(Number(p.sale_price) * (p.sale_currency === "TRY" ? 1 : rateFor(rates.data, p.sale_currency) || 1), Number(p.vat_rate), p.sale_price_includes_vat, false);
      return { ...p, qty, cost_value: Math.max(qty, 0) * Number(p.avg_cost), sale_value: Math.max(qty, 0) * salePrice, cat: cats.data?.find((c) => c.id === p.category_id)?.name ?? "Kategorisiz" };
    })
    .filter((p) => (filter === "critical" ? isCritical(p) : filter === "negative" ? p.qty < 0 : true));
  const costValue = rows.reduce((s, r) => s + r.cost_value, 0);
  const saleValue = rows.reduce((s, r) => s + r.sale_value, 0);
  const byCat = Object.entries(
    rows.reduce<Record<string, number>>((acc, r) => {
      acc[r.cat] = (acc[r.cat] ?? 0) + r.cost_value;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...byCat.map(([, v]) => v), 1);
  const unit = (id: string | null) => units.data?.find((u) => u.id === id)?.name ?? "";

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Stok Raporu"
        description="Güncel stok miktarı ve değeri"
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              exportExcel("stok-raporu", [
                {
                  name: "Stok",
                  rows,
                  columns: [
                    { header: "Ürün", value: (r) => r.name, width: 40 },
                    { header: "Kod", value: (r) => r.code },
                    { header: "Kategori", value: (r) => r.cat },
                    { header: "Miktar", value: (r) => r.qty, type: "qty" },
                    { header: "Birim", value: (r) => unit(r.unit_id) },
                    { header: "Ort. maliyet", value: (r) => Number(r.avg_cost), type: "money" },
                    { header: "Maliyet değeri", value: (r) => r.cost_value, type: "money" },
                    { header: "Satış değeri (KDV hariç)", value: (r) => r.sale_value, type: "money" },
                  ],
                },
              ])
            }
          >
            <Download /> Excel
          </Button>
        }
      />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Ürün çeşidi" value={<span>{rows.length}</span>} />
        <Stat label="Maliyet değeri" value={costValue} tone="primary" />
        <Stat label="Satış değeri (KDV hariç)" value={saleValue} />
        <Stat label="Potansiyel brüt kâr" value={saleValue - costValue} tone="success" />
      </div>
      {byCat.length > 1 && (
        <Card className="mb-4">
          <CardHeader title="Kategoriye göre stok değeri" />
          <ul className="flex flex-col gap-2.5 p-4">
            {byCat.map(([name, v]) => (
              <li key={name} className="grid grid-cols-[140px_1fr_110px] items-center gap-3 text-sm">
                <span className="truncate">{name}</span>
                <span className="h-2.5 overflow-hidden rounded-full bg-surface-2">
                  <span className="block h-full rounded-full bg-chart-in" style={{ width: `${(v / max) * 100}%` }} />
                </span>
                <span className="num text-right font-medium">{formatMoney(v)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <Segmented value={filter} onChange={setFilter} className="mb-3" options={[{ value: "all", label: "Tümü" }, { value: "critical", label: "Kritik" }, { value: "negative", label: "Eksi stok" }]} />
      <DataTable
        rows={rows}
        loading={products.isPending}
        rowKey={(r) => r.id}
        initialSort={{ key: "val", dir: "desc" }}
        onRowClick={(r) => router.push(`/stok/urunler/detay?id=${r.id}`)}
        columns={[
          { key: "n", header: "Ürün", sortValue: (r) => r.name, cell: (r) => <div><div className="font-medium">{r.name}</div><div className="text-xs text-muted">{r.cat}</div></div> },
          { key: "q", header: "Miktar", align: "right", sortValue: (r) => r.qty, cell: (r) => <span className={cn("num font-semibold", (isCritical(r) || r.qty < 0) && "text-danger")}>{formatQty(r.qty)} <span className="text-xs font-normal text-muted">{unit(r.unit_id)}</span></span> },
          { key: "c", header: "Ort. maliyet", align: "right", hideBelow: "md", sortValue: (r) => Number(r.avg_cost), cell: (r) => <span className="num text-muted">{formatMoney(r.avg_cost)}</span> },
          { key: "val", header: "Maliyet değeri", align: "right", sortValue: (r) => r.cost_value, cell: (r) => <span className="num">{formatMoney(r.cost_value)}</span> },
          { key: "sv", header: "Satış değeri", align: "right", hideBelow: "lg", sortValue: (r) => r.sale_value, cell: (r) => <span className="num text-muted">{formatMoney(r.sale_value)}</span> },
        ]}
      />
    </div>
  );
}
