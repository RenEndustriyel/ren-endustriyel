import { supabase } from "@/lib/supabase/client";
import { DOC_TYPES, docFlow, type DocType } from "@/lib/doc-types";

/**
 * Carinin tüm açık ve kapalı belgelerini, tahsilat ve ödemelerini
 * en eski tarihten en yeni tarihe doğru (Strict FIFO) eşleştirir.
 * 
 * Kural:
 * - Ödemeler / tahsilatlar en eski açık belgeyi %100 kapatmadan
 *   asla bir sonraki belgeye geçmez.
 * - Bu sayede caride hiçbir zaman aynı anda 2 tane "Kısmi Ödendi"
 *   belgesi bulunamaz; en eski belgeler tamamen "Ödendi" olur,
 *   en fazla 1 adet sınır belgesi "Kısmi" olabilir, sonrakiler "Açık" kalır.
 */
export async function reconcileContactAllocations(orgId: string, targetContactId?: string): Promise<number> {
  if (!orgId) return 0;
  try {
    // 0. Varsa eski yapay mahsup kayıtlarını (oto-mahsup) temizle
    try {
      const { data: offsetRows1 } = await supabase
        .from("transactions")
        .select("id")
        .eq("org_id", orgId)
        .is("deleted_at", null)
        .like("reference", "oto-mahsup%");
      const { data: offsetRows2 } = await supabase
        .from("transactions")
        .select("id")
        .eq("org_id", orgId)
        .is("deleted_at", null)
        .ilike("description", "%Otomatik mahsup%");

      const toCleanIds = Array.from(
        new Set([...(offsetRows1 || []).map((r) => r.id), ...(offsetRows2 || []).map((r) => r.id)])
      );
      if (toCleanIds.length > 0) {
        await supabase.from("payment_allocations").delete().in("transaction_id", toCleanIds);
        await supabase.from("transactions").update({ deleted_at: new Date().toISOString() }).in("id", toCleanIds);
      }
    } catch (e) {
      console.warn("Mahsup temizleme hatası:", e);
    }

    // 1. Hedef cari(ler)
    let contactIds: string[] = [];
    if (targetContactId) {
      contactIds = [targetContactId];
    } else {
      const { data: contacts } = await supabase
        .from("contacts")
        .select("id")
        .eq("org_id", orgId)
        .is("deleted_at", null)
        .limit(1000);
      contactIds = (contacts || []).map((c) => c.id);
    }

    if (contactIds.length === 0) return 0;

    let totalAllocationsCreated = 0;

    for (const cid of contactIds) {
      // 2. Carinin devir (açılış) bakiyesini al
      const { data: contactRow } = await supabase
        .from("contacts")
        .select("id, opening_balance")
        .eq("id", cid)
        .single();
      const openingBal = Number(contactRow?.opening_balance || 0);

      // 3. Carinin tüm belgelerini çek (tarihe göre sıralı)
      const { data: rawDocs, error: docErr } = await supabase
        .from("documents")
        .select("id, contact_id, doc_type, total, paid_amount, exchange_rate, due_date, issue_date, created_at, status, payment_status")
        .eq("org_id", orgId)
        .eq("contact_id", cid)
        .is("deleted_at", null)
        .neq("status", "draft")
        .neq("status", "cancelled")
        .order("issue_date", { ascending: true })
        .order("due_date", { ascending: true })
        .order("created_at", { ascending: true });

      if (docErr || !rawDocs) continue;

      // 4. Carinin tüm hareketlerini çek (tarihe göre sıralı, yapay mahsuplar hariç)
      const { data: rawTxns, error: txnErr } = await supabase
        .from("transactions")
        .select("id, contact_id, direction, amount, exchange_rate, currency, type, txn_date, created_at, reference, description")
        .eq("org_id", orgId)
        .eq("contact_id", cid)
        .is("deleted_at", null)
        .in("type", ["collection", "payment", "cheque_in", "cheque_out", "adjustment", "cheque_collect", "cheque_pay"])
        .order("txn_date", { ascending: true })
        .order("created_at", { ascending: true });

      if (txnErr || !rawTxns) continue;

      // İki yön için ayrı FIFO hesapla: "in" (satış/tahsilat) ve "out" (alış/ödeme)
      for (const flow of ["in", "out"] as const) {
        const flowDocs = rawDocs.filter((d) => {
          const cfg = DOC_TYPES[d.doc_type as DocType];
          if (!cfg?.payable) return false;
          return docFlow(d.doc_type as DocType) === flow;
        });

        const flowTxns = rawTxns
          .filter((t) => {
            if (t.direction !== flow || Number(t.amount) <= 0) return false;
            const ref = t.reference ?? "";
            const desc = t.description ?? "";
            if (ref.startsWith("oto-mahsup") || ref.includes("oto-mahsup") || desc.includes("Otomatik mahsup") || desc.includes("oto-mahsup")) {
              return false;
            }
            return true;
          })
          .map((t) => ({ ...t, avail: Number(t.amount) }));

        if (flowDocs.length === 0 && flowTxns.length === 0) continue;

        // Devir: müşteri ise flow in devri kapatır, tedarikçi ise flow out devri kapatır
        let reserve = flow === "in" ? Math.max(0, openingBal) : Math.max(0, -openingBal);
        for (const t of flowTxns) {
          if (reserve <= 0.009) break;
          const take = Math.min(t.avail, reserve);
          t.avail = Math.round((t.avail - take) * 100) / 100;
          reserve = Math.round((reserve - take) * 100) / 100;
        }

        const newAllocs: { org_id: string; transaction_id: string; document_id: string; amount: number }[] = [];
        const docPaidMap = new Map<string, number>();
        let txnIdx = 0;

        for (const doc of flowDocs) {
          const docTotal = Number(doc.total || 0);
          let needed = docTotal;

          while (needed > 0.009 && txnIdx < flowTxns.length) {
            const txn = flowTxns[txnIdx];
            if (txn.avail <= 0.009) {
              txnIdx++;
              continue;
            }

            const pay = Math.round(Math.min(needed, txn.avail) * 100) / 100;
            if (pay > 0) {
              newAllocs.push({
                org_id: orgId,
                transaction_id: txn.id,
                document_id: doc.id,
                amount: pay,
              });
              needed = Math.round((needed - pay) * 100) / 100;
              txn.avail = Math.round((txn.avail - pay) * 100) / 100;
            }

            if (txn.avail <= 0.009) {
              txnIdx++;
            }
          }

          docPaidMap.set(doc.id, Math.max(0, Math.round((docTotal - needed) * 100) / 100));
        }

        // Yalnızca FARKLI olan eşleştirmeleri yaz. Eskiden her çalışmada hepsi silinip yeniden ekleniyordu:
        // faturalar saniyede "ödenmedi → ödendi" gidip geliyor, işlem geçmişi on binlerce anlamsız kayıtla doluyordu.
        const docIds = flowDocs.map((d) => d.id);
        const existing: { id: string; transaction_id: string; document_id: string; amount: number }[] = [];
        let readFailed = false;
        for (let i = 0; i < docIds.length; i += 100) {
          const { data, error } = await supabase
            .from("payment_allocations")
            .select("id, transaction_id, document_id, amount")
            .in("document_id", docIds.slice(i, i + 100));
          if (error) {
            readFailed = true;
            break;
          }
          existing.push(...(data ?? []));
        }
        // mevcut durum okunamadıysa bu yönde hiçbir şeye dokunma (yarım silme/yazma olmasın)
        if (readFailed) continue;

        const key = (a: { transaction_id: string; document_id: string }) => `${a.transaction_id}|${a.document_id}`;
        const wanted = new Map(newAllocs.map((a) => [key(a), a.amount]));
        const same = (a: { transaction_id: string; document_id: string; amount: number }) =>
          wanted.has(key(a)) && Math.abs(Number(wanted.get(key(a))) - Number(a.amount)) <= 0.009;
        const staleIds = existing.filter((e) => !same(e)).map((e) => e.id);
        const keptKeys = new Set(existing.filter(same).map(key));
        const missing = newAllocs.filter((a) => !keptKeys.has(key(a)));

        for (let i = 0; i < staleIds.length; i += 100) {
          await supabase.from("payment_allocations").delete().in("id", staleIds.slice(i, i + 100));
        }
        if (missing.length > 0) {
          await supabase.from("payment_allocations").insert(missing);
          totalAllocationsCreated += missing.length;
        }

        // Belgelerin paid_amount ve payment_status değerlerini güncelle
        for (const doc of flowDocs) {
          const paid = docPaidMap.get(doc.id) ?? 0;
          const docTotal = Number(doc.total || 0);
          const status = paid >= docTotal - 0.009 ? "paid" : paid > 0.009 ? "partial" : "unpaid";

          // Sadece değişenleri güncelle
          if (Math.abs(Number(doc.paid_amount || 0) - paid) > 0.009 || doc.payment_status !== status) {
            await supabase
              .from("documents")
              .update({ paid_amount: paid, payment_status: status })
              .eq("id", doc.id);
          }
        }
      }
    }

    return totalAllocationsCreated;
  } catch (err) {
    console.warn("Reconcile error:", err);
    return 0;
  }
}
