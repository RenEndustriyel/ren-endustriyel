import * as React from "react";
import { cn } from "@/lib/utils";
import { formatMoney, formatQty } from "@/lib/format";

export function Stat({
  label,
  value,
  currency = "TRY",
  unit,
  tone,
  sub,
  className,
}: {
  label: string;
  value: number | React.ReactNode;
  currency?: string | null;
  unit?: string;
  tone?: "success" | "danger" | "primary" | "warning";
  sub?: React.ReactNode;
  className?: string;
}) {
  const color = tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : tone === "primary" ? "text-primary" : tone === "warning" ? "text-warning" : "";

  let displayValue = value;
  if (typeof value === "number") {
    if (unit) {
      displayValue = `${formatQty(value)} ${unit}`.trim();
    } else if (currency === null) {
      displayValue = formatQty(value);
    } else {
      displayValue = formatMoney(value, currency);
    }
  }

  return (
    <div className={cn("rounded-xl border border-border bg-surface px-4 py-3 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] dark:shadow-none", className)}>
      <div className="text-xs text-muted">{label}</div>
      <div className={cn("num mt-0.5 text-lg font-semibold sm:text-xl", color)}>
        {displayValue}
      </div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </div>
  );
}
