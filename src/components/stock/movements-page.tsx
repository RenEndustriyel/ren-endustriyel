"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Download, History } from "lucide-react";
import { useProducts, useRows, useWarehouses, type Row } from "@/lib/data";
import { formatDate, formatQty, isoDate } from "@/lib/format";
import { exportExcel } from "@/lib/excel";
import { DOC_TYPES, MOVEMENT_LABELS, type DocType } from "@/lib/doc-types";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ProductPicker } from "./product-picker";
import { cn } from "@/lib/utils";

type Movement = Row<"stock_movements"> & { document: { doc_type: string; number: string | null } | null };

export function MovementsPage() {
  const router = useRouter();
  const products = useProducts();
  const warehouses = useWarehouses();
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  const [from, setFrom] = React.useState(isoDate(d));
  const [to, setTo] = React.useState(isoDate());
  const [product, setProduct] = React.useState<string | null>(null);
  const [type, setType] = React.useState("");
  const moves = useRows<Movement>("stock_movements", {
    select: "*, document:documents(doc_type, number)",
    params: [from, to, product, type],
    filter: (q) => {
      let x = q.gte("movement_date", from).lte("movement_date", to);
      if (product) x = x.eq("product_id", product);
      if (type) x = x.eq("movement_type", type);
      return x;
    },
    order: [{ column: "movement_date", ascending: false }, { column: "created_at", ascending: false }],
  });
  const pName = (id: string) => products.data?.find((p) => p.id === id)?.name ?? "—";
  const whName = (id: string) => warehouses.data?.find((w) => w.id === id)?.name ?? "—";

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Stok Geçmişi"
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              exportExcel("stok-hareketleri", [
                {
                  name: "Hareketler",
                  rows: moves.data ?? [],
                  columns: [
                    { header: "Tarih", value: (m) => m.movement_date, type: "date" },
                    { header: "Ürün", value: (m) => pName(m.product_id), width: 36 },
                    { header: "Depo", value: (m) => whName(m.warehouse_id) },
                    { header: "Hareket", value: (m) => MOVEMENT_LABELS[m.movement_type] },
                    { header: "Belge", value: (m) => m.document?.number ?? m.description },
                    { header: "Miktar", value: (m) => Number(m.quantity), type: "qty" },
                    { header: "Birim maliyet", value: (m) => (m.unit_cost === null ? "" : Number(m.unit_cost)), type: "money" },
                  ],
                },
              ])
            }
          >
            <Download /> Excel
          </Button>
        }
      />
      <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Başlangıç" />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Bitiş" />
        <ProductPicker value={product} onChange={setProduct} onlyStock showPrice={false} placeholder="Tüm ürünler" />
        <NativeSelect value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">Tüm hareketler</option>
          {Object.entries(MOVEMENT_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </NativeSelect>
      </div>
      <DataTable
        rows={moves.data}
        loading={moves.isPending}
        rowKey={(m) => m.id}
        onRowClick={(m) => (m.document && m.document_id ? router.push(`${DOC_TYPES[m.document.doc_type as DocType].base}/detay?id=${m.document_id}`) : router.push(`/stok/urunler/detay?id=${m.product_id}`))}
        columns={[
          { key: "date", header: "Tarih", cell: (m) => formatDate(m.movement_date) },
          { key: "p", header: "Ürün", cell: (m) => <span className="font-medium">{pName(m.product_id)}</span> },
          { key: "t", header: "Hareket", cell: (m) => <div><div>{MOVEMENT_LABELS[m.movement_type]}</div><div className="text-xs text-muted">{m.document?.number ?? m.description}</div></div> },
          { key: "w", header: "Depo", hideBelow: "md", cell: (m) => <span className="text-muted">{whName(m.warehouse_id)}</span> },
          {
            key: "q",
            header: "Miktar",
            align: "right",
            cell: (m) => (
              <span className={cn("num font-semibold", Number(m.quantity) >= 0 ? "text-success" : "text-danger")}>
                {Number(m.quantity) > 0 ? "+" : ""}
                {formatQty(m.quantity)}
              </span>
            ),
          },
        ]}
        mobileRow={(m) => (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate font-medium">{pName(m.product_id)}</div>
              <div className="text-xs text-muted">{formatDate(m.movement_date)} · {MOVEMENT_LABELS[m.movement_type]}</div>
            </div>
            <span className={cn("num font-semibold", Number(m.quantity) >= 0 ? "text-success" : "text-danger")}>{formatQty(m.quantity)}</span>
          </div>
        )}
        empty={<EmptyState icon={<History />} title="Bu aralıkta hareket yok" />}
      />
    </div>
  );
}
