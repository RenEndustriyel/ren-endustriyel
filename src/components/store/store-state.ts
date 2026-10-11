"use client";

import { useSyncExternalStore } from "react";
import type { StoreProduct } from "./store-shared";

/** Sepet ve favoriler: bu tarayıcıda (localStorage) saklanır. */
export type StoreItem = Pick<StoreProduct, "id" | "slug" | "name" | "brand" | "cat" | "image" | "price" | "unit" | "pack">;
export type CartLine = StoreItem & { qty: number };
type State = { cart: CartLine[]; favs: StoreItem[] };

const KEY = "ren-magaza-v1";
const EMPTY: State = { cart: [], favs: [] };

let state: State = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function read(): State {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<State>;
    return { cart: Array.isArray(parsed.cart) ? parsed.cart : [], favs: Array.isArray(parsed.favs) ? parsed.favs : [] };
  } catch {
    return EMPTY;
  }
}

function ensureLoaded() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  state = read();
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY) return;
    state = read();
    listeners.forEach((l) => l());
  });
}

function set(next: State) {
  state = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // depolama kapalıysa sepet yalnızca bu sekmede yaşar
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  ensureLoaded();
  listeners.add(l);
  return () => listeners.delete(l);
};
const getSnapshot = () => {
  ensureLoaded();
  return state;
};
const getServerSnapshot = () => EMPTY;

export const pick = (p: StoreItem): StoreItem => ({ id: p.id, slug: p.slug, name: p.name, brand: p.brand, cat: p.cat, image: p.image, price: p.price, unit: p.unit, pack: p.pack });

export const storeActions = {
  add(p: StoreItem, qty = 1) {
    const cur = getSnapshot();
    const exists = cur.cart.some((l) => l.slug === p.slug);
    const cart = exists ? cur.cart.map((l) => (l.slug === p.slug ? { ...l, ...pick(p), qty: l.qty + qty } : l)) : [...cur.cart, { ...pick(p), qty }];
    set({ ...cur, cart });
  },
  setQty(slug: string, qty: number) {
    const cur = getSnapshot();
    const cart = qty <= 0 ? cur.cart.filter((l) => l.slug !== slug) : cur.cart.map((l) => (l.slug === slug ? { ...l, qty: Math.min(qty, 9999) } : l));
    set({ ...cur, cart });
  },
  remove(slug: string) {
    const cur = getSnapshot();
    set({ ...cur, cart: cur.cart.filter((l) => l.slug !== slug) });
  },
  clear() {
    set({ ...getSnapshot(), cart: [] });
  },
  toggleFav(p: StoreItem) {
    const cur = getSnapshot();
    const has = cur.favs.some((f) => f.slug === p.slug);
    set({ ...cur, favs: has ? cur.favs.filter((f) => f.slug !== p.slug) : [...cur.favs, pick(p)] });
    return !has;
  },
};

export function useStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Sepet özeti: fiyatlı satırların toplamı + fiyatı sorulacak satır sayısı */
export function cartSummary(cart: CartLine[]) {
  const count = cart.reduce((s, l) => s + l.qty, 0);
  const subtotal = cart.reduce((s, l) => s + (l.price ?? 0) * l.qty, 0);
  const unpriced = cart.filter((l) => l.price === undefined).length;
  return { count, subtotal, unpriced, lines: cart.length };
}
