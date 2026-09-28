"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { Plus, Trash2, TrendingUp, Sparkles, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/money-input";
import { Switch } from "@/components/ui/switch";
import { Combobox } from "@/components/ui/combobox";
import { Segmented } from "@/components/ui/segmented";
import { ScanButton } from "@/components/shared/barcode-scanner";
import { newId, useCategories, useRows, useRpc, useSave, useUnits, useUpdate, useWarehouses, type Row } from "@/lib/data";
import { CURRENCIES, VAT_RATES } from "@/lib/doc-types";
import { useOrg } from "@/providers/org-provider";
import { isoDate, formatMoney } from "@/lib/format";
import { useConfirm } from "@/components/ui/confirm";
import { cn } from "@/lib/utils";

type Product = Row<"products">;
type AltUnit = { id: string; unit_id: string; factor: number; barcode: string; sale_price: number | null; _new?: boolean };

type Values = {
  type: "product" | "service";
  name: string;
  code: string;
  barcode: string;
  category_id: string | null;
  unit_id: string;
  vat_rate: string;
  sale_price: number;
  sale_price_includes_vat: boolean;
  sale_currency: string;
  purchase_price: number;
  purchase_price_includes_vat: boolean;
  purchase_currency: string;
  track_stock: boolean;
  critical_stock: number | null;
  notes: string;
  is_active: boolean;
  opening_qty: number;
  opening_cost: number;
  opening_wh: string;
};

export function ProductForm({ product, onSaved, onCancel, defaultName }: { product?: Product | null; onSaved: (p: Product) => void; onCancel?: () => void; defaultName?: string }) {
  const confirm = useConfirm();
  const { org } = useOrg();
  const units = useUnits();
  const warehouses = useWarehouses();
  const categories = useCategories("product");
  const saveProduct = useSave("products");
  const saveCategory = useSave("categories");
  const saveUnit = useSave("product_units");
  const updUnit = useUpdate("product_units");
  const adjust = useRpc("adjust_stock");
  const existingUnits = useRows<Row<"product_units">>("product_units", {
    params: ["p", product?.id],
    enabled: !!product,
    filter: (q) => q.eq("product_id", product!.id),
  });
  const [altUnits, setAltUnits] = React.useState<AltUnit[] | null>(null);
  const alt: AltUnit[] =
    altUnits ??
    (existingUnits.data ?? []).map((u) => ({ id: u.id, unit_id: u.unit_id, factor: Number(u.factor), barcode: u.barcode ?? "", sale_price: u.sale_price === null ? null : Number(u.sale_price) }));

  const defaultUnit = units.data?.find((u) => u.code === "ADET")?.id ?? units.data?.[0]?.id ?? "";
  const form = useForm<Values>({
    values: {
      type: (product?.type as "product" | "service") ?? "product",
      name: product?.name ?? defaultName ?? "",
      code: product?.code ?? "",
      barcode: product?.barcode ?? "",
      category_id: product?.category_id ?? null,
      unit_id: product?.unit_id ?? defaultUnit,
      vat_rate: String(product?.vat_rate ?? org?.default_vat_rate ?? 20),
      sale_price: Number(product?.sale_price ?? 0),
      sale_price_includes_vat: product?.sale_price_includes_vat ?? false,
      sale_currency: product?.sale_currency ?? "TRY",
      purchase_price: Number(product?.purchase_price ?? 0),
      purchase_price_includes_vat: product?.purchase_price_includes_vat ?? false,
      purchase_currency: product?.purchase_currency ?? "TRY",
      track_stock: product?.track_stock ?? true,
      critical_stock: product?.critical_stock === null || product?.critical_stock === undefined ? null : Number(product.critical_stock),
      notes: product?.notes ?? "",
      is_active: product?.is_active ?? true,
      opening_qty: 0,
      opening_cost: 0,
      opening_wh: warehouses.data?.find((w) => w.is_default)?.id ?? "",
    },
    resetOptions: { keepDirtyValues: true },
  });
  const type = form.watch("type");
  const trackStock = form.watch("track_stock");
  const purchasePriceWatch = form.watch("purchase_price") || 0;
  const salePriceWatch = form.watch("sale_price") || 0;
  const currency = form.watch("sale_currency") || "TRY";
  const isVatInc = form.watch("sale_price_includes_vat");
  const numVatRate = Number(form.watch("vat_rate") || 20);

  const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
  const r4 = (n: number) => Math.round((n + Number.EPSILON) * 10000) / 10000;

  // Canlı KDV ve net/brüt tutar hesaplamaları
  let netSale = salePriceWatch;
  let vatSaleAmount = 0;
  let totalSaleWithVat = salePriceWatch;

  if (isVatInc) {
    totalSaleWithVat = salePriceWatch;
    netSale = numVatRate > 0 ? r2(salePriceWatch / (1 + numVatRate / 100)) : salePriceWatch;
    vatSaleAmount = r2(totalSaleWithVat - netSale);
  } else {
    netSale = salePriceWatch;
    vatSaleAmount = r2((salePriceWatch * numVatRate) / 100);
    totalSaleWithVat = r2(netSale + vatSaleAmount);
  }

  let netBuy = purchasePriceWatch;
  let vatBuyAmount = 0;
  let totalBuyWithVat = purchasePriceWatch;

  if (isVatInc) {
    totalBuyWithVat = purchasePriceWatch;
    netBuy = numVatRate > 0 ? r2(purchasePriceWatch / (1 + numVatRate / 100)) : purchasePriceWatch;
    vatBuyAmount = r2(totalBuyWithVat - netBuy);
  } else {
    netBuy = purchasePriceWatch;
    vatBuyAmount = r2((purchasePriceWatch * numVatRate) / 100);
    totalBuyWithVat = r2(netBuy + vatBuyAmount);
  }

  const initialPurchase = Number(product?.purchase_price ?? 0);
  const initialSale = Number(product?.sale_price ?? 0);

  const [profitMargin, setProfitMargin] = React.useState<number>(() => {
    if (initialPurchase > 0 && initialSale >= initialPurchase) {
      return r2(((initialSale - initialPurchase) / initialPurchase) * 100);
    }
    return 0;
  });

  const [profitAmount, setProfitAmount] = React.useState<number>(() => {
    if (initialSale >= initialPurchase && initialPurchase > 0) {
      return r2(initialSale - initialPurchase);
    }
    return 0;
  });

  React.useEffect(() => {
    const pBuy = Number(product?.purchase_price ?? 0);
    const pSale = Number(product?.sale_price ?? 0);
    if (pBuy > 0 && pSale >= pBuy) {
      setProfitAmount(r2(pSale - pBuy));
      setProfitMargin(r2(((pSale - pBuy) / pBuy) * 100));
    } else {
      setProfitAmount(0);
      setProfitMargin(0);
    }
  }, [product]);

  const handlePurchasePriceChange = (val: number) => {
    form.setValue("purchase_price", val, { shouldDirty: true });
    if (val > 0 && profitMargin > 0) {
      const pAmt = r2(val * (profitMargin / 100));
      const sPrice = r2(val + pAmt);
      setProfitAmount(pAmt);
      form.setValue("sale_price", sPrice, { shouldDirty: true });
    } else if (val > 0) {
      const sPrice = form.getValues("sale_price") || 0;
      if (sPrice >= val) {
        const pAmt = r2(sPrice - val);
        const pMar = r2((pAmt / val) * 100);
        setProfitAmount(pAmt);
        setProfitMargin(pMar);
      } else {
        setProfitAmount(0);
        setProfitMargin(0);
      }
    } else {
      setProfitAmount(0);
      setProfitMargin(0);
    }
  };

  const handleProfitMarginChange = (margin: number) => {
    setProfitMargin(margin);
    const pBuy = form.getValues("purchase_price") || 0;
    if (pBuy > 0) {
      const pAmt = r2(pBuy * (margin / 100));
      const sPrice = r2(pBuy + pAmt);
      setProfitAmount(pAmt);
      form.setValue("sale_price", sPrice, { shouldDirty: true });
    }
  };

  const handleProfitAmountChange = (amt: number) => {
    setProfitAmount(amt);
    const pBuy = form.getValues("purchase_price") || 0;
    const sPrice = r2(pBuy + amt);
    form.setValue("sale_price", sPrice, { shouldDirty: true });
    if (pBuy > 0) {
      setProfitMargin(r2((amt / pBuy) * 100));
    }
  };

  const handleSalePriceChange = (val: number) => {
    form.setValue("sale_price", val, { shouldDirty: true });
    const pBuy = form.getValues("purchase_price") || 0;
    if (pBuy > 0) {
      const diff = val - pBuy;
      if (diff >= 0) {
        setProfitAmount(r2(diff));
        setProfitMargin(r2((diff / pBuy) * 100));
      } else {
        setProfitAmount(0);
        setProfitMargin(0);
      }
    }
  };

  const handleVatRateChange = (newRate: number) => {
    const oldRate = Number(form.getValues("vat_rate") || 20);
    form.setValue("vat_rate", String(newRate), { shouldDirty: true });

    const isVatInc = form.getValues("sale_price_includes_vat");
    const sPrice = form.getValues("sale_price") || 0;
    const pBuy = form.getValues("purchase_price") || 0;

    // Fiyatlar KDV dahil ise yeni KDV oranına göre fiyatları senkronize et
    if (isVatInc && sPrice > 0 && oldRate !== newRate) {
      const netSale = oldRate > 0 ? sPrice / (1 + oldRate / 100) : sPrice;
      const newSale = r2(netSale * (1 + newRate / 100));
      form.setValue("sale_price", newSale, { shouldDirty: true });

      if (pBuy > 0) {
        const netBuy = oldRate > 0 ? pBuy / (1 + oldRate / 100) : pBuy;
        const newBuy = r2(netBuy * (1 + newRate / 100));
        form.setValue("purchase_price", newBuy, { shouldDirty: true });
        const diff = newSale - newBuy;
        if (diff >= 0) {
          setProfitAmount(r2(diff));
          setProfitMargin(r2((diff / newBuy) * 100));
        }
      }
    }
  };

  const handleVatIncludedToggle = (checked: boolean) => {
    const vatRate = Number(form.getValues("vat_rate") || 20);
    const sPrice = form.getValues("sale_price") || 0;
    const pBuy = form.getValues("purchase_price") || 0;

    form.setValue("sale_price_includes_vat", checked, { shouldDirty: true });
    form.setValue("purchase_price_includes_vat", checked, { shouldDirty: true });

    if (vatRate > 0) {
      if (checked) {
        // Hariçten Dahile geçiş
        if (sPrice > 0) form.setValue("sale_price", r2(sPrice * (1 + vatRate / 100)), { shouldDirty: true });
        if (pBuy > 0) form.setValue("purchase_price", r2(pBuy * (1 + vatRate / 100)), { shouldDirty: true });
      } else {
        // Dahilden Hariçe geçiş
        if (sPrice > 0) form.setValue("sale_price", r2(sPrice / (1 + vatRate / 100)), { shouldDirty: true });
        if (pBuy > 0) form.setValue("purchase_price", r2(pBuy / (1 + vatRate / 100)), { shouldDirty: true });
      }
    }
  };

  const handleCurrencyChange = (curr: string) => {
    form.setValue("purchase_currency", curr, { shouldDirty: true });
    form.setValue("sale_currency", curr, { shouldDirty: true });
  };

  const submit = form.handleSubmit(async (v) => {
    if (!v.name.trim()) return form.setError("name", { message: "Ürün adı gerekli" });

    if (product) {
      const ok = await confirm({
        title: "Ürün güncellensin mi?",
        description: "Ürün kartındaki değişiklikler kaydedilecek. Onaylıyor musunuz?",
        confirmText: "Evet, Güncelle",
      });
      if (!ok) return;
    }

    const id = product?.id ?? newId();
    const row = {
      id,
      type: v.type,
      name: v.name.trim(),
      code: v.code.trim() || null,
      barcode: v.barcode.trim() || null,
      category_id: v.category_id || null,
      unit_id: v.unit_id || null,
      vat_rate: Number(v.vat_rate),
      sale_price: v.sale_price,
      sale_price_includes_vat: v.sale_price_includes_vat,
      sale_currency: v.sale_currency,
      purchase_price: v.purchase_price,
      purchase_price_includes_vat: v.purchase_price_includes_vat,
      purchase_currency: v.purchase_currency,
      track_stock: v.type === "product" && v.track_stock,
      critical_stock: v.critical_stock || null,
      notes: v.notes.trim() || null,
      is_active: v.is_active,
      ...(product ? {} : { avg_cost: v.opening_cost || (v.purchase_price_includes_vat ? v.purchase_price / (1 + Number(v.vat_rate) / 100) : v.purchase_price) }),
    };
    const res = await saveProduct.save<Product>(row, product ? "Ürün güncellendi" : "Ürün oluşturuldu");

    // alternatif birimler
    if (altUnits) {
      const keep = new Set(altUnits.map((u) => u.id));
      for (const old of existingUnits.data ?? []) if (!keep.has(old.id)) await updUnit.remove(old.id, "");
      for (const u of altUnits) {
        if (!u.unit_id || !u.factor) continue;
        await saveUnit.save({ id: u.id, product_id: id, unit_id: u.unit_id, factor: u.factor, barcode: u.barcode || null, sale_price: u.sale_price });
      }
    }
    // açılış stoğu
    if (!product && v.opening_qty && row.track_stock) {
      await adjust.call({
        p_org: org!.id,
        p_product: id,
        p_warehouse: v.opening_wh || null,
        p_quantity: v.opening_qty,
        p_mode: "opening",
        p_date: isoDate(),
        p_note: "Açılış stoğu",
        p_unit_cost: v.opening_cost || row.avg_cost || 0,
        p_id: newId(),
      });
    }
    onSaved(res.data as Product);
  });

  const unitName = (id: string) => units.data?.find((u) => u.id === id)?.name ?? "";
  const baseUnit = unitName(form.watch("unit_id"));

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
      <Controller
        control={form.control}
        name="type"
        render={({ field }) => (
          <div className="sm:col-span-2">
            <Segmented value={field.value} onChange={field.onChange} options={[{ value: "product", label: "Ürün (stoklu)" }, { value: "service", label: "Hizmet" }]} />
          </div>
        )}
      />
      <Field label="Ad *" htmlFor="name" error={form.formState.errors.name?.message} className="sm:col-span-2">
        <Input id="name" autoFocus {...form.register("name")} />
      </Field>
      <Field label="Stok kodu" htmlFor="code">
        <Input id="code" {...form.register("code")} />
      </Field>
      <Field label="Barkod" htmlFor="barcode">
        <div className="flex gap-2">
          <Input id="barcode" inputMode="numeric" {...form.register("barcode")} />
          <ScanButton onDetected={(c) => form.setValue("barcode", c, { shouldDirty: true })} />
        </div>
      </Field>
      <Field label="Kategori">
        <Controller
          control={form.control}
          name="category_id"
          render={({ field }) => (
            <Combobox
              value={field.value}
              onChange={field.onChange}
              clearable
              placeholder="Kategori seçin"
              options={(categories.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
              onCreate={async (name) => {
                if (!name.trim()) return;
                const r = await saveCategory.save<{ id: string }>({ type: "product", name: name.trim() });
                field.onChange(r.data?.id ?? null);
              }}
              createLabel="Yeni kategori"
            />
          )}
        />
      </Field>
      <Field label="Ana birim" htmlFor="unit_id">
        <NativeSelect id="unit_id" {...form.register("unit_id")}>
          {units.data?.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </NativeSelect>
      </Field>

      {/* Fiyatlandırma & Kâr Marjı (Sade, Tek KDV ve Senkronize) */}
      <div className="rounded-2xl border border-border bg-surface-2/40 p-4 sm:col-span-2">
        {/* Üst Kontrol Barı: Başlık, Tek KDV Oranı, Tek KDV Dahil Switch ve Para Birimi */}
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-xs">
              <TrendingUp className="size-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-text">Fiyatlandırma & Kâr Marjı</div>
              <div className="text-xs text-muted">Tek KDV oranı üzerinden tüm fiyatlar senkronize hesaplanır</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Tek KDV Oranı Seçimi */}
            <div className="flex items-center gap-1 rounded-lg border border-border/80 bg-surface p-1 shadow-2xs">
              <span className="px-1 text-[11px] font-bold text-muted">KDV:</span>
              {[0, 1, 10, 20].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleVatRateChange(r)}
                  className={cn(
                    "h-6 min-w-[34px] rounded px-1.5 text-xs font-bold transition-all",
                    numVatRate === r
                      ? "bg-primary text-white shadow-xs"
                      : "bg-surface-2 text-muted hover:text-text hover:bg-surface-3",
                  )}
                >
                  %{r}
                </button>
              ))}
            </div>

            {/* Tek KDV Dahil Switch'i */}
            <label className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-surface px-2.5 py-1 text-xs font-semibold text-text cursor-pointer select-none shadow-2xs">
              <Switch checked={isVatInc} onCheckedChange={handleVatIncludedToggle} />
              <span>{isVatInc ? "KDV Dahil" : "KDV Hariç"}</span>
            </label>

            {/* Tek Para Birimi Seçimi */}
            <NativeSelect
              value={currency}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              className="h-8 w-20 text-xs font-bold"
              aria-label="Para birimi"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>

        {/* 3 Ana Adım Kutusu */}
        <div className="grid gap-3 sm:grid-cols-3">
          {/* 1. AŞAMA: ALIŞ FİYATI */}
          <div className="flex flex-col justify-between gap-2 rounded-xl border border-border bg-surface p-3.5 shadow-xs">
            <div>
              <div className="mb-2 flex items-center justify-between text-xs font-bold text-muted">
                <span>1. ALIŞ FİYATI</span>
                <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold">{currency}</span>
              </div>
              <Controller
                control={form.control}
                name="purchase_price"
                render={({ field }) => (
                  <NumberInput
                    value={field.value}
                    onChange={handlePurchasePriceChange}
                    decimals={4}
                    aria-label="Alış fiyatı"
                    placeholder="0,00"
                    className="h-10 text-base font-semibold"
                  />
                )}
              />
            </div>
            <div className="text-[11px] text-muted">
              {isVatInc ? (
                <span>KDV Dahil · Net: {formatMoney(netBuy, currency)}</span>
              ) : (
                <span>KDV Hariç · +%{numVatRate} KDV ile: {formatMoney(totalBuyWithVat, currency)}</span>
              )}
            </div>
          </div>

          {/* 2. AŞAMA: % KÂR MARJI & KÂR TUTARI */}
          <div className="flex flex-col justify-between gap-2 rounded-xl border border-primary/25 bg-primary-soft/30 p-3.5 shadow-xs">
            <div>
              <div className="mb-2 flex items-center justify-between text-xs font-bold text-primary">
                <span className="flex items-center gap-1">
                  <Percent className="size-3.5" />
                  2. % KÂR MARJI & KÂR
                </span>
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">Otomatik</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-muted">Kâr Marjı (%)</label>
                  <NumberInput
                    value={profitMargin}
                    onChange={handleProfitMarginChange}
                    decimals={2}
                    placeholder="%0"
                    className="h-10 text-sm font-semibold"
                    aria-label="Kâr marjı yüzdesi"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-muted">Kâr Tutarı</label>
                  <NumberInput
                    value={profitAmount}
                    onChange={handleProfitAmountChange}
                    decimals={4}
                    placeholder="0,00"
                    className="h-10 text-sm font-semibold"
                    aria-label="Kâr tutarı"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted">
              <span>Alış maliyeti üzerinden</span>
              {profitAmount > 0 ? (
                <span className="font-semibold text-success">+{formatMoney(profitAmount, currency)} (%{profitMargin})</span>
              ) : (
                <span>—</span>
              )}
            </div>
          </div>

          {/* 3. AŞAMA: SATIŞ FİYATI */}
          <div className="flex flex-col justify-between gap-2 rounded-xl border-2 border-primary/50 bg-surface p-3.5 shadow-sm">
            <div>
              <div className="mb-2 flex items-center justify-between text-xs font-bold text-primary">
                <span>3. SATIŞ FİYATI</span>
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">{currency}</span>
              </div>
              <Controller
                control={form.control}
                name="sale_price"
                render={({ field }) => (
                  <NumberInput
                    value={field.value}
                    onChange={handleSalePriceChange}
                    decimals={4}
                    aria-label="Satış fiyatı"
                    placeholder="0,00"
                    className="h-10 text-base font-bold text-primary"
                  />
                )}
              />
            </div>
            <div className="text-[11px] font-medium text-text">
              {isVatInc ? (
                <span className="text-muted">KDV Dahil · Net: {formatMoney(netSale, currency)} + KDV: {formatMoney(vatSaleAmount, currency)}</span>
              ) : (
                <span>+ KDV %{numVatRate} ({formatMoney(vatSaleAmount, currency)}) ➔ Toplam: <strong className="text-primary font-bold">{formatMoney(totalSaleWithVat, currency)}</strong></span>
              )}
            </div>
          </div>
        </div>

        {/* Canlı Hesaplama Akış Şeridi */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface px-3.5 py-2.5 text-xs border border-border/60">
          <div className="flex flex-wrap items-center gap-1.5 text-muted">
            <span>Alış:</span>
            <span className="font-semibold text-text">{formatMoney(purchasePriceWatch, currency)}</span>
            <span className="text-muted/60">+</span>
            <span>Kâr:</span>
            <span className="font-semibold text-success">+{formatMoney(profitAmount, currency)}</span>
            <span className="rounded bg-success-soft px-1 text-[10.5px] font-bold text-success">%{profitMargin}</span>
            <span className="text-muted/60">=</span>
            <span className="font-semibold text-primary">Satış:</span>
            <span className="font-bold text-primary">{formatMoney(salePriceWatch, currency)}</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted">KDV %{numVatRate}:</span>
            <span className="font-semibold text-text">{formatMoney(vatSaleAmount, currency)}</span>
            <span className="text-muted/60">·</span>
            <span className="font-bold text-text">Toplam: {formatMoney(totalSaleWithVat, currency)}</span>
            <span className="text-[11px] text-muted">({isVatInc ? "KDV Dahil" : "KDV Hariç"})</span>
          </div>
        </div>
      </div>

      {type === "product" && (
        <div className="grid gap-3 rounded-xl border border-border p-3 sm:col-span-2 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <Controller control={form.control} name="track_stock" render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} />
            Stok takibi yap
          </label>
          {trackStock && (
            <Field label={`Kritik stok seviyesi (${baseUnit})`}>
              <Controller control={form.control} name="critical_stock" render={({ field }) => <NumberInput value={field.value} onChange={field.onChange} decimals={3} />} />
            </Field>
          )}
          {trackStock && !product && (
            <>
              <Field label={`Açılış stoğu (${baseUnit})`}>
                <Controller control={form.control} name="opening_qty" render={({ field }) => <NumberInput value={field.value} onChange={field.onChange} decimals={3} />} />
              </Field>
              <Field label="Birim maliyet (KDV hariç, ₺)">
                <Controller control={form.control} name="opening_cost" render={({ field }) => <NumberInput value={field.value} onChange={field.onChange} decimals={4} />} />
              </Field>
              <Field label="Depo">
                <NativeSelect {...form.register("opening_wh")}>
                  {warehouses.data?.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </>
          )}
        </div>
      )}

      <div className="rounded-xl border border-border p-3 sm:col-span-2">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">Alternatif birimler</div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setAltUnits([...alt, { id: newId(), unit_id: units.data?.find((u) => u.code === "KOLI")?.id ?? "", factor: 1, barcode: "", sale_price: null, _new: true }])}
          >
            <Plus /> Ekle
          </Button>
        </div>
        {!alt.length && <p className="text-xs text-muted">Örn. 1 Koli = 12 {baseUnit || "Adet"}. Belgelerde bu birimle satış yapılabilir.</p>}
        <div className="flex flex-col gap-2">
          {alt.map((u, i) => (
            <div key={u.id} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2 sm:grid-cols-[1fr_120px_1fr_120px_auto]">
              <NativeSelect value={u.unit_id} onChange={(e) => setAltUnits(alt.map((x, j) => (j === i ? { ...x, unit_id: e.target.value } : x)))} aria-label="Birim">
                <option value="">Birim</option>
                {units.data?.map((un) => (
                  <option key={un.id} value={un.id}>
                    {un.name}
                  </option>
                ))}
              </NativeSelect>
              <NumberInput value={u.factor} decimals={4} suffix={baseUnit.slice(0, 4)} onChange={(n) => setAltUnits(alt.map((x, j) => (j === i ? { ...x, factor: n } : x)))} aria-label="Katsayı" />
              <Button type="button" variant="ghost" size="icon" className="sm:order-last" onClick={() => setAltUnits(alt.filter((_, j) => j !== i))} aria-label="Kaldır">
                <Trash2 />
              </Button>
              <Input placeholder="Barkod" value={u.barcode} onChange={(e) => setAltUnits(alt.map((x, j) => (j === i ? { ...x, barcode: e.target.value } : x)))} />
              <NumberInput value={u.sale_price} placeholder="Satış fiyatı" onChange={(n) => setAltUnits(alt.map((x, j) => (j === i ? { ...x, sale_price: n || null } : x)))} aria-label="Satış fiyatı" />
            </div>
          ))}
        </div>
      </div>

      <Field label="Notlar" htmlFor="notes" className="sm:col-span-2">
        <Textarea id="notes" rows={2} {...form.register("notes")} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <Controller control={form.control} name="is_active" render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} />
        Aktif (satışta kullanılabilir)
      </label>

      <div className="flex justify-end gap-2 sm:col-span-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Vazgeç
          </Button>
        )}
        <Button type="submit" loading={saveProduct.isPending}>
          Kaydet
        </Button>
      </div>
    </form>
  );
}
