"use client";

import * as React from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import {
  Trophy,
  Clock,
  AlertTriangle,
  DollarSign,
  FileText,
  HandCoins,
  Package,
  CalendarClock,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate, formatMoney, formatNumber, formatQty } from "@/lib/format";
import { triggerLiveRatesRefresh, useRates } from "@/lib/rates";
import { cn } from "@/lib/utils";
import { TYPE_LABELS, type DashboardSummary } from "./types";

/** Pusulam tarzı 4 sütunlu En Çok Satan Ürünler kartı */
export function TopProducts({ data }: { data: DashboardSummary }) {
  const top4 = data.top_products.slice(0, 4);

  return (
    <Card className="p-3.5 sm:p-4">
      <div className="mb-3 flex items-center justify-between border-b border-border pb-2.5">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-text">
          <Trophy className="size-4 text-amber-500" /> En Çok Satan Ürünler
        </h2>
        <Link href="/stok/urunler" className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:underline">
          Tüm rapor →
        </Link>
      </div>

      {top4.length === 0 ? (
        <EmptyState
          icon={<Package />}
          title="Bu ay henüz satış yok"
          description="Satış faturası veya hızlı satış yapıldığında en çok satan ürünler burada görünür."
        />
      ) : (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {top4.map((p, i) => (
            <Link
              key={p.id}
              href={`/stok/urunler/detay?id=${p.id}`}
              className="group rounded-xl border border-border bg-surface-2/50 dark:bg-surface-2/30 p-2.5 sm:p-3 transition-all hover:bg-surface hover:border-teal-500/60 hover:shadow-2xs block"
              title="Ürün detayına git"
            >
              <div className="text-[10px] font-bold text-muted group-hover:text-teal-600 dark:group-hover:text-teal-400">#{i + 1}</div>
              <div className="mt-0.5 truncate text-xs font-semibold text-text group-hover:text-teal-700 dark:group-hover:text-teal-300" title={p.name}>
                {p.name}
              </div>
              <div className="mt-0.5 text-[11px] text-muted">{formatQty(p.quantity)} adet</div>
              <div className="mt-0.5 text-xs sm:text-sm font-bold text-teal-700 dark:text-teal-300">
                {formatMoney(p.amount)}
              </div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}

/** Pusulam tarzı Toplam Alacak / Borç / Net Durum 3 kartı - Tıklanabilir */
export function BalanceCards({ data }: { data: DashboardSummary }) {
  const net = data.kpi.receivable - data.kpi.payable;

  return (
    <div className="grid grid-cols-1 gap-2.5 sm:gap-3 lg:grid-cols-3">
      <Link href="/cariler/musteriler" className="block group">
        <Card className="p-3 sm:p-3.5 transition-all border-l-4 border-l-emerald-500 group-hover:shadow-xs h-full rounded-xl">
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium text-muted">Toplam Alacak (Müşteriler)</div>
            <ExternalLink className="size-3 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="mt-0.5 text-base sm:text-lg lg:text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {formatMoney(data.kpi.receivable)}
          </div>
        </Card>
      </Link>

      <Link href="/cariler/tedarikciler" className="block group">
        <Card className="p-3 sm:p-3.5 transition-all border-l-4 border-l-rose-500 group-hover:shadow-xs h-full rounded-xl">
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium text-muted">Toplam Borç (Tedarikçiler)</div>
            <ExternalLink className="size-3 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="mt-0.5 text-base sm:text-lg lg:text-xl font-bold text-rose-600 dark:text-rose-400 tabular-nums">
            {formatMoney(data.kpi.payable)}
          </div>
        </Card>
      </Link>

      <Link href="/raporlar/cari-bakiye" className="block group">
        <Card className="p-3 sm:p-3.5 transition-all border-l-4 border-l-teal-600 group-hover:shadow-xs h-full rounded-xl">
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium text-muted">Net Durum</div>
            <ExternalLink className="size-3 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div
            className={cn(
              "mt-0.5 text-base sm:text-lg lg:text-xl font-bold tabular-nums",
              net >= 0 ? "text-teal-700 dark:text-teal-300" : "text-rose-600 dark:text-rose-400"
            )}
          >
            {formatMoney(net)}
          </div>
        </Card>
      </Link>
    </div>
  );
}

/** Pusulam tarzı Son Hareketler listesi - Tıklanabilir */
export function RecentActivity({ data }: { data: DashboardSummary }) {
  return (
    <Card className="p-3.5 sm:p-4 flex flex-col justify-between">
      <div>
        <div className="mb-2.5 flex items-center justify-between border-b border-border pb-2.5">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-text">
            <Clock className="size-4 text-teal-600 dark:text-teal-400" /> Son Hareketler
          </h2>
          <Link href="/nakit/hareketler" className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:underline">
            Tümü →
          </Link>
        </div>

        {data.recent.length === 0 ? (
          <EmptyState
            icon={<FileText />}
            title="Henüz hareket yok"
            description="Fatura, tahsilat ve ödemeleriniz burada listelenir."
          />
        ) : (
          <div className="divide-y divide-border/60">
            {data.recent.slice(0, 8).map((r) => {
              const positive = r.amount >= 0;
              const typeName = TYPE_LABELS[r.type] ?? r.type;

              // Peşin / Vadeli / Ödeme Yöntemi rozeti
              const isUnpaid = r.payment_status === "unpaid" || r.payment_status === "none";
              const isPartial = r.payment_status === "partial";
              const method = r.method;

              let badgeText = "(P)";
              let badgeTitle = "Peşin";
              let badgeStyle = "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25";

              if (isUnpaid) {
                badgeText = "(V)";
                badgeTitle = "Vadeli / Açık";
                badgeStyle = "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/25";
              } else if (isPartial) {
                badgeText = "(V)";
                badgeTitle = "Vadeli / Kısmi";
                badgeStyle = "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/25";
              } else if (method === "credit_card") {
                badgeText = "(KK)";
                badgeTitle = "Kredi Kartı";
                badgeStyle = "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/25";
              } else if (method === "bank_transfer") {
                badgeText = "(Hav/Eft)";
                badgeTitle = "Havale / EFT";
                badgeStyle = "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/25";
              } else {
                badgeText = "(P)";
                badgeTitle = "Peşin (Nakit)";
                badgeStyle = "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25";
              }

              // Renk ve ikon
              let iconBg = "bg-primary/10 text-primary";
              if (r.type.includes("sale") || r.type === "collection") {
                iconBg = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
              } else if (r.type.includes("purchase") || r.type === "payment" || r.type === "expense") {
                iconBg = "bg-rose-500/10 text-rose-600 dark:text-rose-400";
              }

              // Hedef bağlantı
              let targetHref = "/nakit/hareketler";
              if (r.kind === "document") {
                if (r.type === "pos_sale") targetHref = `/satislar/hizli-satislar/detay?id=${r.id}`;
                else if (r.type.includes("sale") || r.type === "sales_invoice") targetHref = `/satislar/faturalar/detay?id=${r.id}`;
                else if (r.type === "expense") targetHref = `/giderler/masraflar/detay?id=${r.id}`;
                else if (r.type.includes("purchase")) targetHref = `/giderler/alis-faturalari/detay?id=${r.id}`;
                else targetHref = `/satislar/faturalar/detay?id=${r.id}`;
              }

              return (
                <Link
                  key={r.id}
                  href={targetHref}
                  className="flex items-center gap-2.5 py-2 px-1.5 -mx-1.5 rounded-lg transition-colors hover:bg-surface-2/70 group"
                  title="Detayı görüntüle"
                >
                  <div className={cn("flex size-7.5 shrink-0 items-center justify-center rounded-md transition-transform group-hover:scale-105", iconBg)}>
                    {r.kind === "document" ? (
                      <FileText className="size-3.5" />
                    ) : (
                      <HandCoins className="size-3.5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-semibold text-text group-hover:text-primary">
                      {r.party || typeName}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted">
                      <span>{typeName}</span>
                      {r.number && <span>· {r.number}</span>}
                      <span>· {formatDate(r.date)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={cn(
                        "num text-xs font-semibold tabular-nums",
                        positive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                      )}
                    >
                      {positive ? "+" : "−"}
                      {formatMoney(Math.abs(r.amount))}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-bold px-1.5 py-0.5 rounded border tracking-wide",
                        badgeStyle
                      )}
                      title={badgeTitle}
                    >
                      {badgeText}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}

/** Pusulam tarzı Yaklaşan / Geciken Ödemeler & Tahsilatlar - Tıklanabilir */
export function UpcomingPaymentsCard({ data }: { data: DashboardSummary }) {
  const items = data.timeline.filter((t) => Number(t.amount) > 0.009).slice(0, 6);

  return (
    <Card className="p-3.5 sm:p-4 flex flex-col justify-between">
      <div>
        <div className="mb-2.5 flex items-center justify-between border-b border-border pb-2.5">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-text">
            <CalendarClock className="size-4 text-rose-500" /> Yaklaşan / Geciken Ödemeler
          </h2>
          <Link href="/raporlar/nakit-akisi" className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:underline">
            Tüm akış →
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-xs text-muted">
            <CheckCircle2 className="size-7 text-emerald-500 mb-1.5 opacity-80" />
            <p>Ödenecek masraf veya bekleyen vadesi geçmiş işlem yok.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {items.map((t) => {
              const isOverdue = t.days_overdue > 0;
              const isOut = t.flow === "out";

              let targetHref = "/satislar/faturalar";
              if (isOut) {
                if (t.doc_type === "expense") targetHref = `/giderler/masraflar/detay?id=${t.id}`;
                else targetHref = `/giderler/alis-faturalari/detay?id=${t.id}`;
              } else {
                if (t.doc_type === "pos_sale") targetHref = `/satislar/hizli-satislar/detay?id=${t.id}`;
                else targetHref = `/satislar/faturalar/detay?id=${t.id}`;
              }

              return (
                <Link
                  key={t.id}
                  href={targetHref}
                  className="flex items-center gap-2.5 py-2 px-1.5 -mx-1.5 rounded-lg transition-colors hover:bg-surface-2/70 group"
                  title="Belge detayına git"
                >
                  <div
                    className={cn(
                      "flex size-7.5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold transition-transform group-hover:scale-105",
                      isOverdue ? "bg-rose-500/15 text-rose-600 dark:text-rose-400" : "bg-surface-2 text-muted"
                    )}
                  >
                    {isOverdue ? `!${t.days_overdue}g` : "Vade"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-semibold text-text group-hover:text-primary">
                      {isOut ? "Ödeme" : "Tahsilat"} {t.party && <span>· {t.party}</span>}
                    </div>
                    <div className="text-[11px] text-muted">
                      {formatDate(t.due_date)} {isOverdue && <span className="text-rose-500 font-semibold">(Gecikti)</span>}
                    </div>
                  </div>
                  <div
                    className={cn(
                      "num shrink-0 text-xs font-semibold tabular-nums",
                      isOut ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                    )}
                  >
                    {isOut ? "−" : "+"}
                    {formatMoney(t.amount)}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}

/** Pusulam tarzı Kritik Stok Uyarısı */
export function CriticalStock({ data }: { data: DashboardSummary }) {
  if (data.critical_stock.length === 0) return null;

  return (
    <Card className="border-l-4 border-l-amber-500 p-3 sm:p-3.5">
      <div className="mb-2 flex items-center justify-between">
        <Link
          href="/stok/urunler"
          className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline"
        >
          <AlertTriangle className="size-3.5" /> Kritik Stok Uyarısı ({data.critical_stock.length})
        </Link>
        <Link href="/stok/urunler" className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:underline">
          Tüm ürünler →
        </Link>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {data.critical_stock.map((p) => (
          <Link
            key={p.id}
            href={`/stok/urunler/detay?id=${p.id}`}
            className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:text-amber-200 transition hover:bg-amber-500/25"
            title="Ürünü aç"
          >
            {p.name} · {formatQty(p.stock_qty)} ad
          </Link>
        ))}
      </div>
    </Card>
  );
}

/** Pusulam tarzı Döviz Özeti - Satışları Dövize (USD / EUR) Çevirir + 1 Dakikada Bir Otomatik Güncellenir */
export function CurrencySummary({ data }: { data: DashboardSummary }) {
  const qc = useQueryClient();
  const ratesQuery = useRates();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Anlık geçerli kur değerleri
  const usdRate = data.rates?.USD || Number(ratesQuery.data?.USD?.forex_buying ?? 0) || 41.0;
  const eurRate = data.rates?.EUR || Number(ratesQuery.data?.EUR?.forex_buying ?? 0) || 45.0;

  // Toplam bu ayki satış cirosu (TL)
  const monthSalesTRY = Number(data.kpi.month_sales) || 0;

  // Satış cirosunun USD ve EUR döviz karşılıkları
  const salesUSD = usdRate > 0 ? Math.round((monthSalesTRY / usdRate) * 100) / 100 : 0;
  const salesEUR = eurRate > 0 ? Math.round((monthSalesTRY / eurRate) * 100) / 100 : 0;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await triggerLiveRatesRefresh();
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["rates"] }),
        qc.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
      toast.success("Döviz kurları güncellendi.");
    } catch {
      toast.error("Kur bilgisi alınamadı.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const cells = [
    {
      label: "Bu Ay Satış (USD Karşılığı)",
      value: salesUSD,
      cur: "USD",
      valCls: "text-blue-600 dark:text-blue-400 font-bold",
      subtext: `Ciro: ${formatMoney(monthSalesTRY)} · 1$ = ${formatNumber(usdRate)} ₺`,
      href: "/satislar/faturalar",
    },
    {
      label: "Bu Ay Satış (EUR Karşılığı)",
      value: salesEUR,
      cur: "EUR",
      valCls: "text-indigo-600 dark:text-indigo-400 font-bold",
      subtext: `Ciro: ${formatMoney(monthSalesTRY)} · 1€ = ${formatNumber(eurRate)} ₺`,
      href: "/satislar/faturalar",
    },
    {
      label: `Kasa USD${usdRate ? ` · 1$ = ${formatNumber(usdRate)} ₺` : ""}`,
      value: data.currency.cash_usd,
      cur: "USD",
      valCls: "font-bold text-text",
      subtext: `≈ ${formatMoney(data.currency.cash_usd * usdRate)} TL`,
      href: "/nakit/hesaplar",
    },
    {
      label: `Kasa EUR${eurRate ? ` · 1€ = ${formatNumber(eurRate)} ₺` : ""}`,
      value: data.currency.cash_eur,
      cur: "EUR",
      valCls: "font-bold text-text",
      subtext: `≈ ${formatMoney(data.currency.cash_eur * eurRate)} TL`,
      href: "/nakit/hesaplar",
    },
  ];

  return (
    <Card className="p-3.5 sm:p-4">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-text">
          <DollarSign className="size-4 text-blue-500" /> Döviz Özeti
        </h2>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-[10px] text-muted font-medium">
            1 dk otomatik güncellenir
          </span>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-0.5 text-[11px] font-semibold text-text transition hover:bg-surface-2 active:scale-95 disabled:opacity-50"
            title="TCMB canlı kurlarını çek ve yenile"
          >
            <RefreshCw className={cn("size-3 text-blue-500", isRefreshing && "animate-spin")} />
            <span>{isRefreshing ? "Güncelleniyor..." : "Yenile"}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 text-sm lg:grid-cols-4">
        {cells.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="min-w-0 rounded-lg border border-border bg-surface-2/50 dark:bg-surface-2/30 p-2.5 transition-all hover:bg-surface hover:border-blue-400/60 hover:shadow-2xs block group"
            title="İlgili bölüme git"
          >
            <div className="text-[11px] text-muted truncate group-hover:text-primary">{c.label}</div>
            <div className={cn("num mt-0.5 tabular-nums text-sm sm:text-base", c.valCls)}>
              {formatMoney(c.value, c.cur)}
            </div>
            <div className="num text-[10px] text-muted mt-0.5 truncate">
              {c.subtext}
            </div>
          </Link>
        ))}
      </div>

      {/* Satışların Döviz Değeri Bilgi Şeridi */}
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-1.5 rounded-lg bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 px-3 py-1.5 text-[11px] text-blue-950 dark:text-blue-200">
        <div className="flex items-center gap-1.5">
          <span className="flex size-1.5 rounded-full bg-blue-500 shrink-0" />
          <span>
            Bu ayki toplam satış cironuz (<b>{formatMoney(monthSalesTRY)}</b>), anlık kurla{" "}
            <b className="text-blue-700 dark:text-blue-300 font-semibold">{formatMoney(salesUSD, "USD")}</b> veya{" "}
            <b className="text-indigo-700 dark:text-indigo-300 font-semibold">{formatMoney(salesEUR, "EUR")}</b> değerindedir.
          </span>
        </div>
        <span className="text-[10px] text-muted">TCMB Kurları</span>
      </div>

      <p className="mt-2 text-[11px] text-muted">
        Aylık ciro ve kasa toplamı döviz belgeleri kayıtlı kurla TL&apos;ye çevrilir. Kurlar her 1 dakikada bir otomatik yenilenir.
      </p>
    </Card>
  );
}
