"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, Zap } from "lucide-react";
import { toast } from "sonner";
import { applyOverride, usePreviewAdmin } from "./preview-admin";
import { ProductThumb } from "./product-thumb";
import { money, productHref } from "./store-shared";
import { storeActions, useStore, type StoreItem } from "./store-state";

export function useAddToCart() {
  const router = useRouter();
  return (p: StoreItem, qty = 1) => {
    storeActions.add(p, qty);
    toast.success("Sepete eklendi", { description: p.name, action: { label: "Sepete git", onClick: () => router.push("/magaza/sepet") } });
  };
}

/** "1.380,00 TL" biçimi */
export const priceTL = (value: number) => `${money(value).replace(/[₺\s]/g, "")} TL`;

export function FavButton({ product, className = "" }: { product: StoreItem; className?: string }) {
  const { favs } = useStore();
  const on = favs.some((f) => f.slug === product.slug);
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? "Favorilerden çıkar" : "Favorilere ekle"}
      title={on ? "Favorilerden çıkar" : "Favorilere ekle"}
      onClick={() => {
        const added = storeActions.toggleFav(product);
        toast(added ? "Favorilere eklendi" : "Favorilerden çıkarıldı", { description: product.name });
      }}
      className={`grid place-items-center rounded-full border bg-white transition ${on ? "border-[#ec1c23] text-[#ec1c23]" : "border-[#e6e6e6] text-[#6f6f6f] hover:border-[#ec1c23] hover:text-[#ec1c23]"} ${className}`}
    >
      <Heart size={17} fill={on ? "currentColor" : "none"} />
    </button>
  );
}

/** Vitrin ve liste ürün kartı: ortalı ad, fiyat ve "Sepete Ekle" */
export function ProductCard({ product: base, priority, bordered }: { product: StoreItem; priority?: boolean; bordered?: boolean }) {
  const add = useAddToCart();
  const router = useRouter();
  const product = applyOverride(base, usePreviewAdmin().products);
  const { cart } = useStore();
  const inCart = cart.find((l) => l.slug === product.slug)?.qty ?? 0;
  const href = productHref(product.slug);
  if (product.hidden) return null;

  return (
    <article className={`group relative flex h-full min-w-0 flex-col overflow-hidden rounded-md bg-white text-center ${bordered ? "border border-[#e2e2e2]" : ""}`}>
      {inCart > 0 && <span className="absolute left-2 top-2 z-10 rounded-full bg-[#2d1b7e] px-2.5 py-1 text-[11px] font-bold text-white">Sepette {inCart}</span>}
      <div className="absolute right-2 top-2 z-10 flex flex-col gap-1.5 transition lg:opacity-0 lg:group-focus-within:opacity-100 lg:group-hover:opacity-100">
        <FavButton product={product} className="size-9" />
        <button
          type="button"
          title="Hemen al"
          aria-label={`${product.name} hemen al`}
          onClick={() => {
            if (!inCart) storeActions.add(product);
            router.push("/magaza/odeme");
          }}
          className="grid size-9 place-items-center rounded-full border border-[#e6e6e6] bg-white text-[#6f6f6f] transition hover:border-[#ec1c23] hover:text-[#ec1c23]"
        >
          <Zap size={16} />
        </button>
      </div>
      <Link href={href} className="block p-3 pb-0" tabIndex={-1} aria-hidden>
        <ProductThumb image={product.image} name={product.name} cat={product.cat} brand={product.brand} priority={priority} sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw" className="aspect-square rounded" />
      </Link>
      <div className="flex flex-1 flex-col px-3 pb-5 pt-3">
        <h3 className="truncate text-[15px] font-bold leading-6">
          <Link href={href} title={product.name} className="text-[#ff002d] hover:underline">
            {product.name}
          </Link>
        </h3>
        <div className="mt-0.5 flex min-h-[26px] items-center justify-center">
          {product.price !== undefined ? (
            <span className="text-[17px] font-bold tabular-nums text-black">
              {priceTL(product.price)}
              {product.unit && <span className="ml-1 text-[11px] font-normal text-[#7f7f7f]">/ {product.unit}</span>}
            </span>
          ) : (
            <span className="text-[15px] font-bold text-[#2d1b7e]">Fiyat sorunuz</span>
          )}
        </div>
        <div className="mt-auto pt-5">
          <button type="button" onClick={() => add(product)} className="inline-flex h-[38px] min-w-[135px] items-center justify-center rounded bg-[#2d1b7e] px-5 text-sm text-white transition hover:bg-[#ec1c23] active:scale-[0.98]">
            Sepete Ekle
          </button>
        </div>
      </div>
    </article>
  );
}
