import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { HeroSlider, type HeroSlide } from "@/components/store/hero-slider";
import { ProductCarousel } from "@/components/store/product-carousel";
import {
  FEATURED,
  PRODUCTS,
  STORE_BRANDS,
} from "@/components/store/store-data";
import { STORE_CATEGORIES, listHref } from "@/components/store/store-shared";
import {
  ProductGrid,
  STORE_WRAP,
  StoreSectionHead,
} from "@/components/store/store-ui";

export const metadata: Metadata = {
  alternates: { canonical: "/magaza" },
};

const SLIDES: HeroSlide[] = [
  {
    kicker: "İşletmeniz İçin",
    title: "Toptan Hijyen Tedariki",
    bullets: [
      "Temizlik Kimyasalları",
      "Kağıt Ürünleri",
      "Çöp Poşetleri",
      "Temizlik Ekipmanları",
      "Tek Kullanımlık Ürünler",
      "Sıvı Sabun ve Dispenser",
    ],
    cta: "Alışverişe başla",
    href: "/magaza/urunler",
    bg: "#14315c",
    images: [
      {
        src: "/urun-resimleri/domestos-pro-camasir-suyu-5l.png",
        alt: "Domestos Professional Çamaşır Suyu 5 L",
      },
      {
        src: "/urun-resimleri/cif-pro-bulasik-deterjani-1420ml.png",
        alt: "Cif Professional Bulaşık Deterjanı",
      },
      {
        src: "/urun-resimleri/yumos-pro-tekstil-parfumu-750ml.png",
        alt: "Yumoş Professional Tekstil Parfümü",
      },
    ],
  },
  {
    kicker: "Kurumlar İçin",
    title: "Kağıt ve Dispenser Grubu",
    bullets: [
      "Z Katlı Havlu",
      "Sensörlü Havlu",
      "İçten Çekmeli Tuvalet Kağıdı",
      "Dispenser Peçete",
      "Havluluk ve Aparatlar",
    ],
    cta: "Kağıt ürünlerini incele",
    href: listHref({ kategori: "kagit" }),
    bg: "#2d1b7e",
    cats: ["kagit", "sabun", "poset"],
  },
  {
    kicker: "Yoğun Kullanım İçin",
    title: "5 ve 20 kg Ekonomik Boylar",
    bullets: [
      "Yüzey Temizleyici",
      "Bulaşık Deterjanı",
      "Sıvı El Sabunu",
      "Çamaşır Suyu",
      "Yağ ve Kireç Çözücü",
    ],
    cta: "Büyük boyları gör",
    href: listHref({ q: "20 kg" }),
    bg: "#0f4c5c",
    cats: ["yuzey", "bulasik", "camasir-suyu"],
  },
];

/** Her kategoriden iki ürün: karma seçki */
const PICKS = STORE_CATEGORIES.flatMap((c) => {
  const list = PRODUCTS.filter((p) => p.cat === c.slug && !p.image);
  return [
    ...list.filter((p) => p.brand),
    ...list.filter((p) => !p.brand),
  ].slice(0, 2);
}).slice(0, 10);

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
        <Link
          href="/iletisim#teklif"
          className="grid items-stretch bg-[#14315c] text-white md:grid-cols-[1fr_auto]"
        >
          <div className="px-6 py-7 sm:px-8">
            <div className="text-3xl font-light uppercase tracking-wide sm:text-[46px] sm:leading-none">
              İş yeriniz mi var?
            </div>
            <div className="mt-3 text-sm font-light uppercase tracking-wide sm:text-xl">
              <span className="mr-2 text-[#ec1c23]">›››</span>Bize ulaşın,
              işletmenize özel fiyat teklifi alın!
            </div>
          </div>
          <div className="m-1.5 flex items-center gap-4 bg-white px-7 py-5 text-[#14315c]">
            <ClipboardList
              size={54}
              strokeWidth={1.2}
              className="hidden sm:block"
            />
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

      <section className={`${STORE_WRAP} mt-10`}>
        <StoreSectionHead
          title="Markalar"
          href="/magaza/markalar"
          linkLabel="Tüm markalar"
        />
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
          {STORE_BRANDS.slice(0, 20).map((b) => (
            <Link
              key={b.slug}
              href={listHref({ marka: b.slug })}
              className="flex h-[86px] w-[150px] shrink-0 flex-col items-center justify-center rounded-md bg-white px-2 text-center transition hover:text-[#ec1c23]"
            >
              <span className="text-base font-bold text-[#1e1e1e]">
                {b.name}
              </span>
              <span className="text-[11px] text-[#7f7f7f]">{b.count} ürün</span>
            </Link>
          ))}
        </div>
      </section>

      <section className={`${STORE_WRAP} mt-10`}>
        <h1 className="text-[23px] font-bold leading-tight text-[#1e1e1e]">
          Ren Endüstriyel: İşletmenizin Temizlik ve Hijyen İhtiyacında Çözüm
          Ortağı
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#555555]">
          Susurluk / Balıkesir merkezli Ren Endüstriyel; restoran, otel, okul,
          fabrika ve ofis gibi işletmelerin temizlikten ambalaja hijyen ve sarf
          ihtiyaçlarını toptan ve perakende olarak karşılar. Mağazamızda{" "}
          {PRODUCTS.length} ürün ve {STORE_BRANDS.length} marka arasından seçim
          yapabilirsiniz.
        </p>
      </section>
    </>
  );
}
