import type { MetadataRoute } from "next";
import { POSTS, SECTORS, SITE_URL } from "@/components/site/site-data";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/kurumsal", "/urun-gruplari", "/sektorler", "/markalar", "/blog", "/iletisim", "/katalog"];
  return [
    ...pages.map((p) => ({ url: `${SITE_URL}${p}`, changeFrequency: "monthly" as const, priority: p === "" ? 1 : 0.8 })),
    ...SECTORS.map((s) => ({ url: `${SITE_URL}/sektorler/${s.slug}`, changeFrequency: "monthly" as const, priority: 0.7 })),
    ...POSTS.map((p) => ({ url: `${SITE_URL}/blog/${p.slug}`, lastModified: p.date, changeFrequency: "yearly" as const, priority: 0.6 })),
  ];
}
