"use client";

import * as React from "react";
import { AlertCircle, ArrowRight, Check, TrendingDown, TrendingUp } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export type PriceDiffItem = {
  productId: string;
  productName: string;
  productCode?: string | null;
  currentPrice: number;
  newNetPrice: number;
  diff: number;
  percentChange: number;
  currency: string;
  selected: boolean;
};

export function PriceUpdateDialog({
  open,
  onOpenChange,
  items,
  onConfirmWithPriceUpdate,
  onConfirmWithoutPriceUpdate,
  saving = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: PriceDiffItem[];
  onConfirmWithPriceUpdate: (selectedIds: string[]) => void;
  onConfirmWithoutPriceUpdate: () => void;
  saving?: boolean;
}) {
  const [selectedMap, setSelectedMap] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    if (open) {
      const init: Record<string, boolean> = {};
      items.forEach((it) => {
        init[it.productId] = true;
      });
      setSelectedMap(init);
    }
  }, [open, items]);

  const toggleAll = (checked: boolean) => {
    const next: Record<string, boolean> = {};
    items.forEach((it) => {
      next[it.productId] = checked;
    });
    setSelectedMap(next);
  };

  const toggleItem = (pid: string) => {
    setSelectedMap((prev) => ({ ...prev, [pid]: !prev[pid] }));
  };

  const selectedCount = Object.values(selectedMap).filter(Boolean).length;
  const allSelected = items.length > 0 && selectedCount === items.length;

  const handleUpdate = () => {
    const selectedIds = Object.entries(selectedMap)
      .filter(([, v]) => v)
      .map(([k]) => k);
    onConfirmWithPriceUpdate(selectedIds);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Alış Fiyatı Güncelleme Bildirimi"
        description="Faturadaki iskonto sonrası KDV hariç net alış fiyatları ürün kartlarındaki kayıtlı fiyatlardan farklı."
        className="sm:max-w-2xl"
      >
        <div className="space-y-4 pt-1">
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="leading-relaxed">
              <strong>Fiyat Farkı Tespit Edildi:</strong> Aşağıdaki ürünlerin faturadaki net alış fiyatı (iskontolar düşülmüş, KDV hariç) ile karttaki kayıtlı fiyatı uyuşmuyor. İşaretlediğiniz ürünlerin kartındaki alış fiyatı güncellenecektir.
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto rounded-xl border border-border">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 border-b border-border bg-surface-2 text-muted font-semibold">
                <tr>
                  <th className="p-3 w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={(e) => toggleAll(e.target.checked)}
                      className="size-4 rounded border-border accent-primary cursor-pointer"
                      title="Tümünü seç / kaldır"
                    />
                  </th>
                  <th className="p-3">Ürün</th>
                  <th className="p-3 text-right">Mevcut Alış</th>
                  <th className="p-3 text-center w-8"></th>
                  <th className="p-3 text-right">Yeni Net Alış</th>
                  <th className="p-3 text-right">Fark / Değişim</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((it) => {
                  const isChecked = !!selectedMap[it.productId];
                  const isIncrease = it.diff > 0;
                  return (
                    <tr
                      key={it.productId}
                      onClick={() => toggleItem(it.productId)}
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-surface-2/60",
                        isChecked && "bg-primary-soft/10",
                      )}
                    >
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleItem(it.productId)}
                          className="size-4 rounded border-border accent-primary cursor-pointer"
                        />
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-text">{it.productName}</div>
                        {it.productCode && (
                          <div className="text-[10px] text-muted">{it.productCode}</div>
                        )}
                      </td>
                      <td className="p-3 text-right font-medium text-muted">
                        {it.currentPrice > 0 ? (
                          formatMoney(it.currentPrice, it.currency)
                        ) : (
                          <span className="italic text-muted/70">Tanımsız</span>
                        )}
                      </td>
                      <td className="p-3 text-center text-muted">
                        <ArrowRight className="inline size-3.5" />
                      </td>
                      <td className="p-3 text-right font-bold text-text">
                        {formatMoney(it.newNetPrice, it.currency)}
                      </td>
                      <td className="p-3 text-right font-semibold">
                        <span
                          className={cn(
                            "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px]",
                            isIncrease
                              ? "bg-danger-soft text-danger"
                              : "bg-success-soft text-success",
                          )}
                        >
                          {isIncrease ? (
                            <TrendingUp className="size-3" />
                          ) : (
                            <TrendingDown className="size-3" />
                          )}
                          {isIncrease ? "+" : ""}
                          {formatMoney(it.diff, it.currency)} (%{it.percentChange}%)
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-border pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="w-full sm:w-auto"
            >
              Vazgeç
            </Button>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={onConfirmWithoutPriceUpdate}
                disabled={saving}
                className="w-full sm:w-auto"
                title="Ürün kartındaki alış fiyatlarını değiştirmeden sadece faturayı kaydeder"
              >
                Değiştirmeden Kaydet
              </Button>
              <Button
                type="button"
                onClick={handleUpdate}
                loading={saving}
                disabled={selectedCount === 0}
                className="w-full sm:w-auto"
              >
                <Check className="size-4" />
                {selectedCount > 0
                  ? `Kartları Güncelle (${selectedCount}) ve Kaydet`
                  : "Faturayı Kaydet"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
