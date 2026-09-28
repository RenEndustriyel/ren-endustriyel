"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, HandCoins, Send, FileText, Download, Share2, MapPin, Phone, Mail, ShoppingCart } from "lucide-react";
import { useRow, useRows, useRpcQuery, useUpdate, useContactBalances, type Row } from "@/lib/data";
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
  const [editOpen, setEditOpen] = React.useState(false);
  const firstOfYear = `${new Date().getFullYear()}-01-01`;
  const [from, setFrom] = React.useState(firstOfYear);
  const [to, setTo] = React.useState(isoDate());

  const statement = useRpcQuery<StatementRow[]>("contact_statement", { p_contact: id, p_from: null, p_to: to }, { enabled: !!id });
  const docs = useRows<Row<"documents">>("documents", {
    params: ["contact", id],
    filter: (q) => q.eq("contact_id", id),
    order: [{ column: "issue_date", ascending: false }],
  });

  const c = contact.data;
  if (contact.isPending && !c) return <Skeleton className="h-64 rounded-card" />;
  if (!c) return <EmptyState title="Cari bulunamadı" />;

  const balance = Number(balances.data?.find((b) => b.contact_id === id)?.balance ?? c.opening_balance ?? 0);
  const all = statement.data ?? [];
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
                  <thead className="bg-surface-2 text-[11px] uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-3 py-2 text-left">Tarih</th>
                      <th className="px-3 py-2 text-left">İşlem</th>
                      <th className="hidden px-3 py-2 text-left md:table-cell">Açıklama</th>
                      <th className="px-3 py-2 text-right">Borç</th>
                      <th className="px-3 py-2 text-right">Alacak</th>
                      <th className="px-3 py-2 text-right">Bakiye</th>
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
                    </tr>
                    {rows.map((r) => (
                      <tr
                        key={`${r.kind}-${r.ref_id}`}
                        className={cn(r.kind === "document" && "cursor-pointer hover:bg-surface-2")}
                        onClick={() => r.kind === "document" && router.push(`${DOC_TYPES[r.ref_type as DocType]?.base ?? "/satislar/faturalar"}/detay?id=${r.ref_id}`)}
                      >
                        <td className="px-3 py-2 whitespace-nowrap">{formatDate(r.entry_date)}</td>
                        <td className="px-3 py-2">
                          <div className="font-medium">{DOC_TYPES[r.ref_type as DocType]?.label ?? TYPE_LABELS[r.ref_type] ?? "Açılış"}</div>
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
                    <Badge tone={PAYMENT_STATUS[d.payment_status].tone}>{PAYMENT_STATUS[d.payment_status].label}</Badge>
                  ) : (
                    <Badge>{STATUS_LABEL[d.status]}</Badge>
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
    </div>
  );
}
