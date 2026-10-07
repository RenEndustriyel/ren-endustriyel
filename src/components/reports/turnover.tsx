"use client";

import * as React from "react";
import { ArrowDownRight, ArrowUpRight, BarChart3, Coins, Percent, Receipt, TrendingUp } from "lucide-react";
import { useRows, useRpcQuery } from "@/lib/data";
import { formatMoney } from "@/lib/format";
import { useOrg } from "@/providers/org-provider";
import { cn } from "@/lib/utils";

type Doc = { id: string; doc_type: string; issue_date: string; total: number; total_try: number | null; net_total: number | null; exchange_rate: number | null };
type Line = { net_amount: number; vat_amount: number; vat_rate: number; document: { doc_type: string; exchange_rate: number | null } };
type Txn = { amount_try: number | null; amount: number; method: string | null; txn_date: string };

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const MONTHS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const box = "rounded-xl border border-slate-200 dark:border-[#1e2a3a] bg-white dark:bg-[#131b26] p-4 min-w-0";
const head = "mb-3 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white";
const muted = "text-xs text-slate-600 dark:text-slate-400";
const pctText = (a: number, b: number) => (b ? `%${((a / b) * 100).toFixed(1).replace(".", ",")}` : "%0");

type Range = { key: string; label: string; from: string; to: string; prevFrom: string; prevTo: string; vs: string };

/** Dönemler: karşılaştırma bir önceki dönemin aynı uzunluktaki kısmıyla (bu ay ↔ geçen ayın aynı günleri) */
function buildRanges(now: Date): Range[] {
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dow = (t.getDay() + 6) % 7; // Pazartesi = 0
  const mon = addDays(t, -dow);
  const m1 = new Date(t.getFullYear(), t.getMonth(), 1);
  const pm1 = new Date(t.getFullYear(), t.getMonth() - 1, 1);
  const pmEnd = new Date(t.getFullYear(), t.getMonth(), 0);
  const ppm1 = new Date(t.getFullYear(), t.getMonth() - 2, 1);
  const ppmEnd = new Date(t.getFullYear(), t.getMonth() - 1, 0);
  const pmSameDay = new Date(t.getFullYear(), t.getMonth() - 1, Math.min(t.getDate(), pmEnd.getDate()));
  const y = t.getFullYear();
  const lastYearSame = new Date(y - 1, t.getMonth(), Math.min(t.getDate(), new Date(y - 1, t.getMonth() + 1, 0).getDate()));
  return [
    { key: "today", label: "Bugün", from: iso(t), to: iso(t), prevFrom: iso(addDays(t, -1)), prevTo: iso(addDays(t, -1)), vs: "düne göre" },
    { key: "yesterday", label: "Dün", from: iso(addDays(t, -1)), to: iso(addDays(t, -1)), prevFrom: iso(addDays(t, -2)), prevTo: iso(addDays(t, -2)), vs: "önceki güne göre" },
    { key: "week", label: "Bu hafta", from: iso(mon), to: iso(t), prevFrom: iso(addDays(mon, -7)), prevTo: iso(addDays(t, -7)), vs: "geçen haftanın aynı günlerine göre" },
    { key: "lastweek", label: "Geçen hafta", from: iso(addDays(mon, -7)), to: iso(addDays(mon, -1)), prevFrom: iso(addDays(mon, -14)), prevTo: iso(addDays(mon, -8)), vs: "önceki haftaya göre" },
    { key: "month", label: "Bu ay", from: iso(m1), to: iso(t), prevFrom: iso(pm1), prevTo: iso(pmSameDay), vs: "geçen ayın aynı günlerine göre" },
    { key: "lastmonth", label: "Geçen ay", from: iso(pm1), to: iso(pmEnd), prevFrom: iso(ppm1), prevTo: iso(ppmEnd), vs: "önceki aya göre" },
    { key: "year", label: "Bu yıl", from: `${y}-01-01`, to: iso(t), prevFrom: `${y - 1}-01-01`, prevTo: iso(lastYearSame), vs: "geçen yılın aynı dönemine göre" },
    { key: "lastyear", label: "Geçen yıl", from: `${y - 1}-01-01`, to: `${y - 1}-12-31`, prevFrom: `${y - 2}-01-01`, prevTo: `${y - 2}-12-31`, vs: "önceki yıla göre" },
  ];
}

const sgn = (d: { doc_type: string }) => (d.doc_type === "sales_return" ? -1 : 1);
const gross = (d: Doc) => Number(d.total_try ?? Number(d.total) * Number(d.exchange_rate || 1));
const netOf = (d: Doc) => Number(d.net_total ?? 0) * Number(d.exchange_rate || 1);

/** Genel ciro: dönem kartları + seçili dönemin ayrıntısı */
export function TurnoverReport() {
  const { org } = useOrg();
  const ranges = React.useMemo(() => buildRanges(new Date()), []);
  const [sel, setSel] = React.useState("month");
  const r = ranges.find((x) => x.key === sel)!;
  const earliest = ranges[ranges.length - 1].prevFrom;

  const docs = useRows<Doc>("documents", {
    select: "id, doc_type, issue_date, total, total_try, net_total, exchange_rate",
    params: ["ciro", earliest],
    filter: (q) => q.in("doc_type", ["sales_invoice", "pos_sale", "sales_return"]).gte("issue_date", earliest).not("status", "in", '("draft","cancelled")'),
  });
  const lines = useRows<Line>("document_lines", {
    select: "net_amount, vat_amount, vat_rate, document:documents!inner(doc_type, issue_date, exchange_rate, status, deleted_at)",
    softDelete: false,
    params: ["ciro_kdv", r.from, r.to],
    filter: (q) =>
      q
        .in("document.doc_type", ["sales_invoice", "pos_sale", "sales_return"])
        .gte("document.issue_date", r.from)
        .lte("document.issue_date", r.to)
        .is("document.deleted_at", null)
        .not("document.status", "in", '("draft","cancelled")'),
  });
  const txns = useRows<Txn>("transactions", {
    select: "amount, amount_try, method, txn_date",
    params: ["ciro_tahsilat", r.from, r.to],
    filter: (q) => q.eq("type", "collection").eq("direction", "in").gte("txn_date", r.from).lte("txn_date", r.to),
  });
  const profit = useRpcQuery<{ net: number; profit: number; cost: number }[]>(
    "report_sales",
    { p_org: org?.id, p_from: r.from, p_to: r.to, p_group: "contact" },
    { enabled: !!org?.id },
  );

  const sum = React.useCallback(
    (from: string, to: string) => {
      let g = 0,
        n = 0,
        count = 0,
        returns = 0,
        invoice = 0,
        pos = 0;
      for (const d of docs.data ?? []) {
        if (d.issue_date < from || d.issue_date > to) continue;
        const v = gross(d);
        g += sgn(d) * v;
        n += sgn(d) * netOf(d);
        if (d.doc_type === "sales_return") returns += v;
        else {
          count++;
          if (d.doc_type === "pos_sale") pos += v;
          else invoice += v;
        }
      }
      return { gross: g, net: n, count, returns, invoice, pos };
    },
    [docs.data],
  );

  const tiles = ranges.map((x) => ({ ...x, cur: sum(x.from, x.to), prev: sum(x.prevFrom, x.prevTo) }));
  const cur = tiles.find((x) => x.key === sel)!;

  // Grafik: 62 günden kısa dönemde günlük, uzunda aylık
  const series = React.useMemo(() => {
    const from = new Date(r.from);
    const to = new Date(r.to);
    const days = Math.round((to.getTime() - from.getTime()) / 864e5) + 1;
    const buckets: { key: string; label: string; value: number }[] = [];
    const daily = days <= 62;
    if (daily) {
      for (let i = 0; i < days; i++) {
        const d = addDays(from, i);
        buckets.push({ key: iso(d), label: days <= 7 ? ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"][(d.getDay() + 6) % 7] : String(d.getDate()), value: 0 });
      }
    } else {
      for (let d = new Date(from.getFullYear(), from.getMonth(), 1); d <= to; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
        buckets.push({ key: `${d.getFullYear()}-${pad(d.getMonth() + 1)}`, label: MONTHS[d.getMonth()], value: 0 });
      }
    }
    const idx = new Map(buckets.map((b, i) => [b.key, i]));
    for (const d of docs.data ?? []) {
      if (d.issue_date < r.from || d.issue_date > r.to) continue;
      const i = idx.get(daily ? d.issue_date : d.issue_date.slice(0, 7));
      if (i != null) buckets[i].value += sgn(d) * gross(d);
    }
    return { buckets, daily };
  }, [docs.data, r.from, r.to]);

  const vat = React.useMemo(() => {
    const v = { withVat: 0, vatAmt: 0, noVat: 0 };
    for (const l of lines.data ?? []) {
      const k = sgn(l.document) * (Number(l.document.exchange_rate) || 1);
      if (Number(l.vat_rate) > 0) {
        v.withVat += k * Number(l.net_amount);
        v.vatAmt += k * Number(l.vat_amount);
      } else v.noVat += k * Number(l.net_amount);
    }
    return v;
  }, [lines.data]);

  const pay = React.useMemo(() => {
    const m = { cash: 0, card: 0, bank: 0, other: 0 };
    for (const t of txns.data ?? []) {
      const a = Number(t.amount_try ?? t.amount ?? 0);
      if (t.method === "cash") m.cash += a;
      else if (t.method === "credit_card" || t.method === "card" || t.method === "pos") m.card += a;
      else if (t.method === "bank_transfer" || t.method === "bank") m.bank += a;
      else m.other += a;
    }
    return { ...m, total: m.cash + m.card + m.bank + m.other };
  }, [txns.data]);

  const pr = (profit.data ?? []).reduce((s, x) => ({ net: s.net + Number(x.net), profit: s.profit + Number(x.profit) }), { net: 0, profit: 0 });
  const [hover, setHover] = React.useState<string | null>(null);
  const max = Math.max(...series.buckets.map((b) => Math.max(b.value, 0)), 1);
  const hovered = series.buckets.find((b) => b.key === hover);
  const avg = cur.cur.count ? (cur.cur.gross + cur.cur.returns) / cur.cur.count : 0;

  return (
    <div className="space-y-4">
      {/* Dönem kartları */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map((x) => {
          const ch = x.prev.gross ? ((x.cur.gross - x.prev.gross) / Math.abs(x.prev.gross)) * 100 : null;
          const active = x.key === sel;
          return (
            <button
              key={x.key}
              type="button"
              onClick={() => setSel(x.key)}
              className={cn(
                "rounded-xl border p-3 text-left transition min-w-0",
                active
                  ? "border-brand-500 bg-brand-50 ring-2 ring-brand-500/30 dark:bg-brand-900/30"
                  : "border-slate-200 bg-white hover:border-brand-300 dark:border-[#1e2a3a] dark:bg-[#131b26]",
              )}
            >
              <div className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">{x.label}</div>
              <div className="mt-1 truncate text-lg font-extrabold tabular-nums text-slate-900 dark:text-white sm:text-xl">{formatMoney(x.cur.gross)}</div>
              <div className={cn(muted, "truncate")}>
                Net {formatMoney(x.cur.net)} · {x.cur.count} satış
              </div>
              <div
                className={cn(
                  "mt-1 flex items-center gap-1 text-xs font-semibold",
                  ch == null ? "text-slate-500" : ch >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
                )}
                title={`${x.vs}: ${formatMoney(x.prev.gross)}`}
              >
                {ch == null ? (
                  "karşılaştırma yok"
                ) : (
                  <>
                    {ch >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}%{Math.abs(ch).toFixed(1).replace(".", ",")}
                    <span className="truncate font-normal text-slate-500 dark:text-slate-400">{x.vs}</span>
                  </>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Seçili dönem: grafik */}
      <section className={box}>
        <h3 className={head}>
          <BarChart3 size={16} className="text-brand-600" /> {cur.label} — {series.daily ? "günlük" : "aylık"} ciro (KDV dahil)
          <span className="ml-auto text-xs font-semibold tabular-nums text-slate-600 dark:text-slate-400">
            {hovered ? `${hovered.label}${series.daily && series.buckets.length > 7 ? ". gün" : ""}: ${formatMoney(hovered.value)}` : `Toplam ${formatMoney(cur.cur.gross)}`}
          </span>
        </h3>
        <div className="flex h-44 items-end gap-[2px] border-b border-slate-200 dark:border-[#1e2a3a]" onMouseLeave={() => setHover(null)}>
          {series.buckets.map((b) => (
            <div key={b.key} className="flex h-full flex-1 flex-col justify-end px-[1px] sm:px-[2px]" onMouseEnter={() => setHover(b.key)} title={`${b.key}: ${formatMoney(b.value)}`}>
              <div
                className={cn("w-full rounded-t-[4px] transition-colors", hover === b.key ? "bg-brand-700" : "bg-brand-500")}
                style={{ height: `${(Math.max(b.value, 0) / max) * 100}%`, minHeight: b.value > 0 ? 2 : 0 }}
              />
            </div>
          ))}
        </div>
        <div className="mt-1 flex gap-[2px]">
          {series.buckets.map((b, i) => (
            <div key={b.key} className={cn("flex-1 text-center text-[10px] text-slate-500 dark:text-slate-400", hover === b.key && "font-bold text-slate-800 dark:text-slate-200")}>
              {series.buckets.length > 16 && i % 2 === 1 && hover !== b.key ? "" : b.label}
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {/* Özet */}
        <section className={box}>
          <h3 className={head}>
            <Receipt size={16} className="text-brand-600" /> {cur.label} özeti
          </h3>
          <dl className="space-y-1.5 text-sm">
            {[
              ["Ciro (KDV dahil)", formatMoney(cur.cur.gross), "font-bold"],
              ["Net ciro (KDV hariç)", formatMoney(cur.cur.net), ""],
              ["Satış sayısı", String(cur.cur.count), ""],
              ["Ortalama satış", formatMoney(avg), ""],
              ["İadeler", cur.cur.returns ? `−${formatMoney(cur.cur.returns)}` : formatMoney(0), cur.cur.returns ? "text-rose-600 dark:text-rose-400" : ""],
            ].map(([k, v, c]) => (
              <div key={k} className="flex justify-between gap-2">
                <dt className={muted}>{k}</dt>
                <dd className={cn("tabular-nums", c)}>{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Kanal */}
        <section className={box}>
          <h3 className={head}>
            <TrendingUp size={16} className="text-brand-600" /> Satış kanalı
          </h3>
          <Split
            parts={[
              { label: "Fatura", value: cur.cur.invoice, cls: "bg-brand-500" },
              { label: "Hızlı satış", value: cur.cur.pos, cls: "bg-amber-500" },
            ]}
          />
        </section>

        {/* KDV */}
        <section className={box}>
          <h3 className={head}>
            <Percent size={16} className="text-brand-600" /> KDV&apos;li / KDV&apos;siz (net)
          </h3>
          <Split
            parts={[
              { label: "KDV'li", value: vat.withVat, cls: "bg-brand-500" },
              { label: "KDV'siz", value: vat.noVat, cls: "bg-amber-500" },
            ]}
          />
          <div className={cn(muted, "mt-2 flex justify-between")}>
            <span>Hesaplanan KDV</span>
            <span className="tabular-nums">{formatMoney(vat.vatAmt)}</span>
          </div>
        </section>

        {/* Kâr */}
        <section className={box}>
          <h3 className={head}>
            <TrendingUp size={16} className="text-brand-600" /> Brüt kâr
          </h3>
          <div className={cn("text-2xl font-extrabold tabular-nums", pr.profit < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400")}>{formatMoney(pr.profit)}</div>
          <div className={muted}>
            Marj {pctText(pr.profit, pr.net)} · net satış {formatMoney(pr.net)}
          </div>
          <p className={cn(muted, "mt-2")}>Satış anındaki alış maliyetine göre (KDV hariç). Alış kaydı olmayan ürünlerde kâr yüksek görünebilir.</p>
        </section>
      </div>

      {/* Tahsilat */}
      <section className={box}>
        <h3 className={head}>
          <Coins size={16} className="text-brand-600" /> {cur.label} alınan tahsilatlar
          <span className="ml-auto text-xs font-semibold tabular-nums text-slate-600 dark:text-slate-400">Toplam {formatMoney(pay.total)}</span>
        </h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ["Nakit", pay.cash],
            ["Kredi kartı / POS", pay.card],
            ["Banka / havale", pay.bank],
            ["Diğer", pay.other],
          ].map(([k, v]) => (
            <div key={k as string} className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-[#16202c]">
              <div className={muted}>{k}</div>
              <div className="font-bold tabular-nums">{formatMoney(v as number)}</div>
            </div>
          ))}
        </div>
        <p className={cn(muted, "mt-2")}>Ciro ile tahsilat farkı bu dönemde vadeye kalan (açık) satışları ve önceki dönemlerden alınan tahsilatları gösterir.</p>
      </section>
    </div>
  );
}

function Split({ parts }: { parts: { label: string; value: number; cls: string }[] }) {
  const total = parts.reduce((s, p) => s + Math.max(p.value, 0), 0);
  return (
    <>
      <div className="mb-3 flex h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-[#16202c]">
        {parts.map((p, i) => (
          <div key={p.label} className={cn("h-full", p.cls, i > 0 && "border-l-2 border-white dark:border-[#131b26]")} style={{ width: `${total ? (Math.max(p.value, 0) / total) * 100 : 0}%` }} />
        ))}
      </div>
      <dl className="space-y-1.5 text-sm">
        {parts.map((p) => (
          <div key={p.label} className="flex items-center justify-between gap-2">
            <dt className="flex items-center gap-2">
              <span className={cn("h-2.5 w-2.5 rounded-sm", p.cls)} /> {p.label}
            </dt>
            <dd className="tabular-nums">
              <span className="font-semibold">{formatMoney(p.value)}</span>
              <span className="ml-1 text-xs text-slate-500">{total ? `%${((Math.max(p.value, 0) / total) * 100).toFixed(0)}` : ""}</span>
            </dd>
          </div>
        ))}
      </dl>
    </>
  );
}
