import { Money } from "./money";
import { cn } from "@/lib/utils";

type Segment = { value: number; color: string };

/** Paraşüt tarzı halka: segmentler arasında 2px boşluk, ortada tutar */
export function Ring({
  label,
  segments,
  value,
  emptyText,
  valueClassName,
}: {
  label: string;
  segments: Segment[];
  value: number;
  emptyText?: string;
  valueClassName?: string;
}) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + Math.max(x.value, 0), 0);
  const visible = segments.filter((s) => s.value > 0);
  const gap = visible.length > 1 ? 3 : 0;
  let offset = 0;

  return (
    <div className="flex min-w-0 flex-col items-center gap-2">
      <div className="text-center text-[10.5px] font-bold uppercase tracking-wide text-muted sm:text-[11px]">{label}</div>
      <div className="relative aspect-square w-full max-w-[150px]">
        <svg viewBox="0 0 128 128" className="size-full -rotate-90" role="img" aria-label={label}>
          <circle cx="64" cy="64" r={r} fill="none" stroke="var(--neutral-ring)" strokeWidth="9" />
          {total > 0 &&
            visible.map((s, i) => {
              const len = (s.value / total) * c;
              const el = (
                <circle
                  key={i}
                  cx="64"
                  cy="64"
                  r={r}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="9"
                  strokeDasharray={`${Math.max(len - gap, 0.5)} ${c}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += len;
              return el;
            })}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center px-3 text-center">
          {value === 0 && emptyText ? (
            <span className="text-[10px] font-bold uppercase tracking-wide text-muted sm:text-xs">{emptyText}</span>
          ) : (
            <Money value={value} className={cn("text-[clamp(0.8rem,3.4vw,1.35rem)] sm:text-lg lg:text-xl", valueClassName)} />
          )}
        </div>
      </div>
    </div>
  );
}
