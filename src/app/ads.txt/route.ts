const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || "ca-pub-8419150929794664";

/** AdSense yetkili satıcı dosyası (renendustriyel.com.tr/ads.txt) */
export function GET() {
  const pub = ADSENSE_CLIENT.replace(/^ca-/, "");
  return new Response(`google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`, { headers: { "Content-Type": "text/plain" } });
}
