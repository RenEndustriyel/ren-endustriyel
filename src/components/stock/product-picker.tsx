"use client";

import * as React from "react";
import { Combobox } from "@/components/ui/combobox";
import { useProducts, useUnits } from "@/lib/data";
import { formatMoney, formatQty } from "@/lib/format";

/** Ürün seçici (ad, kod, barkod ile arama) */
export function ProductPicker({
  value,
  onChange,
  onlyStock,
  placeholder = "Ürün seçin",
  onCreate,
  showPrice = true,
  autoOpen,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
  onlyStock?: boolean;
  placeholder?: string;
  onCreate?: (name: string) => void;
  showPrice?: boolean;
  autoOpen?: boolean;
}) {
  const products = useProducts();
  const units = useUnits();
  const options = React.useMemo(
    () =>
      (products.data ?? [])
        .filter((p) => p.is_active && (!onlyStock || (p.type === "product" && p.track_stock)))
        .map((p) => ({
          value: p.id,
          label: p.name,
          sub: [
            p.code,
            p.type === "product" && p.track_stock ? `Stok: ${formatQty(p.stock_qty)} ${units.data?.find((u) => u.id === p.unit_id)?.name ?? ""}` : "Hizmet",
            showPrice ? formatMoney(p.sale_price, p.sale_currency) : null,
          ]
            .filter(Boolean)
            .join(" · "),
          keywords: `${p.barcode ?? ""} ${p.code ?? ""}`,
        })),
    [products.data, units.data, onlyStock, showPrice],
  );
  return (
    <Combobox
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      searchPlaceholder="Ad, kod veya barkod…"
      onCreate={onCreate}
      createLabel="Yeni ürün"
      autoOpen={autoOpen}
    />
  );
}
