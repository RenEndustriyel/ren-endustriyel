"use client";

import * as React from "react";
import { useUpdate, type Row } from "@/lib/data";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/money-input";

/** Cari açılış (devir) bakiyesini düzenler: tutar, yön, tarih */
export function OpeningBalanceDialog({
  contact,
  open,
  onOpenChange,
  onSaved,
}: {
  contact: Row<"contacts">;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved?: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={`Açılış bakiyesi — ${contact.name}`} description="Devir bakiyesi carinin güncel bakiyesine eklenir; tahsilatlar önce bu bakiyeyi kapatır." className="sm:max-w-md">
        {open && <Form contact={contact} onDone={(saved) => { onOpenChange(false); if (saved) onSaved?.(); }} />}
      </DialogContent>
    </Dialog>
  );
}

function Form({ contact, onDone }: { contact: Row<"contacts">; onDone: (saved: boolean) => void }) {
  const { update } = useUpdate("contacts");
  const ob = Number(contact.opening_balance ?? 0);
  const [amount, setAmount] = React.useState(Math.abs(ob));
  const [side, setSide] = React.useState<"debit" | "credit">(ob < 0 ? "credit" : "debit");
  const [date, setDate] = React.useState(contact.opening_balance_date ?? "");
  const [busy, setBusy] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await update(
        contact.id,
        {
          opening_balance: side === "credit" ? -amount : amount,
          opening_balance_date: amount ? date || null : null,
        },
        "Açılış bakiyesi güncellendi",
      );
      onDone(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">Tutar</span>
          <NumberInput value={amount} onChange={(v) => setAmount(Number(v) || 0)} suffix="₺" />
        </label>
        <label className="block space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">Tarih</span>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>
      <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-slate-300 dark:border-slate-600">
        {[
          { v: "debit" as const, label: "Cari bize borçlu" },
          { v: "credit" as const, label: "Biz cariye borçluyuz" },
        ].map((o, i) => (
          <button
            key={o.v}
            type="button"
            onClick={() => setSide(o.v)}
            className={
              "h-10 text-sm font-semibold transition " +
              (i > 0 ? "border-l border-slate-300 dark:border-slate-600 " : "") +
              (side === o.v ? "bg-brand-500 text-white" : "bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800")
            }
          >
            {o.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-400">Tutarı 0 yaparsanız devir kaldırılır. Bakiye ve ekstre hemen güncellenir.</p>
      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
        <Button type="button" variant="ghost" onClick={() => onDone(false)}>
          Vazgeç
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? "Kaydediliyor…" : "Kaydet"}
        </Button>
      </div>
    </form>
  );
}
