"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, MessageCircle, Minus, Plus, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { applyOverride, usePreviewAdmin } from "./preview-admin";
import { priceTL, useAddToCart } from "./product-card";
import { waLink } from "./store-shared";
import { storeActions, useStore, type StoreItem } from "./store-state";

export function QtyStepper({ value, onChange, size = "md" }: { value: number; onChange: (n: number) => void; size?: "sm" | "md" }) {
  const box = size === "sm" ? "size-8" : "size-10";
  return (
    <div className={`inline-flex w-fit items-center overflow-hidden rounded border border-[#d9d9d9] bg-white ${size === "sm" ? "h-8" : "h-10"}`}>
      <button type="button" aria-label="Adedi azalt" onClick={() => onChange(value - 1)} className={`grid ${box} place-items-center text-[#333333] transition hover:bg-[#f5f5f5]`}>
        <Minus size={size === "sm" ? 14 : 16} />
      </button>
      <input
        aria-label="Adet"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(Math.max(1, Math.min(9999, Number.parseInt(e.target.value.replace(/\D/g, ""), 10) || 1)))}
        className={`h-full border-x border-[#e6e6e6] bg-transparent text-center font-bold tabular-nums text-[#1e1e1e] outline-none ${size === "sm" ? "w-10 text-[13px]" : "w-14 text-[15px]"}`}
      />
      <button type="button" aria-label="Adedi artır" onClick={() => onChange(value + 1)} className={`grid ${box} place-items-center text-[#333333] transition hover:bg-[#f5f5f5]`}>
        <Plus size={size === "sm" ? 14 : 16} />
      </button>
    </div>
  );
}

/** Ürün sayfası satın alma bölümü: adet, fiyat kutusu, Hemen Al / Sepete Ekle */
export function BuyBox({ product: base }: { product: StoreItem }) {
  const add = useAddToCart();
  const router = useRouter();
  const product = applyOverride(base, usePreviewAdmin().products);
  const { cart, favs } = useStore();
  const [qty, setQty] = React.useState(1);
  const inCart = cart.find((l) => l.slug === product.slug)?.qty ?? 0;
  const fav = favs.some((f) => f.slug === product.slug);

  if (product.hidden) {
    return <div className="mt-5 rounded bg-[#f5f5f5] p-5 text-sm font-semibold text-[#555555]">Bu ürün şu anda mağazada satışta değil.</div>;
  }

  return (
    <div>
      <div className="grid grid-cols-[100px_1fr] items-center border-b border-dotted border-[#bdbdbd] py-3 text-sm">
        <span className="font-bold text-[#1e1e1e]">Adet</span>
        <QtyStepper value={qty} onChange={(n) => setQty(Math.max(1, n))} />
      </div>

      <div className="mt-5 rounded border border-[#e6e6e6] bg-[#f7f7f7]">
        <div className="px-4 py-3">
          {product.price !== undefined ? (
            <div className="flex items-end gap-1.5">
              <span className="text-[28px] font-bold leading-none tabular-nums text-black">{priceTL(product.price)}</span>
              {product.unit && <span className="pb-0.5 text-[11px] uppercase leading-none text-[#7f7f7f]">/ {product.unit}</span>}
            </div>
          ) : (
            <>
              <div className="text-xl font-bold text-[#2d1b7e]">Fiyat için teklif alın</div>
              <p className="mt-1 text-[13px] leading-5 text-[#555555]">Bu ürünün fiyatı miktara göre belirlenir. Sepetinize ekleyip siparişinizi iletin, güncel fiyatla dönüş yapalım.</p>
            </>
          )}
        </div>
        {product.price !== undefined && (
          <div className="border-t border-[#e6e6e6] px-4 py-2 text-xs text-[#555555]">
            Toplam Tutar: <strong className="tabular-nums text-[#1e1e1e]">{priceTL(product.price * qty)}</strong>
          </div>
        )}
        <div className="flex flex-wrap gap-3 border-t border-[#e6e6e6] px-4 py-4">
          <button
            type="button"
            onClick={() => {
              storeActions.add(product, inCart ? 0 : qty);
              router.push("/magaza/odeme");
            }}
            className="inline-flex h-11 min-w-[105px] items-center justify-center rounded-sm bg-[#f7941d] px-5 text-sm font-bold text-white transition hover:bg-[#de7f0c]"
          >
            Hemen Al
          </button>
          <button type="button" onClick={() => add(product, qty)} className="inline-flex h-11 min-w-[148px] items-center justify-center gap-2.5 rounded-sm bg-[#0fc02c] px-5 text-sm font-bold text-white transition hover:bg-[#0ca325]">
            <ShoppingCart size={16} fill="currentColor" /> Sepete Ekle
          </button>
          <button
            type="button"
            aria-pressed={fav}
            onClick={() => {
              const added = storeActions.toggleFav(product);
              toast(added ? "Favorilere eklendi" : "Favorilerden çıkarıldı", { description: product.name });
            }}
            className="inline-flex h-11 items-center gap-2.5 rounded-sm border border-[#cfcfcf] bg-white px-4 text-sm text-[#1e1e1e] transition hover:border-[#ec1c23]"
          >
            {fav ? "Favorilerimde" : "Favorilerime Ekle"} <Heart size={18} fill={fav ? "#ec1c23" : "none"} className={fav ? "text-[#ec1c23]" : "text-[#555555]"} />
          </button>
        </div>
      </div>

      {inCart > 0 && (
        <div className="mt-3 flex items-center justify-between rounded border border-[#d6d0ee] bg-[#eeecf8] px-4 py-2.5 text-[13px] text-[#2d1b7e]">
          <span>
            Sepetinizde <strong>{inCart}</strong> adet var
          </span>
          <Link href="/magaza/sepet" className="font-bold underline-offset-2 hover:underline">
            Sepete git
          </Link>
        </div>
      )}

      <a href={waLink(`Merhaba, mağazanızdaki şu ürün hakkında bilgi almak istiyorum:\n${product.name}`)} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex h-11 items-center gap-2 rounded-sm bg-[#133258] px-5 text-sm font-bold text-white transition hover:bg-[#0c2340]">
        <MessageCircle size={17} /> Bu ürünü WhatsApp&apos;tan sorun
      </a>
    </div>
  );
}
