"use client";

import { cn } from "@/lib/utils";

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; count?: number }[];
  className?: string;
}) {
  return (
    <div className={cn("thin-scroll flex max-w-full overflow-x-auto rounded-lg border border-border bg-surface p-0.5 text-sm", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors",
            value === o.value ? "bg-primary text-white" : "text-muted hover:text-text",
          )}
        >
          {o.label}
          {o.count !== undefined && (
            <span className={cn("rounded-full px-1.5 text-[11px]", value === o.value ? "bg-white/20" : "bg-surface-2")}>{o.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
