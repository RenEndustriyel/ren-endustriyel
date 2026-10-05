import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
  // Pusulam adresleri; adres çubuğunda Pusulam'daki gibi kalır.
  // /e-ticaret, /akademi, /muhasebeci-agi kendi sayfalarına sahip (dosya rotaları önceliklidir).
  async rewrites() {
    return [
      { source: "/numex-ai", destination: "/yapay-zeka" },
      { source: "/subeler", destination: "/stok/depolar" },
      { source: "/cek-senet", destination: "/nakit/cek-senet" },
      { source: "/banka", destination: "/nakit/ekstre" },
      { source: "/cari-kampanya", destination: "/kampanya" },
      { source: "/teklifler", destination: "/satislar/teklifler" },
      { source: "/ekip", destination: "/giderler/calisanlar" },
    ];
  },
};

export default nextConfig;
