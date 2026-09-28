const moneyFmt = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const intFmt = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 });
const qtyFmt = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 3 });

export const CURRENCY_SYMBOL: Record<string, string> = { TRY: "₺", USD: "$", EUR: "€", GBP: "£" };

/** 1234.5 -> "1.234,50" */
export function formatNumber(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return moneyFmt.format(Math.abs(n) < 0.005 ? 0 : n); // "-0,00" gösterme
}

/** 1234.5 -> "1.234,50 ₺" */
export function formatMoney(value: number | string | null | undefined, currency = "TRY"): string {
  const sym = CURRENCY_SYMBOL[currency] ?? currency;
  const n = formatNumber(value);
  return currency === "TRY" ? `${n} ${sym}` : `${sym}${n}`;
}

/** Tam ve kuruş kısmını ayrı döndürür (Paraşüt tarzı küçük kuruş gösterimi için) */
export function splitMoney(value: number | string | null | undefined): { whole: string; cents: string } {
  const [whole, cents] = formatNumber(value).split(",");
  return { whole, cents: cents ?? "00" };
}

/** 125000 -> "125 bin" */
export function formatCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} mn`;
  if (abs >= 1_000) return `${(value / 1_000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} bin`;
  return intFmt.format(value);
}

export function formatQty(value: number | string | null | undefined): string {
  return qtyFmt.format(Number(value ?? 0));
}

const dateFmt = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
const dayMonthFmt = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long" });
const longFmt = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric", weekday: "long" });
const shortDayFmt = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short" });

function toDate(d: string | Date): Date {
  if (d instanceof Date) return d;
  // "YYYY-MM-DD" yerel tarih olarak yorumlanmalı
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T00:00:00`) : new Date(d);
}

export const formatDate = (d: string | Date | null | undefined) => (d ? dateFmt.format(toDate(d)) : "");
export const formatDayMonth = (d: string | Date) => dayMonthFmt.format(toDate(d));
export const formatLongDate = (d: string | Date) => longFmt.format(toDate(d));
export const formatShortDay = (d: string | Date) => shortDayFmt.format(toDate(d));

/** Yerel tarihi "YYYY-MM-DD" olarak verir */
export function isoDate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function relativeDays(days: number): string {
  if (days === 0) return "Bugün";
  if (days === 1) return "Yarın";
  if (days === -1) return "Dün";
  return days > 0 ? `${days} gün sonra` : `${-days} gün önce`;
}
