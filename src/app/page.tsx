import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarClock,
  Droplet,
  Droplets,
  Factory,
  FileText,
  GraduationCap,
  Hand,
  HeartPulse,
  Hotel,
  Landmark,
  Layers,
  Mail,
  MessageCircle,
  Package,
  Phone,
  ScrollText,
  ShoppingBag,
  Sparkles,
  SprayCan,
  Store,
  Trash2,
  Truck,
  Utensils,
  Warehouse,
  Wind,
} from "lucide-react";
import { LandingHeader, QuoteForm } from "@/components/landing/landing-parts";
import { CONTACT } from "@/components/landing/contact";

export const metadata: Metadata = {
  title: { absolute: "Ren Endüstriyel · Toptan ve Perakende Endüstriyel Temizlik ve Kağıt Ürünleri" },
  description:
    "Fabrika, okul, hastane, otel ve tüm kurumlara toptan ve perakende çamaşır suyu, yüzey temizleyici, bulaşık deterjanı, sıvı sabun, endüstriyel çöp poşeti ve kağıt havlu, peçete, tuvalet kağıdı tedariki.",
  keywords: [
    "toptan temizlik ürünleri",
    "endüstriyel temizlik",
    "çamaşır suyu toptan",
    "içten çekmeli havlu",
    "endüstriyel çöp poşeti",
    "kağıt havlu toptan",
    "kurumsal temizlik malzemesi",
  ],
};

const PRODUCTS: { icon: typeof Droplet; title: string; items: string[] }[] = [
  { icon: Droplets, title: "Çamaşır Suyu", items: ["Kıvamlı çamaşır suyu", "Kıvamsız çamaşır suyu", "Ev ve endüstriyel ambalaj"] },
  { icon: SprayCan, title: "Yüzey Temizleyici", items: ["Genel yüzey temizleyici", "Yağ çözücü ve ovma", "Banyo ve mutfak grubu"] },
  { icon: Utensils, title: "Elde Bulaşık Deterjanı", items: ["Elde yıkama deterjanı", "Bulaşık makinesi grubu", "Parlatıcı ve tuz"] },
  { icon: Hand, title: "Sıvı El Sabunu", items: ["Sıvı el sabunu", "Köpük sabun", "Büyük boy bidon"] },
  { icon: Sparkles, title: "Jel & Krem Deterjan", items: ["Jel deterjan", "Krem temizleyici", "Çamaşır grubu"] },
  { icon: Droplet, title: "Arap Sabunu", items: ["Katı arap sabunu", "Sıvı arap sabunu", "Zemin temizliği"] },
  { icon: Trash2, title: "Endüstriyel Çöp Poşetleri", items: ["Jumbo ve battal boy", "Orta ve mini boy", "Kalın endüstriyel tip"] },
  { icon: ScrollText, title: "Kağıt Grupları", items: ["İçten çekmeli havlu (Maxi / Mini)", "Sensörlü havlu", "Garson katlama ve kare peçete", "Tuvalet kağıdı (2-3 katlı)", "Kağıt havlu"] },
];

const BRANDS = [
  "Bingo",
  "Tex",
  "Domestos",
  "Cif",
  "Yumoş",
  "Asperox",
  "Mr. Oxy",
  "Maratem",
  "Aspirix",
  "Sleepy",
  "Familia",
  "Papia",
  "Dolce",
  "Miss",
  "Tampa",
  "Fifty",
  "Dolphin",
  "Haspet",
  "Selpak",
  "Komili",
  "Focus",
  "İlbays",
];

const SECTORS: { icon: typeof Factory; title: string; text: string }[] = [
  { icon: Factory, title: "Fabrikalar", text: "Üretim alanı, yemekhane ve sosyal alanlar için yüksek hacimli tedarik." },
  { icon: GraduationCap, title: "Okullar", text: "Sınıf, koridor, tuvalet ve kantin için hijyen ve kağıt ürünleri." },
  { icon: HeartPulse, title: "Hastane & Sağlık", text: "Klinik, poliklinik ve eczaneler için düzenli sarf malzemesi." },
  { icon: Hotel, title: "Otel & Restoran", text: "Kat hizmetleri, mutfak ve servis için temizlik ve peçete grubu." },
  { icon: Building2, title: "Ofis & Plazalar", text: "Ortak alan, mutfak ve tuvaletler için aylık tedarik planı." },
  { icon: Landmark, title: "Kamu Kurumları", text: "Belediye ve kurumlar için faturalı, düzenli teslimat." },
  { icon: Store, title: "Mağaza & AVM", text: "Satış alanı ve personel alanları için hızlı tedarik." },
  { icon: Warehouse, title: "Site & Apartman", text: "Site yönetimleri için toplu ve ekonomik alım." },
];

const WHY: { icon: typeof Truck; title: string; text: string }[] = [
  { icon: Package, title: "Toptan fiyat avantajı", text: "Koli ve palet alımlarda kuruma özel fiyat." },
  { icon: Layers, title: "Geniş stok", text: "20'den fazla markada temizlik ve kağıt grubu hazır stokta." },
  { icon: Truck, title: "Hızlı teslimat", text: "Siparişleriniz planlı ve zamanında adresinize." },
  { icon: FileText, title: "Kurumsal faturalı satış", text: "Faturalı çalışma, cari hesap ve vadeli ödeme seçenekleri." },
  { icon: CalendarClock, title: "Düzenli tedarik planı", text: "Aylık ihtiyacınızı belirleyelim, stoğunuz hiç bitmesin." },
  { icon: ShoppingBag, title: "Perakende satış", text: "Ev ve küçük işletmeler için de adet bazında satış." },
];

const WA = `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent("Merhaba, ürünleriniz için teklif almak istiyorum.")}`;

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <LandingHeader />

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0a2a5e] via-[#0d3b80] to-[#1565c0] text-white">
        <div className="pointer-events-none absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full bg-[#5cb531]/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-20 h-[380px] w-[380px] rounded-full bg-[#1e88e5]/30 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold ring-1 ring-white/20">
              <BadgeCheck size={14} className="text-[#8fd65f]" /> Toptan ve perakende · Kurumsal tedarik
            </p>
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Endüstriyel temizlik ve kağıt ürünlerinde
              <span className="block text-[#8fd65f]">güvenilir tedarikçiniz</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">
              Fabrikalardan okullara, hastanelerden otellere kadar tüm kurum ve işyerlerine çamaşır suyu, deterjan, sıvı sabun,
              endüstriyel çöp poşeti ve kağıt havlu–peçete–tuvalet kağıdı tedarik ediyoruz.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#teklif" className="inline-flex items-center gap-2 rounded-xl bg-[#5cb531] px-5 py-3 font-bold shadow-lg shadow-black/20 transition hover:bg-[#4ea12a]">
                Teklif İste <ArrowRight size={18} />
              </a>
              <a href={`tel:${CONTACT.tel}`} className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-bold text-[#0d3b80] transition hover:bg-slate-100">
                <Phone size={18} /> {CONTACT.phone}
              </a>
              <a href={WA} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-5 py-3 font-bold transition hover:bg-white/10">
                <MessageCircle size={18} /> WhatsApp
              </a>
            </div>
            <dl className="mt-10 grid max-w-xl grid-cols-3 gap-3 text-center">
              {[
                ["20+", "marka"],
                ["8", "ürün grubu"],
                ["Toptan", "& perakende"],
              ].map(([v, l]) => (
                <div key={l} className="rounded-2xl bg-white/10 px-3 py-3 ring-1 ring-white/15">
                  <dt className="text-xl font-extrabold sm:text-2xl">{v}</dt>
                  <dd className="text-xs text-white/75">{l}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="relative mx-auto aspect-square w-64 sm:w-80 lg:w-[400px]">
            <div className="absolute inset-0 rounded-full bg-white/10 blur-2xl" />
            <div className="relative h-full w-full overflow-hidden rounded-full ring-4 ring-white/20 shadow-2xl">
              <Image src="/images/ren-logo-3d.png" alt="Ren Endüstriyel logosu" fill priority sizes="(max-width: 640px) 256px, 400px" className="scale-[1.3] object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* ÜRÜN GRUPLARI */}
      <section id="urunler" className="scroll-mt-20 bg-slate-50 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionTitle kicker="Ürün grupları" title="İhtiyacınız olan her şey tek tedarikçide" text="Temizlik kimyasallarından kağıt ürünlerine kadar kurumların tüm hijyen ihtiyacı." />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PRODUCTS.map((p) => (
              <article key={p.title} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#1565c0]/40 hover:shadow-md">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#1565c0] to-[#5cb531] text-white">
                  <p.icon size={22} />
                </div>
                <h3 className="text-base font-bold">{p.title}</h3>
                <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
                  {p.items.map((i) => (
                    <li key={i} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#5cb531]" />
                      {i}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/katalog" className="inline-flex items-center gap-2 rounded-xl border border-[#1565c0] px-5 py-2.5 text-sm font-bold text-[#1565c0] transition hover:bg-[#1565c0] hover:text-white">
              Ürün kataloğunu inceleyin <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* MARKALAR */}
      <section id="markalar" className="scroll-mt-20 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionTitle kicker="Markalar" title="Güvendiğiniz markalar stoğumuzda" text="Sektörün tanınmış markalarının temizlik ve kağıt ürünlerini toptan ve perakende sunuyoruz." />
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {BRANDS.map((b) => (
              <div
                key={b}
                className="flex h-16 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-center text-base font-extrabold tracking-wide text-[#0d3b80] shadow-sm transition hover:border-[#5cb531] hover:text-[#3d8a1f]"
              >
                {b.toLocaleUpperCase("tr-TR")}
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-slate-500">Marka adları ilgili sahiplerinin tescilli markalarıdır.</p>
        </div>
      </section>

      {/* SEKTÖRLER */}
      <section id="sektorler" className="scroll-mt-20 bg-[#0a2a5e] py-16 text-white sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionTitle dark kicker="Hizmet verdiğimiz kurumlar" title="Tüm kurum ve işyerlerine tedarik" text="Küçük işletmeden büyük tesislere kadar ihtiyacınıza uygun miktar ve düzende teslimat." />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SECTORS.map((s) => (
              <div key={s.title} className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10 transition hover:bg-white/10">
                <s.icon size={26} className="text-[#8fd65f]" />
                <h3 className="mt-3 font-bold">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/75">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NEDEN REN */}
      <section id="hizmetler" className="scroll-mt-20 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionTitle kicker="Neden Ren Endüstriyel" title="Kurumsal tedarikte kolaylık" text="Doğru ürün, doğru fiyat ve zamanında teslimat." />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {WHY.map((w) => (
              <div key={w.title} className="flex gap-4 rounded-2xl border border-slate-200 p-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#5cb531]/10 text-[#3d8a1f]">
                  <w.icon size={22} />
                </div>
                <div>
                  <h3 className="font-bold">{w.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{w.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TEKLİF + İLETİŞİM */}
      <section id="iletisim" className="scroll-mt-20 bg-slate-50 py-16 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <SectionTitle align="left" kicker="İletişim" title="Kurumunuza özel teklif alın" text="İhtiyaç listenizi gönderin; size en uygun fiyat ve teslimat planıyla dönelim." />
            <div className="mt-8 space-y-3">
              <ContactRow href={`mailto:${CONTACT.email}`} icon={Mail} label="E-posta" value={CONTACT.email} />
              <ContactRow href={`tel:${CONTACT.tel}`} icon={Phone} label="Telefon" value={CONTACT.phone} />
              <ContactRow href={WA} icon={MessageCircle} label="WhatsApp" value={CONTACT.phone} external />
            </div>
            <div className="mt-6 flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
              <Wind size={22} className="shrink-0 text-[#1565c0]" />
              <p className="text-sm text-slate-600">Düzenli alım yapan kurumlara aylık tedarik planı ve cari hesap ile vadeli çalışma imkânı sunuyoruz.</p>
            </div>
          </div>
          <div id="teklif" className="scroll-mt-24 rounded-3xl bg-white p-6 shadow-lg ring-1 ring-slate-200 sm:p-8">
            <h3 className="text-lg font-extrabold">Teklif formu</h3>
            <p className="mb-5 mt-1 text-sm text-slate-600">Bilgilerinizi bırakın, en kısa sürede dönüş yapalım.</p>
            <QuoteForm />
          </div>
        </div>
      </section>

      {/* ALT BİLGİ */}
      <footer className="bg-[#071d42] text-white/80">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="relative h-11 w-11 overflow-hidden rounded-full ring-1 ring-white/20">
              <Image src="/images/ren-logo-3d.png" alt="" fill sizes="44px" className="scale-[1.65] object-cover" />
            </span>
            <div>
              <div className="font-extrabold tracking-wide text-white">REN ENDÜSTRİYEL</div>
              <div className="text-xs">Toptan ve perakende endüstriyel temizlik ve kağıt ürünleri</div>
            </div>
          </div>
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <a href="#urunler" className="hover:text-white">Ürünler</a>
            <a href="#markalar" className="hover:text-white">Markalar</a>
            <a href="#iletisim" className="hover:text-white">İletişim</a>
            <Link href="/katalog" className="hover:text-white">Katalog</Link>
            <Link href="/giris" className="hover:text-white">Müşteri Girişi</Link>
            <Link href="/yasal" className="hover:text-white">KVKK</Link>
          </nav>
        </div>
        <div className="border-t border-white/10 py-4 text-center text-xs text-white/60">© {new Date().getFullYear()} Ren Endüstriyel · {CONTACT.email} · {CONTACT.phone}</div>
      </footer>

      {/* Mobilde sabit hızlı iletişim */}
      <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 gap-2 border-t border-slate-200 bg-white/95 p-2 backdrop-blur sm:hidden">
        <a href={`tel:${CONTACT.tel}`} className="flex items-center justify-center gap-2 rounded-xl bg-[#1565c0] py-3 text-sm font-bold text-white">
          <Phone size={16} /> Ara
        </a>
        <a href={WA} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-xl bg-[#5cb531] py-3 text-sm font-bold text-white">
          <MessageCircle size={16} /> WhatsApp
        </a>
      </div>
      <div className="h-16 sm:hidden" />
    </div>
  );
}

function SectionTitle({ kicker, title, text, dark, align = "center" }: { kicker: string; title: string; text: string; dark?: boolean; align?: "center" | "left" }) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-xl"}>
      <p className={`text-xs font-extrabold uppercase tracking-[0.18em] ${dark ? "text-[#8fd65f]" : "text-[#3d8a1f]"}`}>{kicker}</p>
      <h2 className={`mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl ${dark ? "text-white" : "text-[#0a2a5e]"}`}>{title}</h2>
      <p className={`mt-3 text-sm leading-relaxed sm:text-base ${dark ? "text-white/75" : "text-slate-600"}`}>{text}</p>
    </div>
  );
}

function ContactRow({ href, icon: Icon, label, value, external }: { href: string; icon: typeof Mail; label: string; value: string; external?: boolean }) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="flex items-center gap-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200 transition hover:ring-[#1565c0]/40"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1565c0]/10 text-[#1565c0]">
        <Icon size={20} />
      </span>
      <span>
        <span className="block text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
        <span className="block font-bold text-slate-900">{value}</span>
      </span>
    </a>
  );
}
