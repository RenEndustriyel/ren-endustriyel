"use client";

import { useSyncExternalStore } from "react";
import type { CartLine } from "./store-state";

/**
 * Mağaza yönetimi ÖNİZLEME verisi: ürün ayarları, mağaza ayarları ve siparişler
 * yalnızca bu tarayıcıda (localStorage) tutulur. Veritabanına bağlanınca bu dosyanın
 * okuma/yazma işlevleri Supabase'e taşınacak; bileşenler aynı kalır.
 */
export type ProductOverride = {
  /** Mağazada gizli */
  hidden?: boolean;
  /** Mağaza fiyatı; null = "fiyat sorunuz", tanımsız = katalogdaki değer */
  price?: number | null;
};

export type StoreSettings = {
  announcement: string;
  shippingFee: number;
  freeShippingOver: number;
  payHavale: boolean;
  payOnay: boolean;
};

export const ORDER_STATUSES = [
  { value: "yeni", label: "Yeni", tone: "warning" },
  { value: "onaylandi", label: "Onaylandı", tone: "primary" },
  { value: "hazirlaniyor", label: "Hazırlanıyor", tone: "primary" },
  { value: "yolda", label: "Teslimatta", tone: "primary" },
  { value: "tamamlandi", label: "Tamamlandı", tone: "success" },
  { value: "iptal", label: "İptal", tone: "danger" },
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number]["value"];

export type StoreOrder = {
  ref: string;
  createdAt: string;
  customer: Record<string, string>;
  payment: string;
  lines: CartLine[];
  subtotal: number;
  unpriced: number;
  shipping?: number;
};

export type OrderMeta = { status: OrderStatus; note?: string };

type AdminState = { products: Record<string, ProductOverride>; orders: Record<string, OrderMeta>; settings: StoreSettings };
type State = AdminState & { orderList: StoreOrder[] };

const ADMIN_KEY = "ren-magaza-yonetim-v1";
export const ORDERS_KEY = "ren-magaza-siparisler";

export const DEFAULT_SETTINGS: StoreSettings = {
  announcement: "Önizleme sürümü · Fiyatlar örnektir, çevrimiçi ödeme henüz açık değildir.",
  shippingFee: 0,
  freeShippingOver: 0,
  payHavale: true,
  payOnay: true,
};

const EMPTY: State = { products: {}, orders: {}, settings: DEFAULT_SETTINGS, orderList: [] };

let state: State = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function read(): State {
  let admin: Partial<AdminState> = {};
  let orderList: StoreOrder[] = [];
  try {
    admin = JSON.parse(window.localStorage.getItem(ADMIN_KEY) || "{}") as Partial<AdminState>;
    const o = JSON.parse(window.localStorage.getItem(ORDERS_KEY) || "[]") as StoreOrder[];
    if (Array.isArray(o)) orderList = o;
  } catch {
    // bozuk kayıt: varsayılanlarla devam
  }
  return { products: admin.products ?? {}, orders: admin.orders ?? {}, settings: { ...DEFAULT_SETTINGS, ...admin.settings }, orderList };
}

function ensureLoaded() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  state = read();
  window.addEventListener("storage", (e) => {
    if (e.key !== ADMIN_KEY && e.key !== ORDERS_KEY) return;
    state = read();
    listeners.forEach((l) => l());
  });
}

function commit(next: State, ordersChanged = false) {
  state = next;
  try {
    const { orderList, ...admin } = next;
    window.localStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
    if (ordersChanged) window.localStorage.setItem(ORDERS_KEY, JSON.stringify(orderList));
  } catch {
    // depolama kapalıysa değişiklik yalnızca bu sekmede kalır
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  ensureLoaded();
  listeners.add(l);
  return () => listeners.delete(l);
};
const snapshot = () => {
  ensureLoaded();
  return state;
};

export function usePreviewAdmin() {
  return useSyncExternalStore(subscribe, snapshot, () => EMPTY);
}

export const previewAdmin = {
  setProducts(ids: string[], patch: ProductOverride) {
    const cur = snapshot();
    const products = { ...cur.products };
    for (const id of ids) products[id] = { ...products[id], ...patch };
    commit({ ...cur, products });
  },
  setPrices(prices: Record<string, number>) {
    const cur = snapshot();
    const products = { ...cur.products };
    for (const [id, price] of Object.entries(prices)) products[id] = { ...products[id], price };
    commit({ ...cur, products });
  },
  setSettings(patch: Partial<StoreSettings>) {
    const cur = snapshot();
    commit({ ...cur, settings: { ...cur.settings, ...patch } });
  },
  setOrder(ref: string, patch: Partial<OrderMeta>) {
    const cur = snapshot();
    commit({ ...cur, orders: { ...cur.orders, [ref]: { ...(cur.orders[ref] ?? { status: "yeni" }), ...patch } } });
  },
  addOrder(order: StoreOrder) {
    const cur = snapshot();
    commit({ ...cur, orderList: [order, ...cur.orderList].slice(0, 200) }, true);
  },
  removeOrder(ref: string) {
    const cur = snapshot();
    const orders = { ...cur.orders };
    delete orders[ref];
    commit({ ...cur, orders, orderList: cur.orderList.filter((o) => o.ref !== ref) }, true);
  },
};

/** Teslimat ücreti: ücretsiz eşiği aşıldıysa 0 */
export const shippingFor = (subtotal: number, s: StoreSettings) => (s.shippingFee > 0 && !(s.freeShippingOver > 0 && subtotal >= s.freeShippingOver) ? s.shippingFee : 0);

/** Ürüne önizleme ayarlarını uygular (mağaza tarafında) */
export function applyOverride<T extends { id?: string; price?: number }>(p: T, products: Record<string, ProductOverride>): T & { hidden: boolean } {
  const o = p.id ? products[p.id] : undefined;
  if (!o) return { ...p, hidden: false };
  const price = o.price === undefined ? p.price : (o.price ?? undefined);
  return { ...p, price, hidden: !!o.hidden };
}
