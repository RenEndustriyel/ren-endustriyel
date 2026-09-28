"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, UserRound, Pencil, Trash2, CalendarPlus, HandCoins } from "lucide-react";
import { newId, useAccounts, useEmployees, useRow, useRows, useRpc, useSave, useUpdate, type Row } from "@/lib/data";
import { formatDate, formatMoney, isoDate } from "@/lib/format";
import { useOrg } from "@/providers/org-provider";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/money-input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Stat } from "@/components/ui/stat";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useConfirm } from "@/components/ui/confirm";
import { cn } from "@/lib/utils";

type Employee = Row<"employees">;
type Bal = { employee_id: string; balance: number };
const MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

function useEmployeeBalances() {
  return useRows<Bal>("employee_balances" as "employees", { softDelete: false, select: "employee_id, balance" });
}

export function EmployeesPage() {
  const router = useRouter();
  const { isAdmin } = useOrg();
  const employees = useEmployees();
  const balances = useEmployeeBalances();
  const [open, setOpen] = React.useState(false);
  const [showPassive, setShowPassive] = React.useState(false);
  const bal = (id: string) => Number(balances.data?.find((b) => b.employee_id === id)?.balance ?? 0);
  const rows = (employees.data ?? []).filter((e) => showPassive || e.is_active);
  const totalOwed = rows.reduce((s, e) => s + Math.max(bal(e.id), 0), 0);
  const monthly = rows.filter((e) => e.is_active).reduce((s, e) => s + Number(e.salary ?? 0), 0);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Çalışanlar"
        actions={
          isAdmin && (
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus /> Yeni çalışan
            </Button>
          )
        }
      />
      <div className="mb-4 grid grid-cols-2 gap-3">
        <Stat label="Aylık maaş toplamı" value={monthly} />
        <Stat label="Çalışanlara borç" value={totalOwed} tone={totalOwed ? "danger" : undefined} />
      </div>
      <label className="mb-3 flex items-center gap-2 text-sm text-muted">
        <input type="checkbox" checked={showPassive} onChange={(e) => setShowPassive(e.target.checked)} /> İşten ayrılanları göster
      </label>
      <DataTable
        rows={rows}
        loading={employees.isPending}
        rowKey={(e) => e.id}
        onRowClick={(e) => router.push(`/giderler/calisanlar/calisan?id=${e.id}`)}
        columns={[
          {
            key: "n",
            header: "Ad soyad",
            cell: (e) => (
              <div>
                <div className="font-medium">{e.name}</div>
                <div className="text-xs text-muted">{[e.position, e.phone].filter(Boolean).join(" · ")}</div>
              </div>
            ),
          },
          { key: "s", header: "Maaş", align: "right", hideBelow: "md", cell: (e) => <span className="num">{e.salary ? formatMoney(e.salary, e.currency) : "—"}</span> },
          {
            key: "b",
            header: "Bakiye",
            align: "right",
            cell: (e) => (
              <span className={cn("num font-semibold", bal(e.id) > 0.004 ? "text-danger" : bal(e.id) < -0.004 ? "text-success" : "text-muted")}>
                {formatMoney(Math.abs(bal(e.id)))} {bal(e.id) > 0.004 ? "(borç)" : bal(e.id) < -0.004 ? "(avans)" : ""}
              </span>
            ),
          },
        ]}
        empty={<EmptyState icon={<UserRound />} title="Çalışan yok" />}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="Yeni çalışan" className="sm:max-w-xl">
          {open && <EmployeeForm onDone={() => setOpen(false)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmployeeForm({ employee, onDone }: { employee?: Employee; onDone: () => void }) {
  const save = useSave("employees");
  const [v, setV] = React.useState({
    name: employee?.name ?? "",
    national_id: employee?.national_id ?? "",
    position: employee?.position ?? "",
    department: employee?.department ?? "",
    phone: employee?.phone ?? "",
    email: employee?.email ?? "",
    iban: employee?.iban ?? "",
    start_date: employee?.start_date ?? "",
    end_date: employee?.end_date ?? "",
    salary: Number(employee?.salary ?? 0),
    notes: employee?.notes ?? "",
  });
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((x) => ({ ...x, [k]: val }));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.name.trim()) return;
    await save.save(
      {
        ...(employee ? { id: employee.id } : {}),
        ...v,
        name: v.name.trim(),
        start_date: v.start_date || null,
        end_date: v.end_date || null,
        salary: v.salary || null,
        is_active: !v.end_date,
        iban: v.iban.replace(/\s/g, "").toUpperCase() || null,
      },
      employee ? "Güncellendi" : "Çalışan eklendi",
    );
    onDone();
  };
  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <Field label="Ad soyad *" className="sm:col-span-2">
        <Input value={v.name} onChange={(e) => set("name", e.target.value)} autoFocus />
      </Field>
      <Field label="TC kimlik no">
        <Input value={v.national_id} onChange={(e) => set("national_id", e.target.value)} inputMode="numeric" maxLength={11} />
      </Field>
      <Field label="Görevi">
        <Input value={v.position} onChange={(e) => set("position", e.target.value)} />
      </Field>
      <Field label="Telefon">
        <Input value={v.phone} onChange={(e) => set("phone", e.target.value)} type="tel" />
      </Field>
      <Field label="E-posta">
        <Input value={v.email} onChange={(e) => set("email", e.target.value)} type="email" />
      </Field>
      <Field label="Net maaş">
        <NumberInput value={v.salary} onChange={(n) => set("salary", n)} suffix="₺" />
      </Field>
      <Field label="IBAN">
        <Input value={v.iban} onChange={(e) => set("iban", e.target.value)} />
      </Field>
      <Field label="İşe giriş">
        <Input type="date" value={v.start_date} onChange={(e) => set("start_date", e.target.value)} />
      </Field>
      <Field label="İşten çıkış">
        <Input type="date" value={v.end_date} onChange={(e) => set("end_date", e.target.value)} />
      </Field>
      <Field label="Not" className="sm:col-span-2">
        <Textarea rows={2} value={v.notes} onChange={(e) => set("notes", e.target.value)} />
      </Field>
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

type LedgerRow = { id: string; date: string; kind: "accrual" | "payment"; label: string; amount: number; href: string };

export function EmployeeDetail({ id }: { id: string }) {
  const router = useRouter();
  const confirm = useConfirm();
  const { isAdmin, org } = useOrg();
  const emp = useRow<Employee>("employees", id);
  const balances = useEmployeeBalances();
  const docs = useRows<Row<"documents">>("documents", { params: ["emp", id], filter: (q) => q.eq("employee_id", id).eq("doc_type", "salary"), order: [{ column: "issue_date", ascending: false }] });
  const txns = useRows<Row<"transactions">>("transactions", { params: ["emp", id], filter: (q) => q.eq("employee_id", id), order: [{ column: "txn_date", ascending: false }] });
  const { remove } = useUpdate("employees");
  const [edit, setEdit] = React.useState(false);
  const [accrue, setAccrue] = React.useState(false);
  const [pay, setPay] = React.useState(false);

  const e = emp.data;
  if (emp.isPending && !e) return <Skeleton className="h-64 rounded-card" />;
  if (!e) return <EmptyState title="Çalışan bulunamadı" />;
  const balance = Number(balances.data?.find((b) => b.employee_id === id)?.balance ?? 0);
  const ledger: LedgerRow[] = [
    ...(docs.data ?? []).map((d) => ({ id: d.id, date: d.issue_date, kind: "accrual" as const, label: d.description ?? "Maaş tahakkuku", amount: Number(d.total_try), href: `/giderler/maaslar/detay?id=${d.id}` })),
    ...(txns.data ?? []).map((t) => ({ id: t.id, date: t.txn_date, kind: "payment" as const, label: t.type === "advance" ? "Avans" : "Maaş ödemesi", amount: Number(t.amount_try), href: `/nakit/hareketler/detay?id=${t.id}` })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        back="/giderler/calisanlar"
        title={e.name}
        description={
          <span className="flex items-center gap-2">
            {e.position}
            {!e.is_active && <Badge tone="warning">Ayrıldı</Badge>}
          </span>
        }
        actions={
          isAdmin && (
            <>
              <Button size="sm" variant="outline" onClick={() => setEdit(true)}>
                <Pencil /> Düzenle
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Sil"
                onClick={async () => {
                  if (await confirm({ title: `${e.name} silinsin mi?`, danger: true, confirmText: "Sil" })) {
                    await remove(e.id);
                    router.replace("/giderler/calisanlar");
                  }
                }}
              >
                <Trash2 />
              </Button>
            </>
          )
        }
      />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label={balance >= 0 ? "Çalışana borç" : "Verilen avans"} value={Math.abs(balance)} tone={balance > 0.004 ? "danger" : balance < -0.004 ? "success" : undefined} />
        <Stat label="Net maaş" value={Number(e.salary ?? 0)} />
        <Stat label="İşe giriş" value={<span>{formatDate(e.start_date) || "—"}</span>} className="col-span-2 lg:col-span-1" />
      </div>
      {isAdmin && (
        <div className="mb-4 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setAccrue(true)}>
            <CalendarPlus /> Maaş tahakkuku
          </Button>
          <Button size="sm" variant="danger" onClick={() => setPay(true)}>
            <HandCoins /> Ödeme / avans
          </Button>
        </div>
      )}
      <DataTable
        rows={ledger}
        loading={docs.isPending || txns.isPending}
        rowKey={(r) => r.id}
        onRowClick={(r) => router.push(r.href)}
        columns={[
          { key: "d", header: "Tarih", cell: (r) => formatDate(r.date) },
          { key: "l", header: "İşlem", cell: (r) => r.label },
          { key: "a", header: "Tahakkuk", align: "right", cell: (r) => (r.kind === "accrual" ? <span className="num">{formatMoney(r.amount)}</span> : "") },
          { key: "p", header: "Ödeme", align: "right", cell: (r) => (r.kind === "payment" ? <span className="num text-danger">{formatMoney(r.amount)}</span> : "") },
        ]}
        empty={<EmptyState title="Hareket yok" />}
      />
      {e.iban && (
        <Card className="mt-4">
          <CardBody className="text-sm">
            <span className="text-muted">IBAN:</span> {e.iban}
          </CardBody>
        </Card>
      )}
      <Dialog open={edit} onOpenChange={setEdit}>
        <DialogContent title="Çalışanı düzenle" className="sm:max-w-xl">
          {edit && <EmployeeForm employee={e} onDone={() => setEdit(false)} />}
        </DialogContent>
      </Dialog>
      <Dialog open={accrue} onOpenChange={setAccrue}>
        <DialogContent title="Maaş tahakkuku">{accrue && <AccrualForm employee={e} orgId={org!.id} onDone={() => setAccrue(false)} />}</DialogContent>
      </Dialog>
      <Dialog open={pay} onOpenChange={setPay}>
        <DialogContent title="Ödeme / avans">{pay && <PayForm employee={e} orgId={org!.id} openDocs={(docs.data ?? []).filter((d) => d.payment_status !== "paid")} onDone={() => setPay(false)} />}</DialogContent>
      </Dialog>
    </div>
  );
}

function AccrualForm({ employee, orgId, onDone }: { employee: Employee; orgId: string; onDone: () => void }) {
  const save = useRpc("save_document");
  const cats = useRows<Row<"categories">>("categories", { params: ["salarycat"], filter: (q) => q.eq("type", "expense").eq("name", "Maaş") });
  const now = new Date();
  const [month, setMonth] = React.useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const [amount, setAmount] = React.useState(Number(employee.salary ?? 0));
  const [date, setDate] = React.useState(isoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)));
  const label = `${MONTHS[Number(month.slice(5)) - 1]} ${month.slice(0, 4)} maaşı`;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    await save.call(
      {
        p_doc: { id: newId(), org_id: orgId, doc_type: "salary", status: "approved", issue_date: date, due_date: date, employee_id: employee.id, category_id: cats.data?.[0]?.id ?? null, description: `${employee.name} · ${label}`, currency: "TRY", exchange_rate: 1 },
        p_lines: [{ description: label, quantity: 1, unit_price: amount, vat_rate: 0 }],
        p_payment: null,
      },
      "Maaş tahakkuk edildi",
    );
    onDone();
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Dönem">
        <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
      </Field>
      <Field label="Tutar (net)">
        <NumberInput value={amount} onChange={setAmount} suffix="₺" />
      </Field>
      <Field label="Tahakkuk / ödeme tarihi">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <Button type="submit" loading={save.isPending}>
        Tahakkuk et
      </Button>
    </form>
  );
}

function PayForm({ employee, orgId, openDocs, onDone }: { employee: Employee; orgId: string; openDocs: Row<"documents">[]; onDone: () => void }) {
  const accounts = useAccounts();
  const save = useRpc("save_transaction");
  const active = (accounts.data ?? []).filter((a) => a.is_active && a.currency === "TRY");
  const [acc, setAcc] = React.useState("");
  const [type, setType] = React.useState<"salary" | "advance">(openDocs.length ? "salary" : "advance");
  const [amount, setAmount] = React.useState(openDocs.reduce((s, d) => s + Number(d.total) - Number(d.paid_amount), 0) || Number(employee.salary ?? 0));
  const [date, setDate] = React.useState(isoDate());
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const accountId = acc || active[0]?.id;
    if (!accountId || !amount) return;
    // eski tahakkuklardan başlayarak eşleştir
    let left = amount;
    const allocs: { document_id: string; amount: number }[] = [];
    if (type === "salary") {
      for (const d of [...openDocs].sort((a, b) => a.issue_date.localeCompare(b.issue_date))) {
        if (left <= 0) break;
        const rem = Number(d.total) - Number(d.paid_amount);
        const use = Math.min(rem, left);
        if (use > 0) allocs.push({ document_id: d.id, amount: use });
        left -= use;
      }
    }
    await save.call(
      {
        p_txn: { id: newId(), org_id: orgId, type, direction: "out", txn_date: date, account_id: accountId, employee_id: employee.id, amount, currency: "TRY", exchange_rate: 1, method: "bank_transfer", description: `${employee.name} · ${type === "advance" ? "avans" : "maaş ödemesi"}` },
        p_allocations: allocs,
      },
      "Ödeme kaydedildi",
    );
    onDone();
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Tür">
        <NativeSelect value={type} onChange={(e) => setType(e.target.value as "salary" | "advance")}>
          <option value="salary">Maaş ödemesi</option>
          <option value="advance">Avans</option>
        </NativeSelect>
      </Field>
      <Field label="Hesap">
        <NativeSelect value={acc || active[0]?.id || ""} onChange={(e) => setAcc(e.target.value)}>
          {active.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Tutar">
        <NumberInput value={amount} onChange={setAmount} suffix="₺" />
      </Field>
      <Field label="Tarih">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <Button type="submit" loading={save.isPending}>
        Kaydet
      </Button>
      <p className="text-xs text-muted">
        Maaş ödemesi açık tahakkuklarla eskiden yeniye eşleştirilir. <Link href="/nakit/hesaplar" className="text-primary">Hesaplar</Link>
      </p>
    </form>
  );
}
