// TCMB günlük döviz kurlarını çeker ve exchange_rates tablosuna yazar.
// Tetikleyen: pg_cron (hafta içi) veya kullanıcı ("Kurları güncelle" düğmesi).
import { adminClient, authorize, cors, json } from "../_shared/auth.ts";

const CURRENCIES = ["USD", "EUR", "GBP", "CHF", "JPY", "SAR", "RUB", "CNY"];

function pick(block: string, tag: string): number | null {
  const m = block.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
  const v = m?.[1]?.trim();
  return v ? Number(v) : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const who = await authorize(req);
  if (!who) return json({ error: "Yetkisiz" }, 401);

  const res = await fetch("https://www.tcmb.gov.tr/kurlar/today.xml", { headers: { "User-Agent": "Mozilla/5.0 RenOnMuhasebe" } });
  if (!res.ok) return json({ error: `TCMB yanıtı ${res.status}` }, 502);
  const xml = await res.text();

  const dateAttr = xml.match(/Date="(\d{2})\/(\d{2})\/(\d{4})"/) ?? xml.match(/Tarih="(\d{2})\.(\d{2})\.(\d{4})"/);
  // Date="MM/DD/YYYY" ; Tarih="DD.MM.YYYY"
  let rateDate = new Date().toISOString().slice(0, 10);
  if (dateAttr) {
    rateDate = dateAttr[0].startsWith("Date")
      ? `${dateAttr[3]}-${dateAttr[1]}-${dateAttr[2]}`
      : `${dateAttr[3]}-${dateAttr[2]}-${dateAttr[1]}`;
  }

  const rows = [];
  for (const block of xml.split("<Currency ").slice(1)) {
    const code = block.match(/CurrencyCode="([A-Z]{3})"/)?.[1];
    if (!code || !CURRENCIES.includes(code)) continue;
    const unit = pick(block, "Unit") ?? 1;
    const norm = (v: number | null) => (v === null ? null : v / unit);
    rows.push({
      rate_date: rateDate,
      currency: code,
      forex_buying: norm(pick(block, "ForexBuying")),
      forex_selling: norm(pick(block, "ForexSelling")),
      banknote_buying: norm(pick(block, "BanknoteBuying")),
      banknote_selling: norm(pick(block, "BanknoteSelling")),
      source: "TCMB",
    });
  }
  if (!rows.length) return json({ error: "Kur bulunamadı" }, 502);

  const { error } = await adminClient().from("exchange_rates").upsert(rows, { onConflict: "rate_date,currency" });
  if (error) return json({ error: error.message }, 500);
  return json({ ok: true, date: rateDate, rates: Object.fromEntries(rows.map((r) => [r.currency, r.forex_buying])) });
});
