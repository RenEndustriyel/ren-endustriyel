"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase, type Tables } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/errors";
import { useOrg } from "@/providers/org-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const DOC_TYPE_LABELS: Record<string, string> = {
  sales_invoice: "Satış faturası",
  quote: "Teklif",
  sales_order: "Satış siparişi",
  sales_delivery: "Giden irsaliye",
  sales_return: "Satış iadesi",
  pos_sale: "Hızlı satış",
  purchase_order: "Satın alma siparişi",
  purchase_return: "Alış iadesi",
  stock_transfer: "Depo transferi",
};

type Row = Tables<"number_series">;

function preview(r: Pick<Row, "prefix" | "include_year" | "padding" | "next_number">) {
  return `${r.prefix}${r.include_year ? new Date().getFullYear() : ""}${String(r.next_number).padStart(r.padding, "0")}`;
}

function SeriesRow({ row, disabled }: { row: Row; disabled: boolean }) {
  const qc = useQueryClient();
  const [draft, setDraft] = React.useState(row);
  const [saving, setSaving] = React.useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(row);

  const save = async () => {
    const prefix = draft.prefix.trim().toUpperCase();
    if (!/^[A-Z0-9-]{1,10}$/.test(prefix)) return toast.error("Önek 1-10 harf/rakam olmalı");
    setSaving(true);
    const { error } = await supabase
      .from("number_series")
      .update({ prefix, include_year: draft.include_year, padding: draft.padding, next_number: draft.next_number })
      .eq("id", row.id);
    setSaving(false);
    if (error) return toast.error(errorMessage(error));
    toast.success("Numara serisi güncellendi");
    qc.invalidateQueries({ queryKey: ["number_series"] });
  };

  return (
    <div className="grid grid-cols-2 items-end gap-3 border-b border-border px-4 py-4 last:border-0 sm:px-5 md:grid-cols-[1.4fr_1fr_0.7fr_0.8fr_0.9fr_auto]">
      <div className="col-span-2 md:col-span-1">
        <div className="text-sm font-medium">{DOC_TYPE_LABELS[row.doc_type] ?? row.doc_type}</div>
        <div className="num text-xs text-muted">Sonraki: {preview(draft)}</div>
      </div>
      <label className="flex flex-col gap-1 text-xs text-muted">
        Önek
        <Input value={draft.prefix} disabled={disabled} onChange={(e) => setDraft({ ...draft, prefix: e.target.value.toUpperCase() })} className="uppercase" />
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted">
        Hane
        <Input type="number" min={1} max={12} value={draft.padding} disabled={disabled} onChange={(e) => setDraft({ ...draft, padding: Math.min(12, Math.max(1, Number(e.target.value) || 1)) })} />
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted">
        Sıradaki no
        <Input type="number" min={1} value={draft.next_number} disabled={disabled} onChange={(e) => setDraft({ ...draft, next_number: Math.max(1, Number(e.target.value) || 1) })} />
      </label>
      <label className="flex h-10 items-center gap-2 text-xs text-muted">
        <Switch checked={draft.include_year} disabled={disabled} onCheckedChange={(v) => setDraft({ ...draft, include_year: v })} />
        Yıl ekle
      </label>
      <Button size="sm" className="h-10" disabled={!dirty || disabled} loading={saving} onClick={save}>
        Kaydet
      </Button>
    </div>
  );
}

export function NumberSeriesSettings() {
  const { org, isAdmin } = useOrg();
  const q = useQuery({
    queryKey: ["number_series", org!.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("number_series").select("*").eq("org_id", org!.id);
      if (error) throw error;
      const order = Object.keys(DOC_TYPE_LABELS);
      return data.sort((a, b) => order.indexOf(a.doc_type) - order.indexOf(b.doc_type));
    },
  });

  return (
    <Card>
      <CardHeader title="Belge Numaraları" />
      <p className="px-4 pt-3 text-sm text-muted sm:px-5">
        Belgeler kaydedilirken numara otomatik verilir. Yıl eklenen serilerde sayaç her yıl 1&apos;den başlar. Alış faturası ve masraflarda
        tedarikçinin belge numarası elle girilir.
      </p>
      {q.isPending ? (
        <div className="space-y-3 p-5">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : (
        q.data?.map((row) => <SeriesRow key={`${row.id}-${row.updated_at}`} row={row} disabled={!isAdmin} />)
      )}
    </Card>
  );
}
