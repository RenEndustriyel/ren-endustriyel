"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useOrg } from "@/providers/org-provider";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Row = { name: string; n: number };
type Stats = {
  live: number;
  today: { views: number; visitors: number };
  total: { views: number; visitors: number };
  daily: { day: string; views: number; visitors: number }[];
  pages: Row[];
  sources: Row[];
  devices: Row[];
  cities: Row[];
  events: Row[];
};

const EVENT_LABELS: Record<string, string> = { whatsapp: "WhatsApp tıklaması", phone: "Telefon tıklaması", teklif: "Teklif iste tıklaması" };
const PAGE_LABELS: Record<string, string> = { "/": "Ana sayfa", "/magaza": "Mağaza ana sayfa", "/iletisim": "İletişim", "/kurumsal": "Kurumsal", "/markalar": "Markalar", "/blog": "Hijyen Rehberi" };
const nf = (n: number) => n.toLocaleString("tr-TR");

/** Kurumsal site + mağaza trafiği (kendi sayacımız; kişi tanımlamaz). Yalnızca sahip/yönetici. */
export function SiteTraffic() {
  const { isAdmin } = useOrg();
  const [days, setDays] = React.useState(30);

  const q = useQuery({
    queryKey: ["site-traffic", days],
    enabled: isAdmin,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("site_traffic_stats" as never, { p_days: days } as never);
      if (error) throw error;
      return data as unknown as Stats;
    },
  });

  if (!isAdmin) return <p className="p-6 text-sm text-slate-500">Site trafiğini yalnızca firma sahibi veya yöneticisi görebilir.</p>;
  if (q.error)
    return (
      <p className="p-6 text-sm text-rose-600">
        Site trafiği okunamadı: {(q.error as Error).message}. Veritabanı kurulumu (20261020000017_site_visits.sql) yapılmamış olabilir.
      </p>
    );

  const s = q.data;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <NativeSelect value={String(days)} onChange={(e) => setDays(Number(e.target.value))} className="w-40">
          <option value="7">Son 7 gün</option>
          <option value="30">Son 30 gün</option>
          <option value="90">Son 90 gün</option>
          <option value="365">Son 1 yıl</option>
        </NativeSelect>
        <Button variant="outline" size="sm" onClick={() => q.refetch()} disabled={q.isFetching}>
          <RefreshCw size={14} className={cn(q.isFetching && "animate-spin")} /> Yenile
        </Button>
        <span className="text-xs text-slate-500">Kurumsal site ve mağaza · çerezsiz sayım, kişi bilgisi tutulmaz · dakikada bir yenilenir</span>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Şu an sitede" value={s?.live} hint="son 5 dakika" live />
        <Tile label="Bugün ziyaretçi" value={s?.today.visitors} hint={s ? `${nf(s.today.views)} sayfa görüntüleme` : undefined} />
        <Tile label={`${days} günde ziyaret`} value={s?.total.visitors} hint={s ? `${nf(s.total.views)} sayfa görüntüleme` : undefined} />
        <Tile label="İletişim tıklaması" value={s?.events.reduce((a, r) => a + r.n, 0)} hint="WhatsApp, telefon, teklif" />
      </div>

      <div className="card p-4">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Günlük ziyaretçi</h3>
        <DailyBars days={days} data={s?.daily ?? []} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <RankCard title="En çok bakılan sayfalar" rows={(s?.pages ?? []).map((r) => ({ ...r, name: PAGE_LABELS[r.name] ?? r.name }))} unit="görüntüleme" />
        <RankCard title="Nereden geldiler" rows={s?.sources ?? []} unit="ziyaret" />
        <RankCard title="Şehir" rows={s?.cities ?? []} unit="ziyaret" />
        <RankCard title="Cihaz" rows={s?.devices ?? []} unit="ziyaret" />
        <RankCard title="İletişim tıklamaları" rows={(s?.events ?? []).map((r) => ({ ...r, name: EVENT_LABELS[r.name] ?? r.name }))} unit="tıklama" />
      </div>
    </div>
  );
}

function Tile({ label, value, hint, live }: { label: string; value?: number; hint?: string; live?: boolean }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
        {live && <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" aria-hidden />}
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-50">{value === undefined ? "—" : nf(value)}</div>
      {hint && <div className="mt-0.5 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

function DailyBars({ days, data }: { days: number; data: Stats["daily"] }) {
  // Boş günler de görünsün diye aralığın tüm günleri doldurulur
  const map = new Map(data.map((d) => [d.day, d]));
  const all = Array.from({ length: days }, (_, i) => {
    const d = new Date(Date.now() - (days - 1 - i) * 86400000).toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" });
    return { day: d, visitors: map.get(d)?.visitors ?? 0, views: map.get(d)?.views ?? 0 };
  });
  const max = Math.max(1, ...all.map((d) => d.visitors));
  const fmt = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });

  return (
    <div className="mt-3">
      <div className="flex h-44 items-end gap-[2px] border-b border-slate-200 dark:border-slate-700">
        {all.map((d) => (
          <div key={d.day} className="group relative flex h-full flex-1 items-end justify-center" title={`${fmt(d.day)}: ${nf(d.visitors)} ziyaretçi, ${nf(d.views)} görüntüleme`}>
            <div className="w-full max-w-6 rounded-t bg-brand-500 transition-opacity group-hover:opacity-80" style={{ height: `${(d.visitors / max) * 100}%`, minHeight: d.visitors ? 2 : 0 }} />
            <div className="pointer-events-none absolute bottom-full mb-1 hidden whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs text-white shadow group-hover:block dark:bg-slate-100 dark:text-slate-900">
              {fmt(d.day)} · {nf(d.visitors)} ziyaretçi · {nf(d.views)} görüntüleme
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-slate-500">
        <span>{fmt(all[0].day)}</span>
        <span>en yüksek {nf(max)}</span>
        <span>{fmt(all[all.length - 1].day)}</span>
      </div>
    </div>
  );
}

function RankCard({ title, rows, unit }: { title: string; rows: Row[]; unit: string }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">Henüz veri yok.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((r) => (
            <li key={r.name} className="text-sm" title={`${nf(r.n)} ${unit}`}>
              <div className="flex justify-between gap-3">
                <span className="truncate text-slate-700 dark:text-slate-200">{r.name}</span>
                <span className="shrink-0 tabular-nums text-slate-500">{nf(r.n)}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-full rounded-full bg-brand-500" style={{ width: `${(r.n / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
