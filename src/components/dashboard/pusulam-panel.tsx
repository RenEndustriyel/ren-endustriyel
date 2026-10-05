"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  Banknote,
  Bell,
  Briefcase,
  Building2,
  Calendar,
  CalendarClock,
  ChartColumn,
  CircleHelp,
  Clock,
  DollarSign,
  Eye,
  EyeOff,
  FileCheck,
  FileText,
  GraduationCap,
  HandCoins,
  Landmark,
  Megaphone,
  Scale,
  ScrollText,
  ShoppingCart,
  Sparkles,
  Store,
  Tag,
  TrendingUp,
  TriangleAlert,
  Truck,
  Users,
  UsersRound,
  Wallet,
  Warehouse,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { DOC_TYPES, type DocType } from "@/lib/doc-types";
import { formatCompact, formatDate, formatMoney, formatNumber, formatQty, isoDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { TYPE_LABELS, type DashboardSummary } from "./types";

// ---------------------------------------------------------------------------
// Sabitler
// ---------------------------------------------------------------------------

const MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const MONTHS_SHORT = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

/** Pusulam modül ızgarası; `soon` olanlar henüz uygulamada yok ve "Yakında" sayfasına gider */
const MODULES: { label: string; href: string; icon: LucideIcon; color: string }[] = [
  { label: "REN AI", href: "/yapay-zeka", icon: Sparkles, color: "text-purple-500 animate-pulse-slow" },
  { label: "Hızlı Satış", href: "/hizli-satis", icon: Zap, color: "text-amber-500" },
  { label: "Ürünler", href: "/urunler", icon: Tag, color: "text-violet-500" },
  { label: "Alışlar", href: "/alislar", icon: Scale, color: "text-amber-500" },
  { label: "Satışlar", href: "/satislar", icon: ShoppingCart, color: "text-emerald-500" },
  { label: "Masraflar", href: "/masraflar", icon: Banknote, color: "text-rose-500" },
  { label: "e-Fatura", href: "/e-fatura", icon: FileCheck, color: "text-teal-600" },
  { label: "Şubeler", href: "/stok/depolar", icon: Building2, color: "text-sky-600" },
  { label: "Stoklar", href: "/stok/hareketler", icon: Warehouse, color: "text-cyan-500" },
  { label: "Müşteriler", href: "/musteriler", icon: Users, color: "text-sky-500" },
  { label: "Tedarikçiler", href: "/tedarikciler", icon: Truck, color: "text-indigo-500" },
  { label: "Teklifler", href: "/satislar/teklifler", icon: FileText, color: "text-purple-500" },
  { label: "Çek & Senet", href: "/nakit/cek-senet", icon: ScrollText, color: "text-orange-600" },
  { label: "Hesaplar", href: "/hesaplar", icon: Wallet, color: "text-teal-500" },
  { label: "Banka Ekstresi", href: "/nakit/ekstre", icon: Landmark, color: "text-emerald-600" },
  { label: "Kampanya", href: "/kampanya", icon: Megaphone, color: "text-rose-500" },
  { label: "Hatırlatmalar", href: "/cari-hatirlatmalar", icon: Bell, color: "text-amber-600" },
  { label: "Raporlar", href: "/raporlar", icon: ChartColumn, color: "text-fuchsia-500" },
  { label: "Ajanda (Takvim & Notlar)", href: "/ajanda", icon: Calendar, color: "text-blue-500" },
  { label: "E-Ticaret", href: "/e-ticaret", icon: Store, color: "text-orange-500" },
  { label: "Çalışanlar & Ekip", href: "/giderler/calisanlar", icon: UsersRound, color: "text-indigo-500" },
  { label: "Akademi", href: "/akademi", icon: GraduationCap, color: "text-indigo-600" },
  { label: "Muhasebeci Ağı", href: "/muhasebeci-agi", icon: Briefcase, color: "text-violet-600" },
];

const SUMMARY_KEY = "ren-panel-ozet-acik";

// ---------------------------------------------------------------------------
// Yardımcılar
// ---------------------------------------------------------------------------

/** "YYYY-MM-DD" → Date (yerel saat) */
const parseDay = (s: string) => {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
};

/** "YYYY-MM-DD" gününü `days` kadar kaydırır */
const shiftDay = (s: string, days: number) => {
  const dt = parseDay(s);
  dt.setDate(dt.getDate() + days);
  return isoDate(dt);
};

const monthRange = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return { from: isoDate(new Date(y, m - 1, 1)), to: isoDate(new Date(y, m, 0)) };
};

const salesUrl = (from: string, to: string) => `/satislar?baslangic=${from}&bitis=${to}`;

/** Son hareket satırının gideceği adres */
function recentHref(r: DashboardSummary["recent"][number]): string {
  if (r.kind === "document") {
    const cfg = DOC_TYPES[r.type as DocType];
    return cfg ? `${cfg.base}/detay?id=${r.id}` : "/satislar";
  }
  return "/nakit/hareketler";
}

const METHOD_LABELS: Record<string, string> = {
  cash: "Nakit",
  card: "Kredi kartı",
  credit_card: "Kredi kartı",
  bank: "Havale/EFT",
  transfer: "Havale/EFT",
  cheque: "Çek",
};

// ---------------------------------------------------------------------------
// Alt bileşenler
// ---------------------------------------------------------------------------

function KpiCard({ href, value, label, gradient }: { href: string; value: number; label: string; gradient: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-2xl px-4 py-3 text-white bg-gradient-to-br shadow-soft min-w-0 overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md",
        gradient,
      )}
    >
      <div className="text-lg sm:text-xl font-bold tabular-nums truncate">{formatMoney(value)}</div>
      <div className="text-xs font-medium opacity-90 mt-0.5 truncate">{label}</div>
    </Link>
  );
}

function SummaryStrip({ data }: { data: DashboardSummary | undefined }) {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    try {
      // Tercih yalnızca bu tarayıcıda saklanır
      if (localStorage.getItem(SUMMARY_KEY) === "1") setOpen(true); // eslint-disable-line react-hooks/set-state-in-effect
    } catch {}
  }, []);

  const toggle = () => {
    setOpen((v) => {
      try {
        localStorage.setItem(SUMMARY_KEY, v ? "0" : "1");
      } catch {}
      return !v;
    });
  };

  const monthSales = Number(data?.kpi?.month_sales) || 0;
  const monthExpenses = Number(data?.kpi?.month_expenses) || 0;
  const yesterday = shiftDay(isoDate(), -1);
  const yesterdaySales = Number(data?.sales_daily?.find((d) => String(d.date).slice(0, 10) === yesterday)?.amount) || 0;

  return (
    <section className="space-y-3" aria-label="Dönem özeti">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={toggle}
          className="flex items-center gap-2 font-semibold rounded-lg -mx-1 px-1 hover:text-brand-600"
          title={open ? "Özeti gizle" : "Özeti göster"}
        >
          Özet
          {open ? <EyeOff size={14} className="text-slate-400" /> : <Eye size={14} className="text-slate-400" />}
          {!open && (
            <span className="text-xs font-normal text-slate-400">
              Satış, kâr ve dünün özeti gizli — görmek için dokunun
            </span>
          )}
        </button>
      </div>
      {open && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
          <Link href={salesUrl(monthRange(isoDate().slice(0, 7)).from, isoDate())} className="card p-4 hover:shadow-soft transition">
            <div className="text-xs text-slate-400">Bu ay satış</div>
            <div className="text-lg font-bold tabular-nums mt-0.5">{formatMoney(monthSales)}</div>
          </Link>
          <Link href="/raporlar/gelir-gider" className="card p-4 hover:shadow-soft transition">
            <div className="text-xs text-slate-400">Bu ay kâr (satış − masraf)</div>
            <div
              className={cn(
                "text-lg font-bold tabular-nums mt-0.5",
                monthSales - monthExpenses >= 0 ? "text-emerald-500" : "text-rose-500",
              )}
            >
              {formatMoney(monthSales - monthExpenses)}
            </div>
          </Link>
          <Link href={salesUrl(yesterday, yesterday)} className="card p-4 hover:shadow-soft transition">
            <div className="text-xs text-slate-400">Dün satış</div>
            <div className="text-lg font-bold tabular-nums mt-0.5">{formatMoney(yesterdaySales)}</div>
          </Link>
        </div>
      )}
    </section>
  );
}

type ChartMode = "daily" | "weekly" | "monthly";
type ChartPoint = { label: string; amount: number; from: string; to: string };

function SalesChartCard({ data }: { data: DashboardSummary | undefined }) {
  const router = useRouter();
  const [mode, setMode] = React.useState<ChartMode>("daily");

  const points = React.useMemo<ChartPoint[]>(() => {
    const daily = (data?.sales_daily ?? []).map((d) => ({ date: String(d.date).slice(0, 10), amount: Number(d.amount) || 0 }));

    if (mode === "daily") {
      return daily.slice(-14).map((d) => {
        const dt = parseDay(d.date);
        return { label: `${dt.getDate()} ${MONTHS_SHORT[dt.getMonth()]}`, amount: d.amount, from: d.date, to: d.date };
      });
    }

    if (mode === "weekly") {
      // Son 30 günü pazartesi başlangıçlı haftalara böl
      const weeks = new Map<string, ChartPoint>();
      for (const d of daily) {
        const dt = parseDay(d.date);
        const monday = new Date(dt);
        monday.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));
        const key = isoDate(monday);
        const w = weeks.get(key) ?? {
          label: `${monday.getDate()} ${MONTHS_SHORT[monday.getMonth()]}`,
          amount: 0,
          from: d.date,
          to: d.date,
        };
        w.amount += d.amount;
        w.to = d.date;
        weeks.set(key, w);
      }
      return [...weeks.values()];
    }

    return (data?.sales_monthly ?? []).map((m) => {
      const ym = String(m.month).slice(0, 7);
      const [y, mm] = ym.split("-").map(Number);
      const { from, to } = monthRange(ym);
      return { label: `${MONTHS_SHORT[mm - 1]} ${String(y).slice(2)}`, amount: Number(m.amount) || 0, from, to };
    });
  }, [mode, data?.sales_daily, data?.sales_monthly]);

  const total = points.reduce((s, p) => s + p.amount, 0);
  const periodLabel = mode === "daily" ? "Son 14 gün" : mode === "weekly" ? "Son 30 gün, haftalık" : "Son 12 ay";

  const openPoint = (p: ChartPoint | undefined) => {
    if (p) router.push(salesUrl(p.from, p.to));
  };

  const modes: { id: ChartMode; label: string }[] = [
    { id: "daily", label: "Günlük" },
    { id: "weekly", label: "Haftalık" },
    { id: "monthly", label: "Aylık" },
  ];

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="font-semibold flex items-center gap-2">
            <ChartColumn size={17} className="text-brand-500" />
            Satış Grafiği
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {periodLabel} (TL) · Toplam{" "}
            <span className="font-semibold text-brand-600 dark:text-brand-400">{formatMoney(total)}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden text-xs font-bold">
            {modes.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className={cn(
                  "px-3 py-1.5 transition",
                  mode === m.id ? "bg-brand-500 text-white" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
          <Link href="/raporlar/satis" className="text-xs font-semibold text-brand-600 hover:underline">
            Detaylı rapor →
          </Link>
        </div>
      </div>
      <div className="h-[220px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={points}
            margin={{ top: 6, right: 8, bottom: 0, left: 0 }}
            onClick={(state) => {
              const idx = Number((state as { activeTooltipIndex?: number | string } | null)?.activeTooltipIndex);
              if (Number.isFinite(idx)) openPoint(points[idx]);
            }}
            className="cursor-pointer"
          >
            <defs>
              <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0f9b8e" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#0f9b8e" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#e2e8f0" strokeOpacity={0.6} strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} minTickGap={12} />
            <YAxis
              tickFormatter={formatCompact}
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              width={44}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ stroke: "#94a3b8", strokeDasharray: "3 3" }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs shadow-lg">
                    <div className="font-semibold mb-0.5">{label}</div>
                    <div className="tabular-nums">Satış: {formatMoney(Number(payload[0].value) || 0)}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Satışları görmek için tıklayın</div>
                  </div>
                ) : null
              }
            />
            <Area
              type="monotone"
              dataKey="amount"
              name="Satış"
              stroke="#0f9b8e"
              strokeWidth={2.5}
              fill="url(#salesFill)"
              fillOpacity={0.6}
              activeDot={{ r: 5, onClick: (_e: unknown, p: unknown) => openPoint((p as { payload?: ChartPoint })?.payload) }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function TopProductsCard({ data }: { data: DashboardSummary | undefined }) {
  const rows = (data?.top_products ?? []).slice(0, 8);
  if (rows.length === 0) return null;
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">En Çok Satan Ürünler</h2>
        <Link href="/raporlar/satis" className="text-xs font-semibold text-brand-600 hover:underline">
          Tüm rapor →
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {rows.map((p, i) => (
          <Link
            key={p.id}
            href={`/urunler/${p.id}`}
            className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 hover:border-brand-300 dark:hover:border-brand-800 hover:shadow-soft transition"
          >
            <div className="text-[10px] font-bold text-slate-400">#{i + 1}</div>
            <div className="font-semibold text-sm truncate mt-0.5">{p.name}</div>
            <div className="text-xs text-slate-500 mt-1">{formatQty(p.quantity)} adet</div>
            <div className="text-sm font-bold text-brand-600 mt-1">{formatMoney(p.amount)}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function CurrencyCard({ data }: { data: DashboardSummary | undefined }) {
  const usd = Number(data?.rates?.USD) || 0;
  const eur = Number(data?.rates?.EUR) || 0;
  const c = data?.currency;
  const item = (label: string, value: number, sym: "$" | "€", rate: number, color?: string) => (
    <div>
      <div className="text-xs text-slate-400">{label}</div>
      <div className={cn("font-bold mt-0.5", color)}>
        {sym}
        {formatNumber(value)}
      </div>
      <div className="text-[11px] text-slate-400">≈ {formatMoney(value * rate)}</div>
    </div>
  );

  return (
    <Link href="/hesaplar" className="card p-5 block hover:shadow-soft transition">
      <h2 className="font-semibold mb-3 flex items-center gap-2">
        <DollarSign size={17} className="text-blue-500" />
        Döviz Özeti
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
        {item("Bu ay satış (USD)", Number(c?.sales_usd) || 0, "$", usd, "text-blue-600 dark:text-blue-400")}
        {item("Bu ay satış (EUR)", Number(c?.sales_eur) || 0, "€", eur, "text-indigo-600 dark:text-indigo-400")}
        {item(`Kasa USD · 1$ = ${usd.toFixed(2)} ₺`, Number(c?.cash_usd) || 0, "$", usd)}
        {item(`Kasa EUR · 1€ = ${eur.toFixed(2)} ₺`, Number(c?.cash_eur) || 0, "€", eur)}
      </div>
      <p className="text-xs text-slate-400 mt-3">
        Aylık ciro ve kasa toplamı döviz belgeleri kayıtlı kurla TL&apos;ye çevrilir. Güncel kur: Ayarlar → Canlı Kuru Çek.
      </p>
    </Link>
  );
}

function BalanceCards({ data }: { data: DashboardSummary | undefined }) {
  const receivable = Number(data?.kpi?.receivable) || 0;
  const payable = Number(data?.kpi?.payable) || 0;
  const net = receivable - payable;
  const cls = "card p-5 hover:shadow-soft hover:-translate-y-0.5 transition";
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Link href="/musteriler" className={cls}>
        <div className="text-sm text-slate-500 dark:text-slate-400">Toplam Alacak (Müşteriler)</div>
        <div className="text-2xl font-bold text-emerald-500 mt-1">{formatMoney(receivable)}</div>
      </Link>
      <Link href="/tedarikciler" className={cls}>
        <div className="text-sm text-slate-500 dark:text-slate-400">Toplam Borç (Tedarikçiler)</div>
        <div className="text-2xl font-bold text-rose-500 mt-1">{formatMoney(payable)}</div>
      </Link>
      <Link href="/raporlar/cari-bakiye" className={cls}>
        <div className="text-sm text-slate-500 dark:text-slate-400">Net Durum</div>
        <div className={cn("text-2xl font-bold mt-1", net >= 0 ? "text-brand-500" : "text-rose-500")}>{formatMoney(net)}</div>
      </Link>
    </div>
  );
}

function RecentCard({ data }: { data: DashboardSummary | undefined }) {
  const rows = data?.recent ?? [];
  // Bugünün satış özeti (Pusulam: "Bugün: 1 satış · 2.398,00 TL")
  const today = isoDate();
  const todaySales = rows.filter(
    (r) => r.kind === "document" && (r.type === "sales_invoice" || r.type === "pos_sale") && String(r.date).slice(0, 10) === today,
  );
  const todayAmount = Number(data?.sales_daily?.find((d) => String(d.date).slice(0, 10) === today)?.amount) || 0;
  return (
    <div className="card p-5">
      <h2 className="font-semibold mb-3 flex items-center gap-2">
        <Clock size={17} className="text-brand-500" />
        Son Hareketler
      </h2>
      {todayAmount > 0 && (
        <Link
          href={salesUrl(today, today)}
          className="mb-3 flex flex-wrap gap-1.5"
          aria-label="Bugünün toplamı"
        >
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 self-center mr-1">Bugün:</span>
          <span className="text-xs rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 transition">
            {todaySales.length > 0 ? `${todaySales.length} satış · ` : ""}
            {formatMoney(todayAmount)}
          </span>
        </Link>
      )}
      {rows.length === 0 ? (
        <p className="text-sm text-slate-400 py-6 text-center">Henüz hareket yok.</p>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((r) => {
            const amount = Number(r.amount) || 0;
            const isDoc = r.kind === "document";
            const detail = [formatDate(r.date), r.number, r.method ? METHOD_LABELS[r.method] ?? r.method : null]
              .filter(Boolean)
              .join(" · ");
            return (
              <Link
                key={`${r.kind}-${r.id}`}
                href={recentHref(r)}
                className="flex items-center gap-3 py-2.5 -mx-2 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
              >
                <div
                  className={cn(
                    "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                    isDoc
                      ? "bg-brand-50 dark:bg-brand-900/30 text-brand-500"
                      : "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500",
                  )}
                >
                  {isDoc ? <FileText size={17} /> : <HandCoins size={17} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {TYPE_LABELS[r.type] ?? r.type}
                    {r.party ? ` · ${r.party}` : ""}
                  </div>
                  <div className="text-xs text-slate-400 truncate">{detail}</div>
                </div>
                <div className={cn("font-semibold text-sm shrink-0", amount >= 0 ? "text-emerald-500" : "text-rose-500")}>
                  {amount >= 0 ? "+" : "-"}
                  {formatMoney(Math.abs(amount))}
                </div>
              </Link>
            );
          })}
        </div>
      )}
      <p className="mt-2 text-[11px] text-slate-400">
        Tahsilat, masraf ve para hareketleri şube bilgisi taşımaz; her şubede görünür.
      </p>
    </div>
  );
}

function UpcomingPaymentsCard({ data }: { data: DashboardSummary | undefined }) {
  const rows = React.useMemo(
    () =>
      (data?.timeline ?? [])
        .filter((t) => t.flow === "out")
        .sort((a, b) => a.due_date.localeCompare(b.due_date))
        .slice(0, 8),
    [data?.timeline],
  );

  return (
    <div className="card p-5">
      <h2 className="font-semibold mb-3 flex items-center gap-2">
        <CalendarClock size={17} className="text-rose-500" />
        Yaklaşan / Geciken Ödemeler
      </h2>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-400 py-6 text-center">Ödenecek masraf yok.</p>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((t) => {
            const cfg = DOC_TYPES[t.doc_type as DocType];
            const overdue = Number(t.days_overdue) > 0;
            return (
              <Link
                key={t.id}
                href={cfg ? `${cfg.base}/detay?id=${t.id}` : "/alislar"}
                className="flex items-center gap-3 py-2.5 -mx-2 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
              >
                <div
                  className={cn(
                    "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                    overdue ? "bg-rose-50 dark:bg-rose-900/30 text-rose-500" : "bg-amber-50 dark:bg-amber-900/30 text-amber-500",
                  )}
                >
                  <CalendarClock size={17} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {cfg?.label ?? "Belge"}
                    {t.party ? ` · ${t.party}` : ""}
                  </div>
                  <div className="text-xs text-slate-400 truncate">
                    {t.number ? `${t.number} · ` : ""}Vade: {formatDate(t.due_date)}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-semibold text-sm text-rose-500">{formatMoney(t.amount)}</div>
                  {overdue && <span className="text-[10px] text-rose-500 font-semibold">Gecikmiş</span>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CriticalStockCard({ data }: { data: DashboardSummary | undefined }) {
  const rows = data?.critical_stock ?? [];
  if (rows.length === 0) return null;
  return (
    <div className="card p-5 border-l-4 border-l-amber-400">
      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold mb-3">
        <TriangleAlert size={17} />
        Kritik Stok Uyarısı ({rows.length})
        <Link href="/urunler?filtre=kritik" className="ml-auto text-xs font-medium text-brand-600 hover:underline">
          Tümünü gör →
        </Link>
      </div>
      <div className="flex flex-wrap gap-2">
        {rows.map((p) => (
          <Link
            key={p.id}
            href={`/urunler/${p.id}`}
            className="chip bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:ring-1 hover:ring-amber-400"
          >
            {p.name} · {formatQty(p.stock_qty)} ad
          </Link>
        ))}
      </div>
    </div>
  );
}

function ModulesGrid() {
  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">Modüller</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3">
        {MODULES.map((m) => {
          const Icon = m.icon;
          return (
            <Link
              key={m.href}
              href={m.href}
              className="card p-3 sm:p-4 flex flex-col items-center gap-2 hover:shadow-soft hover:-translate-y-0.5 transition group min-w-0"
            >
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-brand-50 dark:group-hover:bg-brand-900/30 transition shrink-0">
                <Icon size={22} className={m.color} />
              </div>
              <span className="text-[11px] sm:text-xs font-semibold text-center text-slate-600 dark:text-slate-300 leading-tight line-clamp-2">
                {m.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export function PusulamPanel({ data }: { data: DashboardSummary | undefined }) {
  const [helpOpen, setHelpOpen] = React.useState(false);
  const today = isoDate();
  const thisMonth = MONTHS[new Date().getMonth()];
  const { from: monthFrom } = monthRange(today.slice(0, 7));
  const kpi = data?.kpi;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-white flex items-center justify-center shadow-soft">
          <TrendingUp size={22} />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Genel Bakış</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">İşletmenizin anlık durumu</p>
        </div>
      </div>

      <SummaryStrip data={data} />

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2.5 sm:gap-3">
        <KpiCard
          href={salesUrl(monthFrom, today)}
          value={Number(kpi?.month_sales) || 0}
          label={`${thisMonth} Cirosu`}
          gradient="from-amber-400 to-amber-500"
        />
        <KpiCard
          href="/masraflar"
          value={Number(kpi?.month_expenses) || 0}
          label={`${thisMonth} Masrafları`}
          gradient="from-rose-400 to-rose-500"
        />
        <KpiCard
          href="/nakit/hareketler?donem=bugun&yon=giris"
          value={Number(kpi?.today_collections) || 0}
          label="Bugünkü Tahsilat"
          gradient="from-blue-400 to-blue-500"
        />
        <KpiCard
          href="/hesaplar"
          value={Number(kpi?.cash_bank) || 0}
          label="Kasa / Banka (TL)"
          gradient="from-emerald-400 to-emerald-500"
        />
        <KpiCard
          href="/musteriler"
          value={Number(kpi?.receivable) || 0}
          label="Açık Hesap (Alacak)"
          gradient="from-brand-400 to-brand-600"
        />
      </div>

      <SalesChartCard data={data} />
      <TopProductsCard data={data} />
      <CurrencyCard data={data} />
      <BalanceCards data={data} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecentCard data={data} />
        <UpcomingPaymentsCard data={data} />
      </div>

      <CriticalStockCard data={data} />
      <ModulesGrid />

      <button
        type="button"
        onClick={() => setHelpOpen(true)}
        className="fixed z-20 h-7 w-7 rounded-full text-slate-500 hover:text-slate-300 flex items-center justify-center transition right-2 bottom-2"
        title="Bu sayfa hakkında"
        aria-label="Bu sayfa hakkında"
      >
        <CircleHelp size={18} />
      </button>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent
          title="Panel"
          description="İşletmenizin anlık özeti. Bu ayki ciro, masraf, tahsilat, kritik stok ve yaklaşan ödemeler tek ekranda."
          className="max-w-md"
        >
          <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Özellikler</div>
              <ul className="list-disc pl-5 space-y-1">
                <li>Aylık ciro ve dövizli satış özeti</li>
                <li>Masraf ve tahsilat kartları</li>
                <li>Kritik stok uyarıları</li>
                <li>Son hareketler ve satış grafiği</li>
              </ul>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">İpuçları</div>
              <ul className="list-disc pl-5 space-y-1">
                <li>Kartlara, grafikteki günlere ve hareketlere tıklayarak ilgili kayda gidebilirsiniz.</li>
                <li>Ctrl+K ile komut paletinden her yere atlayabilirsiniz.</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
