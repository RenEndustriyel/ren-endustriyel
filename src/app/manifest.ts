import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Ren Endüstriyel · Ön Muhasebe",
    short_name: "Ren",
    description: "Satış, alış, cari, stok ve nakit takibi",
    start_url: "/panel",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#2c3036",
    theme_color: "#2c3036",
    lang: "tr",
    categories: ["business", "finance", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Satış Faturası", url: "/satislar/faturalar/yeni", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Hızlı Satış", url: "/hizli-satis", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Tahsilat", url: "/nakit/hareketler/yeni?tip=tahsilat", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
