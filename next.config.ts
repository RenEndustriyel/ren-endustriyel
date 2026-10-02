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
  async rewrites() {
    return [
      { source: "/numex-ai", destination: "/yapay-zeka" },
      { source: "/stoklar", destination: "/urunler" },
      { source: "/subeler", destination: "/ayarlar" },
      { source: "/cek-senet", destination: "/nakit/cekler" },
      { source: "/banka", destination: "/hesaplar" },
      { source: "/cari-kampanya", destination: "/cariler" },
      { source: "/teklifler", destination: "/satislar" },
      { source: "/e-ticaret", destination: "/ayarlar" },
      { source: "/ekip", destination: "/ayarlar" },
      { source: "/akademi", destination: "/ayarlar" },
      { source: "/muhasebeci-agi", destination: "/ayarlar" },
    ];
  },
};

export default nextConfig;
