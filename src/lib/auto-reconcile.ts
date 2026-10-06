/**
 * Otomatik eşleştirme (cari bazında, yalnızca TL)
 *
 * 1) Faturaya bağlanmamış tahsilat / ödemeler aynı carinin en eski açık belgelerine bağlanır (FIFO).
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

export function planReconcile(docs: RecDoc[], txns: RecTxn[]) {
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
    for (const t of cTxns) {
      let avail = r2(t.unallocated);
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

    // 2) Kalan satış ↔ alış mahsubu
    const inLeft = r2(ins.reduce((s, d) => s + (left.get(d.id) ?? 0), 0));
    const outLeft = r2(outs.reduce((s, d) => s + (left.get(d.id) ?? 0), 0));
    const amount = r2(Math.min(inLeft, outLeft));
    if (amount > EPS) {
      const take = (list: RecDoc[]) => {
        const res: { document_id: string; amount: number }[] = [];
        let need = amount;
        for (const d of list) {
          if (need <= EPS) break;
          const rem = left.get(d.id) ?? 0;
          if (rem <= EPS) continue;
          const a = r2(Math.min(need, rem));
          res.push({ document_id: d.id, amount: a });
          need = r2(need - a);
        }
        return res;
      };
      const inAllocs = take(ins);
      const outAllocs = take(outs);
      const key = [cid, amount.toFixed(2), ...inAllocs.map((a) => `${a.document_id}:${a.amount}`), "|", ...outAllocs.map((a) => `${a.document_id}:${a.amount}`)].join(",");
      offsets.push({ key, contact_id: cid, amount, inAllocs, outAllocs });
    }
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
