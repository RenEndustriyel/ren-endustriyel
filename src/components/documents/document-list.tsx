"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Download, FileText } from "lucide-react";
import { useRows, type Row } from "@/lib/data";
import { DOC_TYPES, PAYMENT_STATUS, STATUS_LABEL, type DocType } from "@/lib/doc-types";
import { formatDate, formatMoney, isoDate } from "@/lib/format";
import { exportExcel } from "@/lib/excel";
import { useOrg } from "@/providers/org-provider";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { SearchInput, matches } from "@/components/ui/search-input";
import { Segmented } from "@/components/ui/segmented";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Stat } from "@/components/ui/stat";
import { cn } from "@/lib/utils";

type Doc = Row<"documents"> & { contact: { name: string } | null; category: { name: string } | null };

type Period = "month" | "last_month" | "year" | "all" | "custom";

function periodRange(p: Period, custom: { from: string; to: string }) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const f = (d: Date) => isoDate(d);
  switch (p) {
    case "month":
      return { from: f(new Date(y, m, 1)), to: f(new Date(y, m + 1, 0)) };
    case "last_month":
      return { from: f(new Date(y, m - 1, 1)), to: f(new Date(y, m, 0)) };
    case "year":
      return { from: `${y}-01-01`, to: `${y}-12-31` };
    case "custom":
      return custom;
    default:
      return { from: "1900-01-01", to: "2999-12-31" };
  }
}

export function DocumentList({ type, title, newLabel }: { type: DocType; title?: string; newLabel?: string }) {
  const router = useRouter();
  const cfg = DOC_TYPES[type];
  const { canWrite } = useOrg();
  const [q, setQ] = React.useState("");
  const [period, setPeriod] = React.useState<Period>("year");
  const [custom, setCustom] = React.useState({ from: `${new Date().getFullYear()}-01-01`, to: isoDate() });
  const [status, setStatus] = React.useState<string>("all");
  const range = periodRange(period, custom);

  const docs = useRows<Doc>("documents", {
    select: "*, contact:contacts(name), category:categories(name)",
    params: [type, range.from, range.to],
    filter: (x) => x.eq("doc_type", type).gte("issue_date", range.from).lte("issue_date", range.to),
    order: [{ column: "issue_date", ascending: false }, { column: "created_at", ascending: false }],
  });

  const today = isoDate();
  const remaining = (d: Doc) => Math.max(Number(d.total) - Number(d.paid_amount), 0);
  const isOverdue = (d: Doc) => cfg.payable && !!d.due_date && d.due_date < today && remaining(d) > 0.004 && d.status !== "cancelled";

  const all = docs.data ?? [];
  const rows = all.filter((d) => {
    const name = d.contact?.name ?? (d.contact_snapshot as { name?: string } | null)?.name ?? d.category?.name ?? "";
    if (!matches(`${d.number ?? ""} ${name} ${d.description ?? ""}`, q)) return false;
    if (status === "all") return true;
    if (status === "open") return cfg.payable ? remaining(d) > 0.004 && d.status !== "cancelled" && d.status !== "draft" : !["converted", "cancelled", "rejected"].includes(d.status);
    if (status === "overdue") return isOverdue(d);
    if (status === "paid") return d.payment_status === "paid";
    return d.status === status;
  });

  const sumTry = rows.filter((d) => d.status !== "cancelled" && d.status !== "draft").reduce((s, d) => s + Number(d.total_try), 0);
  const openTry = rows.filter((d) => d.status !== "cancelled" && d.status !== "draft").reduce((s, d) => s + remaining(d) * Number(d.exchange_rate), 0);
  const overdueTry = rows.filter(isOverdue).reduce((s, d) => s + remaining(d) * Number(d.exchange_rate), 0);

  const party = (d: Doc) => d.contact?.name ?? (d.contact_snapshot as { name?: string } | null)?.name ?? d.category?.name ?? (d.doc_type === "pos_sale" ? "Perakende" : "—");

  const statusBadge = (d: Doc) => {
    if (d.status === "draft") return <Badge>Taslak</Badge>;
    if (d.status === "cancelled") return <Badge tone="danger">İptal</Badge>;
    if (cfg.payable) {
      if (isOverdue(d)) return <Badge tone="danger">{Math.round((new Date(today).getTime() - new Date(d.due_date!).getTime()) / 864e5)} gün gecikti</Badge>;
      const ps = PAYMENT_STATUS[d.payment_status];
      return <Badge tone={ps.tone}>{ps.label}</Badge>;
    }
    return <Badge tone={d.status === "accepted" || d.status === "converted" ? "success" : d.status === "rejected" ? "danger" : "neutral"}>{STATUS_LABEL[d.status]}</Badge>;
  };

  const columns: Column<Doc>[] = [
    { key: "date", header: "Tarih", sortValue: (d) => d.issue_date, cell: (d) => <span className="whitespace-nowrap">{formatDate(d.issue_date)}</span> },
    {
      key: "party",
      header: type === "expense" ? "Açıklama" : cfg.contactLabel,
      sortValue: (d) => party(d),
      cell: (d) => (
        <div className="min-w-0">
          <div className="font-medium">{type === "expense" ? d.description || party(d) : party(d)}</div>
          <div className="text-xs text-muted">{d.number ?? "Numara bekliyor"}{type === "expense" && d.category ? ` · ${d.category.name}` : ""}</div>
        </div>
      ),
    },
    ...(cfg.payable
      ? [{ key: "due", header: "Vade", hideBelow: "md" as const, sortValue: (d: Doc) => d.due_date ?? "", cell: (d: Doc) => <span className={cn("whitespace-nowrap", isOverdue(d) && "font-medium text-danger")}>{formatDate(d.due_date)}</span> }]
      : []),
    { key: "status", header: "Durum", hideBelow: "md", cell: statusBadge },
    ...(cfg.payable
      ? [{ key: "rem", header: "Kalan", align: "right" as const, hideBelow: "lg" as const, sortValue: (d: Doc) => remaining(d) * Number(d.exchange_rate), cell: (d: Doc) => <span className="num text-muted">{remaining(d) > 0.004 ? formatMoney(remaining(d), d.currency) : "—"}</span> }]
      : []),
    { key: "total", header: "Toplam", align: "right", sortValue: (d) => Number(d.total_try), cell: (d) => <span className="num font-semibold">{formatMoney(d.total, d.currency)}</span> },
  ];

  const statusOptions = cfg.payable
    ? [
        { value: "all", label: "Tümü" },
        { value: "open", label: "Açık" },
        { value: "overdue", label: "Gecikmiş" },
        { value: "paid", label: cfg.side === "sales" ? "Tahsil edildi" : "Ödendi" },
      ]
    : [{ value: "all", label: "Tümü" }, { value: "open", label: "Açık" }, ...(cfg.statuses ?? []).map((s) => ({ value: s.value, label: s.label }))];

  const exportRows = () =>
    exportExcel(cfg.plural.toLocaleLowerCase("tr-TR").replace(/\s+/g, "-"), [
      {
        name: cfg.plural,
        rows,
        columns: [
          { header: "Tarih", value: (d) => d.issue_date, type: "date" },
          { header: "Belge no", value: (d) => d.number },
          { header: cfg.contactLabel, value: (d) => party(d), width: 36 },
          { header: "Açıklama", value: (d) => d.description, width: 30 },
          { header: "Vade", value: (d) => d.due_date, type: "date" },
          { header: "Para birimi", value: (d) => d.currency, width: 8 },
          { header: "Matrah", value: (d) => Number(d.net_total), type: "money" },
          { header: "KDV", value: (d) => Number(d.vat_total), type: "money" },
          { header: "Toplam", value: (d) => Number(d.total), type: "money" },
          { header: "Toplam (TL)", value: (d) => Number(d.total_try), type: "money" },
          { header: "Ödenen", value: (d) => Number(d.paid_amount), type: "money" },
          { header: "Durum", value: (d) => (cfg.payable ? PAYMENT_STATUS[d.payment_status].label : STATUS_LABEL[d.status]) },
        ],
      },
    ]);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={title ?? cfg.plural}
        description={`${rows.length} belge`}
        actions={
          <>
            <Button size="sm" variant="outline" onClick={exportRows}>
              <Download /> <span className="hidden sm:inline">Excel</span>
            </Button>
            {canWrite && (
              <Button asChild size="sm">
                <Link href={type === "pos_sale" ? "/hizli-satis" : `${cfg.base}/yeni`}>
                  <Plus /> {newLabel ?? `Yeni ${cfg.label.toLocaleLowerCase("tr-TR")}`}
                </Link>
              </Button>
            )}
          </>
        }
      />

      <div className={cn("mb-4 grid gap-3", cfg.payable ? "grid-cols-2 lg:grid-cols-3" : "grid-cols-2")}>
        <Stat label="Toplam (TL)" value={sumTry} />
        {cfg.payable && <Stat label={cfg.side === "sales" ? "Tahsil edilecek" : "Ödenecek"} value={openTry} tone="primary" />}
        {cfg.payable && <Stat label="Vadesi geçmiş" value={overdueTry} tone={overdueTry > 0 ? "danger" : undefined} className="col-span-2 lg:col-span-1" />}
        {!cfg.payable && <Stat label="Belge sayısı" value={<span>{rows.length}</span>} />}
      </div>

      <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center">
        <SearchInput value={q} onChange={setQ} placeholder={`No, ${cfg.contactLabel.toLocaleLowerCase("tr-TR")}, açıklama…`} className="lg:w-72" />
        <NativeSelect value={period} onChange={(e) => setPeriod(e.target.value as Period)} className="lg:w-40">
          <option value="month">Bu ay</option>
          <option value="last_month">Geçen ay</option>
          <option value="year">Bu yıl</option>
          <option value="all">Tüm zamanlar</option>
          <option value="custom">Tarih aralığı</option>
        </NativeSelect>
        {period === "custom" && (
          <div className="flex gap-2">
            <Input type="date" value={custom.from} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} />
            <Input type="date" value={custom.to} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} />
          </div>
        )}
        <Segmented value={status} onChange={setStatus} options={statusOptions} className="lg:ml-auto" />
      </div>

      <DataTable
        rows={rows}
        loading={docs.isPending}
        columns={columns}
        rowKey={(d) => d.id}
        initialSort={{ key: "date", dir: "desc" }}
        onRowClick={(d) => router.push(`${cfg.base}/detay?id=${d.id}`)}
        mobileRow={(d) => (
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{type === "expense" ? d.description || party(d) : party(d)}</div>
              <div className="flex items-center gap-2 text-xs text-muted">
                <span>{formatDate(d.issue_date)}</span>
                <span className="truncate">{d.number}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="num font-semibold">{formatMoney(d.total, d.currency)}</span>
              {statusBadge(d)}
            </div>
          </div>
        )}
        empty={<EmptyState icon={<FileText />} title="Belge yok" description="Bu dönemde kayıt bulunamadı." />}
      />
    </div>
  );
}
