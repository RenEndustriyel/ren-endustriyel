"use client";

import * as React from "react";
import { useProducts, useUnits, type Row } from "@/lib/data";
import { formatMoney, formatQty } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Package, Search, X } from "lucide-react";

export type Product = Row<"products">;

interface Props {
  productId: string | null;
  description: string;
  onProductSelect: (p: Product) => void;
  onDescriptionChange: (text: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  className?: string;
}

/**
 * Serbestçe yazılabilir ürün/hizmet arama ve giriş bileşeni.
 * - Kullanıcı doğrudan istediği metni yazar ("sade yazılabilir").
 * - Stokta olmayan ürünler için sayfadan ASLA yönlendirmez; yazılan metin satır açıklaması olarak kalır.
 * - Yazarken eşleşen stok kartlarını altta açılır listede önerir; seçilirse fiyat/KDV/birim doldurulur.
 */
export function WritableProductPicker({
  productId,
  description,
  onProductSelect,
  onDescriptionChange,
  placeholder = "Ürün / hizmet adı yazın veya stoktan arayın…",
  autoFocus,
  onKeyDown,
  className,
}: Props) {
  const products = useProducts();
  const units = useUnits();
  const [open, setOpen] = React.useState(false);
  const [highlightIdx, setHighlightIdx] = React.useState(-1);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Otomatik odaklanma
  React.useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [autoFocus]);

  // Dışarı tıklayınca öneri menüsünü kapat
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtrelenmiş stok önerileri
  const suggestions = React.useMemo(() => {
    const q = (description || "").trim().toLowerCase();
    if (!q || !products.data) return [];
    return products.data
      .filter((p) => p.is_active)
      .filter((p) => {
        const name = (p.name || "").toLowerCase();
        const code = (p.code || "").toLowerCase();
        const barcode = (p.barcode || "").toLowerCase();
        return name.includes(q) || code.includes(q) || barcode.includes(q);
      })
      .slice(0, 8);
  }, [description, products.data]);

  const handleSelectProduct = (p: Product) => {
    onProductSelect(p);
    setOpen(false);
    setHighlightIdx(-1);
  };

  const handleKeyDownInternal = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (open && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIdx((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIdx((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
        return;
      }
      if (e.key === "Enter" && highlightIdx >= 0 && suggestions[highlightIdx]) {
        e.preventDefault();
        handleSelectProduct(suggestions[highlightIdx]);
        return;
      }
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
    }

    if (e.key === "Enter") {
      setOpen(false);
    }

    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={description}
          onChange={(e) => {
            onDescriptionChange(e.target.value);
            setOpen(true);
            setHighlightIdx(-1);
          }}
          onFocus={() => {
            if (description.trim().length > 0) setOpen(true);
          }}
          onKeyDown={handleKeyDownInternal}
          placeholder={placeholder}
          className="h-9 w-full rounded-lg border border-border bg-surface pl-8 pr-8 text-xs font-medium text-text placeholder:text-muted/60 transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
        />

        <div className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted">
          {productId ? (
            <Package className="size-3.5 text-primary" />
          ) : (
            <Search className="size-3.5 text-muted/60" />
          )}
        </div>

        {description && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => {
              onDescriptionChange("");
              setOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted hover:bg-surface-2 hover:text-text"
            title="Temizle"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* Açılır öneri listesi */}
      {open && suggestions.length > 0 && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-64 w-full min-w-[280px] overflow-y-auto rounded-xl border border-border bg-surface p-1 shadow-lg thin-scroll">
          <div className="px-2 py-1 text-[10.5px] font-semibold text-muted uppercase tracking-wider">
            Stok Kartı Önerileri ({suggestions.length})
          </div>
          {suggestions.map((p, idx) => {
            const unitName = units.data?.find((u) => u.id === p.unit_id)?.name ?? "";
            const isHighlight = idx === highlightIdx;
            return (
              <button
                key={p.id}
                type="button"
                onMouseEnter={() => setHighlightIdx(idx)}
                onClick={() => handleSelectProduct(p)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors",
                  isHighlight ? "bg-primary-soft text-primary font-medium" : "hover:bg-surface-2 text-text",
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{p.name}</div>
                  <div className="flex items-center gap-1.5 text-[10.5px] text-muted truncate">
                    {p.code && <span>Kod: {p.code}</span>}
                    {p.type === "product" && p.track_stock && (
                      <span>· Stok: {formatQty(p.stock_qty)} {unitName}</span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right font-mono text-[11px] font-semibold text-text">
                  {formatMoney(p.sale_price, p.sale_currency)}
                </div>
              </button>
            );
          })}
          <div className="border-t border-border mt-1 pt-1 px-2 py-1 text-[10px] text-muted">
            💡 Listeden seçmeden geçerseniz yazdığınız metin serbest kalem olarak kaydedilir.
          </div>
        </div>
      )}
    </div>
  );
}
