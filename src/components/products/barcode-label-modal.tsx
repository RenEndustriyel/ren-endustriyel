"use client";

import * as React from "react";
import { Printer, X, Search, ScanBarcode, Check } from "lucide-react";
import { useProducts, type Row } from "@/lib/data";
import { formatMoney } from "@/lib/format";
import { useOrg } from "@/providers/org-provider";
import { convertVat } from "@/lib/doc-calc";
import { rateFor, useRates } from "@/lib/rates";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// EAN-13 SVG Generator Tabloları
const L_CODE: Record<string, string> = {
  "0": "0001101", "1": "0011001", "2": "0010011", "3": "0111101", "4": "0100011",
  "5": "0110001", "6": "0101111", "7": "0111011", "8": "0110111", "9": "0001011",
};
const G_CODE: Record<string, string> = {
  "0": "0100111", "1": "0110011", "2": "0011011", "3": "0100001", "4": "0011101",
  "5": "0111001", "6": "0000101", "7": "0010001", "8": "0001001", "9": "0010111",
};
const R_CODE: Record<string, string> = {
  "0": "1110010", "1": "1100110", "2": "1101100", "3": "1000010", "4": "1011100",
  "5": "1001110", "6": "1010000", "7": "1000100", "8": "1001000", "9": "1110100",
};
const PARITY: Record<string, string> = {
  "0": "LLLLLL", "1": "LLGLGG", "2": "LLGGLG", "3": "LLGGGL", "4": "LGLLGG",
  "5": "LGGLLG", "6": "LGGGLL", "7": "LGLGLG", "8": "LGLGGL", "9": "LGGLGL",
};

function encodeEan13(digits: string): string {
  const clean = digits.replace(/\D/g, "");
  if (clean.length !== 13) return "";
  const first = clean[0];
  const left = clean.slice(1, 7);
  const right = clean.slice(7, 13);
  const pattern = PARITY[first] || "LLLLLL";

  let bits = "101"; // Başlangıç çizgisi
  for (let i = 0; i < 6; i++) {
    const digit = left[i];
    bits += pattern[i] === "L" ? L_CODE[digit] : G_CODE[digit];
  }
  bits += "01010"; // Orta ayırıcı
  for (let i = 0; i < 6; i++) {
    bits += R_CODE[right[i]];
  }
  bits += "101"; // Bitiş çizgisi
  return bits;
}

function generateBarcodeSvg(barcode: string, height = 48, barWidth = 1.6): string {
  const digits = barcode.replace(/\D/g, "");
  // 12 veya 13 haneli değilse Code128 formatına benzer basit desen çiz
  if (digits.length !== 13) {
    // 8-12 haneli ise veya özel kod ise dinamik çizgi deseni
    let bits = "101";
    for (let i = 0; i < barcode.length; i++) {
      const code = barcode.charCodeAt(i) % 10;
      bits += (code % 2 === 0 ? "1100101" : "1001101");
    }
    bits += "101";
    let curX = 0;
    let rects = "";
    for (const b of bits) {
      if (b === "1") rects += `<rect x="${curX.toFixed(2)}" y="0" width="${barWidth}" height="${height}" fill="#000" />`;
      curX += barWidth;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${curX}" height="${height}" viewBox="0 0 ${curX} ${height}">${rects}</svg>`;
  }

  const bits = encodeEan13(digits);
  if (!bits) return "";
  let curX = 0;
  let rects = "";
  for (const b of bits) {
    if (b === "1") rects += `<rect x="${curX.toFixed(2)}" y="0" width="${barWidth}" height="${height}" fill="#000" />`;
    curX += barWidth;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${curX}" height="${height}" viewBox="0 0 ${curX} ${height}">${rects}</svg>`;
}

export function BarcodeLabelModal({
  open,
  onClose,
  onOpenChange,
  initialProduct,
  initialProductId,
}: {
  open: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
  initialProduct?: Row<"products">;
  initialProductId?: string;
}) {
  const { org } = useOrg();
  const products = useProducts();
  const rates = useRates();
  const [search, setSearch] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string>(initialProduct?.id || initialProductId || "");
  const [copies, setCopies] = React.useState(1);

  const handleClose = () => {
    if (onOpenChange) onOpenChange(false);
    if (onClose) onClose();
  };

  React.useEffect(() => {
    if (open) {
      if (initialProduct?.id) setSelectedId(initialProduct.id);
      else if (initialProductId) setSelectedId(initialProductId);
      setSearch("");
      setCopies(1);
    }
  }, [open, initialProduct, initialProductId]);

  const selectedProduct = (products.data ?? []).find((p) => p.id === selectedId);

  const filteredProducts = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = products.data ?? [];
    if (!q) return list.slice(0, 15);
    return list
      .filter((p) => p.name.toLowerCase().includes(q) || (p.barcode && p.barcode.toLowerCase().includes(q)))
      .slice(0, 15);
  }, [products.data, search]);

  const calcPrice = (p: Row<"products">) => {
    let price = Number(p.sale_price || 0);
    if (p.sale_currency !== "TRY") price *= rateFor(rates.data, p.sale_currency) || 1;
    return convertVat(price, Number(p.vat_rate || 0), p.sale_price_includes_vat ?? true, true);
  };

  const handlePrint = () => {
    window.print();
  };

  const barcodeCode = selectedProduct?.barcode || selectedProduct?.code || "";
  const svgHtml = barcodeCode ? generateBarcodeSvg(barcodeCode, 44, 1.5) : "";

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? handleClose() : onOpenChange ? onOpenChange(true) : null)}>
      <DialogContent title="Barkod Etiket Yazdır" className="max-w-2xl p-0 overflow-hidden bg-white dark:bg-surface border-border">
        {/* Başlık */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-slate-50 dark:bg-surface-2">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-slate-900 text-white font-bold">
              <ScanBarcode className="size-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-text">Barkod Etiket Yazdır</h2>
              <p className="text-xs text-muted">Ürün raf ve yapışkan barkod etiketi oluşturma</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="size-8 rounded-lg">
            <X className="size-4" />
          </Button>
        </div>

        {/* Gövde */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5">
          {/* Sol: Ürün Seçimi ve Adet */}
          <div className="flex flex-col gap-3">
            <label className="text-xs font-bold uppercase tracking-wider text-muted">Ürün Seçin</label>
            <div className="relative">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Ürün adı veya barkod ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 rounded-xl border border-border bg-surface pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div className="max-h-56 overflow-y-auto space-y-1 rounded-xl border border-border p-1 bg-surface-2/40">
              {filteredProducts.map((p) => {
                const isSelected = p.id === selectedId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedId(p.id)}
                    className={cn(
                      "w-full text-left p-2.5 rounded-lg text-xs transition-colors flex items-center justify-between",
                      isSelected
                        ? "bg-slate-900 text-white font-semibold"
                        : "hover:bg-surface text-text",
                    )}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="truncate font-medium">{p.name}</p>
                      <p className={cn("text-[11px]", isSelected ? "text-slate-300" : "text-muted")}>
                        {p.barcode || p.code || "Barkodsuz"} · {formatMoney(calcPrice(p))}
                      </p>
                    </div>
                    {isSelected && <Check className="size-4 shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Basılacak Kopya Sayısı */}
            <div className="mt-2 flex items-center justify-between gap-3 p-3 rounded-xl border border-border bg-surface-2/40">
              <span className="text-xs font-semibold text-text">Yazdırılacak Adet:</span>
              <div className="flex items-center gap-2">
                {[1, 2, 5, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setCopies(num)}
                    className={cn(
                      "size-8 rounded-lg text-xs font-bold transition-all",
                      copies === num ? "bg-slate-900 text-white shadow-xs" : "bg-surface border border-border text-text hover:bg-surface-2",
                    )}
                  >
                    {num}
                  </button>
                ))}
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={copies}
                  onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-14 h-8 rounded-lg border border-border bg-surface text-center text-xs font-bold text-text focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Sağ: Etiket Önizleme */}
          <div className="flex flex-col gap-3">
            <label className="text-xs font-bold uppercase tracking-wider text-muted">Etiket Önizleme</label>

            <div className="flex-1 rounded-2xl border border-border bg-slate-100 dark:bg-slate-900/40 p-4 flex flex-col items-center justify-center min-h-[220px]">
              {selectedProduct ? (
                <div
                  id="print-label-area"
                  className="w-full max-w-[240px] rounded-xl border-2 border-slate-300 bg-white p-3 text-slate-900 text-center shadow-md select-none"
                >
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 truncate">
                    {org?.name || "Ren Endüstriyel"}
                  </p>
                  <h4 className="mt-1 text-xs font-black line-clamp-2 leading-tight min-h-[2rem]">
                    {selectedProduct.name}
                  </h4>

                  <div className="my-2">
                    <span className="text-xl font-black tabular-nums tracking-tight">
                      {formatMoney(calcPrice(selectedProduct))}
                    </span>
                    <span className="block text-[9px] font-semibold text-slate-400 -mt-0.5">KDV Dahil</span>
                  </div>

                  {/* Vektör Barkod Çizimi */}
                  {svgHtml ? (
                    <div className="flex justify-center my-1" dangerouslySetInnerHTML={{ __html: svgHtml }} />
                  ) : (
                    <p className="text-[10px] text-rose-500 font-bold my-2">Barkod Kodu Yok</p>
                  )}

                  <p className="text-[11px] font-mono font-bold tracking-widest text-slate-700">
                    {barcodeCode || "000000000000"}
                  </p>
                </div>
              ) : (
                <div className="text-center text-muted text-xs p-6">
                  <ScanBarcode className="size-10 mx-auto mb-2 text-slate-400 opacity-60" />
                  <span>Önizlemek için soldan bir ürün seçin</span>
                </div>
              )}
            </div>

            {/* Butonlar */}
            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="primary"
                disabled={!selectedProduct}
                onClick={handlePrint}
                className="flex-1 h-10 gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold"
              >
                <Printer className="size-4" />
                <span>Yazdır ({copies} Etiket)</span>
              </Button>
              <Button variant="outline" onClick={handleClose} className="h-10">
                Kapat
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
