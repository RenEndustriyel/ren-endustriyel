"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, Plus, Wallet } from "lucide-react";
import { useAccounts, useRows, type Row } from "@/lib/data";
import { formatDate, formatMoney, isoDate } from "@/lib/format";
import { exportExcel } from "@/lib/excel";
import { TYPE_LABELS } from "@/components/dashboard/types";
import { useOrg } from "@/providers/org-provider";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { SearchInput, matches } from "@/components/ui/search-input";
import { Segmented } from "@/components/ui/segmented";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Stat } from "@/components/ui/stat";
import { cn } from "@/lib/utils";

type Txn = Row<"transactions"> & {
  contact: { name: string } | null;
  employee: { name: string } | null;
  account: { name: string } | null;
  to_account: { name: string } | null;
  category: { name: string } | null;
};

export function TransactionsList() {
  const router = useRouter();
  const { canWrite } = useOrg();
  const accounts = useAccounts();
  const d = new Date();
  const [from, setFrom] = React.useState(isoDate(new Date(d.getFullYear(), d.getMonth(), 1)));
  const [to, setTo] = React.useState(isoDate());
  const [dir, setDir] = React.useState<"all" | "in" | "out" | "transfer">("all");
  const [acc, setAcc] = React.useState("");
  const [q, setQ] = React.useState("");
  const txns = useRows<Txn>("transactions", {
    select:
      "*, contact:contacts(name), employee:employees(name), account:accounts!transactions_account_id_fkey(name), to_account:accounts!transactions_to_account_id_fkey(name), category:categories(name)",
    params: [from, to],
    filter: (x) => x.gte("txn_date", from).lte("txn_date", to),
    order: [{ column: "txn_date", ascending: false }, { column: "created_at", ascending: false }],
  });

  const party = (t: Txn) =>
    t.direction === "transfer" ? `${t.account?.name} → ${t.to_account?.name}` : t.contact?.name ?? t.employee?.name ?? t.category?.name ?? t.description ?? "—";
  const rows = (txns.data ?? []).filter(
    (t) =>
      (dir === "all" || t.direction === dir) &&
      (!acc || t.account_id === acc || t.to_account_id === acc) &&
      matches(`${party(t)} ${t.description ?? ""} ${t.reference ?? ""} ${TYPE_LABELS[t.type] ?? ""}`, q),
  );
  const tin = rows.filter((t) => t.direction === "in" && t.account_id).reduce((s, t) => s + Number(t.amount_try), 0);
  const tout = rows.filter((t) => t.direction === "out" && t.account_id).reduce((s, t) => s + Number(t.amount_try), 0);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Tahsilat ve Ödemeler"
        actions={
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                exportExcel("tahsilat-odemeler", [
                  {
                    name: "Hareketler",
                    rows,
                    columns: [
                      { header: "Tarih", value: (t) => t.txn_date, type: "date" },
                      { header: "İşlem", value: (t) => TYPE_LABELS[t.type] ?? t.type },
                      { header: "Cari / açıklama", value: (t) => party(t), width: 36 },
                      { header: "Hesap", value: (t) => t.account?.name ?? "" },
                      { header: "Açıklama", value: (t) => t.description },
                      { header: "Tutar", value: (t) => Number(t.amount), type: "money" },
                      { header: "Para birimi", value: (t) => t.currency },
                      { header: "Tutar (TL)", value: (t) => Number(t.amount_try), type: "money" },
                    ],
                  },
                ])
              }
            >
              <Download /> <span className="hidden sm:inline">Excel</span>
            </Button>
            {canWrite && (
              <Button asChild size="sm">
                <Link href="/nakit/hareketler/yeni?tip=tahsilat">
                  <Plus /> Yeni işlem
                </Link>
              </Button>
            )}
          </>
        }
      />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Girişler (TL)" value={tin} tone="success" />
        <Stat label="Çıkışlar (TL)" value={tout} tone="danger" />
        <Stat label="Net" value={tin - tout} className="col-span-2 lg:col-span-1" />
      </div>
      <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center">
        <SearchInput value={q} onChange={setQ} className="lg:w-64" />
        <div className="flex gap-2">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Başlangıç" />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Bitiş" />
        </div>
        <NativeSelect value={acc} onChange={(e) => setAcc(e.target.value)} className="lg:w-44">
          <option value="">Tüm hesaplar</option>
          {accounts.data?.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </NativeSelect>
        <Segmented
          value={dir}
          onChange={setDir}
          className="lg:ml-auto"
          options={[
            { value: "all", label: "Tümü" },
            { value: "in", label: "Giriş" },
            { value: "out", label: "Çıkış" },
            { value: "transfer", label: "Virman" },
          ]}
        />
      </div>
      <DataTable
        rows={rows}
        loading={txns.isPending}
        rowKey={(t) => t.id}
        onRowClick={(t) => router.push(`/nakit/hareketler/detay?id=${t.id}`)}
        columns={[
          { key: "d", header: "Tarih", cell: (t) => formatDate(t.txn_date), sortValue: (t) => t.txn_date },
          {
            key: "p",
            header: "Cari / açıklama",
            cell: (t) => (
              <div>
                <div className="font-medium">{party(t)}</div>
                <div className="text-xs text-muted">{[TYPE_LABELS[t.type], t.description].filter(Boolean).join(" · ")}</div>
              </div>
            ),
          },
          { key: "a", header: "Hesap", hideBelow: "md", cell: (t) => <span className="text-muted">{t.account?.name ?? "Portföy"}</span> },
          {
            key: "amt",
            header: "Tutar",
            align: "right",
            sortValue: (t) => Number(t.amount_try),
            cell: (t) => (
              <span className={cn("num font-semibold", t.direction === "in" ? "text-success" : t.direction === "out" ? "text-danger" : "")}>
                {t.direction === "in" ? "+" : t.direction === "out" ? "−" : ""}
                {formatMoney(t.amount, t.currency)}
              </span>
            ),
          },
        ]}
        mobileRow={(t) => (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate font-medium">{party(t)}</div>
              <div className="text-xs text-muted">{formatDate(t.txn_date)} · {TYPE_LABELS[t.type]}</div>
            </div>
            <span className={cn("num font-semibold", t.direction === "in" ? "text-success" : t.direction === "out" ? "text-danger" : "")}>
              {formatMoney(t.amount, t.currency)}
            </span>
          </div>
        )}
        empty={<EmptyState icon={<Wallet />} title="Bu dönemde işlem yok" />}
      />
    </div>
  );
}
