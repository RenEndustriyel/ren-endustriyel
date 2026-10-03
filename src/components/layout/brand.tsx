import { cn } from "@/lib/utils";

export function BrandMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/icons/logo-mark.png"
      alt="Ren Endüstriyel"
      width={size}
      height={size}
      className={cn("shrink-0 select-none object-contain", className)}
    />
  );
}
