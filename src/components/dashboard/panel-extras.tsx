"use client";

// Panel eklentileri (NetHesap360'tan uyarlandı): hızlı işlem çubuğu ve son 12 ay gelir–gider grafiği. Hiçbir kayıt değiştirmez.
import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { FilePlus2, HandCoins, Wallet, Receipt, UserPlus, PackagePlus, ChartColumn } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/lib/supabase/client";
import { tableKey } from "@/lib/data";
import { formatCompact, formatMoney, isoDate } from "@/lib/format";
import { useOrg } from "@/providers/org-provider";
import { cn } from "@/lib/utils";
import { IskontoHesapButton } from "./iskonto-hesap";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
const MASK = "••••••";
const MONTHS_SHORT = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

// ---------------------------------------------------------------------------
// Hızlı işlem çubuğu
// ---------------------------------------------------------------------------
const QUICK = [
  { label: "Satış Faturası", href: "/satislar/faturalar/yeni", icon: FilePlus2, cls: "bg-brand-600 text-white border-brand-600 hover:bg-brand-700" },
  { label: "Tahsilat", href: "/nakit/hareketler/yeni?tip=tahsilat", icon: HandCoins, cls: "text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-300 dark:border-emerald-800 dark:bg-emerald-950/40" },
  { label: "Cari Ödeme", href: "/nakit/hareketler/yeni?tip=odeme", icon: Wallet, cls: "text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100 dark:text-amber-300 dark:border-amber-800 dark:bg-amber-950/40" },
  { label: "Gider Ekle", href: "/giderler/masraflar/yeni", icon: Receipt, cls: "text-rose-700 border-rose-200 bg-rose-50 hover:bg-rose-100 dark:text-rose-300 dark:border-rose-800 dark:bg-rose-950/40" },
  { label: "Müşteri Ekle", href: "/cariler/musteriler/yeni", icon: UserPlus, cls: "text-blue-700 border-blue-200 bg-blue-50 hover:bg-blue-100 dark:text-blue-300 dark:border-blue-800 dark:bg-blue-950/40" },
  { label: "Ürün Ekle", href: "/urunler/yeni", icon: PackagePlus, cls: "text-violet-700 border-violet-200 bg-violet-50 hover:bg-violet-100 dark:text-violet-300 dark:border-violet-800 dark:bg-violet-950/40" },
];

export function QuickActionBar() {
  return (
    <div className="card flex flex-wrap items-center gap-2 px-3 py-2.5 sm:px-4">
      <span className="mr-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">Hızlı İşlemler</span>
      {QUICK.map((q) => (
        <Link key={q.label} href={q.href} className={cn("inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-semibold transition", q.cls)}>
          <q.icon size={14} />
          {q.label}
        </Link>
      ))}
      <IskontoHesapButton />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Son 12 ay gelir – gider
// ---------------------------------------------------------------------------
type DocRow = { doc_type: string; issue_date: string; total_try: number | null; total: number | null; exchange_rate: number | null };
const IN_DOCS = ["sales_invoice", "pos_sale"];

async function fetchYear(orgId: string, from: string): Promise<DocRow[]> {
  const out: DocRow[] = [];
  for (let page = 0; page < 50; page++) {
    const { data, error } = await db
      .from("documents")
      .select("doc_type, issue_date, total_try, total, exchange_rate")
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .in("doc_type", [...IN_DOCS, "sales_return", "purchase_invoice", "purchase_return", "expense", "salary"])
      .not("status", "in", "(draft,cancelled)")
      .gte("issue_date", from)
      .order("issue_date")
      .order("id")
      .range(page * 1000, page * 1000 + 999);
    if (error) throw error;
    out.push(...((data ?? []) as DocRow[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}

export function IncomeExpenseCard({ hidden }: { hidden?: boolean }) {
  const { org } = useOrg();
  const orgId = org?.id;
  const now = new Date();
  const from = isoDate(new Date(now.getFullYear(), now.getMonth() - 11, 1));
  const q = useQuery({
    queryKey: tableKey("documents", orgId, "panel-gelir-gider-12", from),
    enabled: !!orgId,
    queryFn: () => fetchYear(orgId!, from),
  });

  const months = React.useMemo(() => {
    const list: { key: string; label: string; rev: number; exp: number; net: number }[] = [];
    const start = new Date(from);
    for (let i = 0; i < 12; i++) {
      const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
      list.push({ key: isoDate(d).slice(0, 7), label: `${MONTHS_SHORT[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`, rev: 0, exp: 0, net: 0 });
    }
    const idx = new Map(list.map((m, i) => [m.key, i]));
    for (const r of q.data ?? []) {
      const i = idx.get(String(r.issue_date).slice(0, 7));
      if (i == null) continue;
      const a = Number(r.total_try ?? Number(r.total || 0) * Number(r.exchange_rate || 1)) || 0;
      if (IN_DOCS.includes(r.doc_type)) list[i].rev += a;
      else if (r.doc_type === "sales_return") list[i].rev -= a;
      else if (r.doc_type === "purchase_return") list[i].exp -= a;
      else list[i].exp += a;
    }
    return list.map((m) => ({ ...m, rev: Math.round(m.rev), exp: Math.round(m.exp), net: Math.round(m.rev - m.exp) }));
  }, [q.data, from]);

  const totRev = months.reduce((s, m) => s + m.rev, 0);
  const totExp = months.reduce((s, m) => s + m.exp, 0);
  const money = (n: number) => (hidden ? `${MASK} TL` : formatMoney(n));

  return (
    <div className="card p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <ChartColumn size={17} className="text-brand-500" />
            Gelir – Gider (Son 12 Ay)
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">Gelir: satışlar (iadeler düşülmüş) · Gider: alış faturaları + masraflar + maaşlar · belge tarihine göre</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Gelir <b className="tabular-nums text-emerald-700 dark:text-emerald-400">{money(totRev)}</b>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-rose-500" /> Gider <b className="tabular-nums text-rose-700 dark:text-rose-400">{money(totExp)}</b>
          </span>
          <span className={cn("rounded-full px-2.5 py-1 font-bold", totRev - totExp >= 0 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300")}>
            {totRev - totExp >= 0 ? "▲" : "▼"} Fark {money(Math.abs(totRev - totExp))}
          </span>
        </div>
      </div>
      <div className={cn("h-[240px] w-full min-w-0", hidden && "blur-md pointer-events-none select-none")}>
        {q.isPending ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">Yükleniyor…</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={months} barGap={3} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="#e2e8f0" strokeOpacity={0.6} strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} interval={0} />
              <YAxis tickFormatter={(v) => formatCompact(Number(v))} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={56} />
              <ReferenceLine y={0} stroke="#94a3b8" />
              <Tooltip
                cursor={{ fill: "#e2e8f0", fillOpacity: 0.35 }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload as (typeof months)[number];
                  return (
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-900">
                      <div className="mb-1 font-semibold">{label}</div>
                      <div className="tabular-nums">Gelir: {formatMoney(p.rev)}</div>
                      <div className="tabular-nums">Gider: {formatMoney(p.exp)}</div>
                      <div className={cn("mt-0.5 font-semibold tabular-nums", p.net >= 0 ? "text-emerald-600" : "text-rose-600")}>
                        {p.net >= 0 ? "▲ Fazla" : "▼ Açık"}: {formatMoney(Math.abs(p.net))}
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="rev" fill="#10b981" fillOpacity={0.85} radius={[5, 5, 0, 0]} maxBarSize={20} />
              <Bar dataKey="exp" fill="#f43f5e" fillOpacity={0.75} radius={[5, 5, 0, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
