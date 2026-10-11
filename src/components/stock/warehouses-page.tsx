"use client";

import * as React from "react";
import { Warehouse } from "lucide-react";
import { useProducts, useRows, useUnits, useWarehouses, type Row } from "@/lib/data";
import { formatMoney, formatQty } from "@/lib/format";
import { useOrg } from "@/providers/org-provider";
import { PageHeader } from "@/components/ui/page-header";
import { Segmented } from "@/components/ui/segmented";
import { SearchInput, matches } from "@/components/ui/search-input";
import { DataTable } from "@/components/ui/data-table";
import { Stat } from "@/components/ui/stat";
import { WarehousesSettings } from "@/components/settings/simple-lists";
import { cn } from "@/lib/utils";

export function WarehousesPage() {
  const { role } = useOrg();
  const warehouses = useWarehouses();
  const products = useProducts();
  const units = useUnits();
  const stocks = useRows<Row<"product_stocks">>("product_stocks", { softDelete: false });
  const [wh, setWh] = React.useState<string>("");
  const [q, setQ] = React.useState("");
  const current = wh || warehouses.data?.[0]?.id || "";
  const showCost = role !== "staff";

  const rows = (stocks.data ?? [])
    .filter((s) => s.warehouse_id === current && Number(s.quantity) !== 0)
    .map((s) => ({ ...s, product: products.data?.find((p) => p.id === s.product_id) }))
    .filter((r) => r.product && matches(`${r.product.name} ${r.product.code ?? ""} ${r.product.barcode ?? ""}`, q));

  const value = rows.reduce((sum, r) => sum + Math.max(Number(r.quantity), 0) * Number(r.product?.avg_cost ?? 0), 0);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Depolar" description="Depo bazında stok durumu" />
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <Segmented value={current} onChange={setWh} options={(warehouses.data ?? []).map((w) => ({ value: w.id, label: w.name }))} />
            <SearchInput value={q} onChange={setQ} placeholder="Ürün ara…" className="sm:ml-auto sm:w-64" />
          </div>
          <div className="mb-3 grid grid-cols-2 gap-3">
            <Stat label="Ürün çeşidi" value={<span>{rows.length}</span>} />
            {showCost && <Stat label="Stok değeri (maliyet)" value={value} />}
          </div>
          <DataTable
            rows={rows}
            loading={stocks.isPending}
            rowKey={(r) => r.product_id}
            initialSort={{ key: "name", dir: "asc" }}
            columns={[
              { key: "name", header: "Ürün", sortValue: (r) => r.product?.name, cell: (r) => <span className="font-medium">{r.product?.name}</span> },
              {
                key: "qty",
                header: "Miktar",
                align: "right",
                sortValue: (r) => Number(r.quantity),
                cell: (r) => (
                  <span className={cn("num font-semibold", Number(r.quantity) < 0 && "text-danger")}>
                    {formatQty(r.quantity)} <span className="text-xs font-normal text-muted">{units.data?.find((u) => u.id === r.product?.unit_id)?.name}</span>
                  </span>
                ),
              },
              ...(showCost
                ? [{ key: "val", header: "Değer", align: "right" as const, hideBelow: "md" as const, cell: (r: (typeof rows)[number]) => <span className="num text-muted">{formatMoney(Number(r.quantity) * Number(r.product?.avg_cost ?? 0))}</span> }]
                : []),
            ]}
            empty={<div className="p-8 text-center text-sm text-muted"><Warehouse className="mx-auto mb-2 size-6" />Bu depoda stok yok.</div>}
          />
        </div>
        <div>
          <WarehousesSettings />
        </div>
      </div>
    </div>
  );
}
