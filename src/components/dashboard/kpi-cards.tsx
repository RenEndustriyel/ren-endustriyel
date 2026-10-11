"use client";

import Link from "next/link";
import { formatMoney } from "@/lib/format";
import type { DashboardSummary } from "./types";
import { cn } from "@/lib/utils";

const MONTHS = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];

export function KpiCards({
  data,
  hideCash,
}: {
  data: DashboardSummary;
  hideCash?: boolean;
}) {
  const month = MONTHS[new Date(`${data.today}T00:00:00`).getMonth()];

  const cards = [
    {
      label: `${month} Cirosu`,
      value: data.kpi.month_sales,
      color: "amber",
      href: "/satislar/faturalar",
    },
    {
      label: `${month} Masrafları`,
      value: data.kpi.month_expenses,
      color: "rose",
      href: "/giderler/masraflar",
    },
    {
      label: "Bugünkü Tahsilat",
      value: data.kpi.today_collections,
      color: "blue",
      href: "/nakit/hareketler",
    },
    ...(hideCash
      ? []
      : [
          {
            label: "Kasa / Banka (TL)",
            value: data.kpi.cash_bank,
            color: "slate",
            href: "/nakit/hesaplar",
          },
        ]),
    {
      label: "Açık Hesap (Alacak)",
      value: data.kpi.receivable,
      color: "anthracite",
      href: "/cariler/musteriler",
    },
  ];

  const colorStyles: Record<string, string> = {
    amber: "from-amber-400 to-amber-500",
    rose: "from-rose-400 to-rose-500",
    blue: "from-blue-400 to-blue-500",
    slate: "from-slate-600 to-slate-700",
    anthracite: "from-slate-700 to-slate-900",
  };

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3",
        hideCash ? "xl:grid-cols-4" : "xl:grid-cols-5"
      )}
    >
      {cards.map((c, i) => (
        <Link
          key={c.label}
          href={c.href}
          className={cn(
            "rounded-2xl px-4 py-3 text-white bg-gradient-to-br shadow-sm min-w-0 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all block",
            colorStyles[c.color] || colorStyles.slate,
            i === cards.length - 1 &&
              cards.length % 2 === 1 &&
              "col-span-2 md:col-span-1 lg:col-span-1"
          )}
        >
          <div className="text-lg sm:text-xl font-bold tabular-nums truncate">
            {formatMoney(c.value)}
          </div>
          <div className="text-xs font-medium opacity-90 mt-0.5 truncate">
            {c.label}
          </div>
        </Link>
      ))}
    </div>
  );
}
