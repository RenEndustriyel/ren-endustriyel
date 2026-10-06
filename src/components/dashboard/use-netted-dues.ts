"use client";

import * as React from "react";
import { useContactBalances, useRows } from "@/lib/data";
import { DOC_TYPES, type DocType } from "@/lib/doc-types";
import { formatDate, isoDate } from "@/lib/format";

/**
 * Yaklaşan / geciken tahsilat ve ödemeler — cari bazında mahsuplaşmış (netleştirilmiş) hâli.
 *
 * Aynı cariyle hem alış hem satış yapıldığında (ör. hem müşteri hem tedarikçi olan firma)
 * faturalar tek tek değil, carinin NET bakiyesi kadar listelenir. Cariye yapılmış ama belgeye
 * bağlanmamış tahsilat/ödemeler ve açılış bakiyesi de bakiyede olduğu için düşülmüş olur.
 * Kalan tutarın vadesi FIFO ile bulunur: eski belgeler önce kapanmış sayılır.
 * Veritabanında hiçbir kayıt değiştirilmez; yalnızca gösterim hesaplanır.
 */

type OpenDoc = {
  id: string;
  doc_type: string;
  number: string | null;
  contact_id: string | null;
  due_date: string | null;
  issue_date: string;
  total: number;
  paid_amount: number;
  exchange_rate: number | null;
  description: string | null;
  contact: { name: string } | null;
};

export type DueItem = {
  /** cari ise contact id, carisiz belge ise belge id */
  key: string;
  kind: "contact" | "document";
  title: string;
  subtitle: string;
  href: string;
  amount: number;
  /** en eski ödenmemiş vade (yoksa null) */
  due: string | null;
  days_overdue: number;
  /** mahsup bilgisi: cari hem alış hem satış belgesine sahipse */
  offset?: { receivable: number; payable: number };
};

export const IN_TYPES = ["sales_invoice", "pos_sale", "sales_order"];
export const OUT_TYPES = ["purchase_invoice", "expense", "salary", "purchase_order"];

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

const dayDiff = (from: string, to: string) => {
  const [a, b] = [from, to].map((s) => {
    const [y, m, d] = s.slice(0, 10).split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  });
  return Math.round((b - a) / 86400000);
};

const remainingTry = (d: OpenDoc) => r2((Number(d.total) - (Number(d.paid_amount) || 0)) * (Number(d.exchange_rate) || 1));
const dueOf = (d: OpenDoc) => String(d.due_date ?? d.issue_date).slice(0, 10);

/** Net bakiyeyi karşılayan belgelerden en eski vadeyi bulur (yeni belgeler en son ödenir) */
function oldestUnpaidDue(docs: OpenDoc[], net: number): { due: string | null; count: number } {
  const sorted = [...docs].sort((a, b) => dueOf(b).localeCompare(dueOf(a)));
  let left = net;
  let due: string | null = null;
  let count = 0;
  for (const d of sorted) {
    if (left <= 0.009) break;
    due = dueOf(d);
    count++;
    left -= remainingTry(d);
  }
  return { due, count };
}

export function useNettedDues() {
  const today = isoDate();
  const docs = useRows<OpenDoc>("documents", {
    select: "id, doc_type, number, contact_id, due_date, issue_date, total, paid_amount, exchange_rate, description, contact:contacts(name)",
    params: ["netted_open_docs"],
    filter: (q) =>
      q
        .in("payment_status", ["unpaid", "partial"])
        .not("status", "in", '("draft","cancelled","converted")')
        .in("doc_type", [...IN_TYPES, ...OUT_TYPES]),
    limit: 2000,
  });
  const balances = useContactBalances();
  const contacts = useRows<{ id: string; name: string }>("contacts", { select: "id, name", params: ["netted_names"] });

  const result = React.useMemo(() => {
    const incoming: DueItem[] = [];
    const outgoing: DueItem[] = [];
    if (!docs.data || !balances.data) return null;

    const names = new Map((contacts.data ?? []).map((c) => [c.id, c.name]));
    const byContact = new Map<string, { ins: OpenDoc[]; outs: OpenDoc[] }>();
    for (const d of docs.data) {
      if (remainingTry(d) <= 0.009) continue;
      const isIn = IN_TYPES.includes(d.doc_type);
      if (!d.contact_id) {
        // Carisiz belge (kategori masrafı, maaş): mahsup edilemez, tek tek listelenir
        const due = dueOf(d);
        const cfg = DOC_TYPES[d.doc_type as DocType];
        const item: DueItem = {
          key: d.id,
          kind: "document",
          title: `${cfg?.label ?? "Belge"}${d.description ? ` · ${d.description}` : ""}`,
          subtitle: `${d.number ? `${d.number} · ` : ""}Vade: ${formatDate(due)}`,
          href: cfg ? `${cfg.base}/detay?id=${d.id}` : "/masraflar",
          amount: remainingTry(d),
          due,
          days_overdue: due < today ? dayDiff(due, today) : 0,
        };
        (isIn ? incoming : outgoing).push(item);
        continue;
      }
      const g = byContact.get(d.contact_id) ?? { ins: [], outs: [] };
      (isIn ? g.ins : g.outs).push(d);
      byContact.set(d.contact_id, g);
      if (d.contact?.name && !names.has(d.contact_id)) names.set(d.contact_id, d.contact.name);
    }

    // Bakiyesi olan her cari (açık belgesi olmasa da: açılış bakiyesi vb.)
    for (const b of balances.data) {
      const net = r2(Number(b.balance) || 0);
      if (Math.abs(net) <= 0.009) continue;
      const g = byContact.get(b.contact_id) ?? { ins: [], outs: [] };
      const isIn = net > 0;
      const { due, count } = oldestUnpaidDue(isIn ? g.ins : g.outs, Math.abs(net));
      const receivable = r2(g.ins.reduce((s, d) => s + remainingTry(d), 0));
      const payable = r2(g.outs.reduce((s, d) => s + remainingTry(d), 0));
      const item: DueItem = {
        key: b.contact_id,
        kind: "contact",
        title: names.get(b.contact_id) ?? "Cari",
        subtitle: [count ? `${count} açık belge` : "belgesiz bakiye", due ? `Vade: ${formatDate(due)}` : null].filter(Boolean).join(" · "),
        href: `/cariler/detay?id=${b.contact_id}`,
        amount: Math.abs(net),
        due,
        days_overdue: due && due < today ? dayDiff(due, today) : 0,
        offset: receivable > 0 && payable > 0 ? { receivable, payable } : undefined,
      };
      (isIn ? incoming : outgoing).push(item);
    }

    // Vadesi geçenler önce, sonra yaklaşan vadeye göre; vadesizler en sonda
    const order = (a: DueItem, b: DueItem) => (a.due ?? "9999").localeCompare(b.due ?? "9999");
    incoming.sort(order);
    outgoing.sort(order);
    return { incoming, outgoing };
  }, [docs.data, balances.data, contacts.data, today]);

  return { data: result, isLoading: docs.isLoading || balances.isLoading };
}
