"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { isoDate } from "@/lib/format";
import type { DashboardSummary } from "./types";

import { reconcileContactAllocations } from "@/lib/reconcile-allocations";

export function useDashboard(orgId: string) {
  return useQuery({
    queryKey: ["dashboard", orgId],
    queryFn: async () => {
      // Önce açık carilerdeki kısmi veya serbest tahsilatları açık belgelere otomatik eşle
      try {
        await reconcileContactAllocations(orgId);
      } catch (err) {
        console.warn("Otomatik tahsilat eşleştirmesi atlandı:", err);
      }

      const { data, error } = await supabase.rpc("dashboard_summary", { p_org: orgId, p_today: isoDate() });
      if (error) throw error;
      const res = data as unknown as DashboardSummary;
      if (res && Array.isArray(res.timeline)) {
        res.timeline = res.timeline.filter((t) => Number(t.amount) > 0.009);
      }
      if (res && Array.isArray(res.recent)) {
        const seenIds = new Set<string>();
        let list = res.recent.filter((item) => {
          if (!item.id) return true;
          if (seenIds.has(item.id)) return false;
          seenIds.add(item.id);
          return true;
        });

        // Masraf ve maaş belgelerini al
        const expenseDocs = list.filter(
          (r) => r.kind === "document" && (r.type === "expense" || r.type === "salary")
        );

        // Belge ile aynı anda otomatik oluşturulan ödeme hareketini listeden çıkar (mükerrerliği önle)
        list = list.filter((r) => {
          if (r.kind !== "transaction" || r.type !== "payment") return true;
          const isDup = expenseDocs.some((d) => {
            const sameDate = d.date === r.date;
            const sameAmt = Math.abs(Number(d.amount)) === Math.abs(Number(r.amount));
            const normDParty = (d.party || "").trim().toLowerCase();
            const normRParty = (r.party || "").trim().toLowerCase();
            const sameParty = !normDParty || !normRParty || normDParty === normRParty;
            return sameDate && sameAmt && sameParty;
          });
          return !isDup;
        });

        // Hareketleri ödeme durumu (peşin/vadeli), ödeme yöntemi (kk/havale/nakit) ve cari ismi ile zenginleştir
        const docIds = list.filter((r) => r.kind === "document").map((r) => r.id);
        const txnIds = list.filter((r) => r.kind === "transaction").map((r) => r.id);

        const docMap = new Map<string, { payment_status: string; due_date: string | null; contact_name: string | null; method: string | null }>();
        const txnMap = new Map<string, { method: string | null; contact_name: string | null }>();

        if (docIds.length > 0) {
          try {
            const { data: docs } = await supabase
              .from("documents")
              .select("id, payment_status, due_date, contacts(name)")
              .in("id", docIds);

            const { data: allocs } = await supabase
              .from("payment_allocations")
              .select("document_id, transaction:transactions(method)")
              .in("document_id", docIds);

            const allocMethodMap = new Map<string, string>();
            for (const a of (allocs as unknown as { document_id: string; transaction: { method: string | null } | null }[]) || []) {
              if (a?.document_id && a?.transaction?.method) {
                allocMethodMap.set(a.document_id, a.transaction.method);
              }
            }

            for (const d of (docs as unknown as { id: string; payment_status: string; due_date: string | null; contacts: { name: string } | null }[]) || []) {
              docMap.set(d.id, {
                payment_status: d.payment_status,
                due_date: d.due_date,
                contact_name: d.contacts?.name ?? null,
                method: allocMethodMap.get(d.id) ?? null,
              });
            }
          } catch (e) {
            console.warn("Son hareket belge detayları yüklenemedi:", e);
          }
        }

        if (txnIds.length > 0) {
          try {
            const { data: txns } = await supabase
              .from("transactions")
              .select("id, method, contacts(name)")
              .in("id", txnIds);

            for (const t of (txns as unknown as { id: string; method: string | null; contacts: { name: string } | null }[]) || []) {
              txnMap.set(t.id, {
                method: t.method ?? null,
                contact_name: t.contacts?.name ?? null,
              });
            }
          } catch (e) {
            console.warn("Son hareket işlem detayları yüklenemedi:", e);
          }
        }

        // Zenginleştirilmiş alanları ata
        res.recent = list.map((r) => {
          if (r.kind === "document") {
            const extra = docMap.get(r.id);
            const partyName = extra?.contact_name || r.party;
            return {
              ...r,
              party: partyName,
              payment_status: extra?.payment_status ?? (r.type === "pos_sale" ? "paid" : "unpaid"),
              method: extra?.method ?? (r.type === "pos_sale" ? "cash" : null),
              due_date: extra?.due_date ?? null,
            };
          } else {
            const extra = txnMap.get(r.id);
            const partyName = extra?.contact_name || r.party;
            return {
              ...r,
              party: partyName,
              payment_status: "paid",
              method: extra?.method ?? "cash",
            };
          }
        });
      }
      return res;
    },
    refetchInterval: 60_000,
  });
}
