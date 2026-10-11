import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BuyBox } from "@/components/store/buy-box";
import { ProductThumb } from "@/components/store/product-thumb";
import { PRODUCTS, brandSlug, findProduct, relatedProducts } from "@/components/store/store-data";
import { SITE_URL } from "@/components/site/site-data";
import { STORE_PREVIEW, categoryOf, listHref, productHref } from "@/components/store/store-shared";
import { ProductGrid, STORE_WRAP, StoreCrumbs, StorePageTitle, StoreSectionHead } from "@/components/store/store-ui";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = findProduct(slug);
  if (!p) return {};
  const c = categoryOf(p.cat);
  return {
    title: p.name,
    description: `${p.name} — ${c.title} kategorisinde. Ren Endüstriyel mağazasından toptan ve perakende sipariş verin.`,
    alternates: { canonical: productHref(p.slug) },
    openGraph: p.image ? { images: [p.image] } : undefined,
  };
}

export default async function StoreProductPage({ params }: Props) {
  const { slug } = await params;
  const p = findProduct(slug);
  if (!p) notFound();
  const c = categoryOf(p.cat);
  const related = relatedProducts(p, 5);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    category: c.title,
    ...(p.brand ? { brand: { "@type": "Brand", name: p.brand } } : {}),
    ...(p.image ? { image: `${SITE_URL}${p.image}` } : {}),
    ...(p.barcode ? { gtin: p.barcode } : {}),
    // Önizleme aşamasındaki örnek fiyatlar arama motorlarına bildirilmez
    ...(p.price !== undefined && !STORE_PREVIEW ? { offers: { "@type": "Offer", price: p.price, priceCurrency: "TRY", availability: "https://schema.org/InStock", url: `${SITE_URL}${productHref(p.slug)}` } } : {}),
  };

  const rows: [string, React.ReactNode][] = [
    ...(p.barcode ? [["Ürün Kodu", <strong key="k">{p.barcode}</strong>] as [string, React.ReactNode]] : []),
    [
      "Marka",
      p.brand ? (
        <Link key="m" href={listHref({ marka: brandSlug(p.brand) })} className="hover:text-[#ec1c23] hover:underline">
          {p.brand}
        </Link>
      ) : (
        "—"
      ),
    ],
    [
      "Kategori",
      <Link key="c" href={listHref({ kategori: c.slug })} className="hover:text-[#ec1c23] hover:underline">
        {c.title}
      </Link>,
    ],
    ...(p.pack ? [["Ambalaj", p.pack] as [string, React.ReactNode]] : []),
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <StoreCrumbs crumbs={[{ label: c.title, href: listHref({ kategori: c.slug }) }, { label: p.name }]} />

      <div className="bg-white pb-10">
        <div className={STORE_WRAP}>
          <StorePageTitle>{p.name}</StorePageTitle>

          <div className="grid gap-6 lg:grid-cols-[480px_1fr] lg:gap-10">
            <ProductThumb image={p.image} name={p.name} cat={p.cat} brand={p.brand} priority sizes="(max-width: 1024px) 100vw, 480px" className="aspect-square rounded-md text-2xl" />

            <div className="min-w-0">
              <p className="text-base leading-7 text-[#7f7f7f]">
                {p.name}, Ren Endüstriyel mağazasında {c.title.toLocaleLowerCase("tr-TR")} kategorisinde satışa sunulmaktadır. Kullanım talimatı ve güvenlik bilgileri için ürün etiketini esas alınız. Farklı boy veya koli seçenekleri için bize yazabilirsiniz.
              </p>

              <dl className="mt-4 text-sm">
                {rows.map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[100px_1fr] items-center border-b border-dotted border-[#bdbdbd] py-3.5">
                    <dt className="font-bold text-[#1e1e1e]">{k}</dt>
                    <dd className="text-[#555555]">{v}</dd>
                  </div>
                ))}
              </dl>

              <BuyBox product={p} />
            </div>
          </div>

          <div className="mt-10 grid gap-8 border-t border-[#e6e6e6] pt-8 lg:grid-cols-2">
            <section>
              <h2 className="text-lg font-bold text-[#1e1e1e]">Teslimat</h2>
              <p className="mt-2 text-sm leading-6 text-[#555555]">Siparişiniz bize ulaştığında stok ve teslimat günü teyit edilerek size bilgi verilir. Tüm siparişler faturalı olarak gönderilir.</p>
            </section>
            <section>
              <h2 className="text-lg font-bold text-[#1e1e1e]">Ödeme</h2>
              <p className="mt-2 text-sm leading-6 text-[#555555]">Havale / EFT ile veya sipariş onayı sırasında belirlenen yöntemle ödeme yapabilirsiniz. Toplu alımlarda miktara göre özel fiyat verilir.</p>
            </section>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className={`${STORE_WRAP} mt-10`}>
          <StoreSectionHead title="Benzer Ürünler" href={listHref({ kategori: c.slug })} />
          <ProductGrid products={related} />
        </section>
      )}
    </>
  );
}
