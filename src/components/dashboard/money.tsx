import { splitMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Paraşüt tarzı tutar: büyük tam kısım + küçük kuruş */
export function Money({ value, className, centsClassName, suffix }: { value: number; className?: string; centsClassName?: string; suffix?: string }) {
  const { whole, cents } = splitMoney(value);
  return (
    <span className={cn("num whitespace-nowrap font-semibold", className)}>
      {whole}
      <span className={cn("text-[0.6em] font-semibold opacity-80", centsClassName)}>,{cents}</span>
      {suffix && <span className="ml-1 text-[0.6em] font-medium opacity-70">{suffix}</span>}
    </span>
  );
}
