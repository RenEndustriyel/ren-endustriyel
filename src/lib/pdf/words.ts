const ONES = ["", "Bir", "İki", "Üç", "Dört", "Beş", "Altı", "Yedi", "Sekiz", "Dokuz"];
const TENS = ["", "On", "Yirmi", "Otuz", "Kırk", "Elli", "Altmış", "Yetmiş", "Seksen", "Doksan"];
const SCALES = ["", "Bin", "Milyon", "Milyar", "Trilyon"];

function under1000(n: number): string[] {
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const o = n % 10;
  const out: string[] = [];
  if (h) out.push(h === 1 ? "Yüz" : `${ONES[h]} Yüz`);
  if (t) out.push(TENS[t]);
  if (o) out.push(ONES[o]);
  return out;
}

export function intToWords(n: number): string {
  if (n === 0) return "Sıfır";
  const parts: string[] = [];
  let i = 0;
  while (n > 0) {
    const chunk = n % 1000;
    if (chunk) {
      // "Bin" denir, "Bir Bin" denmez
      const words = i === 1 && chunk === 1 ? [] : under1000(chunk);
      parts.unshift([...words, SCALES[i]].filter(Boolean).join(" "));
    }
    n = Math.floor(n / 1000);
    i++;
  }
  return parts.join(" ");
}

/** 1234.5 -> "Yalnız: Bin İki Yüz Otuz Dört Türk Lirası Elli Kuruş" */
export function amountInWords(amount: number, currency = "TRY"): string {
  const abs = Math.abs(Math.round(amount * 100) / 100);
  const whole = Math.floor(abs);
  const cents = Math.round((abs - whole) * 100);
  const [major, minor] = currency === "USD" ? ["ABD Doları", "Sent"] : currency === "EUR" ? ["Euro", "Sent"] : ["Türk Lirası", "Kuruş"];
  return `Yalnız: ${intToWords(whole)} ${major}${cents ? ` ${intToWords(cents)} ${minor}` : ""}`;
}
