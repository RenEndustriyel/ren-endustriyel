import Link from "next/link";
import { ProductCard } from "./product-card";
import type { StoreProduct } from "./store-shared";

export const STORE_WRAP = "mx-auto max-w-[1240px] px-4";

/** Bölüm başlığı + isteğe bağlı bağlantı */
export function StoreSectionHead({ title, href, linkLabel = "Tümünü gör" }: { title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <h2 className="text-xl font-bold text-[#1e1e1e] sm:text-2xl">{title}</h2>
      {href && (
        <Link href={href} className="shrink-0 text-sm font-bold text-[#ec1c23] hover:underline">
          {linkLabel} ›
        </Link>
      )}
    </div>
  );
}

export function ProductGrid({ products, priorityCount = 0, dense = false }: { products: StoreProduct[]; priorityCount?: number; dense?: boolean }) {
  return (
    <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 ${dense ? "xl:grid-cols-4" : "lg:grid-cols-4 xl:grid-cols-5"}`}>
      {products.map((p, i) => (
        <ProductCard key={p.slug} product={p} priority={i < priorityCount} bordered={dense} />
      ))}
    </div>
  );
}

/** Gri şerit üzerinde sayfa yolu */
export function StoreCrumbs({ crumbs }: { crumbs: { href?: string; label: string }[] }) {
  return (
    <div className="bg-[#ececec]">
      <nav aria-label="Sayfa yolu" className={`${STORE_WRAP} flex flex-wrap items-center gap-x-2 gap-y-1 py-3 text-[11px] text-[#2d1b7e]`}>
        <Link href="/magaza" className="hover:underline">
          Ana Sayfa
        </Link>
        {crumbs.map((c) => (
          <span key={c.label} className="inline-flex items-center gap-2">
            <span className="text-[#8c8c8c]">/</span>
            {c.href ? (
              <Link href={c.href} className="hover:underline">
                {c.label}
              </Link>
            ) : (
              <span>{c.label}</span>
            )}
          </span>
        ))}
      </nav>
    </div>
  );
}

export function StorePageTitle({ children }: { children: React.ReactNode }) {
  return <h1 className="py-3 text-2xl font-bold text-[#333333] sm:text-[28px]">{children}</h1>;
}
