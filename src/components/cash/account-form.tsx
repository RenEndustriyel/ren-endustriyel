"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/money-input";
import { Segmented } from "@/components/ui/segmented";
import { newId, useRpc, useSave, type Row } from "@/lib/data";
import { CURRENCIES } from "@/lib/doc-types";
import { isoDate } from "@/lib/format";
import { useOrg } from "@/providers/org-provider";

type Account = Row<"accounts">;
type AccType = "cash" | "bank" | "credit_card";

export const ACCOUNT_TYPES: Record<AccType, string> = { cash: "Kasa", bank: "Banka", credit_card: "Kredi kartı" };

export function AccountForm({ account, onDone }: { account?: Account | null; onDone: () => void }) {
  const { org } = useOrg();
  const save = useSave("accounts");
  const txn = useRpc("save_transaction");
  const [v, setV] = React.useState({
    type: (account?.type as AccType) ?? "bank",
    name: account?.name ?? "",
    currency: account?.currency ?? "TRY",
    bank_name: account?.bank_name ?? "",
    branch: account?.branch ?? "",
    account_number: account?.account_number ?? "",
    iban: account?.iban ?? "",
    card_limit: Number(account?.card_limit ?? 0),
    statement_day: account?.statement_day?.toString() ?? "",
    due_day: account?.due_day?.toString() ?? "",
    opening: 0,
    opening_date: isoDate(),
  });
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((x) => ({ ...x, [k]: val }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.name.trim()) return;
    const id = account?.id ?? newId();
    await save.save(
      {
        id,
        type: v.type,
        name: v.name.trim(),
        currency: v.currency,
        bank_name: v.bank_name || null,
        branch: v.branch || null,
        account_number: v.account_number || null,
        iban: v.iban.replace(/\s/g, "").toUpperCase() || null,
        card_limit: v.type === "credit_card" ? v.card_limit || null : null,
        statement_day: v.type === "credit_card" && v.statement_day ? Number(v.statement_day) : null,
        due_day: v.type === "credit_card" && v.due_day ? Number(v.due_day) : null,
      },
      account ? "Hesap güncellendi" : "Hesap oluşturuldu",
    );
    if (!account && v.opening) {
      // kredi kartında açılış borcu çıkış olarak girilir
      const out = v.type === "credit_card" ? v.opening > 0 : v.opening < 0;
      await txn.call({
        p_txn: { id: newId(), org_id: org!.id, type: "opening", direction: out ? "out" : "in", txn_date: v.opening_date, account_id: id, amount: Math.abs(v.opening), currency: v.currency, exchange_rate: 1, description: "Açılış bakiyesi" },
        p_allocations: null,
      });
    }
    onDone();
  };

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Segmented value={v.type} onChange={(t) => set("type", t)} options={(Object.keys(ACCOUNT_TYPES) as AccType[]).map((k) => ({ value: k, label: ACCOUNT_TYPES[k] }))} />
      </div>
      <Field label="Hesap adı *" className="sm:col-span-2">
        <Input value={v.name} onChange={(e) => set("name", e.target.value)} placeholder={v.type === "cash" ? "Merkez Kasa" : v.type === "bank" ? "Ziraat Bankası TL" : "İş Bankası Maximum"} autoFocus />
      </Field>
      <Field label="Para birimi">
        <NativeSelect value={v.currency} onChange={(e) => set("currency", e.target.value)} disabled={!!account}>
          {CURRENCIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </NativeSelect>
      </Field>
      {v.type !== "cash" && (
        <Field label="Banka">
          <Input value={v.bank_name} onChange={(e) => set("bank_name", e.target.value)} />
        </Field>
      )}
      {v.type === "bank" && (
        <>
          <Field label="Şube">
            <Input value={v.branch} onChange={(e) => set("branch", e.target.value)} />
          </Field>
          <Field label="Hesap no">
            <Input value={v.account_number} onChange={(e) => set("account_number", e.target.value)} />
          </Field>
          <Field label="IBAN" className="sm:col-span-2">
            <Input value={v.iban} onChange={(e) => set("iban", e.target.value)} placeholder="TR00 0000 0000 0000 0000 0000 00" />
          </Field>
        </>
      )}
      {v.type === "credit_card" && (
        <>
          <Field label="Kart limiti">
            <NumberInput value={v.card_limit} onChange={(n) => set("card_limit", n)} />
          </Field>
          <Field label="Hesap kesim günü">
            <Input type="number" min={1} max={31} value={v.statement_day} onChange={(e) => set("statement_day", e.target.value)} />
          </Field>
          <Field label="Son ödeme günü">
            <Input type="number" min={1} max={31} value={v.due_day} onChange={(e) => set("due_day", e.target.value)} />
          </Field>
        </>
      )}
      {!account && (
        <div className="grid gap-3 rounded-xl border border-border bg-surface-2 p-3 sm:col-span-2 sm:grid-cols-2">
          <Field label={v.type === "credit_card" ? "Mevcut kart borcu" : "Açılış bakiyesi"} hint={v.type === "credit_card" ? "Karta borcunuz" : "Eksi bakiye için - yazın"}>
            <NumberInput value={v.opening} onChange={(n) => set("opening", n)} />
          </Field>
          <Field label="Açılış tarihi">
            <Input type="date" value={v.opening_date} onChange={(e) => set("opening_date", e.target.value)} />
          </Field>
        </div>
      )}
      <div className="flex justify-end gap-2 sm:col-span-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Vazgeç
        </Button>
        <Button type="submit" loading={save.isPending}>
          Kaydet
        </Button>
      </div>
    </form>
  );
}
