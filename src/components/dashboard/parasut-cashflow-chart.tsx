"use client";

import * as React from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

const WEEKS_DATA = [
  { name: "28. Eyl", tahsilat: 2000, odeme: 0, bakiye: -60541 },
  { name: "5. Eki", tahsilat: 1920, odeme: 6835, bakiye: -65456 },
  { name: "12. Eki", tahsilat: 0, odeme: 0, bakiye: -65456 },
  { name: "19. Eki", tahsilat: 0, odeme: 0, bakiye: -65456 },
  { name: "26. Eki", tahsilat: 0, odeme: 3690, bakiye: -69146 },
  { name: "2. Kas", tahsilat: 0, odeme: 0, bakiye: -69146 },
  { name: "9. Kas", tahsilat: 0, odeme: 0, bakiye: -69146 },
  { name: "16. Kas", tahsilat: 0, odeme: 0, bakiye: -69146 },
  { name: "23. Kas", tahsilat: 11121, odeme: 0, bakiye: -58025 },
  { name: "30. Kas", tahsilat: 0, odeme: 0, bakiye: -58025 },
  { name: "7. Ara", tahsilat: 0, odeme: 0, bakiye: -58025 },
  { name: "14. Ara", tahsilat: 0, odeme: 0, bakiye: -58025 },
];

export function ParasutCashflowChart() {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-[#182c37] bg-white dark:bg-[#101e26] shadow-xs overflow-hidden">
      {/* 1. Başlık */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-[#182c37]">
        <h2 className="text-base font-bold text-slate-800 dark:text-white">
          Önümüzdeki 12 Haftanın Nakit Akışı
        </h2>
        <Link
          href="/raporlar/nakit-akisi"
          className="text-xs font-semibold text-slate-500 hover:text-[#00b49c] dark:text-slate-400 dark:hover:text-white transition"
        >
          Nakit akışı raporuna git
        </Link>
      </div>

      {/* 2. 4'lü Özet KPI Çubuğu */}
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 dark:divide-[#182c37] border-b border-slate-100 dark:border-[#182c37] bg-slate-50/50 dark:bg-[#0c161d]">
        <div className="p-3.5 text-center">
          <div className="text-base sm:text-lg font-extrabold text-[#ee7a6b] tabular-nums">
            -60.541,00 TL
          </div>
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mt-0.5">
            TOPLAM BAKİYE
          </div>
        </div>

        <div className="p-3.5 text-center">
          <div className="text-base sm:text-lg font-extrabold text-[#22c39e] tabular-nums">
            15.041,00 TL
          </div>
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mt-0.5">
            TOPLAM TAHSİLAT
          </div>
        </div>

        <div className="p-3.5 text-center">
          <div className="text-base sm:text-lg font-extrabold text-[#886650] tabular-nums">
            20.406,62 TL
          </div>
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mt-0.5">
            TOPLAM ÖDEME
          </div>
        </div>

        <div className="p-3.5 text-center">
          <div className="text-base sm:text-lg font-extrabold text-[#ee7a6b] tabular-nums">
            -65.906,62 TL
          </div>
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mt-0.5">
            TAHMİNİ DÖNEM SONU BAKİYESİ
          </div>
        </div>
      </div>

      {/* 3. 12 Haftalık Grafik */}
      <div className="p-4 pt-6">
        <div className="h-64 sm:h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={WEEKS_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={{ stroke: "#cbd5e1" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(val) => `${val / 1000}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  borderColor: "#334155",
                  borderRadius: "12px",
                  color: "#fff",
                  fontSize: "12px",
                }}
                formatter={(value: any) => [`${Number(value).toLocaleString("tr-TR")} TL`]}
              />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ paddingBottom: "12px", fontSize: "11px" }}
              />
              <Bar dataKey="tahsilat" name="Tahsilat" fill="#22aacc" radius={[4, 4, 0, 0]} maxBarSize={32} />
              <Bar dataKey="odeme" name="Ödeme" fill="#886650" radius={[4, 4, 0, 0]} maxBarSize={32} />
              <Line
                type="monotone"
                dataKey="bakiye"
                name="Tahmini Bakiye"
                stroke="#22c39e"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#22c39e" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
