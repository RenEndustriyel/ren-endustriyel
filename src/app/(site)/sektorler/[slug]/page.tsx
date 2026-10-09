import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, Lightbulb, MessageCircle } from "lucide-react";
import { CtaBand, PageHero } from "@/components/site/site-ui";
import { PRODUCT_GROUPS, SECTORS, WA_LINK } from "@/components/site/site-data";

export function generateStaticParams() {
  return SECTORS.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const s = SECTORS.find((x) => x.slug === slug);
  if (!s) return {};
  return { title: `${s.title} İçin Temizlik ve Hijyen Ürünleri`, description: s.intro, alternates: { canonical: `/sektorler/${s.slug}` } };
}

export default async function SektorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = SECTORS.find((x) => x.slug === slug);
  if (!s) notFound();
  const groups = s.products.map((t) => PRODUCT_GROUPS.find((g) => g.title === t)).filter((g) => !!g);
  const others = SECTORS.filter((x) => x.slug !== s.slug).slice(0, 4);

  return (
    <>
      <PageHero title={`${s.title} için temizlik ve hijyen çözümleri`} text={s.intro} crumbs={[{ href: "/sektorler", label: "Sektörel Çözümler" }, { label: s.title }]} />

      <section className="py-14 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div>
            <h2 className="text-2xl font-extrabold text-[#0b2559]">Alan bazında ihtiyaçlar</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {s.areas.map((a) => (
                <div key={a.title} className="rounded-2xl border border-slate-200 p-5">
                  <h3 className="font-bold text-[#0b2559]">{a.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{a.text}</p>
                </div>
              ))}
            </div>

            <h2 className="mt-12 text-2xl font-extrabold text-[#0b2559]">Önerdiğimiz ürün grupları</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {groups.map((g) => (
                <Link key={g.slug} href={`/urun-gruplari#${g.slug}`} className="flex items-center gap-4 rounded-2xl border border-slate-200 p-4 transition hover:border-[#0e9f9a]/50 hover:shadow-md">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0b2559] text-white">
                    <g.icon size={20} />
                  </span>
                  <span>
                    <span className="block font-bold text-[#0b2559]">{g.title}</span>
                    <span className="block text-xs text-slate-500">{g.items.slice(0, 2).join(" · ")}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl bg-[#0b2559] p-6 text-white">
              <Lightbulb size={26} className="text-[#5eead4]" />
              <h3 className="mt-3 text-lg font-bold">Öneriler</h3>
              <ul className="mt-3 space-y-2.5 text-sm text-white/85">
                {s.tips.map((t) => (
                  <li key={t} className="flex gap-2">
                    <Check size={16} className="mt-0.5 shrink-0 text-[#5eead4]" /> {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-slate-200 p-6">
              <h3 className="font-bold text-[#0b2559]">{s.title} için teklif alın</h3>
              <p className="mt-1.5 text-sm text-slate-600">İhtiyaç listenizi gönderin, size özel fiyat ve teslimat planı hazırlayalım.</p>
              <div className="mt-4 grid gap-2">
                <Link href="/iletisim#teklif" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0e9f9a] py-3 text-sm font-bold text-white hover:bg-[#0b8783]">
                  Teklif formu <ArrowRight size={16} />
                </Link>
                <a
                  href={WA_LINK(`Merhaba, ${s.title} için temizlik ürünleri teklifi almak istiyorum.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 py-3 text-sm font-bold text-[#0b2559] hover:border-[#0b2559]"
                >
                  <MessageCircle size={16} /> WhatsApp
                </a>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="bg-slate-50 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-xl font-extrabold text-[#0b2559]">Diğer sektörler</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {others.map((o) => (
              <Link key={o.slug} href={`/sektorler/${o.slug}`} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 font-bold text-[#0b2559] transition hover:border-[#0e9f9a]/50">
                <o.icon size={22} className="text-[#0e9f9a]" /> {o.title}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
