"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, ScanBarcode, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import {
  newId,
  patchListCaches,
  useAccounts,
  usePriceLists,
  useProducts,
  useRows,
  useRpc,
  useUnits,
  useWarehouses,
  type Row,
} from "@/lib/data";
import { DOC_TYPES, VAT_RATES, CURRENCIES, type DocType, docFlow } from "@/lib/doc-types";
import { addDays, calcDocument, convertVat } from "@/lib/doc-calc";
import { formatMoney, formatNumber, isoDate } from "@/lib/format";
import { rateFor, useRates } from "@/lib/rates";
import { useOrg } from "@/providers/org-provider";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/money-input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { BarcodeScanner } from "@/components/shared/barcode-scanner";
import { ContactPicker } from "@/components/contacts/contact-picker";
import { ProductPicker } from "@/components/stock/product-picker";
import { MultiDiscountInput } from "./multi-discount-input";
import { PriceUpdateDialog, type PriceDiffItem } from "./price-update-dialog";
import { cn } from "@/lib/utils";

type DocRow = Row<"documents"> & { lines: Row<"document_lines">[] };

export type EditorLine = {
  id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_id: string | null;
  unit_factor: number;
  unit_price: number;
  discount_rate: number;
  discount_str?: string;
  vat_rate: number;
};

type EditorDoc = {
  id: string;
  doc_type: DocType;
  status: string;
  number: string;
  issue_date: string;
  due_date: string;
  valid_until: string;
  contact_id: string | null;
  warehouse_id: string | null;
  currency: string;
  exchange_rate: number;
  prices_include_vat: boolean;
  discount_type: "rate" | "amount";
  discount_value: number;
  description: string;
  notes: string;
  terms: string;
  source_document_id: string | null;
  affects_stock: boolean;
};

const emptyLine = (vat: number): EditorLine => ({
  id: newId(),
  product_id: null,
  description: "",
  quantity: 1,
  unit_id: null,
  unit_factor: 1,
  unit_price: 0,
  discount_rate: 0,
  discount_str: "",
  vat_rate: vat,
});

/** Belge ve satırlarını tek sorguda getirir */
export function useDocument(id: string | null | undefined) {
  return useQuery({
    queryKey: ["doc", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("documents").select("*, lines:document_lines(*)").eq("id", id!).maybeSingle();
      if (error) throw error;
      if (data) (data as DocRow).lines.sort((a, b) => a.position - b.position);
      return data as DocRow | null;
    },
  });
}

export function DocumentEditor({
  type,
  editId,
  sourceId,
  copyId,
  contactId,
}: {
  type: DocType;
  editId?: string | null;
  sourceId?: string | null;
  copyId?: string | null;
  contactId?: string | null;
}) {
  const router = useRouter();
  const { org } = useOrg();
  const existing = useDocument(editId);
  const source = useDocument(sourceId ?? copyId);
  const loading = (editId && existing.isPending) || ((sourceId || copyId) && source.isPending);
  if (loading) return <Skeleton className="mx-auto h-96 max-w-5xl rounded-card" />;
  const base = existing.data ?? source.data ?? null;
  const cfg = DOC_TYPES[type];
  return (
    <EditorInner
      key={`${editId ?? ""}-${sourceId ?? ""}-${copyId ?? ""}`}
      type={type}
      base={base}
      isEdit={!!existing.data}
      isConversion={!!sourceId && !!source.data && !existing.data}
      contactId={contactId}
      defaultVat={Number(org?.default_vat_rate ?? 20)}
      onDone={(id) => router.replace(`${cfg.base}/detay?id=${id}`)}
    />
  );
}

function EditorInner({
  type,
  base,
  isEdit,
  isConversion,
  contactId,
  defaultVat,
  onDone,
}: {
  type: DocType;
  base: DocRow | null;
  isEdit: boolean;
  isConversion: boolean;
  contactId?: string | null;
  defaultVat: number;
  onDone: (id: string) => void;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const cfg = DOC_TYPES[type];
  const { org } = useOrg();
  const products = useProducts();
  const units = useUnits();
  const warehouses = useWarehouses();
  const accounts = useAccounts();
  const priceLists = usePriceLists();
  const contacts = useRows<Row<"contacts">>("contacts", { order: [{ column: "name" }] });
  const altUnits = useRows<Row<"product_units">>("product_units");
  const plItems = useRows<Row<"price_list_items">>("price_list_items");
  const rates = useRates();
  const saveDoc = useRpc<Row<"documents">>("save_document", (qc, args) => {
    // çevrimdışı iyimser kayıt: listede hemen görünsün
    const d = args.p_doc as EditorDoc & Record<string, unknown>;
    const t = calcDocument(d, args.p_lines as EditorLine[]);
    patchListCaches(qc, "documents", { ...d, number: d.number ?? null, total: t.total, total_try: t.total_try, paid_amount: 0, payment_status: cfg.payable ? "unpaid" : "none", created_at: new Date().toISOString() });
  });
  const [scanOpen, setScanOpen] = React.useState(false);
  const [showMore, setShowMore] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Alış faturasında ürün kartı alış fiyatı güncelleme modalı durumları
  const [priceDiffModalOpen, setPriceDiffModalOpen] = React.useState(false);
  const [priceDiffItems, setPriceDiffItems] = React.useState<PriceDiffItem[]>([]);
  const [pendingStatus, setPendingStatus] = React.useState<string | undefined>(undefined);
  const [updatingPrices, setUpdatingPrices] = React.useState(false);

  const today = isoDate();
  const [doc, setDoc] = React.useState<EditorDoc>(() => {
    const fromSource = isConversion && base;
    return {
      id: isEdit && base ? base.id : newId(),
      doc_type: type,
      status: isEdit && base ? base.status : cfg.statuses ? "pending" : "approved",
      number: isEdit && base ? base.number ?? "" : "",
      issue_date: isEdit && base ? base.issue_date : today,
      due_date: isEdit && base ? base.due_date ?? "" : "",
      valid_until: isEdit && base ? base.valid_until ?? "" : type === "quote" ? addDays(today, 15) : "",
      contact_id: base?.contact_id ?? contactId ?? null,
      warehouse_id: base?.warehouse_id ?? null,
      currency: base?.currency ?? "TRY",
      exchange_rate: Number(base?.exchange_rate ?? 1),
      prices_include_vat: base?.prices_include_vat ?? false,
      discount_type: (base?.discount_type as "rate" | "amount") ?? "rate",
      discount_value: Number(base?.discount_value ?? 0),
      description: base?.description ?? "",
      notes: base?.notes ?? "",
      terms: base?.terms ?? "",
      source_document_id: fromSource ? base!.id : isEdit ? base?.source_document_id ?? null : null,
      // irsaliyeden faturaya dönüşümde stok irsaliyede düşülmüştür
      affects_stock: isEdit && base ? base.affects_stock : !(fromSource && (base!.doc_type === "sales_delivery" || base!.doc_type === "purchase_delivery")),
    };
  });
  const [lines, setLines] = React.useState<EditorLine[]>(() =>
    base?.lines?.length
      ? base.lines.map((l) => ({
          id: isEdit ? l.id : newId(),
          product_id: l.product_id,
          description: l.description ?? "",
          quantity: Number(l.quantity),
          unit_id: l.unit_id,
          unit_factor: Number(l.unit_factor),
          unit_price: Number(l.unit_price),
          discount_rate: Number(l.discount_rate),
          discount_str: Number(l.discount_rate) > 0 ? String(l.discount_rate) : "",
          vat_rate: Number(l.vat_rate),
        }))
      : [emptyLine(defaultVat)],
  );
  const [pay, setPay] = React.useState({ enabled: !isEdit && type === "pos_sale", account_id: "", method: "cash" });

  React.useEffect(() => {
    if (!isEdit && pay.enabled && !pay.account_id && accounts.data?.length) {
      const firstActive =
        accounts.data.find((a) => a.is_active && (a.currency === doc.currency || a.currency === "TRY"))?.id ||
        accounts.data[0]?.id;
      if (firstActive) {
        setPay((p) => ({ ...p, account_id: firstActive }));
      }
    }
  }, [accounts.data, isEdit, pay.enabled, pay.account_id, doc.currency]);

  const set = <K extends keyof EditorDoc>(k: K, v: EditorDoc[K]) => setDoc((d) => ({ ...d, [k]: v }));
  const contact = contacts.data?.find((c) => c.id === doc.contact_id);
  const totals = calcDocument(doc, lines);
  const isSales = cfg.side === "sales";

  // yeni belgede cari seçilince vadeyi ata
  const onContact = (id: string | null, c?: Row<"contacts">) => {
    setDoc((d) => ({
      ...d,
      contact_id: id,
      due_date: cfg.payable && c?.payment_term_days && !isEdit ? addDays(d.issue_date, c.payment_term_days) : d.due_date,
      currency: !isEdit && !lines.some((l) => l.product_id) && c?.currency ? c.currency : d.currency,
    }));
  };

  // döviz seçilince kuru getir
  const changeCurrency = (cur: string) =>
    setDoc((d) => ({ ...d, currency: cur, exchange_rate: cur === "TRY" ? 1 : rateFor(rates.data, cur) || d.exchange_rate || 1 }));

  const priceFor = React.useCallback(
    (p: Row<"products">, unitFactor: number, altPrice?: number | null) => {
      // cari fiyat listesi
      const plId = isSales ? contact?.price_list_id : null;
      const pl = plId ? priceLists.data?.find((x) => x.id === plId) : null;
      const plItem = pl ? plItems.data?.find((i) => i.price_list_id === pl.id && i.product_id === p.id) : null;
      let price: number;
      let incl: boolean;
      let cur: string;
      if (plItem && pl) {
        price = Number(plItem.price) * unitFactor;
        incl = pl.includes_vat;
        cur = pl.currency;
      } else if (isSales) {
        price = altPrice ?? Number(p.sale_price) * unitFactor;
        incl = p.sale_price_includes_vat;
        cur = p.sale_currency;
      } else {
        price = Number(p.purchase_price) * unitFactor;
        incl = p.purchase_price_includes_vat;
        cur = p.purchase_currency;
      }
      // para birimi dönüşümü
      if (cur !== doc.currency) {
        const inTry = price * (cur === "TRY" ? 1 : rateFor(rates.data, cur) || 1);
        price = inTry / (doc.exchange_rate || 1);
      }
      return Math.round(convertVat(price, Number(p.vat_rate), incl, doc.prices_include_vat) * 10000) / 10000;
    },
    [contact, priceLists.data, plItems.data, isSales, doc.currency, doc.exchange_rate, doc.prices_include_vat, rates.data],
  );

  // İskonto sonrası KDV hariç net birim alış fiyatı hesabı
  const calcNetPurchasePrice = React.useCallback(
    (l: EditorLine, p?: Row<"products"> | null) => {
      if (!l.unit_price) return 0;
      const exclVat = doc.prices_include_vat
        ? l.unit_price / (1 + l.vat_rate / 100)
        : l.unit_price;
      const netAfterDisc = exclVat * (1 - (l.discount_rate || 0) / 100);
      const baseNet = netAfterDisc / (l.unit_factor || 1);
      const prodCurrency = p?.purchase_currency || "TRY";
      let inProdCurrency = baseNet;
      if (doc.currency !== prodCurrency) {
        const inTry = baseNet * (doc.currency === "TRY" ? 1 : doc.exchange_rate || 1);
        const prodRate = prodCurrency === "TRY" ? 1 : rateFor(rates.data, prodCurrency) || 1;
        inProdCurrency = inTry / prodRate;
      }
      return Math.round((inProdCurrency + Number.EPSILON) * 100) / 100;
    },
    [doc.prices_include_vat, doc.currency, doc.exchange_rate, rates.data],
  );

  const setLine = (i: number, patch: Partial<EditorLine>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const pickProduct = (i: number, pid: string | null) => {
    const p = products.data?.find((x) => x.id === pid);
    if (!p) return setLine(i, { product_id: null });
    setLine(i, {
      product_id: p.id,
      description: p.name,
      unit_id: p.unit_id,
      unit_factor: 1,
      vat_rate: Number(p.vat_rate),
      unit_price: priceFor(p, 1),
      discount_rate: 0,
      discount_str: "",
    });
  };

  const pickUnit = (i: number, unitId: string) => {
    const l = lines[i];
    const p = products.data?.find((x) => x.id === l.product_id);
    if (!p) return setLine(i, { unit_id: unitId || null });
    const alt = altUnits.data?.find((a) => a.product_id === p.id && a.unit_id === unitId);
    const factor = unitId === p.unit_id || !alt ? 1 : Number(alt.factor);
    setLine(i, { unit_id: unitId, unit_factor: factor, unit_price: priceFor(p, factor, alt?.sale_price !== null && alt?.sale_price !== undefined ? Number(alt.sale_price) : null) });
  };

  const addByBarcode = (code: string) => {
    const alt = altUnits.data?.find((a) => a.barcode === code);
    const p = products.data?.find((x) => x.barcode === code || x.code === code || x.id === alt?.product_id);
    if (!p) return toast.error(`Barkod bulunamadı: ${code}`);
    const unitId = alt?.unit_id ?? p.unit_id;
    const factor = alt ? Number(alt.factor) : 1;
    const existingIdx = lines.findIndex((l) => l.product_id === p.id && l.unit_id === unitId);
    if (existingIdx >= 0) return setLine(existingIdx, { quantity: lines[existingIdx].quantity + 1 });
    const line: EditorLine = {
      ...emptyLine(Number(p.vat_rate)),
      product_id: p.id,
      description: p.name,
      unit_id: unitId,
      unit_factor: factor,
      unit_price: priceFor(p, factor, alt?.sale_price !== null && alt?.sale_price !== undefined ? Number(alt.sale_price) : null),
      discount_rate: 0,
      discount_str: "",
    };
    setLines((ls) => (ls.length === 1 && !ls[0].product_id && !ls[0].description ? [line] : [...ls, line]));
  };

  const toggleInclVat = (incl: boolean) => {
    setLines((ls) => ls.map((l) => ({ ...l, unit_price: Math.round(convertVat(l.unit_price, l.vat_rate, doc.prices_include_vat, incl) * 10000) / 10000 })));
    set("prices_include_vat", incl);
  };

  const performSave = async (status?: string, updatedProductsCount?: number) => {
    setError(null);
    const valid = lines.filter((l) => l.product_id || l.description.trim());
    if (!valid.length) return setError("En az bir satır girin.");
    if (cfg.type !== "pos_sale" && !doc.contact_id && type !== "expense") return setError(`${cfg.contactLabel} seçin.`);
    if (!isEdit && pay.enabled && !pay.account_id && cfg.payable) return setError("Tahsilat / ödeme hesabını seçin.");
    const payload = {
      ...doc,
      org_id: org!.id,
      status: status ?? doc.status,
      number: doc.number.trim() || null,
      due_date: doc.due_date || null,
      valid_until: doc.valid_until || null,
      warehouse_id: doc.warehouse_id || null,
      description: doc.description.trim() || null,
      notes: doc.notes.trim() || null,
      terms: doc.terms.trim() || null,
    };
    const successMsg = isEdit
      ? "Belge güncellendi"
      : updatedProductsCount && updatedProductsCount > 0
        ? `${cfg.label} kaydedildi (${updatedProductsCount} ürünün alış fiyatı güncellendi)`
        : `${cfg.label} kaydedildi`;

    const res = await saveDoc.call(
      {
        p_doc: payload,
        p_lines: valid.map((l) => ({
          ...l,
          description: (l.description?.trim() || products.data?.find((p) => p.id === l.product_id)?.name || "Ürün").trim(),
        })),
        p_payment: !isEdit && pay.enabled && cfg.payable && pay.account_id ? { id: newId(), account_id: pay.account_id, method: pay.method } : null,
      },
      successMsg,
    );
    onDone(res.data?.id ?? doc.id);
  };

  const handleSubmitClick = (status?: string) => {
    setError(null);
    const valid = lines.filter((l) => l.product_id || l.description?.trim());
    if (!valid.length) return setError("En az bir satır girin.");
    if (cfg.type !== "pos_sale" && !doc.contact_id && type !== "expense") return setError(`${cfg.contactLabel} seçin.`);
    if (!isEdit && pay.enabled && !pay.account_id && cfg.payable) return setError("Tahsilat / ödeme hesabını seçin.");

    // Eğer alış belgesi ise ve fiyat farkı olan ürünler varsa onay diyalogu aç
    if (cfg.side === "purchase") {
      const diffs: PriceDiffItem[] = [];
      const seenProductIds = new Set<string>();

      for (const l of valid) {
        if (!l.product_id || seenProductIds.has(l.product_id)) continue;
        seenProductIds.add(l.product_id);

        const p = products.data?.find((x) => x.id === l.product_id);
        if (!p) continue;

        const newNet = calcNetPurchasePrice(l, p);
        const curBuy = Number(p.purchase_price ?? 0);
        const diff = Math.round((newNet - curBuy + Number.EPSILON) * 100) / 100;

        // Fark varsa veya ilk alış fiyatı tanımlanacaksa
        if (Math.abs(diff) >= 0.01 && newNet > 0) {
          const pct = curBuy > 0 ? Math.round((diff / curBuy) * 10000) / 100 : 100;
          diffs.push({
            productId: p.id,
            productName: p.name,
            productCode: p.code,
            currentPrice: curBuy,
            newNetPrice: newNet,
            diff,
            percentChange: pct,
            currency: p.purchase_currency || doc.currency,
            selected: true,
          });
        }
      }

      if (diffs.length > 0) {
        setPriceDiffItems(diffs);
        setPendingStatus(status);
        setPriceDiffModalOpen(true);
        return;
      }
    }

    performSave(status);
  };

  const handleConfirmWithPriceUpdate = async (selectedIds: string[]) => {
    setUpdatingPrices(true);
    try {
      const toUpdate = priceDiffItems.filter((item) => selectedIds.includes(item.productId));
      for (const item of toUpdate) {
        await supabase
          .from("products")
          .update({
            purchase_price: item.newNetPrice,
            purchase_price_includes_vat: false,
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.productId);
      }
      await qc.invalidateQueries({ queryKey: ["products"] });
      setPriceDiffModalOpen(false);
      await performSave(pendingStatus, toUpdate.length);
    } catch (err) {
      toast.error("Ürün kartları güncellenirken hata oluştu");
    } finally {
      setUpdatingPrices(false);
    }
  };

  const handleConfirmWithoutPriceUpdate = async () => {
    setPriceDiffModalOpen(false);
    await performSave(pendingStatus);
  };

  const whOptions = warehouses.data ?? [];
  const unitOptions = (pid: string | null) => {
    const p = products.data?.find((x) => x.id === pid);
    if (!p) return units.data ?? [];
    const altIds = new Set((altUnits.data ?? []).filter((a) => a.product_id === p.id).map((a) => a.unit_id));
    return (units.data ?? []).filter((u) => u.id === p.unit_id || altIds.has(u.id));
  };
  const flow = docFlow(type);
  const cashAccounts = (accounts.data ?? []).filter((a) => a.is_active);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        back
        title={isEdit ? `${cfg.label} düzenle` : isConversion ? `${cfg.label} oluştur (dönüştürme)` : `Yeni ${cfg.label.toLocaleLowerCase("tr-TR")}`}
        description={isEdit && doc.number ? doc.number : undefined}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-4">
          {/* üst bilgiler */}
          <Card>
            <CardBody className="grid gap-4 sm:grid-cols-2">
              {type !== "expense" && (
                <Field label={`${cfg.contactLabel}${type === "pos_sale" ? " (isteğe bağlı)" : " *"}`} className="sm:col-span-2">
                  <ContactPicker value={doc.contact_id} onChange={onContact} kind={cfg.contactKind} clearable={type === "pos_sale"} />
                </Field>
              )}
              <Field label="Belge no" hint={cfg.autoNumber ? "Boş bırakılırsa otomatik verilir" : `${cfg.contactLabel}nin belge numarası`}>
                <Input value={doc.number} onChange={(e) => set("number", e.target.value)} placeholder={cfg.autoNumber ? "Otomatik" : ""} />
              </Field>
              <Field label="Tarih">
                <Input
                  type="date"
                  value={doc.issue_date}
                  onChange={(e) => {
                    const v = e.target.value;
                    setDoc((d) => ({ ...d, issue_date: v, due_date: !isEdit && contact?.payment_term_days && cfg.payable ? addDays(v, contact.payment_term_days) : d.due_date }));
                  }}
                />
              </Field>
              {cfg.payable && (
                <Field label="Vade tarihi">
                  <div className="flex gap-1.5">
                    <Input type="date" value={doc.due_date} onChange={(e) => set("due_date", e.target.value)} />
                    <NativeSelect className="w-24 shrink-0" value="" onChange={(e) => e.target.value && set("due_date", addDays(doc.issue_date, Number(e.target.value)))} aria-label="Hızlı vade">
                      <option value="">Hızlı</option>
                      {[0, 7, 15, 30, 45, 60, 90].map((d) => (
                        <option key={d} value={d}>
                          {d === 0 ? "Peşin" : `${d} gün`}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                </Field>
              )}
              {type === "quote" && (
                <Field label="Geçerlilik tarihi">
                  <Input type="date" value={doc.valid_until} onChange={(e) => set("valid_until", e.target.value)} />
                </Field>
              )}
              {cfg.stock !== 0 && whOptions.length > 1 && (
                <Field label="Depo">
                  <NativeSelect value={doc.warehouse_id ?? ""} onChange={(e) => set("warehouse_id", e.target.value || null)}>
                    <option value="">Varsayılan depo</option>
                    {whOptions.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
              )}
              <div className="flex flex-wrap items-end gap-3 sm:col-span-2">
                <Field label="Para birimi" className="w-28">
                  <NativeSelect value={doc.currency} onChange={(e) => changeCurrency(e.target.value)}>
                    {CURRENCIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </NativeSelect>
                </Field>
                {doc.currency !== "TRY" && (
                  <Field label={`Kur (1 ${doc.currency} = ₺)`} className="w-40">
                    <NumberInput value={doc.exchange_rate} decimals={4} onChange={(n) => set("exchange_rate", n || 1)} />
                  </Field>
                )}
                <label className="flex h-10 items-center gap-2 text-sm">
                  <Switch checked={doc.prices_include_vat} onCheckedChange={toggleInclVat} />
                  Fiyatlara KDV dahil
                </label>
              </div>
            </CardBody>
          </Card>

          {/* satırlar */}
          <Card>
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-[15px] font-semibold">Ürün / Hizmetler</h3>
              <Button type="button" size="sm" variant="outline" onClick={() => setScanOpen(true)}>
                <ScanBarcode /> Barkod
              </Button>
            </div>
            <div className="divide-y divide-border">
              {lines.map((l, i) => (
                <div key={l.id} className="flex flex-col gap-2 px-4 py-3">
                  <div className="flex items-start gap-2">
                    <span className="mt-2.5 w-5 shrink-0 text-center text-xs text-muted">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <ProductPicker
                        value={l.product_id}
                        onChange={(v) => pickProduct(i, v)}
                        placeholder="Ürün / hizmet seçin (ad, kod, barkod…)"
                        onCreate={(name) => router.push(`/stok/urunler/yeni?ad=${encodeURIComponent(name)}`)}
                      />
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => setLines(lines.length > 1 ? lines.filter((_, j) => j !== i) : [emptyLine(defaultVat)])} aria-label="Satırı sil">
                      <Trash2 />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pl-7 pr-12 sm:grid-cols-6">
                    <label className="text-[11px] text-muted">
                      Miktar
                      <NumberInput value={l.quantity} decimals={3} onChange={(n) => setLine(i, { quantity: n })} />
                    </label>
                    <label className="text-[11px] text-muted">
                      Birim
                      <NativeSelect value={l.unit_id ?? ""} onChange={(e) => pickUnit(i, e.target.value)}>
                        <option value="">—</option>
                        {unitOptions(l.product_id).map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </NativeSelect>
                    </label>
                    <label className="text-[11px] text-muted">
                      Birim fiyat
                      <NumberInput value={l.unit_price} decimals={4} onChange={(n) => setLine(i, { unit_price: n })} />
                    </label>
                    <div className="flex flex-col">
                      <span className="mb-1 flex items-center justify-between text-[11px] text-muted">
                        <span>İskonto %</span>
                        <span className="text-[10px] text-muted/60">örn: 10+5</span>
                      </span>
                      <MultiDiscountInput
                        value={l.discount_rate}
                        discountStr={l.discount_str}
                        onChange={(rate, str) => setLine(i, { discount_rate: rate, discount_str: str })}
                        unitPrice={l.unit_price}
                        currency={doc.currency}
                      />
                    </div>
                    <label className="text-[11px] text-muted">
                      KDV
                      <NativeSelect value={String(l.vat_rate)} onChange={(e) => setLine(i, { vat_rate: Number(e.target.value) })}>
                        {VAT_RATES.map((r) => (
                          <option key={r} value={r}>
                            %{r}
                          </option>
                        ))}
                      </NativeSelect>
                    </label>
                    <div className="flex flex-col justify-end text-right">
                      <span className="text-[11px] text-muted">{doc.prices_include_vat ? "Tutar (KDV dahil)" : "Tutar"}</span>
                      <span className="num flex h-10 items-center justify-end text-sm font-semibold">
                        {formatNumber(doc.prices_include_vat ? totals.lines[i]?.total_amount : totals.lines[i]?.net_amount)}
                      </span>
                    </div>
                  </div>

                  {cfg.side === "purchase" && l.product_id && (() => {
                    const p = products.data?.find((x) => x.id === l.product_id);
                    if (!p) return null;
                    const newNet = calcNetPurchasePrice(l, p);
                    const curBuy = Number(p.purchase_price ?? 0);
                    const diff = Math.round((newNet - curBuy + Number.EPSILON) * 100) / 100;
                    const hasDiff = Math.abs(diff) >= 0.01;
                    const isInc = diff > 0;
                    const pct = curBuy > 0 ? Math.round((diff / curBuy) * 10000) / 100 : 100;
                    const curSymbol = p.purchase_currency || doc.currency;
                    return (
                      <div className="mt-1 flex flex-wrap items-center gap-2 pl-7 text-[11px]">
                        <span className="font-medium text-muted">
                          Net Alış (KDV Hariç): <strong className="text-text">{formatMoney(newNet, curSymbol)}</strong>
                        </span>
                        {curBuy === 0 ? (
                          <span className="rounded bg-primary/10 px-1.5 py-0.5 font-semibold text-primary">
                            💡 İlk alış fiyatı olarak tanımlanacak
                          </span>
                        ) : hasDiff ? (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-bold",
                              isInc ? "bg-amber-500/10 text-amber-700 dark:text-amber-300" : "bg-success-soft text-success"
                            )}
                          >
                            ⚠️ Karttaki Alış: {formatMoney(curBuy, curSymbol)} ➔ {isInc ? `+${formatMoney(diff, curSymbol)}` : formatMoney(diff, curSymbol)} ({diff > 0 ? "+" : ""}{pct}%)
                          </span>
                        ) : (
                          <span className="text-muted/70">✓ Karttaki alış fiyatı ile aynı</span>
                        )}
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>
            <div className="border-t border-border p-3">
              <Button type="button" variant="ghost" size="sm" onClick={() => setLines([...lines, emptyLine(defaultVat)])}>
                <Plus /> Satır ekle
              </Button>
            </div>
          </Card>

          <Card>
            <button type="button" onClick={() => setShowMore((s) => !s)} className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold">
              Açıklama, notlar ve koşullar
              {showMore ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </button>
            {showMore && (
              <CardBody className="grid gap-4 border-t border-border">
                <Field label="Açıklama (listede görünür)">
                  <Input value={doc.description} onChange={(e) => set("description", e.target.value)} />
                </Field>
                <Field label="Not (belgede yazdırılır)">
                  <Textarea rows={2} value={doc.notes} onChange={(e) => set("notes", e.target.value)} />
                </Field>
                <Field label="Koşullar (ödeme / teslim şartları)">
                  <Textarea rows={2} value={doc.terms} onChange={(e) => set("terms", e.target.value)} />
                </Field>
              </CardBody>
            )}
          </Card>
        </div>

        {/* toplamlar */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardBody className="flex flex-col gap-2 text-sm">
              <Row label="Ara toplam" value={formatMoney(totals.subtotal, doc.currency)} />
              <div className="flex items-center gap-2">
                <span className="flex-1 text-muted">Genel iskonto</span>
                <NativeSelect className="h-8 w-16 px-2 text-xs" value={doc.discount_type} onChange={(e) => set("discount_type", e.target.value as "rate" | "amount")}>
                  <option value="rate">%</option>
                  <option value="amount">Tutar</option>
                </NativeSelect>
                <NumberInput className="h-8 w-24" value={doc.discount_value} onChange={(n) => set("discount_value", Math.max(0, n))} />
              </div>
              {totals.discount_total > 0 && <Row label="Toplam iskonto" value={`-${formatMoney(totals.discount_total, doc.currency)}`} />}
              <Row label="Matrah" value={formatMoney(totals.net_total, doc.currency)} />
              {Object.entries(totals.vatByRate).map(([r, g]) => (
                <Row key={r} label={`KDV %${r}`} value={formatMoney(g.vat, doc.currency)} />
              ))}
              <div className="mt-1 flex items-center justify-between border-t border-border pt-3 text-lg font-bold">
                <span>Toplam</span>
                <span className="num">{formatMoney(totals.total, doc.currency)}</span>
              </div>
              {doc.currency !== "TRY" && <div className="num text-right text-xs text-muted">≈ {formatMoney(totals.total_try)}</div>}
            </CardBody>
          </Card>

          {cfg.payable && !isEdit && (
            <Card>
              <CardBody className="flex flex-col gap-3 text-sm">
                <label className="flex items-center gap-2 font-medium">
                  <Switch checked={pay.enabled} onCheckedChange={(v) => setPay((p) => ({ ...p, enabled: v, account_id: p.account_id || cashAccounts[0]?.id || "" }))} />
                  {flow === "in" ? "Tahsil edildi" : "Ödendi"}
                </label>
                {pay.enabled && (
                  <>
                    <NativeSelect value={pay.account_id} onChange={(e) => setPay((p) => ({ ...p, account_id: e.target.value }))}>
                      <option value="">Hesap seçin</option>
                      {cashAccounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.currency})
                        </option>
                      ))}
                    </NativeSelect>
                    <NativeSelect value={pay.method} onChange={(e) => setPay((p) => ({ ...p, method: e.target.value }))}>
                      <option value="cash">Nakit</option>
                      <option value="credit_card">Kredi kartı</option>
                      <option value="bank_transfer">Havale / EFT</option>
                    </NativeSelect>
                    <p className="text-xs text-muted">Belge tutarının tamamı seçilen hesaba işlenir.</p>
                  </>
                )}
              </CardBody>
            </Card>
          )}

          {error && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
          <div className="flex flex-col gap-2">
            <Button size="lg" onClick={() => handleSubmitClick()} loading={saveDoc.isPending || updatingPrices}>
              {isEdit ? "Kaydet" : `${cfg.label} kaydet`}
            </Button>
            {!isEdit && cfg.autoNumber && type !== "pos_sale" && (
              <Button variant="outline" onClick={() => handleSubmitClick("draft")} disabled={saveDoc.isPending || updatingPrices}>
                Taslak olarak kaydet
              </Button>
            )}
            <Button variant="ghost" onClick={() => router.back()} disabled={saveDoc.isPending || updatingPrices}>
              Vazgeç
            </Button>
          </div>
        </div>
      </div>

      <BarcodeScanner open={scanOpen} onOpenChange={setScanOpen} onDetected={addByBarcode} />

      <PriceUpdateDialog
        open={priceDiffModalOpen}
        onOpenChange={setPriceDiffModalOpen}
        items={priceDiffItems}
        onConfirmWithPriceUpdate={handleConfirmWithPriceUpdate}
        onConfirmWithoutPriceUpdate={handleConfirmWithoutPriceUpdate}
        saving={updatingPrices || saveDoc.isPending}
      />
    </div>
  );
}

function Row({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <span className="text-muted">{label}</span>
      <span className="num font-medium">{value}</span>
    </div>
  );
}
