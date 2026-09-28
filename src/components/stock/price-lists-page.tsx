"use client";

import * as React from "react";
import { Plus, Tags, Trash2, Save } from "lucide-react";
import { newId, usePriceLists, useProducts, useRows, useSave, useUpdate, type Row } from "@/lib/data";
import { formatMoney } from "@/lib/format";
import { CURRENCIES } from "@/lib/doc-types";
import { useOrg } from "@/providers/org-provider";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input, NativeSelect } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/money-input";
import { Switch } from "@/components/ui/switch";
import { SearchInput, matches } from "@/components/ui/search-input";
import { Badge } from "@/components/ui/badge";
import { useConfirm } from "@/components/ui/confirm";
import { cn } from "@/lib/utils";

export function PriceListsPage() {
  const { canWrite } = useOrg();
  const confirm = useConfirm();
  const lists = usePriceLists();
  const products = useProducts();
  const saveList = useSave("price_lists");
  const updList = useUpdate("price_lists");
  const saveItem = useSave("price_list_items");
  const [sel, setSel] = React.useState("");
  const [name, setName] = React.useState("");
  const [q, setQ] = React.useState("");
  const [draft, setDraft] = React.useState<Record<string, number>>({});
  const current = lists.data?.find((l) => l.id === sel) ?? lists.data?.[0];
  const items = useRows<Row<"price_list_items">>("price_list_items", {
    params: [current?.id],
    enabled: !!current,
    filter: (x) => x.eq("price_list_id", current!.id),
  });
  const priceOf = (pid: string) => items.data?.find((i) => i.product_id === pid);
  const changed = Object.entries(draft);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const r = await saveList.save<{ id: string }>({ name: name.trim(), currency: "TRY" }, "Fiyat listesi oluşturuldu");
    setName("");
    if (r.data?.id) setSel(r.data.id);
  };

  const saveAll = async () => {
    for (const [pid, price] of changed) {
      const existing = priceOf(pid);
      await saveItem.save({ id: existing?.id ?? newId(), price_list_id: current!.id, product_id: pid, price });
    }
    setDraft({});
  };

  const productRows = (products.data ?? []).filter((p) => p.is_active && matches(`${p.name} ${p.code ?? ""}`, q));

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Fiyat Listeleri" description="Bayi, toptan vb. farklı fiyatlar; cari kartında liste seçilince faturada otomatik gelir" />
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Card>
          <CardHeader icon={<Tags />} title="Listeler" />
          <ul className="divide-y divide-border">
            {lists.data?.map((l) => (
              <li key={l.id}>
                <button
                  onClick={() => {
                    setSel(l.id);
                    setDraft({});
                  }}
                  className={cn("flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-surface-2", current?.id === l.id && "bg-primary-soft font-semibold text-primary")}
                >
                  {l.name}
                  {l.is_default && <Badge tone="primary">Varsayılan</Badge>}
                </button>
              </li>
            ))}
          </ul>
          {canWrite && (
            <form onSubmit={add} className="flex gap-2 border-t border-border p-3">
              <Input placeholder="Yeni liste adı" value={name} onChange={(e) => setName(e.target.value)} />
              <Button type="submit" size="icon" aria-label="Ekle">
                <Plus />
              </Button>
            </form>
          )}
        </Card>

        {current && (
          <Card className="min-w-0">
            <div className="flex flex-wrap items-center gap-3 border-b border-border p-3 sm:p-4">
              <Input
                defaultValue={current.name}
                key={current.id}
                disabled={!canWrite}
                onBlur={(e) => e.target.value.trim() && e.target.value !== current.name && updList.update(current.id, { name: e.target.value.trim() })}
                className="h-9 w-48 font-semibold"
              />
              <NativeSelect value={current.currency} disabled={!canWrite} onChange={(e) => updList.update(current.id, { currency: e.target.value })} className="h-9 w-24">
                {CURRENCIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </NativeSelect>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={current.includes_vat} disabled={!canWrite} onCheckedChange={(v) => updList.update(current.id, { includes_vat: v })} />
                KDV dahil
              </label>
              <div className="ml-auto flex gap-2">
                {canWrite && (
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Listeyi sil"
                    onClick={async () => {
                      if (await confirm({ title: `${current.name} silinsin mi?`, danger: true, confirmText: "Sil" })) {
                        await updList.remove(current.id);
                        setSel("");
                      }
                    }}
                  >
                    <Trash2 />
                  </Button>
                )}
                {canWrite && (
                  <Button size="sm" onClick={saveAll} disabled={!changed.length} loading={saveItem.isPending}>
                    <Save /> Kaydet ({changed.length})
                  </Button>
                )}
              </div>
            </div>
            <div className="p-3">
              <SearchInput value={q} onChange={setQ} placeholder="Ürün ara…" />
            </div>
            <div className="divide-y divide-border">
              {productRows.map((p) => {
                const it = priceOf(p.id);
                const val = draft[p.id] ?? (it ? Number(it.price) : null);
                return (
                  <div key={p.id} className="grid grid-cols-[1fr_140px] items-center gap-3 px-4 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm">{p.name}</div>
                      <div className="text-xs text-muted">Varsayılan: {formatMoney(p.sale_price, p.sale_currency)}</div>
                    </div>
                    <NumberInput value={val} placeholder="—" disabled={!canWrite} decimals={4} onChange={(n) => setDraft((d) => ({ ...d, [p.id]: n }))} />
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
