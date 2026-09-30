import Link from "next/link";
import { TrendingUp, Receipt, HandCoins, Landmark, BookUser } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { Money } from "./money";
import type { DashboardSummary } from "./types";
import { cn } from "@/lib/utils";

const MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

export function KpiCards({ data, hideCash }: { data: DashboardSummary; hideCash?: boolean }) {
  const month = MONTHS[new Date(`${data.today}T00:00:00`).getMonth()];
  const cards = [
    {
      label: `${month} Cirosu`,
      value: data.kpi.month_sales,
      icon: TrendingUp,
      cls: "from-amber-400 to-amber-500",
      href: "/satislar/faturalar",
    },
    {
      label: `${month} Masrafları`,
      value: data.kpi.month_expenses,
      icon: Receipt,
      cls: "from-rose-400 to-rose-500",
      href: "/giderler/masraflar",
    },
    {
      label: "Bugünkü Tahsilat",
      value: data.kpi.today_collections,
      icon: HandCoins,
      cls: "from-blue-400 to-blue-500",
      href: "/nakit/hareketler",
    },
    ...(hideCash
      ? []
      : [
          {
            label: "Kasa / Banka (TL)",
            value: data.kpi.cash_bank,
            icon: Landmark,
            cls: "from-slate-600 to-slate-800",
            href: "/nakit/hesaplar",
          },
        ]),
    {
      label: "Açık Hesap (Alacak)",
      value: data.kpi.receivable,
      icon: BookUser,
      cls: "from-slate-500 to-slate-700",
      href: "/cariler/musteriler",
    },
  ];

  return (
    <div className={cn("grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3", hideCash ? "xl:grid-cols-4" : "xl:grid-cols-5")}>
      {cards.map((c, i) => (
        <Link
          key={c.label}
          href={c.href}
          className={cn(
            "group relative overflow-hidden rounded-xl bg-gradient-to-br p-3 sm:p-3.5 text-white shadow-2xs border border-black/5 dark:border-white/10 transition-all hover:shadow-xs hover:-translate-y-0.5 min-w-0",
            c.cls,
            i === cards.length - 1 && cards.length % 2 === 1 && "col-span-2 md:col-span-1 lg:col-span-1",
          )}
        >
          <c.icon className="absolute -right-1.5 -top-1.5 size-12 opacity-20 transition-transform group-hover:scale-110 pointer-events-none" />
          <div className="text-base sm:text-lg lg:text-xl font-bold tabular-nums truncate leading-tight">
            {formatMoney(c.value)}
          </div>
          <div className="text-[11px] sm:text-xs font-medium opacity-90 mt-0.5 truncate">
            {c.label}
          </div>
        </Link>
      ))}
    </div>
  );
}
