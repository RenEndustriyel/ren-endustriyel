import Image from "next/image";
import { categoryOf } from "./store-shared";

/** Ürün görseli; görsel yoksa kategori renginde simgeli yer tutucu */
export function ProductThumb({ image, name, cat, brand, sizes, priority, className = "" }: { image?: string; name: string; cat: string; brand?: string; sizes: string; priority?: boolean; className?: string }) {
  if (image) {
    return (
      <div className={`relative bg-white ${className}`}>
        <Image src={image} alt={name} fill sizes={sizes} priority={priority} className="object-contain p-[9%]" />
      </div>
    );
  }
  const c = categoryOf(cat);
  return (
    <div className={`relative flex flex-col items-center justify-center gap-[6%] ${className}`} style={{ backgroundColor: c.tint, color: c.ink }} role="img" aria-label={name}>
      <c.icon className="h-[30%] w-[30%]" strokeWidth={1.4} />
      <span className="max-w-[85%] truncate text-[clamp(9px,0.7em,13px)] font-extrabold uppercase tracking-[0.14em] opacity-80">{brand || c.short}</span>
    </div>
  );
}
