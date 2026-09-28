"use client";

import * as React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/money-input";
import { Segmented } from "@/components/ui/segmented";
import { newId, useRpc, useWarehouses } from "@/lib/data";
import { formatQty, isoDate } from "@/lib/format";
import { useOrg } from "@/providers/org-provider";

export function StockAdjustDialog({
  open,
  onOpenChange,
  productId,
  productName,
  stocks,
  unit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  productId: string;
  productName: string;
  stocks: Record<string, number>;
  unit: string;
}) {
  const { org } = useOrg();
  const warehouses = useWarehouses();
  const adjust = useRpc("adjust_stock");
  const [wh, setWh] = React.useState("");
  const [mode, setMode] = React.useState<"set" | "delta">("set");
  const [qty, setQty] = React.useState(0);
  const [date, setDate] = React.useState(isoDate());
  const [note, setNote] = React.useState("");
  const whId = wh || warehouses.data?.find((w) => w.is_default)?.id || warehouses.data?.[0]?.id || "";
  const current = stocks[whId] ?? 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await adjust.call(
      { p_org: org!.id, p_product: productId, p_warehouse: whId, p_quantity: qty, p_mode: mode, p_date: date, p_note: note || (mode === "set" ? "Stok sayımı" : "Stok düzeltme"), p_unit_cost: null, p_id: newId() },
      "Stok güncellendi",
    );
    onOpenChange(false);
    setQty(0);
    setNote("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Stok düzelt" description={productName}>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label="Depo">
            <NativeSelect value={whId} onChange={(e) => setWh(e.target.value)}>
              {warehouses.data?.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({formatQty(stocks[w.id] ?? 0)} {unit})
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: "set", label: "Sayım (yeni miktar)" },
              { value: "delta", label: "Giriş / çıkış (±)" },
            ]}
          />
          <Field label={mode === "set" ? `Sayılan miktar (${unit})` : `Fark (${unit}, çıkış için eksi)`}>
            <NumberInput value={qty} onChange={setQty} decimals={3} autoFocus />
          </Field>
          <p className="text-sm text-muted">
            Mevcut: <b>{formatQty(current)}</b> → Yeni: <b>{formatQty(mode === "set" ? qty : current + qty)}</b> {unit}
          </p>
          <Field label="Tarih">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Açıklama">
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Örn. fire, sayım farkı" />
          </Field>
          <Button type="submit" loading={adjust.isPending}>
            Kaydet
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
