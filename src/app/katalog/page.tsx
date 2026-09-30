"use client";

import * as React from "react";
import Link from "next/link";
import { Package, Search, Phone, Mail, MapPin, MessageCircle, ExternalLink, Share2, Check, ArrowLeft } from "lucide-react";
import { useCategories, useProducts, useUnits, type Row } from "@/lib/data";
import { formatMoney, formatQty } from "@/lib/format";
import { matches } from "@/components/ui/search-input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function PublicCatalogPage() {
  const products = useProducts();
  const cats = useCategories("product");
  const units = useUnits();

  const [q, setQ] = React.useState("");
  const [selectedCat, setSelectedCat] = React.useState<string>("");
  const [copied, setCopied] = React.useState(false);

  const activeProducts = React.useMemo(() => {
    return (products.data ?? []).filter((p) => p.is_active);
  }, [products.data]);

  const filtered = React.useMemo(() => {
    return activeProducts.filter((p) => {
      const matchCat = !selectedCat || p.category_id === selectedCat;
      const matchQuery = matches(`${p.name} ${p.code ?? ""} ${p.barcode ?? ""}`, q);
      return matchCat && matchQuery;
    });
  }, [activeProducts, selectedCat, q]);

  const catName = (id: string | null) => cats.data?.find((c) => c.id === id)?.name ?? "";
  const unitName = (id: string | null) => units.data?.find((u) => u.id === id)?.name ?? "Adet";

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Katalog bağlantısı kopyalandı!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleWhatsAppOrder = (p: Row<"products">) => {
    const text = encodeURIComponent(
      `Merhaba Ren Endüstriyel,\nOnline kataloğunuzdan ürün siparişi vermek istiyorum:\n\n*Ürün:* ${p.name}\n*Kod/Barkod:* ${p.code || p.barcode || "—"}\n*Fiyat:* ${formatMoney(p.sale_price, p.sale_currency)} (KDV ${p.sale_price_includes_vat ? "Dahil" : "Hariç"})\n\nStok ve teslimat durumu hakkında bilgi alabilir miyim?`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased">
      {/* ÜST BAR */}
      <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-black text-lg tracking-wider shadow-sm">
              REN
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold sm:text-lg leading-tight">Ren Endüstriyel</h1>
                <span className="rounded-full bg-slate-200 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                  ONLINE KATALOG
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Endüstriyel Ürünler &amp; Malzeme Kataloğu</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              title="Katalog linkini kopyala"
            >
              {copied ? <Check className="size-3.5 text-slate-900 dark:text-slate-100" /> : <Share2 className="size-3.5" />}
              <span className="hidden sm:inline">{copied ? "Kopyalandı" : "Paylaş"}</span>
            </button>
            <Link
              href="/panel"
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 px-3 py-1.5 text-xs font-bold hover:opacity-90 transition"
            >
              <ArrowLeft className="size-3.5" />
              <span>Giriş Yap</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ARAMA VE FİLTRE BÖLÜMÜ */}
      <section className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="relative mb-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ürün adı, stok kodu veya barkod ile ara..."
              className="h-11 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-10 pr-4 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 transition"
            />
          </div>

          {/* Kategori Butonları */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs thin-scroll">
            <button
              onClick={() => setSelectedCat("")}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 font-semibold transition",
                !selectedCat
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              )}
            >
              Tüm Ürünler ({activeProducts.length})
            </button>
            {cats.data?.map((c) => {
              const count = activeProducts.filter((p) => p.category_id === c.id).length;
              if (count === 0) return null;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedCat(c.id)}
                  className={cn(
                    "shrink-0 rounded-full px-3.5 py-1.5 font-semibold transition",
                    selectedCat === c.id
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  )}
                >
                  {c.name} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ÜRÜN LİSTESİ */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {products.isPending ? (
          <div className="py-24 text-center text-sm text-slate-400">
            <Package className="mx-auto size-8 animate-pulse text-slate-400 mb-2" />
            Ürün kataloğu yükleniyor...
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 py-20 text-center">
            <Package className="mx-auto size-10 text-slate-400 mb-3" />
            <h3 className="font-bold text-base text-slate-700 dark:text-slate-200">Aradığınız kriterde ürün bulunamadı</h3>
            <p className="text-xs text-slate-400 mt-1">Arama kelimesini değiştirebilir veya kategori filtresini temizleyebilirsiniz.</p>
            {(q || selectedCat) && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setQ("");
                  setSelectedCat("");
                }}
              >
                Filtreleri Temizle
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filtered.map((p) => {
              const inStock = !p.track_stock || p.type === "service" || Number(p.stock_qty) > 0;
              const price = Number(p.sale_price) || 0;
              const catTitle = catName(p.category_id);

              return (
                <div
                  key={p.id}
                  className="group flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-all hover:border-slate-400 dark:hover:border-slate-600 hover:shadow-md"
                >
                  <div>
                    {/* Ürün Görseli veya İkon */}
                    <div className="mb-3 flex h-36 w-full items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:scale-[1.02] transition-transform">
                      <Package className="size-12 opacity-40 text-slate-600 dark:text-slate-300" />
                    </div>

                    {/* Kategori ve Stok Rozeti */}
                    <div className="mb-1.5 flex items-center justify-between gap-1 text-[11px]">
                      {catTitle ? (
                        <span className="truncate rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 font-medium text-slate-600 dark:text-slate-300">
                          {catTitle}
                        </span>
                      ) : (
                        <span className="text-slate-400">Ürün</span>
                      )}

                      {inStock ? (
                        <span className="rounded bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 text-[10.5px] font-bold text-slate-800 dark:text-slate-200">
                          Stokta Var
                        </span>
                      ) : (
                        <span className="rounded bg-rose-500/10 px-1.5 py-0.5 text-[10.5px] font-bold text-rose-600 dark:text-rose-400">
                          Tükendi
                        </span>
                      )}
                    </div>

                    {/* Ürün Adı */}
                    <h3 className="font-semibold text-sm line-clamp-2 text-slate-900 dark:text-slate-100 leading-snug">
                      {p.name}
                    </h3>

                    {/* Kod & Barkod */}
                    {(p.code || p.barcode) && (
                      <p className="mt-1 text-[11px] text-slate-400 font-mono">
                        {[p.code, p.barcode].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="mb-2.5 flex items-baseline justify-between">
                      <span className="text-lg font-black text-slate-900 dark:text-slate-100 tabular-nums">
                        {formatMoney(price, p.sale_currency)}
                      </span>
                      <span className="text-[10.5px] text-slate-400">
                        {p.sale_price_includes_vat ? "KDV Dahil" : "KDV Hariç"}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleWhatsAppOrder(p)}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 py-2 text-xs font-bold text-slate-900 dark:text-slate-100 transition shadow-2xs"
                    >
                      <MessageCircle className="size-3.5" />
                      <span>WhatsApp Sipariş</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ALT BİLGİ */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-8 px-4 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} Ren Endüstriyel · Tüm hakları saklıdır.</p>
          <p className="font-medium text-slate-600 dark:text-slate-300">Ren Endüstriyel Dijital Katalog Platformu</p>
        </div>
      </footer>
    </div>
  );
}
