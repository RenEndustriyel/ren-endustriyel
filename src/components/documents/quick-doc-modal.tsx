"use client";

import * as React from "react";
import { DateInput } from "@/components/ui/date-input";
import { ChevronDown, ChevronUp, Maximize2, Minimize2, Plus, Printer, Save, ScanBarcode, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { newId, useAccounts, useContacts, useProducts, useRows, useRpc, useSave, useUnits, useUpdate, type Row } from "@/lib/data";
import { CURRENCY_SYMBOL, formatNumber, formatQty, isoDate } from "@/lib/format";
import { rateFor, useRates } from "@/lib/rates";
import { DOC_TYPES, type DocType } from "@/lib/doc-types";
import { addDays } from "@/lib/doc-calc";
import type { DocRow } from "./document-editor";
import { useOrg } from "@/providers/org-provider";
import { cn } from "@/lib/utils";
import { NumberInput } from "@/components/ui/money-input";
import { MultiDiscountInput } from "./multi-discount-input";
import { contactKey, type ContactItem } from "./contact-select-modal";

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
  /** Kayıtlı belgeden gelen satır iskontosu (%) ve birim çarpanı — düzenlemede korunur */
  discount_rate: number;
  /** "10+5" gibi girilen çoklu iskonto metni */
  discount_str?: string;
  unit_factor: number;
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
  const entered = valid.reduce((s, l) => s + l.quantity * l.unit_price * (1 - (l.discount_rate || 0) / 100), 0);
  let ratio = 0;
  if (discountValue > 0 && entered > 0) {
    ratio = discountType === "rate" ? Math.min(discountValue, 100) / 100 : Math.min(discountValue / entered, 1);
  }
  let gross = 0;
  let net = 0;
  let vat = 0;
  for (const l of valid) {
    const full = l.quantity * l.unit_price;
    const base = full * (1 - (l.discount_rate || 0) / 100);
    const r = l.vat_rate / 100;
    gross += round2(inclVat ? full / (1 + r) : full);
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

const labelCls = "block text-[11px] leading-4 font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300";
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
  highlight = -1,
  anchor,
}: {
  items: Product[];
  onPick: (p: Product) => void;
  inclVat: boolean;
  side: QuickDocSide;
  /** klavyeyle seçili satır */
  highlight?: number;
  /** ürün kutusunun konumu — liste ekrana sabitlenir */
  anchor?: DOMRect | null;
}) {
  if (!items.length) return null;
  const width = anchor ? Math.max(anchor.width, 420) : 0;
  const style = anchor
    ? { left: Math.max(8, Math.min(anchor.left, window.innerWidth - width - 8)), top: anchor.bottom + 4, width: Math.min(width, window.innerWidth - 16) }
    : undefined;
  return (
    <div
      style={style}
      className={cn(
        "z-[80] max-h-72 overflow-y-auto rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 shadow-xl",
        anchor ? "fixed" : "absolute left-0 right-0 top-full mt-1",
      )}
    >
      {items.map((p, i) => {
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
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition",
              i === highlight ? "bg-brand-500 text-white" : "hover:bg-slate-50 dark:hover:bg-slate-800",
            )}
          >
            <span className="flex-1 min-w-0 truncate font-medium">{p.name}</span>
            <span className={cn("text-xs shrink-0", i === highlight ? "text-white/90" : "text-slate-500 dark:text-slate-400")}>stok {formatQty(p.stock_qty)}</span>
            <span className="text-xs font-semibold tabular-nums shrink-0">
              {formatNumber(convertVat(price, Number(p.vat_rate), incl, inclVat))}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Birim kutusu: harf yazınca süzülür, Enter ya da ↓ ile liste açılır, oklarla seçilir, Enter ile onaylanır.
 * Liste "fixed" konumlanır; tablo kaydırma kabının içinde kesilmez.
 */
function UnitCombo({
  value,
  units,
  onChange,
  className,
}: {
  value: string | null;
  units: { id: string; name: string }[];
  onChange: (id: string) => void;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState<string | null>(null);
  const [hi, setHi] = React.useState(0);
  const [pos, setPos] = React.useState<{ left: number; top: number; width: number } | null>(null);
  const ref = React.useRef<HTMLInputElement>(null);
  const listId = React.useId();
  const label = (n: string) => n.toLocaleLowerCase("tr-TR");
  const current = units.find((u) => u.id === value);
  const list = q ? units.filter((u) => label(u.name).includes(label(q))).sort((a, b) => Number(!label(a.name).startsWith(label(q))) - Number(!label(b.name).startsWith(label(q)))) : units;

  const openList = (startAt?: number) => {
    const r = ref.current?.getBoundingClientRect();
    if (r) setPos({ left: r.left, top: r.bottom + 4, width: Math.max(r.width, 140) });
    setHi(startAt ?? Math.max(0, list.findIndex((u) => u.id === value)));
    setOpen(true);
  };
  const close = () => {
    setOpen(false);
    setQ(null);
  };
  const pick = (u: { id: string }) => {
    onChange(u.id);
    close();
  };

  React.useEffect(() => {
    if (!open) return;
    const onScroll = () => close();
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [open]);

  return (
    <>
      <input
        ref={ref}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label="Birim"
        value={q ?? (current ? label(current.name) : "")}
        onFocus={(e) => e.target.select()}
        onClick={() => (open ? close() : openList())}
        onChange={(e) => {
          setQ(e.target.value);
          if (!open) openList(0);
          setHi(0);
        }}
        onBlur={() => {
          // yazılan harflere tek eşleşme varsa onu seç; yoksa eski birim kalır
          if (q && list.length >= 1) onChange(list[0].id);
          setTimeout(close, 120);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            if (!open) return openList();
            setHi((h) => (e.key === "ArrowDown" ? Math.min(list.length - 1, h + 1) : Math.max(0, h - 1)));
          } else if (e.key === "Enter") {
            if (!open) {
              // kapalıyken Enter listeyi açar (sonraki kutuya geçmez)
              e.preventDefault();
              e.stopPropagation();
              openList();
            } else if (list[hi]) {
              // açıkken Enter seçer; ardından sonraki kutuya geçilir
              pick(list[hi]);
            }
          } else if (e.key === "Escape" && open) {
            e.stopPropagation();
            close();
          }
        }}
        className={cn(className, "cursor-pointer text-center")}
      />
      {open && pos && (
        <div
          id={listId}
          role="listbox"
          className="fixed z-[80] max-h-56 overflow-y-auto rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 shadow-xl py-1"
          style={{ left: pos.left, top: pos.top, width: pos.width }}
        >
          {list.length === 0 ? (
            <div className="px-3 py-2 text-sm text-slate-600 dark:text-slate-300">Eşleşen birim yok</div>
          ) : (
            list.map((u, i) => (
              <button
                key={u.id}
                type="button"
                role="option"
                aria-selected={i === hi}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setHi(i)}
                onClick={() => pick(u)}
                className={cn(
                  "w-full px-3 py-2 text-left text-sm",
                  i === hi ? "bg-brand-500 text-white" : "text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800",
                  u.id === value && i !== hi && "font-bold",
                )}
              >
                {label(u.name)}
              </button>
            ))
          )}
        </div>
      )}
    </>
  );
}

/**
 * Cari kutusu: yazınca süzülür, ↑/↓ + Enter ile seçilir; kayıtlı değilse "yeni cari olarak kaydet" çıkar.
 * Aynı isim (harf/noktalama farkı yok sayılarak) varsa yenisi açılmaz, o seçilir.
 */
function ContactCombo({
  value,
  options,
  label,
  onChange,
  onCreate,
  className,
}: {
  value: string;
  options: { id: string; name: string }[];
  label: string;
  onChange: (id: string) => void;
  onCreate: (name: string) => Promise<string | null>;
  className?: string;
}) {
  const [q, setQ] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(false);
  const [hi, setHi] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const [pos, setPos] = React.useState<{ left: number; top: number; width: number } | null>(null);
  const ref = React.useRef<HTMLInputElement>(null);
  const listId = React.useId();
  const current = options.find((o) => o.id === value);
  const typed = (q ?? "").trim();
  const norm = (s: string) => s.toLocaleLowerCase("tr-TR");
  const list = typed ? options.filter((o) => norm(o.name).includes(norm(typed))).slice(0, 50) : options.slice(0, 50);
  const exact = typed ? options.find((o) => contactKey(o.name) === contactKey(typed)) : undefined;
  const canCreate = !!typed && !exact;
  const total = list.length + (canCreate ? 1 : 0);

  const openList = () => {
    const r = ref.current?.getBoundingClientRect();
    if (r) setPos({ left: r.left, top: r.bottom + 4, width: Math.max(r.width, 300) });
    setOpen(true);
  };
  const close = () => {
    setOpen(false);
    setQ(null);
  };
  const pick = (id: string) => {
    onChange(id);
    close();
  };
  const create = async () => {
    if (!canCreate || busy) return;
    setBusy(true);
    const id = await onCreate(typed);
    setBusy(false);
    if (id) pick(id);
  };
  const confirm = () => {
    if (hi < list.length) pick(list[hi].id);
    else if (canCreate) create();
  };

  React.useEffect(() => {
    if (!open) return;
    const onScroll = () => close();
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [open]);

  return (
    <>
      <div className="relative">
        <input
          ref={ref}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-label={label}
          placeholder={`${label} ara ya da yeni yaz`}
          value={q ?? current?.name ?? ""}
          onFocus={(e) => e.target.select()}
          onClick={() => (open ? null : openList())}
          onChange={(e) => {
            setQ(e.target.value);
            setHi(0);
            if (!open) openList();
          }}
          onBlur={() => setTimeout(close, 150)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              if (!open) return openList();
              setHi((h) => (e.key === "ArrowDown" ? Math.min(total - 1, h + 1) : Math.max(0, h - 1)));
            } else if (e.key === "Enter") {
              e.preventDefault();
              if (!open) return openList();
              if (exact && typed) return pick(exact.id);
              confirm();
            } else if (e.key === "Escape") close();
          }}
          className={cn(className, "pr-8")}
        />
        {value && (
          <button
            type="button"
            tabIndex={-1}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-md flex items-center justify-center text-slate-500 hover:text-rose-600"
            aria-label="Cariyi kaldır"
          >
            <X size={14} />
          </button>
        )}
      </div>
      {open && pos && (
        <div
          id={listId}
          role="listbox"
          className="fixed z-[80] max-h-72 overflow-y-auto rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 shadow-xl py-1"
          style={{ left: Math.max(8, Math.min(pos.left, window.innerWidth - pos.width - 8)), top: pos.top, width: Math.min(pos.width, window.innerWidth - 16) }}
        >
          {list.map((o, i) => (
            <button
              key={o.id}
              type="button"
              role="option"
              aria-selected={i === hi}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setHi(i)}
              onClick={() => pick(o.id)}
              className={cn("w-full px-3 py-2 text-left text-sm", i === hi ? "bg-brand-500 text-white" : "text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800", o.id === value && i !== hi && "font-bold")}
            >
              {o.name}
            </button>
          ))}
          {canCreate && (
            <button
              type="button"
              role="option"
              aria-selected={hi === list.length}
              disabled={busy}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setHi(list.length)}
              onClick={create}
              className={cn(
                "w-full px-3 py-2.5 text-left text-sm border-t border-slate-200 dark:border-slate-700 flex items-center gap-2",
                hi === list.length ? "bg-brand-500 text-white" : "text-brand-700 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-slate-800",
              )}
            >
              <Plus size={15} />
              <span>
                <b>“{typed}”</b> — yeni {label.toLocaleLowerCase("tr-TR")} olarak kaydet{busy ? "…" : ""}
              </span>
            </button>
          )}
          {list.length === 0 && !canCreate && <div className="px-3 py-2 text-sm text-slate-600 dark:text-slate-300">Cari bulunamadı</div>}
        </div>
      )}
    </>
  );
}

/** Sık kullanılan KDV oranları — ↑/↓ ve ok düğmeleri bu oranlar arasında gezer */
const VAT_STEPS = [0, 1, 10, 20];

/** KDV % kutusu: elle yazılabilir (ör. 18 ya da 8,5), ↑/↓ tuşu ve ok düğmeleriyle değiştirilebilir */
function VatInput({ value, onChange, className }: { value: number; onChange: (v: number) => void; className?: string }) {
  const [text, setText] = React.useState<string | null>(null); // null: düzenlenmiyor
  const fmt = (n: number) => String(n).replace(".", ",");
  const step = (dir: 1 | -1) => {
    const next =
      dir > 0
        ? (VAT_STEPS.find((v) => v > value) ?? VAT_STEPS[VAT_STEPS.length - 1])
        : ([...VAT_STEPS].reverse().find((v) => v < value) ?? VAT_STEPS[0]);
    onChange(next);
    if (text !== null) setText(fmt(next));
  };
  const arrowBtn = "h-1/2 w-6 flex items-center justify-center text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400";
  return (
    <div className="relative">
      <input
        inputMode="decimal"
        aria-label="KDV oranı"
        value={text ?? fmt(value)}
        onFocus={(e) => {
          setText(fmt(value));
          const el = e.target;
          requestAnimationFrame(() => el.select());
        }}
        onBlur={() => setText(null)}
        onChange={(e) => {
          const t = e.target.value.replace(/[^\d,.]/g, "");
          setText(t);
          const n = Number(t.replace(",", "."));
          // yalnızca geçerli oran (0–100) kaydedilir; yarım yazım (ör. "8,") önceki değeri bozmaz
          if (t !== "" && Number.isFinite(n) && n >= 0 && n <= 100) onChange(Math.round(n * 100) / 100);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp") {
            e.preventDefault();
            step(1);
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            step(-1);
          }
        }}
        className={cn(className, "pr-7 text-center tabular-nums")}
      />
      <div className="absolute right-0.5 inset-y-0.5 flex flex-col">
        <button type="button" tabIndex={-1} className={arrowBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => step(1)} aria-label="KDV oranını artır">
          <ChevronUp size={13} />
        </button>
        <button type="button" tabIndex={-1} className={arrowBtn} onMouseDown={(e) => e.preventDefault()} onClick={() => step(-1)} aria-label="KDV oranını azalt">
          <ChevronDown size={13} />
        </button>
      </div>
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
  /** Belge türü sabitse (teklif, iade, düzenleme…) tür seçimi gizlenir */
  docType?: DocType;
  /** edit: kayıtlı belge · convert: kaynak belgeden dönüştür · copy: kopyala */
  mode?: "new" | "edit" | "convert" | "copy";
  base?: DocRow | null;
  /** Hazır cari (ör. cari kartından "yeni fatura") */
  contactId?: string | null;
  /** Fiyat farkı faturası gibi hazır ilk kalem */
  initialLine?: { description: string; unit_price: number; vat_rate: number; quantity: number };
  initialNotes?: string;
  /** Ön yüklenecek ürün kalemleri (ör. eksi stoklardan alış faturası) */
  prefillLines?: { product_id: string; quantity: number }[];
}

/** Pusulam penceresinin açabildiği belge türleri (hızlı satış, masraf ve maaş kendi ekranlarında) */
export const QUICK_DOC_TYPES: DocType[] = [
  "quote",
  "sales_order",
  "sales_delivery",
  "sales_invoice",
  "sales_return",
  "purchase_order",
  "purchase_delivery",
  "purchase_invoice",
  "purchase_return",
];

const INVOICE_TYPES: DocType[] = ["sales_invoice", "purchase_invoice"];

/** Pusulam "Yeni Alış Belgesi / Yeni Satış Belgesi" penceresi */
export function QuickDocModal(props: QuickDocModalProps) {
  // Kapalıyken sökülür; her açılışta form sıfırdan başlar
  if (!props.open) return null;
  return <QuickDocForm {...props} />;
}

function QuickDocForm({
  side: sideProp,
  onOpenChange,
  contact: initialContact,
  initialKind = "Fatura",
  onSaved,
  docType: fixedType,
  mode = "new",
  base = null,
  contactId: presetContactId,
  initialLine,
  initialNotes,
  prefillLines,
}: QuickDocModalProps) {
  const side: QuickDocSide = fixedType ? (DOC_TYPES[fixedType].side as QuickDocSide) : sideProp;
  const isEdit = mode === "edit" && !!base;
  /** kayıtlı/kaynak belgeden alan doldurulsun mu */
  const fromBase = mode !== "new" && !!base;
  const { org } = useOrg();
  const products = useProducts();
  const units = useUnits();
  const productUnits = useRows<Row<"product_units">>("product_units");
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
  const [contactId, setContactId] = React.useState<string>(
    (fromBase ? base?.contact_id : null) ?? presetContactId ?? initialContact?.id ?? "",
  );
  const [kind, setKind] = React.useState<QuickDocKind>(initialKind);
  const docType: DocType = fixedType ?? DOC_TYPE_MAP[side][kind];
  const cfg = DOC_TYPES[docType];
  const [issueDate, setIssueDate] = React.useState(isEdit ? base!.issue_date : isoDate());
  const [number, setNumber] = React.useState(isEdit ? base!.number ?? "" : "");
  const [validUntil, setValidUntil] = React.useState(
    isEdit ? base!.valid_until ?? "" : docType === "quote" ? addDays(isoDate(), 15) : "",
  );
  const [currency, setCurrency] = React.useState(fromBase ? base!.currency : "TRY");
  const [rateOverride, setRateOverride] = React.useState<number | null>(
    fromBase && base!.currency !== "TRY" ? Number(base!.exchange_rate) : null,
  );
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
      discount_rate: 0,
      unit_factor: 1,
    }),
    [defaultUnitId],
  );
  const [inclVat, setInclVat] = React.useState(fromBase ? !!base!.prices_include_vat : false); // yeni belge her zaman KDV hariç açılır
  const [lines, setLines] = React.useState<Line[]>(() => {
    if (fromBase && base!.lines?.length) {
      return base!.lines.map((l) => ({
        // düzenlemede satır kimliği korunur (stok hareketleri satıra bağlı)
        id: isEdit ? l.id : newId(),
        kind: l.product_id ? ("product" as const) : ("free" as const),
        product_id: l.product_id,
        name: l.description ?? "",
        barcode: "",
        unit_id: l.unit_id,
        quantity: Number(l.quantity),
        unit_price: Number(l.unit_price),
        vat_rate: Number(l.vat_rate),
        shelf_price: 0,
        discount_rate: Number(l.discount_rate) || 0,
        unit_factor: Number(l.unit_factor) || 1,
      }));
    }
    if (initialLine) {
      return [
        {
          ...emptyLine(),
          kind: "free",
          name: initialLine.description,
          quantity: initialLine.quantity,
          unit_price: initialLine.unit_price,
          vat_rate: initialLine.vat_rate,
        },
      ];
    }
    return [emptyLine()];
  });
  const [activeLine, setActiveLine] = React.useState<string | null>(null);

  // Toplamlar
  const [discountType, setDiscountType] = React.useState<"rate" | "amount">(
    fromBase ? ((base!.discount_type as "rate" | "amount") ?? "rate") : "rate",
  );
  const [discountValue, setDiscountValue] = React.useState(fromBase ? Number(base!.discount_value) || 0 : 0);
  const discountRef = React.useRef<HTMLInputElement>(null);

  // Ödeme (peşin ödeme yalnızca yeni faturada; kayıtlı belgenin ödemeleri kendi ekranında yönetilir)
  const isInvoice = INVOICE_TYPES.includes(docType);
  const showPayment = isInvoice && !isEdit;
  const [paid, setPaid] = React.useState(isPurchase && !fromBase);
  const [accountId, setAccountId] = React.useState("");
  const [dueDate, setDueDate] = React.useState(fromBase ? base!.due_date ?? "" : "");
  /** Vade elle değiştirildiyse otomatik hesap üzerine yazmaz */
  const dueTouched = React.useRef(false);
  const isOrderDoc = docType === "sales_order" || docType === "purchase_order";
  const [notes, setNotes] = React.useState((fromBase ? base!.notes : null) ?? initialNotes ?? "");
  // Banka IBAN'ı belgeye eklensin mi (PDF'te "koşullar" alanında basılır)
  const [ibanOn, setIbanOn] = React.useState(fromBase ? /IBAN:/.test(base!.terms ?? "") : false);
  const [ibanAccountId, setIbanAccountId] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  // --- Bağlantı kopmalarına karşı: kalıcı kimlikler (tekrar kaydetmek çift kayıt oluşturmaz) ---
  const docIdRef = React.useRef<string>(isEdit ? base!.id : newId());
  const paymentIdRef = React.useRef<string>(newId());
  const productIds = React.useRef<Record<string, string>>({});
  const productIdFor = (lineId: string) => (productIds.current[lineId] ??= newId());

  // --- Otomatik taslak: yazılanlar bu cihazda saklanır, pencere kapansa da kaybolmaz ---
  const draftKey = `ren-belge-taslak:${isEdit ? base!.id : (fixedType ?? side)}`;
  const snapshot = JSON.stringify({ contactId, kind, issueDate, number, validUntil, currency, rateOverride, inclVat, lines, discountType, discountValue, paid, accountId, dueDate, notes, ibanOn, ibanAccountId });
  const initialSnapshot = React.useRef(snapshot);
  type Draft = { at: number; snap: string; docId: string; paymentId: string; productIds: Record<string, string> };
  const [draft, setDraft] = React.useState<Draft | null>(null);
  React.useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem(draftKey) || "null") as Draft | null;
      // 7 günden eski taslakları gösterme
      if (d && Date.now() - d.at < 7 * 864e5 && d.snap !== initialSnapshot.current) setDraft(d); // eslint-disable-line react-hooks/set-state-in-effect
    } catch {}
  }, [draftKey]);
  React.useEffect(() => {
    // yalnızca gerçekten bir şey girildiyse sakla (cari/vade gibi otomatik dolan alanlar taslak sayılmaz)
    const hasContent = lines.some((l) => l.name.trim() || l.product_id) || notes.trim() !== "";
    if (!hasContent || snapshot === initialSnapshot.current || draft) return; // değişiklik yoksa ya da geri yükleme bekleniyorsa yazma
    const t = setTimeout(() => {
      try {
        localStorage.setItem(
          draftKey,
          JSON.stringify({ at: Date.now(), snap: snapshot, docId: docIdRef.current, paymentId: paymentIdRef.current, productIds: productIds.current }),
        );
      } catch {}
    }, 500);
    return () => clearTimeout(t);
  }, [snapshot, draftKey, draft, lines, notes]);
  const clearDraft = () => {
    try {
      localStorage.removeItem(draftKey);
    } catch {}
  };
  const restoreDraft = () => {
    if (!draft) return;
    const v = JSON.parse(draft.snap);
    setContactId(v.contactId ?? "");
    setKind(v.kind);
    setIssueDate(v.issueDate);
    setNumber(v.number ?? "");
    setValidUntil(v.validUntil ?? "");
    setCurrency(v.currency);
    setRateOverride(v.rateOverride ?? null);
    setInclVat(!!v.inclVat);
    setLines(v.lines);
    setDiscountType(v.discountType);
    setDiscountValue(Number(v.discountValue) || 0);
    setPaid(!!v.paid);
    setAccountId(v.accountId ?? "");
    setDueDate(v.dueDate ?? "");
    dueTouched.current = true; // taslaktaki vade korunsun
    setNotes(v.notes ?? "");
    setIbanOn(!!v.ibanOn);
    setIbanAccountId(v.ibanAccountId ?? "");
    // aynı belge/ürün/tahsilat kimlikleri: önceki yarım kayıt sunucuya ulaştıysa üzerine yazılır, çift olmaz
    if (!isEdit) docIdRef.current = draft.docId;
    paymentIdRef.current = draft.paymentId;
    productIds.current = draft.productIds ?? {};
    setDraft(null);
    toast.success("Taslak geri yüklendi");
  };
  const discardDraft = () => {
    clearDraft();
    // şimdiki hâli esas al: silinen taslak kendiliğinden yeniden oluşmasın
    initialSnapshot.current = snapshot;
    setDraft(null);
  };

  const accountList = accounts.data ?? [];
  const bankAccounts = accountList.filter((a) => a.is_active !== false && a.type === "bank" && !!a.iban);
  const effectiveIbanId = ibanAccountId || bankAccounts[0]?.id || "";
  const effectiveAccountId = accountId || accountList[0]?.id || "";

  // Carinin vade günü → vade tarihi otomatik (fatura/iade; siparişte tarih teslim/hatırlatma anlamında olduğu için atlanır)
  const termDays = Number((contacts.data ?? []).find((c) => c.id === contactId)?.payment_term_days ?? 0) || 0;
  React.useEffect(() => {
    if (isOrderDoc || !cfg.payable || dueTouched.current) return;
    // kayıtlı belgede yalnızca kullanıcı cariyi ya da tarihi değiştirirse yeniden hesapla (mevcut vade bozulmasın)
    if (isEdit && contactId === (base!.contact_id ?? "") && issueDate === base!.issue_date) return;
    if (termDays > 0) setDueDate(addDays(issueDate, termDays)); // eslint-disable-line react-hooks/set-state-in-effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId, issueDate, termDays]);

  /** Yazılan cari kayıtlı değilse oluştur (aynı isim varsa onu döndürür — mükerrer açılmaz) */
  const saveContact = useSave("contacts");
  const createContact = async (name: string): Promise<string | null> => {
    const ex = (contacts.data ?? []).find((c) => contactKey(c.name) === contactKey(name));
    if (ex) return ex.id;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      toast.error("İnternet yok — cari kaydedilemedi");
      return null;
    }
    try {
      const res = await saveContact.save<{ id: string }>({ name: name.trim(), kind: isPurchase ? "supplier" : "customer", is_active: true });
      if (res.queued) {
        toast.error("İnternet yok — cari kaydedilemedi");
        return null;
      }
      toast.success(`${name.trim()} ${contactLabel.toLocaleLowerCase("tr-TR")} olarak kaydedildi`);
      return res.data!.id;
    } catch {
      return null; // hata mesajı useSave tarafından gösterildi
    }
  };

  const contactOptions = React.useMemo(() => {
    const all = contacts.data ?? [];
    const same = (k: string) => k === (isPurchase ? "supplier" : "customer") || k === "both";
    // önce bu türdekiler, sonra diğer türde kayıtlı cariler (aynı firma ikinci kez açılmasın)
    const list: { id: string; name: string; payment_term_days?: number | null }[] = [
      ...all.filter((c) => same(c.kind)).map((c) => ({ id: c.id, name: c.name, payment_term_days: c.payment_term_days })),
      ...all
        .filter((c) => !same(c.kind))
        .map((c) => ({ id: c.id, name: `${c.name} (${isPurchase ? "müşteri" : "tedarikçi"})`, payment_term_days: c.payment_term_days })),
    ];
    // Seçili cari (kayıtlı belgenin carisi, cari kartından gelen ya da az önce oluşturulan) türü farklı olsa da görünsün
    if (contactId && !list.some((c) => c.id === contactId)) {
      const found = all.find((c) => c.id === contactId);
      const name = found?.name ?? (initialContact?.id === contactId ? initialContact.name : null);
      if (name) list.unshift({ id: contactId, name, payment_term_days: found?.payment_term_days });
    }
    return list;
  }, [contacts.data, isPurchase, initialContact, contactId]);

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
    unit_factor: 1,
    unit_price: priceFromProduct(p),
    vat_rate: Number(p.vat_rate),
    shelf_price: round2(convertVat(Number(p.sale_price), Number(p.vat_rate), p.sale_price_includes_vat, true)),
  });

  // Ön yüklenen ürünler: katalog gelince bir kez kalemlere dönüştür
  const prefillDone = React.useRef(false);
  React.useEffect(() => {
    if (prefillDone.current || !prefillLines?.length || !products.data?.length) return;
    prefillDone.current = true;
    const made = prefillLines
      .map((x) => {
        const p = products.data!.find((pp) => pp.id === x.product_id);
        return p ? { ...lineFromProduct(p), quantity: x.quantity } : null;
      })
      .filter(Boolean) as Line[];
    if (made.length) setLines(made); // eslint-disable-line react-hooks/set-state-in-effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products.data, prefillLines]);

  const patchLine = (id: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  // Ürün önerileri: klavye vurgusu ve ekrandaki konum
  const [sugIdx, setSugIdx] = React.useState(0);
  const [anchor, setAnchor] = React.useState<DOMRect | null>(null);
  const nameEl = React.useRef<HTMLInputElement | null>(null);
  React.useEffect(() => {
    if (!activeLine) return;
    const update = () => setAnchor(nameEl.current?.getBoundingClientRect() ?? null);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [activeLine]);

  const onNameFocus = (e: React.FocusEvent<HTMLInputElement>, id: string) => {
    nameEl.current = e.currentTarget;
    setAnchor(e.currentTarget.getBoundingClientRect());
    setActiveLine(id);
    setSugIdx(0);
  };

  /** Ürün kutusu: ↑/↓ öneride gezer; Enter/Tab vurgulu ürünü (ya da barkodu birebir tutanı) seçip Miktar'a geçer */
  const onNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, l: Line, matches: Product[]) => {
    if ((e.key === "ArrowDown" || e.key === "ArrowUp") && matches.length) {
      e.preventDefault();
      setSugIdx((i) => (e.key === "ArrowDown" ? Math.min(matches.length - 1, i + 1) : Math.max(0, i - 1)));
      return;
    }
    if (e.key === "Escape") {
      setActiveLine(null);
      return;
    }
    if ((e.key === "Enter" || e.key === "Tab") && !e.shiftKey) {
      const text = l.name.trim();
      if (l.kind !== "product" && text) {
        const exact = (products.data ?? []).find((p) => (p.barcode ?? "") === text || normalize(p.name) === normalize(text));
        const pick = exact ?? matches[sugIdx] ?? null;
        if (pick) {
          setLines((ls) => ls.map((x) => (x.id === l.id ? lineFromProduct(pick, x) : x)));
        } else if (/^\d{8,14}$/.test(text)) {
          // katalogda olmayan barkod: barkodu sakla, ad yazılsın
          e.preventDefault();
          e.stopPropagation();
          patchLine(l.id, { name: "", barcode: text, kind: "new" });
          toast.info("Barkod katalogda yok; ürün adını yazın.");
          return;
        }
      }
      setActiveLine(null);
      // olay kalem kabına geçer → sonraki kutuya (Miktar) gidilir
    }
  };

  /** Kalemlerde Enter/Tab: sonraki kutuya geç; satır sonunda yeni kalem ekleyip ürün kutusuna geç */
  const onLinesKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if ((e.key !== "Enter" && e.key !== "Tab") || e.shiftKey) return;
    const t = e.target as HTMLElement;
    if (!(t instanceof HTMLInputElement || t instanceof HTMLSelectElement)) return;
    e.preventDefault();
    const root = e.currentTarget;
    const fields = () =>
      [...root.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input:not([disabled]), select:not([disabled])")].filter(
        (el) => el.offsetParent !== null,
      );
    const list = fields();
    const i = list.indexOf(t);
    const focusAt = (k: number) => {
      const el = fields()[k];
      if (!el) return;
      el.focus();
      if (el instanceof HTMLInputElement) el.select();
    };
    if (i >= 0 && i < list.length - 1) focusAt(i + 1);
    else {
      // son satır boşsa yeni satır açma, o satırın ürün kutusuna dön
      const last = lines[lines.length - 1];
      if (last && !last.name.trim() && !last.product_id) {
        const names = root.querySelectorAll<HTMLInputElement>("input[data-line-name]");
        const target = [...names].filter((el) => el.offsetParent !== null).pop();
        target?.focus();
        return;
      }
      setLines((ls) => [...ls, emptyLine()]);
      setTimeout(() => focusAt(i + 1), 60);
    }
  };

  // Yeni belgede imleç doğrudan ilk ürün kutusunda
  const linesRoot = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (isEdit) return;
    const t = setTimeout(() => {
      const el = [...(linesRoot.current?.querySelectorAll<HTMLInputElement>("input[data-line-name]") ?? [])].find((x) => x.offsetParent !== null);
      el?.focus();
    }, 150);
    return () => clearTimeout(t);
  }, [isEdit]);

  /** Satır tutarı seçili KDV görünümünde (dahil/hariç), iskonto sonrası */
  const lineAmount = (l: Line) => l.quantity * l.unit_price * (1 - (l.discount_rate || 0) / 100);

  /** Satış belgesinde: ürünün alış fiyatı — belgenin KDV dahil/hariç görünümünde ve para biriminde */
  const purchaseHint = (l: Line) => {
    if (isPurchase || !l.product_id) return null;
    const p = products.data?.find((x) => x.id === l.product_id);
    const raw = Number(p?.purchase_price || 0);
    if (!p || raw <= 0) return null;
    const cur = p.purchase_currency || "TRY";
    const inTry = raw * (cur === "TRY" ? 1 : rateFor(rates.data, cur) || 1);
    const inDoc = inTry / (exchangeRate || 1);
    const buy = round2(convertVat(inDoc, Number(p.vat_rate ?? l.vat_rate), !!p.purchase_price_includes_vat, inclVat) * (l.unit_factor || 1));
    const netSale = l.unit_price * (1 - (l.discount_rate || 0) / 100);
    return { buy, loss: l.unit_price > 0 && netSale < buy - 0.004 };
  };
  const hintEl = (l: Line) => {
    const h = purchaseHint(l);
    if (!h) return null;
    return (
      <div className={cn("mt-1 text-center text-[11px] tabular-nums", h.loss ? "font-bold text-rose-600 dark:text-rose-400" : "text-slate-600 dark:text-slate-300")}>
        Alış: {formatNumber(h.buy)}
        {h.loss && " · zarar"}
      </div>
    );
  };
  /** Tutar elle girilince birim fiyatı geri hesapla (miktar ve iskonto korunur) */
  const setLineAmount = (l: Line, amount: number) => {
    const per = l.quantity * (1 - (l.discount_rate || 0) / 100);
    if (per > 0) patchLine(l.id, { unit_price: Math.max(0, Math.round((amount / per) * 10000) / 10000) });
  };
  /** Raf fiyatı içeride KDV dahil tutulur; ekranda seçili görünümde gösterilir */
  const shelfShown = (l: Line) => (inclVat ? l.shelf_price : round2(l.shelf_price / (1 + l.vat_rate / 100)));
  const setShelfShown = (l: Line, v: number) =>
    patchLine(l.id, { shelf_price: Math.max(0, round2(inclVat ? v : v * (1 + l.vat_rate / 100))) });

  const removeLine = (id: string) => setLines((ls) => (ls.length <= 1 ? [emptyLine()] : ls.filter((l) => l.id !== id)));

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
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      toast.error("İnternet bağlantısı yok — belge kaydedilmedi", {
        description: "Girdiğiniz bilgiler bu cihazda taslak olarak saklandı. Bağlantı gelince tekrar Kaydet'e basın.",
        duration: 10000,
      });
      return;
    }
    const valid = lines.filter((l) => l.name.trim() || l.product_id);
    if (!valid.length) {
      toast.error("En az bir kalem ekleyin.");
      return;
    }
    if (valid.some((l) => !(l.quantity > 0))) {
      toast.error("Kalem miktarları sıfırdan büyük olmalı.");
      return;
    }
    // Açık (vadeli) kalacak belge cariye yazılmalı; aksi halde borç/alacak kimsenin hesabına geçmez
    if (!contactId && cfg.payable && !(showPayment && paid)) {
      toast.error(`${contactLabel} seçin — açık kalan belge cari hesabına yazılır.`);
      return;
    }
    if (!org?.id) return;
    setSaving(true);

    try {
      const docId = docIdRef.current;
      const toTry = (n: number) => round2(n * exchangeRate);

      // 1) Katalogda olmayan ürünleri oluştur (stoğa girebilmeleri için)
      const resolved: Line[] = [];
      for (const l of valid) {
        if (l.kind !== "new") {
          resolved.push(l);
          continue;
        }
        const res = await saveProduct.save<{ id: string }>({
          id: productIdFor(l.id),
          name: l.name.trim(),
          barcode: l.barcode.trim() || null,
          unit_id: l.unit_id,
          vat_rate: l.vat_rate,
          type: "product",
          track_stock: true,
          is_active: true,
          purchase_price: isPurchase ? toTry(l.unit_price / (l.unit_factor || 1)) : 0,
          purchase_price_includes_vat: isPurchase && Number(l.vat_rate) === 0 ? false : inclVat,
          // Satış fiyatı ürün kartına her zaman KDV DAHİL kaydedilir (KDV hariç girildiyse KDV eklenir)
          sale_price: isPurchase ? l.shelf_price : round2(convertVat(toTry(l.unit_price / (l.unit_factor || 1)), l.vat_rate, inclVat, true)),
          sale_price_includes_vat: true,
        });
        if (res.queued) throw new Error("Bağlantı yok — ürün kaydı sıraya alındı, belge kaydedilmedi");
        resolved.push({ ...l, kind: "product", product_id: res.data!.id });
      }

      // 2) Belge — toplamları veritabanı kalemlerden yeniden hesaplar
      const contact = contactOptions.find((c) => c.id === contactId);
      // Pencerede olmayan alanlar: düzenlemede kayıtlı değer aynen korunur (veritabanı gelmeyen alanı boşaltır)
      const kept = isEdit
        ? {
            status: base!.status,
            valid_until: base!.valid_until,
            employee_id: base!.employee_id,
            warehouse_id: base!.warehouse_id,
            category_id: base!.category_id,
            affects_stock: base!.affects_stock,
            source_document_id: base!.source_document_id,
            description: base!.description,
            terms: base!.terms,
          }
        : mode === "convert" && base
          ? {
              status: cfg.statuses ? "pending" : "approved",
              warehouse_id: base.warehouse_id,
              terms: base.terms,
              source_document_id: base.id,
              // irsaliyeden faturaya dönüşümde stok irsaliyede işlenmiştir
              affects_stock: !(base.doc_type === "sales_delivery" || base.doc_type === "purchase_delivery"),
            }
          : { status: cfg.statuses ? "pending" : "approved" };
      const ibanAcc = bankAccounts.find((a) => a.id === effectiveIbanId);
      const otherTerms = String((kept as { terms?: string | null }).terms ?? "")
        .split("\n")
        .filter((l) => l.trim() && !/IBAN:/.test(l));
      if (ibanOn && ibanAcc?.iban) otherTerms.push(`Banka: ${ibanAcc.bank_name || ibanAcc.name} — IBAN: ${ibanAcc.iban}`);
      const terms = otherTerms.join("\n") || null;
      const payload = {
        description: contact?.name ? `${contact.name} - ${isPurchase ? "Alış" : "Satış"}` : null,
        ...kept,
        id: docId,
        org_id: org.id,
        doc_type: docType,
        number: number.trim() || null,
        issue_date: issueDate,
        due_date: showPayment ? (!paid ? dueDate || null : null) : dueDate || null,
        valid_until: docType === "quote" ? validUntil || null : (kept as { valid_until?: string | null }).valid_until ?? null,
        contact_id: contactId || null,
        currency,
        exchange_rate: exchangeRate,
        prices_include_vat: inclVat,
        discount_type: discountType,
        discount_value: discountValue,
        notes: notes.trim() || null,
        terms,
      };
      const docLines = resolved.map((l) => ({
        id: isEdit ? l.id : newId(),
        product_id: l.kind === "free" ? null : l.product_id,
        description: l.name.trim() || "Kalem",
        quantity: l.quantity,
        unit_id: l.unit_id,
        unit_factor: l.unit_factor || 1,
        unit_price: l.unit_price,
        discount_rate: l.discount_rate || 0,
        vat_rate: l.vat_rate,
      }));
      const account = accountList.find((a) => a.id === effectiveAccountId);
      const docRes = await saveDoc.call(
        {
          p_doc: payload,
          p_lines: docLines,
          p_payment:
            showPayment && paid && effectiveAccountId
              ? { id: paymentIdRef.current, account_id: effectiveAccountId, method: PAYMENT_METHOD[account?.type ?? "cash"] ?? "cash" }
              : null,
        },
        isEdit ? `${cfg.label} güncellendi` : `${cfg.label} kaydedildi`,
      );

      // 3) Alışta ürün kartlarına alış fiyatı, raf fiyatı ve barkodu işle (iadede fiyat değişmez)
      if (isPurchase && docType !== "purchase_return") {
        for (const l of resolved) {
          if (l.kind !== "product" || !l.product_id) continue;
          const p = products.data?.find((x) => x.id === l.product_id);
          if (!p) continue; // yeni oluşturulan ürün zaten güncel
          // KDV'siz (%0) alış: ödenen tutar maliyettir (KDV hariç sayılır); ürünün satış KDV oranı değişmez
          const noVat = Number(l.vat_rate) === 0;
          const patch: Record<string, unknown> = {
            // birim çarpanı (koli vb.) varsa ana birim fiyatı
            purchase_price: toTry(l.unit_price / (l.unit_factor || 1)),
            purchase_price_includes_vat: noVat ? false : inclVat,
            ...(noVat ? {} : { vat_rate: l.vat_rate }),
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

      if (docRes.queued) {
        // çevrimdışı kuyruğa alındı: pencereyi kapatma, taslak dursun (tekrar kaydetmek aynı belgeyi günceller)
        return;
      }
      clearDraft();
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

  const title = isEdit
    ? `${cfg.label} Düzenle${base?.number ? ` · ${base.number}` : ""}`
    : fixedType
      ? `Yeni ${cfg.label}`
      : `Yeni ${isPurchase ? "Alış" : "Satış"} Belgesi`;
  const priceHeader = isPurchase ? "Alış fiyatı" : "Satış fiyatı";
  // Pusulam bu pencerede tutarları sembol önde gösterir: ₺1.234,56
  const money = (n: number) => `${CURRENCY_SYMBOL[currency] ?? currency}${formatNumber(n)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl",
          maximized ? "fixed inset-0 rounded-none" : "w-full max-w-[1500px] max-h-[95dvh] rounded-2xl",
        )}
      >
        {/* Başlık */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex min-w-0 items-center gap-3">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight truncate">{title}</h2>
            <select
              aria-label="Para birimi"
              title="Para birimi"
              className="h-8 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 text-xs font-bold text-slate-700 dark:text-slate-200"
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
              <span className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                Kur
                <input
                  type="number"
                  step="0.0001"
                  aria-label="Döviz kuru"
                  className="h-8 w-24 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 text-xs"
                  value={exchangeRate}
                  onChange={(e) => setRateOverride(Number(e.target.value) || null)}
                />
              </span>
            )}
          </div>
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
          {draft && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
              <span className="flex-1 min-w-0">
                <b>Kaydedilmemiş taslak var</b> ({new Date(draft.at).toLocaleString("tr-TR")}). Kaldığınız yerden devam etmek ister misiniz?
              </span>
              <button type="button" onClick={restoreDraft} className="btn-primary h-9 px-3 text-sm">
                Geri yükle
              </button>
              <button type="button" onClick={discardDraft} className="btn-ghost h-9 px-3 text-sm">
                Taslağı sil
              </button>
            </div>
          )}
          {/* Üst alanlar */}
          {/* Belge başlığı — sol: cari ve belge, sağ: tarih ve ödeme */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Cari ve belge */}
            <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/30 p-4 space-y-3">
              <h3 className={cn(labelCls, "text-slate-700 dark:text-slate-200")}>{contactLabel} ve belge</h3>
              <label className="block space-y-1.5">
                <span className={labelCls}>{contactLabel}</span>
                <ContactCombo
                  value={contactId}
                  options={contactOptions}
                  label={contactLabel}
                  onChange={setContactId}
                  onCreate={createContact}
                  className={fieldCls}
                />
                {contactId && termDays > 0 && !isOrderDoc && (
                  <span className="block text-xs text-slate-600 dark:text-slate-300">Cari vade süresi: {termDays} gün</span>
                )}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1.5">
                  <span className={labelCls}>Belge türü</span>
                  {fixedType ? (
                    <div className={cn(fieldCls, "flex items-center bg-slate-100 dark:bg-slate-800 font-semibold text-slate-800 dark:text-slate-100")}>{cfg.label}</div>
                  ) : (
                    <select className={fieldCls} value={kind} onChange={(e) => setKind(e.target.value as QuickDocKind)}>
                      <option value="Fatura">Fatura</option>
                      <option value="İrsaliye">İrsaliye</option>
                      <option value="Sipariş">Sipariş</option>
                    </select>
                  )}
                </label>
                <label className="block space-y-1.5">
                  <span className={labelCls}>{isPurchase ? "Belge no (tedarikçi)" : "Belge no"}</span>
                  <input
                    className={cn(fieldCls, "font-mono placeholder:font-sans placeholder:text-slate-500")}
                    placeholder={isPurchase ? "ör. DMK2026000004172" : "Otomatik verilir"}
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                  />
                </label>
              </div>
            </section>

            {/* Tarih ve ödeme */}
            <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/30 p-4 space-y-3">
              <h3 className={cn(labelCls, "text-slate-700 dark:text-slate-200")}>Tarih ve ödeme</h3>
              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1.5">
                  <span className={labelCls}>Belge tarihi</span>
                  <DateInput type="date" className={fieldCls} value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
                </label>
                {docType === "quote" ? (
                  <label className="block space-y-1.5">
                    <span className={labelCls}>Geçerlilik</span>
                    <DateInput type="date" className={fieldCls} value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
                  </label>
                ) : cfg.payable ? (
                  <label className="block space-y-1.5">
                    <span className={labelCls}>{isOrderDoc ? "Teslim / hatırlatma" : "Vade tarihi"}</span>
                    {showPayment && paid ? (
                      <div className={cn(fieldCls, "flex items-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300")}>Peşin — vade yok</div>
                    ) : (
                      <DateInput
                        className={fieldCls}
                        value={dueDate}
                        title={isOrderDoc ? "Bu tarih geldiğinde bildirim gelir" : undefined}
                        onChange={(e) => {
                          dueTouched.current = true;
                          setDueDate(e.target.value);
                        }}
                      />
                    )}
                  </label>
                ) : (
                  <div />
                )}
              </div>

              {/* Hızlı vade: belge tarihinden itibaren */}
              {cfg.payable && !(showPayment && paid) && docType !== "quote" && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{isOrderDoc ? "Hatırlat:" : "Vade süresi:"}</span>
                  <div className="inline-flex overflow-hidden rounded-lg border border-slate-300 dark:border-slate-600">
                    {[7, 14, 30, 60, 90].map((d, i) => {
                      const target = addDays(issueDate, d);
                      return (
                        <button
                          key={d}
                          type="button"
                          tabIndex={-1}
                          onClick={() => {
                            dueTouched.current = true;
                            setDueDate(target);
                          }}
                          className={cn(
                            "h-8 px-3 text-xs font-semibold transition",
                            i > 0 && "border-l border-slate-300 dark:border-slate-600",
                            dueDate === target ? "bg-brand-500 text-white" : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800",
                          )}
                        >
                          {d} gün
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {showPayment && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <span className={cn(labelCls, "block")}>Ödeme durumu</span>
                    <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-slate-300 dark:border-slate-600">
                      {[
                        { v: true, label: "Peşin" },
                        { v: false, label: "Vadeli (açık)" },
                      ].map((o, i) => (
                        <button
                          key={String(o.v)}
                          type="button"
                          onClick={() => setPaid(o.v)}
                          className={cn(
                            "h-10 text-sm font-semibold transition",
                            i > 0 && "border-l border-slate-300 dark:border-slate-600",
                            paid === o.v ? "bg-brand-500 text-white" : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800",
                          )}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {paid ? (
                    <label className="block space-y-1.5">
                      <span className={labelCls}>{isPurchase ? "Ödenen hesap" : "Tahsil edilen hesap"}</span>
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
                    <div />
                  )}
                </div>
              )}

              {!isPurchase && (
                <div className="space-y-1.5 border-t border-slate-200 dark:border-slate-700 pt-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={ibanOn} onChange={(e) => setIbanOn(e.target.checked)} className="h-4 w-4 accent-brand-600" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Banka IBAN&apos;ını belgeye ekle</span>
                  </label>
                  {ibanOn &&
                    (bankAccounts.length === 0 ? (
                      <p className="text-xs text-slate-600 dark:text-slate-300">IBAN&apos;ı girilmiş banka hesabı yok — Hesaplar&apos;dan banka hesabınıza IBAN ekleyin.</p>
                    ) : (
                      <select className={fieldCls} value={effectiveIbanId} onChange={(e) => setIbanAccountId(e.target.value)}>
                        {bankAccounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.bank_name || a.name} — {a.iban}
                          </option>
                        ))}
                      </select>
                    ))}
                </div>
              )}
            </section>
          </div>

          {/* Kalemler */}
          <div className="space-y-2" ref={linesRoot}>
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
                {docType !== "quote" && (
                  <>
                    <button type="button" className={ghostSmCls} onClick={generateAllBarcodes}>
                      <ScanBarcode size={14} /> Tümüne barkod üret
                    </button>
                    <button type="button" className={ghostSmCls} onClick={() => toast.info("Etiket yazdırma henüz hazır değil.")}>
                      <Printer size={14} /> Etiket yazdır
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className={cn(ghostSmCls, "text-slate-700 dark:text-slate-100")}
                  onClick={() => setLines((ls) => [...ls, { ...emptyLine(), kind: "free" }])}
                >
                  <Plus size={14} /> Serbest Kalem
                </button>
              </div>
            </div>

            {/* Telefon: her kalem bir kart (tablo yana kaymasın) */}
            <div className="md:hidden space-y-3" onKeyDown={onLinesKeyDown}>
              {lines.map((l, idx) => {
                const product = l.product_id ? products.data?.find((p) => p.id === l.product_id) : null;
                const matches = activeLine === l.id && l.kind !== "product" ? searchProducts(products.data ?? [], l.name) : [];
                const lbl = "block text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300 mb-1";
                return (
                  <div key={l.id} className="rounded-xl border border-slate-300 dark:border-slate-700 p-3 space-y-2.5">
                    <div className="flex items-start gap-2">
                      <span className="pt-2.5 text-xs font-bold text-slate-600 dark:text-slate-300">{idx + 1}</span>
                      <div className="relative flex-1 min-w-0">
                        <input
                          className={cn(cellInputCls, "h-10")}
                          placeholder={l.kind === "free" ? "Serbest kalem açıklaması" : "Ürün adı veya barkod"}
                          value={l.name}
                          data-line-name
                          onFocus={(e) => onNameFocus(e, l.id)}
                          onBlur={() => setActiveLine(null)}
                          onKeyDown={(e) => onNameKeyDown(e, l, matches)}
                          onChange={(e) => {
                            setSugIdx(0);
                            patchLine(l.id, {
                              name: e.target.value,
                              ...(l.kind === "product" ? { kind: "new" as const, product_id: null } : {}),
                            });
                          }}
                        />
                        <ProductSuggestions
                          items={matches}
                          inclVat={inclVat}
                          side={side}
                          highlight={sugIdx}
                          anchor={anchor}
                          onPick={(p) => setLines((ls) => ls.map((x) => (x.id === l.id ? lineFromProduct(p, x) : x)))}
                        />
                        <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
                          {l.kind === "product" ? "Katalogdan" : l.kind === "new" ? "Yeni ürün" : "Serbest kalem"}
                          {l.kind !== "free" && ` · Stok: ${product ? formatQty(product.stock_qty) : "yeni"}`}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLine(l.id)}
                        className="h-10 w-10 shrink-0 rounded-lg text-rose-600 dark:text-rose-400 flex items-center justify-center hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        aria-label="Kalemi sil"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="min-w-0">
                        <span className={lbl}>Miktar</span>
                        <NumberInput value={l.quantity} onChange={(v) => patchLine(l.id, { quantity: v > 0 ? v : 0 })} decimals={3} className={cn(cellInputCls, "h-10 text-center")} />
                      </label>
                      <label className="min-w-0">
                        <span className={lbl}>Birim</span>
                        <UnitCombo
                            value={l.unit_id}
                            units={units.data ?? []}
                            onChange={(unitId) => {
                              // Ürünün alternatif birimi (koli vb.) seçilirse çarpanı al, yoksa ana birim
                              const alt = (productUnits.data ?? []).find((u) => u.product_id === l.product_id && u.unit_id === unitId);
                              patchLine(l.id, { unit_id: unitId, unit_factor: alt ? Number(alt.factor) || 1 : 1 });
                            }}
                            className={cn(cellInputCls, "h-10")}
                          />
                      </label>
                      <label className="min-w-0">
                        <span className={lbl}>{priceHeader}</span>
                        <NumberInput value={l.unit_price || null} onChange={(v) => patchLine(l.id, { unit_price: v >= 0 ? v : 0 })} placeholder="Fiyat" className={cn(cellInputCls, "h-10 text-center")} />
                        {hintEl(l)}
                      </label>
                      <label className="min-w-0">
                        <span className={lbl}>KDV %</span>
                        <VatInput value={l.vat_rate} onChange={(v) => patchLine(l.id, { vat_rate: v })} className={cn(cellInputCls, "h-10")} />
                      </label>
                      <div className="min-w-0">
                        <span className={lbl}>İskonto % (10+5)</span>
                        <MultiDiscountInput
                          value={l.discount_rate}
                          discountStr={l.discount_str}
                          unitPrice={l.unit_price}
                          currency={currency}
                          onChange={(rate, str) => patchLine(l.id, { discount_rate: rate, discount_str: str })}
                          className="[&_input]:h-10 [&_input]:text-sm [&_input]:text-center"
                        />
                      </div>
                      {isPurchase && (
                        <label className="min-w-0">
                          <span className={lbl}>Satış fiyatı (raf)</span>
                          <NumberInput
                            value={shelfShown(l) || null}
                            onChange={(v) => setShelfShown(l, v)}
                            placeholder="raf fiyatı"
                            disabled={l.kind === "free"}
                            className={cn(cellInputCls, "h-10 text-center")}
                          />
                        </label>
                      )}
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700 pt-2">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 shrink-0">Tutar</span>
                      <div className="w-40">
                        <NumberInput
                          value={round2(lineAmount(l)) || null}
                          onChange={(v) => setLineAmount(l, v)}
                          className={cn(cellInputCls, "h-10 text-center font-bold")}
                          aria-label="Tutar"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={() => setLines((ls) => [...ls, emptyLine()])}
                className="w-full h-11 rounded-xl border border-dashed border-slate-400 dark:border-slate-600 text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-2"
              >
                <Plus size={16} /> Kalem ekle
              </button>
            </div>

            <div className="hidden md:block rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto" onKeyDown={onLinesKeyDown}>
              <table className="w-full min-w-[1050px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    <th className="px-3 py-3 text-left w-8">#</th>
                    <th className="px-3 py-3 text-left">Ürün</th>
                    <th className="px-2 py-3 text-center w-24">Miktar</th>
                    <th className="px-2 py-3 text-center w-24">Birim</th>
                    <th className="px-2 py-3 text-center w-32 leading-tight">{priceHeader}</th>
                    <th className="px-2 py-3 text-center w-24">KDV %</th>
                    <th className="px-2 py-3 text-center w-32 leading-tight">İskonto % <span className="normal-case font-medium">(ör. 10+5)</span></th>
                    <th className="px-2 py-3 text-center w-32 leading-tight">Tutar</th>
                    {isPurchase && <th className="px-2 py-3 text-center w-32 leading-tight">Satış fiyatı (raf)</th>}
                    <th className="px-2 py-3 w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {lines.map((l, idx) => {
                    const product = l.product_id ? products.data?.find((p) => p.id === l.product_id) : null;
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
                              data-line-name
                              onFocus={(e) => onNameFocus(e, l.id)}
                              onBlur={() => setActiveLine(null)}
                              onKeyDown={(e) => onNameKeyDown(e, l, matches)}
                              onChange={(e) => {
                                setSugIdx(0);
                                patchLine(l.id, {
                                  name: e.target.value,
                                  // Ürün seçildikten sonra ad değişirse yeni ürün sayılır
                                  ...(l.kind === "product" ? { kind: "new" as const, product_id: null } : {}),
                                });
                              }}
                            />
                            <ScanBarcode size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <ProductSuggestions
                              items={matches}
                              inclVat={inclVat}
                              side={side}
                              highlight={sugIdx}
                              anchor={anchor}
                              onPick={(p) => setLines((ls) => ls.map((x) => (x.id === l.id ? lineFromProduct(p, x) : x)))}
                            />
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            {l.kind !== "free" && (
                              <span className="text-[11px] text-slate-600 dark:text-slate-300 tabular-nums">
                                Stok: {product ? formatQty(product.stock_qty) : "yeni"}
                              </span>
                            )}
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
                          <NumberInput
                            value={l.quantity}
                            onChange={(v) => patchLine(l.id, { quantity: v > 0 ? v : 0 })}
                            decimals={3}
                            className={cn(cellInputCls, "h-10 text-center")}
                            aria-label="Miktar"
                          />
                        </td>
                        <td className="px-2 py-2.5">
                          <UnitCombo
                            value={l.unit_id}
                            units={units.data ?? []}
                            onChange={(unitId) => {
                              // Ürünün alternatif birimi (koli vb.) seçilirse çarpanı al, yoksa ana birim
                              const alt = (productUnits.data ?? []).find((u) => u.product_id === l.product_id && u.unit_id === unitId);
                              patchLine(l.id, { unit_id: unitId, unit_factor: alt ? Number(alt.factor) || 1 : 1 });
                            }}
                            className={cn(cellInputCls, "h-10")}
                          />
                        </td>
                        <td className="px-2 py-2.5">
                          <NumberInput
                            value={l.unit_price || null}
                            onChange={(v) => patchLine(l.id, { unit_price: v >= 0 ? v : 0 })}
                            placeholder="Fiyat"
                            className={cn(cellInputCls, "h-10 text-center")}
                            aria-label="Birim fiyat"
                          />
                          {hintEl(l)}
                        </td>
                        <td className="px-2 py-2.5">
                          <VatInput value={l.vat_rate} onChange={(v) => patchLine(l.id, { vat_rate: v })} className={cn(cellInputCls, "h-10 min-w-[4.5rem]")} />
                        </td>
                        <td className="px-2 py-2.5">
                          <MultiDiscountInput
                            value={l.discount_rate}
                            discountStr={l.discount_str}
                            unitPrice={l.unit_price}
                            currency={currency}
                            onChange={(rate, str) => patchLine(l.id, { discount_rate: rate, discount_str: str })}
                            className="[&_input]:h-10 [&_input]:text-sm [&_input]:text-center"
                          />
                        </td>
                        <td className="px-2 py-2.5">
                          <NumberInput
                            value={round2(lineAmount(l)) || null}
                            onChange={(v) => setLineAmount(l, v)}
                            className={cn(cellInputCls, "h-10 text-center font-bold")}
                            aria-label="Tutar"
                          />
                        </td>
                        {isPurchase && (
                          <td className="px-2 py-2.5">
                            <NumberInput
                              value={shelfShown(l) || null}
                              onChange={(v) => setShelfShown(l, v)}
                              placeholder="raf fiyatı"
                              disabled={l.kind === "free"}
                              className={cn(cellInputCls, "h-10 text-center")}
                              aria-label="Raf satış fiyatı"
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

          {/* Toplamlar — sağda */}
          <div className="ml-auto w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Brüt Toplam</span>
              <span className="font-bold tabular-nums">{money(totals.gross)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500 dark:text-slate-400 shrink-0">İndirim</span>
              <div className="flex flex-wrap items-center justify-end gap-2 min-w-0">
                <input
                  ref={discountRef}
                  type="number"
                  min="0"
                  step="0.01"
                  className="h-9 w-20 sm:w-24 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 px-2 text-right text-sm outline-none focus:border-brand-400"
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
                <span className="min-w-[4.5rem] text-right text-rose-500 tabular-nums">−{formatNumber(totals.discount)}</span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500 dark:text-slate-400">Net Toplam</span>
              <span className="font-bold tabular-nums">{money(totals.net)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">KDV</span>
              <span className="font-bold tabular-nums">{money(totals.vat)}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-brand-50 dark:bg-brand-900/30 border border-brand-200 dark:border-brand-800 px-4 py-3">
              <span className="font-extrabold uppercase text-brand-800 dark:text-brand-200">Genel Toplam</span>
              <span className="text-2xl font-extrabold text-brand-700 dark:text-brand-300 tabular-nums">{money(totals.total)}</span>
            </div>
          </div>

          <label className="block space-y-1.5">
            <span className={labelCls}>Açıklama / Not</span>
            <textarea
              rows={2}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 px-3.5 py-2.5 text-sm outline-none focus:border-brand-400 transition"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
        </div>

        {/* Alt çubuk */}
        <div className="flex items-center justify-end gap-3 px-5 sm:px-6 py-4 border-t border-slate-200 dark:border-slate-800">
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
