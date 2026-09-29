"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Pencil,
  Trash2,
  Share2,
  Printer,
  Download,
  HandCoins,
  Send,
  ArrowRightLeft,
  Copy,
  MoreHorizontal,
  Ban,
  CheckCircle2,
  Link2,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useRows, useRpc, useUnits, useProducts, useContactBalances, type Row } from "@/lib/data";
import { DOC_TYPES, PAYMENT_STATUS, STATUS_LABEL, docFlow, type DocType } from "@/lib/doc-types";
import { formatDate, formatMoney, formatNumber, formatQty, isoDate } from "@/lib/format";
import { useOrg } from "@/providers/org-provider";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useConfirm } from "@/components/ui/confirm";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown";
import { PaymentDialog } from "@/components/cash/payment-dialog";
import { DocumentPrintModal } from "./document-print-modal";
import { useDocument } from "./document-editor";
import { Attachments } from "@/components/expenses/attachments";
import { cn } from "@/lib/utils";

type Alloc = { id: string; amount: number; transaction: Row<"transactions"> & { account: { name: string } | null } };

export function DocumentView({ id, type }: { id: string; type: DocType }) {
  const router = useRouter();
  const confirm = useConfirm();
  const { org, canWrite } = useOrg();
  const q = useDocument(id);
  const units = useUnits();
  const products = useProducts();
  const setStatus = useRpc("set_document_status");
  const del = useRpc("delete_document");
  const [payOpen, setPayOpen] = React.useState(false);
  const [printOpen, setPrintOpen] = React.useState(false);

  const allocs = useQuery({
    queryKey: ["allocs", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_allocations")
        .select("id, amount, transaction:transactions(*, account:accounts!transactions_account_id_fkey(name))")
        .eq("document_id", id);
      if (error) throw error;
      return (data as unknown as Alloc[]).filter((a) => a.transaction && !a.transaction.deleted_at);
    },
  });
  const related = useRows<Row<"documents">>("documents", {
    params: ["related", id],
    filter: (x) => x.eq("source_document_id", id),
  });

  const d = q.data;
  const contact = useRows<Row<"contacts">>("contacts");
  const contactBalances = useContactBalances();
  if (q.isPending && !d) return <Skeleton className="mx-auto h-96 max-w-5xl rounded-card" />;
  if (!d || d.deleted_at) return <EmptyState title="Belge bulunamadı" description="Silinmiş olabilir." />;

  const cfg = DOC_TYPES[d.doc_type as DocType] ?? DOC_TYPES[type] ?? DOC_TYPES.purchase_invoice;
  const snap = ((d.contact_snapshot as Record<string, string | null>) ?? {}) || {};
  const remaining = Math.max(Number(d.total || 0) - Number(d.paid_amount || 0), 0);
  const flow = docFlow((d.doc_type as DocType) ?? type);
  const overdue = cfg.payable && d.due_date && d.due_date < isoDate() && remaining > 0.004;
  const unitName = (uid: string | null) => units.data?.find((u) => u.id === uid)?.name ?? "";
  const rawLines = Array.isArray(d.lines) ? d.lines : [];
  const lines = rawLines.map((l) => ({ ...l, unit_name: unitName(l.unit_id), product_name: products.data?.find((p) => p.id === l.product_id)?.name }));

  const currentContactBalance = d.contact_id
    ? (contactBalances.data?.find((b) => b.contact_id === d.contact_id)?.balance ?? null)
    : null;

  const balanceInfo = (() => {
    if (!d || !d.contact_id || currentContactBalance === null || currentContactBalance === undefined) return null;
    const isSales = d.doc_type?.startsWith("sales") || d.doc_type === "pos_sale" || d.doc_type === "quote";
    const docAmtTry = Number(d.total_try ?? Number(d.total || 0) * Number(d.exchange_rate || 1));
    const thisDocAmt = Number(d.total || 0);
    const isActiveInBalance = d.status !== "draft" && d.status !== "cancelled";

    let prevBal = 0;
    let curBal = Number(currentContactBalance || 0);

    if (isActiveInBalance) {
      prevBal = isSales ? curBal - docAmtTry : curBal + docAmtTry;
    } else {
      prevBal = curBal;
      curBal = isSales ? prevBal + docAmtTry : prevBal - docAmtTry;
    }

    return {
      previous_balance: Math.round((prevBal || 0) * 100) / 100,
      this_amount: thisDocAmt,
      current_balance: Math.round((curBal || 0) * 100) / 100,
    };
  })();

  const docForPdf = { ...d, lines, contact_balance_info: balanceInfo };
  const phone = (contact.data?.find((c) => c.id === d.contact_id)?.mobile ?? "").replace(/\D/g, "");

  const pdf = async (mode: "share" | "download" | "open") => {
    const { shareDocumentPdf } = await import("@/lib/pdf/share");
    await shareDocumentPdf(org!, docForPdf, mode);
  };

  const remove = async () => {
    if (!(await confirm({ title: `${cfg.label} silinsin mi?`, description: "Stok hareketleri ve ödeme eşleştirmeleri geri alınır.", danger: true, confirmText: "Sil" }))) return;
    await del.call({ p_doc: d.id }, "Belge silindi");
    router.replace(cfg.base);
  };

  const changeStatus = async (s: string) => {
    await setStatus.call({ p_doc: d.id, p_status: s }, `Durum: ${STATUS_LABEL[s] ?? s}`);
    q.refetch();
  };

  const convert = (to: DocType) => router.push(`${DOC_TYPES[to].base}/yeni?kaynak=${d.id}`);
  const ps = PAYMENT_STATUS[d.payment_status] ?? PAYMENT_STATUS.none;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        back={cfg.base}
        title={
          <span className="flex flex-wrap items-center gap-2">
            {cfg.label} {d.number ?? <span className="text-muted">(Taslak)</span>}
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-2">
            {cfg.statuses && (
              <Badge tone={d.status === "cancelled" || d.status === "rejected" ? "danger" : d.status === "accepted" || d.status === "converted" || d.status === "approved" ? "success" : "neutral"}>
                {STATUS_LABEL[d.status] ?? d.status}
              </Badge>
            )}
            {cfg.payable && d.status !== "draft" && (
              <Badge tone={overdue ? "danger" : ps.tone}>{overdue ? "Vadesi geçti" : ps.label}</Badge>
            )}
            {!cfg.statuses && !cfg.payable && (
              <Badge tone={d.status === "cancelled" || d.status === "rejected" ? "danger" : d.status === "accepted" || d.status === "converted" ? "success" : "neutral"}>
                {STATUS_LABEL[d.status] ?? d.status}
              </Badge>
            )}
            {!d.affects_stock && cfg.stock !== 0 && <Badge>Stok irsaliyede</Badge>}
            {!d.is_printed && d.doc_type === "sales_invoice" && <Badge tone="warning">Yazdırılmadı</Badge>}
          </span>
        }
        actions={
          <>
            <Button size="sm" variant="outline" onClick={() => pdf("share")}>
              <Share2 /> <span className="hidden sm:inline">Paylaş</span>
            </Button>
            <Button size="sm" variant="outline" onClick={() => setPrintOpen(true)} className="hidden sm:inline-flex">
              <Printer /> Yazdır
            </Button>
            {canWrite && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" aria-label="Diğer işlemler">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => router.push(`${cfg.base}/duzenle?id=${d.id}`)}>
                    <Pencil /> Düzenle
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => pdf("download")}>
                    <Download /> PDF indir
                  </DropdownMenuItem>
                  {phone && (
                    <DropdownMenuItem onSelect={() => window.open(`https://wa.me/${phone.startsWith("0") ? "9" + phone : phone.length === 10 ? "90" + phone : phone}?text=${encodeURIComponent(`${org!.name} · ${cfg.label} ${d.number ?? ""} · Tutar: ${formatMoney(d.total, d.currency)}`)}`, "_blank")}>
                      <Send /> WhatsApp mesajı
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onSelect={() => router.push(`${cfg.base}/yeni?kopya=${d.id}`)}>
                    <Copy /> Kopyala
                  </DropdownMenuItem>
                  {cfg.convertTo.length > 0 && <DropdownMenuSeparator />}
                  {cfg.convertTo.map((t) => (
                    <DropdownMenuItem key={t} onSelect={() => convert(t)}>
                      <ArrowRightLeft /> {DOC_TYPES[t].label} oluştur
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  {d.status === "draft" && (
                    <DropdownMenuItem onSelect={() => changeStatus(cfg.statuses ? "pending" : "approved")}>
                      <CheckCircle2 /> Onayla
                    </DropdownMenuItem>
                  )}
                  {cfg.statuses?.filter((s) => s.value !== d.status && s.value !== "converted").map((s) => (
                    <DropdownMenuItem key={s.value} onSelect={() => changeStatus(s.value)}>
                      <CheckCircle2 /> {s.label}
                    </DropdownMenuItem>
                  ))}
                  {!cfg.statuses && d.status !== "cancelled" && d.status !== "draft" && (
                    <DropdownMenuItem onSelect={() => changeStatus("cancelled")}>
                      <Ban /> İptal et
                    </DropdownMenuItem>
                  )}
                  {d.status === "cancelled" && (
                    <DropdownMenuItem onSelect={() => changeStatus("approved")}>
                      <CheckCircle2 /> İptali geri al
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onSelect={remove} className="text-danger">
                    <Trash2 className="!text-danger" /> Sil
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </>
        }
      />

      {/* hızlı işlem şeridi */}
      {canWrite && d.status !== "draft" && d.status !== "cancelled" && (
        <div className="mb-4 flex flex-wrap gap-2">
          {cfg.payable && remaining > 0.004 && (
            <Button size="sm" variant={flow === "in" ? "success" : "danger"} onClick={() => setPayOpen(true)}>
              <HandCoins /> {flow === "in" ? "Tahsilat ekle" : "Ödeme ekle"}
            </Button>
          )}
          {cfg.convertTo
            .filter((t) => d.status !== "converted" || t.endsWith("return"))
            .map((t) => (
              <Button key={t} size="sm" variant="outline" onClick={() => convert(t)}>
                <ArrowRightLeft /> {DOC_TYPES[t].label}
              </Button>
            ))}
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardBody className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted">{cfg.contactLabel}</div>
                {d.contact_id ? (
                  <Link href={`/cariler/detay?id=${d.contact_id}`} className="font-semibold text-primary hover:underline">
                    {snap.name ?? "—"}
                  </Link>
                ) : (
                  <div className="font-semibold">{d.doc_type === "pos_sale" ? "Perakende müşteri" : "—"}</div>
                )}
                <div className="text-muted">{[snap.address, snap.district, snap.city].filter(Boolean).join(" ")}</div>
                {snap.tax_number && <div className="text-muted">VKN/TCKN {snap.tax_number} {snap.tax_office && `· ${snap.tax_office}`}</div>}
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
                <dt className="text-muted">Tarih</dt>
                <dd>{formatDate(d.issue_date)}</dd>
                {d.due_date && (
                  <>
                    <dt className="text-muted">Vade</dt>
                    <dd className={cn(overdue && "font-semibold text-danger")}>{formatDate(d.due_date)}</dd>
                  </>
                )}
                {d.valid_until && (
                  <>
                    <dt className="text-muted">Geçerlilik</dt>
                    <dd>{formatDate(d.valid_until)}</dd>
                  </>
                )}
                {d.currency !== "TRY" && (
                  <>
                    <dt className="text-muted">Kur</dt>
                    <dd className="num">1 {d.currency} = {formatNumber(d.exchange_rate)} ₺</dd>
                  </>
                )}
              </dl>
              {d.description && <div className="text-muted sm:col-span-2">{d.description}</div>}
            </CardBody>
          </Card>

          <Card className="overflow-hidden">
            <div className="thin-scroll overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-2 text-[11px] uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-2 text-left">Ürün / hizmet</th>
                    <th className="px-3 py-2 text-right">Miktar</th>
                    <th className="px-3 py-2 text-right">B. fiyat</th>
                    <th className="hidden px-3 py-2 text-right sm:table-cell">İsk.</th>
                    <th className="hidden px-3 py-2 text-right sm:table-cell">KDV</th>
                    <th className="px-4 py-2 text-right">Tutar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {lines.map((l) => (
                    <tr key={l.id}>
                      <td className="px-4 py-2.5">
                        {l.product_id ? (
                          <Link href={`/stok/urunler/detay?id=${l.product_id}`} className="font-medium hover:text-primary">
                            {l.description || l.product_name}
                          </Link>
                        ) : (
                          <span className="font-medium">{l.description}</span>
                        )}
                      </td>
                      <td className="num whitespace-nowrap px-3 py-2.5 text-right">
                        {formatQty(l.quantity)} <span className="text-xs text-muted">{l.unit_name}</span>
                      </td>
                      <td className="num px-3 py-2.5 text-right">{formatNumber(l.unit_price)}</td>
                      <td className="num hidden px-3 py-2.5 text-right text-muted sm:table-cell">{Number(l.discount_rate) ? `%${formatQty(l.discount_rate)}` : ""}</td>
                      <td className="num hidden px-3 py-2.5 text-right text-muted sm:table-cell">%{formatQty(l.vat_rate)}</td>
                      <td className="num px-4 py-2.5 text-right font-medium">{formatNumber(l.net_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {(d.notes || d.terms) && (
            <Card>
              <CardBody className="grid gap-3 text-sm sm:grid-cols-2">
                {d.notes && (
                  <div>
                    <div className="text-xs text-muted">Not</div>
                    <p className="whitespace-pre-line">{d.notes}</p>
                  </div>
                )}
                {d.terms && (
                  <div>
                    <div className="text-xs text-muted">Koşullar</div>
                    <p className="whitespace-pre-line">{d.terms}</p>
                  </div>
                )}
              </CardBody>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardBody className="flex flex-col gap-2 text-sm">
              <Line label="Ara toplam" value={formatMoney(d.subtotal, d.currency)} />
              {Number(d.discount_total) > 0 && <Line label="İskonto" value={`-${formatMoney(d.discount_total, d.currency)}`} />}
              <Line label="Matrah" value={formatMoney(d.net_total, d.currency)} />
              <Line label="KDV" value={formatMoney(d.vat_total, d.currency)} />
              <div className="flex items-center justify-between border-t border-border pt-2 text-lg font-bold">
                <span>Toplam</span>
                <span className="num">{formatMoney(d.total, d.currency)}</span>
              </div>
              {d.currency !== "TRY" && <div className="num text-right text-xs text-muted">≈ {formatMoney(d.total_try)}</div>}
              {cfg.payable && (
                <>
                  <Line label={flow === "in" ? "Tahsil edilen" : "Ödenen"} value={formatMoney(d.paid_amount, d.currency)} className="text-success" />
                  <Line label="Kalan" value={formatMoney(remaining, d.currency)} className={cn("font-semibold", remaining > 0.004 && "text-danger")} />
                </>
              )}
              {balanceInfo && (
                <div className="mt-3 border-t border-border pt-3">
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>Önceki Bakiye</span>
                    <span className="num font-medium">
                      {Math.abs(balanceInfo.previous_balance) <= 0.009
                        ? "0,00 ₺ (Kapalı)"
                        : `${formatMoney(Math.abs(balanceInfo.previous_balance), "TRY")} ${balanceInfo.previous_balance > 0 ? "(Borçlu)" : "(Alacaklı)"}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted mt-1.5">
                    <span>Bu {cfg.label}</span>
                    <span className="num font-medium">{formatMoney(balanceInfo.this_amount, d.currency)}</span>
                  </div>
                  <div className="flex items-center justify-between font-bold text-sm mt-2.5 p-2 rounded bg-surface-2 border border-border">
                    <span className="text-xs font-semibold uppercase tracking-wider text-text">GÜNCEL TOPLAM BAKİYE</span>
                    <span
                      className={cn(
                        "num",
                        balanceInfo.current_balance > 0.009
                          ? "text-success"
                          : balanceInfo.current_balance < -0.009
                            ? "text-danger"
                            : "text-muted",
                      )}
                    >
                      {Math.abs(balanceInfo.current_balance) <= 0.009
                        ? "0,00 ₺ (Kapalı)"
                        : `${formatMoney(Math.abs(balanceInfo.current_balance), "TRY")} ${balanceInfo.current_balance > 0 ? "(Borçlu)" : "(Alacaklı)"}`}
                    </span>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          {cfg.payable && (
            <Card>
              <CardHeader title={flow === "in" ? "Tahsilatlar" : "Ödemeler"} />
              {allocs.data?.length ? (
                <ul className="divide-y divide-border text-sm">
                  {allocs.data.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                      <div>
                        <div>{formatDate(a.transaction.txn_date)}</div>
                        <div className="text-xs text-muted">{a.transaction.account?.name ?? "Çek / senet"}</div>
                      </div>
                      <span className="num font-semibold">{formatMoney(a.amount, d.currency)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-4 py-3 text-sm text-muted">Henüz kayıt yok.</p>
              )}
            </Card>
          )}

          <Attachments entityType="document" entityId={d.id} />

          {(d.source_document_id || !!related.data?.length) && (
            <Card>
              <CardHeader icon={<Link2 />} title="İlişkili belgeler" />
              <ul className="divide-y divide-border text-sm">
                {d.source_document_id && <RelatedLink id={d.source_document_id} label="Kaynak" />}
                {related.data?.map((r) => (
                  <li key={r.id}>
                    <Link href={`${DOC_TYPES[r.doc_type as DocType].base}/detay?id=${r.id}`} className="flex justify-between px-4 py-2.5 hover:bg-surface-2">
                      <span>{DOC_TYPES[r.doc_type as DocType].label}</span>
                      <span className="text-muted">{r.number ?? "Taslak"}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      {cfg.payable && (
        <PaymentDialog
          open={payOpen}
          onOpenChange={(o) => {
            setPayOpen(o);
            if (!o) {
              q.refetch();
              allocs.refetch();
            }
          }}
          flow={flow}
          contactId={d.contact_id}
          employeeId={d.employee_id}
          categoryId={d.category_id}
          target={{ id: d.id, number: d.number, remaining, currency: d.currency, exchange_rate: Number(d.exchange_rate) }}
        />
      )}

      <DocumentPrintModal
        open={printOpen}
        onOpenChange={setPrintOpen}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        doc={docForPdf as any}
        org={org}
        balanceInfo={balanceInfo}
        contactPhone={phone}
        onDownloadPdf={() => pdf("download")}
      />
    </div>
  );
}

function RelatedLink({ id, label }: { id: string; label: string }) {
  const q = useDocument(id);
  if (!q.data) return null;
  return (
    <li>
      <Link href={`${DOC_TYPES[q.data.doc_type as DocType].base}/detay?id=${id}`} className="flex justify-between px-4 py-2.5 hover:bg-surface-2">
        <span>
          {label}: {DOC_TYPES[q.data.doc_type as DocType].label}
        </span>
        <span className="text-muted">{q.data.number ?? "Taslak"}</span>
      </Link>
    </li>
  );
}

function Line({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <span className="text-muted">{label}</span>
      <span className="num">{value}</span>
    </div>
  );
}
