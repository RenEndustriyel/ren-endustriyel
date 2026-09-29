"use client";

import * as React from "react";
import Link from "next/link";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatCompact, formatMoney, formatShortDay } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ChartTooltip } from "./chart-tooltip";
import type { DashboardSummary } from "./types";

const MONTHS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const monthLabel = (m: string) => {
  const [y, mm] = m.split("-");
  return `${MONTHS[Number(mm) - 1]} ${y.slice(2)}`;
};

export function SalesChart({ data }: { data: DashboardSummary }) {
  const [mode, setMode] = React.useState<"daily" | "monthly">("daily");
  const rows =
    mode === "daily"
      ? data.sales_daily.map((d) => ({ label: d.date, amount: Number(d.amount) }))
      : data.sales_monthly.map((d) => ({ label: d.month, amount: Number(d.amount) }));
  const total = rows.reduce((s, r) => s + r.amount, 0);
  const fmt = mode === "daily" ? formatShortDay : monthLabel;

  return (
    <Card className="p-3.5 sm:p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2.5 border-b border-border pb-2.5">
        <div>
          <Link href="/raporlar/gelir-gider" className="group inline-flex items-center gap-2">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-text group-hover:text-primary transition-colors">
              <BarChart3 className="size-4 text-teal-600 dark:text-teal-400" /> Satış Grafiği
            </h2>
          </Link>
          <p className="mt-0.5 text-[11px] text-muted">
            {mode === "daily" ? "Son 14 gün (TL)" : "Son 12 ay (TL)"} · Toplam{" "}
            <span className="font-semibold text-teal-700 dark:text-teal-300">{formatMoney(total)}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex overflow-hidden rounded-lg border border-border p-0.5 text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setMode("daily")}
              className={cn(
                "rounded-md px-2.5 py-1 transition-colors",
                mode === "daily" ? "bg-teal-600 text-white font-bold" : "text-muted hover:text-text hover:bg-surface-2",
              )}
            >
              Günlük
            </button>
            <button
              type="button"
              onClick={() => setMode("monthly")}
              className={cn(
                "rounded-md px-2.5 py-1 transition-colors",
                mode === "monthly" ? "bg-teal-600 text-white font-bold" : "text-muted hover:text-text hover:bg-surface-2",
              )}
            >
              Aylık
            </button>
          </div>
          <Link href="/raporlar/gelir-gider" className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:underline">
            Detaylı rapor →
          </Link>
        </div>
      </div>
      <div className="h-[190px] sm:h-[210px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rows} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0f9b8e" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#0f9b8e" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="label" tickFormatter={fmt} tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} minTickGap={16} />
            <YAxis tickFormatter={formatCompact} tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} width={40} allowDecimals={false} />
            <Tooltip content={<ChartTooltip formatLabel={fmt} />} cursor={{ stroke: "#94a3b8", strokeDasharray: "3 3" }} />
            <Area
              dataKey="amount"
              name="Satış"
              type="monotone"
              stroke="#0f9b8e"
              strokeWidth={2}
              fill="url(#salesFill)"
              activeDot={{ r: 3.5, strokeWidth: 1.5, stroke: "#fff", fill: "#0f9b8e" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
