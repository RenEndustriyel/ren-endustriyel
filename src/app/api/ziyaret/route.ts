import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|mediapartners|adsbot|facebookexternalhit|whatsapp/i;
const EVENTS = new Set(["pageview", "whatsapp", "phone", "teklif"]);

function deviceOf(ua: string) {
  if (/ipad|tablet/i.test(ua)) return "Tablet";
  if (/mobi|android|iphone/i.test(ua)) return "Telefon";
  return "Bilgisayar";
}

function referrerHost(ref: string | undefined, selfHost: string) {
  if (!ref) return null;
  try {
    const h = new URL(ref).hostname.replace(/^www\./, "");
    return h === selfHost.replace(/^www\./, "") ? null : h;
  } catch {
    return null;
  }
}

/**
 * Herkese açık sayfalardan gelen sayfa görüntüleme / tıklama sayacı.
 * Kişi tanımlanmaz: IP saklanmaz; yalnızca günlük değişen tek yönlü özet tutulur.
 */
export async function POST(req: NextRequest) {
  const ua = req.headers.get("user-agent") ?? "";
  if (!ua || BOT.test(ua)) return new Response(null, { status: 204 });

  let body: { e?: string; p?: string; r?: string } = {};
  try {
    body = JSON.parse(await req.text());
  } catch {
    return new Response(null, { status: 204 });
  }
  const event = EVENTS.has(body.e ?? "") ? body.e! : "pageview";
  if (typeof body.p !== "string" || !body.p.startsWith("/")) return new Response(null, { status: 204 });

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
  const day = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" });
  const salt = process.env.VISIT_SALT || process.env.NEXT_PUBLIC_SUPABASE_URL || "ren";
  const visitor = createHash("sha256").update(`${salt}|${day}|${ip}|${ua}`).digest("hex").slice(0, 32);
  const city = req.headers.get("x-vercel-ip-city");

  await supabase.rpc("log_site_visit" as never, {
    p_event: event,
    p_path: body.p.split("?")[0],
    p_referrer_host: referrerHost(body.r, req.nextUrl.hostname),
    p_device: deviceOf(ua),
    p_country: req.headers.get("x-vercel-ip-country"),
    p_city: city ? decodeURIComponent(city) : null,
    p_visitor_hash: visitor,
  } as never);

  return new Response(null, { status: 204 });
}
