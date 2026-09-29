"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Download, HandCoins, Send, ArrowLeftRight, Archive } from "lucide-react";
import { useRow, useRpcQuery, useUpdate, type Row } from "@/lib/data";
import { formatDate, formatMoney, isoDate } from "@/lib/format";
import { exportExcel } from "@/lib/excel";
import { TYPE_LABELS } from "@/components/dashboard/types";
import { useOrg } from "@/providers/org-provider";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Stat } from "@/components/ui/stat";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useConfirm } from "@/components/ui/confirm";
import { cn } from "@/lib/utils";
import { AccountForm, ACCOUNT_TYPES } from "./account-form";

type StmtRow = { id: string; txn_date: string; type: string; direction: string; description: string | null; reference: string | null; party: string | null; amount_in: number; amount_out: number; balance: number };

export function AccountDetail({ id }: { id: string }) {
  const router = useRouter();
  const confirm = useConfirm();
  const { isAdmin, canWrite } = useOrg();
  const acc = useRow<Row<"accounts">>("accounts", id);
  const { update } = useUpdate("accounts");
  const [from, setFrom] = React.useState(`${new Date().getFullYear()}-01-01`);
  const [to, setTo] = React.useState(isoDate());
  const stmt = useRpcQuery<StmtRow[]>("account_statement", { p_account: id, p_from: from, p_to: to });
  const [edit, setEdit] = React.useState(false);

  const a = acc.data;
  if (acc.isPending && !a) return <Skeleton className="h-64 rounded-card" />;
  if (!a) return <EmptyState title="Hesap bulunamadı" />;
  const rows = stmt.data ?? [];
  const tin = rows.reduce((s, r) => s + Number(r.amount_in), 0);
  const tout = rows.reduce((s, r) => s + Number(r.amount_out), 0);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        back="/nakit/hesaplar"
        title={a.name}
        description={`${ACCOUNT_TYPES[a.type as keyof typeof ACCOUNT_TYPES]} · ${a.currency}${a.iban ? ` · ${a.iban}` : ""}`}
        actions={
          isAdmin && (
            <>
              <Button size="sm" variant="outline" onClick={() => setEdit(true)}>
                <Pencil /> Düzenle
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  if (await confirm({ title: "Hesap arşivlensin mi?", description: "Hesap listelerden kalkar, hareketleri korunur.", confirmText: "Arşivle" })) {
                    await update(a.id, { is_active: false }, "Hesap arşivlendi");
                    router.replace("/nakit/hesaplar");
                  }
                }}
              >
                <Archive /> Arşivle
              </Button>
            </>
          )
        }
      />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Güncel bakiye" value={Number(a.balance)} currency={a.currency} tone={Number(a.balance) < 0 ? "danger" : "primary"} />
        <Stat label="Dönem girişleri" value={tin} currency={a.currency} tone="success" />
        <Stat label="Dönem çıkışları" value={tout} currency={a.currency} tone="danger" className="col-span-2 lg:col-span-1" />
      </div>
      {canWrite && (
        <div className="mb-4 flex flex-wrap gap-2">
          <Button asChild size="sm" variant="success">
            <Link href={`/nakit/hareketler/yeni?tip=tahsilat&hesap=${a.id}`}>
              <HandCoins /> Tahsilat
            </Link>
          </Button>
          <Button asChild size="sm" variant="danger">
            <Link href={`/nakit/hareketler/yeni?tip=odeme&hesap=${a.id}`}>
              <Send /> Ödeme
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`/nakit/hareketler/yeni?tip=virman&hesap=${a.id}`}>
              <ArrowLeftRight /> Virman
            </Link>
          </Button>
        </div>
      )}
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" aria-label="Başlangıç" />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" aria-label="Bitiş" />
        <Button
          size="sm"
          variant="outline"
          className="ml-auto"
          onClick={() =>
            exportExcel(`hesap-${a.name}`, [
              {
                name: "Hareketler",
                title: `${a.name} hesap hareketleri (${formatDate(from)} - ${formatDate(to)})`,
                rows,
                columns: [
                  { header: "Tarih", value: (r) => r.txn_date, type: "date" },
                  { header: "İşlem", value: (r) => TYPE_LABELS[r.type] ?? r.type },
                  { header: "Cari / karşı hesap", value: (r) => r.party, width: 30 },
                  { header: "Açıklama", value: (r) => r.description, width: 30 },
                  { header: "Giriş", value: (r) => Number(r.amount_in), type: "money" },
                  { header: "Çıkış", value: (r) => Number(r.amount_out), type: "money" },
                  { header: "Bakiye", value: (r) => Number(r.balance), type: "money" },
                ],
              },
            ])
          }
        >
          <Download /> Excel
        </Button>
      </div>
      <DataTable
        rows={rows}
        loading={stmt.isPending}
        rowKey={(r) => r.id}
        onRowClick={(r) => router.push(`/nakit/hareketler/detay?id=${r.id}`)}
        initialSort={{ key: "d", dir: "desc" }}
        columns={[
          { key: "d", header: "Tarih", sortValue: (r) => r.txn_date, cell: (r) => formatDate(r.txn_date) },
          {
            key: "t",
            header: "İşlem",
            sortValue: (r) => `${r.party ?? ""} ${r.description ?? ""} ${TYPE_LABELS[r.type] ?? r.type}`,
            cell: (r) => (
              <div>
                <div className="font-medium">{TYPE_LABELS[r.type] ?? r.type}</div>
                <div className="text-xs text-muted">{[r.party, r.description].filter(Boolean).join(" · ")}</div>
              </div>
            ),
          },
          { key: "in", header: "Giriş", align: "right", sortValue: (r) => Number(r.amount_in || 0), cell: (r) => <span className="num text-success">{Number(r.amount_in) ? formatMoney(r.amount_in, a.currency) : ""}</span> },
          { key: "out", header: "Çıkış", align: "right", sortValue: (r) => Number(r.amount_out || 0), cell: (r) => <span className="num text-danger">{Number(r.amount_out) ? formatMoney(r.amount_out, a.currency) : ""}</span> },
          { key: "b", header: "Bakiye", align: "right", hideBelow: "md", sortValue: (r) => Number(r.balance || 0), cell: (r) => <span className={cn("num font-semibold", Number(r.balance) < 0 && "text-danger")}>{formatMoney(r.balance, a.currency)}</span> },
        ]}
        mobileRow={(r) => (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate font-medium">{TYPE_LABELS[r.type] ?? r.type} {r.party ? `· ${r.party}` : ""}</div>
              <div className="text-xs text-muted">{formatDate(r.txn_date)} · Bakiye {formatMoney(r.balance, a.currency)}</div>
            </div>
            <span className={cn("num font-semibold", Number(r.amount_in) ? "text-success" : "text-danger")}>
              {Number(r.amount_in) ? "+" + formatMoney(r.amount_in, a.currency) : "−" + formatMoney(r.amount_out, a.currency)}
            </span>
          </div>
        )}
        empty={<EmptyState title="Bu dönemde hareket yok" />}
      />
      <Dialog open={edit} onOpenChange={setEdit}>
        <DialogContent title="Hesabı düzenle" className="sm:max-w-xl">
          <AccountForm account={a} onDone={() => setEdit(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
