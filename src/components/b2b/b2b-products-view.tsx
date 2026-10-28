"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Package,
  CheckCircle2,
  Send,
  X,
  FileCheck,
  Building2,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { useCategories, useProducts, useRpc, useUnits, type Row } from "@/lib/data";
import { formatMoney, formatQty, isoDate } from "@/lib/format";
import { useOrg } from "@/providers/org-provider";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { textMatches } from "@/lib/search";

type Product = Row<"products">;

export interface B2BCartItem {
  id: string; // product_id
  product: Product;
  quantity: number;
}

const newDocNumber = () => {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const rnd = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SIP-${yy}${mm}${dd}-${rnd}`;
};

export function B2BProductsView() {
  const router = useRouter();
  const { user } = useAuth();
  const { org: currentOrg, b2bContactId } = useOrg();
  const productsQuery = useProducts();
  const categoriesQuery = useCategories("product");
  const unitsQuery = useUnits();
  const saveDoc = useRpc("save_document");

  // Arama & Kategori filtresi
  const [q, setQ] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all");

  // Sepet state'i (localStorage destekli)
  const cartStorageKey = React.useMemo(
    () => `ren_b2b_cart_${currentOrg?.id || "default"}`,
    [currentOrg?.id]
  );

  const [cart, setCart] = React.useState<B2BCartItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem(`ren_b2b_cart_${currentOrg?.id || "default"}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  React.useEffect(() => {
    try {
      localStorage.setItem(cartStorageKey, JSON.stringify(cart));
    } catch {}
  }, [cart, cartStorageKey]);

  // Sepet Modal & Tamamlama
  const [cartOpen, setCartOpen] = React.useState(false);
  const [orderNote, setOrderNote] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [successOrder, setSuccessOrder] = React.useState<{ number: string; total: number } | null>(null);

  // Ürün birimleri haritası
  const unitMap = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const u of unitsQuery.data ?? []) {
      map.set(u.id, u.name);
    }
    return map;
  }, [unitsQuery.data]);

  // Sepete ekleme / adet güncelleme
  const addToCart = (product: Product, delta = 1) => {
    setCart((prev) => {
      const idx = prev.findIndex((item) => item.id === product.id);
      if (idx >= 0) {
        const nextQty = prev[idx].quantity + delta;
        if (nextQty <= 0) {
          return prev.filter((_, i) => i !== idx);
        }
        const updated = [...prev];
        updated[idx] = { ...updated[idx], quantity: nextQty };
        return updated;
      } else {
        if (delta <= 0) return prev;
        return [...prev, { id: product.id, product, quantity: delta }];
      }
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const getQtyInCart = (productId: string) => {
    const item = cart.find((i) => i.id === productId);
    return item ? item.quantity : 0;
  };

  // Sepet toplamları
  const cartSummary = React.useMemo(() => {
    let subtotal = 0; // KDV hariç
    let vatTotal = 0;
    let total = 0; // KDV dahil
    let totalCount = 0;

    for (const item of cart) {
      const p = item.product;
      const rawPrice = Number(p.sale_price) || 0;
      const vatRate = Number(p.vat_rate) || 20;
      const inclVat = !!p.sale_price_includes_vat;

      let unitPriceExVat = 0;
      let unitPriceIncVat = 0;

      if (inclVat) {
        unitPriceIncVat = rawPrice;
        unitPriceExVat = rawPrice / (1 + vatRate / 100);
      } else {
        unitPriceExVat = rawPrice;
        unitPriceIncVat = rawPrice * (1 + vatRate / 100);
      }

      const lineSubtotal = unitPriceExVat * item.quantity;
      const lineTotal = unitPriceIncVat * item.quantity;
      const lineVat = lineTotal - lineSubtotal;

      subtotal += lineSubtotal;
      vatTotal += lineVat;
      total += lineTotal;
      totalCount += item.quantity;
    }

    return { subtotal, vatTotal, total, totalCount, itemCount: cart.length };
  }, [cart]);

  // Ürün filtreleme
  const filteredProducts = React.useMemo(() => {
    const list = productsQuery.data ?? [];
    return list.filter((p) => {
      // Sadece aktif ve silinmemiş ürünler
      if (p.deleted_at || p.is_active === false) return false;

      // Kategori filtresi
      if (selectedCategory !== "all" && p.category_id !== selectedCategory) {
        return false;
      }

      // Metin araması
      if (q.trim()) {
        const match =
          textMatches(p.name, q) ||
          (p.barcode && textMatches(p.barcode, q)) ||
          (p.code && textMatches(p.code, q));
        if (!match) return false;
      }

      return true;
    });
  }, [productsQuery.data, selectedCategory, q]);

  // Siparişi onaylayıp kaydetme
  const handleSubmitOrder = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);

    try {
      const docNum = newDocNumber();
      const today = isoDate();

      const docPayload = {
        id: crypto.randomUUID(),
        org_id: currentOrg!.id,
        doc_type: "sales_order",
        number: docNum,
        issue_date: today,
        due_date: today,
        contact_id: b2bContactId || null,
        currency: "TRY",
        exchange_rate: 1,
        prices_include_vat: true,
        discount_type: "percentage",
        discount_value: 0,
        status: "pending",
        payment_status: "unpaid",
        description: `B2B Siparişi · ${user?.email || "Müşteri"} (${cart.length} Kalem)`,
        notes: orderNote.trim() || null,
      };

      const docLines = cart.map((item) => {
        const p = item.product;
        const vatRate = Number(p.vat_rate) || 20;
        const rawPrice = Number(p.sale_price) || 0;

        return {
          id: crypto.randomUUID(),
          product_id: p.id,
          description: p.name,
          quantity: item.quantity,
          unit_id: p.unit_id || null,
          unit_factor: 1,
          unit_price: rawPrice,
          vat_rate: vatRate,
          discount_rate: 0,
        };
      });

      await saveDoc.call(
        {
          p_doc: docPayload,
          p_lines: docLines,
          p_payment: null,
        },
        "Siparişiniz başarıyla alındı!"
      );

      setSuccessOrder({ number: docNum, total: cartSummary.total });
      clearCart();
      setOrderNote("");
      setCartOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Sipariş iletilirken bir hata oluştu");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] pb-24">
      {/* Üst Karşılama ve Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-900 via-brand-800 to-indigo-900 p-6 text-white shadow-xl shadow-brand-950/10 mb-6">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-md">
              <Building2 size={13} className="text-brand-300" />
              <span>B2B Bayi & Müşteri Portalı</span>
            </div>
            <h1 className="mt-2 text-2xl md:text-3xl font-extrabold tracking-tight">
              Ürün Kataloğu ve Doğrudan Sipariş
            </h1>
            <p className="mt-1 text-sm text-brand-200/90 max-w-xl">
              Fiyatları inceleyip siparişinizi oluşturun. Verdiğiniz sipariş doğrudan hazırlık aşamasına alınır ve her adımı takip edebilirsiniz.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/siparislerim">
              <Button
                variant="outline"
                className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              >
                <Clock size={16} className="mr-2" />
                Siparişlerim & Takip
              </Button>
            </Link>

            <Button
              onClick={() => setCartOpen(true)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-950/20"
            >
              <ShoppingCart size={18} className="mr-2" />
              Sepetim ({cartSummary.itemCount})
            </Button>
          </div>
        </div>
      </div>

      {/* Arama ve Kategori Filtreleme Çubuğu */}
      <div className="sticky top-16 z-20 mb-6 flex flex-col sm:flex-row gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-3 shadow-sm backdrop-blur-md">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ürün adı, barkod, marka veya kod ile ara..."
            className="pl-10 h-10 bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800"
          />
          {q && (
            <button
              onClick={() => setQ("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Kategoriler */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none items-center">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={cn(
              "shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition",
              selectedCategory === "all"
                ? "bg-brand-600 text-white shadow-sm"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            )}
          >
            Tüm Ürünler ({productsQuery.data?.length ?? 0})
          </button>
          {(categoriesQuery.data ?? []).map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition",
                selectedCategory === cat.id
                  ? "bg-brand-600 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Ürün Listesi Grid */}
      {productsQuery.isPending ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-72 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
          <Package size={48} className="text-slate-300 dark:text-slate-600 mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">Aradığınız kriterlere uygun ürün bulunamadı</h3>
          <p className="text-xs text-slate-500 mt-1">Arama kelimesini değiştirmeyi veya filtreleri sıfırlamayı deneyebilirsiniz.</p>
          {(q || selectedCategory !== "all") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setQ("");
                setSelectedCategory("all");
              }}
              className="mt-4"
            >
              Filtreleri Temizle
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.map((p) => {
            const inCart = getQtyInCart(p.id);
            const rawPrice = Number(p.sale_price) || 0;
            const vatRate = Number(p.vat_rate) || 20;
            const inclVat = !!p.sale_price_includes_vat;

            const priceIncVat = inclVat ? rawPrice : rawPrice * (1 + vatRate / 100);
            const priceExVat = inclVat ? rawPrice / (1 + vatRate / 100) : rawPrice;
            const unitName = p.unit_id ? unitMap.get(p.unit_id) || "Adet" : "Adet";

            return (
              <div
                key={p.id}
                className={cn(
                  "group relative flex flex-col justify-between rounded-2xl border bg-white dark:bg-slate-900 p-4 shadow-sm transition hover:shadow-md",
                  inCart > 0
                    ? "border-emerald-500/60 ring-2 ring-emerald-500/20"
                    : "border-slate-200 dark:border-slate-800"
                )}
              >
                <div>
                  {/* Görsel / İkon */}
                  <div className="relative mb-3 flex h-44 w-full items-center justify-center overflow-hidden rounded-xl bg-slate-50 dark:bg-slate-950 p-2">
                    {p.image_path ? (
                      <img
                        src={p.image_path}
                        alt={p.name}
                        className="h-full w-full object-contain transition duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-300 dark:text-slate-600">
                        <Package size={40} />
                        <span className="mt-1 text-[10px] font-medium">Görsel Yok</span>
                      </div>
                    )}

                    {/* Stok durumu rozeti */}
                    <div className="absolute top-2 left-2">
                      <Badge tone="success" className="text-[10px] font-semibold">
                        Stokta Mevcut
                      </Badge>
                    </div>

                    {inCart > 0 && (
                      <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] font-bold text-white shadow-md">
                        <CheckCircle2 size={12} />
                        <span>{inCart} {unitName}</span>
                      </div>
                    )}
                  </div>

                  {/* Ürün Bilgisi */}
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug">
                    {p.name}
                  </h3>

                  {p.barcode && (
                    <p className="mt-1 text-[11px] text-slate-400 font-mono">
                      Kod: {p.barcode}
                    </p>
                  )}
                </div>

                {/* Fiyat ve Sepet Kontrolü */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="mb-3">
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-50">
                        {formatMoney(priceIncVat, "TRY")}
                      </span>
                      <span className="text-[10px] font-medium text-slate-400">/ {unitName}</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {formatMoney(priceExVat, "TRY")} + %{vatRate} KDV
                    </div>
                  </div>

                  {inCart > 0 ? (
                    <div className="flex items-center justify-between rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
                      <button
                        type="button"
                        onClick={() => addToCart(p, -1)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-sm transition active:scale-95 hover:bg-slate-50"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        {inCart} {unitName}
                      </span>
                      <button
                        type="button"
                        onClick={() => addToCart(p, 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm transition active:scale-95 hover:bg-emerald-500"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  ) : (
                    <Button
                      onClick={() => addToCart(p, 1)}
                      className="w-full rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-brand-600 dark:hover:bg-brand-500 text-white dark:text-slate-900 font-semibold h-9 text-xs transition"
                    >
                      <Plus size={14} className="mr-1.5" />
                      Sepete Ekle
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Yüzen Alt Sepet Çubuğu (Cart has items) */}
      {cartSummary.itemCount > 0 && (
        <div className="fixed bottom-4 inset-x-4 max-w-4xl mx-auto z-40 animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center justify-between rounded-2xl border border-white/20 bg-slate-900/95 p-3.5 px-5 text-white shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white font-bold shadow-md">
                <ShoppingCart size={20} />
              </div>
              <div>
                <div className="text-xs text-slate-300 font-medium">
                  {cartSummary.itemCount} Kalem ({cartSummary.totalCount} Adet)
                </div>
                <div className="text-base font-black tracking-tight text-white">
                  {formatMoney(cartSummary.total, "TRY")}{" "}
                  <span className="text-[10px] font-normal text-emerald-400 font-sans">(KDV Dahil)</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearCart}
                className="text-xs text-slate-400 hover:text-white hover:bg-white/10 hidden sm:inline-flex"
              >
                Temizle
              </Button>

              <Button
                onClick={() => setCartOpen(true)}
                className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-5 h-10 text-sm shadow-lg shadow-emerald-950/20"
              >
                Siparişi Tamamla <ArrowRight size={16} className="ml-1.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Sepet ve Sipariş Verme Modalı */}
      <Dialog open={cartOpen} onOpenChange={setCartOpen}>
        <DialogContent title="Siparişi Onayla & Gönder" className="max-w-2xl max-h-[90vh]">
          <div className="space-y-4">
            {/* Ürün Listesi */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
              {cart.map((item) => {
                const p = item.product;
                const rawPrice = Number(p.sale_price) || 0;
                const vatRate = Number(p.vat_rate) || 20;
                const inclVat = !!p.sale_price_includes_vat;
                const unitPriceIncVat = inclVat ? rawPrice : rawPrice * (1 + vatRate / 100);
                const lineTotal = unitPriceIncVat * item.quantity;
                const unitName = p.unit_id ? unitMap.get(p.unit_id) || "Adet" : "Adet";

                return (
                  <div key={item.id} className="flex items-center justify-between p-3 gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">
                        {p.name}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {formatMoney(unitPriceIncVat, "TRY")} / {unitName}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-0.5">
                        <button
                          type="button"
                          onClick={() => addToCart(p, -1)}
                          className="h-6 w-6 flex items-center justify-center text-slate-500 hover:text-slate-900"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-8 text-center text-xs font-bold">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => addToCart(p, 1)}
                          className="h-6 w-6 flex items-center justify-center text-slate-500 hover:text-slate-900"
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      <div className="w-24 text-right font-bold text-xs">
                        {formatMoney(lineTotal, "TRY")}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        className="text-slate-400 hover:text-rose-500 p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Sipariş & Teslimat Notu */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Teslimat Notu / Sevkiyat Adresi (İsteğe bağlı)
              </label>
              <textarea
                value={orderNote}
                onChange={(e) => setOrderNote(e.target.value)}
                rows={3}
                placeholder="Örn: 2 nolu şantiyeye sevk edilecek, gelmeden önce 05xx no'lu telefondan haber veriniz..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-3 text-xs outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
            </div>

            {/* Fiyat Özeti */}
            <div className="rounded-xl bg-slate-50 dark:bg-slate-950 p-4 space-y-2 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Ara Toplam (KDV Hariç)</span>
                <span className="font-semibold tabular-nums">{formatMoney(cartSummary.subtotal, "TRY")}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>KDV Tutarı</span>
                <span className="font-semibold tabular-nums">{formatMoney(cartSummary.vatTotal, "TRY")}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-800">
                <span>Genel Toplam (Ödenecek)</span>
                <span className="tabular-nums text-base text-emerald-600 dark:text-emerald-400">
                  {formatMoney(cartSummary.total, "TRY")}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-brand-50/50 dark:bg-brand-950/20 rounded-lg p-2.5 border border-brand-200/50">
              <ShieldCheck size={16} className="text-brand-600 shrink-0" />
              <span>Siparişiniz sisteme düştükten sonra Ren Endüstriyel ekibimiz tarafından incelenip onaylanır ve hazırlık süreci başlar.</span>
            </div>
          </div>

          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 bg-slate-50/50 dark:bg-slate-900/50">
            <Button variant="outline" onClick={() => setCartOpen(false)} disabled={isSubmitting}>
              Vazgeç
            </Button>
            <Button
              onClick={handleSubmitOrder}
              disabled={isSubmitting || cart.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6"
            >
              {isSubmitting ? (
                "İletiliyor..."
              ) : (
                <>
                  <Send size={15} className="mr-2" />
                  Siparişi Onayla & Gönder
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sipariş Başarılı Modalı */}
      <Dialog open={!!successOrder} onOpenChange={() => setSuccessOrder(null)}>
        <DialogContent title="Siparişiniz Başarıyla Alındı!" className="max-w-md text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mb-4">
            <FileCheck size={32} />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Sipariş Numaranız: <span className="font-mono font-bold text-brand-600">{successOrder?.number}</span>
          </p>
          <div className="mt-4 rounded-xl bg-slate-50 dark:bg-slate-900 p-3 text-xs text-slate-600 dark:text-slate-400">
            Toplam Tutar: <span className="font-bold text-slate-900 dark:text-slate-100">{formatMoney(successOrder?.total || 0, "TRY")}</span>
            <div className="mt-1 text-[11px] text-slate-400">
              Siparişiniz ekibimizin ekranına düşmüştür. Hazırlık ve kargo durumunu anlık olarak Siparişlerim ekranından takip edebilirsiniz.
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setSuccessOrder(null)}
              className="flex-1"
            >
              Kataloğa Dön
            </Button>
            <Button
              onClick={() => {
                setSuccessOrder(null);
                router.push("/siparislerim");
              }}
              className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-bold"
            >
              Siparişimi Takip Et
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
