import type { Metadata } from "next";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { PageHero } from "@/components/site/site-ui";
import { CONTACT, WA_LINK } from "@/components/site/site-data";
import { QuoteForm } from "@/components/landing/landing-parts";

export const metadata: Metadata = {
  title: "İletişim ve Teklif",
  description: `Ren Endüstriyel iletişim: ${CONTACT.address}, ${CONTACT.city}. Telefon ${CONTACT.phone}, e-posta ${CONTACT.email}. Kurumunuza özel teklif alın.`,
  alternates: { canonical: "/iletisim" },
};

export default function IletisimPage() {
  const rows = [
    { icon: MapPin, label: "Adres", value: `${CONTACT.address}, ${CONTACT.city}`, href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CONTACT.mapQuery)}`, ext: true },
    { icon: Phone, label: "Telefon", value: CONTACT.phone, href: `tel:${CONTACT.tel}` },
    { icon: MessageCircle, label: "WhatsApp", value: CONTACT.phone, href: WA_LINK(), ext: true },
    { icon: Mail, label: "E-posta", value: CONTACT.email, href: `mailto:${CONTACT.email}` },
  ];
  return (
    <>
      <PageHero title="İletişim ve Teklif" text="İhtiyaç listenizi gönderin; kurumunuza özel fiyat ve teslimat planıyla en kısa sürede dönüş yapalım." crumbs={[{ label: "İletişim" }]} />

      <section className="py-14 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-3">
            {rows.map((r) => (
              <a
                key={r.label}
                href={r.href}
                {...(r.ext ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="flex items-center gap-4 rounded-2xl border border-slate-200 p-5 transition hover:border-[#0e9f9a]/50 hover:shadow-md"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0b2559] text-white">
                  <r.icon size={21} />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-bold uppercase tracking-wide text-slate-500">{r.label}</span>
                  <span className="block break-words font-bold text-[#0b2559]">{r.value}</span>
                </span>
              </a>
            ))}
            <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0e9f9a] text-white">
                <Clock size={21} />
              </span>
              <span className="text-sm text-slate-600">Mesai saatleri dışında gönderdiğiniz talepler ilk iş gününde yanıtlanır.</span>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <iframe
                title="Ren Endüstriyel konum"
                src={`https://www.google.com/maps?q=${encodeURIComponent(CONTACT.mapQuery)}&output=embed`}
                className="h-72 w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>

          <div id="teklif" className="scroll-mt-32 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-9">
            <h2 className="text-2xl font-extrabold text-[#0b2559]">Teklif formu</h2>
            <p className="mb-6 mt-1.5 text-sm text-slate-600">Bilgilerinizi ve ihtiyaç listenizi yazın, en kısa sürede dönüş yapalım.</p>
            <QuoteForm />
          </div>
        </div>
      </section>
    </>
  );
}
