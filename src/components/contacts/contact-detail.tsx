"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, HandCoins, Send, FileText, Download, Share2, MapPin, Phone, Mail, ShoppingCart, Eye, ChevronUp, ChevronDown } from "lucide-react";
import { useRow, useRows, useRpc, useRpcQuery, useUpdate, useContactBalances, type Row } from "@/lib/data";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatDate, formatMoney, isoDate } from "@/lib/format";
import { exportExcel } from "@/lib/excel";
import { DOC_TYPES, PAYMENT_STATUS, STATUS_LABEL, type DocType } from "@/lib/doc-types";
import { TYPE_LABELS } from "@/components/dashboard/types";
import { useOrg } from "@/providers/org-provider";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Stat } from "@/components/ui/stat";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useConfirm } from "@/components/ui/confirm";
import { cn } from "@/lib/utils";
import { ContactForm } from "./contact-form";

type Contact = Row<"contacts">;
type StatementRow = {
  entry_date: string;
  kind: string;
  ref_id: string;
  ref_type: string;
  number: string | null;
  description: string | null;
  debit: number;
  credit: number;
  balance: number;
  due_date: string | null;
};

export function ContactDetail({ id }: { id: string }) {
  const router = useRouter();
  const confirm = useConfirm();
  const { org, canWrite } = useOrg();
  const contact = useRow<Contact>("contacts", id);
  const balances = useContactBalances();
  const { remove } = useUpdate("contacts");
  const delDoc = useRpc("delete_document");
  const { remove: removeTxn } = useUpdate("transactions");
  const qc = useQueryClient();
  const [selectedRow, setSelectedRow] = React.useState<StatementRow | null>(null);
  const [editOpen, setEditOpen] = React.useState(false);

  const getViewUrl = (r: StatementRow) => {
    if (r.kind === "document") {
      if (r.ref_type === "expense") return `/giderler/masraflar/detay?id=${r.ref_id}`;
      return `${DOC_TYPES[r.ref_type as DocType]?.base ?? "/satislar/faturalar"}/detay?id=${r.ref_id}`;
    }
    if (r.kind === "transaction") {
      return `/nakit/hareketler/detay?id=${r.ref_id}`;
    }
    return null;
  };

  const getEditUrl = (r: StatementRow) => {
    if (r.kind === "document") {
      if (r.ref_type === "expense") return `/giderler/masraflar/duzenle?id=${r.ref_id}`;
      return `${DOC_TYPES[r.ref_type as DocType]?.base ?? "/satislar/faturalar"}/duzenle?id=${r.ref_id}`;
    }
    if (r.kind === "transaction") {
      return `/nakit/hareketler/duzenle?id=${r.ref_id}`;
    }
    return null;
  };

  const handleDeleteRow = async (r: StatementRow) => {
    if (r.kind === "document") {
      const label = DOC_TYPES[r.ref_type as DocType]?.label ?? "Belge";
      const ok = await confirm({
        title: `${label} (${r.number || "Taslak"}) silinsin mi?`,
        description: "Stok hareketleri ve ödeme eşleştirmeleri geri alınacaktır. Bu işlem geri alınamaz.",
        danger: true,
        confirmText: "Sil",
      });
      if (!ok) return;
      try {
        await delDoc.call({ p_doc: r.ref_id }, "Belge silindi");
        setSelectedRow(null);
        await Promise.all([
          statement.refetch(),
          docs.refetch(),
          balances.refetch(),
          contact.refetch(),
          qc.invalidateQueries({ queryKey: ["contact_statement"] }),
          qc.invalidateQueries({ queryKey: ["documents"] }),
          qc.invalidateQueries({ queryKey: ["transactions"] }),
          qc.invalidateQueries({ queryKey: ["contact_balances"] }),
          qc.invalidateQueries({ queryKey: ["dashboard_summary"] }),
        ]);
        toast.success("Belge başarıyla silindi");
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Silme işlemi başarısız");
      }
    } else if (r.kind === "transaction") {
      const label = TYPE_LABELS[r.ref_type] ?? "İşlem";
      const ok = await confirm({
        title: `${label} (${r.description || r.number || "Tahsilat/Ödeme"}) silinsin mi?`,
        description: "Hesap bakiyesi ve bağlı belge ödeme durumları güncellenecektir. Bu işlem geri alınamaz.",
        danger: true,
        confirmText: "Sil",
      });
      if (!ok) return;
      try {
        await removeTxn(r.ref_id, "İşlem silindi");
        setSelectedRow(null);
        await Promise.all([
          statement.refetch(),
          docs.refetch(),
          balances.refetch(),
          contact.refetch(),
          qc.invalidateQueries({ queryKey: ["contact_statement"] }),
          qc.invalidateQueries({ queryKey: ["documents"] }),
          qc.invalidateQueries({ queryKey: ["transactions"] }),
          qc.invalidateQueries({ queryKey: ["contact_balances"] }),
          qc.invalidateQueries({ queryKey: ["dashboard_summary"] }),
        ]);
        toast.success("İşlem başarıyla silindi");
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Silme işlemi başarısız");
      }
    }
  };
  const firstOfYear = `${new Date().getFullYear()}-01-01`;
  const [from, setFrom] = React.useState(firstOfYear);
  const [to, setTo] = React.useState(isoDate());

  const statement = useRpcQuery<StatementRow[]>("contact_statement", { p_contact: id, p_from: null, p_to: to }, { enabled: !!id });
  const docs = useRows<Row<"documents">>("documents", {
    params: ["contact", id],
    filter: (q) => q.eq("contact_id", id),
    order: [{ column: "issue_date", ascending: false }],
  });

  const all = React.useMemo(() => {
    const raw = statement.data ?? [];
    if (!docs.data || raw.some((r) => r.ref_type === "sales_order" || r.ref_type === "purchase_order")) {
      return raw;
    }
    const orders = docs.data.filter(
      (d) =>
        (d.doc_type === "sales_order" || d.doc_type === "purchase_order") &&
        d.status !== "draft" &&
        d.status !== "cancelled" &&
        d.status !== "converted"
    );
    if (!orders.length) return raw;

    const merged = [...raw];
    for (const o of orders) {
      const isSales = o.doc_type === "sales_order";
      const amt = Number(o.total_try ?? Number(o.total) * Number(o.exchange_rate || 1));
      merged.push({
        entry_date: o.issue_date,
        kind: "document",
        ref_id: o.id,
        ref_type: o.doc_type,
        number: o.number,
        description: o.description || (isSales ? "Satış Siparişi" : "Satın Alma Siparişi"),
        debit: isSales ? amt : 0,
        credit: isSales ? 0 : amt,
        balance: 0,
        due_date: o.due_date,
      });
    }

    merged.sort((a, b) => a.entry_date.localeCompare(b.entry_date));
    let runBal = 0;
    for (const r of merged) {
      runBal += Number(r.debit) - Number(r.credit);
      r.balance = Math.round(runBal * 100) / 100;
    }
    return merged;
  }, [statement.data, docs.data]);

  const c = contact.data;
  if (contact.isPending && !c) return <Skeleton className="h-64 rounded-card" />;
  if (!c) return <EmptyState title="Cari bulunamadı" />;

  const balance = Number(balances.data?.find((b) => b.contact_id === id)?.balance ?? c.opening_balance ?? 0);
  const before = all.filter((r) => r.entry_date < from);
  const carried = before.length ? Number(before[before.length - 1].balance) : 0;
  const rows = all.filter((r) => r.entry_date >= from);
  const openDocs = (docs.data ?? []).filter((d) => d.payment_status === "unpaid" || d.payment_status === "partial");
  const overdue = openDocs.filter((d) => d.due_date && d.due_date < isoDate()).reduce((s, d) => s + (Number(d.total) - Number(d.paid_amount)) * Number(d.exchange_rate), 0);
  const isSupplier = c.kind === "supplier";
  const phone = (c.mobile || c.phone || "").replace(/\D/g, "");

  const del = async () => {
    if (!(await confirm({ title: `${c.name} silinsin mi?`, description: "Cari listeden kaldırılır. Geçmiş belgeler korunur.", danger: true, confirmText: "Sil" }))) return;
    await remove(c.id, "Cari silindi");
    router.replace(isSupplier ? "/cariler/tedarikciler" : "/cariler/musteriler");
  };

  const exportStatement = () =>
    exportExcel(`ekstre-${c.name}`, [
      {
        name: "Ekstre",
        title: `${c.name} — Hesap Ekstresi (${formatDate(from)} - ${formatDate(to)})`,
        rows: [{ entry_date: from, description: "Devreden bakiye", debit: 0, credit: 0, balance: carried } as StatementRow, ...rows],
        columns: [
          { header: "Tarih", value: (r) => r.entry_date, type: "date" },
          { header: "İşlem", value: (r) => (r.ref_type ? TYPE_LABELS[r.ref_type] ?? DOC_TYPES[r.ref_type as DocType]?.label ?? r.ref_type : "") },
          { header: "Belge no", value: (r) => r.number },
          { header: "Açıklama", value: (r) => r.description, width: 36 },
          { header: "Vade", value: (r) => r.due_date, type: "date" },
          { header: "Borç", value: (r) => Number(r.debit), type: "money" },
          { header: "Alacak", value: (r) => Number(r.credit), type: "money" },
          { header: "Bakiye", value: (r) => Number(r.balance), type: "money" },
        ],
      },
    ]);

  const sharePdf = async () => {
    const { shareStatementPdf } = await import("@/lib/pdf/share");
    await shareStatementPdf({ org: org!, contact: c, rows, carried, from, to });
  };

  const [sortField, setSortField] = React.useState<"date" | "type" | "description" | "debit" | "credit" | "balance">("date");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");

  const handleSort = (field: "date" | "type" | "description" | "debit" | "credit" | "balance") => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const displayRows = React.useMemo(() => {
    return [...rows].sort((a, b) => {
      let va: any = a.entry_date;
      let vb: any = b.entry_date;
      if (sortField === "type") {
        va = (DOC_TYPES[a.ref_type as DocType]?.label ?? TYPE_LABELS[a.ref_type] ?? a.ref_type ?? "") + (a.number ?? "");
        vb = (DOC_TYPES[b.ref_type as DocType]?.label ?? TYPE_LABELS[b.ref_type] ?? b.ref_type ?? "") + (b.number ?? "");
      } else if (sortField === "description") {
        va = a.description ?? "";
        vb = b.description ?? "";
      } else if (sortField === "debit") {
        va = Number(a.debit ?? 0);
        vb = Number(b.debit ?? 0);
        return sortDir === "asc" ? va - vb : vb - va;
      } else if (sortField === "credit") {
        va = Number(a.credit ?? 0);
        vb = Number(b.credit ?? 0);
        return sortDir === "asc" ? va - vb : vb - va;
      } else if (sortField === "balance") {
        va = Number(a.balance ?? 0);
        vb = Number(b.balance ?? 0);
        return sortDir === "asc" ? va - vb : vb - va;
      }
      const r = String(va).localeCompare(String(vb), "tr", { numeric: true });
      return sortDir === "asc" ? r : -r;
    });
  }, [rows, sortField, sortDir]);

  const renderSortHeader = (label: string, field: "date" | "type" | "description" | "debit" | "credit" | "balance", alignRight?: boolean) => (
    <button
      type="button"
      onClick={() => handleSort(field)}
      className={cn(
        "inline-flex items-center gap-1.5 font-semibold transition-colors hover:text-text select-none",
        sortField === field ? "text-primary font-bold" : "text-muted",
        alignRight && "ml-auto"
      )}
    >
      <span>{label}</span>
      {sortField === field ? (
        sortDir === "asc" ? (
          <ChevronUp className="size-3.5 stroke-[2.5]" />
        ) : (
          <ChevronDown className="size-3.5 stroke-[2.5]" />
        )
      ) : (
        <span className="opacity-0 hover:opacity-50 text-[10px]">↕</span>
      )}
    </button>
  );

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        back={isSupplier ? "/cariler/tedarikciler" : "/cariler/musteriler"}
        title={c.name}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Badge tone="primary">{c.kind === "both" ? "Müşteri + Tedarikçi" : c.kind === "customer" ? "Müşteri" : "Tedarikçi"}</Badge>
            {c.tax_number && <span>VKN/TCKN {c.tax_number}{c.tax_office ? ` · ${c.tax_office}` : ""}</span>}
          </span>
        }
        actions={
          canWrite && (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil /> Düzenle
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={del} aria-label="Sil">
                <Trash2 />
              </Button>
            </>
          )
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label={balance >= 0 ? "Bakiye (bize borçlu)" : "Bakiye (biz borçluyuz)"}
          value={Math.abs(balance)}
          tone={balance > 0.004 ? "success" : balance < -0.004 ? "danger" : undefined}
        />
        <Stat label="Açık belge" value={<span>{openDocs.length}</span>} />
        <Stat label="Vadesi geçmiş" value={overdue} tone={overdue > 0 ? "danger" : undefined} />
        <Stat label="Toplam belge" value={<span>{docs.data?.length ?? 0}</span>} />
      </div>

      {canWrite && (
        <div className="mb-4 flex flex-wrap gap-2">
          {c.kind !== "supplier" && (
            <>
              <Button asChild size="sm" variant="success">
                <Link href={`/nakit/hareketler/yeni?tip=tahsilat&cari=${c.id}`}>
                  <HandCoins /> Tahsilat al
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={`/satislar/faturalar/yeni?cari=${c.id}`}>
                  <FileText /> Satış faturası
                </Link>
              </Button>
            </>
          )}
          {c.kind !== "customer" && (
            <>
              <Button asChild size="sm" variant="danger">
                <Link href={`/nakit/hareketler/yeni?tip=odeme&cari=${c.id}`}>
                  <Send /> Ödeme yap
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={`/giderler/alis-faturalari/yeni?cari=${c.id}`}>
                  <ShoppingCart /> Alış faturası
                </Link>
              </Button>
            </>
          )}
        </div>
      )}

      <Tabs defaultValue="ekstre">
        <TabsList className="mb-4">
          <TabsTrigger value="ekstre">Hesap Ekstresi</TabsTrigger>
          <TabsTrigger value="belgeler">Belgeler</TabsTrigger>
          <TabsTrigger value="bilgi">Bilgiler</TabsTrigger>
        </TabsList>

        <TabsContent value="ekstre">
          <Card>
            <div className="flex flex-wrap items-end gap-2 border-b border-border p-3 sm:p-4">
              <label className="flex flex-col gap-1 text-xs text-muted">
                Başlangıç
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-40" />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted">
                Bitiş
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-40" />
              </label>
              <div className="ml-auto flex gap-2">
                <Button size="sm" variant="outline" onClick={exportStatement}>
                  <Download /> Excel
                </Button>
                <Button size="sm" variant="outline" onClick={sharePdf}>
                  <Share2 /> PDF / Paylaş
                </Button>
              </div>
            </div>
            {statement.isPending ? (
              <Skeleton className="m-4 h-40" />
            ) : (
              <div className="thin-scroll overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-2 text-[11px] uppercase tracking-wide text-muted border-b border-border">
                    <tr>
                      <th className="px-3 py-2.5 text-left">{renderSortHeader("Tarih", "date")}</th>
                      <th className="px-3 py-2.5 text-left">{renderSortHeader("İşlem", "type")}</th>
                      <th className="hidden px-3 py-2.5 text-left md:table-cell">{renderSortHeader("Açıklama", "description")}</th>
                      <th className="px-3 py-2.5 text-right">{renderSortHeader("Borç", "debit", true)}</th>
                      <th className="px-3 py-2.5 text-right">{renderSortHeader("Alacak", "credit", true)}</th>
                      <th className="px-3 py-2.5 text-right">{renderSortHeader("Bakiye", "balance", true)}</th>
                      <th className="w-24 px-3 py-2.5 text-right font-semibold">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr className="bg-surface-2/50 text-muted">
                      <td className="px-3 py-2 whitespace-nowrap">{formatDate(from)}</td>
                      <td className="px-3 py-2" colSpan={1}>Devreden</td>
                      <td className="hidden md:table-cell" />
                      <td />
                      <td />
                      <td className="num px-3 py-2 text-right font-medium">{formatMoney(carried)}</td>
                      <td />
                    </tr>
                    {displayRows.map((r) => (
                      <tr
                        key={`${r.kind}-${r.ref_id}`}
                        className="group cursor-pointer transition-colors hover:bg-surface-2/80"
                        onClick={() => setSelectedRow(r)}
                      >
                        <td className="px-3 py-2 whitespace-nowrap">{formatDate(r.entry_date)}</td>
                        <td className="px-3 py-2">
                          <div className="font-medium text-foreground">{DOC_TYPES[r.ref_type as DocType]?.label ?? TYPE_LABELS[r.ref_type] ?? "Açılış"}</div>
                          <div className="text-xs text-muted">{r.number}</div>
                        </td>
                        <td className="hidden px-3 py-2 text-muted md:table-cell">
                          {r.description !== r.number ? r.description : ""}
                          {r.due_date && <span className="ml-1 text-xs">(vade {formatDate(r.due_date)})</span>}
                        </td>
                        <td className="num px-3 py-2 text-right">{Number(r.debit) ? formatMoney(r.debit) : ""}</td>
                        <td className="num px-3 py-2 text-right">{Number(r.credit) ? formatMoney(r.credit) : ""}</td>
                        <td className={cn("num px-3 py-2 text-right font-semibold", Number(r.balance) < 0 ? "text-danger" : "")}>
                          {formatMoney(r.balance)}
                        </td>
                        <td className="px-3 py-2 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          {canWrite && r.kind !== "opening" && (
                            <div className="flex items-center justify-end gap-1 opacity-75 group-hover:opacity-100">
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                className="h-7 w-7 text-muted hover:text-foreground"
                                title="Detayları Görüntüle"
                                onClick={() => {
                                  const u = getViewUrl(r);
                                  if (u) router.push(u);
                                }}
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                className="h-7 w-7 text-muted hover:text-foreground"
                                title="Düzenle"
                                onClick={() => {
                                  const u = getEditUrl(r);
                                  if (u) router.push(u);
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                className="h-7 w-7 text-danger/80 hover:bg-danger/10 hover:text-danger"
                                title="Sil"
                                onClick={() => handleDeleteRow(r)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!rows.length && <p className="p-6 text-center text-sm text-muted">Bu dönemde hareket yok.</p>}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="belgeler">
          <DataTable
            rows={docs.data}
            loading={docs.isPending}
            rowKey={(d) => d.id}
            onRowClick={(d) => router.push(`${DOC_TYPES[d.doc_type as DocType].base}/detay?id=${d.id}`)}
            columns={[
              { key: "date", header: "Tarih", cell: (d) => formatDate(d.issue_date), sortValue: (d) => d.issue_date },
              {
                key: "type",
                header: "Belge",
                cell: (d) => (
                  <div>
                    <div className="font-medium">{DOC_TYPES[d.doc_type as DocType]?.label}</div>
                    <div className="text-xs text-muted">{d.number ?? "Taslak"}</div>
                  </div>
                ),
              },
              { key: "due", header: "Vade", hideBelow: "md", cell: (d) => formatDate(d.due_date) },
              {
                key: "status",
                header: "Durum",
                cell: (d) =>
                  d.payment_status !== "none" ? (
                    <Badge tone={PAYMENT_STATUS[d.payment_status]?.tone ?? "neutral"}>{PAYMENT_STATUS[d.payment_status]?.label ?? "—"}</Badge>
                  ) : (
                    <Badge>{STATUS_LABEL[d.status] ?? d.status}</Badge>
                  ),
              },
              { key: "total", header: "Tutar", align: "right", cell: (d) => <span className="num font-semibold">{formatMoney(d.total, d.currency)}</span>, sortValue: (d) => Number(d.total_try) },
            ]}
            mobileRow={(d) => (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">{DOC_TYPES[d.doc_type as DocType]?.label} · {d.number ?? "Taslak"}</div>
                  <div className="text-xs text-muted">{formatDate(d.issue_date)}</div>
                </div>
                <span className="num font-semibold">{formatMoney(d.total, d.currency)}</span>
              </div>
            )}
            empty={<EmptyState icon={<FileText />} title="Belge yok" />}
          />
        </TabsContent>

        <TabsContent value="bilgi">
          <Card>
            <CardHeader title="İletişim ve Adres" />
            <dl className="grid gap-x-6 gap-y-3 p-4 text-sm sm:grid-cols-2 sm:p-5">
              {[
                ["Yetkili", c.contact_person],
                ["Telefon", c.phone],
                ["Cep", c.mobile],
                ["E-posta", c.email],
                ["Adres", [c.address, c.district, c.city].filter(Boolean).join(", ")],
                ["IBAN", c.iban],
                ["Vade", c.payment_term_days ? `${c.payment_term_days} gün` : null],
                ["Etiketler", (c.tags ?? []).join(", ")],
                ["Not", c.notes],
              ]
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k as string}>
                    <dt className="text-xs text-muted">{k}</dt>
                    <dd className="break-words">{v}</dd>
                  </div>
                ))}
            </dl>
            <div className="flex flex-wrap gap-2 border-t border-border p-4 sm:px-5">
              {phone && (
                <Button asChild size="sm" variant="outline">
                  <a href={`tel:${phone}`}>
                    <Phone /> Ara
                  </a>
                </Button>
              )}
              {phone && (
                <Button asChild size="sm" variant="outline">
                  <a href={`https://wa.me/${phone.startsWith("0") ? "9" + phone : phone.length === 10 ? "90" + phone : phone}`} target="_blank" rel="noreferrer">
                    WhatsApp
                  </a>
                </Button>
              )}
              {c.email && (
                <Button asChild size="sm" variant="outline">
                  <a href={`mailto:${c.email}`}>
                    <Mail /> E-posta
                  </a>
                </Button>
              )}
              {(c.address || c.city) && (
                <Button asChild size="sm" variant="outline">
                  <a href={`https://maps.google.com/?q=${encodeURIComponent([c.address, c.district, c.city].filter(Boolean).join(" "))}`} target="_blank" rel="noreferrer">
                    <MapPin /> Harita
                  </a>
                </Button>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent title="Cariyi düzenle" className="sm:max-w-2xl">
          <ContactForm contact={c} onSaved={() => setEditOpen(false)} onCancel={() => setEditOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedRow} onOpenChange={(o) => !o && setSelectedRow(null)}>
        <DialogContent
          title={
            selectedRow?.kind === "opening"
              ? "Açılış Bakiyesi"
              : `${(selectedRow && (DOC_TYPES[selectedRow.ref_type as DocType]?.label ?? TYPE_LABELS[selectedRow.ref_type])) || "Hareket İşlemi"} ${selectedRow?.number ? `· ${selectedRow.number}` : ""}`
          }
          description="Bu hareket üzerinde detay görüntüleme, düzenleme veya silme işlemi yapabilirsiniz."
          className="sm:max-w-md"
        >
          <div className="space-y-4">
            <div className="space-y-2 rounded-xl bg-surface-2/60 p-3.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted">İşlem Tarihi:</span>
                <span className="font-medium text-foreground">{selectedRow && formatDate(selectedRow.entry_date)}</span>
              </div>
              {selectedRow?.due_date && (
                <div className="flex justify-between">
                  <span className="text-muted">Vade Tarihi:</span>
                  <span className="font-medium text-foreground">{formatDate(selectedRow.due_date)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border/50 pt-1.5">
                <span className="text-muted">İşlem Türü:</span>
                <span className="font-medium text-foreground">
                  {selectedRow?.kind === "opening"
                    ? "Açılış"
                    : selectedRow?.kind === "document"
                      ? (DOC_TYPES[selectedRow.ref_type as DocType]?.label ?? selectedRow.ref_type)
                      : (TYPE_LABELS[selectedRow?.ref_type ?? ""] ?? "Nakit/Banka Hareketi")}
                </span>
              </div>
              <div className="flex justify-between border-t border-border/50 pt-1.5">
                <span className="text-muted">Tutar:</span>
                <span className={cn("num font-bold text-sm", Number(selectedRow?.debit) > 0 ? "text-danger" : "text-success")}>
                  {selectedRow && (Number(selectedRow.debit) > 0 ? `+${formatMoney(selectedRow.debit)} (Borç)` : `-${formatMoney(selectedRow.credit)} (Alacak)`)}
                </span>
              </div>
              {selectedRow?.description && selectedRow.description !== selectedRow.number && (
                <div className="flex justify-between border-t border-border/50 pt-1.5">
                  <span className="text-muted">Açıklama:</span>
                  <span className="font-medium text-foreground">{selectedRow.description}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 pt-2">
              {selectedRow?.kind !== "opening" && (
                <>
                  <Button
                    variant="primary"
                    className="w-full justify-center gap-2 font-medium"
                    onClick={() => {
                      if (selectedRow) {
                        const u = getViewUrl(selectedRow);
                        if (u) router.push(u);
                      }
                    }}
                  >
                    <Eye className="size-4" /> Detayları Görüntüle
                  </Button>

                  {canWrite && (
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        className="justify-center gap-2 font-medium"
                        onClick={() => {
                          if (selectedRow) {
                            const u = getEditUrl(selectedRow);
                            if (u) router.push(u);
                          }
                        }}
                      >
                        <Pencil className="size-4" /> Düzenle
                      </Button>
                      <Button
                        variant="danger"
                        className="justify-center gap-2 font-medium"
                        onClick={() => {
                          if (selectedRow) handleDeleteRow(selectedRow);
                        }}
                      >
                        <Trash2 className="size-4" /> Sil
                      </Button>
                    </div>
                  )}
                </>
              )}

              {selectedRow?.kind === "opening" && (
                <Button
                  variant="outline"
                  className="w-full justify-center gap-2 font-medium"
                  onClick={() => {
                    setSelectedRow(null);
                    setEditOpen(true);
                  }}
                >
                  <Pencil className="size-4" /> Açılış Bakiyesini Düzenle
                </Button>
              )}

              <Button variant="ghost" className="w-full justify-center text-muted" onClick={() => setSelectedRow(null)}>
                Vazgeç / Kapat
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
