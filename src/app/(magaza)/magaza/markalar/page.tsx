import type { Metadata } from "next";
import Link from "next/link";
import { STORE_BRANDS } from "@/components/store/store-data";
import { listHref } from "@/components/store/store-shared";
import { STORE_WRAP, StoreCrumbs } from "@/components/store/store-ui";

export const metadata: Metadata = {
  title: "Markalar",
  description:
    "Ren Endüstriyel mağazasında satılan temizlik, hijyen ve kağıt ürünü markaları.",
  alternates: { canonical: "/magaza/markalar" },
};

export default function StoreBrandsPage() {
  const brands = [...STORE_BRANDS].sort((a, b) =>
    a.name.localeCompare(b.name, "tr"),
  );
  return (
    <>
      <StoreCrumbs crumbs={[{ label: "Markalar" }]} />
      <div className={`${STORE_WRAP} pt-5`}>
        <div className="rounded-xl border border-[#e6e6e6] bg-white p-5 sm:p-7">
          <h1 className="text-2xl font-extrabold tracking-tight text-[#1e1e1e]">
            Markalar
          </h1>
          <p className="mt-1 text-sm text-[#6f6f6f]">
            {brands.length} marka · ürünlerini görmek için markaya dokunun
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
            {brands.map((b) => (
              <Link
                key={b.slug}
                href={listHref({ marka: b.slug })}
                className="flex h-20 flex-col items-center justify-center rounded-xl border border-[#e6e6e6] px-2 text-center transition hover:border-[#2d1b7e] hover:bg-[#f5f5f5]"
              >
                <span className="text-[15px] font-extrabold text-[#1e1e1e]">
                  {b.name}
                </span>
                <span className="mt-0.5 text-[11px] text-[#7f7f7f]">
                  {b.count} ürün
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
