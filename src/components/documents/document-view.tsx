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
  ArrowLeft,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useRows, useRpc, useUnits, useProducts, useContactBalances, type Row } from "@/lib/data";
import { DOC_TYPES, PAYMENT_STATUS, STATUS_LABEL, docBalanceInfo, docFlow, normalizeStatus, statusLabel, statusTone, type DocType } from "@/lib/doc-types";
import { formatDate, formatMoney, formatNumber, formatQty, isoDate } from "@/lib/format";
import { useOrg } from "@/providers/org-provider";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useConfirm } from "@/components/ui/confirm";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown";
import { PaymentDialog } from "@/components/cash/payment-dialog";
import { DocumentPrintModal } from "./document-print-modal";
import { useDocument } from "./document-editor";
import { useRates, rateFor } from "@/lib/rates";
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
  const rates = useRates();
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
  // Satış belgesinin stok hareketlerindeki maliyet (kalem başına, TL, KDV hariç) — tahmini kâr raporlarla aynı olsun
  const moves = useRows<{ document_line_id: string | null; quantity: number; unit_cost: number | null }>("stock_movements", {
    select: "document_line_id, quantity, unit_cost",
    params: ["belge_maliyet", id],
    enabled: DOC_TYPES[type].side === "sales",
    filter: (x) => x.eq("document_id", id),
  });
  const lineCost = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const x of moves.data ?? []) {
      if (!x.document_line_id) continue;
      m.set(x.document_line_id, (m.get(x.document_line_id) ?? 0) - Number(x.quantity) * Number(x.unit_cost ?? 0));
    }
    return m;
  }, [moves.data]);
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

  // Ekrandaki bakiye (açık siparişler dahil) bu belgeyi taslak değilse zaten içerir
  const balanceInfo =
    d.contact_id && currentContactBalance !== null && currentContactBalance !== undefined
      ? docBalanceInfo(d, Number(currentContactBalance || 0), d.status !== "draft")
      : null;

  const docForPdf = { ...d, lines, contact_balance_info: balanceInfo };
  const phone = (contact.data?.find((c) => c.id === d.contact_id)?.mobile ?? "").replace(/\D/g, "");

  const isSalesDoc = cfg.side === "sales";
  const profitStats = (() => {
    if (!isSalesDoc || !d || !Array.isArray(d.lines)) return null;
    let totalCost = 0;
    let validCount = 0;
    for (const l of d.lines) {
      if (!l.product_id) continue;
      const p = products.data?.find((x) => x.id === l.product_id);
      if (!p) continue;
      const factor = Number(l.unit_factor || 1);
      // 1) Belgenin stok hareketindeki maliyet (raporlarla aynı; TL, KDV hariç)
      const moved = lineCost.get(l.id);
      if (moved != null && moved > 0) {
        totalCost += moved / (d.currency === "TRY" ? 1 : Number(d.exchange_rate || 1));
        validCount++;
        continue;
      }
      // 2) Ortalama maliyet (TL, KDV hariç; KDV'siz alışta ödenen tutar) 3) kart alış fiyatı
      const avg = Number(p.avg_cost ?? 0);
      const rawBuy = avg > 0 ? avg : Number(p.purchase_price ?? 0);
      if (rawBuy <= 0) continue;
      const buyExclVat = avg <= 0 && p.purchase_price_includes_vat
        ? rawBuy / (1 + Number(p.vat_rate || 0) / 100)
        : rawBuy;
      const baseBuy = buyExclVat * factor;
      const prodCur = avg > 0 ? "TRY" : p.purchase_currency || "TRY";
      let buyInDocCur = baseBuy;
      if (prodCur !== d.currency) {
        const inTry = baseBuy * (prodCur === "TRY" ? 1 : rateFor(rates.data, prodCur) || 1);
        buyInDocCur = inTry / (d.currency === "TRY" ? 1 : Number(d.exchange_rate || 1));
      }
      totalCost += buyInDocCur * Number(l.quantity || 0);
      validCount++;
    }
    if (validCount === 0) return null;
    const netTotal = Number(d.net_total || d.subtotal || 0);
    const totalProfit = netTotal - totalCost;
    const profitMargin = netTotal > 0 ? (totalProfit / netTotal) * 100 : 0;
    return { totalCost, totalProfit, profitMargin };
  })();

  const pdf = async (mode: "share" | "download" | "open" | "print") => {
    const { shareDocumentPdf } = await import("@/lib/pdf/share");
    await shareDocumentPdf(org!, docForPdf, mode);
  };

  const remove = async () => {
    if (!(await confirm({ title: `${cfg.label} silinsin mi?`, description: "Stok hareketleri ve ödeme eşleştirmeleri geri alınır.", danger: true, confirmText: "Sil" }))) return;
    await del.call({ p_doc: d.id }, "Belge silindi");
    router.replace(cfg.base);
  };

  const changeStatus = async (s: string) => {
    await setStatus.call({ p_doc: d.id, p_status: s }, `Durum: ${statusLabel(d.doc_type as DocType, s)}`);
    q.refetch();
  };

  const convert = (to: DocType) => router.push(`${DOC_TYPES[to].base}/yeni?kaynak=${d.id}`);
  const ps = PAYMENT_STATUS[d.payment_status] ?? PAYMENT_STATUS.none;

  const money = (n: number | null | undefined) => formatMoney(Number(n || 0), d.currency);
  const lineAmount = (l: (typeof lines)[number]) =>
    Number(l.quantity || 0) * Number(l.unit_price || 0) * (1 - Number(l.discount_rate || 0) / 100);
  const box = "min-h-11 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-slate-100";
  const lbl = "text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300";
  const canAct = canWrite && d.status !== "draft" && d.status !== "cancelled";
  const statusBadges = (
    <span className="flex flex-wrap items-center gap-1.5">
      {cfg.statuses && <Badge tone={statusTone(normalizeStatus(d.doc_type as DocType, d.status))}>{statusLabel(d.doc_type as DocType, d.status)}</Badge>}
      {cfg.payable && d.status !== "draft" && <Badge tone={overdue ? "danger" : ps.tone}>{overdue ? "Vadesi geçti" : ps.label}</Badge>}
      {!cfg.statuses && !cfg.payable && (
        <Badge tone={d.status === "cancelled" || d.status === "rejected" ? "danger" : d.status === "accepted" || d.status === "converted" ? "success" : "neutral"}>
          {STATUS_LABEL[d.status] ?? d.status}
        </Badge>
      )}
      {!d.affects_stock && cfg.stock !== 0 && <Badge>Stok irsaliyede</Badge>}
      {!d.is_printed && d.doc_type === "sales_invoice" && <Badge tone="warning">Yazdırılmadı</Badge>}
    </span>
  );

  return (
    <div className="mx-auto max-w-6xl">
      <div className="rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
        {/* Başlık + işlemler */}
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-4">
          <button
            type="button"
            onClick={() => router.push(cfg.base)}
            className="h-9 w-9 shrink-0 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Listeye dön"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg sm:text-xl font-bold tracking-tight">
              {cfg.label}{" "}
              {d.number ? (
                <span className="text-slate-600 dark:text-slate-300">· {d.number}</span>
              ) : d.status === "draft" ? (
                <span className="text-slate-500">(Taslak)</span>
              ) : (
                <span className="text-sm font-medium text-slate-500">· belge no girilmemiş</span>
              )}
            </h1>
            <div className="mt-1">{statusBadges}</div>
            {cfg.statuses && d.status !== "draft" && (
              <StatusBar type={d.doc_type as DocType} status={d.status} disabled={!canWrite || setStatus.isPending} onChange={changeStatus} />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canWrite && (
              <Button size="sm" onClick={() => router.push(`${cfg.base}/duzenle?id=${d.id}`)}>
                <Pencil /> Düzenle
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => pdf("open")} title="PDF olarak aç ve yazdır">
              <Printer /> <span className="hidden sm:inline">Yazdır / PDF</span>
            </Button>
            <Button size="sm" variant="outline" onClick={() => pdf("share")}>
              <Share2 /> <span className="hidden sm:inline">Paylaş</span>
            </Button>
            {canWrite && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" aria-label="Diğer işlemler">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => pdf("download")}>
                    <Download /> PDF indir
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setPrintOpen(true)}>
                    <Printer /> Baskı önizleme
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
          </div>
        </div>

        <div className="px-4 sm:px-6 py-5 space-y-5">
          {/* Hızlı işlemler */}
          {canAct && (cfg.payable && remaining > 0.004 && d.status !== "converted" || cfg.convertTo.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {cfg.payable && remaining > 0.004 && d.status !== "converted" && (
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

          {/* Belge bilgileri — belge penceresiyle aynı düzen */}
          <div className="doc-head grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            <div className="space-y-1.5 sm:col-span-2">
              <span className={lbl}>{cfg.contactLabel}</span>
              <div className={box}>
                {d.contact_id ? (
                  <Link href={`/cariler/detay?id=${d.contact_id}`} className="font-semibold text-brand-700 dark:text-brand-300 hover:underline">
                    {snap.name ?? "—"}
                  </Link>
                ) : (
                  <span>{d.doc_type === "pos_sale" ? "Perakende müşteri" : "Cari seçilmedi"}</span>
                )}
                {(snap.address || snap.city || snap.tax_number) && (
                  <div className="mt-0.5 text-xs font-normal text-slate-600 dark:text-slate-300">
                    {[snap.address, snap.district, snap.city].filter(Boolean).join(" ")}
                    {snap.tax_number && ` · VKN/TCKN ${snap.tax_number}${snap.tax_office ? ` · ${snap.tax_office}` : ""}`}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <span className={lbl}>Belge türü</span>
              <div className={box}>{cfg.label}</div>
            </div>
            <div className="space-y-1.5">
              <span className={lbl}>Tarih</span>
              <div className={box}>{formatDate(d.issue_date)}</div>
            </div>
            {d.valid_until ? (
              <div className="space-y-1.5">
                <span className={lbl}>Geçerlilik</span>
                <div className={box}>{formatDate(d.valid_until)}</div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <span className={lbl}>{d.doc_type === "sales_order" || d.doc_type === "purchase_order" ? "Teslim / hatırlatma" : "Vade"}</span>
                <div className={cn(box, overdue && "border-rose-300 text-rose-700 dark:border-rose-800 dark:text-rose-300 font-bold")}>
                  {d.due_date ? formatDate(d.due_date) : "—"}
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <span className={lbl}>Para birimi</span>
              <div className={box}>
                {d.currency}
                {d.currency !== "TRY" && <span className="text-xs text-slate-600 dark:text-slate-300"> · 1 {d.currency} = {formatNumber(d.exchange_rate)} ₺</span>}
              </div>
            </div>
          </div>

          {/* Kalemler */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">Kalemler ({lines.length})</div>
              <span className="text-xs text-slate-600 dark:text-slate-300">Fiyatlar KDV {d.prices_include_vat ? "dahil" : "hariç"}</span>
            </div>

            {/* Telefon: kart */}
            <div className="md:hidden space-y-2">
              {lines.map((l, i) => (
                <div key={l.id} className="rounded-xl border border-slate-300 dark:border-slate-700 p-3 text-sm">
                  <div className="flex gap-2">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 pt-0.5">{i + 1}</span>
                    <div className="min-w-0 flex-1 font-semibold">
                      {l.product_id ? (
                        <Link href={`/urunler/${l.product_id}`} className="hover:text-brand-600">{l.description || l.product_name}</Link>
                      ) : (
                        l.description
                      )}
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                    <div><div className="text-slate-600 dark:text-slate-300">Miktar</div><div className="font-semibold">{formatQty(l.quantity)} {l.unit_name}</div></div>
                    <div><div className="text-slate-600 dark:text-slate-300">Fiyat</div><div className="font-semibold">{formatNumber(l.unit_price)}</div></div>
                    <div><div className="text-slate-600 dark:text-slate-300">KDV / İsk.</div><div className="font-semibold">%{formatQty(l.vat_rate)}{Number(l.discount_rate) ? ` · %${formatQty(l.discount_rate)}` : ""}</div></div>
                  </div>
                  <div className="mt-2 flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Tutar</span>
                    <span className="font-bold tabular-nums">{formatNumber(lineAmount(l))}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Masaüstü: tablo */}
            <div className="hidden md:block rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                    <th className="px-3 py-3 text-left w-8">#</th>
                    <th className="px-3 py-3 text-left">Ürün</th>
                    <th className="px-2 py-3 text-center w-24">Miktar</th>
                    <th className="px-2 py-3 text-center w-24">Birim</th>
                    <th className="px-2 py-3 text-center w-32">{cfg.side === "purchase" ? "Alış fiyatı" : "Satış fiyatı"}</th>
                    <th className="px-2 py-3 text-center w-20">KDV %</th>
                    <th className="px-2 py-3 text-center w-24">İskonto %</th>
                    <th className="px-3 py-3 text-center w-32">Tutar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {lines.map((l, i) => (
                    <tr key={l.id}>
                      <td className="px-3 py-3 text-xs text-slate-600 dark:text-slate-300">{i + 1}</td>
                      <td className="px-3 py-3 font-medium">
                        {l.product_id ? (
                          <Link href={`/urunler/${l.product_id}`} className="hover:text-brand-600 dark:hover:text-brand-400">
                            {l.description || l.product_name}
                          </Link>
                        ) : (
                          l.description
                        )}
                      </td>
                      <td className="px-2 py-3 text-center tabular-nums">{formatQty(l.quantity)}</td>
                      <td className="px-2 py-3 text-center">{l.unit_name?.toLocaleLowerCase("tr-TR")}</td>
                      <td className="px-2 py-3 text-center tabular-nums">{formatNumber(l.unit_price)}</td>
                      <td className="px-2 py-3 text-center tabular-nums">{formatQty(l.vat_rate)}</td>
                      <td className="px-2 py-3 text-center tabular-nums">{Number(l.discount_rate) ? formatQty(l.discount_rate) : "—"}</td>
                      <td className="px-3 py-3 text-center font-bold tabular-nums">{formatNumber(lineAmount(l))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-4 items-start">
            {/* Sol: not, tahsilatlar, ekler, ilişkili belgeler */}
            <div className="space-y-4 min-w-0">
              {(d.notes || d.terms || d.description) && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 grid gap-3 text-sm sm:grid-cols-2">
                  {d.notes && (
                    <div>
                      <div className={lbl}>Not</div>
                      <p className="mt-1 whitespace-pre-line">{d.notes}</p>
                    </div>
                  )}
                  {d.terms && (
                    <div>
                      <div className={lbl}>Koşullar</div>
                      <p className="mt-1 whitespace-pre-line">{d.terms}</p>
                    </div>
                  )}
                  {d.description && !d.notes && (
                    <div className="sm:col-span-2 text-slate-700 dark:text-slate-200">{d.description}</div>
                  )}
                </div>
              )}

              {cfg.payable && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 font-semibold">{flow === "in" ? "Tahsilatlar" : "Ödemeler"}</div>
                  {allocs.data?.length ? (
                    <ul className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                      {allocs.data.map((a) => (
                        <li key={a.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                          <div>
                            <div>{formatDate(a.transaction.txn_date)}</div>
                            <div className="text-xs text-slate-600 dark:text-slate-300">{a.transaction.account?.name ?? (a.transaction.type === "adjustment" ? "Mahsup" : "Çek / senet")}</div>
                          </div>
                          <span className="font-semibold tabular-nums">{money(a.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">Henüz kayıt yok.</p>
                  )}
                </div>
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

            {/* Sağ: toplamlar — belge penceresiyle aynı */}
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2.5 text-sm">
                <Line label="Brüt toplam" value={money(d.subtotal)} />
                {Number(d.discount_total) > 0 && <Line label="İndirim" value={`−${money(d.discount_total)}`} className="text-rose-600 dark:text-rose-400" />}
                <Line label="Net toplam" value={money(d.net_total)} />
                <Line label="KDV" value={money(d.vat_total)} />
                <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-3">
                  <span className="font-extrabold uppercase">Toplam</span>
                  <span className="text-xl font-extrabold text-brand-700 dark:text-brand-300 tabular-nums">{money(d.total)}</span>
                </div>
                {d.currency !== "TRY" && <div className="text-right text-xs text-slate-600 dark:text-slate-300">≈ {formatMoney(d.total_try)}</div>}
                {cfg.payable && (
                  <>
                    <Line label={flow === "in" ? "Tahsil edilen" : "Ödenen"} value={money(d.paid_amount)} className="text-emerald-700 dark:text-emerald-400" />
                    <Line label="Kalan" value={money(remaining)} className={cn("font-bold", remaining > 0.004 ? "text-rose-600 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400")} />
                  </>
                )}
              </div>

              {balanceInfo && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-1.5 text-sm">
                  <Line label="Önceki bakiye" value={Math.abs(balanceInfo.previous_balance) <= 0.009 ? "0,00 ₺ (Kapalı)" : `${formatMoney(Math.abs(balanceInfo.previous_balance))} ${balanceInfo.previous_balance > 0 ? "(Borçlu)" : "(Alacaklı)"}`} />
                  <Line label={`Bu ${cfg.label.toLocaleLowerCase("tr-TR")}`} value={money(balanceInfo.this_amount)} />
                  <div className="mt-2 flex items-center justify-between rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-2 font-bold">
                    <span className="text-xs uppercase tracking-wide">Güncel bakiye</span>
                    <span className={cn("tabular-nums", balanceInfo.current_balance > 0.009 ? "text-emerald-700 dark:text-emerald-400" : balanceInfo.current_balance < -0.009 ? "text-rose-600 dark:text-rose-400" : "")}>
                      {Math.abs(balanceInfo.current_balance) <= 0.009 ? "0,00 ₺ (Kapalı)" : `${formatMoney(Math.abs(balanceInfo.current_balance))} ${balanceInfo.current_balance > 0 ? "(Borçlu)" : "(Alacaklı)"}`}
                    </span>
                  </div>
                </div>
              )}

              {profitStats && (
                <div
                  className={cn(
                    "rounded-xl border p-3 space-y-1 text-sm print:hidden",
                    profitStats.totalProfit >= 0 ? "bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-100" : "bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/30 dark:border-rose-900 dark:text-rose-100",
                  )}
                >
                  <div className="flex justify-between font-semibold">
                    <span>Tahmini kâr (dahili)</span>
                    <span className="tabular-nums">{profitStats.totalProfit >= 0 ? "+" : ""}{money(profitStats.totalProfit)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Kâr marjı · maliyet {money(profitStats.totalCost)}</span>
                    <span className="font-semibold">%{profitStats.profitMargin.toFixed(1).replace(".", ",")}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Alt çubuk */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-4">
          <div>
            <div className="text-xs text-slate-600 dark:text-slate-300">Genel Toplam</div>
            <div className="text-xl font-bold text-brand-700 dark:text-brand-300 tabular-nums">{money(d.total)}</div>
          </div>
          {cfg.payable && remaining > 0.004 && canAct && (
            <Button variant={flow === "in" ? "success" : "danger"} onClick={() => setPayOpen(true)}>
              <HandCoins /> {flow === "in" ? "Tahsilat ekle" : "Ödeme ekle"} · {money(remaining)}
            </Button>
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
        onPrintPdf={() => pdf("open")}
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

/** Teklif / sipariş durumu: tek tıkla değiştirilen adım çubuğu */
function StatusBar({ type, status, disabled, onChange }: { type: DocType; status: string; disabled?: boolean; onChange: (s: string) => void }) {
  const list = (DOC_TYPES[type].statuses ?? []).filter((x) => x.value !== "converted" && x.value !== "cancelled");
  const cur = normalizeStatus(type, status);
  const closed = cur === "converted" || cur === "cancelled";
  const active = (v: string) =>
    v === cur
      ? v === "rejected"
        ? "bg-rose-600 text-white"
        : v === "accepted"
          ? "bg-emerald-600 text-white"
          : "bg-brand-500 text-white"
      : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800";
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">Durum</span>
      <div className={cn("inline-flex overflow-hidden rounded-lg border border-slate-300 dark:border-slate-600", closed && "opacity-60")}>
        {list.map((x, i) => (
          <button
            key={x.value}
            type="button"
            disabled={disabled || closed || x.value === cur}
            onClick={() => onChange(x.value)}
            className={cn("h-8 px-3 text-xs font-semibold transition disabled:cursor-default", i > 0 && "border-l border-slate-300 dark:border-slate-600", active(x.value))}
          >
            {x.label}
          </button>
        ))}
      </div>
      {closed && <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{statusLabel(type, status)}</span>}
    </div>
  );
}
