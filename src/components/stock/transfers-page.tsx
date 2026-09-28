"use client";

import * as React from "react";
import { ArrowLeftRight, Plus, Trash2, ArrowRight } from "lucide-react";
import { newId, useRows, useRpc, useWarehouses, useProducts, useUnits, type Row } from "@/lib/data";
import { formatDate, formatQty, isoDate } from "@/lib/format";
import { useOrg } from "@/providers/org-provider";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input, NativeSelect } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/money-input";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { useConfirm } from "@/components/ui/confirm";
import { ProductPicker } from "./product-picker";

type Transfer = Row<"stock_transfers"> & { movements: { product_id: string; quantity: number; movement_type: string }[] };

export function TransfersPage() {
  const { org, canWrite } = useOrg();
  const confirm = useConfirm();
  const warehouses = useWarehouses();
  const products = useProducts();
  const units = useUnits();
  const transfers = useRows<Transfer>("stock_transfers", {
    select: "*, movements:stock_movements(product_id, quantity, movement_type)",
    order: [{ column: "transfer_date", ascending: false }, { column: "created_at", ascending: false }],
  });
  const save = useRpc("save_stock_transfer");
  const del = useRpc("delete_stock_transfer");
  const [open, setOpen] = React.useState(false);
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [date, setDate] = React.useState(isoDate());
  const [desc, setDesc] = React.useState("");
  const [lines, setLines] = React.useState<{ key: string; product_id: string | null; quantity: number }[]>([{ key: newId(), product_id: null, quantity: 1 }]);
  const whName = (id: string) => warehouses.data?.find((w) => w.id === id)?.name ?? "—";
  const pName = (id: string) => products.data?.find((p) => p.id === id)?.name ?? "—";

  const openNew = () => {
    setFrom(warehouses.data?.[0]?.id ?? "");
    setTo(warehouses.data?.[1]?.id ?? "");
    setDate(isoDate());
    setDesc("");
    setLines([{ key: newId(), product_id: null, quantity: 1 }]);
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!from || !to || from === to) return;
    const valid = lines.filter((l) => l.product_id && l.quantity > 0);
    if (!valid.length) return;
    await save.call(
      {
        p_transfer: { id: newId(), org_id: org!.id, from_warehouse_id: from, to_warehouse_id: to, transfer_date: date, description: desc || null },
        p_lines: valid.map((l) => ({ product_id: l.product_id, quantity: l.quantity })),
      },
      "Transfer kaydedildi",
    );
    setOpen(false);
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Depolar Arası Transfer"
        actions={
          canWrite && (
            <Button size="sm" onClick={openNew} disabled={(warehouses.data?.length ?? 0) < 2}>
              <Plus /> Yeni transfer
            </Button>
          )
        }
      />
      {(warehouses.data?.length ?? 0) < 2 && <p className="mb-3 text-sm text-muted">Transfer için en az iki depo gerekir. Depolar sayfasından yeni depo ekleyin.</p>}
      <DataTable
        rows={transfers.data}
        loading={transfers.isPending}
        rowKey={(t) => t.id}
        columns={[
          { key: "date", header: "Tarih", cell: (t) => formatDate(t.transfer_date) },
          { key: "no", header: "No", cell: (t) => <span className="font-medium">{t.number}</span> },
          {
            key: "route",
            header: "Güzergâh",
            cell: (t) => (
              <span className="flex items-center gap-1.5">
                {whName(t.from_warehouse_id)} <ArrowRight className="size-3.5 text-muted" /> {whName(t.to_warehouse_id)}
              </span>
            ),
          },
          {
            key: "items",
            header: "Ürünler",
            hideBelow: "md",
            cell: (t) => (
              <span className="text-xs text-muted">
                {t.movements
                  .filter((m) => m.movement_type === "transfer_in")
                  .map((m) => `${pName(m.product_id)} (${formatQty(m.quantity)})`)
                  .join(", ")}
              </span>
            ),
          },
          {
            key: "del",
            header: "",
            align: "right",
            cell: (t) =>
              canWrite && (
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Sil"
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (await confirm({ title: `${t.number} silinsin mi?`, danger: true, confirmText: "Sil" })) del.call({ p_id: t.id }, "Transfer silindi");
                  }}
                >
                  <Trash2 />
                </Button>
              ),
          },
        ]}
        empty={<EmptyState icon={<ArrowLeftRight />} title="Transfer yok" />}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="Yeni transfer" className="sm:max-w-xl">
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
              <Field label="Çıkış deposu">
                <NativeSelect value={from} onChange={(e) => setFrom(e.target.value)}>
                  {warehouses.data?.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <ArrowRight className="mb-3 size-4 text-muted" />
              <Field label="Giriş deposu">
                <NativeSelect value={to} onChange={(e) => setTo(e.target.value)}>
                  {warehouses.data?.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </div>
            {from === to && <p className="text-xs text-danger">Çıkış ve giriş deposu farklı olmalı.</p>}
            <div className="grid grid-cols-2 gap-2">
              <Field label="Tarih">
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
              <Field label="Açıklama">
                <Input value={desc} onChange={(e) => setDesc(e.target.value)} />
              </Field>
            </div>
            <div className="flex flex-col gap-2">
              {lines.map((l, i) => {
                const p = products.data?.find((x) => x.id === l.product_id);
                return (
                  <div key={l.key} className="grid grid-cols-[1fr_110px_auto] gap-2">
                    <ProductPicker onlyStock showPrice={false} value={l.product_id} onChange={(v) => setLines(lines.map((x, j) => (j === i ? { ...x, product_id: v } : x)))} />
                    <NumberInput value={l.quantity} decimals={3} suffix={units.data?.find((u) => u.id === p?.unit_id)?.code.slice(0, 4)} onChange={(n) => setLines(lines.map((x, j) => (j === i ? { ...x, quantity: n } : x)))} />
                    <Button type="button" variant="ghost" size="icon" onClick={() => setLines(lines.filter((_, j) => j !== i))} aria-label="Kaldır">
                      <Trash2 />
                    </Button>
                  </div>
                );
              })}
              <Button type="button" variant="ghost" size="sm" className="self-start" onClick={() => setLines([...lines, { key: newId(), product_id: null, quantity: 1 }])}>
                <Plus /> Satır ekle
              </Button>
            </div>
            <Button type="submit" loading={save.isPending} disabled={from === to}>
              Transferi kaydet
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
