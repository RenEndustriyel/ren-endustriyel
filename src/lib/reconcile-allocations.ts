import { supabase } from "@/lib/supabase/client";

/**
 * Açık carilerde yapılmış fakat belgelere bağlanmamış (unallocated) tahsilat ve ödemeleri
 * otomatik olarak açık belgelere (en eski vadeden başlayarak) dağıtır ve eşleştirir.
 * Bu sayede anasayfada geciken tahsilat/ödemeler kısmi tahsilatlar düşülmüş olarak gösterilir.
 */
export async function reconcileContactAllocations(orgId: string): Promise<number> {
  if (!orgId) return 0;
  try {
    // 1. Cari tahsilat ve ödeme hareketlerini çek
    const { data: txns, error: txnErr } = await supabase
      .from("transactions")
      .select("id, contact_id, direction, amount, exchange_rate, currency, type, txn_date")
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .not("contact_id", "is", null)
      .in("type", ["collection", "payment"]);

    if (txnErr || !txns || txns.length === 0) return 0;

    // 2. Bu işlemler için mevcut eşleştirmeleri çek
    const txnIds = txns.map((t) => t.id);
    const { data: existingAllocs, error: allocErr } = await supabase
      .from("payment_allocations")
      .select("transaction_id, amount")
      .eq("org_id", orgId)
      .in("transaction_id", txnIds);

    if (allocErr) return 0;

    const allocatedMap = new Map<string, number>();
    for (const a of existingAllocs || []) {
      allocatedMap.set(a.transaction_id, (allocatedMap.get(a.transaction_id) ?? 0) + Number(a.amount));
    }

    // Henüz dağıtılmamış tutarı olan hareketler
    const unallocatedTxns = txns.filter((t) => {
      const allocated = allocatedMap.get(t.id) ?? 0;
      return Number(t.amount) - allocated > 0.009;
    });

    if (unallocatedTxns.length === 0) return 0;

    // 3. Bu carilere ait açık belgeleri çek
    const contactIds = [...new Set(unallocatedTxns.map((t) => t.contact_id as string))];

    const { data: openDocs, error: docErr } = await supabase
      .from("documents")
      .select("id, contact_id, doc_type, total, paid_amount, exchange_rate, due_date, issue_date, created_at, status, payment_status")
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .in("contact_id", contactIds)
      .not("status", "in", '("draft","cancelled")')
      .in("payment_status", ["unpaid", "partial"])
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("issue_date", { ascending: true })
      .order("created_at", { ascending: true });

    if (docErr || !openDocs || openDocs.length === 0) return 0;

    // Belgelerin anlık kalan tutarları
    const docRemainingMap = new Map<string, number>();
    for (const d of openDocs) {
      docRemainingMap.set(d.id, Math.max(0, Number(d.total) - Number(d.paid_amount)));
    }

    const newAllocations: { org_id: string; transaction_id: string; document_id: string; amount: number }[] = [];

    // Tarihe göre sırala
    unallocatedTxns.sort((a, b) => (a.txn_date || "").localeCompare(b.txn_date || ""));

    for (const txn of unallocatedTxns) {
      const alreadyAllocated = allocatedMap.get(txn.id) ?? 0;
      let unallocated = Number(txn.amount) - alreadyAllocated;
      if (unallocated <= 0.009) continue;

      const validDocTypes =
        txn.direction === "in"
          ? ["sales_invoice", "pos_sale", "purchase_return"]
          : ["purchase_invoice", "expense", "sales_return"];

      const contactDocs = openDocs.filter(
        (d) => d.contact_id === txn.contact_id && validDocTypes.includes(d.doc_type)
      );

      for (const doc of contactDocs) {
        if (unallocated <= 0.009) break;
        const currentRemaining = docRemainingMap.get(doc.id) ?? 0;
        if (currentRemaining <= 0.009) continue;

        const toAllocate = Math.round(Math.min(unallocated, currentRemaining) * 100) / 100;
        if (toAllocate > 0) {
          newAllocations.push({
            org_id: orgId,
            transaction_id: txn.id,
            document_id: doc.id,
            amount: toAllocate,
          });

          unallocated -= toAllocate;
          docRemainingMap.set(doc.id, Math.max(0, currentRemaining - toAllocate));
        }
      }
    }

    if (newAllocations.length === 0) return 0;

    // Eşleştirmeleri kaydet (DB trigger'ı otomatik olarak documents.paid_amount günceller)
    const { error: insertErr } = await supabase.from("payment_allocations").insert(newAllocations);
    if (insertErr) {
      console.warn("Otomatik tahsilat/ödeme eşleştirmesi kaydedilemedi:", insertErr);
      return 0;
    }

    return newAllocations.length;
  } catch (err) {
    console.warn("Reconcile error:", err);
    return 0;
  }
}
