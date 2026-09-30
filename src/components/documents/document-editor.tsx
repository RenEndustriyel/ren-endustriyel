"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, ScanBarcode, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
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
import { WritableProductPicker } from "@/components/stock/writable-product-picker";
import { MultiDiscountInput } from "./multi-discount-input";
import { PriceUpdateDialog, type PriceDiffItem } from "./price-update-dialog";
import { RenAiModal } from "@/components/ai/ren-ai-modal";
import {
  analyzePurchaseDiscrepancies,
  saveAiAlerts,
  type RenAiDiscrepancy,
  type PastPurchaseLine,
} from "@/lib/ren-ai";
import { useConfirm } from "@/components/ui/confirm";
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
      if (data && Array.isArray((data as DocRow).lines)) {
        (data as DocRow).lines.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      }
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
  initialLine,
  initialNotes,
}: {
  type: DocType;
  editId?: string | null;
  sourceId?: string | null;
  copyId?: string | null;
  contactId?: string | null;
  initialLine?: Partial<EditorLine>;
  initialNotes?: string;
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
      initialLine={initialLine}
      initialNotes={initialNotes}
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
  initialLine,
  initialNotes,
  defaultVat,
  onDone,
}: {
  type: DocType;
  base: DocRow | null;
  isEdit: boolean;
  isConversion: boolean;
  contactId?: string | null;
  initialLine?: Partial<EditorLine>;
  initialNotes?: string;
  defaultVat: number;
  onDone: (id: string) => void;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const cfg = DOC_TYPES[type];
  const { org } = useOrg();
  const orgSettings = (org?.settings && typeof org.settings === "object" ? org.settings : {}) as Record<string, any>;
  const warnNegativeStock = orgSettings.warn_negative_stock !== false;
  const blockNegativeStock = orgSettings.block_negative_stock === true;
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
    try {
      const d = args.p_doc as EditorDoc & Record<string, unknown>;
      const pLines = (args.p_lines as EditorLine[]) ?? [];
      const t = calcDocument(d, pLines);
      patchListCaches(qc, "documents", {
        ...d,
        number: d.number ?? null,
        total: t.total,
        total_try: t.total_try,
        paid_amount: 0,
        payment_status: cfg.payable ? "unpaid" : "none",
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn("Optimistic document patch error:", e);
    }
  });
  const [scanOpen, setScanOpen] = React.useState(false);
  const [showMore, setShowMore] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // REN Yapay Zeka Kâr Koruma Durumları
  const [renAiModalOpen, setRenAiModalOpen] = React.useState(false);
  const [renAiDiscrepancies, setRenAiDiscrepancies] = React.useState<RenAiDiscrepancy[]>([]);

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
      notes: base?.notes ?? initialNotes ?? "",
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
      : initialLine
        ? [{
            ...emptyLine(Number(initialLine.vat_rate ?? defaultVat)),
            ...initialLine,
          }]
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

  // Satış esnasında ürünün net birim alış maliyeti (KDV hariç, doc.currency cinsinden, unit_factor uygulanmış)
  const getProductCost = React.useCallback(
    (l: EditorLine) => {
      if (!l.product_id) return 0;
      const p = products.data?.find((x) => x.id === l.product_id);
      if (!p) return 0;
      const rawBuy = Number(p.purchase_price ?? 0);
      if (rawBuy <= 0) return 0;
      const buyExclVat = p.purchase_price_includes_vat
        ? rawBuy / (1 + Number(p.vat_rate || 0) / 100)
        : rawBuy;
      const factor = Number(l.unit_factor || 1);
      const baseBuy = buyExclVat * factor;
      const prodCurrency = p.purchase_currency || "TRY";
      if (prodCurrency === doc.currency) return baseBuy;
      const inTry = baseBuy * (prodCurrency === "TRY" ? 1 : rateFor(rates.data, prodCurrency) || 1);
      return inTry / (doc.currency === "TRY" ? 1 : doc.exchange_rate || 1);
    },
    [products.data, doc.currency, doc.exchange_rate, rates.data]
  );

  const profitStats = React.useMemo(() => {
    if (!isSales) return null;
    let totalCost = 0;
    let validCount = 0;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (!l.product_id) continue;
      const unitCost = getProductCost(l);
      if (unitCost > 0) {
        totalCost += unitCost * Number(l.quantity || 0);
        validCount++;
      }
    }
    if (validCount === 0) return null;
    const netTotal = Number(totals.net_total || 0);
    const totalProfit = netTotal - totalCost;
    const profitMargin = netTotal > 0 ? (totalProfit / netTotal) * 100 : 0;
    const profitMarkup = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;
    return { totalCost, totalProfit, profitMargin, profitMarkup, validCount };
  }, [isSales, lines, getProductCost, totals.net_total]);

  const [focusLineId, setFocusLineId] = React.useState<string | null>(null);

  // Yeni satır eklendiğinde veya satır odağı değiştiğinde ekranı akıcı şekilde yukarı kaydırıp yeni satırı ortala
  React.useEffect(() => {
    if (!focusLineId) return;
    const timer = setTimeout(() => {
      const el = document.getElementById(`doc-line-row-${focusLineId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 60);
    return () => clearTimeout(timer);
  }, [focusLineId]);

  const setLine = (i: number, patch: Partial<EditorLine>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const handleAddLine = () => {
    const newLine = emptyLine(defaultVat);
    setLines((ls) => [...ls, newLine]);
    setFocusLineId(newLine.id);
  };

  const handleAdvanceToNextLine = (currentIndex: number) => {
    if (currentIndex === lines.length - 1) {
      const newLine = emptyLine(defaultVat);
      setLines((ls) => [...ls, newLine]);
      setFocusLineId(newLine.id);
    } else {
      setFocusLineId(lines[currentIndex + 1].id);
    }
  };

  const stepVat = (index: number, direction: "up" | "down") => {
    const currentVat = lines[index].vat_rate;
    const currentIdx = VAT_RATES.indexOf(currentVat);
    if (direction === "up") {
      const nextIdx = currentIdx < VAT_RATES.length - 1 ? currentIdx + 1 : 0;
      setLine(index, { vat_rate: VAT_RATES[nextIdx] });
    } else {
      const prevIdx = currentIdx > 0 ? currentIdx - 1 : VAT_RATES.length - 1;
      setLine(index, { vat_rate: VAT_RATES[prevIdx] });
    }
  };

  const pickProduct = (i: number, pid: string | null) => {
    const p = products.data?.find((x) => x.id === pid);
    if (!p) return setLine(i, { product_id: null });
    setFocusLineId(null);
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
    const valid = lines.filter((l) => l.product_id || l.description?.trim());
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

    try {
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
      const targetId = res.data?.id ?? doc.id;

      // Alış belgelerinde satırdaki ürünlerin alış fiyatını ve KDV oranını ürün kartına işle
      // Kural: "ne olursa olsun alışlarda kdv hariç işaretli ise stok kartına da hariç olarak kaydedecek"
      if (cfg.side === "purchase") {
        try {
          const isVatExcluded = doc.prices_include_vat === false;
          for (const l of valid) {
            if (!l.product_id) continue;
            const p = products.data?.find((x) => x.id === l.product_id);
            const netBuy = calcNetPurchasePrice(l, p);
            await supabase
              .from("products")
              .update({
                purchase_price: isVatExcluded ? (netBuy > 0 ? netBuy : l.unit_price) : l.unit_price,
                purchase_price_includes_vat: !isVatExcluded,
                vat_rate: l.vat_rate,
                updated_at: new Date().toISOString(),
              })
              .eq("id", l.product_id);
          }
          await qc.invalidateQueries({ queryKey: ["products"] });
        } catch (syncErr) {
          console.warn("Ürün kartı alış fiyatı senkronizasyon hatası:", syncErr);
        }
      }

      if (targetId) {
        onDone(targetId);
      }
    } catch (err: unknown) {
      console.error("Belge kaydetme hatası:", err);
      const msg = err instanceof Error ? err.message : "Belge kaydedilirken bir hata oluştu";
      setError(msg);
      toast.error(msg);
    }
  };

  const checkPriceDiffsAndSave = (status?: string) => {
    const valid = lines.filter((l) => l.product_id || l.description?.trim());

    // Eğer alış belgesi ise ve fiyat veya KDV farkı olan ürünler varsa onay diyalogu aç
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
        const curVat = Number(p.vat_rate ?? 20);
        const newVat = Number(l.vat_rate ?? 20);
        const vatDiff = curVat !== newVat;

        // Fiyat farkı varsa veya ilk alış fiyatı tanımlanacaksa veya KDV oranı değişmişse
        if ((Math.abs(diff) >= 0.01 && newNet > 0) || vatDiff) {
          const pct = curBuy > 0 ? Math.round((diff / curBuy) * 10000) / 100 : 100;
          diffs.push({
            productId: p.id,
            productName: p.name,
            productCode: p.code,
            currentPrice: curBuy,
            newNetPrice: newNet > 0 ? newNet : curBuy,
            diff,
            percentChange: pct,
            currency: p.purchase_currency || doc.currency,
            selected: true,
            currentVatRate: curVat,
            newVatRate: newVat,
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

  const handleSubmitClick = async (status?: string) => {
    setError(null);
    const valid = lines.filter((l) => l.product_id || l.description?.trim());
    if (!valid.length) return setError("En az bir satır girin.");
    if (cfg.type !== "pos_sale" && !doc.contact_id && type !== "expense") return setError(`${cfg.contactLabel} seçin.`);
    if (!isEdit && pay.enabled && !pay.account_id && cfg.payable) return setError("Tahsilat / ödeme hesabını seçin.");

    if (isEdit) {
      const ok = await confirm({
        title: "Değişiklikleri kaydetmek istiyor musunuz?",
        description: `${cfg.label} güncellenecektir. Yapılan değişiklikleri onaylıyor musunuz?`,
        confirmText: "Evet, Güncelle",
      });
      if (!ok) return;
    }

    // EKSİ STOK KONTROLÜ (Ayarlardaki warn_negative_stock ve block_negative_stock ayarlarına göre)
    if (isSales && (warnNegativeStock || blockNegativeStock)) {
      const negativeLines: { name: string; current: number; requested: number; remaining: number }[] = [];

      for (const l of valid) {
        if (!l.product_id) continue;
        const p = products.data?.find((x) => x.id === l.product_id);
        if (!p || !p.track_stock || p.type !== "product") continue;

        const req = (l.quantity || 0) * (l.unit_factor || 1);
        const cur = Number(p.stock_qty || 0);
        if (cur - req < 0) {
          negativeLines.push({
            name: p.name,
            current: cur,
            requested: req,
            remaining: cur - req,
          });
        }
      }

      if (negativeLines.length > 0) {
        const listText = negativeLines
          .map((item) => `• ${item.name} (Mevcut: ${formatNumber(item.current)}, Talep: ${formatNumber(item.requested)}, Kalan: ${formatNumber(item.remaining)})`)
          .join("\n");

        if (blockNegativeStock) {
          toast.error(`Eksi stok engellemesi aktif!\nAşağıdaki ürünlerde yeterli stok bulunmuyor:\n${listText}`);
          setError("Yetersiz stok! Stok ayarlarınız gereği eksi bakiye ile satış yapılmasına izin verilmiyor.");
          return;
        }

        if (warnNegativeStock) {
          const ok = await confirm({
            title: "⚠️ Eksi Stok Uyarısı",
            description: `Belgedeki bazı ürünlerin miktarı depodaki mevcut stok miktarından fazladır ve stok eksiye düşecektir:\n\n${listText}\n\nYine de işleme devam edip belgeyi kaydetmek istiyor musunuz?`,
            confirmText: "Evet, Eksi Stokla Kaydet",
          });
          if (!ok) return;
        }
      }
    }

    // 1. REN YAPAY ZEKA KÂR KORUMA KONTROLÜ (Alış belgelerinde aynı tedarikçiden iskonto kaybı ve fiyat farkı denetimi)
    if (cfg.side === "purchase" && doc.contact_id) {
      try {
        const { data: pastLines } = await supabase
          .from("document_lines")
          .select(`
            id,
            product_id,
            description,
            quantity,
            unit_price,
            discount_rate,
            vat_rate,
            documents!inner (
              id,
              number,
              issue_date,
              contact_id,
              doc_type,
              currency
            )
          `)
          .eq("documents.contact_id", doc.contact_id)
          .in("documents.doc_type", ["purchase_invoice", "purchase_delivery"])
          .neq("documents.id", doc.id)
          .order("created_at", { ascending: false })
          .limit(100);

        if (pastLines && pastLines.length > 0) {
          const mappedPast: PastPurchaseLine[] = pastLines.map((pl: any) => ({
            id: pl.id,
            product_id: pl.product_id,
            description: pl.description,
            quantity: Number(pl.quantity),
            unit_price: Number(pl.unit_price),
            discount_rate: Number(pl.discount_rate || 0),
            vat_rate: Number(pl.vat_rate || 0),
            document: {
              id: pl.documents.id,
              number: pl.documents.number,
              issue_date: pl.documents.issue_date,
              contact_id: pl.documents.contact_id,
              currency: pl.documents.currency,
            },
          }));

          const discResults = analyzePurchaseDiscrepancies({
            currentDoc: {
              id: doc.id,
              number: doc.number,
              issue_date: doc.issue_date,
              contact_id: doc.contact_id,
            },
            currentLines: valid,
            pastLines: mappedPast,
            contactName: contact?.name || "Tedarikçi",
            currency: doc.currency,
          });

          if (discResults.length > 0) {
            saveAiAlerts(discResults, org?.id);
            setRenAiDiscrepancies(discResults);
            setPendingStatus(status);
            setRenAiModalOpen(true);
            return;
          }
        }
      } catch (aiErr) {
        console.warn("REN AI analiz hatası:", aiErr);
      }
    }

    checkPriceDiffsAndSave(status);
  };

  const handleConfirmWithPriceUpdate = async (selectedIds: string[]) => {
    setUpdatingPrices(true);
    try {
      const toUpdate = priceDiffItems.filter((item) => selectedIds.includes(item.productId));
      for (const item of toUpdate) {
        const payload: {
          purchase_price: number;
          purchase_price_includes_vat: boolean;
          updated_at: string;
          vat_rate?: number;
        } = {
          purchase_price: item.newNetPrice,
          purchase_price_includes_vat: false,
          updated_at: new Date().toISOString(),
        };
        if (item.newVatRate !== undefined && Number.isFinite(item.newVatRate)) {
          payload.vat_rate = item.newVatRate;
        }
        await supabase
          .from("products")
          .update(payload)
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
    try {
      await performSave(pendingStatus);
    } catch (err) {
      console.error("Fiyat güncellemeden kaydetme hatası:", err);
    }
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
                <div
                  key={l.id}
                  id={`doc-line-row-${l.id}`}
                  data-line-row="true"
                  className={cn(
                    "flex flex-col gap-2 px-4 py-3 transition-colors duration-200",
                    focusLineId === l.id && "bg-primary-soft/15 ring-1 ring-primary/30 rounded-lg",
                  )}
                >
                  <div className="flex items-start gap-2">
                    <span className="mt-2.5 w-5 shrink-0 text-center text-xs text-muted">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <WritableProductPicker
                        productId={l.product_id}
                        description={l.description}
                        onProductSelect={(p) => {
                          setFocusLineId(null);
                          setLine(i, {
                            product_id: p.id,
                            description: p.name,
                            unit_id: p.unit_id,
                            unit_factor: 1,
                            vat_rate: Number(p.vat_rate),
                            unit_price: priceFor(p, 1),
                          });
                        }}
                        onDescriptionChange={(text) => {
                          setLine(i, { description: text, product_id: null });
                        }}
                        autoFocus={focusLineId === l.id}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAdvanceToNextLine(i);
                          }
                        }}
                        placeholder="Ürün / hizmet adı yazın veya stoktan arayın…"
                      />
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => setLines(lines.length > 1 ? lines.filter((_, j) => j !== i) : [emptyLine(defaultVat)])} aria-label="Satırı sil">
                      <Trash2 />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pl-7 pr-12 sm:grid-cols-6">
                    <div className="flex flex-col">
                      <label className="text-[11px] text-muted">
                        Miktar
                        <NumberInput
                          value={l.quantity}
                          decimals={3}
                          onChange={(n) => setLine(i, { quantity: n })}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAdvanceToNextLine(i);
                            }
                          }}
                        />
                      </label>
                      {warnNegativeStock && isSales && l.product_id && (() => {
                        const p = products.data?.find((x) => x.id === l.product_id);
                        if (!p || !p.track_stock || p.type !== "product") return null;
                        const req = (l.quantity || 0) * (l.unit_factor || 1);
                        const cur = Number(p.stock_qty || 0);
                        if (cur - req < 0) {
                          return (
                            <span
                              className="mt-1 flex items-center gap-1 rounded bg-danger-soft/80 px-1.5 py-0.5 text-[10px] font-bold text-danger animate-pulse truncate"
                              title={`Mevcut Stok: ${formatNumber(cur)} · Talep: ${formatNumber(req)} · Kalan: ${formatNumber(cur - req)}`}
                            >
                              <AlertTriangle className="size-3 shrink-0" />
                              Yetersiz ({formatNumber(cur)})
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
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
                    <div className="flex flex-col">
                      <label className="text-[11px] text-muted">
                        Birim fiyat
                        <NumberInput
                          value={l.unit_price}
                          decimals={4}
                          onChange={(n) => setLine(i, { unit_price: n })}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAdvanceToNextLine(i);
                            }
                          }}
                        />
                      </label>
                      {isSales && l.product_id && (() => {
                        const unitCost = getProductCost(l);
                        if (unitCost <= 0) {
                          return (
                            <span className="mt-1 text-[10px] text-muted/60 italic truncate">
                              Alış: Tanımsız
                            </span>
                          );
                        }
                        const lineNet = totals.lines[i]?.net_amount ?? (l.quantity * l.unit_price * (1 - (l.discount_rate || 0) / 100));
                        const unitNetSale = l.quantity > 0 ? lineNet / l.quantity : 0;
                        const unitProfit = unitNetSale - unitCost;
                        const pct = (unitProfit / unitCost) * 100;
                        const isProfit = unitProfit >= 0;

                        return (
                          <div className="mt-1 flex flex-col gap-0.5 text-[10px] leading-tight select-none">
                            <span className="text-muted truncate" title={`Birim Alış: ${formatMoney(unitCost, doc.currency)} (KDV Hariç)`}>
                              Alış: <strong className="font-mono font-medium text-foreground">{formatMoney(unitCost, doc.currency)}</strong>
                            </span>
                            <span
                              className={cn("font-semibold truncate", isProfit ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}
                              title={`Adet Kârı: ${isProfit ? "+" : ""}${formatMoney(unitProfit, doc.currency)} (${isProfit ? "+" : ""}${pct.toFixed(1)}%)`}
                            >
                              Kâr: {isProfit ? "+" : ""}{formatMoney(unitProfit, doc.currency)} ({isProfit ? "+" : ""}{pct.toFixed(0)}%)
                            </span>
                          </div>
                        );
                      })()}
                      {!isSales && l.product_id && (() => {
                        const p = products.data?.find((x) => x.id === l.product_id);
                        if (!p) return null;
                        const curBuy = Number(p.purchase_price ?? 0);
                        const salePrice = Number(p.sale_price ?? 0) * (l.unit_factor || 1);
                        return (
                          <div className="mt-1 flex flex-col gap-0.5 text-[10px] leading-tight select-none text-muted">
                            {curBuy > 0 && (
                              <span className="truncate" title={`Karttaki Mevcut Alış: ${formatMoney(curBuy, p.purchase_currency || "TRY")}`}>
                                Mevcut Alış: <span className="font-mono text-foreground">{formatMoney(curBuy, p.purchase_currency || "TRY")}</span>
                              </span>
                            )}
                            {salePrice > 0 && (
                              <span className="truncate text-emerald-600 dark:text-emerald-400 font-medium" title={`Satış Fiyatı: ${formatMoney(salePrice, p.sale_currency || "TRY")}`}>
                                Satış: {formatMoney(salePrice, p.sale_currency || "TRY")}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                    <div className="flex flex-col">
                      <span className="mb-1 flex items-center justify-between text-[11px] text-muted">
                        <span>İskonto %</span>
                        <span className="text-[10px] text-muted/60">örn: 10+5</span>
                      </span>
                      <MultiDiscountInput
                        value={l.discount_rate}
                        discountStr={l.discount_str}
                        onChange={(rate, str) => setLine(i, { discount_rate: rate, discount_str: str })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAdvanceToNextLine(i);
                          }
                        }}
                        unitPrice={l.unit_price}
                        currency={doc.currency}
                      />
                    </div>
                    <label className="text-[11px] text-muted">
                      KDV %
                      <NumberInput
                        value={l.vat_rate}
                        decimals={0}
                        max={100}
                        min={0}
                        onChange={(n) => setLine(i, { vat_rate: n })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAdvanceToNextLine(i);
                          }
                        }}
                      />
                    </label>
                    <div className="flex flex-col justify-end text-right">
                      <span className="text-[11px] text-muted">{doc.prices_include_vat ? "Tutar (KDV dahil)" : "Tutar"}</span>
                      <span className="num flex h-10 items-center justify-end text-sm font-semibold">
                        {formatNumber(doc.prices_include_vat ? totals.lines[i]?.total_amount : totals.lines[i]?.net_amount)}
                      </span>
                    </div>
                  </div>

                  {isSales && l.product_id && (() => {
                    const unitCost = getProductCost(l);
                    if (unitCost <= 0) return null;
                    const lineNet = totals.lines[i]?.net_amount ?? (l.quantity * l.unit_price * (1 - (l.discount_rate || 0) / 100));
                    const lineCost = unitCost * l.quantity;
                    const lineProfit = lineNet - lineCost;
                    const unitNetSale = l.quantity > 0 ? lineNet / l.quantity : 0;
                    const unitProfit = unitNetSale - unitCost;
                    const pct = (unitProfit / unitCost) * 100;
                    const isProfit = lineProfit >= 0;

                    return (
                      <div className="mt-1 flex flex-wrap items-center gap-2 pl-7 text-[11px]">
                        <span className="font-medium text-muted">
                          Birim Alış (KDV Hariç): <strong className="text-foreground font-mono">{formatMoney(unitCost, doc.currency)}</strong>
                        </span>
                        <span className="text-muted/40">•</span>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded px-2 py-0.5 font-semibold text-xs",
                            isProfit
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20"
                          )}
                        >
                          <span>{isProfit ? "📈 Kâr:" : "📉 Zarar:"}</span>
                          <span className="font-mono">{isProfit ? "+" : ""}{formatMoney(lineProfit, doc.currency)}</span>
                          <span className="opacity-80 font-normal">({isProfit ? "+" : ""}{pct.toFixed(1)}%)</span>
                          {l.quantity > 1 && (
                            <span className="text-[10px] opacity-75 font-normal">
                              (Birim Başı: {isProfit ? "+" : ""}{formatMoney(unitProfit, doc.currency)})
                            </span>
                          )}
                        </span>
                      </div>
                    );
                  })()}

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
              <Button type="button" variant="ghost" size="sm" onClick={handleAddLine}>
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

              {isSales && profitStats && (
                <div
                  className={cn(
                    "mt-3 rounded-lg border p-3 flex flex-col gap-1.5 transition-colors",
                    profitStats.totalProfit >= 0
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-950 dark:text-emerald-100"
                      : "bg-rose-500/10 border-rose-500/20 text-rose-950 dark:text-rose-100"
                  )}
                >
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="flex items-center gap-1.5">
                      <span>{profitStats.totalProfit >= 0 ? "📈" : "📉"}</span>
                      <span>Genel Toplam Kâr</span>
                    </span>
                    <span className="font-mono text-sm font-bold">
                      {profitStats.totalProfit >= 0 ? "+" : ""}{formatMoney(profitStats.totalProfit, doc.currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] opacity-80">
                    <span>Kâr Oranı (Alışa Göre)</span>
                    <span className="font-mono font-semibold">
                      %{profitStats.profitMarkup.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] opacity-80">
                    <span>Kâr Marjı (Net Tutar)</span>
                    <span className="font-mono font-medium">
                      %{profitStats.profitMargin.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] opacity-75 border-t border-border/50 pt-1">
                    <span>Toplam Alış Maliyeti</span>
                    <span className="font-mono">
                      {formatMoney(profitStats.totalCost, doc.currency)}
                    </span>
                  </div>
                </div>
              )}
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

      <RenAiModal
        open={renAiModalOpen}
        onOpenChange={setRenAiModalOpen}
        discrepancies={renAiDiscrepancies}
        onProceedSave={() => {
          setRenAiModalOpen(false);
          checkPriceDiffsAndSave(pendingStatus);
        }}
        currency={doc.currency}
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
