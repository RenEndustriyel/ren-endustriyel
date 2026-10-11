import type { MetadataRoute } from "next";
import { SITE_URL } from "@/components/site/site-data";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/panel", "/api/", "/giris", "/kayit", "/davet", "/kurulum"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
