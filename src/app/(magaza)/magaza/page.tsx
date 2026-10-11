import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown, ClipboardList } from "lucide-react";
import { HeroSlider, type HeroSlide } from "@/components/store/hero-slider";
import { ProductCarousel } from "@/components/store/product-carousel";
import { CATEGORY_COUNTS, FEATURED, PRODUCTS, STORE_BRANDS } from "@/components/store/store-data";
import { STORE_CATEGORIES, categoryOf, listHref } from "@/components/store/store-shared";
import { ProductGrid, STORE_WRAP, StoreSectionHead } from "@/components/store/store-ui";

export const metadata: Metadata = {
  alternates: { canonical: "/magaza" },
};

const SLIDES: HeroSlide[] = [
  {
    kicker: "İşletmeniz İçin",
    title: "Toptan Hijyen Tedariki",
    bullets: ["Temizlik Kimyasalları", "Kağıt Ürünleri", "Çöp Poşetleri", "Temizlik Ekipmanları", "Tek Kullanımlık Ürünler", "Sıvı Sabun ve Dispenser"],
    cta: "Alışverişe başla",
    href: "/magaza/urunler",
    bg: "#14315c",
    images: [
      { src: "/urun-resimleri/domestos-pro-camasir-suyu-5l.png", alt: "Domestos Professional Çamaşır Suyu 5 L" },
      { src: "/urun-resimleri/cif-pro-bulasik-deterjani-1420ml.png", alt: "Cif Professional Bulaşık Deterjanı" },
      { src: "/urun-resimleri/yumos-pro-tekstil-parfumu-750ml.png", alt: "Yumoş Professional Tekstil Parfümü" },
    ],
  },
  {
    kicker: "Kurumlar İçin",
    title: "Kağıt ve Dispenser Grubu",
    bullets: ["Z Katlı Havlu", "Sensörlü Havlu", "İçten Çekmeli Tuvalet Kağıdı", "Dispenser Peçete", "Havluluk ve Aparatlar"],
    cta: "Kağıt ürünlerini incele",
    href: listHref({ kategori: "kagit" }),
    bg: "#2d1b7e",
    cats: ["kagit", "sabun", "poset"],
  },
  {
    kicker: "Yoğun Kullanım İçin",
    title: "5 ve 20 kg Ekonomik Boylar",
    bullets: ["Yüzey Temizleyici", "Bulaşık Deterjanı", "Sıvı El Sabunu", "Çamaşır Suyu", "Yağ ve Kireç Çözücü"],
    cta: "Büyük boyları gör",
    href: listHref({ q: "20 kg" }),
    bg: "#0f4c5c",
    cats: ["yuzey", "bulasik", "camasir-suyu"],
  },
];

/** Her kategoriden iki ürün: karma seçki */
const PICKS = STORE_CATEGORIES.flatMap((c) => {
  const list = PRODUCTS.filter((p) => p.cat === c.slug && !p.image);
  return [...list.filter((p) => p.brand), ...list.filter((p) => !p.brand)].slice(0, 2);
}).slice(0, 15);

const BANNERS = ["kagit", "ekipman", "ambalaj"].map(categoryOf);
const BANNER_TEXT: Record<string, string> = {
  kagit: "Kağıt Havlu, Peçete ve Dispenser Ürünleri",
  ekipman: "Mop, Bez, Eldiven ve Temizlik Ekipmanları",
  ambalaj: "Restoran ve Kafe İçin Tek Kullanımlık Ürünler",
};

const FAQ = [
  { q: "Hangi ürün kategorilerinde satış yapıyorsunuz?", a: "Temizlik kimyasalları, kağıt ürünleri, çöp poşetleri, temizlik ekipmanları ve tek kullanımlık ambalaj ürünleri başta olmak üzere işletmelerin hijyen ve sarf ihtiyaçlarını tek noktadan karşılıyoruz." },
  { q: "Satışlarınız sadece firmalara mı yönelik?", a: "Hayır. Hem kurumlara hem de bireysel müşterilere toptan ve perakende satış yapıyoruz. Kurumsal alımlarda miktara göre özel fiyat verilir." },
  { q: "Fiyatı görünmeyen ürünleri nasıl sipariş ederim?", a: "Ürünü sepetinize ekleyip siparişinizi iletin. Güncel fiyatı size bildirir, onayınızdan sonra siparişi hazırlarız. Dilerseniz WhatsApp üzerinden de sorabilirsiniz." },
  { q: "Teslimat nasıl yapılıyor?", a: "Siparişiniz bize ulaştığında stok ve teslimat günü teyit edilerek size bilgi verilir. Tüm siparişler faturalı olarak gönderilir." },
  { q: "Toplu siparişlerde indirim yapıyor musunuz?", a: "Evet. Koli ve palet alımlarında kurumunuza özel fiyat hazırlıyoruz. İhtiyaç listenizi teklif formundan veya WhatsApp ile gönderebilirsiniz." },
];

export default function StoreHomePage() {
  return (
    <>
      <section className={`${STORE_WRAP} pt-5`}>
        <HeroSlider slides={SLIDES} />
      </section>

      <section className={`${STORE_WRAP} mt-8`}>
        <ProductCarousel title="Vitrin Ürünleri" products={FEATURED} />
      </section>

      <section className={`${STORE_WRAP} mt-10`}>
        <Link href="/iletisim#teklif" className="grid items-stretch bg-[#14315c] text-white md:grid-cols-[1fr_auto]">
          <div className="px-6 py-7 sm:px-8">
            <div className="text-3xl font-light uppercase tracking-wide sm:text-[46px] sm:leading-none">İş yeriniz mi var?</div>
            <div className="mt-3 text-sm font-light uppercase tracking-wide sm:text-xl">
              <span className="mr-2 text-[#ec1c23]">›››</span>Bize ulaşın, işletmenize özel fiyat teklifi alın!
            </div>
          </div>
          <div className="m-1.5 flex items-center gap-4 bg-white px-7 py-5 text-[#14315c]">
            <ClipboardList size={54} strokeWidth={1.2} className="hidden sm:block" />
            <div className="text-xl font-light leading-tight sm:text-2xl">
              Toptan ve perakende
              <br />
              <span className="text-[#ec1c23]">Kurumsal Tedarik</span>
              <br />
              <span className="text-[#ec1c23]">Hizmeti veriyoruz!</span>
            </div>
          </div>
        </Link>
      </section>

      <section className={`${STORE_WRAP} mt-10`}>
        <StoreSectionHead title="Sizin İçin Seçtiklerimiz" />
        <ProductGrid products={PICKS} />
      </section>

      <section className={`${STORE_WRAP} mt-10 grid gap-5 md:grid-cols-3`}>
        {BANNERS.map((c) => (
          <Link key={c.slug} href={listHref({ kategori: c.slug })} className="group flex min-h-[230px] flex-col justify-between overflow-hidden rounded-md p-6" style={{ backgroundColor: c.tint, color: c.ink }}>
            <c.icon size={64} strokeWidth={1.2} className="transition group-hover:scale-110" />
            <div>
              <div className="text-xl font-bold leading-tight">{BANNER_TEXT[c.slug]}</div>
              <div className="mt-2 text-sm font-bold underline-offset-2 group-hover:underline">{CATEGORY_COUNTS[c.slug]} ürünü incele ›</div>
            </div>
          </Link>
        ))}
      </section>

      <section className={`${STORE_WRAP} mt-10`}>
        <StoreSectionHead title="Markalar" href="/magaza/markalar" linkLabel="Tüm markalar" />
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
          {STORE_BRANDS.slice(0, 20).map((b) => (
            <Link key={b.slug} href={listHref({ marka: b.slug })} className="flex h-[86px] w-[150px] shrink-0 flex-col items-center justify-center rounded-md bg-white px-2 text-center transition hover:text-[#ec1c23]">
              <span className="text-base font-bold text-[#1e1e1e]">{b.name}</span>
              <span className="text-[11px] text-[#7f7f7f]">{b.count} ürün</span>
            </Link>
          ))}
        </div>
      </section>

      <section className={`${STORE_WRAP} mt-10`}>
        <div className="space-y-1.5">
          {FAQ.map((q, i) => (
            <details key={q.q} open={i === 0} className="group rounded border border-[#e1e1e1] bg-white">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-3.5 text-[15px] text-[#1e1e1e] group-open:text-[#ec1c23] [&::-webkit-details-marker]:hidden">
                {q.q} <ChevronDown size={17} className="shrink-0 text-[#6f6f6f] transition group-open:rotate-180" />
              </summary>
              <p className="border-t border-[#eeeeee] px-5 py-4 text-sm leading-6 text-[#555555]">{q.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className={`${STORE_WRAP} mt-10`}>
        <h1 className="text-[23px] font-bold leading-tight text-[#1e1e1e]">Ren Endüstriyel: İşletmenizin Temizlik ve Hijyen İhtiyacında Çözüm Ortağı</h1>
        <p className="mt-3 text-sm leading-6 text-[#555555]">
          Susurluk / Balıkesir merkezli Ren Endüstriyel; restoran, otel, okul, fabrika ve ofis gibi işletmelerin temizlikten ambalaja hijyen ve sarf ihtiyaçlarını toptan ve perakende olarak karşılar. Mağazamızda {PRODUCTS.length} ürün ve {STORE_BRANDS.length} marka arasından seçim
          yapabilirsiniz.
        </p>
        <details className="group mt-2">
          <summary className="cursor-pointer list-none text-[15px] font-bold text-[#ec1c23] [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">Devamını Göster ›</span>
            <span className="hidden group-open:inline">Devamını Gizle ‹</span>
          </summary>
          <div className="mt-3 text-sm leading-6 text-[#555555]">
            <h3 className="text-lg font-bold text-[#1e1e1e]">Ürün Kategorileri</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {STORE_CATEGORIES.map((c) => (
                <li key={c.slug}>
                  <Link href={listHref({ kategori: c.slug })} className="font-bold text-[#333333] hover:text-[#ec1c23]">
                    {c.title}
                  </Link>{" "}
                  — {CATEGORY_COUNTS[c.slug]} ürün
                </li>
              ))}
            </ul>
            <p className="mt-3">Fiyatı görünmeyen ürünler için sepetinize ekleyerek teklif isteyebilir, toplu alımlarda kurumunuza özel fiyat alabilirsiniz.</p>
          </div>
        </details>
      </section>
    </>
  );
}
