"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download } from "lucide-react";
import { useRpcQuery } from "@/lib/data";
import { formatCompact, formatMoney } from "@/lib/format";
import { exportExcel, sheet } from "@/lib/excel";
import { useOrg } from "@/providers/org-provider";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartTooltip } from "@/components/dashboard/chart-tooltip";
import { cn } from "@/lib/utils";
import { PeriodPicker, usePeriod, monthLabel } from "./period";

type Month = { month: string; sales: number; sales_returns: number; net_sales: number; cogs: number; gross_profit: number; purchases: number; expenses: number; salaries: number; net_profit: number };
type Data = { months: Month[]; expense_categories: { name: string; color: string | null; amount: number }[] };

export function IncomeExpenseReport() {
  const { org } = useOrg();
  const ps = usePeriod("this_year");
  const q = useRpcQuery<Data>("report_income_expense", { p_org: org!.id, p_from: ps.period.from, p_to: ps.period.to });
  const months = q.data?.months ?? [];
  const sum = (k: keyof Month) => months.reduce((s, m) => s + Number(m[k]), 0);
  const netSales = sum("net_sales");
  const gross = sum("gross_profit");
  const net = sum("net_profit");
  const cats = q.data?.expense_categories ?? [];
  const catMax = Math.max(...cats.map((c) => Number(c.amount)), 1);

  const rowsDef: [keyof Month, string, boolean?][] = [
    ["sales", "Satışlar"],
    ["sales_returns", "Satış iadeleri"],
    ["net_sales", "Net satışlar", true],
    ["cogs", "Satılan malın maliyeti"],
    ["gross_profit", "Brüt kâr", true],
    ["expenses", "Masraflar"],
    ["salaries", "Maaşlar"],
    ["net_profit", "Net kâr", true],
    ["purchases", "Alışlar (bilgi)"],
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Gelir Gider ve Kârlılık"
        description="KDV hariç tutarlar · maliyet ağırlıklı ortalama yöntemiyle"
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              exportExcel("gelir-gider", [
                sheet<Month>({
                  name: "Aylık",
                  rows: months,
                  columns: [
                    { header: "Ay", value: (m) => monthLabel(m.month) },
                    ...rowsDef.map(([k, label]) => ({ header: label, value: (m: Month) => Number(m[k]), type: "money" as const })),
                  ],
                }),
                sheet({ name: "Masraf kategorileri", rows: cats, columns: [{ header: "Kategori", value: (c) => c.name }, { header: "Tutar", value: (c) => Number(c.amount), type: "money" }] }),
              ])
            }
          >
            <Download /> Excel
          </Button>
        }
      />
      <div className="mb-4">
        <PeriodPicker state={ps} />
      </div>
      {q.isPending ? (
        <Skeleton className="h-96 rounded-card" />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Net satışlar" value={netSales} tone="primary" />
            <Stat label="Brüt kâr" value={gross} tone={gross >= 0 ? "success" : "danger"} sub={netSales ? `Marj %${((gross / netSales) * 100).toFixed(1)}` : undefined} />
            <Stat label="Masraf + maaş" value={sum("expenses") + sum("salaries")} tone="danger" />
            <Stat label="Net kâr" value={net} tone={net >= 0 ? "success" : "danger"} sub={netSales ? `Marj %${((net / netSales) * 100).toFixed(1)}` : undefined} />
          </div>
          <Card className="mb-4">
            <CardHeader title="Aylık gelir ve gider" />
            <div className="h-72 px-2 pb-2 pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={months.map((m) => ({ ...m, label: monthLabel(m.month), gider: Number(m.cogs) + Number(m.expenses) + Number(m.salaries) }))} barGap={2} margin={{ left: 0, right: 8 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={formatCompact} tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} width={56} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--surface-2)" }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="net_sales" name="Net satış" fill="var(--chart-in)" radius={[4, 4, 0, 0]} maxBarSize={22} />
                  <Bar dataKey="gider" name="Maliyet + gider" fill="var(--chart-out)" radius={[4, 4, 0, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card className="mb-4 overflow-hidden">
            <div className="thin-scroll overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-2 text-[11px] uppercase tracking-wide text-muted">
                  <tr>
                    <th className="sticky left-0 bg-surface-2 px-4 py-2 text-left">Kalem</th>
                    {months.map((m) => (
                      <th key={m.month} className="whitespace-nowrap px-3 py-2 text-right">
                        {monthLabel(m.month)}
                      </th>
                    ))}
                    <th className="px-4 py-2 text-right">Toplam</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rowsDef.map(([k, label, bold]) => (
                    <tr key={k} className={cn(bold && "bg-surface-2/60 font-semibold")}>
                      <td className="sticky left-0 whitespace-nowrap bg-surface px-4 py-2">{label}</td>
                      {months.map((m) => (
                        <td key={m.month} className={cn("num whitespace-nowrap px-3 py-2 text-right", Number(m[k]) < 0 && "text-danger")}>
                          {Number(m[k]) ? formatCompact(Number(m[k])) : "—"}
                        </td>
                      ))}
                      <td className={cn("num whitespace-nowrap px-4 py-2 text-right", sum(k) < 0 && "text-danger")}>{formatMoney(sum(k))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          {!!cats.length && (
            <Card>
              <CardHeader title="Masraflar (kategoriye göre)" />
              <ul className="flex flex-col gap-2.5 p-4">
                {cats.map((c) => (
                  <li key={c.name} className="grid grid-cols-[140px_1fr_110px] items-center gap-3 text-sm">
                    <span className="truncate">{c.name}</span>
                    <span className="h-2.5 overflow-hidden rounded-full bg-surface-2">
                      <span className="block h-full rounded-full bg-chart-out" style={{ width: `${(Number(c.amount) / catMax) * 100}%` }} />
                    </span>
                    <span className="num text-right font-medium">{formatMoney(c.amount)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
