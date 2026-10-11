import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronRight, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { CONTACT, NAV, PRODUCT_GROUPS, WA_LINK } from "./site-data";

/** Bölüm başlığı */
export function SectionTitle({ kicker, title, text, dark, align = "center" }: { kicker: string; title: string; text?: string; dark?: boolean; align?: "center" | "left" }) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <p className={`text-xs font-extrabold uppercase tracking-[0.2em] ${dark ? "text-[#5eead4]" : "text-[#0e9f9a]"}`}>{kicker}</p>
      <h2 className={`mt-2 text-2xl font-extrabold tracking-tight sm:text-[34px] sm:leading-tight ${dark ? "text-white" : "text-[#0b2559]"}`}>{title}</h2>
      {text && <p className={`mt-3 text-[15px] leading-relaxed sm:text-base ${dark ? "text-white/75" : "text-slate-600"}`}>{text}</p>}
    </div>
  );
}

/** İç sayfa başlık bandı (breadcrumb ile) */
export function PageHero({ title, text, crumbs }: { title: string; text?: string; crumbs: { href?: string; label: string }[] }) {
  return (
    <section className="relative overflow-hidden bg-[#0b2559] text-white">
      <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#0e9f9a]/30 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-40 w-96 rounded-full bg-[#1d4ed8]/30 blur-3xl" />
      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <nav className="mb-4 flex flex-wrap items-center gap-1 text-xs text-white/60" aria-label="Sayfa yolu">
          <Link href="/" className="hover:text-white">
            Ana Sayfa
          </Link>
          {crumbs.map((c) => (
            <span key={c.label} className="inline-flex items-center gap-1">
              <ChevronRight size={12} />
              {c.href ? (
                <Link href={c.href} className="hover:text-white">
                  {c.label}
                </Link>
              ) : (
                <span className="text-white/90">{c.label}</span>
              )}
            </span>
          ))}
        </nav>
        <h1 className="max-w-3xl text-3xl font-extrabold tracking-tight sm:text-[42px] sm:leading-tight">{title}</h1>
        {text && <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg">{text}</p>}
      </div>
    </section>
  );
}

/** Sayfa sonu teklif çağrısı */
export function CtaBand({ title = "Kurumunuza özel teklif alın", text = "İhtiyaç listenizi gönderin; en uygun fiyat ve teslimat planıyla dönüş yapalım." }: { title?: string; text?: string }) {
  return (
    <section className="bg-white py-14 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0b2559] via-[#0f3a7a] to-[#0e9f9a] px-6 py-10 text-white sm:px-12 sm:py-12">
          <div className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-extrabold sm:text-3xl">{title}</h2>
              <p className="mt-2 max-w-xl text-white/80">{text}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/iletisim#teklif" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-bold text-[#0b2559] transition hover:bg-slate-100">
                Teklif İste <ArrowRight size={18} />
              </Link>
              <a href={WA_LINK()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-5 py-3 font-bold transition hover:bg-white/10">
                <MessageCircle size={18} /> WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Alt bilgi */
export function SiteFooter() {
  return (
    <footer className="bg-[#071a40] text-white/75">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="relative h-12 w-12 overflow-hidden rounded-full ring-1 ring-white/20">
              <Image src="/images/ren-logo-3d.png" alt="" fill sizes="48px" className="scale-[1.65] object-cover" />
            </span>
            <div className="font-extrabold tracking-wide text-white">REN ENDÜSTRİYEL</div>
          </div>
          <p className="mt-4 text-sm leading-relaxed">Kurumlara ve işletmelere toptan ve perakende endüstriyel temizlik, hijyen ve kağıt ürünleri tedariki.</p>
        </div>
        <div>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">Kurumsal</h3>
          <ul className="space-y-2 text-sm">
            {NAV.slice(1).map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="hover:text-white">
                  {n.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/katalog" className="hover:text-white">
                Ürün Kataloğu
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">Ürün Grupları</h3>
          <ul className="space-y-2 text-sm">
            {PRODUCT_GROUPS.map((p) => (
              <li key={p.slug}>
                <Link href={`/urun-gruplari#${p.slug}`} className="hover:text-white">
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">İletişim</h3>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-2.5">
              <MapPin size={17} className="mt-0.5 shrink-0 text-[#5eead4]" />
              <span>
                {CONTACT.address}
                <br />
                {CONTACT.city}
              </span>
            </li>
            <li>
              <a href={`tel:${CONTACT.tel}`} className="flex gap-2.5 hover:text-white">
                <Phone size={17} className="shrink-0 text-[#5eead4]" /> {CONTACT.phone}
              </a>
            </li>
            <li>
              <a href={`mailto:${CONTACT.email}`} className="flex gap-2.5 break-all hover:text-white">
                <Mail size={17} className="shrink-0 text-[#5eead4]" /> {CONTACT.email}
              </a>
            </li>
            <li>
              <a href={WA_LINK()} target="_blank" rel="noopener noreferrer" className="flex gap-2.5 hover:text-white">
                <MessageCircle size={17} className="shrink-0 text-[#5eead4]" /> WhatsApp ile yazın
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-white/55 sm:flex-row sm:px-6">
          <span>© {new Date().getFullYear()} Ren Endüstriyel · Tüm hakları saklıdır.</span>
          <span className="flex gap-4">
            <Link href="/yasal" className="hover:text-white">
              KVKK
            </Link>
            <Link href="/giris" className="hover:text-white">
              Müşteri Girişi
            </Link>
          </span>
        </div>
      </div>
    </footer>
  );
}

/** Mobilde sabit hızlı iletişim çubuğu */
export function MobileContactBar() {
  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 gap-2 border-t border-slate-200 bg-white/95 p-2 backdrop-blur sm:hidden">
        <a href={`tel:${CONTACT.tel}`} className="flex items-center justify-center gap-2 rounded-xl bg-[#0b2559] py-3 text-sm font-bold text-white">
          <Phone size={16} /> Ara
        </a>
        <a href={WA_LINK()} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-xl bg-[#0e9f9a] py-3 text-sm font-bold text-white">
          <MessageCircle size={16} /> WhatsApp
        </a>
      </div>
      <div className="h-16 sm:hidden" />
      <a
        href={WA_LINK()}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="WhatsApp ile yazın"
        className="fixed bottom-6 right-6 z-40 hidden h-14 w-14 items-center justify-center rounded-full bg-[#25d366] text-white shadow-xl transition hover:scale-105 sm:flex"
      >
        <MessageCircle size={26} />
      </a>
    </>
  );
}
