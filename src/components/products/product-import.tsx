"use client";

import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useOrg } from "@/providers/org-provider";
import { ImportDialog, type ImportField } from "@/components/shared/import-dialog";
import { toNumber } from "@/lib/excel";
import { newId, useCategories, useUnits, useWarehouses } from "@/lib/data";
import { isoDate } from "@/lib/format";

const FIELDS: ImportField[] = [
  { key: "name", label: "Ürün adı", required: true, aliases: ["ad", "ürün", "stok adı", "malzeme", "hizmet"], example: "Sıvı El Sabunu 5 KG" },
  { key: "code", label: "Stok kodu", aliases: ["kod", "ürün kodu"] },
  { key: "barcode", label: "Barkod", aliases: ["ean"] },
  { key: "category", label: "Kategori", aliases: ["grup"] },
  { key: "unit", label: "Birim", example: "Adet" },
  { key: "vat_rate", label: "KDV oranı", aliases: ["kdv", "kdv %"], example: 20 },
  { key: "sale_price", label: "Satış fiyatı", aliases: ["fiyat", "satış"], example: 150 },
  { key: "purchase_price", label: "Alış fiyatı", aliases: ["alış", "maliyet"], example: 100 },
  { key: "stock", label: "Stok miktarı", aliases: ["stok", "miktar", "adet"], example: 25 },
  { key: "critical", label: "Kritik stok", aliases: ["minimum"] },
];

const norm = (s: string) => s.toLocaleLowerCase("tr-TR").trim();

export function ProductImport({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { org } = useOrg();
  const qc = useQueryClient();
  const units = useUnits();
  const cats = useCategories("product");
  const warehouses = useWarehouses();
  return (
    <ImportDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Ürünleri içe aktar"
      templateName="urun-sablonu"
      fields={FIELDS}
      onImport={async (rows) => {
        const catMap = new Map((cats.data ?? []).map((c) => [norm(c.name), c.id]));
        // eksik kategorileri oluştur
        const missing = [...new Set(rows.map((r) => String(r.category ?? "").trim()).filter((c) => c && !catMap.has(norm(c))))];
        if (missing.length) {
          const { data, error } = await supabase
            .from("categories")
            .insert(missing.map((name) => ({ org_id: org!.id, type: "product", name })))
            .select();
          if (error) throw error;
          data.forEach((c) => catMap.set(norm(c.name), c.id));
        }
        const unitOf = (u: unknown) => {
          const n = norm(String(u ?? ""));
          return (
            units.data?.find((x) => norm(x.name) === n || norm(x.code) === n || (n === "kg" && x.code === "KG") || (n.startsWith("ad") && x.code === "ADET"))?.id ??
            units.data?.find((x) => x.code === "ADET")?.id ??
            null
          );
        };
        const wh = warehouses.data?.find((w) => w.is_default)?.id ?? warehouses.data?.[0]?.id;
        const s = (v: unknown) => (v === undefined || v === null || String(v).trim() === "" ? null : String(v).trim());
        const products = rows.map((r) => {
          const vat = r.vat_rate === undefined || r.vat_rate === "" ? Number(org!.default_vat_rate) : toNumber(r.vat_rate);
          return {
            id: newId(),
            org_id: org!.id,
            name: String(r.name).trim(),
            code: s(r.code),
            barcode: s(r.barcode),
            category_id: s(r.category) ? catMap.get(norm(String(r.category))) ?? null : null,
            unit_id: unitOf(r.unit),
            vat_rate: vat < 1 && vat > 0 ? vat * 100 : vat,
            sale_price: toNumber(r.sale_price),
            purchase_price: toNumber(r.purchase_price),
            avg_cost: toNumber(r.purchase_price),
            critical_stock: s(r.critical) ? toNumber(r.critical) : null,
            _stock: toNumber(r.stock),
          };
        });
        for (let i = 0; i < products.length; i += 300) {
          const chunk = products.slice(i, i + 300);
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { error } = await supabase.from("products").insert(chunk.map(({ _stock, ...p }) => p));
          if (error) throw error;
        }
        const withStock = products.filter((p) => p._stock);
        for (let i = 0; i < withStock.length; i += 300) {
          const { error } = await supabase.from("stock_movements").insert(
            withStock.slice(i, i + 300).map((p) => ({
              org_id: org!.id,
              product_id: p.id,
              warehouse_id: wh!,
              movement_date: isoDate(),
              movement_type: "opening",
              quantity: p._stock,
              unit_cost: p.avg_cost,
              description: "Açılış stoğu (içe aktarma)",
            })),
          );
          if (error) throw error;
        }
        qc.invalidateQueries();
        return products.length;
      }}
    />
  );
}
