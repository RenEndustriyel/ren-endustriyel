"use client";

import * as React from "react";
import { Percent, Calculator, Plus, Trash2, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatMoney, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Çoklu iskontoyu bileşik efektif iskonto yüzdesine çevirir (1 - (1-d1/100)*(1-d2/100)...) */
export function calcMultiDiscount(discounts: number[]): number {
  if (!discounts.length) return 0;
  const factor = discounts.reduce((acc, d) => {
    const valid = Math.max(0, Math.min(100, d));
    return acc * (1 - valid / 100);
  }, 1);
  return Math.round((1 - factor) * 10000) / 100;
}

/** "10+5+2.5" gibi bir metni sayı dizisine ayrıştırır */
export function parseDiscountString(str: string): number[] {
  if (!str || !str.trim()) return [];
  return str
    .split(/[+,;\s/]+/)
    .map((s) => parseFloat(s.replace(",", ".")))
    .filter((n) => !isNaN(n) && n > 0);
}

export function MultiDiscountInput({
  value,
  discountStr,
  onChange,
  unitPrice = 0,
  currency = "TRY",
  className,
  onKeyDown,
}: {
  value: number; // Efektif iskonto oranı (%)
  discountStr?: string; // "10+5" vb.
  onChange: (effectiveRate: number, str: string) => void;
  unitPrice?: number;
  currency?: string;
  className?: string;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
}) {
  const [open, setOpen] = React.useState(false);
  const [rawText, setRawText] = React.useState<string>(() => {
    if (discountStr !== undefined && discountStr !== "") return discountStr;
    return value > 0 ? String(value) : "";
  });

  // Dışarıdan value/discountStr değiştiğinde senkronize et
  React.useEffect(() => {
    if (discountStr !== undefined && discountStr !== "") {
      setRawText(discountStr);
    } else if (value > 0) {
      setRawText(String(value));
    } else {
      setRawText("");
    }
  }, [value, discountStr]);

  const parsedDiscounts = React.useMemo(() => parseDiscountString(rawText), [rawText]);
  const isMulti = parsedDiscounts.length > 1;
  const effectiveRate = React.useMemo(() => calcMultiDiscount(parsedDiscounts), [parsedDiscounts]);

  // Popover içi ayrı slotlar
  const [slotDiscounts, setSlotDiscounts] = React.useState<number[]>([]);

  React.useEffect(() => {
    if (open) {
      const p = parseDiscountString(rawText);
      setSlotDiscounts(p.length > 0 ? p : [0, 0]);
    }
  }, [open, rawText]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setRawText(text);
    const parsed = parseDiscountString(text);
    const rate = calcMultiDiscount(parsed);
    onChange(rate, text);
  };

  const handleApplyPopover = (discounts: number[]) => {
    const valid = discounts.filter((d) => d > 0);
    const rate = calcMultiDiscount(valid);
    const str = valid.join("+");
    setRawText(str);
    onChange(rate, str);
    setOpen(false);
  };

  const popoverEffective = calcMultiDiscount(slotDiscounts);
  const discountAmount = unitPrice > 0 ? (unitPrice * popoverEffective) / 100 : 0;
  const netPrice = Math.max(0, unitPrice - discountAmount);

  return (
    <div className={cn("relative flex items-center", className)}>
      <div className="relative w-full">
        <Input
          value={rawText}
          onChange={handleInputChange}
          onKeyDown={onKeyDown}
          placeholder="%0"
          className={cn(
            "h-9 pr-7 text-xs font-semibold",
            isMulti && "border-primary/50 bg-primary-soft/10 text-primary",
          )}
          title={isMulti ? `Bileşik İskonto: %${effectiveRate.toFixed(2)}` : undefined}
        />
        {/* Çoklu İskonto Butonu */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "absolute right-1 top-1/2 -translate-y-1/2 rounded p-1 text-muted transition-colors hover:bg-surface-2 hover:text-text",
                isMulti && "text-primary font-bold",
              )}
              title="Çoklu İskonto Detayı"
            >
              <Percent className="size-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4 shadow-xl" align="end">
            <div className="mb-3 flex items-center justify-between border-b border-border pb-2.5">
              <div className="flex items-center gap-1.5 font-bold text-text">
                <Calculator className="size-4 text-primary" />
                <span>Çoklu İskonto Hesaplayıcı</span>
              </div>
              <span className="text-[11px] text-muted">Kademeli İskonto</span>
            </div>

            <div className="space-y-2.5">
              {slotDiscounts.map((val, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-20 text-xs font-medium text-muted">
                    {idx + 1}. İskonto:
                  </span>
                  <div className="relative flex-1">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={val || ""}
                      placeholder="%0"
                      onChange={(e) => {
                        const next = [...slotDiscounts];
                        next[idx] = parseFloat(e.target.value) || 0;
                        setSlotDiscounts(next);
                      }}
                      className="h-8 text-xs font-bold"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted">
                      %
                    </span>
                  </div>
                  {slotDiscounts.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setSlotDiscounts(slotDiscounts.filter((_, i) => i !== idx))}
                      className="p-1 text-muted hover:text-danger"
                      title="Bu kademeyi sil"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={() => setSlotDiscounts([...slotDiscounts, 0])}
                className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                <Plus className="size-3" /> Yeni iskonto kademesi ekle
              </button>

              {/* Hızlı Şablonlar */}
              <div className="border-t border-border/80 pt-2.5">
                <div className="mb-1.5 text-[11px] font-semibold text-muted">Hızlı Kombinasyonlar:</div>
                <div className="flex flex-wrap gap-1.5">
                  {["10+5", "15+5", "20+5", "20+10", "30+10"].map((combo) => (
                    <button
                      key={combo}
                      type="button"
                      onClick={() => {
                        const p = parseDiscountString(combo);
                        setSlotDiscounts(p);
                      }}
                      className="rounded bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-muted hover:bg-primary/10 hover:text-primary transition-colors"
                    >
                      %{combo}
                    </button>
                  ))}
                </div>
              </div>

              {/* Canlı Hesaplama Özeti */}
              <div className="rounded-xl border border-border bg-surface-2/60 p-3 text-xs space-y-1">
                <div className="flex justify-between font-medium text-muted">
                  <span>Birim Fiyat:</span>
                  <span>{formatMoney(unitPrice, currency)}</span>
                </div>
                <div className="flex justify-between font-bold text-primary">
                  <span>Bileşik İskonto:</span>
                  <span>%{popoverEffective.toFixed(2)}</span>
                </div>
                {unitPrice > 0 && (
                  <>
                    <div className="flex justify-between text-danger">
                      <span>İskonto Tutarı:</span>
                      <span>-{formatMoney(discountAmount, currency)}</span>
                    </div>
                    <div className="flex justify-between border-t border-border/60 pt-1 font-bold text-text">
                      <span>Net Birim Fiyat:</span>
                      <span>{formatMoney(netPrice, currency)}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Butonlar */}
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSlotDiscounts([0]);
                    handleApplyPopover([]);
                  }}
                >
                  Sıfırla
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleApplyPopover(slotDiscounts)}
                >
                  <Check className="size-3.5" /> Uygula
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      {/* Eğer çoklu iskonto girilmişse efektif oranı altında minik göster */}
      {isMulti && (
        <span className="absolute -bottom-3.5 left-0 text-[10px] font-bold text-primary whitespace-nowrap">
          =%{effectiveRate.toFixed(2)}
        </span>
      )}
    </div>
  );
}
