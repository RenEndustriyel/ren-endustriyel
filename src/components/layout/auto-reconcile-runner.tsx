"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { isoDate } from "@/lib/format";
import { useOrg } from "@/providers/org-provider";
import {
  IN_DOCS,
  OFFSET_REF,
  OUT_DOCS,
  REC_TXN_TYPES,
  planReconcile,
  stableUuid,
  type RecDoc,
  type RecTxn,
} from "@/lib/auto-reconcile";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const LAST_RUN_KEY = "ren-oto-eslestirme-son";
const LOG_KEY = "ren-oto-eslestirme-kayit";
const MIN_GAP_MS = 60_000;
const INTERVAL_MS = 3 * 60_000;

const chunks = <T,>(arr: T[], n = 150) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));
const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

async function must<T>(p: PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw error;
  return (data ?? []) as T;
}

function appendLog(entry: Record<string, unknown>) {
  try {
    const prev = JSON.parse(localStorage.getItem(LOG_KEY) || "[]") as unknown[];
    localStorage.setItem(LOG_KEY, JSON.stringify([{ at: new Date().toISOString(), ...entry }, ...prev].slice(0, 300)));
  } catch {}
}

/** Yarım kalmış (tek yönü yazılmış) otomatik mahsupları geri alır */
async function repairOrphans(orgId: string) {
  const rows = await must<{ id: string; reference: string }[]>(
    db.from("transactions").select("id, reference").eq("org_id", orgId).is("deleted_at", null).like("reference", `${OFFSET_REF}:%`).limit(5000),
  );
  const byRef = new Map<string, string[]>();
  for (const r of rows) byRef.set(r.reference, [...(byRef.get(r.reference) ?? []), r.id]);
  for (const [ref, ids] of byRef) {
    if (ids.length === 1) {
      await must(db.from("transactions").update({ deleted_at: new Date().toISOString() }).eq("id", ids[0]).select("id"));
      appendLog({ action: "yarim-mahsup-geri-alindi", reference: ref, id: ids[0] });
    }
  }
}

async function runReconcile(orgId: string): Promise<{ allocations: number; offsets: number }> {
  await repairOrphans(orgId);

  type DocRow = { id: string; contact_id: string; doc_type: string; due_date: string | null; issue_date: string; total: number; paid_amount: number };
  const docRows = await must<DocRow[]>(
    db
      .from("documents")
      .select("id, contact_id, doc_type, due_date, issue_date, total, paid_amount")
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .not("contact_id", "is", null)
      .eq("currency", "TRY")
      .in("payment_status", ["unpaid", "partial"])
      .not("status", "in", '("draft","cancelled","converted")')
      .in("doc_type", [...IN_DOCS, ...OUT_DOCS])
      .limit(5000),
  );
  const docs: RecDoc[] = docRows
    .map((d) => ({
      id: d.id,
      contact_id: d.contact_id,
      doc_type: d.doc_type,
      due: String(d.due_date ?? d.issue_date).slice(0, 10),
      remaining: r2(Number(d.total) - (Number(d.paid_amount) || 0)),
    }))
    .filter((d) => d.remaining > 0.009);
  if (!docs.length) return { allocations: 0, offsets: 0 };

  const contactIds = [...new Set(docs.map((d) => d.contact_id))];
  type TxnRow = { id: string; contact_id: string; direction: "in" | "out"; txn_date: string; amount: number; currency: string };
  const txnRows: TxnRow[] = [];
  for (const part of chunks(contactIds)) {
    txnRows.push(
      ...(await must<TxnRow[]>(
        db
          .from("transactions")
          .select("id, contact_id, direction, txn_date, amount, currency")
          .eq("org_id", orgId)
          .is("deleted_at", null)
          .in("contact_id", part)
          .in("type", REC_TXN_TYPES)
          .in("direction", ["in", "out"])
          .limit(5000),
      )),
    );
  }

  type AllocRow = { transaction_id: string; document_id: string; amount: number; document: { currency: string } | null };
  const allocRows: AllocRow[] = [];
  for (const part of chunks(txnRows.map((t) => t.id))) {
    allocRows.push(
      ...(await must<AllocRow[]>(
        db.from("payment_allocations").select("transaction_id, document_id, amount, document:documents(currency)").in("transaction_id", part).limit(10000),
      )),
    );
  }

  const txns: RecTxn[] = [];
  for (const t of txnRows) {
    if (t.currency !== "TRY") continue;
    const allocs = allocRows.filter((a) => a.transaction_id === t.id);
    // Döviz belgesine bağlı hareketlere dokunma (tutarlar belge para biriminde)
    if (allocs.some((a) => a.document && a.document.currency !== "TRY")) continue;
    const used = allocs.reduce((s, a) => s + Number(a.amount), 0);
    txns.push({
      id: t.id,
      contact_id: t.contact_id,
      direction: t.direction,
      date: t.txn_date,
      unallocated: r2(Number(t.amount) - used),
      allocatedDocIds: allocs.map((a) => a.document_id),
    });
  }

  const plan = planReconcile(docs, txns);

  // 1) Bağlanmamış hareketleri belgelere bağla (aynı çift varsa dokunmaz)
  if (plan.allocations.length) {
    const rows = await Promise.all(
      plan.allocations.map(async (a) => ({
        id: await stableUuid(`alloc:${a.transaction_id}:${a.document_id}`),
        org_id: orgId,
        transaction_id: a.transaction_id,
        document_id: a.document_id,
        amount: a.amount,
      })),
    );
    for (const part of chunks(rows, 100)) {
      await must(db.from("payment_allocations").upsert(part, { onConflict: "transaction_id,document_id", ignoreDuplicates: true }).select("id"));
    }
    appendLog({ action: "baglanti", count: rows.length, rows });
  }

  // 2) Satış ↔ alış mahsubu: giriş + çıkış düzeltme hareketi (kasasız, net etkisi sıfır)
  const today = isoDate();
  for (const o of plan.offsets) {
    const base = await stableUuid(o.key);
    const reference = `${OFFSET_REF}:${base.slice(0, 13)}`;
    const inId = await stableUuid(`${o.key}:in`);
    const outId = await stableUuid(`${o.key}:out`);
    const txn = (id: string, direction: "in" | "out", description: string) => ({
      id,
      org_id: orgId,
      type: "adjustment",
      direction,
      txn_date: today,
      account_id: null,
      contact_id: o.contact_id,
      amount: o.amount,
      currency: "TRY",
      exchange_rate: 1,
      method: "other",
      description,
      reference,
    });
    await must(db.rpc("save_transaction", { p_txn: txn(inId, "in", "Otomatik mahsup · satış faturaları"), p_allocations: o.inAllocs }));
    try {
      await must(db.rpc("save_transaction", { p_txn: txn(outId, "out", "Otomatik mahsup · alış faturaları"), p_allocations: o.outAllocs }));
    } catch (e) {
      // Tek yön kalmasın: girişi geri al (cari bakiye bozulmasın)
      await must(db.from("transactions").update({ deleted_at: new Date().toISOString() }).eq("id", inId).select("id"));
      throw e;
    }
    appendLog({ action: "mahsup", contact_id: o.contact_id, amount: o.amount, reference, inId, outId, in: o.inAllocs, out: o.outAllocs });
  }

  return { allocations: plan.allocations.length, offsets: plan.offsets.length };
}

/**
 * Arka planda cari eşleştirmesini otomatik çalıştırır: açılışta, 3 dakikada bir ve sekmeye dönünce.
 * Aynı anda tek çalışma; sekmeler arası en az 1 dakika ara.
 */
export function AutoReconcileRunner() {
  const { org } = useOrg();
  const qc = useQueryClient();
  const orgId = org?.id;
  const running = React.useRef(false);

  React.useEffect(() => {
    if (!orgId) return;
    let cancelled = false;

    const tick = async () => {
      if (cancelled || running.current || !navigator.onLine || document.visibilityState !== "visible") return;
      try {
        const last = Number(localStorage.getItem(LAST_RUN_KEY) || 0);
        if (Date.now() - last < MIN_GAP_MS) return;
        localStorage.setItem(LAST_RUN_KEY, String(Date.now()));
      } catch {}
      running.current = true;
      try {
        const res = await runReconcile(orgId);
        if (res.allocations || res.offsets) {
          qc.invalidateQueries();
          const parts = [
            res.allocations ? `${res.allocations} tahsilat/ödeme faturaya bağlandı` : null,
            res.offsets ? `${res.offsets} caride satış–alış mahsup edildi` : null,
          ].filter(Boolean);
          toast.success("Otomatik eşleştirme", { description: parts.join(" · ") });
        }
      } catch (e) {
        console.warn("Otomatik eşleştirme yapılamadı:", e);
      } finally {
        running.current = false;
      }
    };

    const first = setTimeout(tick, 4000);
    const timer = setInterval(tick, INTERVAL_MS);
    const onVisible = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearTimeout(first);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [orgId, qc]);

  return null;
}
