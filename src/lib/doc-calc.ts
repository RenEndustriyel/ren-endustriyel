/**
 * Belge tutar hesabı — veritabanındaki recalc_document() ile aynı mantık.
 * Ekranda anlık gösterim ve çevrimdışı iyimser kayıt için kullanılır; kesin değerleri sunucu hesaplar.
 */

export type CalcLine = {
  quantity: number;
  unit_price: number;
  discount_rate: number;
  vat_rate: number;
};

export type CalcDoc = {
  prices_include_vat: boolean;
  discount_type: "rate" | "amount";
  discount_value: number;
  exchange_rate: number;
};

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function calcDocument(doc: CalcDoc, lines: CalcLine[]) {
  const lineNetSum = lines.reduce((s, l) => s + l.quantity * l.unit_price * (1 - l.discount_rate / 100), 0);
  let ratio = 0;
  if (doc.discount_value > 0 && lineNetSum > 0) {
    ratio = doc.discount_type === "rate" ? Math.min(doc.discount_value, 100) / 100 : Math.min(doc.discount_value / lineNetSum, 1);
  }
  const calc = lines.map((l) => {
    const afterDisc = l.quantity * l.unit_price * (1 - l.discount_rate / 100) * (1 - ratio);
    const vatF = 1 + l.vat_rate / 100;
    const gross = r2(doc.prices_include_vat ? (l.quantity * l.unit_price) / vatF : l.quantity * l.unit_price);
    const net = r2(doc.prices_include_vat ? afterDisc / vatF : afterDisc);
    const vat = r2(doc.prices_include_vat ? afterDisc - afterDisc / vatF : (afterDisc * l.vat_rate) / 100);
    return { gross_amount: gross, net_amount: net, discount_amount: r2(gross - net), vat_amount: vat, total_amount: r2(net + vat) };
  });
  const sum = (k: keyof (typeof calc)[number]) => r2(calc.reduce((s, c) => s + c[k], 0));
  const total = sum("total_amount");
  const vatByRate = lines.reduce<Record<string, { base: number; vat: number }>>((acc, l, i) => {
    const k = String(l.vat_rate);
    acc[k] = acc[k] ?? { base: 0, vat: 0 };
    acc[k].base = r2(acc[k].base + calc[i].net_amount);
    acc[k].vat = r2(acc[k].vat + calc[i].vat_amount);
    return acc;
  }, {});
  return {
    lines: calc,
    subtotal: sum("gross_amount"),
    discount_total: sum("discount_amount"),
    net_total: sum("net_amount"),
    vat_total: sum("vat_amount"),
    total,
    total_try: r2(total * doc.exchange_rate),
    vatByRate,
  };
}

/** Fiyatı KDV dahil/hariç arasında dönüştürür */
export function convertVat(price: number, vatRate: number, fromIncl: boolean, toIncl: boolean) {
  if (fromIncl === toIncl) return price;
  return fromIncl ? price / (1 + vatRate / 100) : price * (1 + vatRate / 100);
}

export function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
