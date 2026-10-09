import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock, MessageCircle } from "lucide-react";
import { CtaBand, PageHero } from "@/components/site/site-ui";
import { POSTS, WA_LINK, fmtDate } from "@/components/site/site-data";

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = POSTS.find((x) => x.slug === slug);
  if (!p) return {};
  return { title: p.title, description: p.summary, alternates: { canonical: `/blog/${p.slug}` }, openGraph: { type: "article", title: p.title, description: p.summary } };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = POSTS.find((x) => x.slug === slug);
  if (!p) notFound();
  const others = POSTS.filter((x) => x.slug !== p.slug).slice(0, 3);

  return (
    <>
      <PageHero title={p.title} text={p.summary} crumbs={[{ href: "/blog", label: "Hijyen Rehberi" }, { label: p.title }]} />

      <section className="py-12 sm:py-16">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_320px]">
          <article className="max-w-3xl">
            <div className="mb-8 flex items-center gap-4 text-sm text-slate-500">
              <span>{fmtDate(p.date)}</span>
              <span className="inline-flex items-center gap-1">
                <Clock size={14} /> {p.readMin} dk okuma
              </span>
            </div>
            <div className="space-y-5 text-[17px] leading-relaxed text-slate-700">
              {p.body.map((b, i) =>
                b.h ? (
                  <h2 key={i} className="pt-4 text-2xl font-extrabold text-[#0b2559]">
                    {b.h}
                  </h2>
                ) : b.list ? (
                  <ul key={i} className="space-y-2 pl-1">
                    {b.list.map((li) => (
                      <li key={li} className="flex gap-3">
                        <span className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-[#0e9f9a]" />
                        {li}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p key={i}>{b.p}</p>
                ),
              )}
            </div>
            <Link href="/blog" className="mt-10 inline-flex items-center gap-1.5 text-sm font-bold text-[#0e9f9a] hover:underline">
              <ArrowLeft size={15} /> Tüm yazılar
            </Link>
          </article>

          <aside className="space-y-5 lg:sticky lg:top-32 lg:self-start">
            <div className="rounded-2xl bg-[#0b2559] p-6 text-white">
              <h3 className="text-lg font-bold">Ürün mü arıyorsunuz?</h3>
              <p className="mt-2 text-sm text-white/80">Bu yazıda geçen ürünler için hızlıca teklif alın.</p>
              <a
                href={WA_LINK(`Merhaba, "${p.title}" yazınızı okudum, ürünler için bilgi almak istiyorum.`)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0e9f9a] py-3 text-sm font-bold hover:bg-[#0b8783]"
              >
                <MessageCircle size={16} /> WhatsApp ile sorun
              </a>
            </div>
            <div className="rounded-2xl border border-slate-200 p-6">
              <h3 className="font-bold text-[#0b2559]">Diğer yazılar</h3>
              <ul className="mt-3 space-y-3">
                {others.map((o) => (
                  <li key={o.slug}>
                    <Link href={`/blog/${o.slug}`} className="group flex gap-2 text-sm font-semibold text-slate-700 hover:text-[#0e9f9a]">
                      <ArrowRight size={15} className="mt-0.5 shrink-0 text-[#0e9f9a]" /> {o.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
