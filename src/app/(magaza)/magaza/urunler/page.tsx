import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, SearchX, SlidersHorizontal, X } from "lucide-react";
import { SORTS, STORE_BRANDS, queryProducts } from "@/components/store/store-data";
import { STORE_CATEGORIES, listHref, waLink } from "@/components/store/store-shared";
import { ProductGrid, STORE_WRAP, StoreCrumbs, StorePageTitle } from "@/components/store/store-ui";

const PER_PAGE = 24;

type Search = { kategori?: string; marka?: string; q?: string; sirala?: string; sayfa?: string };
type Props = { searchParams: Promise<Search> };

const one = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

function resolve(sp: Search) {
  const category = STORE_CATEGORIES.find((c) => c.slug === one(sp.kategori));
  const brand = STORE_BRANDS.find((b) => b.slug === one(sp.marka));
  const q = one(sp.q)?.slice(0, 80);
  const sort = SORTS.find((s) => s.value === one(sp.sirala))?.value ?? "onerilen";
  return { category, brand, q, sort };
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { category, brand, q } = resolve(await searchParams);
  const title = q ? `"${q}" arama sonuçları` : [brand?.name, category?.title ?? "Tüm Ürünler"].filter(Boolean).join(" ");
  return { title, alternates: { canonical: listHref({ kategori: category?.slug, marka: brand?.slug }) }, robots: q ? { index: false } : undefined };
}

export default async function StoreListPage({ searchParams }: Props) {
  const sp = await searchParams;
  const { category, brand, q, sort } = resolve(sp);
  const params = { kategori: category?.slug, marka: brand?.slug, q, sirala: sort === "onerilen" ? undefined : sort };

  const results = queryProducts({ kategori: category?.slug, marka: brand?.slug, q, sirala: sort });
  const pages = Math.max(1, Math.ceil(results.length / PER_PAGE));
  const page = Math.min(pages, Math.max(1, Number.parseInt(one(sp.sayfa) ?? "1", 10) || 1));
  const shown = results.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // Kenar çubuğu sayıları: diğer süzgeçler uygulanmış haliyle
  const inScopeForCats = queryProducts({ marka: brand?.slug, q });
  const inScopeForBrands = queryProducts({ kategori: category?.slug, q });
  const catCount = (slug: string) => inScopeForCats.filter((p) => p.cat === slug).length;
  const brands = STORE_BRANDS.map((b) => ({ ...b, count: inScopeForBrands.filter((p) => p.brand === b.name).length })).filter((b) => b.count > 0 || b.slug === brand?.slug);

  const heading = q ? `"${q}" için sonuçlar` : (category?.title ?? (brand ? `${brand.name} Ürünleri` : "Tüm Ürünler"));
  const hasFilter = !!(category || brand || q);
  const row = "flex items-center justify-between gap-2 px-10 py-2 text-sm";
  const idle = "bg-[#f2f2f2] text-[#1e1e1e] hover:bg-[#e6e6e6]";
  const active = "bg-[#ec1c23] text-white";

  const filters = (
    <div>
      <div className="space-y-0.5">
        <Link href="/magaza" className={`relative ${row} ${idle}`}>
          <ChevronLeft size={15} className="absolute left-3 text-[#7f7f7f]" /> Ana Sayfa
        </Link>
        <Link href={listHref({ ...params, kategori: undefined })} className={`relative ${row} ${!category ? active : idle}`}>
          {category && <ChevronLeft size={15} className="absolute left-3 text-[#7f7f7f]" />} Tüm Kategoriler <span className="text-xs tabular-nums opacity-70">{inScopeForCats.length}</span>
        </Link>
      </div>
      <div className="mt-2 space-y-0.5">
        {STORE_CATEGORIES.map((c) => {
          const n = catCount(c.slug);
          if (!n && c.slug !== category?.slug) return null;
          return (
            <Link key={c.slug} href={listHref({ ...params, kategori: c.slug })} className={`${row} ${category?.slug === c.slug ? active : idle}`}>
              {c.title} <span className="text-xs tabular-nums opacity-70">{n}</span>
            </Link>
          );
        })}
      </div>
      {brands.length > 0 && (
        <>
          <h2 className="mb-1.5 mt-6 text-[15px] font-bold text-[#333333]">Markalar</h2>
          <div className="max-h-[420px] space-y-0.5 overflow-y-auto">
            {brands.map((b) => {
              const on = brand?.slug === b.slug;
              return (
                <Link key={b.slug} href={listHref({ ...params, marka: on ? undefined : b.slug })} className={`${row} ${on ? active : idle}`}>
                  {b.name} <span className="text-xs tabular-nums opacity-70">{b.count}</span>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );

  const pageLink = (n: number) => listHref({ ...params, sayfa: n > 1 ? n : undefined });
  const pageWindow = Array.from({ length: pages }, (_, i) => i + 1).filter((n) => n === 1 || n === pages || Math.abs(n - page) <= 1);
  const chip = "inline-flex h-[26px] items-center rounded-sm px-2.5 text-[11px] font-bold transition";

  return (
    <>
      <StoreCrumbs crumbs={[...(category ? [{ label: category.title, href: brand || q ? listHref({ kategori: category.slug }) : undefined }] : []), ...(brand ? [{ label: brand.name }] : []), ...(!category && !brand ? [{ label: q ? "Arama" : "Tüm Ürünler" }] : [])]} />
      <div className={STORE_WRAP}>
        <StorePageTitle>{heading}</StorePageTitle>

        <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
          <aside className="hidden h-fit lg:block">{filters}</aside>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 rounded border border-[#e6e6e6] bg-[#fafafa] p-2.5 sm:px-5">
              {SORTS.map((s) => (
                <Link key={s.value} href={listHref({ ...params, sirala: s.value === "onerilen" ? undefined : s.value, sayfa: undefined })} className={`${chip} ${sort === s.value ? "bg-[#2d1b7e] text-white" : "bg-[#ec1c23] text-white hover:bg-[#c9151b]"}`}>
                  {s.label}
                </Link>
              ))}
              <span className="ml-auto text-xs text-[#6f6f6f]">{results.length} ürün</span>
            </div>

            {hasFilter && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {q && (
                  <Link href={listHref({ ...params, q: undefined })} className="inline-flex items-center gap-1.5 rounded-full bg-[#eeecf8] px-3 py-1.5 text-xs font-semibold text-[#2d1b7e]">
                    Arama: {q} <X size={13} />
                  </Link>
                )}
                {category && (
                  <Link href={listHref({ ...params, kategori: undefined })} className="inline-flex items-center gap-1.5 rounded-full bg-[#eeecf8] px-3 py-1.5 text-xs font-semibold text-[#2d1b7e]">
                    {category.title} <X size={13} />
                  </Link>
                )}
                {brand && (
                  <Link href={listHref({ ...params, marka: undefined })} className="inline-flex items-center gap-1.5 rounded-full bg-[#eeecf8] px-3 py-1.5 text-xs font-semibold text-[#2d1b7e]">
                    {brand.name} <X size={13} />
                  </Link>
                )}
                <Link href="/magaza/urunler" className="text-xs font-semibold text-[#6f6f6f] underline-offset-2 hover:underline">
                  Süzgeçleri temizle
                </Link>
              </div>
            )}

            <details className="mt-3 rounded border border-[#e6e6e6] bg-white lg:hidden">
              <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-bold text-[#1e1e1e] [&::-webkit-details-marker]:hidden">
                <SlidersHorizontal size={16} /> Kategori ve marka süzgeçleri
              </summary>
              <div className="border-t border-[#eeeeee] p-3">{filters}</div>
            </details>

            <div className="mt-5">
              {shown.length ? (
                <ProductGrid products={shown} priorityCount={4} dense />
              ) : (
                <div className="rounded border border-[#e6e6e6] bg-white px-6 py-16 text-center">
                  <SearchX size={36} className="mx-auto text-[#9a9a9a]" />
                  <h2 className="mt-4 text-lg font-bold text-[#1e1e1e]">Aradığınız ürünü bulamadık</h2>
                  <p className="mx-auto mt-1.5 max-w-md text-sm text-[#6f6f6f]">Farklı bir kelimeyle arayın ya da aradığınız ürünü bize yazın; temin edebiliyorsak fiyat verelim.</p>
                  <div className="mt-5 flex flex-wrap justify-center gap-3">
                    <Link href="/magaza/urunler" className="inline-flex h-11 items-center rounded bg-[#2d1b7e] px-5 text-sm font-bold text-white hover:bg-[#21135f]">
                      Tüm ürünler
                    </Link>
                    <a href={waLink(`Merhaba, mağazanızda şu ürünü arıyorum: ${q ?? ""}`)} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center rounded border border-[#2d1b7e] px-5 text-sm font-bold text-[#2d1b7e] hover:bg-[#eeecf8]">
                      WhatsApp ile sor
                    </a>
                  </div>
                </div>
              )}
            </div>

            {pages > 1 && (
              <nav aria-label="Sayfalar" className="mt-7 flex flex-wrap items-center justify-center gap-1.5">
                {page > 1 && (
                  <Link href={pageLink(page - 1)} aria-label="Önceki sayfa" className="grid size-10 place-items-center rounded border border-[#d9d9d9] bg-white text-[#1e1e1e] hover:border-[#2d1b7e]">
                    <ChevronLeft size={18} />
                  </Link>
                )}
                {pageWindow.map((n, i) => (
                  <span key={n} className="flex items-center gap-1.5">
                    {i > 0 && n - pageWindow[i - 1] > 1 && <span className="px-1 text-[#9a9a9a]">…</span>}
                    <Link href={pageLink(n)} aria-current={n === page ? "page" : undefined} className={`grid h-10 min-w-10 place-items-center rounded border px-2 text-sm font-bold tabular-nums ${n === page ? "border-[#ec1c23] bg-[#ec1c23] text-white" : "border-[#d9d9d9] bg-white text-[#1e1e1e] hover:border-[#2d1b7e]"}`}>
                      {n}
                    </Link>
                  </span>
                ))}
                {page < pages && (
                  <Link href={pageLink(page + 1)} aria-label="Sonraki sayfa" className="grid size-10 place-items-center rounded border border-[#d9d9d9] bg-white text-[#1e1e1e] hover:border-[#2d1b7e]">
                    <ChevronRight size={18} />
                  </Link>
                )}
              </nav>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
