import Link from "next/link";
import { ArrowUp, CreditCard, Landmark, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { CONTACT, STORE_CATEGORIES, STORE_PREVIEW, listHref, waLink } from "./store-shared";

const COLS: { title: string; links: [string, string][] }[] = [
  {
    title: "Kurumsal",
    links: [
      ["/kurumsal", "Hakkımızda"],
      ["/blog", "Blog"],
      ["/markalar", "Çözüm Ortaklarımız"],
      ["/sektorler", "Sektörel Çözümler"],
      ["/iletisim", "İletişim"],
    ],
  },
  {
    title: "Müşteri Hizmetleri",
    links: [
      ["/yasal", "Aydınlatma Metni (KVKK)"],
      ["/iletisim#teklif", "Kurumsal Teklif Al"],
      ["/magaza/sepet", "Sepetim"],
      ["/magaza/favoriler", "Favorilerim"],
      ["/magaza/markalar", "Markalar"],
    ],
  },
  { title: "Kategoriler", links: STORE_CATEGORIES.slice(0, 7).map((c) => [listHref({ kategori: c.slug }), c.title]) },
];

export function StoreFooter() {
  return (
    <footer className="mt-12 bg-white text-[#7f7f7f]">
      <div className="mx-auto grid max-w-[1240px] gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        {COLS.map((col) => (
          <div key={col.title}>
            <h3 className="mb-6 text-[15px] text-[#1e1e1e]">{col.title}</h3>
            <ul className="space-y-3.5 text-[13px]">
              {col.links.map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="hover:text-[#ec1c23]">
                    <span className="mr-1">›</span>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <h3 className="mb-6 text-[15px] text-[#1e1e1e]">İletişim</h3>
          <ul className="space-y-3.5 text-[13px]">
            <li className="flex gap-2.5">
              <MapPin size={16} className="mt-0.5 shrink-0 text-[#ec1c23]" />
              <span>
                {CONTACT.address}
                <br />
                {CONTACT.city}
              </span>
            </li>
            <li>
              <a href={`tel:${CONTACT.tel}`} className="flex gap-2.5 hover:text-[#ec1c23]">
                <Phone size={16} className="shrink-0 text-[#ec1c23]" /> {CONTACT.phone}
              </a>
            </li>
            <li>
              <a href={`mailto:${CONTACT.email}`} className="flex gap-2.5 break-all hover:text-[#ec1c23]">
                <Mail size={16} className="shrink-0 text-[#ec1c23]" /> {CONTACT.email}
              </a>
            </li>
            <li>
              <a href={waLink("Merhaba, sipariş vermek istiyorum.")} target="_blank" rel="noopener noreferrer" className="flex gap-2.5 font-bold text-[#ec1c23] hover:underline">
                <MessageCircle size={16} className="shrink-0" /> WhatsApp ile sipariş verin
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-[#eeeeee]">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-center gap-3 px-4 py-6 text-[13px] font-bold text-[#333333]">
          <span className="inline-flex items-center gap-2 rounded border border-[#d9d9d9] px-4 py-2">
            <Landmark size={18} className="text-[#2d1b7e]" /> Havale / EFT
          </span>
          <span className="inline-flex items-center gap-2 rounded border border-[#d9d9d9] px-4 py-2">
            <CreditCard size={18} className="text-[#2d1b7e]" /> Kartla ödeme{STORE_PREVIEW ? " (yakında)" : ""}
          </span>
        </div>
      </div>

      <div className="border-t border-[#eeeeee]">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-4 py-6 text-xs">
          <span>
            <strong className="text-[#555555]">Copyright © {new Date().getFullYear()} Tüm Hakları Saklıdır. Ren Endüstriyel</strong>
            <br />
            Ürün görselleri üreticilerin resmi görselleridir.
          </span>
          <a href="#site-top" aria-label="Sayfanın başına çık" className="grid size-10 shrink-0 place-items-center rounded bg-[#ec1c23] text-white transition hover:bg-[#c9151b]">
            <ArrowUp size={18} />
          </a>
        </div>
      </div>
    </footer>
  );
}
