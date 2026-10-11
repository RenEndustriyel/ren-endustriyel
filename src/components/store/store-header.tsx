"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronRight, Heart, Home, LayoutGrid, Menu, Phone, Search, ShoppingCart, X } from "lucide-react";
import { SiteWordmark } from "@/components/site/site-ui";
import { usePreviewAdmin } from "./preview-admin";
import { CONTACT, STORE_CATEGORIES, STORE_GROUPS, STORE_PREVIEW, categoryOf, listHref } from "./store-shared";
import { cartSummary, useStore } from "./store-state";

const WRAP = "mx-auto max-w-[1240px] px-4";

function SearchBox({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  return (
    <form
      role="search"
      className={`flex h-12 items-stretch overflow-hidden rounded border-2 border-[#2d1b7e] bg-white ${className}`}
      onSubmit={(e) => {
        e.preventDefault();
        router.push(listHref({ q: q.trim() }));
      }}
    >
      <span className="grid w-11 shrink-0 place-items-center text-[#b9b9b9]">
        <Search size={19} />
      </span>
      <input value={q} onChange={(e) => setQ(e.target.value)} type="search" name="q" aria-label="Ürün ara" placeholder="Ne aramıştınız?" className="min-w-0 flex-1 bg-transparent pr-2 text-[15px] font-semibold text-[#1e1e1e] outline-none placeholder:font-bold placeholder:text-[#555555]" />
      <button type="submit" className="bg-[#2d1b7e] px-5 text-base font-bold text-white transition hover:bg-[#21135f]">
        ARA
      </button>
    </form>
  );
}

/** Mağaza üst bölümü: mor bilgi şeridi, arama, sepet, kategori menüsü ve mobil alt çubuk */
export function StoreHeader() {
  const pathname = usePathname();
  const { cart, favs } = useStore();
  const { count } = cartSummary(cart);
  const { announcement } = usePreviewAdmin().settings;
  const [drawer, setDrawer] = React.useState(false);
  React.useEffect(() => setDrawer(false), [pathname]); // eslint-disable-line react-hooks/set-state-in-effect

  const tab = (href: string) => (href === "/magaza" ? pathname === "/magaza" : pathname.startsWith(href));
  const topLink = "font-bold text-white hover:underline";
  const navLink = "flex h-full items-center px-3.5 text-base font-bold text-black transition hover:text-[#ec1c23]";

  return (
    <>
      {STORE_PREVIEW && announcement && <div className="bg-[#ffd23f] px-4 py-1.5 text-center text-[11px] font-semibold text-[#3d3200] sm:text-xs">{announcement}</div>}

      <div className="bg-[#2d1b7e] text-[13px] text-white">
        <div className={`${WRAP} flex h-[35px] items-center justify-between gap-4`}>
          <a href={`tel:${CONTACT.tel}`} className="inline-flex shrink-0 items-center gap-1.5 hover:underline">
            <Phone size={13} fill="currentColor" /> {CONTACT.phone}
          </a>
          <span className="hidden truncate md:block">Kurumsal Alışverişin Güvenilir Adresi</span>
          <span className="hidden items-center gap-7 lg:flex">
            <Link href="/iletisim#teklif" className={topLink}>
              Kurumsal Teklif Al
            </Link>
            <Link href="/sektorler" className={topLink}>
              Sektörel Çözümler
            </Link>
            <Link href="/kurumsal" className={topLink}>
              Hakkımızda
            </Link>
            <Link href="/blog" className={topLink}>
              Blog
            </Link>
            <Link href="/iletisim" className={topLink}>
              İletişim
            </Link>
          </span>
          <Link href="/iletisim#teklif" className={`${topLink} lg:hidden`}>
            Kurumsal Teklif Al
          </Link>
        </div>
      </div>

      <header className="sticky top-0 z-40 bg-white">
        <div className={`${WRAP} flex items-center gap-3 py-2.5 lg:gap-5 lg:py-3`}>
          <button type="button" aria-label="Kategoriler menüsü" onClick={() => setDrawer(true)} className="-ml-1 grid size-10 place-items-center rounded text-[#1e1e1e] hover:bg-[#f5f5f5] lg:hidden">
            <Menu size={26} />
          </button>
          <Link href="/magaza" aria-label="Ren Endüstriyel mağaza ana sayfa" className="flex shrink-0 items-center">
            <SiteWordmark />
          </Link>
          <span className="hidden border-l border-[#cfcfcf] pl-4 text-sm text-[#333333] xl:block">Toptan ve perakende satış</span>
          <SearchBox className="hidden flex-1 lg:flex" />
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <Link href="/magaza/favoriler" className="relative flex h-12 items-center gap-2.5 rounded border-2 border-[#2d1b7e] px-2.5 transition hover:bg-[#f4f2fb] lg:px-3.5">
              <Heart size={24} fill="#ec1c23" className="text-[#ec1c23]" />
              <span className="hidden leading-tight lg:block">
                <span className="block text-sm font-bold text-[#1e1e1e]">Favorilerim</span>
                <span className="block text-[10px] text-[#1e1e1e]">{favs.length ? `${favs.length} ürün kayıtlı` : "beğendiğiniz ürünler"}</span>
              </span>
              {favs.length > 0 && <span className="absolute -right-1.5 -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#ec1c23] px-1 text-[10px] font-bold text-white lg:hidden">{favs.length}</span>}
            </Link>
            <Link href="/magaza/sepet" className="relative flex h-12 items-center gap-2 rounded bg-[#ec1c23] px-3 text-base font-bold text-white transition hover:bg-[#c9151b] lg:px-4">
              <span className="relative">
                <ShoppingCart size={23} fill="currentColor" />
                <span className="absolute -right-2 -top-2.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-white px-1 text-[11px] font-bold text-[#1e1e1e]">{count}</span>
              </span>
              <span className="hidden pl-1 lg:block">Sepetim</span>
            </Link>
          </div>
        </div>
        <div className="px-4 pb-2.5 lg:hidden">
          <SearchBox />
        </div>

        <nav className="hidden border-y border-[#e6e6e6] lg:block" aria-label="Kategoriler">
          <div className={`${WRAP} flex h-[54px] items-center`}>
            <Link href="/magaza/urunler" className={navLink}>
              Tüm Ürünler
            </Link>
            {STORE_GROUPS.map((g) => {
              const cats = g.cats.map(categoryOf);
              if (cats.length === 1) {
                return (
                  <Link key={g.title} href={listHref({ kategori: cats[0].slug })} className={navLink}>
                    {g.title}
                  </Link>
                );
              }
              return (
                <div key={g.title} className="group/nav relative h-full">
                  <button type="button" className={`${navLink} group-focus-within/nav:text-[#ec1c23] group-hover/nav:text-[#ec1c23]`}>
                    {g.title}
                  </button>
                  <div className="invisible absolute left-0 top-full z-50 w-72 border border-t-2 border-[#e6e6e6] border-t-[#ec1c23] bg-white py-2 opacity-0 shadow-[0_18px_36px_-14px_rgba(0,0,0,0.35)] transition group-focus-within/nav:visible group-focus-within/nav:opacity-100 group-hover/nav:visible group-hover/nav:opacity-100">
                    {cats.map((c) => (
                      <Link key={c.slug} href={listHref({ kategori: c.slug })} className="flex items-center justify-between px-5 py-2.5 text-[15px] font-semibold text-[#1e1e1e] transition hover:bg-[#f5f5f5] hover:text-[#ec1c23]">
                        {c.title} <ChevronRight size={15} className="text-[#9a9a9a]" />
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
            <Link href="/magaza/markalar" className={navLink}>
              Markalar
            </Link>
          </div>
        </nav>
        <div className="border-b border-[#e6e6e6] lg:hidden" />
      </header>

      {drawer && (
        <div className="fixed inset-0 z-[60] bg-[#111122]/50 lg:hidden" onMouseDown={(e) => e.target === e.currentTarget && setDrawer(false)}>
          <aside className="flex h-full w-[86%] max-w-sm flex-col bg-white" aria-label="Kategoriler">
            <div className="flex items-center justify-between bg-[#2d1b7e] px-4 py-4 text-white">
              <span className="text-base font-bold">Kategoriler</span>
              <button type="button" aria-label="Menüyü kapat" onClick={() => setDrawer(false)} className="grid size-9 place-items-center rounded hover:bg-white/10">
                <X size={22} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <Link href="/magaza/urunler" className="flex items-center justify-between border-b border-[#eeeeee] px-4 py-3.5 text-[15px] font-bold text-[#1e1e1e] active:bg-[#f5f5f5]">
                Tüm Ürünler <ChevronRight size={16} className="text-[#9a9a9a]" />
              </Link>
              {STORE_CATEGORIES.map((c) => (
                <Link key={c.slug} href={listHref({ kategori: c.slug })} className="flex items-center justify-between border-b border-[#eeeeee] px-4 py-3.5 text-[15px] font-semibold text-[#1e1e1e] active:bg-[#f5f5f5]">
                  {c.title} <ChevronRight size={16} className="text-[#9a9a9a]" />
                </Link>
              ))}
              {[
                ["/magaza/markalar", "Markalar"],
                ["/iletisim#teklif", "Kurumsal teklif al"],
                ["/kurumsal", "Hakkımızda"],
                ["/iletisim", "İletişim"],
              ].map(([href, label]) => (
                <Link key={href} href={href} className="block px-4 py-3 text-sm font-semibold text-[#333333] active:bg-[#f5f5f5]">
                  {label}
                </Link>
              ))}
            </div>
            <a href={`tel:${CONTACT.tel}`} className="flex items-center justify-center gap-2 border-t border-[#eeeeee] py-4 text-sm font-bold text-[#2d1b7e]">
              <Phone size={16} /> {CONTACT.phone}
            </a>
          </aside>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-[#e6e6e6] bg-white pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="Hızlı erişim">
        <Link href="/magaza" className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold ${tab("/magaza") ? "text-[#ec1c23]" : "text-[#555555]"}`}>
          <Home size={21} /> Ana Sayfa
        </Link>
        <button type="button" onClick={() => setDrawer(true)} className="flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold text-[#555555]">
          <LayoutGrid size={21} /> Kategoriler
        </button>
        <Link href="/magaza/favoriler" className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold ${tab("/magaza/favoriler") ? "text-[#ec1c23]" : "text-[#555555]"}`}>
          <Heart size={21} /> Favoriler
        </Link>
        <Link href="/magaza/sepet" className={`relative flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold ${tab("/magaza/sepet") ? "text-[#ec1c23]" : "text-[#555555]"}`}>
          <span className="relative">
            <ShoppingCart size={21} />
            {count > 0 && <span className="absolute -right-2.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-[#ec1c23] px-1 text-[9px] font-bold text-white">{count}</span>}
          </span>
          Sepetim
        </Link>
      </nav>
    </>
  );
}
