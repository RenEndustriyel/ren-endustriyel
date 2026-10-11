"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAccounts, useRpc, type Row } from "@/lib/data";
import { formatMoney } from "@/lib/format";
import { useOrg } from "@/providers/org-provider";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TYPE_LABELS } from "@/components/dashboard/types";

type Txn = Row<"transactions">;
type Alloc = { document_id: string; amount: number; created_at: string };

const METHOD_BY_ACCOUNT: Record<string, string> = { cash: "cash", bank: "bank_transfer", credit_card: "credit_card" };

/** Bu hareket düzenlenebilir mi? Değilse nedeni */
export function txnEditBlock(t: Pick<Txn, "type" | "cheque_id" | "reference">): string | null {
  if (t.cheque_id) return "Çek / senede bağlı hareket; çek ekranından düzenleyin.";
  if (t.type === "transfer") return "Hesaplar arası transfer; Hesaplar ekranından düzenleyin.";
  if (String(t.reference ?? "").startsWith("oto-mahsup")) return "Otomatik mahsup kaydı; düzenlenemez.";
  return null;
}

/**
 * Tahsilat / ödeme / borç-alacak kaydını düzenler: tarih, tutar, hesap, açıklama.
 * Faturalarla eşleşmeler korunur; tutar azalırsa eşleşmeler yeni tutara kadar kırpılır.
 */
export function TransactionEditDialog({ txn, onOpenChange, onSaved }: { txn: Txn | null; onOpenChange: (o: boolean) => void; onSaved?: () => void }) {
  return (
    <Dialog open={!!txn} onOpenChange={onOpenChange}>
      <DialogContent
        title={`${txn ? (TYPE_LABELS[txn.type] ?? "Hareket") : "Hareket"} düzenle`}
        description="Tarih, tutar, hesap ve açıklama değiştirilebilir; fatura eşleşmeleri korunur."
        className="sm:max-w-md"
      >
        {txn && <EditForm key={txn.id} txn={txn} onDone={() => { onOpenChange(false); onSaved?.(); }} />}
      </DialogContent>
    </Dialog>
  );
}

function EditForm({ txn, onDone }: { txn: Txn; onDone: () => void }) {
  const { org } = useOrg();
  const accounts = useAccounts();
  const save = useRpc("save_transaction");
  const [date, setDate] = React.useState(txn.txn_date);
  const [amount, setAmount] = React.useState(String(Number(txn.amount)).replace(".", ","));
  const [accountId, setAccountId] = React.useState(txn.account_id ?? "");
  const [desc, setDesc] = React.useState(txn.description ?? "");

  const allocs = useQuery({
    queryKey: ["txn_allocs", txn.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_allocations")
        .select("document_id, amount, created_at")
        .eq("transaction_id", txn.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Alloc[];
    },
  });

  // Aynı para birimindeki aktif hesaplar (kur karışmasın)
  const accList = (accounts.data ?? []).filter((a) => (a.is_active || a.id === txn.account_id) && a.currency === txn.currency);
  const newAmount = Number(amount.replace(/\./g, "").replace(",", ".")) || 0;
  const allocated = (allocs.data ?? []).reduce((s, a) => s + Number(a.amount), 0);
  const trims = allocated > newAmount + 0.004;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newAmount <= 0 || !allocs.data) return;
    // Eşleşmeleri yeni tutara kadar koru (eskiden yeniye)
    let left = newAmount;
    const kept: { document_id: string; amount: number }[] = [];
    for (const a of allocs.data) {
      const amt = Math.min(Number(a.amount), Math.round(left * 100) / 100);
      if (amt > 0.004) kept.push({ document_id: a.document_id, amount: amt });
      left -= amt;
    }
    const acc = accList.find((a) => a.id === accountId);
    await save.call(
      {
        p_txn: {
          id: txn.id,
          org_id: org!.id,
          type: txn.type,
          direction: txn.direction,
          txn_date: date,
          account_id: accountId || null,
          to_account_id: txn.to_account_id,
          contact_id: txn.contact_id,
          employee_id: txn.employee_id,
          cheque_id: txn.cheque_id,
          category_id: txn.category_id,
          amount: newAmount,
          to_amount: txn.to_amount,
          currency: txn.currency,
          exchange_rate: txn.exchange_rate,
          method: accountId !== txn.account_id && acc ? (METHOD_BY_ACCOUNT[acc.type] ?? txn.method) : txn.method,
          description: desc.trim() || null,
          reference: txn.reference,
        },
        p_allocations: kept,
      },
      "Hareket güncellendi",
    );
    onDone();
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1">
          <span className="text-xs font-semibold text-muted">Tarih</span>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-semibold text-muted">Tutar ({txn.currency})</span>
          <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </label>
      </div>
      {txn.account_id && (
        <label className="block space-y-1">
          <span className="text-xs font-semibold text-muted">Kasa / hesap</span>
          <select className="input w-full" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {accList.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="block space-y-1">
        <span className="text-xs font-semibold text-muted">Açıklama</span>
        <Input value={desc} onChange={(e) => setDesc(e.target.value)} />
      </label>
      {allocated > 0.004 && (
        <p className={trims ? "text-xs font-semibold text-warning" : "text-xs text-muted"}>
          Faturalara bağlı: {formatMoney(allocated, txn.currency)}
          {trims ? ` — yeni tutar daha az; eşleşme ${formatMoney(newAmount, txn.currency)} ile sınırlanacak ve fark faturalarda açık kalacak.` : ""}
        </p>
      )}
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onDone}>
          Vazgeç
        </Button>
        <Button type="submit" disabled={save.isPending || allocs.isPending || newAmount <= 0}>
          {save.isPending ? "Kaydediliyor…" : "Kaydet"}
        </Button>
      </div>
    </form>
  );
}
