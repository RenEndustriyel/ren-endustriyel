"use client";

import * as React from "react";
import { FileSpreadsheet, Upload, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { newId, useAccounts, useCategories, useContacts, useRows, useRpc, useSave, type Row } from "@/lib/data";
import { formatDate, formatMoney } from "@/lib/format";
import { readSpreadsheet, toIsoDate, toNumber } from "@/lib/excel";
import { useOrg } from "@/providers/org-provider";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Line = {
  key: string;
  date: string;
  description: string;
  amount: number;
  balance: number | null;
  reference: string;
  action: "ignore" | "contact" | "category" | "matched";
  contact_id: string | null;
  category_id: string | null;
  matched_id: string | null;
};

const norm = (s: string) => s.toLocaleLowerCase("tr-TR").normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, " ");

export function BankStatementPage() {
  const { org, isAdmin } = useOrg();
  const accounts = useAccounts();
  const contacts = useContacts();
  const expenseCats = useCategories("expense");
  const incomeCats = useCategories("income");
  const saveTxn = useRpc("save_transaction");
  const saveImport = useSave("bank_statement_imports");
  const saveLine = useSave("bank_statement_lines");
  const imports = useRows<Row<"bank_statement_imports"> & { account: { name: string } | null }>("bank_statement_imports", {
    softDelete: false,
    select: "*, account:accounts(name)",
    order: [{ column: "created_at", ascending: false }],
  });
  const banks = (accounts.data ?? []).filter((a) => a.is_active && a.type !== "cash");
  const [accountId, setAccountId] = React.useState("");
  const acc = banks.find((a) => a.id === accountId) ?? banks[0];
  const [file, setFile] = React.useState<{ name: string; headers: string[]; rows: Record<string, unknown>[] } | null>(null);
  const [map, setMap] = React.useState({ date: "", description: "", amount: "", debit: "", credit: "", balance: "", reference: "" });
  const [lines, setLines] = React.useState<Line[] | null>(null);
  const [busy, setBusy] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const existing = useRows<Row<"transactions">>("transactions", {
    params: ["stmt", acc?.id],
    enabled: !!acc,
    filter: (q) => q.or(`account_id.eq.${acc!.id},to_account_id.eq.${acc!.id}`),
  });

  const load = async (f: File) => {
    const d = await readSpreadsheet(f);
    if (!d.rows.length) return toast.error("Dosyada satır yok");
    const guess = (...keys: string[]) => d.headers.find((h) => keys.some((k) => norm(h).includes(k))) ?? "";
    setMap({
      date: guess("tarih", "date", "islem tarihi"),
      description: guess("aciklama", "description", "islem", "detay"),
      amount: guess("tutar", "amount", "islem tutari"),
      debit: guess("borc", "cikis", "odenen"),
      credit: guess("alacak", "giris", "yatan"),
      balance: guess("bakiye", "balance"),
      reference: guess("dekont", "referans", "fis no"),
    });
    setFile({ name: f.name, ...d });
    setLines(null);
  };

  const buildLines = () => {
    if (!file) return;
    const contactList = (contacts.data ?? []).map((c) => ({ id: c.id, key: norm(c.name).split(" ").filter((w) => w.length > 2).slice(0, 2).join(" ") }));
    const used = new Set<string>();
    const out: Line[] = file.rows
      .map((r) => {
        const amount = map.amount ? toNumber(r[map.amount]) : toNumber(r[map.credit]) - Math.abs(toNumber(r[map.debit]));
        const date = toIsoDate(r[map.date]) ?? "";
        const description = String(r[map.description] ?? "").trim();
        return { r, amount, date, description };
      })
      .filter((x) => x.amount && x.date)
      .map((x) => {
        // mevcut hareketle eşleştir (aynı tutar ve yön, ±3 gün)
        const match = (existing.data ?? []).find((t) => {
          if (used.has(t.id) || t.deleted_at) return false;
          const inflow = (t.direction === "in" && t.account_id === acc?.id) || (t.direction === "transfer" && t.to_account_id === acc?.id);
          const amt = inflow ? Number(t.direction === "transfer" ? t.to_amount ?? t.amount : t.amount) : -Number(t.amount);
          const days = Math.abs((new Date(t.txn_date).getTime() - new Date(x.date).getTime()) / 864e5);
          return Math.abs(amt - x.amount) < 0.01 && days <= 3;
        });
        if (match) used.add(match.id);
        const d = norm(x.description);
        const contact = contactList.find((c) => c.key && d.includes(c.key));
        return {
          key: newId(),
          date: x.date,
          description: x.description,
          amount: Math.round(x.amount * 100) / 100,
          balance: map.balance ? toNumber(x.r[map.balance]) : null,
          reference: map.reference ? String(x.r[map.reference] ?? "") : "",
          action: match ? "matched" : contact ? "contact" : "ignore",
          contact_id: contact?.id ?? null,
          category_id: null,
          matched_id: match?.id ?? null,
        } as Line;
      });
    setLines(out);
  };

  const setLine = (i: number, patch: Partial<Line>) => setLines((ls) => ls!.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const process = async () => {
    if (!lines || !acc) return;
    setBusy(true);
    try {
      const importId = newId();
      const dates = lines.map((l) => l.date).sort();
      await saveImport.save({ id: importId, account_id: acc.id, file_name: file?.name, period_from: dates[0], period_to: dates[dates.length - 1], row_count: lines.length });
      let created = 0;
      for (const l of lines) {
        let txnId: string | null = l.matched_id;
        let status: string = l.action === "matched" ? "matched" : "ignored";
        if ((l.action === "contact" && l.contact_id) || (l.action === "category" && l.category_id)) {
          txnId = newId();
          const isIn = l.amount > 0;
          await saveTxn.call({
            p_txn: {
              id: txnId,
              org_id: org!.id,
              type: l.action === "contact" ? (isIn ? "collection" : "payment") : isIn ? "other_income" : "other_expense",
              direction: isIn ? "in" : "out",
              txn_date: l.date,
              account_id: acc.id,
              contact_id: l.action === "contact" ? l.contact_id : null,
              category_id: l.action === "category" ? l.category_id : null,
              amount: Math.abs(l.amount),
              currency: acc.currency,
              exchange_rate: 1,
              method: "bank_transfer",
              description: l.description.slice(0, 200),
              reference: l.reference || null,
            },
            p_allocations: null,
          });
          status = "created";
          created++;
        }
        await saveLine.save({ import_id: importId, line_date: l.date, description: l.description, amount: l.amount, balance: l.balance, reference: l.reference || null, status, transaction_id: txnId });
      }
      toast.success(`${created} yeni hareket oluşturuldu`);
      setFile(null);
      setLines(null);
    } finally {
      setBusy(false);
    }
  };

  const catOptions = (amount: number) => (amount > 0 ? incomeCats.data : expenseCats.data)?.map((c) => ({ value: c.id, label: c.name })) ?? [];
  const contactOptions = (contacts.data ?? []).map((c) => ({ value: c.id, label: c.name, sub: c.tax_number ?? undefined }));

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Banka Ekstresi" description="Bankadan indirdiğiniz Excel/CSV ekstreyi yükleyin, hareketleri eşleştirin" />
      <Card className="mb-4">
        <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label="Banka hesabı" className="sm:w-72">
            <NativeSelect value={acc?.id ?? ""} onChange={(e) => setAccountId(e.target.value)}>
              {banks.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <input ref={fileRef} type="file" accept=".xlsx,.csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) load(f); e.target.value = ""; }} />
          <Button onClick={() => fileRef.current?.click()} disabled={!acc || !isAdmin}>
            <Upload /> Ekstre yükle
          </Button>
          {!banks.length && <p className="text-sm text-muted">Önce Kasa ve Bankalar sayfasından banka hesabı ekleyin.</p>}
        </CardBody>
      </Card>

      {file && !lines && (
        <Card className="mb-4">
          <CardHeader icon={<FileSpreadsheet />} title={`Sütunlar · ${file.name} (${file.rows.length} satır)`} />
          <CardBody className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                ["date", "Tarih *"],
                ["description", "Açıklama *"],
                ["amount", "Tutar (+/-)"],
                ["credit", "Giriş / alacak"],
                ["debit", "Çıkış / borç"],
                ["balance", "Bakiye"],
                ["reference", "Dekont no"],
              ] as const
            ).map(([k, label]) => (
              <Field key={k} label={label}>
                <NativeSelect value={map[k]} onChange={(e) => setMap((m) => ({ ...m, [k]: e.target.value }))}>
                  <option value="">—</option>
                  {file.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            ))}
            <p className="text-xs text-muted sm:col-span-2 lg:col-span-4">Tek bir işaretli &quot;Tutar&quot; sütunu veya ayrı Giriş/Çıkış sütunları seçin.</p>
            <Button className="sm:col-span-2 lg:col-span-1" disabled={!map.date || !map.description || (!map.amount && !map.credit && !map.debit)} onClick={buildLines}>
              Devam
            </Button>
          </CardBody>
        </Card>
      )}

      {lines && (
        <Card className="mb-4">
          <CardHeader
            title={`${lines.length} hareket`}
            action={
              <Button size="sm" onClick={process} loading={busy}>
                <CheckCircle2 /> İşle
              </Button>
            }
          />
          <div className="divide-y divide-border">
            {lines.map((l, i) => (
              <div key={l.key} className="grid gap-2 px-4 py-3 lg:grid-cols-[100px_minmax(0,1fr)_130px_150px_minmax(0,240px)] lg:items-center">
                <span className="text-sm text-muted">{formatDate(l.date)}</span>
                <span className="text-sm">{l.description}</span>
                <span className={cn("num text-sm font-semibold lg:text-right", l.amount > 0 ? "text-success" : "text-danger")}>{formatMoney(l.amount, acc?.currency)}</span>
                {l.action === "matched" ? (
                  <Badge tone="success" className="w-fit">Kayıtlı hareketle eşleşti</Badge>
                ) : (
                  <NativeSelect className="h-9" value={l.action} onChange={(e) => setLine(i, { action: e.target.value as Line["action"] })}>
                    <option value="ignore">Yoksay</option>
                    <option value="contact">{l.amount > 0 ? "Cari tahsilatı" : "Cari ödemesi"}</option>
                    <option value="category">{l.amount > 0 ? "Diğer gelir" : "Masraf / gider"}</option>
                  </NativeSelect>
                )}
                {l.action === "contact" && <Combobox value={l.contact_id} onChange={(c) => setLine(i, { contact_id: c })} options={contactOptions} placeholder="Cari seçin" />}
                {l.action === "category" && <Combobox value={l.category_id} onChange={(c) => setLine(i, { category_id: c })} options={catOptions(l.amount)} placeholder="Kategori seçin" />}
              </div>
            ))}
          </div>
        </Card>
      )}

      {!!imports.data?.length && (
        <Card>
          <CardHeader title="Önceki yüklemeler" />
          <ul className="divide-y divide-border text-sm">
            {imports.data.map((im) => (
              <li key={im.id} className="flex justify-between px-4 py-2.5">
                <span>
                  {im.account?.name} · {im.file_name}
                </span>
                <span className="text-muted">
                  {formatDate(im.period_from)} – {formatDate(im.period_to)} · {im.row_count} satır
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
