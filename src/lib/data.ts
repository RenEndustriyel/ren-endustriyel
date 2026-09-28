"use client";

/**
 * Veri katmanı
 * ------------
 * - Okuma: `useRows` bir firmanın tablosunu (silinmemiş satırlar) çeker; sonuç IndexedDB'de
 *   saklandığı için çevrimdışıyken de ekranda kalır.
 * - Yazma: tüm yazmalar üç mutasyon türünden biriyle yapılır (upsert / update / rpc).
 *   Çevrimdışıyken mutasyon "duraklatılır", IndexedDB'ye yazılır ve bağlantı gelince
 *   sırayla (scope: sync) gönderilir. Kimlikler istemcide üretildiği için sunucu tarafı idempotenttir.
 */

import * as React from "react";
import {
  onlineManager,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import { errorMessage } from "@/lib/errors";
import { useOrg } from "@/providers/org-provider";

export type TableName = keyof Database["public"]["Tables"];
export type Row<T extends TableName> = Database["public"]["Tables"][T]["Row"];
export type FnName = keyof Database["public"]["Functions"];

export const newId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
        (Number(c) ^ (Math.random() * 16) >> (Number(c) / 4)).toString(16),
      );

// ---------------------------------------------------------------------------
// Mutasyon tanımları (sayfa yenilense de duraklatılmış mutasyonlar devam edebilsin diye
// fonksiyonlar QueryClient varsayılanı olarak kaydedilir)
// ---------------------------------------------------------------------------
type UpsertVars = { table: TableName; row: Record<string, unknown> };
type UpdateVars = { table: TableName; id: string; patch: Record<string, unknown>; idColumn?: string };
type RpcVars = { fn: FnName; args: Record<string, unknown> };

// Supabase istemcisinin katı tiplerini dinamik tablo adıyla kullanabilmek için gevşek erişim
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

async function doUpsert({ table, row }: UpsertVars) {
  const { data, error } = await db.from(table).upsert(row).select().single();
  if (error) throw error;
  return data;
}
async function doUpdate({ table, id, patch, idColumn = "id" }: UpdateVars) {
  const { data, error } = await db.from(table).update(patch).eq(idColumn, id).select();
  if (error) throw error;
  return data?.[0] ?? null;
}
async function doRpc({ fn, args }: RpcVars) {
  const { data, error } = await db.rpc(fn, args);
  if (error) throw error;
  return data;
}

const isNetworkError = (e: unknown) => /Failed to fetch|NetworkError|Load failed|fetch failed/i.test(String((e as Error)?.message ?? e));

export function registerMutationDefaults(qc: QueryClient) {
  const common = {
    scope: { id: "sync" }, // sırayla gönder
    retry: (count: number, err: unknown) => isNetworkError(err) && count < 5,
    retryDelay: (n: number) => Math.min(1000 * 2 ** n, 15000),
  };
  qc.setMutationDefaults(["upsert"], { mutationFn: (v: UpsertVars) => doUpsert(v), ...common });
  qc.setMutationDefaults(["update"], { mutationFn: (v: UpdateVars) => doUpdate(v), ...common });
  qc.setMutationDefaults(["rpc"], { mutationFn: (v: RpcVars) => doRpc(v), ...common });
}

// ---------------------------------------------------------------------------
// Okuma
// ---------------------------------------------------------------------------
export const tableKey = (table: TableName, orgId: string | undefined, ...extra: unknown[]): QueryKey => [
  "t",
  table,
  orgId,
  ...extra,
];

type RowsOptions = {
  select?: string;
  order?: { column: string; ascending?: boolean }[];
  /** ek filtre (supabase sorgu zinciri) */
  filter?: (q: ReturnType<typeof db.from>) => ReturnType<typeof db.from>;
  /** sorgu anahtarına eklenecek parametreler (filtre değişince yeniden çekmek için) */
  params?: unknown[];
  enabled?: boolean;
  softDelete?: boolean;
  limit?: number;
  /** istemci tarafı sıralama */
  sort?: (a: never, b: never) => number;
};

export function useRows<T = Record<string, unknown>>(table: TableName, opts: RowsOptions = {}) {
  const { org } = useOrg();
  const orgId = org?.id;
  return useQuery({
    queryKey: tableKey(table, orgId, opts.select ?? "*", ...(opts.params ?? [])),
    enabled: !!orgId && opts.enabled !== false,
    queryFn: async () => {
      let q = db.from(table).select(opts.select ?? "*").eq("org_id", orgId);
      if (opts.softDelete !== false) q = q.is("deleted_at", null);
      if (opts.filter) q = opts.filter(q);
      for (const o of opts.order ?? []) q = q.order(o.column, { ascending: o.ascending ?? true });
      q = q.limit(opts.limit ?? 5000);
      const { data, error } = await q;
      if (error) throw error;
      return (opts.sort ? [...(data as never[])].sort(opts.sort) : data) as T[];
    },
  });
}

export function useRow<T = Record<string, unknown>>(table: TableName, id: string | null | undefined, select = "*") {
  const qc = useQueryClient();
  const { org } = useOrg();
  return useQuery({
    queryKey: ["row", table, id, select],
    enabled: !!id && !!org,
    queryFn: async () => {
      const { data, error } = await db.from(table).select(select).eq("id", id).maybeSingle();
      if (error) throw error;
      return data as T | null;
    },
    // listeden gelen satırı başlangıç verisi olarak kullan (çevrimdışı açılış için)
    initialData: () => {
      const lists = qc.getQueriesData<Record<string, unknown>[]>({ queryKey: ["t", table, org?.id] });
      for (const [, rows] of lists) {
        const hit = Array.isArray(rows) ? rows.find((r) => r.id === id) : undefined;
        if (hit) return hit as T;
      }
      return undefined;
    },
    initialDataUpdatedAt: 0,
  });
}

export function useRpcQuery<T>(fn: FnName, args: Record<string, unknown>, opts: { enabled?: boolean; key?: unknown[] } = {}) {
  return useQuery({
    queryKey: ["rpc", fn, args, ...(opts.key ?? [])],
    enabled: opts.enabled !== false,
    queryFn: async () => (await doRpc({ fn, args })) as T,
  });
}

// ---------------------------------------------------------------------------
// Yazma
// ---------------------------------------------------------------------------

/** Tablo listelerindeki önbelleği iyimser olarak günceller */
function patchListCaches(qc: QueryClient, table: TableName, row: Record<string, unknown>, remove = false) {
  qc.setQueriesData<Record<string, unknown>[]>({ queryKey: ["t", table] }, (old) => {
    if (!Array.isArray(old)) return old;
    const idx = old.findIndex((r) => r.id === row.id);
    if (remove || row.deleted_at) return idx >= 0 ? old.filter((_, i) => i !== idx) : old;
    if (idx >= 0) {
      const copy = old.slice();
      copy[idx] = { ...old[idx], ...row };
      return copy;
    }
    return [row, ...old];
  });
  qc.setQueriesData<Record<string, unknown>>({ queryKey: ["row", table, row.id] }, (old) =>
    old && !remove ? { ...old, ...row } : old,
  );
}

export type SaveResult<T> = { data?: T; queued: boolean };

/**
 * Çevrimiçiyse sonucu bekler (hata gösterilir); çevrimdışıysa işlemi kuyruğa alır ve hemen döner.
 */
async function runOrQueue<T>(mutateAsync: () => Promise<T>, mutate: () => void, successMsg?: string): Promise<SaveResult<T>> {
  if (!onlineManager.isOnline()) {
    mutate();
    toast.info("Çevrimdışı kaydedildi", { description: "Bağlantı gelince otomatik gönderilecek." });
    return { queued: true };
  }
  try {
    const data = await mutateAsync();
    if (successMsg) toast.success(successMsg);
    return { data, queued: false };
  } catch (e) {
    if (isNetworkError(e)) {
      toast.info("Bağlantı koptu", { description: "Kayıt kuyruğa alındı, bağlantı gelince gönderilecek." });
      return { queued: true };
    }
    toast.error(errorMessage(e));
    throw e;
  }
}

function invalidateAfter(qc: QueryClient) {
  // etkin sorguları tazele (listeler, panel, raporlar)
  qc.invalidateQueries();
}

export function useSave(table: TableName) {
  const qc = useQueryClient();
  const { org } = useOrg();
  const m = useMutation<unknown, Error, UpsertVars>({
    mutationKey: ["upsert"],
    onMutate: (v) => patchListCaches(qc, v.table, v.row),
    onSettled: () => invalidateAfter(qc),
  });
  return {
    isPending: m.isPending,
    save: <T = Record<string, unknown>>(row: Record<string, unknown>, successMsg?: string) => {
      const full = { id: newId(), org_id: org?.id, ...row };
      return runOrQueue<T>(
        () => m.mutateAsync({ table, row: full }) as Promise<T>,
        () => m.mutate({ table, row: full }),
        successMsg,
      ).then((r) => ({ ...r, data: (r.data ?? full) as T }));
    },
  };
}

export function useUpdate(table: TableName) {
  const qc = useQueryClient();
  const m = useMutation<unknown, Error, UpdateVars>({
    mutationKey: ["update"],
    onMutate: (v) => patchListCaches(qc, v.table, { id: v.id, ...v.patch }),
    onSettled: () => invalidateAfter(qc),
  });
  return {
    isPending: m.isPending,
    update: (id: string, patch: Record<string, unknown>, successMsg?: string) =>
      runOrQueue(
        () => m.mutateAsync({ table, id, patch }),
        () => m.mutate({ table, id, patch }),
        successMsg,
      ),
    /** yumuşak silme */
    remove: (id: string, successMsg = "Silindi") =>
      runOrQueue(
        () => m.mutateAsync({ table, id, patch: { deleted_at: new Date().toISOString() } }),
        () => m.mutate({ table, id, patch: { deleted_at: new Date().toISOString() } }),
        successMsg,
      ),
  };
}

export function useRpc<T = unknown>(fn: FnName, optimistic?: (qc: QueryClient, args: Record<string, unknown>) => void) {
  const qc = useQueryClient();
  const m = useMutation<unknown, Error, RpcVars>({
    mutationKey: ["rpc"],
    onMutate: (v) => optimistic?.(qc, v.args),
    onSettled: () => invalidateAfter(qc),
  });
  return {
    isPending: m.isPending,
    call: (args: Record<string, unknown>, successMsg?: string) =>
      runOrQueue<T>(
        () => m.mutateAsync({ fn, args }) as Promise<T>,
        () => m.mutate({ fn, args }),
        successMsg,
      ),
  };
}

export { patchListCaches };

/** Bekleyen (gönderilmemiş) değişiklik sayısı */
export function usePendingSync() {
  const qc = useQueryClient();
  return React.useSyncExternalStore(
    (cb) => qc.getMutationCache().subscribe(cb),
    () => qc.getMutationCache().getAll().filter((m) => m.state.isPaused || m.state.status === "pending").length,
    () => 0,
  );
}

// ---------------------------------------------------------------------------
// Sık kullanılan listeler
// ---------------------------------------------------------------------------
export const useUnits = () => useRows<Row<"units">>("units", { order: [{ column: "sort_order" }] });
export const useWarehouses = () => useRows<Row<"warehouses">>("warehouses", { order: [{ column: "created_at" }] });
const ACCOUNT_TYPE_ORDER: Record<string, number> = { cash: 0, bank: 1, credit_card: 2 };
/** Kasa → banka → kredi kartı sırasıyla (varsayılan hesap seçimi için) */
export const useAccounts = () =>
  useRows<Row<"accounts">>("accounts", {
    order: [{ column: "sort_order" }, { column: "created_at" }],
    sort: (a: Row<"accounts">, b: Row<"accounts">) => (ACCOUNT_TYPE_ORDER[a.type] ?? 9) - (ACCOUNT_TYPE_ORDER[b.type] ?? 9),
  });
export const useCategories = (type?: string) =>
  useRows<Row<"categories">>("categories", {
    order: [{ column: "sort_order" }, { column: "name" }],
    params: [type],
    filter: type ? (q) => q.eq("type", type) : undefined,
  });
export const useEmployees = () => useRows<Row<"employees">>("employees", { order: [{ column: "name" }] });
export const usePriceLists = () => useRows<Row<"price_lists">>("price_lists", { order: [{ column: "created_at" }] });
export const useContacts = () => useRows<Row<"contacts">>("contacts", { order: [{ column: "name" }] });
export const useProducts = () => useRows<Row<"products">>("products", { order: [{ column: "name" }] });

export type ContactBalance = { contact_id: string; balance: number; includes_orders?: boolean };
export function useContactBalances() {
  const cb = useRows<ContactBalance>("contact_balances" as TableName, { softDelete: false, select: "*" });
  const openOrders = useRows<Row<"documents">>("documents", {
    params: ["open_orders_balance"],
    filter: (q) =>
      q.in("doc_type", ["sales_order", "purchase_order"]).not("status", "in", '("draft","cancelled","converted")'),
    select: "id, contact_id, doc_type, total_try, total, exchange_rate, status",
  });

  const mergedData = React.useMemo(() => {
    if (!cb.data) return cb.data;
    // Eğer veritabanı görünümü siparişleri zaten içeriyorsa tekrar ekleme
    const first = cb.data[0] as unknown as { includes_orders?: boolean } | undefined;
    if (first && first.includes_orders) return cb.data;

    const adjustments = new Map<string, number>();
    for (const doc of openOrders.data ?? []) {
      if (!doc.contact_id) continue;
      const amt = Number(doc.total_try ?? Number(doc.total) * Number(doc.exchange_rate || 1));
      const sign = doc.doc_type === "sales_order" ? 1 : -1;
      adjustments.set(doc.contact_id, (adjustments.get(doc.contact_id) ?? 0) + sign * amt);
    }

    if (adjustments.size === 0) return cb.data;

    const seen = new Set<string>();
    const res = cb.data.map((b) => {
      seen.add(b.contact_id);
      const adj = adjustments.get(b.contact_id) ?? 0;
      return {
        ...b,
        balance: Math.round((Number(b.balance) + adj) * 100) / 100,
      };
    });

    for (const [cId, adj] of adjustments.entries()) {
      if (!seen.has(cId)) {
        res.push({ contact_id: cId, balance: Math.round(adj * 100) / 100 });
      }
    }

    return res;
  }, [cb.data, openOrders.data]);

  return {
    ...cb,
    data: mergedData,
  };
}
