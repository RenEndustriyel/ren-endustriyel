/**
 * Otomatik eşleştirme (cari bazında, yalnızca TL)
 *
 * 1) Faturaya bağlanmamış tahsilat / ödemeler önce carinin DEVİR (açılış) bakiyesini kapatır;
 *    devri aşan kısım en eski tarihli açık belgelere bağlanır (FIFO). Devri karşılayan tutar
 *    bilerek bağlanmadan kalır (devir bir belge değildir).
 * 2) Aynı caride hem açık satış hem açık alış belgesi kalırsa, küçük tutar kadar MAHSUP yapılır:
 *    kasasız (account_id = null) bir "giriş" + bir "çıkış" düzeltme hareketi. İkisi birbirini
 *    sıfırladığı için cari bakiye ve kasa/banka DEĞİŞMEZ; yalnızca belgeler "ödendi" olur.
 *
 * Hiçbir kayıt silinmez ya da değiştirilmez; yalnızca bağlantı (payment_allocations) ve mahsup
 * hareketi eklenir. Kimlikler deterministiktir: aynı işlem iki kez çalışsa da çift kayıt oluşmaz.
 * Yarım kalmış mahsup (tek yönü yazılmış) bir sonraki çalışmada geri alınır.
 */

export type RecDoc = {
  id: string;
  contact_id: string;
  doc_type: string;
  due: string; // YYYY-MM-DD
  remaining: number; // TL
};

export type RecTxn = {
  id: string;
  contact_id: string;
  direction: "in" | "out";
  date: string;
  unallocated: number; // TL
  allocatedDocIds: string[];
};

export type PlannedAllocation = { transaction_id: string; document_id: string; amount: number };
export type PlannedOffset = {
  key: string;
  contact_id: string;
  amount: number;
  inAllocs: { document_id: string; amount: number }[];
  outAllocs: { document_id: string; amount: number }[];
};

/** Tahsilat (giriş) ile kapanan belgeler / ödeme (çıkış) ile kapanan belgeler */
export const IN_DOCS = ["sales_invoice", "pos_sale", "purchase_return"];
export const OUT_DOCS = ["purchase_invoice", "expense", "sales_return"];
export const REC_TXN_TYPES = ["collection", "payment", "cheque_in", "cheque_out"];
export const OFFSET_REF = "oto-mahsup";

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const EPS = 0.009;

/**
 * @param openings cari → açılış bakiyesi (+ müşteri bize borçlu, − biz borçluyuz). Verilirse
 *   bağlanmamış tahsilatların (müşteri) / ödemelerin (tedarikçi) en eski kısmı önce devre ayrılır.
 */
export function planReconcile(docs: RecDoc[], txns: RecTxn[], openings: Map<string, number> = new Map()) {
  const allocations: PlannedAllocation[] = [];
  const offsets: PlannedOffset[] = [];

  const contacts = new Set([...docs.map((d) => d.contact_id), ...txns.map((t) => t.contact_id)]);
  for (const cid of contacts) {
    const left = new Map<string, number>();
    const byDue = (a: RecDoc, b: RecDoc) => a.due.localeCompare(b.due) || a.id.localeCompare(b.id);
    const ins = docs.filter((d) => d.contact_id === cid && IN_DOCS.includes(d.doc_type)).sort(byDue);
    const outs = docs.filter((d) => d.contact_id === cid && OUT_DOCS.includes(d.doc_type)).sort(byDue);
    for (const d of [...ins, ...outs]) left.set(d.id, r2(d.remaining));

    // 1) Bağlanmamış hareketler → en eski açık belgeler
    const cTxns = txns
      .filter((t) => t.contact_id === cid && t.unallocated > EPS)
      .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    // Devir önce: en eski bağlanmamış tutar devri karşılar
    const opening = openings.get(cid) ?? 0;
    const reserve = { in: Math.max(0, r2(opening)), out: Math.max(0, r2(-opening)) };
    for (const t of cTxns) {
      let avail = r2(t.unallocated);
      const take = r2(Math.min(avail, reserve[t.direction]));
      avail = r2(avail - take);
      reserve[t.direction] = r2(reserve[t.direction] - take);
      for (const d of t.direction === "in" ? ins : outs) {
        if (avail <= EPS) break;
        const rem = left.get(d.id) ?? 0;
        // aynı hareket–belge çifti zaten varsa (benzersiz kısıt) atla
        if (rem <= EPS || t.allocatedDocIds.includes(d.id)) continue;
        const amt = r2(Math.min(avail, rem));
        allocations.push({ transaction_id: t.id, document_id: d.id, amount: amt });
        left.set(d.id, r2(rem - amt));
        avail = r2(avail - amt);
      }
    }

    // Kullanıcı talebi doğrultusunda yapay satış ↔ alış mahsubu (Düzeltme kayıtları) kaldırıldı.
    // Ekstrede ne varsa saf ve net haliyle görünecek.
  }
  return { allocations, offsets };
}

/** Metinden deterministik UUID (SHA-1 tabanlı, v5 biçimi) */
export async function stableUuid(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(`ren-oto-eslestirme:${text}`));
  const b = Array.from(new Uint8Array(buf).slice(0, 16));
  b[6] = (b[6] & 0x0f) | 0x50;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = b.map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
