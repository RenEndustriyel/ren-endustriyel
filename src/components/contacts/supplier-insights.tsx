"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, CalendarClock, PackagePlus, Percent, ShoppingBag, TrendingUp, BarChart3 } from "lucide-react";
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
  total_amount: number;
  vat_rate: number;
  document: { id: string; doc_type: string; number: string | null; issue_date: string; exchange_rate: number | null };
  product: { id: string; name: string; stock_qty: number | null; critical_stock: number | null; track_stock: boolean | null; unit_id: string | null } | null;
};

const PREFILL_KEY = "ren-alis-onyukleme";
const MONTHS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const pctText = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(1).replace(".", ",")}%`;
const box = "rounded-xl border border-slate-200 dark:border-[#1e2a3a] bg-white dark:bg-[#131b26] p-4 min-w-0";
const head = "mb-3 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white";
const muted = "text-xs text-slate-600 dark:text-slate-400";

/** Tedarikçi analizi: zamlar, sipariş verilecekler, en çok alınanlar, aylık alış, KDV dağılımı, yaklaşan ödemeler */
export function SupplierInsights({ contactId, docs }: { contactId: string; docs: Row<"documents">[] }) {
  const router = useRouter();
  const { canWrite } = useOrg();
  const units = useUnits();
  const lines = useRows<Line>("document_lines", {
    select:
      "id, product_id, description, quantity, unit_factor, net_amount, vat_amount, total_amount, vat_rate, document:documents!inner(id, doc_type, number, issue_date, exchange_rate, contact_id, status, deleted_at), product:products(id, name, stock_qty, critical_stock, track_stock, unit_id)",
    softDelete: false,
    params: ["tedarikci_analiz", contactId],
    filter: (q) =>
      q
        .eq("document.contact_id", contactId)
        .in("document.doc_type", ["purchase_invoice", "purchase_return"])
        .is("document.deleted_at", null)
        .not("document.status", "in", '("draft","cancelled")'),
  });
  const unitName = (id: string | null | undefined) => units.data?.find((u) => u.id === id)?.name ?? "";
  const today = isoDate();

  const data = React.useMemo(() => {
    const all = [...(lines.data ?? [])].sort((a, b) => a.document.issue_date.localeCompare(b.document.issue_date));
    // 1) Son alış fiyatları (KDV hariç, ana birim, TL)
    const byProduct = new Map<string, { name: string; unit: string | null; buys: { doc: string; date: string; price: number }[]; qty: number; net: number; lines: number; product: Line["product"] }>();
    // 4) Aylık alış, 5) KDV dağılımı
    const monthly = new Map<string, number>();
    const vat = { netVat: 0, vatAmt: 0, netNoVat: 0, cntVat: 0, cntNoVat: 0 };
    for (const l of all) {
      const sgn = l.document.doc_type === "purchase_return" ? -1 : 1;
      const rate = Number(l.document.exchange_rate) || 1;
      const baseQty = Number(l.quantity) * (Number(l.unit_factor) || 1);
      const net = Number(l.net_amount) * rate;
      const m = l.document.issue_date.slice(0, 7);
      monthly.set(m, (monthly.get(m) ?? 0) + sgn * net);
      if (Number(l.vat_rate) > 0) {
        vat.netVat += sgn * net;
        vat.vatAmt += sgn * Number(l.vat_amount) * rate;
        vat.cntVat++;
      } else {
        vat.netNoVat += sgn * net;
        vat.cntNoVat++;
      }
      const key = l.product_id ?? `_${(l.description ?? "").trim().toLocaleLowerCase("tr-TR")}`;
      let p = byProduct.get(key);
      if (!p) {
        p = { name: l.product?.name ?? l.description ?? "—", unit: l.product?.unit_id ?? null, buys: [], qty: 0, net: 0, lines: 0, product: l.product };
        byProduct.set(key, p);
      }
      p.qty += sgn * baseQty;
      p.net += sgn * net;
      if (sgn > 0) {
        p.lines++;
        if (baseQty > 0) p.buys.push({ doc: l.document.id, date: l.document.issue_date, price: net / baseQty });
      }
    }

    const prices = [...byProduct.entries()]
      .filter(([, p]) => p.buys.length > 0)
      .map(([key, p]) => {
        const last = p.buys[p.buys.length - 1];
        const prev = [...p.buys].reverse().find((b) => b.doc !== last.doc);
        const change = prev && prev.price > 0 ? ((last.price - prev.price) / prev.price) * 100 : null;
        return { key, name: p.name, unit: p.unit, last, prev, change };
      })
      .sort((a, b) => {
        const ca = a.change ?? 0;
        const cb = b.change ?? 0;
        if ((ca > 0.05) !== (cb > 0.05)) return ca > 0.05 ? -1 : 1;
        if (ca > 0.05 && cb > 0.05) return cb - ca;
        return b.last.date.localeCompare(a.last.date);
      });

    // 2) Sipariş verilecekler: bu tedarikçiden alınan, stoğu eksi ya da kritik seviyede ürünler
    const reorder = [...byProduct.values()]
      .filter((p) => p.product && p.product.track_stock !== false)
      .map((p) => {
        const stock = Number(p.product!.stock_qty ?? 0);
        const crit = p.product!.critical_stock != null ? Number(p.product!.critical_stock) : null;
        const avgOrder = p.lines > 0 ? Math.max(p.qty, 0) / p.lines : 0;
        const target = Math.max(crit != null ? crit * 2 : 0, avgOrder, 1);
        return { id: p.product!.id, name: p.name, unit: p.unit, stock, crit, suggest: Math.max(1, Math.ceil(target - stock)) };
      })
      .filter((r) => r.stock < 0 || (r.crit != null && r.stock <= r.crit))
      .sort((a, b) => a.stock - b.stock);

    // 3) En çok alınanlar
    const top = [...byProduct.values()].filter((p) => p.net > 0).sort((a, b) => b.net - a.net).slice(0, 10);

    // 4) Son 12 ay
    const now = new Date();
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return { key: k, label: MONTHS[d.getMonth()], year: d.getFullYear(), value: monthly.get(k) ?? 0 };
    });

    return { prices, reorder, top, months, vat };
  }, [lines.data]);

  // 6) Yaklaşan ödemeler (açık alış faturaları)
  const dueList = React.useMemo(() => {
    const rows = docs
      .filter((d) => d.doc_type === "purchase_invoice" && d.status !== "draft" && d.status !== "cancelled")
      .map((d) => ({ d, rem: (Number(d.total) - Number(d.paid_amount || 0)) * Number(d.exchange_rate || 1) }))
      .filter((x) => x.rem > 0.004)
      .sort((a, b) => (a.d.due_date ?? "9999").localeCompare(b.d.due_date ?? "9999"));
    const days = (iso: string) => Math.round((Date.parse(iso) - Date.parse(today)) / 864e5);
    const sum = (f: (x: (typeof rows)[number]) => boolean) => rows.filter(f).reduce((s, x) => s + x.rem, 0);
    return {
      rows: rows.map((x) => ({ ...x, days: x.d.due_date ? days(x.d.due_date) : null })),
      overdue: sum((x) => !!x.d.due_date && x.d.due_date < today),
      week: sum((x) => !!x.d.due_date && x.d.due_date >= today && days(x.d.due_date) <= 7),
      month: sum((x) => !!x.d.due_date && x.d.due_date >= today && days(x.d.due_date) <= 30),
    };
  }, [docs, today]);

  // Sipariş verilecekler seçimi (varsayılan hepsi)
  const [skip, setSkip] = React.useState<Record<string, boolean>>({});
  const [qtyOverride, setQtyOverride] = React.useState<Record<string, number>>({});
  const chosen = data.reorder.filter((r) => !skip[r.id]);
  const openOrder = (type: DocType) => {
    try {
      sessionStorage.setItem(PREFILL_KEY, JSON.stringify(chosen.map((r) => ({ product_id: r.id, quantity: qtyOverride[r.id] ?? r.suggest }))));
    } catch {}
    router.push(`${DOC_TYPES[type].base}/yeni?cari=${contactId}&onyukleme=1`);
  };

  const [hoverMonth, setHoverMonth] = React.useState<string | null>(null);
  const maxMonth = Math.max(...data.months.map((m) => Math.max(m.value, 0)), 1);
  const shownMonth = data.months.find((m) => m.key === hoverMonth) ?? null;
  const yearTotal = data.months.reduce((s, m) => s + m.value, 0);

  if (lines.isPending) return <div className={cn(box, "py-16 text-center", muted)}>Analiz hazırlanıyor…</div>;
  if ((lines.data ?? []).length === 0) return <div className={cn(box, "py-16 text-center", muted)}>Bu tedarikçiden henüz alış faturası yok.</div>;

  const vatTotal = data.vat.netVat + data.vat.netNoVat;
  const vatShare = vatTotal > 0 ? (data.vat.netVat / vatTotal) * 100 : 0;
  const increases = data.prices.filter((p) => (p.change ?? 0) > 0.05).length;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        {/* 2) Sipariş verilecekler */}
        <section className={box}>
          <h3 className={head}>
            <PackagePlus size={16} className="text-brand-600" /> Sipariş verilecekler
            <span className="ml-auto text-xs font-semibold text-slate-600 dark:text-slate-400">{data.reorder.length} ürün</span>
          </h3>
          {data.reorder.length === 0 ? (
            <p className={cn(muted, "py-6 text-center")}>Bu tedarikçinin ürünlerinde eksi ya da kritik stok yok.</p>
          ) : (
            <>
              <div className="max-h-64 overflow-y-auto thin-scroll -mx-1">
                <table className="w-full text-sm">
                  <thead className="text-[11px] uppercase tracking-wide text-slate-600 dark:text-slate-400">
                    <tr>
                      <th className="w-6" />
                      <th className="px-1 py-1 text-left">Ürün</th>
                      <th className="px-1 py-1 text-right">Stok</th>
                      <th className="px-1 py-1 text-right">Sipariş</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#1e2a3a]">
                    {data.reorder.map((r) => (
                      <tr key={r.id}>
                        <td className="px-1">
                          <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={!skip[r.id]} onChange={(e) => setSkip((s) => ({ ...s, [r.id]: !e.target.checked }))} />
                        </td>
                        <td className="px-1 py-1.5">
                          <div className="font-medium truncate max-w-[220px]">{r.name}</div>
                          {r.crit != null && <div className={muted}>Kritik: {formatQty(r.crit)}</div>}
                        </td>
                        <td className={cn("px-1 py-1.5 text-right tabular-nums font-semibold", r.stock < 0 ? "text-rose-600 dark:text-rose-400" : "text-amber-700 dark:text-amber-400")}>
                          {formatQty(r.stock)} {unitName(r.unit)}
                        </td>
                        <td className="px-1 py-1.5 text-right">
                          <input
                            type="number"
                            min={0}
                            className="input h-8 w-20 text-right tabular-nums"
                            value={qtyOverride[r.id] ?? r.suggest}
                            onChange={(e) => setQtyOverride((s) => ({ ...s, [r.id]: Number(e.target.value) || 0 }))}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {canWrite && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" disabled={!chosen.length} onClick={() => openOrder("purchase_order")}>
                    Satın alma siparişi oluştur ({chosen.length})
                  </Button>
                  <Button size="sm" variant="outline" disabled={!chosen.length} onClick={() => openOrder("purchase_invoice")}>
                    Alış faturası olarak aç
                  </Button>
                </div>
              )}
            </>
          )}
        </section>

        {/* 6) Yaklaşan ödemeler */}
        <section className={box}>
          <h3 className={head}>
            <CalendarClock size={16} className="text-brand-600" /> Yaklaşan ödemeler
          </h3>
          <div className="mb-3 grid grid-cols-3 gap-2 text-center">
            {[
              { label: "Vadesi geçen", value: dueList.overdue, cls: dueList.overdue > 0 ? "text-rose-600 dark:text-rose-400" : "" },
              { label: "7 gün içinde", value: dueList.week, cls: dueList.week > 0 ? "text-amber-700 dark:text-amber-400" : "" },
              { label: "30 gün içinde", value: dueList.month, cls: "" },
            ].map((x) => (
              <div key={x.label} className="rounded-lg bg-slate-50 dark:bg-[#16202c] px-2 py-2">
                <div className={cn("text-sm font-bold tabular-nums", x.cls)}>{formatMoney(x.value)}</div>
                <div className={muted}>{x.label}</div>
              </div>
            ))}
          </div>
          {dueList.rows.length === 0 ? (
            <p className={cn(muted, "py-4 text-center")}>Açık alış faturası yok.</p>
          ) : (
            <div className="max-h-48 overflow-y-auto thin-scroll divide-y divide-slate-100 dark:divide-[#1e2a3a]">
              {dueList.rows.slice(0, 12).map(({ d, rem, days }) => (
                <Link key={d.id} href={`${DOC_TYPES.purchase_invoice.base}/detay?id=${d.id}`} className="flex items-center gap-2 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-[#1a2534] rounded px-1">
                  <span className="min-w-0 flex-1 truncate">
                    {d.number || "Belge no yok"} · <span className={muted}>{formatDate(d.issue_date)}</span>
                  </span>
                  <span className={cn("text-xs font-semibold whitespace-nowrap", days == null ? "text-slate-500" : days < 0 ? "text-rose-600 dark:text-rose-400" : days <= 7 ? "text-amber-700 dark:text-amber-400" : "text-slate-600 dark:text-slate-400")}>
                    {days == null ? "vade yok" : days < 0 ? `${-days} gün geçti` : days === 0 ? "bugün" : `${days} gün kaldı`}
                  </span>
                  <span className="w-24 text-right font-semibold tabular-nums">{formatMoney(rem)}</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* 1) Son alış fiyatları ve zamlar */}
      <section className={box}>
        <h3 className={head}>
          <TrendingUp size={16} className="text-brand-600" /> Son alış fiyatları
          <span className="ml-auto text-xs font-semibold text-slate-600 dark:text-slate-400">
            {increases > 0 ? <span className="text-rose-600 dark:text-rose-400">{increases} üründe zam</span> : "Zam yok"} · KDV hariç birim fiyat
          </span>
        </h3>
        <div className="max-h-80 overflow-auto thin-scroll -mx-1">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white dark:bg-[#131b26] text-[11px] uppercase tracking-wide text-slate-600 dark:text-slate-400">
              <tr>
                <th className="px-2 py-1.5 text-left">Ürün</th>
                <th className="px-2 py-1.5 text-right">Önceki</th>
                <th className="px-2 py-1.5 text-right">Son fiyat</th>
                <th className="px-2 py-1.5 text-right">Değişim</th>
                <th className="px-2 py-1.5 text-right hidden sm:table-cell">Son alış</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1e2a3a]">
              {data.prices.slice(0, 60).map((p) => (
                <tr key={p.key}>
                  <td className="px-2 py-1.5 font-medium">
                    <div className="truncate max-w-[260px]">{p.name}</div>
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-slate-600 dark:text-slate-400">{p.prev ? formatMoney(p.prev.price) : "—"}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums font-semibold">
                    {formatMoney(p.last.price)}
                    {p.unit && <span className="text-xs font-normal text-slate-500"> /{unitName(p.unit)}</span>}
                  </td>
                  <td
                    className={cn(
                      "px-2 py-1.5 text-right tabular-nums font-semibold",
                      p.change == null || Math.abs(p.change) < 0.05 ? "text-slate-500" : p.change > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400",
                    )}
                  >
                    {p.change == null ? "ilk alış" : Math.abs(p.change) < 0.05 ? "aynı" : `${p.change > 0 ? "▲" : "▼"} ${pctText(p.change)}`}
                  </td>
                  <td className="px-2 py-1.5 text-right text-xs text-slate-600 dark:text-slate-400 hidden sm:table-cell">{formatDate(p.last.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* 4) Aylık alış */}
        <section className={cn(box, "lg:col-span-2")}>
          <h3 className={head}>
            <BarChart3 size={16} className="text-brand-600" /> Aylık alış (son 12 ay, KDV hariç)
            <span className="ml-auto text-xs font-semibold text-slate-600 dark:text-slate-400 tabular-nums">
              {shownMonth ? `${shownMonth.label} ${shownMonth.year}: ${formatMoney(shownMonth.value)}` : `Toplam ${formatMoney(yearTotal)}`}
            </span>
          </h3>
          <div className="flex h-40 items-end gap-[2px] border-b border-slate-200 dark:border-[#1e2a3a]" onMouseLeave={() => setHoverMonth(null)}>
            {data.months.map((m) => (
              <div
                key={m.key}
                className="group flex h-full flex-1 cursor-default flex-col justify-end px-[3px]"
                onMouseEnter={() => setHoverMonth(m.key)}
                title={`${m.label} ${m.year}: ${formatMoney(m.value)}`}
              >
                <div
                  className={cn("w-full rounded-t-[4px] transition-colors", hoverMonth === m.key ? "bg-brand-700" : "bg-brand-500", m.value <= 0 && "bg-transparent")}
                  style={{ height: `${(Math.max(m.value, 0) / maxMonth) * 100}%`, minHeight: m.value > 0 ? 2 : 0 }}
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

        {/* 5) KDV'li / KDV'siz */}
        <section className={box}>
          <h3 className={head}>
            <Percent size={16} className="text-brand-600" /> KDV&apos;li / KDV&apos;siz alış
          </h3>
          <div className="mb-3 flex h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-[#16202c]">
            <div className="h-full bg-brand-500" style={{ width: `${vatShare}%` }} />
            <div className="h-full bg-amber-500 border-l-2 border-white dark:border-[#131b26]" style={{ width: `${100 - vatShare}%` }} />
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <dt className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-sm bg-brand-500" /> KDV&apos;li (KDV hariç)
              </dt>
              <dd className="font-semibold tabular-nums">{formatMoney(data.vat.netVat)}</dd>
            </div>
            <div className="flex items-center justify-between gap-2 pl-[18px]">
              <dt className={muted}>İndirilecek KDV</dt>
              <dd className="text-xs font-semibold tabular-nums">{formatMoney(data.vat.vatAmt)}</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" /> KDV&apos;siz
              </dt>
              <dd className="font-semibold tabular-nums">{formatMoney(data.vat.netNoVat)}</dd>
            </div>
            <div className={cn("border-t border-slate-200 dark:border-[#1e2a3a] pt-2", muted)}>
              Alışların %{vatShare.toFixed(0)}&apos;i faturalı (KDV&apos;li) · {data.vat.cntVat} / {data.vat.cntNoVat} kalem
            </div>
          </dl>
        </section>
      </div>

      {/* 3) En çok alınanlar */}
      <section className={box}>
        <h3 className={head}>
          <ShoppingBag size={16} className="text-brand-600" /> En çok aldığımız ürünler
          <span className="ml-auto text-xs font-semibold text-slate-600 dark:text-slate-400">tüm zamanlar · KDV hariç</span>
        </h3>
        <div className="grid gap-x-6 gap-y-1.5 md:grid-cols-2">
          {data.top.map((p, i) => (
            <div key={p.name + i} className="flex items-center gap-3 text-sm min-w-0">
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
                  {formatQty(p.qty)} {unitName(p.unit)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {data.reorder.length > 0 && increases > 0 && (
        <p className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
          <AlertTriangle size={14} className="text-amber-500" /> Sipariş öncesi son fiyatları kontrol edin: bu tedarikçide {increases} üründe zam var.
        </p>
      )}
    </div>
  );
}
