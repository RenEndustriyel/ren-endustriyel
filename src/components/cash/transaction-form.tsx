"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Wand2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { newId, useAccounts, useCategories, useRow, useRows, useRpc, useSave, type Row } from "@/lib/data";
import { formatDate, formatMoney, isoDate } from "@/lib/format";
import { rateFor, useRates } from "@/lib/rates";
import { DOC_TYPES, type DocType } from "@/lib/doc-types";
import { useOrg } from "@/providers/org-provider";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, NativeSelect } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/money-input";
import { Segmented } from "@/components/ui/segmented";
import { Combobox } from "@/components/ui/combobox";
import { Skeleton } from "@/components/ui/skeleton";
import { ContactPicker } from "@/components/contacts/contact-picker";

export type TxnKind = "tahsilat" | "odeme" | "virman" | "gelir" | "gider";

const KIND_LABEL: Record<TxnKind, string> = { tahsilat: "Tahsilat", odeme: "Ödeme", virman: "Virman", gelir: "Diğer gelir", gider: "Diğer gider" };

type OpenDoc = Row<"documents">;

export function TransactionFormPage({ kind: initialKind, editId, contactId, accountId }: { kind: TxnKind; editId?: string | null; contactId?: string | null; accountId?: string | null }) {
  const existing = useRow<Row<"transactions">>("transactions", editId);
  const allocs = useQuery({
    queryKey: ["txn-allocs", editId],
    enabled: !!editId,
    queryFn: async () => {
      const { data, error } = await supabase.from("payment_allocations").select("document_id, amount").eq("transaction_id", editId!);
      if (error) throw error;
      return data;
    },
  });
  if (editId && (existing.isPending || allocs.isPending)) return <Skeleton className="mx-auto h-96 max-w-3xl rounded-card" />;
  const t = existing.data;
  const kind: TxnKind = t
    ? t.direction === "transfer"
      ? "virman"
      : t.type === "other_income"
        ? "gelir"
        : t.type === "other_expense"
          ? "gider"
          : t.direction === "in"
            ? "tahsilat"
            : "odeme"
    : initialKind;
  return <Inner key={editId ?? kind} kind={kind} existing={t ?? null} existingAllocs={allocs.data ?? []} contactId={contactId} accountId={accountId} />;
}

function Inner({
  kind: initialKind,
  existing,
  existingAllocs,
  contactId,
  accountId,
}: {
  kind: TxnKind;
  existing: Row<"transactions"> | null;
  existingAllocs: { document_id: string; amount: number }[];
  contactId?: string | null;
  accountId?: string | null;
}) {
  const router = useRouter();
  const { org } = useOrg();
  const accounts = useAccounts();
  const rates = useRates();
  const save = useRpc("save_transaction");
  const saveCat = useSave("categories");
  const [kind, setKind] = React.useState<TxnKind>(initialKind);
  const active = (accounts.data ?? []).filter((a) => a.is_active);
  const cats = useCategories(kind === "gelir" ? "income" : "expense");

  const [v, setV] = React.useState({
    contact_id: existing?.contact_id ?? contactId ?? null,
    account_id: existing?.account_id ?? accountId ?? "",
    to_account_id: existing?.to_account_id ?? "",
    amount: Number(existing?.amount ?? 0),
    to_amount: Number(existing?.to_amount ?? 0),
    txn_date: existing?.txn_date ?? isoDate(),
    method: existing?.method ?? "cash",
    description: existing?.description ?? "",
    reference: existing?.reference ?? "",
    category_id: existing?.category_id ?? null,
  });
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((x) => ({ ...x, [k]: val }));
  const acc = active.find((a) => a.id === v.account_id) ?? (v.account_id ? undefined : active[0]);
  const toAcc = active.find((a) => a.id === v.to_account_id);
  const accCur = acc?.currency ?? "TRY";
  const accRate = accCur === "TRY" ? 1 : rateFor(rates.data, accCur) || 1;

  // açık belgeler (tahsilat: satış faturaları, ödeme: alış faturaları + masraflar)
  const docTypes = kind === "tahsilat" ? ["sales_invoice", "pos_sale", "purchase_return"] : ["purchase_invoice", "expense", "sales_return"];
  const openDocs = useRows<OpenDoc>("documents", {
    params: ["open", v.contact_id, kind],
    enabled: !!v.contact_id && (kind === "tahsilat" || kind === "odeme"),
    filter: (x) => x.eq("contact_id", v.contact_id).in("doc_type", docTypes).neq("status", "cancelled").neq("status", "draft"),
    order: [{ column: "due_date", ascending: true }, { column: "issue_date", ascending: true }],
  });
  const [alloc, setAlloc] = React.useState<Record<string, number>>(() => Object.fromEntries(existingAllocs.map((a) => [a.document_id, Number(a.amount)])));
  const remainingOf = (d: OpenDoc) => Math.max(Number(d.total) - Number(d.paid_amount) + (existingAllocs.find((a) => a.document_id === d.id) ? Number(existingAllocs.find((a) => a.document_id === d.id)!.amount) : 0), 0);
  const candidates = (openDocs.data ?? []).filter((d) => remainingOf(d) > 0.004);

  // TL karşılığı (belgeler TL varsayımıyla; dövizli belgede belge para birimi)
  const amountTry = v.amount * accRate;
  const allocatedTry = candidates.reduce((s, d) => s + (alloc[d.id] ?? 0) * Number(d.exchange_rate), 0);

  const autoAllocate = () => {
    let left = amountTry;
    const next: Record<string, number> = {};
    for (const d of candidates) {
      if (left <= 0.004) break;
      const remTry = remainingOf(d) * Number(d.exchange_rate);
      const useTry = Math.min(remTry, left);
      next[d.id] = Math.round((useTry / Number(d.exchange_rate)) * 100) / 100;
      left -= useTry;
    }
    setAlloc(next);
  };

  // Açık belgeler veya tutar geldiğinde otomatik eşle (kullanıcı henüz manuel değiştirmediyse)
  React.useEffect(() => {
    if (!existing && (kind === "tahsilat" || kind === "odeme") && candidates.length > 0 && amountTry > 0) {
      const currentAllocSum = Object.values(alloc).reduce((s, a) => s + (Number(a) || 0), 0);
      if (currentAllocSum === 0) {
        autoAllocate();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidates.length, v.amount, v.contact_id, kind]);

  const [err, setErr] = React.useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!acc) return setErr("Hesap seçin.");
    if (v.amount <= 0) return setErr("Tutar girin.");
    if ((kind === "tahsilat" || kind === "odeme") && !v.contact_id) return setErr("Cari seçin.");
    if (kind === "virman" && (!toAcc || toAcc.id === acc.id)) return setErr("Farklı bir hedef hesap seçin.");

    // Eğer kullanıcı açık belgeleri manuel eşlemediyse, otomatik olarak açık belgelere dağıt
    let effectiveAlloc = alloc;
    const allocSum = Object.values(alloc).reduce((s, a) => s + (Number(a) || 0), 0);
    if ((kind === "tahsilat" || kind === "odeme") && allocSum === 0 && candidates.length > 0) {
      let left = amountTry;
      const next: Record<string, number> = {};
      for (const d of candidates) {
        if (left <= 0.004) break;
        const remTry = remainingOf(d) * Number(d.exchange_rate);
        const useTry = Math.min(remTry, left);
        next[d.id] = Math.round((useTry / Number(d.exchange_rate)) * 100) / 100;
        left -= useTry;
      }
      effectiveAlloc = next;
    }

    const currentAllocatedTry = candidates.reduce((s, d) => s + (effectiveAlloc[d.id] ?? 0) * Number(d.exchange_rate), 0);
    if (currentAllocatedTry > amountTry + 0.01) return setErr("Eşleştirilen tutar, işlem tutarından fazla olamaz.");

    const id = existing?.id ?? newId();
    const base = {
      id,
      org_id: org!.id,
      txn_date: v.txn_date,
      account_id: acc.id,
      amount: v.amount,
      currency: accCur,
      exchange_rate: accRate,
      description: v.description || null,
      reference: v.reference || null,
    };
    const txn =
      kind === "virman"
        ? { ...base, type: "transfer", direction: "transfer", to_account_id: toAcc!.id, to_amount: toAcc!.currency === accCur ? v.amount : v.to_amount || v.amount }
        : kind === "gelir" || kind === "gider"
          ? { ...base, type: kind === "gelir" ? "other_income" : "other_expense", direction: kind === "gelir" ? "in" : "out", category_id: v.category_id, method: v.method }
          : { ...base, type: kind === "tahsilat" ? "collection" : "payment", direction: kind === "tahsilat" ? "in" : "out", contact_id: v.contact_id, method: v.method };
    await save.call(
      {
        p_txn: txn,
        p_allocations: kind === "tahsilat" || kind === "odeme" ? Object.entries(effectiveAlloc).filter(([, a]) => a > 0).map(([document_id, amount]) => ({ document_id, amount })) : null,
      },
      existing ? "İşlem güncellendi" : `${KIND_LABEL[kind]} kaydedildi`,
    );
    router.replace(v.contact_id && (kind === "tahsilat" || kind === "odeme") ? `/cariler/detay?id=${v.contact_id}` : `/nakit/hesaplar/detay?id=${acc.id}`);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader back title={existing ? `${KIND_LABEL[kind]} düzenle` : `Yeni ${KIND_LABEL[kind].toLocaleLowerCase("tr-TR")}`} />
      <form onSubmit={submit} className="flex flex-col gap-4">
        {!existing && (
          <Segmented value={kind} onChange={(k) => { setKind(k); setAlloc({}); }} options={(Object.keys(KIND_LABEL) as TxnKind[]).map((k) => ({ value: k, label: KIND_LABEL[k] }))} />
        )}
        <Card>
          <CardBody className="grid gap-4 sm:grid-cols-2">
            {(kind === "tahsilat" || kind === "odeme") && (
              <Field label={kind === "tahsilat" ? "Müşteri *" : "Tedarikçi *"} className="sm:col-span-2">
                <ContactPicker value={v.contact_id} onChange={(id) => { set("contact_id", id); setAlloc({}); }} kind={kind === "tahsilat" ? "customer" : "supplier"} />
              </Field>
            )}
            <Field label={kind === "virman" ? "Çıkış hesabı" : kind === "tahsilat" || kind === "gelir" ? "Giriş yapılan hesap" : "Çıkış yapılan hesap"}>
              <NativeSelect value={acc?.id ?? ""} onChange={(e) => set("account_id", e.target.value)}>
                {active.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.currency})
                  </option>
                ))}
              </NativeSelect>
            </Field>
            {kind === "virman" && (
              <Field label="Giriş hesabı">
                <NativeSelect value={v.to_account_id} onChange={(e) => set("to_account_id", e.target.value)}>
                  <option value="">Seçin</option>
                  {active.filter((a) => a.id !== acc?.id).map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.currency})
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            )}
            <Field label={`Tutar (${accCur})`}>
              <NumberInput value={v.amount} onChange={(n) => set("amount", n)} autoFocus />
            </Field>
            {kind === "virman" && toAcc && toAcc.currency !== accCur && (
              <Field label={`Karşı tutar (${toAcc.currency})`}>
                <NumberInput value={v.to_amount} onChange={(n) => set("to_amount", n)} />
              </Field>
            )}
            <Field label="Tarih">
              <Input type="date" value={v.txn_date} onChange={(e) => set("txn_date", e.target.value)} />
            </Field>
            {kind !== "virman" && (
              <Field label="Yöntem">
                <NativeSelect value={v.method} onChange={(e) => set("method", e.target.value)}>
                  <option value="cash">Nakit</option>
                  <option value="bank_transfer">Havale / EFT</option>
                  <option value="credit_card">Kredi kartı</option>
                  <option value="other">Diğer</option>
                </NativeSelect>
              </Field>
            )}
            {(kind === "gelir" || kind === "gider") && (
              <Field label="Kategori">
                <Combobox
                  value={v.category_id}
                  onChange={(c) => set("category_id", c)}
                  options={(cats.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
                  placeholder="Kategori seçin"
                  clearable
                  onCreate={async (name) => {
                    if (!name.trim()) return;
                    const r = await saveCat.save<{ id: string }>({ type: kind === "gelir" ? "income" : "expense", name: name.trim() });
                    set("category_id", r.data?.id ?? null);
                  }}
                  createLabel="Yeni kategori"
                />
              </Field>
            )}
            <Field label="Açıklama">
              <Input value={v.description} onChange={(e) => set("description", e.target.value)} />
            </Field>
            <Field label="Referans / dekont no">
              <Input value={v.reference} onChange={(e) => set("reference", e.target.value)} />
            </Field>
          </CardBody>
        </Card>

        {(kind === "tahsilat" || kind === "odeme") && v.contact_id && (
          <Card>
            <CardHeader
              title="Açık belgelerle eşleştir"
              action={
                candidates.length > 0 && (
                  <Button type="button" size="sm" variant="ghost" onClick={autoAllocate}>
                    <Wand2 /> Otomatik dağıt
                  </Button>
                )
              }
            />
            {!candidates.length ? (
              <p className="px-4 py-3 text-sm text-muted">Açık belge yok. İşlem cari hesaba bakiye olarak işlenir.</p>
            ) : (
              <ul className="divide-y divide-border">
                {candidates.map((d) => {
                  const rem = remainingOf(d);
                  return (
                    <li key={d.id} className="grid grid-cols-[1fr_130px] items-center gap-3 px-4 py-2.5">
                      <div className="min-w-0 text-sm">
                        <div className="font-medium">
                          {DOC_TYPES[d.doc_type as DocType].label} {d.number}
                        </div>
                        <div className="text-xs text-muted">
                          {formatDate(d.issue_date)} {d.due_date ? `· vade ${formatDate(d.due_date)}` : ""} · kalan {formatMoney(rem, d.currency)}
                        </div>
                      </div>
                      <NumberInput value={alloc[d.id] ?? 0} onChange={(n) => setAlloc((a) => ({ ...a, [d.id]: Math.min(n, rem) }))} aria-label="Eşleşen tutar" />
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="flex justify-between border-t border-border px-4 py-2.5 text-sm">
              <span className="text-muted">Eşleşen / işlem tutarı</span>
              <span className="num font-semibold">
                {formatMoney(allocatedTry)} / {formatMoney(amountTry)}
              </span>
            </div>
          </Card>
        )}

        {err && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{err}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Vazgeç
          </Button>
          <Button type="submit" size="lg" loading={save.isPending}>
            Kaydet
          </Button>
        </div>
      </form>
    </div>
  );
}
