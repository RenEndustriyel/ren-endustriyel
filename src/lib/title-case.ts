/** Baş harfler büyük, diğerleri küçük (Türkçe): "REN ENDÜSTRİYEL" → "Ren Endüstriyel" */
export const tc = (t?: string | null) =>
  String(t ?? "").toLocaleLowerCase("tr-TR").replace(/(^|[\s/(.-])\p{L}/gu, (m) => m.toLocaleUpperCase("tr-TR"));
