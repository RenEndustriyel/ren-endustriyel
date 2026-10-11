"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Check, CreditCard, Landmark, MessageCircle, PhoneCall } from "lucide-react";
import { OrderSummary } from "./cart-view";
import { previewAdmin, shippingFor, usePreviewAdmin, type StoreOrder as Order } from "./preview-admin";
import { STORE_PREVIEW, money, waLink } from "./store-shared";
import { cartSummary, storeActions, useStore } from "./store-state";

const PAYMENTS = [
  { value: "havale", label: "Havale / EFT", text: "Sipariş onayında banka bilgilerimiz iletilir.", icon: Landmark, disabled: false },
  { value: "onay", label: "Sipariş onayında ödeme", text: "Ekibimiz sizi arar, ödeme şekli birlikte belirlenir.", icon: PhoneCall, disabled: false },
  { value: "kart", label: "Kredi / banka kartı", text: STORE_PREVIEW ? "Çevrimiçi kart ödemesi yakında açılacak." : "Güvenli ödeme sayfasında kartla ödeyin.", icon: CreditCard, disabled: STORE_PREVIEW },
];

const field = "mt-1.5 h-11 w-full rounded-lg border border-[#d9d9d9] bg-white px-3 text-sm text-[#1e1e1e] outline-none transition placeholder:text-[#9a9a9a] focus:border-[#2d1b7e] focus:ring-2 focus:ring-[#2d1b7e]/15";
const label = "block text-xs font-semibold text-[#333333]";

const newOrderRef = (now: Date) =>
  `REN-${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

function orderText(o: Order) {
  const c = o.customer;
  const lines = o.lines.map((l, i) => `${i + 1}. ${l.name} × ${l.qty}${l.price !== undefined ? ` — ${money(l.price * l.qty)}` : " — fiyat bekleniyor"}`);
  return [
    `Merhaba, mağazadan sipariş vermek istiyorum.`,
    `Sipariş no: ${o.ref}`,
    ``,
    ...lines,
    ``,
    `Ara toplam: ${money(o.subtotal)}${o.unpriced ? ` (+ ${o.unpriced} ürün için fiyat teklifi)` : ""}`,
    o.shipping ? `Teslimat: ${money(o.shipping)}` : null,
    `Ödeme: ${PAYMENTS.find((p) => p.value === o.payment)?.label ?? o.payment}`,
    ``,
    `Ad soyad: ${c.ad}`,
    `Telefon: ${c.telefon}`,
    c.eposta ? `E-posta: ${c.eposta}` : null,
    c.firma ? `Firma: ${c.firma}` : null,
    c.vergi ? `Vergi dairesi / no: ${c.vergi}` : null,
    `Adres: ${c.adres}, ${c.ilce} / ${c.il}`,
    c.not ? `Not: ${c.not}` : null,
  ]
    .filter((x) => x !== null)
    .join("\n");
}

export function CheckoutView() {
  const { cart } = useStore();
  const { settings } = usePreviewAdmin();
  const payments = PAYMENTS.filter((p) => (p.value === "havale" ? settings.payHavale : p.value === "onay" ? settings.payOnay : true));
  const [invoice, setInvoice] = React.useState<"bireysel" | "kurumsal">("bireysel");
  const [payment, setPayment] = React.useState("havale");
  const [done, setDone] = React.useState<Order | null>(null);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!cart.length) return;
    const data = Object.fromEntries([...new FormData(e.currentTarget).entries()].map(([k, v]) => [k, String(v).trim()]));
    const { subtotal, unpriced } = cartSummary(cart);
    const now = new Date();
    const ref = newOrderRef(now);
    const pay = payments.some((p) => p.value === payment && !p.disabled) ? payment : (payments.find((p) => !p.disabled)?.value ?? payment);
    const order: Order = { ref, createdAt: now.toISOString(), customer: data, payment: pay, lines: cart, subtotal, unpriced, shipping: shippingFor(subtotal, settings) };
    previewAdmin.addOrder(order);
    setDone(order);
    storeActions.clear();
    window.scrollTo({ top: 0 });
  };

  if (done) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-[#e6e6e6] bg-white px-6 py-12 text-center sm:px-12">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-[#eeecf8] text-[#2d1b7e]">
          <Check size={32} />
        </span>
        <h2 className="mt-5 text-2xl font-extrabold text-[#1e1e1e]">Siparişiniz hazırlandı</h2>
        <p className="mt-2 text-sm text-[#555555]">
          Sipariş numaranız: <strong className="text-[#1e1e1e]">{done.ref}</strong>
        </p>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#555555]">Siparişinizin bize ulaşması için aşağıdaki düğmeyle WhatsApp üzerinden gönderin. Stok ve teslimat gününü teyit edip size dönüş yapacağız.</p>
        <a href={waLink(orderText(done))} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex h-12 items-center gap-2 rounded-lg bg-[#25a55a] px-6 text-[15px] font-bold text-white transition hover:bg-[#1a8a48]">
          <MessageCircle size={19} /> Siparişi WhatsApp ile gönder
        </a>
        <div className="mt-8 rounded-xl bg-[#f5f5f5] p-4 text-left text-[13px]">
          {done.lines.map((l) => (
            <div key={l.slug} className="flex justify-between gap-4 py-1">
              <span className="text-[#333333]">
                {l.name} × {l.qty}
              </span>
              <span className="shrink-0 font-semibold tabular-nums">{l.price !== undefined ? money(l.price * l.qty) : "Teklif"}</span>
            </div>
          ))}
          <div className="mt-2 flex justify-between border-t border-[#dddddd] pt-2 font-bold">
            <span>Toplam</span>
            <span className="tabular-nums">
              {money(done.subtotal + (done.shipping ?? 0))}
              {done.unpriced ? " + teklif" : ""}
            </span>
          </div>
        </div>
        <Link href="/magaza" className="mt-6 inline-block text-sm font-bold text-[#2d1b7e] hover:text-[#ec1c23]">
          Mağazaya dön
        </Link>
      </div>
    );
  }

  if (!cart.length) {
    return (
      <div className="rounded-2xl border border-[#e6e6e6] bg-white px-6 py-16 text-center">
        <h2 className="text-xl font-extrabold text-[#1e1e1e]">Sepetinizde ürün yok</h2>
        <p className="mt-1.5 text-sm text-[#6f6f6f]">Sipariş verebilmek için önce sepetinize ürün ekleyin.</p>
        <Link href="/magaza/urunler" className="mt-6 inline-flex h-12 items-center gap-2 rounded-lg bg-[#ec1c23] px-6 text-sm font-bold text-white transition hover:bg-[#c9151b]">
          Ürünlere git <ArrowRight size={17} />
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <div className="space-y-5">
        <section className="rounded-2xl border border-[#e6e6e6] bg-white p-5 sm:p-7">
          <h2 className="flex items-center gap-3 text-base font-extrabold text-[#1e1e1e]">
            <span className="grid size-7 place-items-center rounded-full bg-[#2d1b7e] text-xs text-white">1</span> Teslimat Bilgileri
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className={label}>
              Ad soyad *
              <input name="ad" required autoComplete="name" className={field} placeholder="Adınız Soyadınız" />
            </label>
            <label className={label}>
              Telefon *
              <input name="telefon" required type="tel" autoComplete="tel" pattern="[0-9 +\(\)]{10,}" title="En az 10 haneli telefon numarası" className={field} placeholder="05xx xxx xx xx" />
            </label>
            <label className={`${label} sm:col-span-2`}>
              E-posta
              <input name="eposta" type="email" autoComplete="email" className={field} placeholder="ornek@firma.com" />
            </label>
            <label className={label}>
              İl *
              <input name="il" required autoComplete="address-level1" className={field} placeholder="Balıkesir" />
            </label>
            <label className={label}>
              İlçe *
              <input name="ilce" required autoComplete="address-level2" className={field} placeholder="Susurluk" />
            </label>
            <label className={`${label} sm:col-span-2`}>
              Açık adres *
              <textarea name="adres" required rows={3} autoComplete="street-address" className={`${field} h-auto resize-y py-2.5`} placeholder="Mahalle, cadde/sokak, bina ve kapı no" />
            </label>
            <label className={`${label} sm:col-span-2`}>
              Sipariş notu
              <textarea name="not" rows={2} className={`${field} h-auto resize-y py-2.5`} placeholder="Teslimat saati, istediğiniz farklı boy veya ürün vb." />
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-[#e6e6e6] bg-white p-5 sm:p-7">
          <h2 className="flex items-center gap-3 text-base font-extrabold text-[#1e1e1e]">
            <span className="grid size-7 place-items-center rounded-full bg-[#2d1b7e] text-xs text-white">2</span> Fatura Bilgileri
          </h2>
          <div className="mt-5 inline-flex rounded-lg bg-[#f5f5f5] p-1">
            {(["bireysel", "kurumsal"] as const).map((v) => (
              <button key={v} type="button" aria-pressed={invoice === v} onClick={() => setInvoice(v)} className={`h-9 rounded-md px-5 text-[13px] font-bold transition ${invoice === v ? "bg-white text-[#2d1b7e] shadow-sm" : "text-[#6f6f6f]"}`}>
                {v === "bireysel" ? "Bireysel" : "Kurumsal"}
              </button>
            ))}
          </div>
          {invoice === "kurumsal" ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className={label}>
                Firma unvanı *
                <input name="firma" required autoComplete="organization" className={field} placeholder="Firma unvanı" />
              </label>
              <label className={label}>
                Vergi dairesi / no *
                <input name="vergi" required className={field} placeholder="Susurluk V.D. / 1234567890" />
              </label>
            </div>
          ) : (
            <p className="mt-3 text-[13px] text-[#6f6f6f]">Fatura, teslimat bilgilerinizdeki ad ve adrese düzenlenir.</p>
          )}
        </section>

        <section className="rounded-2xl border border-[#e6e6e6] bg-white p-5 sm:p-7">
          <h2 className="flex items-center gap-3 text-base font-extrabold text-[#1e1e1e]">
            <span className="grid size-7 place-items-center rounded-full bg-[#2d1b7e] text-xs text-white">3</span> Ödeme Yöntemi
          </h2>
          <div className="mt-5 space-y-2.5">
            {payments.map((p) => (
              <label key={p.value} className={`flex items-start gap-3 rounded-xl border p-4 transition ${p.disabled ? "cursor-not-allowed border-[#e6e6e6] opacity-55" : "cursor-pointer"} ${payment === p.value ? "border-[#2d1b7e] bg-[#f4f2fb]" : "border-[#e6e6e6] hover:border-[#c8c8c8]"}`}>
                <input type="radio" name="odeme" value={p.value} disabled={p.disabled} checked={payment === p.value} onChange={() => setPayment(p.value)} className="mt-1 accent-[#2d1b7e]" />
                <p.icon size={20} className="mt-0.5 shrink-0 text-[#2d1b7e]" />
                <span>
                  <span className="block text-sm font-bold text-[#1e1e1e]">{p.label}</span>
                  <span className="mt-0.5 block text-xs text-[#6f6f6f]">{p.text}</span>
                </span>
              </label>
            ))}
          </div>
        </section>
      </div>

      <OrderSummary cart={cart}>
        <ul className="mt-4 max-h-52 space-y-2 overflow-y-auto border-t border-[#eeeeee] pt-4 text-xs">
          {cart.map((l) => (
            <li key={l.slug} className="flex justify-between gap-3">
              <span className="text-[#555555]">
                {l.name} × {l.qty}
              </span>
              <span className="shrink-0 font-semibold tabular-nums">{l.price !== undefined ? money(l.price * l.qty) : "Teklif"}</span>
            </li>
          ))}
        </ul>
        <button type="submit" className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#ec1c23] text-[15px] font-bold text-white transition hover:bg-[#c9151b]">
          Siparişi Onayla <Check size={18} />
        </button>
        <p className="mt-3 text-center text-[11px] leading-4 text-[#7f7f7f]">
          Siparişi onaylayarak{" "}
          <Link href="/yasal" className="underline">
            KVKK aydınlatma metnini
          </Link>{" "}
          okuduğunuzu kabul edersiniz.
        </p>
      </OrderSummary>
    </form>
  );
}
