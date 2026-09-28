"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, SlidersHorizontal, Warehouse } from "lucide-react";
import { useRow, useRows, useUnits, useUpdate, useWarehouses, useCategories, type Row } from "@/lib/data";
import { formatDate, formatMoney, formatQty } from "@/lib/format";
import { DOC_TYPES, MOVEMENT_LABELS, type DocType } from "@/lib/doc-types";
import { useOrg } from "@/providers/org-provider";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Stat } from "@/components/ui/stat";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useConfirm } from "@/components/ui/confirm";
import { cn } from "@/lib/utils";
import { ProductForm } from "./product-form";
import { StockAdjustDialog } from "./stock-adjust-dialog";
import { isCritical } from "./products-list";

type Movement = Row<"stock_movements"> & { document: { doc_type: string; number: string | null } | null };

export function ProductDetail({ id }: { id: string }) {
  const router = useRouter();
  const confirm = useConfirm();
  const { canWrite, role } = useOrg();
  const product = useRow<Row<"products">>("products", id);
  const units = useUnits();
  const cats = useCategories("product");
  const warehouses = useWarehouses();
  const { remove, update } = useUpdate("products");
  const stocks = useRows<Row<"product_stocks">>("product_stocks", { softDelete: false, params: ["p", id], filter: (q) => q.eq("product_id", id) });
  const moves = useRows<Movement>("stock_movements", {
    select: "*, document:documents(doc_type, number)",
    params: ["p", id],
    filter: (q) => q.eq("product_id", id),
    order: [{ column: "movement_date", ascending: false }, { column: "created_at", ascending: false }],
    limit: 500,
  });
  const altUnits = useRows<Row<"product_units">>("product_units", { params: ["p", id], filter: (q) => q.eq("product_id", id) });
  const [editOpen, setEditOpen] = React.useState(false);
  const [adjustOpen, setAdjustOpen] = React.useState(false);

  const p = product.data;
  if (product.isPending && !p) return <Skeleton className="h-64 rounded-card" />;
  if (!p) return <EmptyState title="Ürün bulunamadı" />;

  const unit = units.data?.find((u) => u.id === p.unit_id)?.name ?? "";
  const whName = (wid: string) => warehouses.data?.find((w) => w.id === wid)?.name ?? "—";
  const stockMap = Object.fromEntries((stocks.data ?? []).map((s) => [s.warehouse_id, Number(s.quantity)]));
  const showCost = role !== "staff";
  const isProduct = p.type === "product" && p.track_stock;

  const del = async () => {
    if (!(await confirm({ title: `${p.name} silinsin mi?`, description: "Ürün listeden kaldırılır; geçmiş belgeler korunur.", danger: true, confirmText: "Sil" }))) return;
    await remove(p.id, "Ürün silindi");
    router.replace("/stok/urunler");
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        back="/stok/urunler"
        title={p.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone="primary">{p.type === "service" ? "Hizmet" : "Ürün"}</Badge>
            {!p.is_active && <Badge tone="warning">Pasif</Badge>}
            {isCritical(p) && <Badge tone="danger">Kritik stok</Badge>}
            {[p.code, p.barcode, cats.data?.find((c) => c.id === p.category_id)?.name].filter(Boolean).join(" · ")}
          </span>
        }
        actions={
          canWrite && (
            <>
              {isProduct && (
                <Button variant="outline" size="sm" onClick={() => setAdjustOpen(true)}>
                  <SlidersHorizontal /> Stok düzelt
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil /> Düzenle
              </Button>
              <Button variant="ghost" size="sm" onClick={() => update(p.id, { is_active: !p.is_active }, p.is_active ? "Pasife alındı" : "Aktifleştirildi")}>
                {p.is_active ? "Pasife al" : "Aktifleştir"}
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={del} aria-label="Sil">
                <Trash2 />
              </Button>
            </>
          )
        }
      />

      <div className={cn("mb-4 grid grid-cols-2 gap-3", Number(p.purchase_price) > 0 ? "lg:grid-cols-5" : "lg:grid-cols-4")}>
        {isProduct && <Stat label="Stok" value={<span>{formatQty(p.stock_qty)} <span className="text-sm font-normal text-muted">{unit}</span></span>} tone={isCritical(p) ? "danger" : undefined} sub={p.critical_stock !== null ? `Kritik seviye: ${formatQty(p.critical_stock)}` : undefined} />}
        {Number(p.purchase_price) > 0 && (
          <Stat
            label="Alış fiyatı"
            value={Number(p.purchase_price)}
            currency={p.purchase_currency || p.sale_currency}
            sub={p.purchase_price_includes_vat ? "KDV dahil" : "KDV hariç"}
          />
        )}
        <Stat
          label="Satış fiyatı"
          value={Number(p.sale_price)}
          currency={p.sale_currency}
          sub={
            Number(p.purchase_price) > 0 && Number(p.sale_price) >= Number(p.purchase_price) ? (
              <span className="flex items-center gap-1 font-medium text-success">
                %{Math.round(((Number(p.sale_price) - Number(p.purchase_price)) / Number(p.purchase_price)) * 1000) / 10} kâr (+{formatMoney(Number(p.sale_price) - Number(p.purchase_price), p.sale_currency)})
              </span>
            ) : p.sale_price_includes_vat ? (
              "KDV dahil"
            ) : (
              `KDV hariç · %${Number(p.vat_rate)}`
            )
          }
        />
        {showCost && <Stat label="Ortalama maliyet" value={Number(p.avg_cost)} sub="KDV hariç" />}
        {showCost && isProduct && <Stat label="Stok değeri" value={Math.max(Number(p.stock_qty), 0) * Number(p.avg_cost)} />}
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          {isProduct && (
            <Card>
              <CardHeader icon={<Warehouse />} title="Depolardaki stok" />
              <ul className="divide-y divide-border">
                {(warehouses.data ?? []).map((w) => (
                  <li key={w.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span>{w.name}</span>
                    <span className={cn("num font-semibold", (stockMap[w.id] ?? 0) < 0 && "text-danger")}>
                      {formatQty(stockMap[w.id] ?? 0)} {unit}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {!!altUnits.data?.length && (
            <Card>
              <CardHeader title="Alternatif birimler" />
              <ul className="divide-y divide-border text-sm">
                {altUnits.data.map((u) => (
                  <li key={u.id} className="flex items-center justify-between px-4 py-2.5">
                    <span>
                      1 {units.data?.find((x) => x.id === u.unit_id)?.name} = {formatQty(u.factor)} {unit}
                    </span>
                    <span className="text-xs text-muted">{u.barcode}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {p.notes && (
            <Card className="p-4 text-sm">
              <div className="mb-1 text-xs text-muted">Not</div>
              {p.notes}
            </Card>
          )}
        </div>

        {isProduct && (
          <div>
            <h3 className="mb-2 text-sm font-semibold">Stok hareketleri</h3>
            <DataTable
              rows={moves.data}
              loading={moves.isPending}
              rowKey={(m) => m.id}
              onRowClick={(m) => m.document_id && m.document && router.push(`${DOC_TYPES[m.document.doc_type as DocType].base}/detay?id=${m.document_id}`)}
              columns={[
                { key: "date", header: "Tarih", cell: (m) => formatDate(m.movement_date) },
                {
                  key: "type",
                  header: "Hareket",
                  cell: (m) => (
                    <div>
                      <div className="font-medium">{MOVEMENT_LABELS[m.movement_type]}</div>
                      <div className="text-xs text-muted">{m.document?.number ?? m.description}</div>
                    </div>
                  ),
                },
                { key: "wh", header: "Depo", hideBelow: "md", cell: (m) => <span className="text-muted">{whName(m.warehouse_id)}</span> },
                ...(showCost ? [{ key: "cost", header: "Birim maliyet", align: "right" as const, hideBelow: "lg" as const, cell: (m: Movement) => <span className="num text-muted">{m.unit_cost !== null ? formatMoney(m.unit_cost) : ""}</span> }] : []),
                {
                  key: "qty",
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
                    <div className="truncate font-medium">{MOVEMENT_LABELS[m.movement_type]} {m.document?.number ? `· ${m.document.number}` : ""}</div>
                    <div className="text-xs text-muted">{formatDate(m.movement_date)} · {whName(m.warehouse_id)}</div>
                  </div>
                  <span className={cn("num font-semibold", Number(m.quantity) >= 0 ? "text-success" : "text-danger")}>
                    {Number(m.quantity) > 0 ? "+" : ""}
                    {formatQty(m.quantity)}
                  </span>
                </div>
              )}
              empty={<EmptyState title="Hareket yok" />}
            />
          </div>
        )}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent title="Ürünü düzenle" className="sm:max-w-3xl">
          {editOpen && <ProductForm product={p} onSaved={() => setEditOpen(false)} onCancel={() => setEditOpen(false)} />}
        </DialogContent>
      </Dialog>
      {isProduct && <StockAdjustDialog open={adjustOpen} onOpenChange={setAdjustOpen} productId={p.id} productName={p.name} stocks={stockMap} unit={unit} />}
    </div>
  );
}
