"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "./product-card";
import type { StoreProduct } from "./store-shared";

/** Yatay kaydırmalı ürün vitrini (yan oklarla veya parmakla kaydırılır) */
export function ProductCarousel({ title, products }: { title: string; products: StoreProduct[] }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const slide = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: "smooth" });
  const arrow = "absolute top-[38%] z-10 hidden size-12 -translate-y-1/2 place-items-center rounded-full bg-[#dcd8ee] text-[#1e1e1e] transition hover:bg-[#2d1b7e] hover:text-white sm:grid";

  return (
    <div>
      <h2 className="mb-4 text-xl font-bold text-[#1e1e1e] sm:text-2xl">{title}</h2>
      <div className="relative">
        <button type="button" aria-label="Geri kaydır" onClick={() => slide(-1)} className={`${arrow} left-0`}>
          <ChevronLeft size={22} />
        </button>
        <button type="button" aria-label="İleri kaydır" onClick={() => slide(1)} className={`${arrow} right-0`}>
          <ChevronRight size={22} />
        </button>
        <div ref={ref} className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:gap-5 sm:px-0 [&::-webkit-scrollbar]:hidden">
          {products.map((p, i) => (
            <div key={p.slug} className="w-[46%] shrink-0 snap-start sm:w-[calc((100%-40px)/3)] lg:w-[calc((100%-60px)/4)] xl:w-[calc((100%-80px)/5)]">
              <ProductCard product={p} priority={i < 5} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
