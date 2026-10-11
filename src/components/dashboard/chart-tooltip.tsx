import { formatNumber } from "@/lib/format";

type P = { color?: string; name?: string; value?: number; dataKey?: string | number };

/** Ortak ipucu kutusu: metin mürekkep renginde, seri rengi yalnızca işaretçide */
export function ChartTooltip({ active, payload, label, formatLabel }: { active?: boolean; payload?: P[]; label?: string; formatLabel?: (l: string) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-lg">
      {label && <div className="mb-1 font-semibold">{formatLabel ? formatLabel(label) : label}</div>}
      {payload.map((p) => (
        <div key={String(p.dataKey)} className="flex items-center gap-2">
          <span className="size-2.5 rounded-sm" style={{ background: p.color }} />
          <span className="text-muted">{p.name}</span>
          <span className="num ml-auto pl-3 font-semibold">{formatNumber(Math.abs(Number(p.value ?? 0)))} ₺</span>
        </div>
      ))}
    </div>
  );
}
