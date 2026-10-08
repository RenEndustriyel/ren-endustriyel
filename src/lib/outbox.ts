"use client";

/**
 * Giden kutusu (çevrimdışı kayıt kuyruğu)
 * ---------------------------------------
 * Bağlantı yokken ya da gönderim sırasında bağlantı koptuğunda yazma işlemi bilgisayarın
 * IndexedDB deposuna HEMEN (await ile) yazılır; uygulama kapansa da kaybolmaz.
 * Bağlantı gelince sırayla gönderilir. Kimlikler istemcide üretildiği için aynı işlem iki kez
 * gönderilse de çift kayıt oluşmaz. Sunucu bir kaydı reddederse kayıt SİLİNMEZ: "gönderilemedi"
 * olarak işaretlenir, gönderim durur ve kullanıcıya gösterilir (sonraki kayıtlar ona bağlı olabilir).
 */

import { createStore, del, entries, set } from "idb-keyval";

export type OutboxOp =
  | { kind: "upsert"; table: string; row: Record<string, unknown> }
  | { kind: "update"; table: string; id: string; patch: Record<string, unknown>; idColumn?: string }
  | { kind: "rpc"; fn: string; args: Record<string, unknown> };

export type OutboxItem = {
  key: string;
  seq: number;
  op: OutboxOp;
  label: string;
  createdAt: string;
  attempts: number;
  status: "pending" | "failed";
  error?: string;
};

const store = typeof indexedDB !== "undefined" ? createStore("ren-giden-kutusu", "kayitlar") : undefined;

let items: OutboxItem[] = [];
let loaded = false;
let flushing = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const outbox = {
  subscribe(cb: () => void) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  snapshot: () => items,
  flushing: () => flushing,
};

/** Depodaki bekleyen kayıtları belleğe al (uygulama açılışında) */
export async function loadOutbox() {
  if (!store) return;
  const all = (await entries<string, OutboxItem>(store)).map(([, v]) => v);
  items = all.sort((a, b) => a.seq - b.seq);
  loaded = true;
  emit();
}

let counter = 0;
/** Kaydı depoya YAZAR ve döner (yazılana kadar bekler) */
export async function enqueue(op: OutboxOp, label: string): Promise<OutboxItem> {
  if (!loaded) await loadOutbox();
  const item: OutboxItem = {
    key: `${Date.now()}-${++counter}-${Math.random().toString(36).slice(2, 8)}`,
    seq: Date.now() * 1000 + (counter % 1000),
    op,
    label,
    createdAt: new Date().toISOString(),
    attempts: 0,
    status: "pending",
  };
  if (store) await set(item.key, item, store);
  items = [...items, item].sort((a, b) => a.seq - b.seq);
  emit();
  return item;
}

export const hasPending = () => items.length > 0;

export const isNetworkError = (e: unknown) =>
  /Failed to fetch|NetworkError|Load failed|fetch failed|ERR_INTERNET|ERR_NETWORK|network/i.test(String((e as Error)?.message ?? e));

type Exec = (op: OutboxOp) => Promise<unknown>;
let executor: Exec | null = null;
let afterFlush: (() => void) | null = null;
export function setOutboxExecutor(exec: Exec, onDone?: () => void) {
  executor = exec;
  afterFlush = onDone ?? null;
}

/** Bekleyenleri sırayla gönderir. Ağ hatasında durur (sonra tekrar denenir); sunucu reddederse kaydı işaretleyip durur. */
export async function flushOutbox(): Promise<{ sent: number; failed: boolean }> {
  if (flushing || !executor) return { sent: 0, failed: false };
  if (!loaded) await loadOutbox();
  if (typeof navigator !== "undefined" && !navigator.onLine) return { sent: 0, failed: false };
  flushing = true;
  emit();
  let sent = 0;
  let failed = false;
  try {
    for (const it of [...items]) {
      if (it.status === "failed") {
        failed = true;
        break;
      }
      try {
        await executor(it.op);
        if (store) await del(it.key, store);
        items = items.filter((x) => x.key !== it.key);
        sent++;
        emit();
      } catch (e) {
        const upd: OutboxItem = { ...it, attempts: it.attempts + 1 };
        if (!isNetworkError(e)) {
          upd.status = "failed";
          upd.error = (e as { message?: string })?.message ?? String(e);
          failed = true;
        }
        if (store) await set(it.key, upd, store);
        items = items.map((x) => (x.key === it.key ? upd : x));
        emit();
        break;
      }
    }
  } finally {
    flushing = false;
    emit();
    if (sent) afterFlush?.();
  }
  return { sent, failed };
}

/** Gönderilemeyen kaydı yeniden denemeye aç */
export async function retryItem(key: string) {
  const it = items.find((x) => x.key === key);
  if (!it) return;
  const upd: OutboxItem = { ...it, status: "pending", error: undefined };
  if (store) await set(key, upd, store);
  items = items.map((x) => (x.key === key ? upd : x));
  emit();
  return flushOutbox();
}

/** Kaydı kuyruktan kalıcı olarak çıkarır (kullanıcı onayıyla) */
export async function discardItem(key: string) {
  if (store) await del(key, store);
  items = items.filter((x) => x.key !== key);
  emit();
}
