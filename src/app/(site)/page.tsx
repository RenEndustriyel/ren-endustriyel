import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, CalendarClock, FileText, Package, ShieldCheck, Truck } from "lucide-react";
import { CtaBand, SectionTitle } from "@/components/site/site-ui";
import { BRAND_LOGOS, BRANDS, CONTACT, POSTS, PRODUCT_GROUPS, SECTORS } from "@/components/site/site-data";

export const metadata: Metadata = {
  title: { absolute: "Ren Endüstriyel · Toptan Temizlik, Hijyen ve Kağıt Ürünleri · Susurluk / Balıkesir" },
  description:
    "Ren Endüstriyel; fabrika, okul, hastane, otel, restoran ve tüm kurumlara toptan ve perakende çamaşır suyu, deterjan, sıvı sabun, endüstriyel çöp poşeti ve kağıt havlu, peçete, tuvalet kağıdı tedarik eder.",
  alternates: { canonical: "/" },
};

const WHY = [
  { icon: Package, title: "Toptan fiyat avantajı", text: "Koli ve palet alımlarında kurumunuza özel fiyatlandırma." },
  { icon: Truck, title: "Planlı teslimat", text: "Siparişleriniz belirlenen gün ve saatte adresinize." },
  { icon: FileText, title: "Faturalı, cari hesaplı çalışma", text: "Kurumlara cari hesap ve vadeli ödeme seçenekleri." },
  { icon: CalendarClock, title: "Aylık tedarik planı", text: "Tüketiminizi birlikte çıkaralım, stoğunuz hiç bitmesin." },
  { icon: ShieldCheck, title: "Tanınmış markalar", text: "Sektörün güvenilir markaları tek tedarikçide." },
  { icon: BadgeCheck, title: "Perakende satış", text: "Ev ve küçük işletmeler için adet bazında satış." },
];

const STEPS = [
  { n: "01", title: "İhtiyacınızı iletin", text: "Ürün listenizi form, e-posta veya WhatsApp ile gönderin." },
  { n: "02", title: "Teklifinizi alın", text: "Miktara ve teslimat düzenine göre size özel fiyat hazırlayalım." },
  { n: "03", title: "Teslimatı planlayalım", text: "Siparişiniz faturalı olarak adresinize teslim edilsin." },
];

const PRODUCT_SPOTLIGHTS = [
  { image: "/urun-resimleri/domestos-pro-camasir-suyu-5l.png", name: "Domestos Professional", group: "Endüstriyel hijyen" },
  { image: "/urun-resimleri/cif-pro-bulasik-deterjani-1420ml.png", name: "Cif Professional", group: "Mutfak çözümleri" },
  { image: "/urun-resimleri/omo-pro-toz-deterjan.png", name: "Omo Professional", group: "Çamaşır grubu" },
];

export default function HomePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: "Ren Endüstriyel",
    url: "https://renendustriyel.com.tr",
    telephone: CONTACT.tel,
    email: CONTACT.email,
    image: "https://renendustriyel.com.tr/images/ren-logo-3d.png",
    foundingDate: String(CONTACT.founded),
    address: { "@type": "PostalAddress", streetAddress: CONTACT.address, addressLocality: "Susurluk", addressRegion: "Balıkesir", addressCountry: "TR" },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="overflow-hidden bg-[#f4f5ef] text-[#202c26]">
        <div className="mx-auto grid max-w-[1380px] items-center gap-10 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12 lg:py-24">
          <div className="relative z-10">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9c4f38]">
              Temizlik · Hijyen · Kağıt ürünleri
            </p>
            <h1 className="mt-6 max-w-[660px] text-[42px] font-semibold leading-[1.08] sm:text-6xl lg:text-[68px]">
              Kurumların hijyen tedariki
              <span className="mt-2 block font-serif font-normal italic text-[#2e684b]">düzenli ilerlesin.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-[#5c665f] sm:text-lg sm:leading-8">
              Temizlik kimyasalları, kağıt ürünleri ve endüstriyel sarfları; işletmenizin kullanım düzenine ve teslimat planına göre tek noktadan tedarik ediyoruz.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/iletisim#teklif" className="inline-flex min-h-12 items-center gap-2 rounded-md bg-[#244e39] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#183d2c]">
                Kurumunuza özel teklif <ArrowRight size={17} />
              </Link>
              <Link href="/urun-gruplari" className="inline-flex min-h-12 items-center gap-2 rounded-md border border-[#b8c0b8] px-5 py-3 text-sm font-bold text-[#26382e] transition hover:border-[#244e39] hover:bg-white">
                Ürün gruplarını inceleyin
              </Link>
            </div>
            <div className="mt-9 flex flex-wrap gap-x-7 gap-y-3 border-t border-[#d6dbd3] pt-5 text-sm text-[#56635a]">
              <span className="inline-flex items-center gap-2"><BadgeCheck size={17} className="text-[#2e684b]" /> Faturalı satış</span>
              <span className="inline-flex items-center gap-2"><Truck size={17} className="text-[#2e684b]" /> Planlı teslimat</span>
              <span className="inline-flex items-center gap-2"><FileText size={17} className="text-[#2e684b]" /> Toptan ve perakende</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            {PRODUCT_SPOTLIGHTS.map((product, index) => (
              <div key={product.name} className={`min-w-0 border-b-2 border-[#d6b94d] bg-white ${index === 0 ? "col-span-2 sm:col-span-1" : ""}`}>
                <div className="relative h-48 sm:h-64">
                  <Image src={product.image} alt={product.name} fill priority={index === 0} sizes="(max-width: 640px) 45vw, 240px" className="object-contain p-3" />
                </div>
                <div className="px-3 pb-4 sm:px-4">
                  <div className="text-xs font-bold text-[#293a30] sm:text-sm">{product.name}</div>
                  <div className="mt-1 text-[11px] text-[#778078]">{product.group}</div>
                </div>
              </div>
            ))}
            <div className="col-span-2 flex items-center justify-between gap-4 border-t border-[#cdd3ca] py-3 text-xs text-[#647067] sm:col-span-3">
              <span>Güvenilir markalar, kurumsal kullanım için doğru ürün seçimi.</span>
              <span className="shrink-0 font-bold text-[#244e39]">{BRANDS.length}+ marka</span>
            </div>
          </div>
        </div>
      </section>

      {/* GÜVEN ŞERİDİ */}
      <section className="border-y border-[#e2e5df] bg-white">
        <div className="mx-auto grid max-w-[1380px] grid-cols-2 divide-y divide-[#e2e5df] px-5 sm:px-8 md:grid-cols-4 md:divide-x md:divide-y-0">
          {[
            ["Toptan & perakende", "Kurumlara ve bireylere"],
            ["Faturalı satış", "Cari hesap, vadeli ödeme"],
            ["Planlı teslimat", "Düzenli tedarik"],
            ["Hızlı teklif", "WhatsApp ve e-posta"],
          ].map(([t, s]) => (
            <div key={t} className="px-3 py-5 text-center md:px-6 md:py-7">
              <div className="font-bold text-[#293a30]">{t}</div>
              <div className="mt-0.5 text-sm text-[#6f7971]">{s}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ÜRÜN GRUPLARI */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-[1380px] px-5 sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <SectionTitle align="left" kicker="Ürün grupları" title="İhtiyacınız olan her şey tek tedarikçide" text="Temizlik kimyasallarından kağıt ürünlerine kadar kurumların tüm hijyen ihtiyacı." />
            <Link href="/urun-gruplari" className="inline-flex shrink-0 items-center gap-2 border-b border-[#2e684b] pb-1 text-sm font-bold text-[#2e684b]">
              Tüm ürün grupları <ArrowRight size={16} />
            </Link>
          </div>
          <div className="mt-9 grid gap-x-10 sm:grid-cols-2 lg:grid-cols-4">
            {PRODUCT_GROUPS.map((p) => (
              <Link
                key={p.slug}
                href={`/urun-gruplari#${p.slug}`}
                className="group flex min-h-28 items-start gap-4 border-t border-[#dfe4dd] py-5"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-[#edf2eb] text-[#2e684b] transition group-hover:bg-[#dce8da]">
                  <p.icon size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-[#293a30]">{p.title}</h3>
                  <p className="mt-1 text-sm leading-5 text-[#727c74]">{p.text}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* SEKTÖRLER */}
      <section className="bg-[#253b30] py-16 text-white sm:py-20">
        <div className="mx-auto max-w-[1380px] px-5 sm:px-8">
          <SectionTitle dark kicker="Sektörel çözümler" title="Her sektörün ihtiyacı farklı" text="Kurumunuzun çalışma düzenine uygun ürün ve teslimat planı hazırlıyoruz." />
          <div className="mt-10 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-4">
            {SECTORS.map((s) => (
              <Link key={s.slug} href={`/sektorler/${s.slug}`} className="group border-t border-white/20 py-5">
                <s.icon size={24} className="text-[#e1c85b]" />
                <h3 className="mt-4 font-bold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/70">{s.short}</p>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#e1c85b]">
                  İncele <ArrowRight size={14} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* NEDEN REN */}
      <section className="bg-[#f2f4ef] py-16 sm:py-20">
        <div className="mx-auto grid max-w-[1380px] gap-10 px-5 sm:px-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <SectionTitle align="left" kicker="Neden Ren Endüstriyel" title="Kurumsal tedarikte kolaylık ve süreklilik" text="Doğru ürün, doğru fiyat ve zamanında teslimat. Satın alma sürecinizi sadeleştirir, stok takibini sizin yerinize düşünürüz." />
            <div className="mt-8 space-y-5">
              {STEPS.map((s) => (
                <div key={s.n} className="flex gap-4 border-t border-[#d8ded5] pt-4">
                  <span className="font-serif text-2xl italic text-[#9c4f38]">{s.n}</span>
                  <div>
                    <div className="font-bold text-[#0b2559]">{s.title}</div>
                    <div className="text-sm text-slate-600">{s.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-x-8 sm:grid-cols-2">
            {WHY.map((w) => (
              <div key={w.title} className="border-t border-[#cfd7ce] py-5">
                <w.icon size={22} className="text-[#2e684b]" />
                <h3 className="mt-3 font-bold text-[#293a30]">{w.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-[#6d776f]">{w.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MARKALAR */}
      <section className="border-y border-[#e2e5df] bg-white py-12 sm:py-14">
        <div className="mx-auto max-w-[1380px] px-5 sm:px-8">
          <SectionTitle kicker="Markalar" title="Güvendiğiniz markalar stoğumuzda" />
          <div className="mt-8 grid grid-cols-2 gap-x-5 border-t border-[#dfe4dd] sm:grid-cols-4 lg:grid-cols-6">
            {BRANDS.map((b) => (
              <span key={b} className="flex items-center gap-3 border-b border-[#dfe4dd] py-4 text-sm font-bold text-[#4f5b52]">
                {BRAND_LOGOS[b] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={BRAND_LOGOS[b]} alt={`${b} logosu`} loading="lazy" className="h-10 w-14 shrink-0 object-contain" />
                ) : (
                  <span aria-hidden className="h-10 w-14 shrink-0" />
                )}
                {b.toLocaleUpperCase("tr-TR")}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* HİJYEN REHBERİ */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-[1380px] px-5 sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <SectionTitle align="left" kicker="Hijyen rehberi" title="Temizlikte bilinmesi gerekenler" />
            <Link href="/blog" className="inline-flex shrink-0 items-center gap-2 border-b border-[#2e684b] pb-1 text-sm font-bold text-[#2e684b]">
              Tüm yazılar <ArrowRight size={16} />
            </Link>
          </div>
          <div className="mt-8 grid gap-x-8 md:grid-cols-3">
            {POSTS.slice(0, 3).map((p) => (
              <Link key={p.slug} href={`/blog/${p.slug}`} className="group border-t border-[#dfe4dd] py-5">
                <span className="text-xs font-bold text-[#9c4f38]">{p.readMin} dk okuma</span>
                <h3 className="mt-3 text-lg font-bold leading-6 text-[#293a30] group-hover:text-[#2e684b]">{p.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#6d776f]">{p.summary}</p>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#2e684b]">
                  Yazıyı okuyun <ArrowRight size={15} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <CtaBand />

    </>
  );
}
