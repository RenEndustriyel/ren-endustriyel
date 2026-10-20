import type { Metadata } from "next";
import { PublicTracking } from "@/components/site/public-tracking";
import { SITE_URL } from "@/components/site/site-data";
import { StoreFloating } from "@/components/store/store-floating";
import { StoreFooter } from "@/components/store/store-footer";
import { StoreHeader } from "@/components/store/store-header";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Ren Endüstriyel Mağaza · Temizlik, Hijyen ve Kağıt Ürünleri", template: "%s · Ren Endüstriyel Mağaza" },
  description: "Toptan ve perakende temizlik kimyasalları, kağıt ürünleri, çöp poşeti ve temizlik ekipmanları. Ren Endüstriyel çevrimiçi mağaza.",
  openGraph: { siteName: "Ren Endüstriyel Mağaza", locale: "tr_TR", type: "website", images: ["/images/ren-logo-3d.png"] },
};

/** E-ticaret mağazası düzeni (kurumsal siteden ayrı üst bilgi; her zaman açık tema) */
export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div id="site-top" className="min-h-screen bg-[#f5f5f5] pb-16 text-[#1e1e1e] [color-scheme:light] lg:pb-0">
      <StoreHeader />
      <main>{children}</main>
      <StoreFooter />
      <StoreFloating />
      <PublicTracking />
    </div>
  );
}
