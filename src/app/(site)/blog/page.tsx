import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { CtaBand, PageHero } from "@/components/site/site-ui";
import { POSTS, fmtDate } from "@/components/site/site-data";

export const metadata: Metadata = {
  title: "Hijyen Rehberi",
  description: "Kurumlarda temizlik ve hijyen üzerine pratik bilgiler: çamaşır suyu kullanımı, kağıt havlu seçimi, mutfak temizlik planı ve daha fazlası.",
  alternates: { canonical: "/blog" },
};


export default function BlogPage() {
  return (
    <>
      <PageHero title="Hijyen Rehberi" text="Kurumlarda temizlik ve hijyen üzerine pratik bilgiler ve öneriler." crumbs={[{ label: "Hijyen Rehberi" }]} />
      <section className="py-14 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 md:grid-cols-2 lg:grid-cols-3">
          {POSTS.map((p) => (
            <Link key={p.slug} href={`/blog/${p.slug}`} className="group flex flex-col overflow-hidden rounded-3xl border border-slate-200 transition hover:border-[#0e9f9a]/40 hover:shadow-lg">
              <div className="h-2 bg-gradient-to-r from-[#0b2559] to-[#0e9f9a]" />
              <div className="flex flex-1 flex-col p-7">
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>{fmtDate(p.date)}</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock size={12} /> {p.readMin} dk
                  </span>
                </div>
                <h2 className="mt-3 text-xl font-extrabold leading-snug text-[#0b2559] group-hover:text-[#0e9f9a]">{p.title}</h2>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600">{p.summary}</p>
                <span className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-[#0e9f9a]">
                  Devamını oku <ArrowRight size={15} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <CtaBand />
    </>
  );
}
