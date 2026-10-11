"use client";

import * as React from "react";
import { ClipboardCheck, Save } from "lucide-react";
import { newId, useProducts, useRows, useRpc, useUnits, useWarehouses, type Row } from "@/lib/data";
import { formatQty, isoDate } from "@/lib/format";
import { useOrg } from "@/providers/org-provider";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, NativeSelect } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/money-input";
import { SearchInput, matches } from "@/components/ui/search-input";
import { ScanButton } from "@/components/shared/barcode-scanner";
import { useConfirm } from "@/components/ui/confirm";
import { cn } from "@/lib/utils";

/** Toplu stok sayımı: sayılan miktarları girin, farklar tek seferde işlenir */
export function CountPage() {
  const { org, canWrite } = useOrg();
  const confirm = useConfirm();
  const warehouses = useWarehouses();
  const products = useProducts();
  const units = useUnits();
  const stocks = useRows<Row<"product_stocks">>("product_stocks", { softDelete: false });
  const adjust = useRpc("adjust_stock");
  const [wh, setWh] = React.useState("");
  const [date, setDate] = React.useState(isoDate());
  const [q, setQ] = React.useState("");
  const [counts, setCounts] = React.useState<Record<string, number>>({});
  const [busy, setBusy] = React.useState(false);
  const current = wh || warehouses.data?.find((w) => w.is_default)?.id || warehouses.data?.[0]?.id || "";

  const qtyIn = (pid: string) => Number(stocks.data?.find((s) => s.product_id === pid && s.warehouse_id === current)?.quantity ?? 0);
  const list = (products.data ?? []).filter((p) => p.is_active && p.type === "product" && p.track_stock && matches(`${p.name} ${p.code ?? ""} ${p.barcode ?? ""}`, q));
  const changed = Object.entries(counts).filter(([pid, v]) => v !== qtyIn(pid));

  const save = async () => {
    if (!changed.length) return;
    if (!(await confirm({ title: `${changed.length} üründe sayım farkı işlensin mi?`, description: "Sayılan miktarlar stok olarak kaydedilir.", confirmText: "İşle" }))) return;
    setBusy(true);
    for (const [pid, v] of changed) {
      await adjust.call({ p_org: org!.id, p_product: pid, p_warehouse: current, p_quantity: v, p_mode: "set", p_date: date, p_note: "Stok sayımı", p_unit_cost: null, p_id: newId() });
    }
    setBusy(false);
    setCounts({});
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Stok Sayımı"
        description="Sayılan miktarları girin; farklar sayım hareketi olarak işlenir"
        actions={
          canWrite && (
            <Button size="sm" onClick={save} loading={busy} disabled={!changed.length}>
              <Save /> Farkları işle ({changed.length})
            </Button>
          )
        }
      />
      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <NativeSelect value={current} onChange={(e) => { setWh(e.target.value); setCounts({}); }} className="sm:w-48">
          {warehouses.data?.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </NativeSelect>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="sm:w-44" />
        <div className="flex flex-1 gap-2">
          <SearchInput value={q} onChange={setQ} placeholder="Ürün ara / barkod okut" className="flex-1" />
          <ScanButton onDetected={setQ} />
        </div>
      </div>
      <Card className="divide-y divide-border">
        {list.length === 0 && (
          <div className="p-8 text-center text-sm text-muted">
            <ClipboardCheck className="mx-auto mb-2 size-6" />
            Stok takibi yapılan ürün yok.
          </div>
        )}
        {list.map((p) => {
          const sys = qtyIn(p.id);
          const counted = counts[p.id];
          const diff = counted === undefined ? 0 : counted - sys;
          return (
            <div key={p.id} className="grid grid-cols-[1fr_120px] items-center gap-3 px-4 py-2.5 sm:grid-cols-[1fr_100px_140px_90px]">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{p.name}</div>
                <div className="text-xs text-muted sm:hidden">Sistem: {formatQty(sys)}</div>
              </div>
              <div className="num hidden text-right text-sm text-muted sm:block">{formatQty(sys)}</div>
              <NumberInput
                value={counted ?? null}
                placeholder={formatQty(sys)}
                decimals={3}
                suffix={units.data?.find((u) => u.id === p.unit_id)?.code.slice(0, 4)}
                disabled={!canWrite}
                onChange={(n) => setCounts((c) => ({ ...c, [p.id]: n }))}
              />
              <div className={cn("num hidden text-right text-sm font-semibold sm:block", diff > 0 ? "text-success" : diff < 0 ? "text-danger" : "text-muted")}>
                {counted === undefined ? "" : `${diff > 0 ? "+" : ""}${formatQty(diff)}`}
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
