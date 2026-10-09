import type { Metadata } from "next";
import { CtaBand, PageHero } from "@/components/site/site-ui";
import { BRANDS } from "@/components/site/site-data";

export const metadata: Metadata = {
  title: "Markalar",
  description: "Ren Endüstriyel'de bulabileceğiniz temizlik, hijyen ve kağıt ürünleri markaları.",
  alternates: { canonical: "/markalar" },
};

export default function MarkalarPage() {
  return (
    <>
      <PageHero title="Markalarımız" text="Sektörün tanınmış markalarının temizlik ve kağıt ürünlerini toptan ve perakende sunuyoruz." crumbs={[{ label: "Markalar" }]} />
      <section className="py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {BRANDS.map((b) => (
              <div
                key={b}
                className="flex h-28 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-center text-lg font-extrabold tracking-wide text-[#0b2559] transition hover:-translate-y-0.5 hover:border-[#0e9f9a] hover:text-[#0e9f9a] hover:shadow-md"
              >
                {b.toLocaleUpperCase("tr-TR")}
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-slate-500">Marka adları ilgili sahiplerinin tescilli markalarıdır. Ürün çeşitliliği stok durumuna göre değişebilir.</p>
        </div>
      </section>
      <CtaBand title="Aradığınız marka listede yok mu?" text="Bize yazın; ihtiyacınız olan ürünü tedarik edelim." />
    </>
  );
}
