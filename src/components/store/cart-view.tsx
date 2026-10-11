"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck, ShoppingCart, Trash2 } from "lucide-react";
import { QtyStepper } from "./buy-box";
import { shippingFor, usePreviewAdmin } from "./preview-admin";
import { ProductCard } from "./product-card";
import { ProductThumb } from "./product-thumb";
import { STORE_PREVIEW, money, productHref } from "./store-shared";
import { cartSummary, storeActions, useStore, type CartLine } from "./store-state";

/** Sipariş özeti kutusu (sepet ve ödeme sayfalarında ortak) */
export function OrderSummary({ cart, children }: { cart: CartLine[]; children?: React.ReactNode }) {
  const { count, subtotal, unpriced } = cartSummary(cart);
  const { settings } = usePreviewAdmin();
  const shipping = shippingFor(subtotal, settings);
  const shippingLabel = settings.shippingFee > 0 ? (shipping ? money(shipping) : "Ücretsiz") : "Onayda bildirilir";
  return (
    <aside className="h-fit rounded-2xl border border-[#e6e6e6] bg-white p-5 lg:sticky lg:top-40">
      <h2 className="text-base font-extrabold text-[#1e1e1e]">Sipariş Özeti</h2>
      <dl className="mt-4 space-y-2.5 text-sm">
        <div className="flex justify-between">
          <dt className="text-[#6f6f6f]">Ürün adedi</dt>
          <dd className="font-semibold tabular-nums">{count}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-[#6f6f6f]">Ara toplam</dt>
          <dd className="font-semibold tabular-nums">{money(subtotal)}</dd>
        </div>
        {unpriced > 0 && (
          <div className="flex justify-between gap-4">
            <dt className="text-[#6f6f6f]">Fiyatı teklifle belirlenecek</dt>
            <dd className="shrink-0 font-semibold">{unpriced} ürün</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-[#6f6f6f]">Teslimat</dt>
          <dd className="font-semibold tabular-nums">{shippingLabel}</dd>
        </div>
      </dl>
      <div className="mt-4 flex items-baseline justify-between border-t border-[#eeeeee] pt-4">
        <span className="text-sm font-bold">Toplam</span>
        <span className="text-2xl font-extrabold tabular-nums tracking-tight text-[#1e1e1e]">
          {money(subtotal + shipping)}
          {unpriced > 0 && <span className="ml-1 text-sm font-bold text-[#2d1b7e]">+ teklif</span>}
        </span>
      </div>
      {children}
      <p className="mt-4 flex items-start gap-2 text-[11px] leading-4 text-[#7f7f7f]">
        <ShieldCheck size={14} className="mt-px shrink-0 text-[#2d1b7e]" />
        {STORE_PREVIEW ? "Önizleme sürümü: fiyatlar örnektir, çevrimiçi tahsilat yapılmaz." : "Bilgileriniz yalnızca siparişiniz için kullanılır."}
      </p>
    </aside>
  );
}

export function CartView() {
  const { cart } = useStore();

  if (!cart.length) {
    return (
      <div className="rounded-2xl border border-[#e6e6e6] bg-white px-6 py-16 text-center">
        <span className="mx-auto grid size-20 place-items-center rounded-full bg-[#f5f5f5] text-[#9a9a9a]">
          <ShoppingCart size={34} />
        </span>
        <h2 className="mt-5 text-xl font-extrabold text-[#1e1e1e]">Sepetiniz boş</h2>
        <p className="mt-1.5 text-sm text-[#6f6f6f]">Ürünleri inceleyip sepetinize ekleyerek siparişinizi oluşturabilirsiniz.</p>
        <Link href="/magaza/urunler" className="mt-6 inline-flex h-12 items-center gap-2 rounded-lg bg-[#ec1c23] px-6 text-sm font-bold text-white transition hover:bg-[#c9151b]">
          Alışverişe başla <ArrowRight size={17} />
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <div className="overflow-hidden rounded-2xl border border-[#e6e6e6] bg-white">
        <div className="flex items-center justify-between border-b border-[#eeeeee] px-4 py-3.5 sm:px-6">
          <span className="text-sm font-bold text-[#1e1e1e]">{cart.length} çeşit ürün</span>
          <button type="button" onClick={() => storeActions.clear()} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6f6f6f] hover:text-[#c0392b]">
            <Trash2 size={14} /> Sepeti boşalt
          </button>
        </div>
        <ul className="divide-y divide-[#eeeeee]">
          {cart.map((l) => (
            <li key={l.slug} className="flex gap-3 p-4 sm:gap-5 sm:px-6">
              <Link href={productHref(l.slug)} className="block size-20 shrink-0 overflow-hidden rounded-lg border border-[#eeeeee] sm:size-24">
                <ProductThumb image={l.image} name={l.name} cat={l.cat} brand={l.brand} sizes="96px" className="size-full text-[10px]" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-5">
                <div className="min-w-0 flex-1">
                  {l.brand && <div className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#2d1b7e]">{l.brand}</div>}
                  <Link href={productHref(l.slug)} className="line-clamp-2 text-sm font-semibold leading-5 text-[#1e1e1e] hover:text-[#2d1b7e]">
                    {l.name}
                  </Link>
                  <div className="mt-0.5 text-xs text-[#7f7f7f]">{l.price !== undefined ? `${money(l.price)}${l.unit ? ` / ${l.unit}` : ""}` : "Fiyat teklifle belirlenir"}</div>
                </div>
                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <QtyStepper size="sm" value={l.qty} onChange={(n) => storeActions.setQty(l.slug, Math.max(1, n))} />
                  <div className="w-28 text-right text-[15px] font-extrabold tabular-nums text-[#1e1e1e]">{l.price !== undefined ? money(l.price * l.qty) : <span className="text-[13px] text-[#2d1b7e]">Teklif</span>}</div>
                  <button type="button" aria-label={`${l.name} ürününü sepetten çıkar`} onClick={() => storeActions.remove(l.slug)} className="grid size-9 shrink-0 place-items-center rounded-lg text-[#9a9a9a] transition hover:bg-[#fdecea] hover:text-[#c0392b]">
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <div className="border-t border-[#eeeeee] px-4 py-3.5 sm:px-6">
          <Link href="/magaza/urunler" className="text-[13px] font-bold text-[#2d1b7e] hover:text-[#ec1c23]">
            ← Alışverişe devam et
          </Link>
        </div>
      </div>

      <OrderSummary cart={cart}>
        <Link href="/magaza/odeme" className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#ec1c23] text-[15px] font-bold text-white transition hover:bg-[#c9151b]">
          Siparişi Tamamla <ArrowRight size={18} />
        </Link>
      </OrderSummary>
    </div>
  );
}

export function FavoritesView() {
  const { favs } = useStore();
  if (!favs.length) {
    return (
      <div className="rounded-2xl border border-[#e6e6e6] bg-white px-6 py-16 text-center">
        <h2 className="text-xl font-extrabold text-[#1e1e1e]">Favori listeniz boş</h2>
        <p className="mt-1.5 text-sm text-[#6f6f6f]">Beğendiğiniz ürünlerde kalp simgesine dokunarak buraya ekleyebilirsiniz.</p>
        <Link href="/magaza/urunler" className="mt-6 inline-flex h-12 items-center gap-2 rounded-lg bg-[#2d1b7e] px-6 text-sm font-bold text-white transition hover:bg-[#21135f]">
          Ürünlere göz at <ArrowRight size={17} />
        </Link>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
      {favs.map((p) => (
        <ProductCard key={p.slug} product={p} />
      ))}
    </div>
  );
}
