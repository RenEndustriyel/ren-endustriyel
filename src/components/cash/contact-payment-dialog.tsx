"use client";

import * as React from "react";
import { newId, useAccounts, useRpc, type Row } from "@/lib/data";
import { DOC_TYPES, docFlow, type DocType } from "@/lib/doc-types";
import { formatMoney, isoDate } from "@/lib/format";
import { useOrg } from "@/providers/org-provider";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const METHOD_BY_ACCOUNT: Record<string, string> = { cash: "cash", bank: "bank_transfer", credit_card: "credit_card" };

/**
 * Cari ekranından hızlı tahsilat / ödeme (Pusulam tarzı pencere): tutar, hesap, tarih, açıklama.
 * Kaydedilen tutar carinin en eski açık faturalarına sırayla bağlanır.
 */
export function ContactPaymentDialog({
  flow,
  contact,
  docs,
  balance,
  onOpenChange,
  onSaved,
}: {
  flow: "in" | "out" | null;
  contact: { id: string; name: string };
  docs: Row<"documents">[];
  /** ekrandaki güncel bakiye (+ bize borçlu, − biz borçluyuz) */
  balance: number;
  onOpenChange: (o: boolean) => void;
  onSaved?: () => void;
}) {
  return (
    <Dialog open={!!flow} onOpenChange={onOpenChange}>
      <DialogContent title={`${flow === "out" ? "Ödeme Yap" : "Tahsilat Al"} — ${contact.name}`} className="sm:max-w-lg">
        {flow && <Form key={flow} flow={flow} contact={contact} docs={docs} balance={balance} onDone={(saved) => { onOpenChange(false); if (saved) onSaved?.(); }} />}
      </DialogContent>
    </Dialog>
  );
}

function Form({
  flow,
  contact,
  docs,
  balance,
  onDone,
}: {
  flow: "in" | "out";
  contact: { id: string; name: string };
  docs: Row<"documents">[];
  balance: number;
  onDone: (saved: boolean) => void;
}) {
  const { org } = useOrg();
  const accounts = useAccounts();
  const save = useRpc("save_transaction");
  const txnId = React.useRef(newId()); // tekrar kaydet aynı kaydı günceller (çift kayıt olmaz)
  const list = (accounts.data ?? []).filter((a) => a.is_active && a.currency === "TRY");
  const [accountId, setAccountId] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [date, setDate] = React.useState(isoDate());
  const [desc, setDesc] = React.useState("");
  const acc = list.find((a) => a.id === accountId) ?? list[0];
  const value = Number(amount.replace(/\./g, "").replace(",", ".")) || 0;

  // Bu yöndeki açık faturalar, en eski vadeden başlayarak
  const open = docs
    .filter((d) => DOC_TYPES[d.doc_type as DocType]?.payable && docFlow(d.doc_type as DocType) === flow && d.status !== "draft" && d.status !== "cancelled" && d.currency === "TRY")
    .map((d) => ({ id: d.id, rem: Math.round((Number(d.total) - Number(d.paid_amount || 0)) * 100) / 100, key: d.issue_date }))
    .filter((d) => d.rem > 0.004)
    .sort((a, b) => a.key.localeCompare(b.key) || a.id.localeCompare(b.id));
  const due = flow === "in" ? Math.max(balance, 0) : Math.max(-balance, 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (value <= 0 || !acc || !org) return;
    // Önce devir / faturaya bağlı olmayan bakiye kapanır, kalanı en eski faturalara
    const unlinked = Math.max(0, due - open.reduce((s, d) => s + d.rem, 0));
    let left = Math.round((value - Math.min(value, unlinked)) * 100) / 100;
    const allocations: { document_id: string; amount: number }[] = [];
    for (const d of open) {
      if (left <= 0.004) break;
      const amt = Math.round(Math.min(d.rem, left) * 100) / 100;
      allocations.push({ document_id: d.id, amount: amt });
      left -= amt;
    }
    await save.call(
      {
        p_txn: {
          id: txnId.current,
          org_id: org.id,
          type: flow === "in" ? "collection" : "payment",
          direction: flow,
          txn_date: date,
          account_id: acc.id,
          contact_id: contact.id,
          amount: value,
          currency: "TRY",
          exchange_rate: 1,
          method: METHOD_BY_ACCOUNT[acc.type] ?? "cash",
          description: desc.trim() || null,
        },
        p_allocations: allocations,
      },
      flow === "in" ? "Tahsilat kaydedildi" : "Ödeme kaydedildi",
    );
    onDone(true);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block space-y-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">Tutar (TL) *</span>
        <Input autoFocus inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" required />
        {due > 0.004 && (
          <button type="button" className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400" onClick={() => setAmount(due.toFixed(2).replace(".", ","))}>
            {flow === "in" ? "Bakiyenin tamamı" : "Borcun tamamı"}: {formatMoney(due)}
          </button>
        )}
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">Hesap</span>
          <select className="input w-full" value={acc?.id ?? ""} onChange={(e) => setAccountId(e.target.value)}>
            {list.length === 0 && <option value="">TL hesap tanımlı değil</option>}
            {list.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">Tarih</span>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
      </div>
      <label className="block space-y-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">Açıklama</span>
        <Input value={desc} onChange={(e) => setDesc(e.target.value)} />
      </label>
      {open.length > 0 && value > 0 && (
        <p className="text-xs text-slate-600 dark:text-slate-400">
          {due - open.reduce((s, d) => s + d.rem, 0) > 0.004
            ? `Önce ${formatMoney(due - open.reduce((s, d) => s + d.rem, 0))} devir bakiyesi kapanır, kalanı en eski faturalara bağlanır.`
            : `En eski tarihli açık faturalara sırayla bağlanır (${open.length} açık fatura · ${formatMoney(open.reduce((s, d) => s + d.rem, 0))}).`}
        </p>
      )}
      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
        <Button type="button" variant="ghost" onClick={() => onDone(false)}>
          Vazgeç
        </Button>
        <Button type="submit" disabled={save.isPending || value <= 0 || !acc}>
          {save.isPending ? "Kaydediliyor…" : "Kaydet"}
        </Button>
      </div>
    </form>
  );
}
