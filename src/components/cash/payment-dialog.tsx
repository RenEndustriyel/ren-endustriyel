"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/money-input";
import { newId, useAccounts, useRpc } from "@/lib/data";
import { formatMoney, isoDate } from "@/lib/format";
import { rateFor, useRates } from "@/lib/rates";
import { useOrg } from "@/providers/org-provider";

export type AllocTarget = { id: string; number: string | null; remaining: number; currency: string; exchange_rate: number };

/**
 * Belgeye bağlı tahsilat / ödeme.
 * Tutar belge para birimindedir; hesap farklı para birimindeyse kur ile çevrilir.
 */
type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  flow: "in" | "out";
  target: AllocTarget;
  contactId?: string | null;
  employeeId?: string | null;
  categoryId?: string | null;
  title?: string;
};

export function PaymentDialog(props: Props) {
  const { open, onOpenChange, flow, target, title } = props;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={title ?? (flow === "in" ? "Tahsilat ekle" : "Ödeme ekle")} description={`${target.number ?? ""} · Kalan ${formatMoney(target.remaining, target.currency)}`}>
        {open && <PaymentForm {...props} />}
      </DialogContent>
    </Dialog>
  );
}

function PaymentForm({ onOpenChange, flow, target, contactId, employeeId, categoryId }: Props) {
  const { org } = useOrg();
  const accounts = useAccounts();
  const rates = useRates();
  const save = useRpc("save_transaction");
  const active = (accounts.data ?? []).filter((a) => a.is_active);
  const [accountId, setAccountId] = React.useState("");
  const [amount, setAmount] = React.useState(Math.round(target.remaining * 100) / 100);
  const [date, setDate] = React.useState(isoDate());
  const [method, setMethod] = React.useState("cash");
  const [desc, setDesc] = React.useState("");
  const acc = active.find((a) => a.id === accountId) ?? active[0];

  // hesap para birimindeki karşılık
  const accCur = acc?.currency ?? "TRY";
  const docRate = target.currency === "TRY" ? 1 : target.exchange_rate;
  const accRate = accCur === "TRY" ? 1 : rateFor(rates.data, accCur) || 1;
  const accAmount = accCur === target.currency ? amount : Math.round(((amount * docRate) / accRate) * 100) / 100;

  const qc = useQueryClient();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acc || amount <= 0) return;
    await save.call(
      {
        p_txn: {
          id: newId(),
          org_id: org!.id,
          type: employeeId ? "salary" : flow === "in" ? "collection" : "payment",
          direction: flow,
          txn_date: date,
          account_id: acc.id,
          contact_id: contactId ?? null,
          employee_id: employeeId ?? null,
          category_id: categoryId ?? null,
          amount: accAmount,
          currency: accCur,
          exchange_rate: accRate,
          method,
          description: desc || target.number || null,
        },
        p_allocations: [{ document_id: target.id, amount: Math.min(amount, target.remaining) }],
      },
      flow === "in" ? "Tahsilat kaydedildi" : "Ödeme kaydedildi",
    );
    qc.invalidateQueries({ queryKey: ["rows", "transactions"] });
    qc.invalidateQueries({ queryKey: ["rows", "accounts"] });
    qc.invalidateQueries({ queryKey: ["account_statement"] });
    qc.invalidateQueries({ queryKey: ["contact-balances"] });
    qc.invalidateQueries({ queryKey: ["contact_statement"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    qc.invalidateQueries({ queryKey: ["documents"] });
    onOpenChange(false);
  };

  return (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label={flow === "in" ? "Tahsil edilen hesap" : "Ödeme yapılan hesap"}>
            <NativeSelect value={acc?.id ?? ""} onChange={(e) => setAccountId(e.target.value)}>
              {active.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.currency})
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label={`Tutar (${target.currency})`}>
            <NumberInput value={amount} onChange={setAmount} autoFocus />
          </Field>
          {accCur !== target.currency && (
            <p className="text-xs text-muted">
              Hesaba işlenecek: <b>{formatMoney(accAmount, accCur)}</b>
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tarih">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Yöntem">
              <NativeSelect value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="cash">Nakit</option>
                <option value="bank_transfer">Havale / EFT</option>
                <option value="credit_card">Kredi kartı</option>
                <option value="other">Diğer</option>
              </NativeSelect>
            </Field>
          </div>
          <Field label="Açıklama">
            <Input value={desc} onChange={(e) => setDesc(e.target.value)} />
          </Field>
          <Button type="submit" loading={save.isPending} disabled={!acc || amount <= 0}>
            Kaydet
          </Button>
          {!active.length && <p className="text-xs text-danger">Önce Kasa ve Bankalar sayfasından hesap ekleyin.</p>}
        </form>
  );
}
