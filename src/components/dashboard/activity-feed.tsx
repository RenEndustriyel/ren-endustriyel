"use client";

import * as React from "react";
import Link from "next/link";
import {
  Circle,
  AlertCircle,
  ArrowUpCircle,
  ArrowDownCircle,
  Clock,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FeedItem {
  id: string;
  type: "Tahsilat" | "Ödeme";
  docType: "Fatura" | "Fiş / Fatura";
  amount: string;
  dateText: string;
  daysText: string;
  status: "future" | "today" | "overdue";
  href: string;
}

const FEED_ITEMS: FeedItem[] = [
  // Gelecek İşlemler
  {
    id: "f-1",
    type: "Ödeme",
    docType: "Fiş / Fatura",
    amount: "3.690,44 TL",
    dateText: "26 Ekim",
    daysText: "23 gün sonra",
    status: "future",
    href: "/alislar",
  },
  {
    id: "f-2",
    type: "Ödeme",
    docType: "Fiş / Fatura",
    amount: "3.322,72 TL",
    dateText: "9 Ekim",
    daysText: "6 gün sonra",
    status: "future",
    href: "/alislar",
  },
  {
    id: "f-3",
    type: "Tahsilat",
    docType: "Fatura",
    amount: "1.920,00 TL",
    dateText: "8 Ekim",
    daysText: "5 gün sonra",
    status: "future",
    href: "/satislar",
  },
  {
    id: "f-4",
    type: "Ödeme",
    docType: "Fiş / Fatura",
    amount: "4.548,60 TL",
    dateText: "8 Ekim",
    daysText: "5 gün sonra",
    status: "future",
    href: "/alislar",
  },
  {
    id: "f-5",
    type: "Ödeme",
    docType: "Fiş / Fatura",
    amount: "2.286,50 TL",
    dateText: "6 Ekim",
    daysText: "3 gün sonra",
    status: "future",
    href: "/alislar",
  },
  // Bugün
  {
    id: "t-1",
    type: "Tahsilat",
    docType: "Fatura",
    amount: "2.085,00 TL",
    dateText: "3 Ekim",
    daysText: "Bugün",
    status: "today",
    href: "/satislar",
  },
  // Gecikmiş İşlemler
  {
    id: "o-1",
    type: "Tahsilat",
    docType: "Fatura",
    amount: "390,00 TL",
    dateText: "24 Ağustos",
    daysText: "40 GÜN GECİKTİ",
    status: "overdue",
    href: "/satislar",
  },
  {
    id: "o-2",
    type: "Ödeme",
    docType: "Fiş / Fatura",
    amount: "7.428,73 TL",
    dateText: "2 Ağustos",
    daysText: "62 GÜN GECİKTİ",
    status: "overdue",
    href: "/alislar",
  },
  {
    id: "o-3",
    type: "Ödeme",
    docType: "Fiş / Fatura",
    amount: "799,20 TL",
    dateText: "29 Temmuz",
    daysText: "66 GÜN GECİKTİ",
    status: "overdue",
    href: "/alislar",
  },
  {
    id: "o-4",
    type: "Ödeme",
    docType: "Fiş / Fatura",
    amount: "1.499,61 TL",
    dateText: "29 Temmuz",
    daysText: "66 GÜN GECİKTİ",
    status: "overdue",
    href: "/alislar",
  },
  {
    id: "o-5",
    type: "Ödeme",
    docType: "Fiş / Fatura",
    amount: "3.347,57 TL",
    dateText: "12 Temmuz",
    daysText: "83 GÜN GECİKTİ",
    status: "overdue",
    href: "/alislar",
  },
];

export function ActivityFeed() {
  return (
    <div className="w-full xl:w-[260px] shrink-0 rounded-2xl border border-slate-200 dark:border-[#182c37] bg-white dark:bg-[#101e26] p-3 shadow-xs">
      {/* 1. Üst Aksiyon */}
      <button
        type="button"
        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-slate-50 dark:hover:bg-[#152733] transition"
      >
        <ArrowUpCircle size={15} />
        <span>DAHA SONRASINI GÖSTER</span>
      </button>

      {/* 2. Zaman Çizelgesi Akışı */}
      <div className="relative my-2 pl-3 space-y-2 border-l-2 border-slate-200 dark:border-[#1e3544] ml-3.5">
        {FEED_ITEMS.map((item, idx) => {
          const isTodayMarker = item.status === "today" && idx === 5;

          return (
            <React.Fragment key={item.id}>
              {/* Bugün Banner'ı */}
              {isTodayMarker && (
                <div className="-ml-[21px] my-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-r-xl bg-[#22c39e] text-white text-xs font-extrabold tracking-wide shadow-xs">
                    <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                    <span>BUGÜN – 3 Ekim</span>
                  </div>
                </div>
              )}

              <Link
                href={item.href}
                className={cn(
                  "relative block p-2 rounded-xl border transition group",
                  item.status === "today"
                    ? "bg-teal-50/40 dark:bg-[#133036] border-teal-200 dark:border-[#1b4852]"
                    : item.status === "overdue"
                      ? "bg-rose-50/40 dark:bg-[#2b171c] border-rose-200 dark:border-[#421d25] hover:border-rose-300"
                      : "bg-slate-50/50 dark:bg-[#13222c] border-slate-200/60 dark:border-[#1a303e] hover:border-slate-300 dark:hover:border-[#244357]"
                )}
              >
                {/* Sol Nokta İkonu */}
                <span
                  className={cn(
                    "absolute -left-[19px] top-3.5 h-2.5 w-2.5 rounded-full border-2 bg-white dark:bg-[#101e26]",
                    item.status === "today"
                      ? "border-[#22c39e] bg-[#22c39e]"
                      : item.status === "overdue"
                        ? "border-[#ee7a6b] bg-[#ee7a6b]"
                        : "border-slate-400 dark:border-slate-500"
                  )}
                />

                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span
                    className={cn(
                      item.status === "overdue"
                        ? "text-rose-500 font-extrabold"
                        : "text-slate-500 dark:text-slate-400"
                    )}
                  >
                    {item.daysText}
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {item.dateText}
                  </span>
                </div>

                <div className="text-xs font-semibold mt-0.5 text-slate-800 dark:text-slate-100 flex items-center justify-between">
                  <span>{item.type}:</span>
                  <span
                    className={cn(
                      "font-extrabold tabular-nums",
                      item.type === "Tahsilat"
                        ? "text-[#22c39e]"
                        : "text-slate-900 dark:text-white"
                    )}
                  >
                    {item.amount}
                  </span>
                </div>

                <div className="text-[10.5px] text-slate-400 mt-0.5">
                  {item.docType}
                </div>
              </Link>
            </React.Fragment>
          );
        })}
      </div>

      {/* 3. Alt Aksiyonlar */}
      <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-[#182c37]">
        <button
          type="button"
          className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-bold text-rose-500 hover:text-rose-600 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/20 transition"
        >
          <AlertCircle size={13} />
          <span>+35 GECİKMİŞ İŞLEM</span>
        </button>

        <button
          type="button"
          className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-slate-50 dark:hover:bg-[#152733] transition"
        >
          <ArrowDownCircle size={13} />
          <span>GEÇMİŞ İŞLEMLERİ GÖSTER</span>
        </button>
      </div>
    </div>
  );
}
