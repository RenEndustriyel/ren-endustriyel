import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, CalendarClock, FileText, MapPin, Package, Phone, ShieldCheck, Truck } from "lucide-react";
import { CtaBand, SectionTitle } from "@/components/site/site-ui";
import { BRANDS, CONTACT, POSTS, PRODUCT_GROUPS, SECTORS } from "@/components/site/site-data";

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

      {/* KAPAK */}
      <section className="relative overflow-hidden bg-[#0b2559] text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(14,159,154,0.45),transparent_45%),radial-gradient(circle_at_10%_90%,rgba(29,78,216,0.45),transparent_45%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:48px_48px]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold ring-1 ring-white/20">
              <MapPin size={14} className="text-[#5eead4]" /> Susurluk / Balıkesir · Toptan ve perakende
            </p>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-[56px]">
              Kurumunuzun temizlik ve hijyen ihtiyacı için
              <span className="block bg-gradient-to-r from-[#5eead4] to-[#7dd3fc] bg-clip-text text-transparent">tek ve güvenilir tedarikçi</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/80">
              Fabrikalardan okullara, otellerden hastanelere kadar tüm kurum ve işletmelere temizlik kimyasalları, endüstriyel çöp poşetleri ve kağıt ürünleri sağlıyoruz.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/iletisim#teklif" className="inline-flex items-center gap-2 rounded-xl bg-[#0e9f9a] px-6 py-3.5 font-bold shadow-lg shadow-black/25 transition hover:bg-[#0b8783]">
                Teklif İste <ArrowRight size={18} />
              </Link>
              <Link href="/urun-gruplari" className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 font-bold text-[#0b2559] transition hover:bg-slate-100">
                Ürünlerimiz
              </Link>
              <a href={`tel:${CONTACT.tel}`} className="inline-flex items-center gap-2 rounded-xl border border-white/35 px-5 py-3.5 font-bold transition hover:bg-white/10">
                <Phone size={18} /> {CONTACT.phone}
              </a>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-[300px] sm:max-w-sm">
            <div className="relative aspect-square overflow-hidden rounded-[2rem] shadow-2xl ring-1 ring-white/20">
              <Image src="/images/ren-logo-3d.png" alt="Ren Endüstriyel" fill priority sizes="(max-width: 640px) 300px, 384px" className="scale-[1.25] object-cover" />
            </div>
            <div className="absolute -bottom-6 -left-4 rounded-2xl bg-white px-5 py-4 text-[#0b2559] shadow-xl sm:-left-10">
              <div className="text-2xl font-extrabold">{BRANDS.length}+</div>
              <div className="text-xs font-semibold text-slate-500">güvenilir marka</div>
            </div>
            <div className="absolute -right-3 -top-5 rounded-2xl bg-[#0e9f9a] px-5 py-4 text-white shadow-xl sm:-right-8">
              <div className="text-2xl font-extrabold">{PRODUCT_GROUPS.length}</div>
              <div className="text-xs font-semibold text-white/85">ürün grubu</div>
            </div>
          </div>
        </div>
      </section>

      {/* GÜVEN ŞERİDİ */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-slate-200 px-4 sm:px-6 md:grid-cols-4 md:divide-x">
          {[
            ["Toptan & perakende", "Kurumlara ve bireylere"],
            ["Faturalı satış", "Cari hesap, vadeli ödeme"],
            ["Planlı teslimat", "Düzenli tedarik"],
            ["Hızlı teklif", "WhatsApp ve e-posta"],
          ].map(([t, s]) => (
            <div key={t} className="px-2 py-6 text-center md:px-6">
              <div className="font-extrabold text-[#0b2559]">{t}</div>
              <div className="mt-0.5 text-sm text-slate-500">{s}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ÜRÜN GRUPLARI */}
      <section className="bg-slate-50 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <SectionTitle align="left" kicker="Ürün grupları" title="İhtiyacınız olan her şey tek tedarikçide" text="Temizlik kimyasallarından kağıt ürünlerine kadar kurumların tüm hijyen ihtiyacı." />
            <Link href="/urun-gruplari" className="inline-flex shrink-0 items-center gap-1.5 text-sm font-bold text-[#0e9f9a] hover:underline">
              Tüm ürün grupları <ArrowRight size={16} />
            </Link>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PRODUCT_GROUPS.map((p) => (
              <Link
                key={p.slug}
                href={`/urun-gruplari#${p.slug}`}
                className="group rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:border-[#0e9f9a]/50 hover:shadow-lg"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0b2559] text-white transition group-hover:bg-[#0e9f9a]">
                  <p.icon size={22} />
                </div>
                <h3 className="mt-5 text-lg font-bold text-[#0b2559]">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{p.text}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* SEKTÖRLER */}
      <section className="bg-[#0b2559] py-16 text-white sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionTitle dark kicker="Sektörel çözümler" title="Her sektörün ihtiyacı farklı" text="Kurumunuzun çalışma düzenine uygun ürün ve teslimat planı hazırlıyoruz." />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SECTORS.map((s) => (
              <Link key={s.slug} href={`/sektorler/${s.slug}`} className="group rounded-2xl bg-white/[0.06] p-6 ring-1 ring-white/10 transition hover:bg-white/[0.12]">
                <s.icon size={28} className="text-[#5eead4]" />
                <h3 className="mt-4 font-bold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/70">{s.short}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#5eead4] opacity-80 group-hover:opacity-100">
                  İncele <ArrowRight size={14} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* NEDEN REN */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <SectionTitle align="left" kicker="Neden Ren Endüstriyel" title="Kurumsal tedarikte kolaylık ve süreklilik" text="Doğru ürün, doğru fiyat ve zamanında teslimat. Satın alma sürecinizi sadeleştirir, stok takibini sizin yerinize düşünürüz." />
            <div className="mt-8 space-y-4">
              {STEPS.map((s) => (
                <div key={s.n} className="flex gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0e9f9a]/10 text-sm font-extrabold text-[#0e9f9a]">{s.n}</span>
                  <div>
                    <div className="font-bold text-[#0b2559]">{s.title}</div>
                    <div className="text-sm text-slate-600">{s.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {WHY.map((w) => (
              <div key={w.title} className="rounded-2xl border border-slate-200 p-6 transition hover:border-[#0e9f9a]/40 hover:shadow-md">
                <w.icon size={26} className="text-[#0e9f9a]" />
                <h3 className="mt-4 font-bold text-[#0b2559]">{w.title}</h3>
                <p className="mt-1.5 text-sm text-slate-600">{w.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MARKALAR */}
      <section className="border-y border-slate-200 bg-slate-50 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionTitle kicker="Markalar" title="Güvendiğiniz markalar stoğumuzda" />
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {BRANDS.map((b) => (
              <span key={b} className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-extrabold tracking-wide text-[#0b2559]">
                {b.toLocaleUpperCase("tr-TR")}
              </span>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/markalar" className="inline-flex items-center gap-1.5 text-sm font-bold text-[#0e9f9a] hover:underline">
              Markalarımız <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* HİJYEN REHBERİ */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <SectionTitle align="left" kicker="Hijyen rehberi" title="Temizlikte bilinmesi gerekenler" />
            <Link href="/blog" className="inline-flex shrink-0 items-center gap-1.5 text-sm font-bold text-[#0e9f9a] hover:underline">
              Tüm yazılar <ArrowRight size={16} />
            </Link>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {POSTS.slice(0, 3).map((p) => (
              <Link key={p.slug} href={`/blog/${p.slug}`} className="group flex flex-col rounded-2xl border border-slate-200 p-6 transition hover:border-[#0e9f9a]/40 hover:shadow-lg">
                <span className="text-xs font-semibold text-[#0e9f9a]">{p.readMin} dk okuma</span>
                <h3 className="mt-2 text-lg font-bold leading-snug text-[#0b2559] group-hover:text-[#0e9f9a]">{p.title}</h3>
                <p className="mt-2 flex-1 text-sm text-slate-600">{p.summary}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[#0b2559]">
                  Devamını oku <ArrowRight size={14} />
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
