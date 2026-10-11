import type { Metadata } from "next";
import { Check, MessageCircle } from "lucide-react";
import { CtaBand, PageHero } from "@/components/site/site-ui";
import { PRODUCT_GROUPS, WA_LINK } from "@/components/site/site-data";

export const metadata: Metadata = {
  title: "Ürün Grupları",
  description: "Çamaşır suyu, yüzey temizleyiciler, bulaşık grubu, sıvı el sabunu, çamaşır deterjanı, arap sabunu, endüstriyel çöp poşetleri ve kağıt ürünleri.",
  alternates: { canonical: "/urun-gruplari" },
};

export default function UrunGruplariPage() {
  return (
    <>
      <PageHero title="Ürün Grupları" text="Kurumların ve işletmelerin ihtiyaç duyduğu temizlik, hijyen ve kağıt ürünleri. Fiyat için teklif isteyin." crumbs={[{ label: "Ürünler" }]} />

      <section className="py-14 sm:py-20">
        <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6">
          {PRODUCT_GROUPS.map((p, i) => (
            <article id={p.slug} key={p.slug} className="scroll-mt-32 grid gap-6 rounded-3xl border border-slate-200 p-6 sm:p-8 md:grid-cols-[auto_1fr_auto] md:items-center">
              <div className={`flex h-20 w-20 items-center justify-center rounded-2xl text-white ${i % 2 ? "bg-[#0e9f9a]" : "bg-[#0b2559]"}`}>
                <p.icon size={36} />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-[#0b2559]">{p.title}</h2>
                <p className="mt-1.5 text-slate-600">{p.text}</p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {p.items.map((it) => (
                    <li key={it} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700">
                      <Check size={14} className="text-[#0e9f9a]" /> {it}
                    </li>
                  ))}
                </ul>
              </div>
              <a
                href={WA_LINK(`Merhaba, ${p.title} ürünleri için teklif almak istiyorum.`)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#0b2559] px-5 py-3 text-sm font-bold text-[#0b2559] transition hover:bg-[#0b2559] hover:text-white"
              >
                <MessageCircle size={16} /> Teklif iste
              </a>
            </article>
          ))}
        </div>
      </section>

      <CtaBand />
    </>
  );
}
