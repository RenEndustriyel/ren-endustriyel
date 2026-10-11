"use client";

import * as React from "react";
import { CalendarClock } from "lucide-react";
import { formatDayMonth, formatNumber, relativeDays } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DashboardSummary } from "./types";

type Item = DashboardSummary["timeline"][number];

function Row({ item, overdue }: { item: Item; overdue?: boolean }) {
  const label = item.flow === "in" ? "Tahsilat" : "Ödeme";
  return (
    <div className={cn("relative pl-5", overdue ? "text-white" : "")}>
      <span className={cn("absolute left-0 top-1.5 size-2 rounded-full", overdue ? "bg-white/80" : item.flow === "in" ? "bg-chart-in" : "bg-chart-out")} />
      <div className={cn("text-[11px] font-bold uppercase tracking-wide", overdue ? "text-white/85" : "text-muted")}>
        {overdue ? `${item.days_overdue} gün gecikti` : relativeDays(-item.days_overdue)} · {formatDayMonth(item.due_date)}
      </div>
      <div className="text-sm">
        {label}: <span className="num font-semibold">{formatNumber(item.amount)}</span>
      </div>
      {item.party && <div className={cn("truncate text-xs", overdue ? "text-white/80" : "text-muted")}>{item.party}</div>}
    </div>
  );
}

/** Paraşüt'teki sağ sütun: yaklaşan (üstte) · BUGÜN · gecikmiş (altta) */
export function Timeline({ data }: { data: DashboardSummary }) {
  const [showAllFuture, setShowAllFuture] = React.useState(false);
  const [showAllOverdue, setShowAllOverdue] = React.useState(false);

  const future = data.timeline.filter((t) => t.days_overdue <= 0).sort((a, b) => b.due_date.localeCompare(a.due_date));
  const overdue = data.timeline.filter((t) => t.days_overdue > 0).sort((a, b) => b.due_date.localeCompare(a.due_date));
  const futureShown = showAllFuture ? future : future.slice(-5);
  const overdueShown = showAllOverdue ? overdue : overdue.slice(0, 5);

  return (
    <div className="overflow-hidden rounded-card border border-border bg-surface">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3 text-[15px] font-semibold">
        <CalendarClock className="size-4 text-primary" /> Vade Takvimi
      </div>
      {future.length > futureShown.length && (
        <button onClick={() => setShowAllFuture(true)} className="w-full px-4 pt-3 text-left text-[11px] font-bold uppercase tracking-wide text-muted hover:text-primary">
          Daha sonrasını göster (+{future.length - futureShown.length})
        </button>
      )}
      <div className="flex flex-col gap-4 px-4 py-4">
        {futureShown.length === 0 && <p className="text-sm text-muted">Yaklaşan tahsilat / ödeme yok.</p>}
        {futureShown.map((t) => (
          <Row key={t.id} item={t} />
        ))}
      </div>
      <div className="bg-success px-4 py-2.5 text-[12px] font-bold uppercase tracking-wide text-white">
        Bugün – {formatDayMonth(data.today)}
      </div>
      {overdue.length > 0 ? (
        <div className="bg-danger">
          <div className="flex flex-col gap-4 px-4 py-4">
            {overdueShown.map((t) => (
              <Row key={t.id} item={t} overdue />
            ))}
          </div>
          {overdue.length > overdueShown.length && (
            <button
              onClick={() => setShowAllOverdue(true)}
              className="w-full border-t border-white/20 px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-white hover:bg-white/10"
            >
              +{overdue.length - overdueShown.length} gecikmiş işlem
            </button>
          )}
        </div>
      ) : (
        <p className="px-4 py-4 text-sm text-muted">Geciken işlem yok.</p>
      )}
    </div>
  );
}
