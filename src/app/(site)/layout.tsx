import type { Metadata } from "next";
import { SITE_URL } from "@/components/site/site-data";
import { SiteHeader } from "@/components/site/site-header";
import { MobileContactBar, SiteFooter } from "@/components/site/site-ui";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  openGraph: { siteName: "Ren Endüstriyel", locale: "tr_TR", type: "website", images: ["/images/ren-logo-3d.png"] },
};

/** Kurumsal tanıtım sitesi düzeni (ERP'den bağımsız, her zaman açık tema) */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div id="site-top" className="min-h-screen bg-white text-slate-900 [color-scheme:light]">
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
      <MobileContactBar />
    </div>
  );
}
