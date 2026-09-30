"use client";

import * as React from "react";
import Link from "next/link";
import {
  ScanBarcode,
  Clock,
  Calendar,
  AlertCircle,
  Package,
  Layers,
  ArrowLeft,
  Maximize2,
  CheckCircle2,
  ShoppingBag,
  Store,
  Sparkles,
} from "lucide-react";
import { useProducts, type Row } from "@/lib/data";
import { formatMoney } from "@/lib/format";
import { useOrg } from "@/providers/org-provider";
import { convertVat } from "@/lib/doc-calc";
import { rateFor, useRates } from "@/lib/rates";
import { cn } from "@/lib/utils";

type DisplayState =
  | { kind: "idle" }
  | { kind: "notfound"; code: string }
  | { kind: "product"; product: Row<"products">; qty?: number; fromPos?: boolean }
  | { kind: "total"; cartTotal: number; cartCount: number };

export default function FiyatGorPage() {
  const { org } = useOrg();
  const products = useProducts();
  const rates = useRates();
  const [now, setNow] = React.useState(() => new Date());
  const [state, setState] = React.useState<DisplayState>({ kind: "idle" });
  const [flash, setFlash] = React.useState(false);
  const [inputVal, setInputVal] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const idleTimerRef = React.useRef<number | null>(null);

  // Focus keeper for barcode scanner gun
  const focusInput = React.useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const resetToIdleAfter = React.useCallback(
    (ms = 10000) => {
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = window.setTimeout(() => {
        setState({ kind: "idle" });
        focusInput();
      }, ms);
    },
    [focusInput],
  );

  // Live clock
  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Periodic input focus
  React.useEffect(() => {
    focusInput();
    const interval = window.setInterval(focusInput, 2000);
    return () => window.clearInterval(interval);
  }, [focusInput]);

  // POS Display Listener (when POS terminal emits items/totals)
  React.useEffect(() => {
    function handleStorage() {
      try {
        const raw = localStorage.getItem("ren:pos-display");
        if (!raw) return;
        const data = JSON.parse(raw);
        if (!data || !data.updatedAt) return;
        if (Date.now() - data.updatedAt > 15000) return;

        if (data.mode === "idle") {
          setState({ kind: "idle" });
        } else if (data.mode === "total") {
          setState({
            kind: "total",
            cartTotal: data.cartTotal ?? 0,
            cartCount: data.cartCount ?? 0,
          });
          resetToIdleAfter(15000);
        } else if (data.mode === "item" && data.sku) {
          const list = products.data ?? [];
          const found = list.find(
            (p) => (p.barcode && p.barcode.toLowerCase() === data.sku.toLowerCase()) || p.code?.toLowerCase() === data.sku.toLowerCase(),
          );
          if (found) {
            setState({ kind: "product", product: found, qty: data.qty, fromPos: true });
            setFlash(true);
            window.setTimeout(() => setFlash(false), 300);
            resetToIdleAfter(10000);
          }
        }
      } catch {}
    }

    handleStorage();
    window.addEventListener("storage", handleStorage);
    window.addEventListener("ren:pos-display", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("ren:pos-display", handleStorage);
    };
  }, [products.data, resetToIdleAfter]);

  // Barcode lookup
  const findProduct = (code: string) => {
    const clean = code.trim().toLowerCase();
    if (!clean) return null;
    const list = products.data ?? [];
    return (
      list.find((p) => p.barcode && p.barcode.trim().toLowerCase() === clean) ||
      list.find((p) => p.code && p.code.trim().toLowerCase() === clean) ||
      list.find((p) => p.name.trim().toLowerCase() === clean) ||
      list.find((p) => p.name.toLowerCase().includes(clean) && clean.length >= 3) ||
      null
    );
  };

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = inputVal.trim();
    setInputVal("");
    if (!code) return;

    const p = findProduct(code);
    if (p) {
      setState({ kind: "product", product: p });
      setFlash(true);
      window.setTimeout(() => setFlash(false), 300);
      resetToIdleAfter(12000);
    } else {
      setState({ kind: "notfound", code });
      setFlash(true);
      window.setTimeout(() => setFlash(false), 300);
      resetToIdleAfter(6000);
    }
    focusInput();
  };

  const calcGrossPrice = (p: Row<"products">) => {
    let price = Number(p.sale_price || 0);
    if (p.sale_currency !== "TRY") price *= rateFor(rates.data, p.sale_currency) || 1;
    return convertVat(price, Number(p.vat_rate || 0), p.sale_price_includes_vat ?? true, true);
  };

  const dateStr = now.toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div
      onClick={focusInput}
      className={cn(
        "min-h-screen flex flex-col text-slate-100 select-none transition-colors duration-300 relative overflow-hidden font-sans",
        flash ? "bg-slate-800" : "bg-slate-950",
      )}
    >
      {/* Arka Plan Dekorasyonları (Açık Gri / Gümüş / Antrasit) */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -right-24 h-[30rem] w-[30rem] rounded-full bg-slate-700/15 blur-3xl" />
        <div className="absolute -bottom-40 -left-20 h-[32rem] w-[32rem] rounded-full bg-slate-600/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(2,6,23,0.7)_100%)]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      {/* Üst Çubuk (Header) */}
      <header className="relative z-10 shrink-0 px-6 sm:px-12 py-5 flex items-center justify-between border-b border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Link
            href="/hizli-satis"
            className="flex size-10 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Hızlı Satışa Dön"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div>
            <div className="text-xs uppercase tracking-[0.25em] font-extrabold text-slate-400">
              Fiyat Gör · Kiosk Ekranı
            </div>
            <div className="text-xl sm:text-2xl font-black tracking-tight text-white truncate">
              {org?.name || "Ren Endüstriyel"}
            </div>
          </div>
        </div>

        {/* Canlı Saat ve Tarih */}
        <div className="text-right shrink-0">
          <div className="flex items-center justify-end gap-2 text-slate-400 text-xs sm:text-sm font-medium">
            <Calendar className="size-4 text-slate-400" />
            <span>{dateStr}</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black tabular-nums tracking-tight text-white mt-0.5">
            {timeStr}
          </div>
        </div>
      </header>

      {/* Görünmez Barkod Giriş Formu */}
      <form onSubmit={handleScanSubmit} className="sr-only" aria-hidden="true">
        <input
          ref={inputRef}
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          autoComplete="off"
          autoFocus
          inputMode="none"
        />
      </form>

      {/* Ana Gövde */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 sm:px-12 py-8">
        {/* 1. BEKLEME DURUMU (IDLE) */}
        {state.kind === "idle" && (
          <div className="w-full max-w-4xl text-center">
            {/* Büyük Barkod İkon Rozeti */}
            <div className="relative mx-auto mb-8 size-32">
              <div className="absolute inset-0 rounded-3xl bg-slate-800/40 animate-pulse" />
              <div className="absolute inset-2.5 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 border border-slate-600 flex items-center justify-center shadow-2xl">
                <ScanBarcode className="size-14 text-slate-200" />
              </div>
            </div>

            <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-none text-white">
              Fiyat Gör
            </h1>
            <p className="mt-4 text-xl sm:text-2xl text-slate-400 font-medium">
              Lütfen ürün barkodunu okuyucuya tutun
            </p>

            {/* 3 Adım Kutucukları */}
            <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
              <div className="rounded-2xl bg-white/5 border border-white/10 p-5 backdrop-blur-sm">
                <div className="text-slate-300 font-black text-2xl mb-1.5">01</div>
                <div className="font-bold text-base text-white">Barkodu Okutun</div>
                <div className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Ürünün üzerindeki barkodu lazer okuyucuya yaklaştırın.
                </div>
              </div>
              <div className="rounded-2xl bg-white/5 border border-white/10 p-5 backdrop-blur-sm">
                <div className="text-slate-300 font-black text-2xl mb-1.5">02</div>
                <div className="font-bold text-base text-white">Fiyatı Görün</div>
                <div className="text-xs text-slate-400 mt-1 leading-relaxed">
                  KDV dahil perakende satış fiyatı anında ekranda belirir.
                </div>
              </div>
              <div className="rounded-2xl bg-white/5 border border-white/10 p-5 backdrop-blur-sm">
                <div className="text-slate-300 font-black text-2xl mb-1.5">03</div>
                <div className="font-bold text-base text-white">Kasada Ödeyin</div>
                <div className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Alışverişinizi tamamlamak için kasaya geçebilirsiniz.
                </div>
              </div>
            </div>

            {/* Yanıp Sönen Lazer Durumu */}
            <div className="mt-10 inline-flex items-center gap-3 rounded-full bg-slate-800/80 border border-slate-700 px-6 py-2.5 text-sm font-semibold text-slate-300">
              <span className="relative flex size-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full size-2.5 bg-emerald-400" />
              </span>
              <span>Lazer tarayıcı aktif · Barkod bekleniyor...</span>
            </div>
          </div>
        )}

        {/* 2. BULUNAMADI DURUMU (NOT FOUND) */}
        {state.kind === "notfound" && (
          <div className="w-full max-w-2xl text-center">
            <div className="mx-auto size-20 rounded-3xl bg-rose-500/20 border border-rose-400/40 flex items-center justify-center mb-6">
              <AlertCircle className="size-10 text-rose-300" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-rose-100">
              Ürün Bulunamadı
            </h2>
            <p className="mt-3 text-base text-slate-400">Okutulan barkod kodu:</p>
            <p className="mt-2 text-2xl font-mono font-bold text-white tracking-widest bg-white/10 inline-block px-5 py-2 rounded-xl">
              {state.code}
            </p>
            <p className="mt-6 text-sm text-slate-400">
              Bu kod sistemde kayıtlı değil. Lütfen görevliye danışın.
            </p>
          </div>
        )}

        {/* 3. ÜRÜN BULUNDU DURUMU (PRODUCT) */}
        {state.kind === "product" && (
          <div className="w-full max-w-4xl">
            <div className="rounded-3xl border border-white/15 bg-white/5 p-6 sm:p-10 backdrop-blur-md shadow-2xl">
              <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
                {/* Ürün Görseli veya İkonu */}
                <div className="size-48 sm:size-56 shrink-0 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center overflow-hidden shadow-inner">
                  {(state.product as any).image_url ? (
                    <img
                      src={(state.product as any).image_url}
                      alt={state.product.name}
                      className="size-full object-cover"
                    />
                  ) : (
                    <Package className="size-20 text-slate-500" />
                  )}
                </div>

                {/* Ürün Bilgileri ve Fiyatı */}
                <div className="flex-1 text-center md:text-left min-w-0">
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-3">
                    {state.product.code && (
                      <span className="rounded-md bg-white/10 border border-white/15 px-2.5 py-1 text-xs font-mono text-slate-300">
                        {state.product.code}
                      </span>
                    )}
                    {state.product.barcode && (
                      <span className="rounded-md bg-white/10 border border-white/15 px-2.5 py-1 text-xs font-mono text-slate-300">
                        {state.product.barcode}
                      </span>
                    )}
                    <span className="rounded-md bg-slate-800 border border-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-200">
                      Stok: {state.product.stock_qty ?? 0} {(state.product as any).unit || "Adet"}
                    </span>
                  </div>

                  <h2 className="text-2xl sm:text-4xl font-black text-white leading-tight break-words">
                    {state.product.name}
                  </h2>

                  {/* Dev Fiyat Gösterimi */}
                  <div className="mt-6">
                    <div className="text-5xl sm:text-7xl font-black tracking-tight text-white tabular-nums">
                      {formatMoney(calcGrossPrice(state.product))}
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-400">
                      Birim Satış Fiyatı · KDV Dahil
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. POS GENEL TOPLAM EKRANI (TOTAL) */}
        {state.kind === "total" && (
          <div className="w-full max-w-3xl text-center">
            <div className="text-lg sm:text-xl font-bold uppercase tracking-[0.25em] text-slate-400 mb-2">
              Genel Toplam
            </div>
            <div className="text-6xl sm:text-8xl font-black tabular-nums tracking-tight text-white drop-shadow-lg">
              {formatMoney(state.cartTotal)}
            </div>
            <div className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-white/10 border border-white/15 px-6 py-3 text-lg font-bold text-slate-200">
              <ShoppingBag className="size-5" />
              <span>Sepetteki Ürün Adedi: {state.cartCount}</span>
            </div>
          </div>
        )}
      </main>

      {/* Alt Bilgi */}
      <footer className="relative z-10 shrink-0 px-6 sm:px-12 py-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
        <span>Ren Endüstriyel · Otomatik Barkod Kiosk Terminali</span>
        <span>Herhangi bir tuşa basarak veya barkod okutarak fiyat sorgulayabilirsiniz</span>
      </footer>
    </div>
  );
}
