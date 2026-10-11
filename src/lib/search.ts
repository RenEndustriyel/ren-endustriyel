/**
 * Arama için metin katlama: büyük/küçük harf ve Türkçe harf farkı gözetilmez.
 * "HÜSEYİN", "hüseyin", "huseyin", "HUSEYIN" → "huseyin"  ·  "IŞIK" / "ışık" / "isik" → "isik"
 */
const TR: Record<string, string> = { ı: "i", ğ: "g", ü: "u", ş: "s", ö: "o", ç: "c" };

export function fold(s: string | null | undefined): string {
  return (s ?? "")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[ığüşöç]/g, (c) => TR[c] ?? c);
}

/** Aranan metnin her kelimesi metinde geçiyor mu (sıra önemsiz) */
export function textMatches(text: string | null | undefined, q: string | null | undefined): boolean {
  const words = fold(q).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = fold(text);
  return words.every((w) => hay.includes(w));
}

/** cmdk (Command) bileşenleri için filtre: eşleşirse 1, değilse 0 */
export const cmdkFilter = (value: string, search: string, keywords?: string[]) =>
  textMatches(`${value} ${(keywords ?? []).join(" ")}`, search) ? 1 : 0;
