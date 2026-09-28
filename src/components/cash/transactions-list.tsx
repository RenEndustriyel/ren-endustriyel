"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, Plus, Wallet, Wand2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useAccounts, useRows, type Row } from "@/lib/data";
import { formatDate, formatMoney, isoDate } from "@/lib/format";
import { exportExcel } from "@/lib/excel";
import { reconcileContactAllocations } from "@/lib/reconcile-allocations";
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
  const qc = useQueryClient();
  const { org, canWrite } = useOrg();
  const accounts = useAccounts();
  const d = new Date();
  const [from, setFrom] = React.useState(isoDate(new Date(d.getFullYear(), d.getMonth(), 1)));
  const [to, setTo] = React.useState(isoDate());
  const [activePreset, setActivePreset] = React.useState<"today" | "yesterday" | "week" | "month" | "year" | "all">("month");
  const [dir, setDir] = React.useState<"all" | "in" | "out" | "transfer">("all");
  const [acc, setAcc] = React.useState("");
  const [q, setQ] = React.useState("");
  const [reconciling, setReconciling] = React.useState(false);

  const applyPreset = (preset: "today" | "yesterday" | "week" | "month" | "year" | "all") => {
    setActivePreset(preset);
    const today = new Date();
    if (preset === "all") {
      setFrom("");
      setTo("");
    } else if (preset === "today") {
      setFrom(isoDate(today));
      setTo(isoDate(today));
    } else if (preset === "yesterday") {
      const yest = new Date(today);
      yest.setDate(today.getDate() - 1);
      setFrom(isoDate(yest));
      setTo(isoDate(yest));
    } else if (preset === "week") {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - 6);
      setFrom(isoDate(weekStart));
      setTo(isoDate(today));
    } else if (preset === "month") {
      setFrom(isoDate(new Date(today.getFullYear(), today.getMonth(), 1)));
      setTo(isoDate(today));
    } else if (preset === "year") {
      setFrom(`${today.getFullYear()}-01-01`);
      setTo(isoDate(today));
    }
  };

  const handleAutoReconcile = async () => {
    if (!org?.id) return;
    setReconciling(true);
    try {
      const count = await reconcileContactAllocations(org.id);
      if (count > 0) {
        toast.success(`${count} adet açık fatura ve tahsilat başarıyla otomatik eşleştirildi!`);
      } else {
        toast.info("Açıkta bekleyen eşleştirilmemiş tahsilat bulunamadı.");
      }
      txns.refetch();
      qc.invalidateQueries({ queryKey: ["contact-balances"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["documents"] });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Eşleştirme yapılamadı";
      toast.error(msg);
    } finally {
      setReconciling(false);
    }
  };

  const txns = useRows<Txn>("transactions", {
    select:
      "*, contact:contacts(name), employee:employees(name), account:accounts!transactions_account_id_fkey(name), to_account:accounts!transactions_to_account_id_fkey(name), category:categories(name)",
    params: [from, to],
    filter: (x) => {
      let query = x;
      if (from) query = query.gte("txn_date", from);
      if (to) query = query.lte("txn_date", to);
      return query;
    },
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
            {canWrite && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleAutoReconcile}
                disabled={reconciling}
                className="gap-1.5 font-semibold text-text shadow-2xs hover:border-primary/50"
                title="Açık carilerdeki tahsilatları faturalarla otomatik eşleştir"
              >
                <Wand2 className={cn("size-3.5 text-primary", reconciling && "animate-spin")} />
                <span>{reconciling ? "Eşleştiriliyor..." : "Otomatik Eşleştir"}</span>
              </Button>
            )}
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
                      { header: "Ödeme Yöntemi", value: (t) => t.method === "credit_card" ? "Kredi Kartı" : t.method === "bank_transfer" ? "Havale/EFT" : "Nakit" },
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

      {/* Hızlı Dönem Filtreleri */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5 rounded-xl border border-border/70 bg-surface/80 p-2 shadow-2xs">
        <span className="mr-1 text-[11px] font-bold uppercase tracking-wider text-muted">Dönem:</span>
        {(
          [
            { id: "today", label: "Bugün" },
            { id: "yesterday", label: "Dün" },
            { id: "week", label: "Bu Hafta" },
            { id: "month", label: "Bu Ay" },
            { id: "year", label: "Bu Yıl" },
            { id: "all", label: "Tümü" },
          ] as const
        ).map((p) => (
          <Button
            key={p.id}
            type="button"
            size="sm"
            variant={activePreset === p.id ? "primary" : "ghost"}
            className={cn("h-7 px-2.5 text-xs font-semibold rounded-lg", activePreset === p.id && "shadow-2xs")}
            onClick={() => applyPreset(p.id)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center">
        <SearchInput value={q} onChange={setQ} className="lg:w-64" />
        <div className="flex gap-2">
          <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setActivePreset("all"); }} aria-label="Başlangıç" />
          <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setActivePreset("all"); }} aria-label="Bitiş" />
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
            { value: "in", label: "Giriş (Tahsilat)" },
            { value: "out", label: "Çıkış (Ödeme)" },
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
                <div className="font-medium text-text">{party(t)}</div>
                <div className="text-xs text-muted">{[TYPE_LABELS[t.type], t.description].filter(Boolean).join(" · ")}</div>
              </div>
            ),
          },
          { key: "a", header: "Hesap", hideBelow: "md", cell: (t) => <span className="text-muted font-medium">{t.account?.name ?? "Portföy"}</span> },
          {
            key: "amt",
            header: "Tutar",
            align: "right",
            sortValue: (t) => Number(t.amount_try),
            cell: (t) => {
              const m = t.method;
              const badgeText = m === "credit_card" ? "(KK)" : m === "bank_transfer" ? "(Hav/Eft)" : "(P)";
              const badgeTitle = m === "credit_card" ? "Kredi Kartı" : m === "bank_transfer" ? "Havale / EFT" : "Peşin / Nakit";
              const badgeStyle =
                m === "credit_card"
                  ? "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/25"
                  : m === "bank_transfer"
                    ? "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/25"
                    : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25";

              return (
                <div className="flex items-center justify-end gap-2">
                  <span className={cn("num font-semibold", t.direction === "in" ? "text-success" : t.direction === "out" ? "text-danger" : "")}>
                    {t.direction === "in" ? "+" : t.direction === "out" ? "−" : ""}
                    {formatMoney(t.amount, t.currency)}
                  </span>
                  <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded border tracking-wide", badgeStyle)} title={badgeTitle}>
                    {badgeText}
                  </span>
                </div>
              );
            },
          },
        ]}
        mobileRow={(t) => {
          const m = t.method;
          const badgeText = m === "credit_card" ? "(KK)" : m === "bank_transfer" ? "(Hav/Eft)" : "(P)";
          return (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-medium">{party(t)}</div>
                <div className="text-xs text-muted">{formatDate(t.txn_date)} · {TYPE_LABELS[t.type]}</div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={cn("num font-semibold", t.direction === "in" ? "text-success" : t.direction === "out" ? "text-danger" : "")}>
                  {formatMoney(t.amount, t.currency)}
                </span>
                <span className="text-[10px] font-bold px-1 rounded bg-surface-2 text-muted">{badgeText}</span>
              </div>
            </div>
          );
        }}
        empty={<EmptyState icon={<Wallet />} title="Bu dönemde işlem yok" description="Farklı bir tarih aralığı veya 'Tümü' seçerek filtreleyin." />}
      />
    </div>
  );
}
