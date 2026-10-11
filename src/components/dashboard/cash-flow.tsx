"use client";

import * as React from "react";
import { Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardHeader } from "@/components/ui/card";
import { formatCompact, formatShortDay } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Money } from "./money";
import { ChartTooltip } from "./chart-tooltip";
import type { DashboardSummary } from "./types";

export function CashFlowCard({ data }: { data: DashboardSummary }) {
  const rows = React.useMemo(
    () =>
      data.cash_flow.weeks.reduce<{ label: string; in: number; out: number; balance: number }[]>((acc, w) => {
        const prev = acc.length ? acc[acc.length - 1].balance : data.cash_flow.opening;
        acc.push({ label: w.start, in: w.in, out: -w.out, balance: Math.round((prev + w.in - w.out) * 100) / 100 });
        return acc;
      }, []),
    [data],
  );
  const totalIn = data.cash_flow.weeks.reduce((s, w) => s + w.in, 0);
  const totalOut = data.cash_flow.weeks.reduce((s, w) => s + w.out, 0);
  const end = data.cash_flow.opening + totalIn - totalOut;

  const stats = [
    { label: "Toplam bakiye", value: data.cash_flow.opening, cls: data.cash_flow.opening < 0 ? "text-danger" : "" },
    { label: "Toplam tahsilat", value: totalIn, cls: "text-chart-in", dot: "bg-chart-in" },
    { label: "Toplam ödeme", value: totalOut, cls: "text-chart-out", dot: "bg-chart-out" },
    { label: "Tahmini dönem sonu", value: end, cls: end < 0 ? "text-danger" : "" },
  ];

  return (
    <Card>
      <CardHeader title="Önümüzdeki 12 Haftanın Nakit Akışı" href="/raporlar/nakit-akisi" hrefLabel="Rapor" />
      <div className="grid grid-cols-2 border-b border-border lg:grid-cols-4">
        {stats.map((s, i) => (
          <div key={s.label} className={cn("px-3 py-3 text-center", i % 2 === 1 && "border-l border-border", i >= 2 && "border-t border-border lg:border-t-0", i === 2 && "lg:border-l")}>
            <Money value={s.value} className={cn("text-lg sm:text-xl", s.cls)} />
            <div className="mt-0.5 flex items-center justify-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wide text-muted">
              {s.dot && <span className={cn("size-2 rounded-sm", s.dot)} />}
              {s.label}
            </div>
          </div>
        ))}
      </div>
      <div className="h-64 px-1 pb-2 pt-4 sm:h-72 sm:px-3">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} stackOffset="sign" margin={{ top: 4, right: 8, bottom: 0, left: 0 }} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="label" tickFormatter={formatShortDay} tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={12} />
            <YAxis tickFormatter={formatCompact} tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} width={56} />
            <ReferenceLine y={0} stroke="var(--muted)" strokeOpacity={0.5} />
            <Tooltip content={<ChartTooltip formatLabel={(l) => `${formatShortDay(l)} haftası`} />} cursor={{ fill: "var(--surface-2)" }} />
            <Bar dataKey="in" name="Tahsilat" stackId="flow" fill="var(--chart-in)" radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="out" name="Ödeme" stackId="flow" fill="var(--chart-out)" radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Line dataKey="balance" name="Tahmini bakiye" type="monotone" stroke="var(--text)" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border px-4 py-2.5 text-[11px] text-muted sm:px-5">
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-chart-in" />Tahsilat (vadeye göre)</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-chart-out" />Ödeme (vadeye göre)</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-3.5 rounded bg-text" />Tahmini bakiye</span>
        <span className="ml-auto">Gecikmişler ilk haftaya dahildir</span>
      </div>
    </Card>
  );
}
