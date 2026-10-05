"use client";

import * as React from "react";
import { Maximize2, Minimize2, Plus, Printer, Save, ScanBarcode, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { newId, useAccounts, useContacts, useProducts, useRpc, useSave, useUnits, useUpdate, type Row } from "@/lib/data";
import { CURRENCY_SYMBOL, formatNumber, formatQty, isoDate } from "@/lib/format";
import { rateFor, useRates } from "@/lib/rates";
import type { DocType } from "@/lib/doc-types";
import { useOrg } from "@/providers/org-provider";
import { cn } from "@/lib/utils";
import type { ContactItem } from "./contact-select-modal";

// ---------------------------------------------------------------------------
// Tipler ve sabitler
// ---------------------------------------------------------------------------

export type QuickDocSide = "purchase" | "sales";
export type QuickDocKind = "Fatura" | "İrsaliye" | "Sipariş";

const DOC_TYPE_MAP: Record<QuickDocSide, Record<QuickDocKind, DocType>> = {
  purchase: { Fatura: "purchase_invoice", İrsaliye: "purchase_delivery", Sipariş: "purchase_order" },
  sales: { Fatura: "sales_invoice", İrsaliye: "sales_delivery", Sipariş: "sales_order" },
};

const PAYMENT_METHOD: Record<string, string> = { cash: "cash", bank: "bank_transfer", credit_card: "credit_card" };

/**
 * product: katalogdaki ürün · new: kayıtta katalogda oluşturulacak ürün · free: ürün kartı olmayan serbest kalem
 */
type LineKind = "product" | "new" | "free";

type Line = {
  id: string;
  kind: LineKind;
  product_id: string | null;
  name: string;
  barcode: string;
  unit_id: string | null;
  quantity: number;
  unit_price: number;
  vat_rate: number;
  /** Raf satış fiyatı (KDV dahil, TL) — yalnızca alışta */
  shelf_price: number;
};

type Product = Row<"products">;

const round2 = (n: number) => Math.round(n * 100) / 100;
const normalize = (s: string) => s.toLocaleLowerCase("tr-TR").trim();

/** KDV dahil/hariç fiyat dönüşümü */
const convertVat = (price: number, vat: number, fromIncl: boolean, toIncl: boolean) =>
  fromIncl === toIncl ? price : toIncl ? price * (1 + vat / 100) : price / (1 + vat / 100);

/** Mağaza içi kullanım için EAN-13 barkod ("2" ile başlar) */
function generateBarcode(): string {
  let digits = "2";
  for (let i = 0; i < 11; i++) digits += Math.floor(Math.random() * 10);
  const sum = digits.split("").reduce((s, d, i) => s + Number(d) * (i % 2 === 0 ? 1 : 3), 0);
  return digits + ((10 - (sum % 10)) % 10);
}

function searchProducts(products: Product[], text: string, limit = 8): Product[] {
  const q = normalize(text);
  if (q.length < 3) return [];
  return products
    .filter(
      (p) =>
        p.is_active !== false &&
        (normalize(p.name).includes(q) || (p.barcode ?? "") === text.trim() || normalize(p.code ?? "").includes(q)),
    )
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Hesaplama (veritabanındaki recalc_document ile birebir)
// ---------------------------------------------------------------------------

function calculate(lines: Line[], inclVat: boolean, discountType: "rate" | "amount", discountValue: number) {
  const valid = lines.filter((l) => l.name.trim() || l.product_id);
  const entered = valid.reduce((s, l) => s + l.quantity * l.unit_price, 0);
  let ratio = 0;
  if (discountValue > 0 && entered > 0) {
    ratio = discountType === "rate" ? Math.min(discountValue, 100) / 100 : Math.min(discountValue / entered, 1);
  }
  let gross = 0;
  let net = 0;
  let vat = 0;
  for (const l of valid) {
    const base = l.quantity * l.unit_price;
    const r = l.vat_rate / 100;
    gross += round2(inclVat ? base / (1 + r) : base);
    const lineNet = round2(inclVat ? (base * (1 - ratio)) / (1 + r) : base * (1 - ratio));
    const lineVat = round2(inclVat ? base * (1 - ratio) - (base * (1 - ratio)) / (1 + r) : base * (1 - ratio) * r);
    net += lineNet;
    vat += lineVat;
  }
  return { gross, discount: gross - net, net, vat, total: net + vat };
}

// ---------------------------------------------------------------------------
// Küçük parçalar
// ---------------------------------------------------------------------------

const labelCls = "text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400";
const fieldCls =
  "w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 px-3.5 text-sm font-medium outline-none focus:border-brand-400 transition";
const cellInputCls =
  "w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 px-3 text-sm outline-none focus:border-brand-400 transition";
const ghostSmCls =
  "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition";

function ProductSuggestions({
  items,
  onPick,
  inclVat,
  side,
}: {
  items: Product[];
  onPick: (p: Product) => void;
  inclVat: boolean;
  side: QuickDocSide;
}) {
  if (!items.length) return null;
  return (
    <div className="absolute left-0 right-0 top-full mt-1 z-30 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
      {items.map((p) => {
        const price = side === "purchase" ? Number(p.purchase_price) : Number(p.sale_price);
        const incl = side === "purchase" ? p.purchase_price_includes_vat : p.sale_price_includes_vat;
        return (
          <button
            key={p.id}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              onPick(p);
            }}
            className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <span className="flex-1 min-w-0 truncate font-medium">{p.name}</span>
            <span className="text-xs text-slate-400 shrink-0">stok {formatQty(p.stock_qty)}</span>
            <span className="text-xs font-semibold tabular-nums shrink-0">
              {formatNumber(convertVat(price, Number(p.vat_rate), incl, inclVat))}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pencere
// ---------------------------------------------------------------------------

export interface QuickDocModalProps {
  side: QuickDocSide;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: ContactItem | null;
  initialKind?: QuickDocKind;
  onSaved?: (doc: { id: string; doc_type: DocType }) => void;
}

/** Pusulam "Yeni Alış Belgesi / Yeni Satış Belgesi" penceresi */
export function QuickDocModal(props: QuickDocModalProps) {
  // Kapalıyken sökülür; her açılışta form sıfırdan başlar
  if (!props.open) return null;
  return <QuickDocForm {...props} />;
}

function QuickDocForm({ side, onOpenChange, contact: initialContact, initialKind = "Fatura", onSaved }: QuickDocModalProps) {
  const { org } = useOrg();
  const products = useProducts();
  const units = useUnits();
  const accounts = useAccounts();
  const contacts = useContacts();
  const rates = useRates();
  const saveDoc = useRpc("save_document");
  const saveProduct = useSave("products");
  const updateProduct = useUpdate("products");

  const isPurchase = side === "purchase";
  const contactLabel = isPurchase ? "Tedarikçi" : "Müşteri";
  const defaultUnitId = React.useMemo(
    () => (units.data ?? []).find((u) => /adet/i.test(u.name) || u.code === "C62")?.id ?? units.data?.[0]?.id ?? null,
    [units.data],
  );

  // Üst alanlar
  const [maximized, setMaximized] = React.useState(false);
  const [contactId, setContactId] = React.useState<string>(initialContact?.id ?? "");
  const [kind, setKind] = React.useState<QuickDocKind>(initialKind);
  const [issueDate, setIssueDate] = React.useState(isoDate());
  const [number, setNumber] = React.useState("");
  const [invoiceType, setInvoiceType] = React.useState("Kağıt Fatura");
  const [currency, setCurrency] = React.useState("TRY");
  const [rateOverride, setRateOverride] = React.useState<number | null>(null);
  const exchangeRate = currency === "TRY" ? 1 : rateOverride ?? (rateFor(rates.data, currency) || 1);

  // Kalemler
  const emptyLine = React.useCallback(
    (): Line => ({
      id: newId(),
      kind: "new",
      product_id: null,
      name: "",
      barcode: "",
      unit_id: defaultUnitId,
      quantity: 1,
      unit_price: 0,
      vat_rate: 20,
      shelf_price: 0,
    }),
    [defaultUnitId],
  );
  const [inclVat, setInclVat] = React.useState(true);
  const [lines, setLines] = React.useState<Line[]>(() => [emptyLine()]);
  const [quick, setQuick] = React.useState("");
  const [quickFocus, setQuickFocus] = React.useState(false);
  const [activeLine, setActiveLine] = React.useState<string | null>(null);

  // Toplamlar
  const [discountType, setDiscountType] = React.useState<"rate" | "amount">("rate");
  const [discountValue, setDiscountValue] = React.useState(0);
  const discountRef = React.useRef<HTMLInputElement>(null);

  // Ödeme
  const isInvoice = kind === "Fatura";
  const [paid, setPaid] = React.useState(isPurchase);
  const [accountId, setAccountId] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const accountList = accounts.data ?? [];
  const effectiveAccountId = accountId || accountList[0]?.id || "";

  const contactOptions = React.useMemo(() => {
    const list = (contacts.data ?? []).filter((c) => c.kind === (isPurchase ? "supplier" : "customer") || c.kind === "both");
    // Az önce oluşturulan cari henüz listede yoksa da seçili görünsün
    if (initialContact && !list.some((c) => c.id === initialContact.id)) {
      return [{ id: initialContact.id, name: initialContact.name }, ...list.map((c) => ({ id: c.id, name: c.name }))];
    }
    return list.map((c) => ({ id: c.id, name: c.name, payment_term_days: c.payment_term_days }));
  }, [contacts.data, isPurchase, initialContact]);

  const totals = React.useMemo(
    () => calculate(lines, inclVat, discountType, discountValue),
    [lines, inclVat, discountType, discountValue],
  );

  // -------------------------------------------------------------------------
  // Kalem işlemleri
  // -------------------------------------------------------------------------

  const priceFromProduct = (p: Product) => {
    const raw = isPurchase ? Number(p.purchase_price) : Number(p.sale_price);
    const incl = isPurchase ? p.purchase_price_includes_vat : p.sale_price_includes_vat;
    return round2(convertVat(raw, Number(p.vat_rate), incl, inclVat) / exchangeRate);
  };

  const lineFromProduct = (p: Product, base?: Line): Line => ({
    ...(base ?? emptyLine()),
    kind: "product",
    product_id: p.id,
    name: p.name,
    barcode: p.barcode ?? "",
    unit_id: p.unit_id ?? defaultUnitId,
    unit_price: priceFromProduct(p),
    vat_rate: Number(p.vat_rate),
    shelf_price: round2(convertVat(Number(p.sale_price), Number(p.vat_rate), p.sale_price_includes_vat, true)),
  });

  const patchLine = (id: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  /** Boş ilk satırı doldurur, yoksa sona ekler */
  const pushLine = (line: Line) =>
    setLines((ls) => {
      const blank = ls.findIndex((l) => !l.name.trim() && !l.product_id);
      if (blank >= 0) return ls.map((l, i) => (i === blank ? { ...line, id: l.id } : l));
      return [...ls, line];
    });

  const removeLine = (id: string) => setLines((ls) => (ls.length <= 1 ? [emptyLine()] : ls.filter((l) => l.id !== id)));

  const quickMatches = React.useMemo(() => searchProducts(products.data ?? [], quick), [products.data, quick]);

  const handleQuickEnter = () => {
    const text = quick.trim();
    if (!text) return;
    const exact = (products.data ?? []).find((p) => p.barcode === text || normalize(p.name) === normalize(text));
    const match = exact ?? (quickMatches.length === 1 ? quickMatches[0] : null);
    if (match) {
      pushLine(lineFromProduct(match));
    } else {
      // Katalogda yok: kayıtta yeni ürün olarak oluşturulur
      const isBarcode = /^\d{8,14}$/.test(text);
      pushLine({ ...emptyLine(), kind: "new", name: isBarcode ? "" : text, barcode: isBarcode ? text : "" });
      toast.info(isBarcode ? "Barkod katalogda yok; ürün adını yazın." : "Katalogda yok — kayıtta yeni ürün olarak eklenecek.");
    }
    setQuick("");
  };

  const toggleInclVat = (next: boolean) => {
    if (next === inclVat) return;
    setLines((ls) => ls.map((l) => ({ ...l, unit_price: round2(convertVat(l.unit_price, l.vat_rate, inclVat, next)) })));
    setInclVat(next);
  };

  const generateAllBarcodes = () => {
    const needs = (l: Line) => l.kind !== "free" && !l.barcode && !!(l.name.trim() || l.product_id);
    const count = lines.filter(needs).length;
    if (!count) {
      toast.info("Barkodsuz ürün kalemi yok");
      return;
    }
    setLines(lines.map((l) => (needs(l) ? { ...l, barcode: generateBarcode() } : l)));
    toast.success(`${count} kaleme barkod üretildi (kayıtta ürün kartına işlenir)`);
  };

  // -------------------------------------------------------------------------
  // Kaydetme
  // -------------------------------------------------------------------------

  const handleSave = async () => {
    const valid = lines.filter((l) => l.name.trim() || l.product_id);
    if (!valid.length) {
      toast.error("En az bir kalem ekleyin.");
      return;
    }
    if (valid.some((l) => !(l.quantity > 0))) {
      toast.error("Kalem miktarları sıfırdan büyük olmalı.");
      return;
    }
    if (!org?.id) return;
    setSaving(true);

    try {
      const docType = DOC_TYPE_MAP[side][kind];
      const docId = newId();
      const toTry = (n: number) => round2(n * exchangeRate);

      // 1) Katalogda olmayan ürünleri oluştur (stoğa girebilmeleri için)
      const resolved: Line[] = [];
      for (const l of valid) {
        if (l.kind !== "new") {
          resolved.push(l);
          continue;
        }
        const res = await saveProduct.save<{ id: string }>({
          name: l.name.trim(),
          barcode: l.barcode.trim() || null,
          unit_id: l.unit_id,
          vat_rate: l.vat_rate,
          type: "product",
          track_stock: true,
          is_active: true,
          purchase_price: isPurchase ? toTry(l.unit_price) : 0,
          purchase_price_includes_vat: inclVat,
          sale_price: isPurchase ? l.shelf_price : toTry(l.unit_price),
          sale_price_includes_vat: isPurchase ? true : inclVat,
        });
        resolved.push({ ...l, kind: "product", product_id: res.data!.id });
      }

      // 2) Belge — toplamları veritabanı kalemlerden yeniden hesaplar
      const contact = contactOptions.find((c) => c.id === contactId);
      const payload = {
        id: docId,
        org_id: org.id,
        doc_type: docType,
        status: "approved",
        number: number.trim() || null,
        issue_date: issueDate,
        due_date: isInvoice && !paid ? dueDate || null : null,
        contact_id: contactId || null,
        currency,
        exchange_rate: exchangeRate,
        prices_include_vat: inclVat,
        discount_type: discountType,
        discount_value: discountValue,
        description: contact?.name ? `${contact.name} - ${isPurchase ? "Alış" : "Satış"}` : null,
        notes: [notes.trim(), invoiceType !== "Kağıt Fatura" && isInvoice ? `Fatura tipi: ${invoiceType}` : ""]
          .filter(Boolean)
          .join("\n") || null,
      };
      const docLines = resolved.map((l) => ({
        id: newId(),
        product_id: l.kind === "free" ? null : l.product_id,
        description: l.name.trim() || "Kalem",
        quantity: l.quantity,
        unit_id: l.unit_id,
        unit_factor: 1,
        unit_price: l.unit_price,
        discount_rate: 0,
        vat_rate: l.vat_rate,
      }));
      const account = accountList.find((a) => a.id === effectiveAccountId);
      await saveDoc.call(
        {
          p_doc: payload,
          p_lines: docLines,
          p_payment:
            isInvoice && paid && effectiveAccountId
              ? { id: newId(), account_id: effectiveAccountId, method: PAYMENT_METHOD[account?.type ?? "cash"] ?? "cash" }
              : null,
        },
        `${isPurchase ? "Alış" : "Satış"} belgesi kaydedildi`,
      );

      // 3) Alışta ürün kartlarına alış fiyatı, raf fiyatı ve barkodu işle
      if (isPurchase) {
        for (const l of resolved) {
          if (l.kind !== "product" || !l.product_id) continue;
          const p = products.data?.find((x) => x.id === l.product_id);
          if (!p) continue; // yeni oluşturulan ürün zaten güncel
          const patch: Record<string, unknown> = {
            purchase_price: toTry(l.unit_price),
            purchase_price_includes_vat: inclVat,
            vat_rate: l.vat_rate,
          };
          const currentShelf = round2(convertVat(Number(p.sale_price), Number(p.vat_rate), p.sale_price_includes_vat, true));
          if (l.shelf_price > 0 && Math.abs(l.shelf_price - currentShelf) > 0.004) {
            patch.sale_price = l.shelf_price;
            patch.sale_price_includes_vat = true;
          }
          if (l.barcode.trim() && !p.barcode) patch.barcode = l.barcode.trim();
          await updateProduct.update(l.product_id, patch);
        }
      }

      onSaved?.({ id: docId, doc_type: docType });
      onOpenChange(false);
    } catch (e) {
      // Hata mesajı kayıt yardımcıları tarafından gösterildi; pencere açık kalır, girilenler kaybolmaz
      console.error("Belge kaydedilemedi:", e);
    } finally {
      setSaving(false);
    }
  };

  // -------------------------------------------------------------------------
  // Görünüm
  // -------------------------------------------------------------------------

  const priceHeader = isPurchase ? "Alış fiyatı" : "Satış fiyatı";
  // Pusulam bu pencerede tutarları sembol önde gösterir: ₺1.234,56
  const money = (n: number) => `${CURRENCY_SYMBOL[currency] ?? currency}${formatNumber(n)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Yeni ${isPurchase ? "Alış" : "Satış"} Belgesi`}
        className={cn(
          "flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl",
          maximized ? "fixed inset-0 rounded-none" : "w-full max-w-[1500px] max-h-[95dvh] rounded-2xl",
        )}
      >
        {/* Başlık */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-5 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-lg sm:text-xl font-bold tracking-tight">Yeni {isPurchase ? "Alış" : "Satış"} Belgesi</h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMaximized((v) => !v)}
              className="h-9 w-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title={maximized ? "Küçült" : "Tam ekran"}
            >
              {maximized ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
            </button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-9 w-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Kapat"
            >
              <X size={19} />
            </button>
          </div>
        </div>

        {/* İçerik */}
        <div className="flex-1 overflow-y-auto thin-scroll px-5 sm:px-6 py-5 space-y-5">
          {/* Üst alanlar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            <label className="space-y-1.5">
              <span className={labelCls}>{contactLabel}</span>
              <select className={fieldCls} value={contactId} onChange={(e) => setContactId(e.target.value)}>
                <option value="">Cari seçilmedi</option>
                {contactOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className={labelCls}>Belge türü</span>
              <select className={fieldCls} value={kind} onChange={(e) => setKind(e.target.value as QuickDocKind)}>
                <option value="Fatura">Fatura</option>
                <option value="İrsaliye">İrsaliye</option>
                <option value="Sipariş">Sipariş</option>
              </select>
            </label>
            <label className="space-y-1.5">
              <span className={labelCls}>Tarih</span>
              <input type="date" className={fieldCls} value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </label>
            <label className="space-y-1.5">
              <span className={labelCls}>{isPurchase ? "Belge no (tedarikçi)" : "Belge no"}</span>
              <input
                className={cn(fieldCls, "font-mono placeholder:font-mono placeholder:text-slate-400")}
                placeholder={isPurchase ? "ör. DMK2026000004172" : "otomatik verilir"}
                value={number}
                onChange={(e) => setNumber(e.target.value)}
              />
            </label>
            <label className="space-y-1.5">
              <span className={labelCls}>Fatura tipi</span>
              <select className={fieldCls} value={invoiceType} onChange={(e) => setInvoiceType(e.target.value)}>
                <option>Kağıt Fatura</option>
                <option>e-Fatura</option>
                <option>e-Arşiv Fatura</option>
              </select>
            </label>
            <label className="space-y-1.5">
              <span className={labelCls}>Para birimi</span>
              <select
                className={fieldCls}
                value={currency}
                onChange={(e) => {
                  setCurrency(e.target.value);
                  setRateOverride(null);
                }}
              >
                <option value="TRY">₺ TRY</option>
                <option value="USD">$ USD</option>
                <option value="EUR">€ EUR</option>
              </select>
              {currency !== "TRY" && (
                <span className="flex items-center gap-2 text-xs text-slate-500">
                  Kur
                  <input
                    type="number"
                    step="0.0001"
                    className="h-7 w-24 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 px-2 text-xs"
                    value={exchangeRate}
                    onChange={(e) => setRateOverride(Number(e.target.value) || null)}
                  />
                </span>
              )}
            </label>
          </div>

          {/* Ürün / hizmetler hızlı giriş */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="rounded-t-xl bg-brand-600 px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-white">
              Ürün / Hizmetler
            </div>
            <div className="p-3">
              <div className="relative">
                <input
                  className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 px-4 text-sm outline-none focus:border-brand-400 transition"
                  placeholder="Ürün adı yazın (yoksa ekle) veya barkod okutun"
                  value={quick}
                  onChange={(e) => setQuick(e.target.value)}
                  onFocus={() => setQuickFocus(true)}
                  onBlur={() => setQuickFocus(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleQuickEnter();
                    }
                  }}
                />
                {quickFocus && (
                  <ProductSuggestions
                    items={quickMatches}
                    inclVat={inclVat}
                    side={side}
                    onPick={(p) => {
                      pushLine(lineFromProduct(p));
                      setQuick("");
                    }}
                  />
                )}
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                En az üç harf yazın... Katalogda yoksa <b>Enter</b> ile yeni ürün eklenir.
              </p>
            </div>
          </div>

          {/* Kalemler */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                Kalemler ({lines.filter((l) => l.name.trim() || l.product_id).length})
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-400">Fiyatlar:</span>
                <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => toggleInclVat(false)}
                    className={cn("px-3 py-1.5 transition", !inclVat ? "bg-brand-500 text-white" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800")}
                  >
                    KDV Hariç
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleInclVat(true)}
                    className={cn("px-3 py-1.5 transition", inclVat ? "bg-brand-500 text-white" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800")}
                  >
                    KDV Dahil
                  </button>
                </div>
                <button type="button" className={ghostSmCls} onClick={generateAllBarcodes}>
                  <ScanBarcode size={14} /> Tümüne barkod üret
                </button>
                <button type="button" className={ghostSmCls} onClick={() => toast.info("Etiket yazdırma henüz hazır değil.")}>
                  <Printer size={14} /> Etiket yazdır
                </button>
                <button
                  type="button"
                  className={cn(ghostSmCls, "text-slate-700 dark:text-slate-100")}
                  onClick={() => setLines((ls) => [...ls, { ...emptyLine(), kind: "free" }])}
                >
                  <Plus size={14} /> Serbest Kalem
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
              <table className="w-full min-w-[1100px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    <th className="px-3 py-3 text-left w-8">#</th>
                    <th className="px-3 py-3 text-left">Ürün</th>
                    <th className="px-2 py-3 text-left w-32">Barkod</th>
                    <th className="px-2 py-3 text-left w-24">Birim</th>
                    <th className="px-2 py-3 text-right w-16">Stok</th>
                    <th className="px-2 py-3 text-left w-20">Miktar</th>
                    <th className="px-2 py-3 text-right w-28 leading-tight">
                      {priceHeader} ({inclVat ? "KDV dahil" : "KDV hariç"})
                    </th>
                    <th className="px-2 py-3 text-left w-16">KDV %</th>
                    <th className="px-2 py-3 text-right w-28 leading-tight">Tutar (KDV dahil)</th>
                    {isPurchase && <th className="px-2 py-3 text-right w-32 leading-tight">Satış fiyatı (raf · KDV dahil)</th>}
                    <th className="px-2 py-3 w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {lines.map((l, idx) => {
                    const product = l.product_id ? products.data?.find((p) => p.id === l.product_id) : null;
                    const lineTotal = inclVat ? l.quantity * l.unit_price : l.quantity * l.unit_price * (1 + l.vat_rate / 100);
                    const matches = activeLine === l.id && l.kind !== "product" ? searchProducts(products.data ?? [], l.name) : [];
                    return (
                      <tr key={l.id} className="align-top">
                        <td className="px-3 py-3 text-slate-400 text-xs pt-5">{idx + 1}</td>
                        <td className="px-3 py-2.5">
                          <div className="relative">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              className={cn(cellInputCls, "pl-9 pr-9")}
                              placeholder={l.kind === "free" ? "Serbest kalem açıklaması" : "Ürün isminden arayın veya barkod okutun"}
                              value={l.name}
                              onFocus={() => setActiveLine(l.id)}
                              onBlur={() => setActiveLine(null)}
                              onChange={(e) =>
                                patchLine(l.id, {
                                  name: e.target.value,
                                  // Ürün seçildikten sonra ad değişirse yeni ürün sayılır
                                  ...(l.kind === "product" ? { kind: "new" as const, product_id: null } : {}),
                                })
                              }
                            />
                            <ScanBarcode size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <ProductSuggestions
                              items={matches}
                              inclVat={inclVat}
                              side={side}
                              onPick={(p) => setLines((ls) => ls.map((x) => (x.id === l.id ? lineFromProduct(p, x) : x)))}
                            />
                          </div>
                          <div className="mt-1.5 flex items-center gap-2">
                            {l.kind === "product" ? (
                              <span className="text-[11px] text-brand-600 dark:text-brand-400 font-semibold">Katalogdan seçildi</span>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => patchLine(l.id, { kind: "new" })}
                                  className={cn(
                                    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition",
                                    l.kind === "new" ? "bg-brand-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500",
                                  )}
                                  title="Kayıtta ürün kataloğuna eklenir ve stoğa işlenir"
                                >
                                  <Plus size={12} /> Yeni ürün
                                </button>
                                <button
                                  type="button"
                                  onClick={() => patchLine(l.id, { kind: "free" })}
                                  className={cn(
                                    "text-[11px] transition",
                                    l.kind === "free" ? "font-bold text-slate-700 dark:text-slate-200" : "text-slate-400 hover:text-slate-600",
                                  )}
                                  title="Ürün kartı oluşturulmaz, stoğu etkilemez"
                                >
                                  serbest kalem yaz
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-2.5">
                          <input
                            className={cn(cellInputCls, "font-mono text-xs")}
                            placeholder="barkodsuz"
                            disabled={l.kind === "free"}
                            value={l.barcode}
                            onChange={(e) => patchLine(l.id, { barcode: e.target.value })}
                          />
                        </td>
                        <td className="px-2 py-2.5">
                          <select
                            className={cellInputCls}
                            value={l.unit_id ?? ""}
                            onChange={(e) => patchLine(l.id, { unit_id: e.target.value || null })}
                          >
                            {(units.data ?? []).map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name.toLocaleLowerCase("tr-TR")}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-2.5 text-right text-xs text-slate-500 pt-5 tabular-nums">
                          {l.kind === "free" ? "—" : product ? formatQty(product.stock_qty) : "yeni"}
                        </td>
                        <td className="px-2 py-2.5">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            className={cn(cellInputCls, "h-10")}
                            value={l.quantity || ""}
                            onChange={(e) => patchLine(l.id, { quantity: Number(e.target.value) || 0 })}
                          />
                        </td>
                        <td className="px-2 py-2.5">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className={cn(cellInputCls, "h-10 text-right")}
                            placeholder="Fiyat"
                            value={l.unit_price || ""}
                            onChange={(e) => patchLine(l.id, { unit_price: Number(e.target.value) || 0 })}
                          />
                        </td>
                        <td className="px-2 py-2.5">
                          <select
                            className={cn(cellInputCls, "h-10")}
                            value={l.vat_rate}
                            onChange={(e) => patchLine(l.id, { vat_rate: Number(e.target.value) })}
                          >
                            {[20, 10, 1, 0].map((v) => (
                              <option key={v} value={v}>
                                {v}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-2.5 text-right font-bold tabular-nums pt-5">{formatNumber(lineTotal)}</td>
                        {isPurchase && (
                          <td className="px-2 py-2.5">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className={cn(cellInputCls, "h-10 text-right")}
                              placeholder="raf fiyatı"
                              disabled={l.kind === "free"}
                              value={l.shelf_price || ""}
                              onChange={(e) => patchLine(l.id, { shelf_price: Number(e.target.value) || 0 })}
                            />
                          </td>
                        )}
                        <td className="px-2 py-2.5 text-center pt-4">
                          <button
                            type="button"
                            onClick={() => removeLine(l.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                            title="Kalemi sil"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Toplamlar */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Brüt Toplam</span>
              <span className="font-bold tabular-nums">{money(totals.gross)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500 dark:text-slate-400">İndirim</span>
              <div className="flex items-center gap-2">
                <input
                  ref={discountRef}
                  type="number"
                  min="0"
                  step="0.01"
                  className="h-9 w-24 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 px-2 text-right text-sm outline-none focus:border-brand-400"
                  value={discountValue || ""}
                  onChange={(e) => setDiscountValue(Math.max(0, Number(e.target.value) || 0))}
                />
                <select
                  className="h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 px-2 text-sm font-bold"
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as "rate" | "amount")}
                >
                  <option value="rate">%</option>
                  <option value="amount">{currency === "TRY" ? "TL" : currency}</option>
                </select>
                <span className="w-24 text-right text-rose-500 tabular-nums">−{formatNumber(totals.discount)}</span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500 dark:text-slate-400">Net Toplam</span>
              <div className="flex items-center gap-2">
                <span className="font-bold tabular-nums">{money(totals.net)}</span>
                <select
                  className="h-8 rounded-lg border border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-800/60 px-2 text-xs text-rose-500"
                  value="0"
                  disabled
                  title="Stopaj kesintisi henüz desteklenmiyor"
                >
                  <option value="0">stopaj yok</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">KDV</span>
              <span className="font-bold tabular-nums">{money(totals.vat)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-3">
              <span className="font-extrabold uppercase">Toplam</span>
              <span className="text-lg font-extrabold text-brand-600 dark:text-brand-400 tabular-nums">{money(totals.total)}</span>
            </div>
            <button
              type="button"
              onClick={() => discountRef.current?.focus()}
              className="w-full rounded-xl bg-rose-600 hover:bg-rose-700 py-2.5 text-sm font-bold text-white transition"
            >
              fatura altı iskonto yap
            </button>
          </div>

          {/* Ödeme durumu (yalnızca faturada) */}
          {isInvoice && (
            <div className="space-y-4 border-t border-slate-200 dark:border-slate-800 pt-4">
              <div className="space-y-1.5">
                <span className={labelCls}>Ödeme durumu</span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { v: true, label: isPurchase ? "Ödendi (Peşin)" : "Tahsil edildi (Peşin)" },
                    { v: false, label: "Açık (Vadeli)" },
                  ].map((o) => (
                    <button
                      key={String(o.v)}
                      type="button"
                      onClick={() => setPaid(o.v)}
                      className={cn(
                        "rounded-xl py-3 text-sm font-bold transition",
                        paid === o.v ? "bg-brand-500 text-white shadow-sm" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700",
                      )}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              {paid ? (
                <label className="block space-y-1.5">
                  <span className={labelCls}>Kasa / Hesap</span>
                  <select className={fieldCls} value={effectiveAccountId} onChange={(e) => setAccountId(e.target.value)}>
                    {accountList.length === 0 && <option value="">Kasa / hesap tanımlı değil</option>}
                    {accountList.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                        {a.currency !== "TRY" ? ` (${a.currency})` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <label className="block space-y-1.5">
                  <span className={labelCls}>Vade tarihi</span>
                  <input type="date" className={fieldCls} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </label>
              )}
            </div>
          )}

          <label className="block space-y-1.5">
            <span className={labelCls}>Not</span>
            <textarea
              rows={2}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 px-3.5 py-2.5 text-sm outline-none focus:border-brand-400 transition"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
        </div>

        {/* Alt çubuk */}
        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-t border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Genel Toplam</div>
            <div className="text-xl font-bold text-brand-600 dark:text-brand-400 tabular-nums">{money(totals.total)}</div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="btn-ghost" onClick={() => onOpenChange(false)} disabled={saving}>
              <X size={16} /> Vazgeç
            </button>
            <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
              <Save size={16} /> {saving ? "Kaydediliyor…" : "Kaydet"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
