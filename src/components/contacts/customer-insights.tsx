"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BarChart3, CalendarClock, Gauge, Percent, Repeat, ShoppingBag, Tag } from "lucide-react";
import { useRows, useUnits, type Row } from "@/lib/data";
import { DOC_TYPES, type DocType } from "@/lib/doc-types";
import { formatDate, formatMoney, formatQty, isoDate } from "@/lib/format";
import { useOrg } from "@/providers/org-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Line = {
  id: string;
  product_id: string | null;
  description: string | null;
  quantity: number;
  unit_factor: number | null;
  net_amount: number;
  vat_amount: number;
  vat_rate: number;
  document: { id: string; doc_type: string; issue_date: string; exchange_rate: number | null };
  product: { id: string; name: string; unit_id: string | null; sale_price: number | null; sale_price_includes_vat: boolean | null; vat_rate: number | null } | null;
};
type Move = { document_line_id: string | null; quantity: number; unit_cost: number | null };
type Alloc = { amount: number; document: { id: string; issue_date: string; due_date: string | null; payment_status: string }; transaction: { txn_date: string; deleted_at: string | null } | null };

const PREFILL_KEY = "ren-alis-onyukleme";
const MONTHS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const SALES = ["sales_invoice", "pos_sale"];
const box = "rounded-xl border border-slate-200 dark:border-[#1e2a3a] bg-white dark:bg-[#131b26] p-4 min-w-0";
const head = "mb-3 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white";
const muted = "text-xs text-slate-600 dark:text-slate-400";
const pct = (a: number, b: number) => (b ? ((a / b) * 100).toFixed(1).replace(".", ",") : "0");
const dayDiff = (a: string, b: string) => Math.round((Date.parse(a) - Date.parse(b)) / 864e5);

/** Müşteri analizi: tahsilat, ödeme/alışveriş alışkanlığı, tekrar alımlar, KDV dağılımı, aylık satış-kâr, en çok alınanlar, son fiyatlar */
export function CustomerInsights({ contactId, docs, termDays = 0, balance = 0 }: { contactId: string; docs: Row<"documents">[]; termDays?: number; balance?: number }) {
  const router = useRouter();
  const { canWrite } = useOrg();
  const units = useUnits();
  const unitName = (id: string | null | undefined) => units.data?.find((u) => u.id === id)?.name ?? "";
  const today = isoDate();

  const lines = useRows<Line>("document_lines", {
    select:
      "id, product_id, description, quantity, unit_factor, net_amount, vat_amount, vat_rate, document:documents!inner(id, doc_type, issue_date, exchange_rate, contact_id, status, deleted_at), product:products(id, name, unit_id, sale_price, sale_price_includes_vat, vat_rate)",
    softDelete: false,
    params: ["musteri_analiz", contactId],
    filter: (q) =>
      q
        .eq("document.contact_id", contactId)
        .in("document.doc_type", [...SALES, "sales_return"])
        .is("document.deleted_at", null)
        .not("document.status", "in", '("draft","cancelled")'),
  });
  // Maliyet: satışın stok hareketindeki birim maliyet (raporlarla aynı kural)
  const moves = useRows<Move>("stock_movements", {
    select: "document_line_id, quantity, unit_cost, document:documents!inner(contact_id)",
    params: ["musteri_analiz_maliyet", contactId],
    filter: (q) => q.eq("document.contact_id", contactId).in("movement_type", ["sale", "sales_return"]),
  });
  // Ödeme alışkanlığı: faturalara bağlanan tahsilatların tarihleri
  const allocs = useRows<Alloc>("payment_allocations", {
    select: "amount, document:documents!inner(id, issue_date, due_date, payment_status, contact_id, doc_type), transaction:transactions(txn_date, deleted_at)",
    softDelete: false,
    params: ["musteri_analiz_odeme", contactId],
    filter: (q) => q.eq("document.contact_id", contactId).in("document.doc_type", SALES),
  });

  const data = React.useMemo(() => {
    const cost = new Map<string, number>();
    for (const m of moves.data ?? []) {
      if (m.document_line_id) cost.set(m.document_line_id, (cost.get(m.document_line_id) ?? 0) - Number(m.quantity) * Number(m.unit_cost ?? 0));
    }
    const all = [...(lines.data ?? [])].sort((a, b) => a.document.issue_date.localeCompare(b.document.issue_date));
    const monthly = new Map<string, { net: number; profit: number }>();
    const vat = { netVat: 0, vatAmt: 0, netNoVat: 0, profitVat: 0, profitNoVat: 0 };
    type P = { key: string; name: string; unit: string | null; product: Line["product"]; qty: number; net: number; cost: number; sales: { doc: string; date: string; price: number }[] };
    const byProduct = new Map<string, P>();
    const saleDates = new Set<string>();
    for (const l of all) {
      const ret = l.document.doc_type === "sales_return";
      const sgn = ret ? -1 : 1;
      const rate = Number(l.document.exchange_rate) || 1;
      const baseQty = Number(l.quantity) * (Number(l.unit_factor) || 1);
      const net = sgn * Number(l.net_amount) * rate;
      const c = cost.get(l.id) ?? 0;
      const m = l.document.issue_date.slice(0, 7);
      const mo = monthly.get(m) ?? { net: 0, profit: 0 };
      mo.net += net;
      mo.profit += net - c;
      monthly.set(m, mo);
      if (Number(l.vat_rate) > 0) {
        vat.netVat += net;
        vat.vatAmt += sgn * Number(l.vat_amount) * rate;
        vat.profitVat += net - c;
      } else {
        vat.netNoVat += net;
        vat.profitNoVat += net - c;
      }
      if (!ret) saleDates.add(l.document.issue_date);
      const key = l.product_id ?? `_${(l.description ?? "").trim().toLocaleLowerCase("tr-TR")}`;
      let p = byProduct.get(key);
      if (!p) {
        p = { key, name: l.product?.name ?? l.description ?? "—", unit: l.product?.unit_id ?? null, product: l.product, qty: 0, net: 0, cost: 0, sales: [] };
        byProduct.set(key, p);
      }
      p.qty += sgn * baseQty;
      p.net += net;
      p.cost += c;
      if (!ret && baseQty > 0) p.sales.push({ doc: l.document.id, date: l.document.issue_date, price: (Number(l.net_amount) * rate) / baseQty });
    }

    const products = [...byProduct.values()];
    const top = products.filter((p) => p.net > 0).sort((a, b) => b.net - a.net).slice(0, 10);

    // Son satış fiyatı ve liste fiyatına göre iskonto
    const prices = products
      .filter((p) => p.sales.length)
      .map((p) => {
        const last = p.sales[p.sales.length - 1];
        const pr = p.product;
        const list = pr?.sale_price ? (pr.sale_price_includes_vat ? Number(pr.sale_price) / (1 + Number(pr.vat_rate ?? 0) / 100) : Number(pr.sale_price)) : null;
        const diff = list && list > 0 ? ((last.price - list) / list) * 100 : null;
        return { key: p.key, name: p.name, unit: p.unit, last, list, diff, count: new Set(p.sales.map((s) => s.doc)).size };
      })
      .sort((a, b) => b.last.date.localeCompare(a.last.date));

    // Tekrar alması beklenenler: en az 3 farklı tarihte alınan, ortalama aralığı geçmiş ürünler
    const repeat = products
      .filter((p) => p.product)
      .map((p) => {
        const dates = [...new Set(p.sales.map((s) => s.date))].sort();
        if (dates.length < 3) return null;
        const span = dayDiff(dates[dates.length - 1], dates[0]);
        const every = Math.max(1, Math.round(span / (dates.length - 1)));
        const since = dayDiff(today, dates[dates.length - 1]);
        const avgQty = Math.max(1, Math.round(Math.max(p.qty, 0) / dates.length));
        return { id: p.product!.id, name: p.name, unit: p.unit, every, since, avgQty, late: since / every };
      })
      .filter((x): x is NonNullable<typeof x> => !!x && x.late >= 1)
      .sort((a, b) => b.late - a.late);

    // Alışveriş sıklığı
    const dates = [...saleDates].sort();
    const visitEvery = dates.length >= 2 ? Math.round(dayDiff(dates[dates.length - 1], dates[0]) / (dates.length - 1)) : null;
    const lastVisit = dates[dates.length - 1] ?? null;

    const now = new Date();
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const v = monthly.get(k) ?? { net: 0, profit: 0 };
      return { key: k, label: MONTHS[d.getMonth()], year: d.getFullYear(), ...v };
    });
    const noCost = products.filter((p) => p.net > 0 && p.cost <= 0.004).length;
    return { top, prices, repeat, months, vat, visitEvery, lastVisit, visits: dates.length, noCost };
  }, [lines.data, moves.data, today]);

  // Ödeme alışkanlığı: tamamen ödenmiş faturalarda son tahsilat − fatura tarihi
  const pay = React.useMemo(() => {
    const byDoc = new Map<string, { issue: string; due: string | null; last: string }>();
    for (const a of allocs.data ?? []) {
      if (!a.transaction || a.transaction.deleted_at || a.document.payment_status !== "paid") continue;
      const cur = byDoc.get(a.document.id);
      if (!cur || a.transaction.txn_date > cur.last) byDoc.set(a.document.id, { issue: a.document.issue_date, due: a.document.due_date, last: a.transaction.txn_date });
    }
    const rows = [...byDoc.values()];
    if (!rows.length) return null;
    const avg = Math.round(rows.reduce((s, r) => s + Math.max(0, dayDiff(r.last, r.issue)), 0) / rows.length);
    // vade tarihi boşsa carinin vade süresi kullanılır (vade süresi de yoksa değerlendirilmez)
    const addDays = (iso: string, n: number) => {
      const d = new Date(iso);
      d.setDate(d.getDate() + n);
      return d.toISOString().slice(0, 10);
    };
    const withDue = rows.map((r) => ({ ...r, due: r.due ?? (termDays > 0 ? addDays(r.issue, termDays) : null) })).filter((r) => r.due);
    const onTime = withDue.length ? (withDue.filter((r) => r.last <= r.due!).length / withDue.length) * 100 : null;
    return { avg, onTime, count: rows.length, dueCount: withDue.length };
  }, [allocs.data, termDays]);

  // Tahsil edilecekler
  const due = React.useMemo(() => {
    const rows = docs
      .filter((d) => SALES.includes(d.doc_type) && d.status !== "draft" && d.status !== "cancelled")
      .map((d) => ({ d, rem: (Number(d.total) - Number(d.paid_amount || 0)) * Number(d.exchange_rate || 1) }))
      .filter((x) => x.rem > 0.004)
      .sort((a, b) => (a.d.due_date ?? "9999").localeCompare(b.d.due_date ?? "9999"))
      .map((x) => ({ ...x, days: x.d.due_date ? dayDiff(x.d.due_date, today) : null }));
    const sum = (f: (x: (typeof rows)[number]) => boolean) => rows.filter(f).reduce((s, x) => s + x.rem, 0);
    return {
      rows,
      overdue: sum((x) => x.days != null && x.days < 0),
      week: sum((x) => x.days != null && x.days >= 0 && x.days <= 7),
      month: sum((x) => x.days != null && x.days >= 0 && x.days <= 30),
    };
  }, [docs, today]);

  const [skip, setSkip] = React.useState<Record<string, boolean>>({});
  const chosen = data.repeat.filter((r) => !skip[r.id]);
  const openDoc = (type: DocType) => {
    try {
      sessionStorage.setItem(PREFILL_KEY, JSON.stringify(chosen.map((r) => ({ product_id: r.id, quantity: r.avgQty }))));
    } catch {}
    router.push(`${DOC_TYPES[type].base}/yeni?cari=${contactId}&onyukleme=1`);
  };

  const [hoverMonth, setHoverMonth] = React.useState<string | null>(null);
  const maxMonth = Math.max(...data.months.map((m) => Math.max(m.net, 0)), 1);
  const shown = data.months.find((m) => m.key === hoverMonth) ?? null;
  const yearNet = data.months.reduce((s, m) => s + m.net, 0);
  const yearProfit = data.months.reduce((s, m) => s + m.profit, 0);

  if (lines.isPending) return <div className={cn(box, "py-16 text-center", muted)}>Analiz hazırlanıyor…</div>;
  if ((lines.data ?? []).length === 0) return <div className={cn(box, "py-16 text-center", muted)}>Bu müşteriye henüz satış yapılmamış.</div>;

  const vatTotal = data.vat.netVat + data.vat.netNoVat;
  const vatShare = vatTotal > 0 ? (data.vat.netVat / vatTotal) * 100 : 0;
  const sinceVisit = data.lastVisit ? dayDiff(today, data.lastVisit) : null;
  const away = data.visitEvery && sinceVisit != null && data.visits >= 3 && sinceVisit > data.visitEvery * 2;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Tahsil edilecekler */}
        <section className={box}>
          <h3 className={head}>
            <CalendarClock size={16} className="text-brand-600" /> Tahsil edilecekler
          </h3>
          <div className="mb-3 grid grid-cols-3 gap-2 text-center">
            {[
              { label: "Vadesi geçen", value: due.overdue, cls: due.overdue > 0 ? "text-rose-600 dark:text-rose-400" : "" },
              { label: "7 gün içinde", value: due.week, cls: due.week > 0 ? "text-amber-700 dark:text-amber-400" : "" },
              { label: "30 gün içinde", value: due.month, cls: "" },
            ].map((x) => (
              <div key={x.label} className="rounded-lg bg-slate-50 dark:bg-[#16202c] px-2 py-2">
                <div className={cn("text-sm font-bold tabular-nums", x.cls)}>{formatMoney(x.value)}</div>
                <div className={muted}>{x.label}</div>
              </div>
            ))}
          </div>
          {(() => {
            const total = Math.max(balance, 0);
            const openSum = due.rows.reduce((s, x) => s + x.rem, 0);
            const extra = total - openSum;
            if (total <= 0.004) return null;
            return (
              <div className="mb-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-[#1e2a3a]">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold">Toplam açık hesap</span>
                  <span className="font-bold tabular-nums">{formatMoney(total)}</span>
                </div>
                {extra > 0.004 && (
                  <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                    {formatMoney(extra)} faturaya bağlı değil (devir / açılış bakiyesi ya da faturasız borç). Tahsilat önce açık faturalara, kalanı bu bakiyeye düşer.
                  </p>
                )}
              </div>
            );
          })()}
          {due.rows.length === 0 ? (
            <p className={cn(muted, "py-4 text-center")}>Açık satış faturası yok.</p>
          ) : (
            <div className="max-h-48 overflow-y-auto thin-scroll divide-y divide-slate-100 dark:divide-[#1e2a3a]">
              {due.rows.slice(0, 12).map(({ d, rem, days }) => (
                <Link key={d.id} href={`${DOC_TYPES[d.doc_type as DocType]?.base ?? "/satislar/faturalar"}/detay?id=${d.id}`} className="flex items-center gap-2 rounded px-1 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-[#1a2534]">
                  <span className="min-w-0 flex-1 truncate">
                    {d.number || "Belge"} · <span className={muted}>{formatDate(d.issue_date)}</span>
                  </span>
                  <span className={cn("whitespace-nowrap text-xs font-semibold", days == null ? "text-slate-500" : days < 0 ? "text-rose-600 dark:text-rose-400" : days <= 7 ? "text-amber-700 dark:text-amber-400" : "text-slate-600 dark:text-slate-400")}>
                    {days == null ? "vade yok" : days < 0 ? `${-days} gün geçti` : days === 0 ? "bugün" : `${days} gün kaldı`}
                  </span>
                  <span className="w-24 text-right font-semibold tabular-nums">{formatMoney(rem)}</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Ödeme ve alışveriş alışkanlığı */}
        <section className={box}>
          <h3 className={head}>
            <Gauge size={16} className="text-brand-600" /> Ödeme ve alışveriş alışkanlığı
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Ortalama ödeme süresi", value: pay ? `${pay.avg} gün` : "—", sub: pay ? `${pay.count} ödenmiş fatura` : "Ödenmiş fatura yok" },
              {
                label: "Vadesinde ödeme",
                value: pay?.onTime != null ? `%${pay.onTime.toFixed(0)}` : "—",
                sub:
                  pay?.onTime != null
                    ? `${pay.dueCount < 3 ? "Az veri" : pay.onTime >= 80 ? "Düzenli ödüyor" : pay.onTime >= 50 ? "Ara sıra gecikiyor" : "Sık gecikiyor"} · ${pay.dueCount} fatura`
                    : "Vade bilgisi yok",
                cls: pay?.onTime == null ? "" : pay.onTime >= 80 ? "text-emerald-600 dark:text-emerald-400" : pay.onTime >= 50 ? "text-amber-700 dark:text-amber-400" : "text-rose-600 dark:text-rose-400",
              },
              { label: "Alışveriş sıklığı", value: data.visitEvery ? `${data.visitEvery} günde bir` : "—", sub: `${data.visits} farklı gün` },
              {
                label: "Son alışveriş",
                value: data.lastVisit ? formatDate(data.lastVisit) : "—",
                sub: sinceVisit != null ? `${sinceVisit} gün önce` : "",
                cls: away ? "text-rose-600 dark:text-rose-400" : "",
              },
            ].map((x) => (
              <div key={x.label} className="rounded-lg bg-slate-50 dark:bg-[#16202c] px-3 py-2.5">
                <div className={muted}>{x.label}</div>
                <div className={cn("text-base font-bold tabular-nums", x.cls)}>{x.value}</div>
                <div className={muted}>{x.sub}</div>
              </div>
            ))}
          </div>
          {away && (
            <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
              Uzun süredir alışveriş yok: genelde {data.visitEvery} günde bir alıyor, son alışveriş {sinceVisit} gün önce. Aramak iyi olabilir.
            </p>
          )}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Tekrar alması beklenenler */}
        <section className={cn(box, "lg:col-span-2")}>
          <h3 className={head}>
            <Repeat size={16} className="text-brand-600" /> Tekrar alması beklenenler
            <span className="ml-auto text-xs font-semibold text-slate-600 dark:text-slate-400">{data.repeat.length} ürün</span>
          </h3>
          {data.repeat.length === 0 ? (
            <p className={cn(muted, "py-6 text-center")}>Düzenli aldığı ürünlerde alma zamanı gelen yok.</p>
          ) : (
            <>
              <div className="max-h-56 overflow-y-auto thin-scroll -mx-1">
                <table className="w-full text-sm">
                  <thead className="text-[11px] uppercase tracking-wide text-slate-600 dark:text-slate-400">
                    <tr>
                      <th className="w-6" />
                      <th className="px-1 py-1 text-left">Ürün</th>
                      <th className="px-1 py-1 text-right">Genelde</th>
                      <th className="px-1 py-1 text-right">Son alış</th>
                      <th className="px-1 py-1 text-right">Ort. miktar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#1e2a3a]">
                    {data.repeat.map((r) => (
                      <tr key={r.id}>
                        <td className="px-1">
                          <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={!skip[r.id]} onChange={(e) => setSkip((s) => ({ ...s, [r.id]: !e.target.checked }))} />
                        </td>
                        <td className="px-1 py-1.5 font-medium">
                          <div className="max-w-[260px] truncate">{r.name}</div>
                        </td>
                        <td className="px-1 py-1.5 text-right text-xs text-slate-600 dark:text-slate-400">{r.every} günde bir</td>
                        <td className={cn("px-1 py-1.5 text-right text-xs font-semibold", r.late >= 2 ? "text-rose-600 dark:text-rose-400" : "text-amber-700 dark:text-amber-400")}>{r.since} gün önce</td>
                        <td className="px-1 py-1.5 text-right tabular-nums">
                          {formatQty(r.avgQty)} {unitName(r.unit)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {canWrite && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" disabled={!chosen.length} onClick={() => openDoc("quote")}>
                    Teklif hazırla ({chosen.length})
                  </Button>
                  <Button size="sm" variant="outline" disabled={!chosen.length} onClick={() => openDoc("sales_invoice")}>
                    Satış faturası olarak aç
                  </Button>
                </div>
              )}
            </>
          )}
        </section>

        {/* KDV'li / KDV'siz */}
        <section className={box}>
          <h3 className={head}>
            <Percent size={16} className="text-brand-600" /> KDV&apos;li / KDV&apos;siz satış
          </h3>
          <div className="mb-3 flex h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-[#16202c]">
            <div className="h-full bg-brand-500" style={{ width: `${vatShare}%` }} />
            <div className="h-full border-l-2 border-white bg-amber-500 dark:border-[#131b26]" style={{ width: `${100 - vatShare}%` }} />
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <dt className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-sm bg-brand-500" /> KDV&apos;li (KDV hariç)
              </dt>
              <dd className="font-semibold tabular-nums">{formatMoney(data.vat.netVat)}</dd>
            </div>
            <div className={cn("flex justify-between pl-[18px]", muted)}>
              <span>Kâr · marj</span>
              <span className="tabular-nums">
                {formatMoney(data.vat.profitVat)} · %{pct(data.vat.profitVat, data.vat.netVat)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" /> KDV&apos;siz
              </dt>
              <dd className="font-semibold tabular-nums">{formatMoney(data.vat.netNoVat)}</dd>
            </div>
            <div className={cn("flex justify-between pl-[18px]", muted)}>
              <span>Kâr · marj</span>
              <span className="tabular-nums">
                {formatMoney(data.vat.profitNoVat)} · %{pct(data.vat.profitNoVat, data.vat.netNoVat)}
              </span>
            </div>
            <div className={cn("border-t border-slate-200 pt-2 dark:border-[#1e2a3a]", muted)}>
              Hesaplanan KDV {formatMoney(data.vat.vatAmt)} · satışların %{vatShare.toFixed(0)}&apos;i faturalı
            </div>
            {data.noCost > 0 && (
              <div className="text-xs text-amber-700 dark:text-amber-400">
                {data.noCost} üründe alış maliyeti kayıtlı değil; kâr olduğundan yüksek görünebilir. Alış faturaları girildikçe düzelir.
              </div>
            )}
          </dl>
        </section>
      </div>

      {/* Aylık satış ve kâr */}
      <section className={box}>
        <h3 className={head}>
          <BarChart3 size={16} className="text-brand-600" /> Aylık satış (son 12 ay, KDV hariç)
          <span className="ml-auto text-xs font-semibold tabular-nums text-slate-600 dark:text-slate-400">
            {shown
              ? `${shown.label} ${shown.year}: ${formatMoney(shown.net)} · kâr ${formatMoney(shown.profit)}`
              : `Toplam ${formatMoney(yearNet)} · kâr ${formatMoney(yearProfit)} (%${pct(yearProfit, yearNet)})`}
          </span>
        </h3>
        <div className="flex h-40 items-end gap-[2px] border-b border-slate-200 dark:border-[#1e2a3a]" onMouseLeave={() => setHoverMonth(null)}>
          {data.months.map((m) => (
            <div key={m.key} className="flex h-full flex-1 flex-col justify-end px-[3px]" onMouseEnter={() => setHoverMonth(m.key)} title={`${m.label} ${m.year}: ${formatMoney(m.net)} · kâr ${formatMoney(m.profit)}`}>
              <div
                className={cn("w-full rounded-t-[4px] transition-colors", hoverMonth === m.key ? "bg-brand-700" : "bg-brand-500")}
                style={{ height: `${(Math.max(m.net, 0) / maxMonth) * 100}%`, minHeight: m.net > 0 ? 2 : 0 }}
              />
            </div>
          ))}
        </div>
        <div className="mt-1 flex gap-[2px]">
          {data.months.map((m) => (
            <div key={m.key} className={cn("flex-1 text-center text-[10px] text-slate-500 dark:text-slate-400", hoverMonth === m.key && "font-bold text-slate-800 dark:text-slate-200")}>
              {m.label}
            </div>
          ))}
        </div>
      </section>

      {/* En çok aldıkları */}
      <section className={box}>
        <h3 className={head}>
          <ShoppingBag size={16} className="text-brand-600" /> En çok aldığı ürünler
          <span className="ml-auto text-xs font-semibold text-slate-600 dark:text-slate-400">tüm zamanlar · KDV hariç</span>
        </h3>
        <div className="grid gap-x-6 gap-y-2 md:grid-cols-2">
          {data.top.map((p, i) => {
            const profit = p.net - p.cost;
            return (
              <div key={p.key} className="flex min-w-0 items-center gap-3 text-sm">
                <span className="w-5 text-right text-xs font-bold text-slate-500">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{p.name}</div>
                  <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-[#16202c]">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${(p.net / (data.top[0]?.net || 1)) * 100}%` }} />
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold tabular-nums">{formatMoney(p.net)}</div>
                  <div className={muted}>
                    {formatQty(p.qty)} {unitName(p.unit)} ·{" "}
                    {p.cost <= 0.004 ? (
                      <span className="text-amber-700 dark:text-amber-400" title="Bu ürünün alış maliyeti kayıtlı değil (alış faturası yok / eksi stoktan satış)">maliyet yok</span>
                    ) : (
                      <span className={profit < 0 ? "text-rose-600 dark:text-rose-400" : ""}>%{pct(profit, p.net)} kâr</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Son satış fiyatları */}
      <section className={box}>
        <h3 className={head}>
          <Tag size={16} className="text-brand-600" /> Son satış fiyatları
          <span className="ml-auto text-xs font-semibold text-slate-600 dark:text-slate-400">KDV hariç birim fiyat · liste fiyatına göre</span>
        </h3>
        <div className="-mx-1 max-h-80 overflow-auto thin-scroll">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white text-[11px] uppercase tracking-wide text-slate-600 dark:bg-[#131b26] dark:text-slate-400">
              <tr>
                <th className="px-2 py-1.5 text-left">Ürün</th>
                <th className="px-2 py-1.5 text-right">Son satış</th>
                <th className="px-2 py-1.5 text-right">Liste fiyatı</th>
                <th className="px-2 py-1.5 text-right">Fark</th>
                <th className="hidden px-2 py-1.5 text-right sm:table-cell">Tarih</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1e2a3a]">
              {data.prices.slice(0, 60).map((p) => (
                <tr key={p.key}>
                  <td className="px-2 py-1.5 font-medium">
                    <div className="max-w-[260px] truncate">{p.name}</div>
                    <div className={muted}>{p.count} kez satıldı</div>
                  </td>
                  <td className="px-2 py-1.5 text-right font-semibold tabular-nums">
                    {formatMoney(p.last.price)}
                    {p.unit && <span className="text-xs font-normal text-slate-500"> /{unitName(p.unit)}</span>}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-slate-600 dark:text-slate-400">{p.list != null ? formatMoney(p.list) : "—"}</td>
                  <td
                    className={cn(
                      "px-2 py-1.5 text-right text-xs font-semibold tabular-nums",
                      p.diff == null || Math.abs(p.diff) < 0.5 ? "text-slate-500" : p.diff < 0 ? "text-amber-700 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400",
                    )}
                  >
                    {p.diff == null ? "—" : Math.abs(p.diff) < 0.5 ? "liste fiyatı" : p.diff < 0 ? `%${Math.abs(p.diff).toFixed(1).replace(".", ",")} iskonto` : `%${p.diff.toFixed(1).replace(".", ",")} üstünde`}
                  </td>
                  <td className="hidden px-2 py-1.5 text-right text-xs text-slate-600 dark:text-slate-400 sm:table-cell">{formatDate(p.last.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
