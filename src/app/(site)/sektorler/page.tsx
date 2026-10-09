import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CtaBand, PageHero } from "@/components/site/site-ui";
import { SECTORS } from "@/components/site/site-data";

export const metadata: Metadata = {
  title: "Sektörel Çözümler",
  description: "Otel, restoran, hastane, okul, fabrika, ofis, kamu kurumları ve site yönetimleri için temizlik ve hijyen ürünleri tedariki.",
  alternates: { canonical: "/sektorler" },
};

export default function SektorlerPage() {
  return (
    <>
      <PageHero title="Sektörel Çözümler" text="Her sektörün temizlik ihtiyacı farklıdır. Çalışma düzeninize uygun ürün ve teslimat planı hazırlıyoruz." crumbs={[{ label: "Sektörel Çözümler" }]} />
      <section className="py-14 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-5 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          {SECTORS.map((s, i) => (
            <Link key={s.slug} href={`/sektorler/${s.slug}`} className="group flex flex-col rounded-3xl border border-slate-200 p-7 transition hover:-translate-y-1 hover:border-[#0e9f9a]/50 hover:shadow-lg">
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl text-white ${i % 2 ? "bg-[#0e9f9a]" : "bg-[#0b2559]"}`}>
                <s.icon size={26} />
              </div>
              <h2 className="mt-5 text-lg font-extrabold text-[#0b2559]">{s.title}</h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{s.short}</p>
              <span className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-[#0e9f9a]">
                Çözümü incele <ArrowRight size={15} className="transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>
      <CtaBand />
    </>
  );
}
