import type { Metadata } from "next";
import { Eye, HeartHandshake, Leaf, MapPin, Target, Truck } from "lucide-react";
import { CtaBand, PageHero, SectionTitle } from "@/components/site/site-ui";
import { CONTACT } from "@/components/site/site-data";

export const metadata: Metadata = {
  title: "Kurumsal",
  description: "Ren Endüstriyel hakkında: Susurluk / Balıkesir merkezli, kurumlara ve işletmelere toptan ve perakende temizlik, hijyen ve kağıt ürünleri tedarikçisi.",
  alternates: { canonical: "/kurumsal" },
};

const VALUES = [
  { icon: HeartHandshake, title: "Güven", text: "Verdiğimiz sözü tutar, fiyat ve teslimatta şeffaf çalışırız." },
  { icon: Truck, title: "Süreklilik", text: "Müşterilerimizin stoğunun bitmemesini kendi işimiz sayarız." },
  { icon: Leaf, title: "Doğru ürün", text: "İhtiyaca uygun ürünü önerir, gereksiz tüketimin önüne geçeriz." },
];

export default function KurumsalPage() {
  return (
    <>
      <PageHero title="Hakkımızda" text="Kurumların ve işletmelerin temizlik, hijyen ve kağıt ürünleri ihtiyacını tek noktadan karşılıyoruz." crumbs={[{ label: "Kurumsal" }]} />

      <section className="py-16 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5 text-[17px] leading-relaxed text-slate-700">
            <SectionTitle align="left" kicker="Ren Endüstriyel" title="Temizlik ve hijyende kurumsal çözüm ortağınız" />
            <p>
              Ren Endüstriyel, {CONTACT.founded} yılında Susurluk / Balıkesir&apos;de kuruldu. Fabrikalar, okullar, sağlık kuruluşları, oteller, restoranlar, ofisler ve kamu kurumları başta olmak üzere tüm işletmelere
              temizlik kimyasalları, endüstriyel çöp poşetleri ve kağıt ürünleri tedarik ediyoruz.
            </p>
            <p>
              Sektörün tanınmış markalarını toptan ve perakende olarak sunuyor; müşterilerimizin aylık tüketimine göre düzenli tedarik planı hazırlıyoruz. Faturalı satış, cari hesap ve vadeli ödeme seçenekleriyle
              kurumların satın alma süreçlerini kolaylaştırıyoruz.
            </p>
            <p>Amacımız; doğru ürünü, doğru fiyatla ve zamanında teslim ederek müşterilerimizin temizlik malzemesi konusunda hiç düşünmek zorunda kalmamasını sağlamak.</p>
          </div>
          <aside className="space-y-4">
            <div className="rounded-2xl bg-[#0b2559] p-6 text-white">
              <Target size={28} className="text-[#5eead4]" />
              <h3 className="mt-3 text-lg font-bold">Misyonumuz</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/80">Kurumların hijyen ihtiyacını kesintisiz, ekonomik ve güvenilir şekilde karşılamak.</p>
            </div>
            <div className="rounded-2xl bg-[#0e9f9a] p-6 text-white">
              <Eye size={28} />
              <h3 className="mt-3 text-lg font-bold">Vizyonumuz</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/90">Bölgemizde temizlik ve hijyen ürünleri tedarikinde ilk akla gelen, güvenilir firma olmak.</p>
            </div>
            <div className="flex gap-3 rounded-2xl border border-slate-200 p-6">
              <MapPin size={22} className="shrink-0 text-[#0e9f9a]" />
              <div className="text-sm text-slate-700">
                <div className="font-bold text-[#0b2559]">Adresimiz</div>
                {CONTACT.address}
                <br />
                {CONTACT.city}
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="bg-slate-50 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionTitle kicker="Değerlerimiz" title="Çalışma anlayışımız" />
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {VALUES.map((v) => (
              <div key={v.title} className="rounded-2xl border border-slate-200 bg-white p-7">
                <v.icon size={30} className="text-[#0e9f9a]" />
                <h3 className="mt-4 text-lg font-bold text-[#0b2559]">{v.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{v.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
