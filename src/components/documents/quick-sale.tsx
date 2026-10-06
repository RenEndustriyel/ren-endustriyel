"use client";

import * as React from "react";
import { DateInput } from "@/components/ui/date-input";
import Link from "next/link";
import {
  Banknote,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Minus,
  PackagePlus,
  Plus,
  Printer,
  Receipt,
  Search,
  Split,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { newId, useAccounts, useContacts, useProducts, useRows, useRpc, useUnits, type Row } from "@/lib/data";
import { addDays, calcDocument, convertVat } from "@/lib/doc-calc";
import { DOC_TYPES, type DocType } from "@/lib/doc-types";
import { formatMoney, formatQty, isoDate } from "@/lib/format";
import { rateFor, useRates } from "@/lib/rates";
import { useOrg } from "@/providers/org-provider";
import { useConfirm } from "@/components/ui/confirm";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { NumberInput } from "@/components/ui/money-input";
import { ContactPicker } from "@/components/contacts/contact-picker";
import { ScanButton } from "@/components/shared/barcode-scanner";
import { cn } from "@/lib/utils";

type CartLine = {
  key: string;
  product_id: string | null;
  product?: Row<"products">;
  name: string;
  quantity: number;
  /** KDV dahil birim fiyat — elle değiştirilebilir */
  unit_price: number;
  list_price: number;
  vat_rate: number;
  unit: string;
};

type Method = "cash" | "card" | "split" | "credit";

const METHOD_LABEL: Record<Method, string> = {
  cash: "Nakit",
  card: "Kredi Kartı",
  split: "Parçalı",
  credit: "Vadeli",
};

type DoneSale = {
  id: string;
  customer: string;
  total: number;
  method: string;
  change: number;
  lines: { name: string; qty: number; unitPrice: number; total: number }[];
};

type TodayDoc = {
  id: string;
  doc_type: string;
  number: string | null;
  total: number;
  paid_amount: number;
  description: string | null;
  created_at: string;
  contact: { name: string } | null;
};

const ACC_KEY = "ren-hizli-satis-hesap";
const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function QuickSalePage() {
  const { org } = useOrg();
  const confirm = useConfirm();
  const settings = (org?.settings && typeof org.settings === "object" ? org.settings : {}) as Record<string, unknown>;
  const warnNegative = settings.warn_negative_stock !== false;
  const blockNegative = settings.block_negative_stock === true;

  const products = useProducts();
  const units = useUnits();
  const contacts = useContacts();
  const accounts = useAccounts();
  const rates = useRates();
  const saveDoc = useRpc<Row<"documents">>("save_document");
  const saveTxn = useRpc("save_transaction");

  const today = isoDate();
  const todayDocs = useRows<TodayDoc>("documents", {
    select: "id, doc_type, number, total, paid_amount, description, created_at, contact:contacts(name)",
    params: ["hizli_satis_bugun", today],
    filter: (q) =>
      q
        .eq("issue_date", today)
        .in("doc_type", ["pos_sale", "sales_invoice", "sales_return"])
        .not("status", "in", '("draft","cancelled")'),
    order: [{ column: "created_at", ascending: false }],
  });

  const [cart, setCart] = React.useState<CartLine[]>([]);
  const [query, setQuery] = React.useState("");
  const [contactId, setContactId] = React.useState<string | null>(null);
  const [discountType, setDiscountType] = React.useState<"amount" | "rate">("amount");
  const [discountValue, setDiscountValue] = React.useState(0);
  const [received, setReceived] = React.useState(0);
  const [splitOpen, setSplitOpen] = React.useState(false);
  const [creditOpen, setCreditOpen] = React.useState(false);
  const [done, setDone] = React.useState<DoneSale | null>(null);
  const [busy, setBusy] = React.useState(false);
  const searchRef = React.useRef<HTMLInputElement>(null);

  // --- hesaplar (kasa / banka) ---
  const allAccounts = accounts.data ?? [];
  const cashAccounts = allAccounts.filter((a) => a.is_active && a.type === "cash" && a.currency === "TRY");
  const bankAccounts = allAccounts.filter((a) => a.is_active && a.type === "bank" && a.currency === "TRY");
  const [accChoice, setAccChoice] = React.useState<{ cash?: string; card?: string }>({});
  React.useEffect(() => {
    try {
      setAccChoice(JSON.parse(localStorage.getItem(ACC_KEY) || "{}")); // eslint-disable-line react-hooks/set-state-in-effect
    } catch {}
  }, []);
  const cashAccId = cashAccounts.find((a) => a.id === accChoice.cash)?.id ?? cashAccounts[0]?.id ?? "";
  const cardAccId = bankAccounts.find((a) => a.id === accChoice.card)?.id ?? bankAccounts[0]?.id ?? "";
  const chooseAcc = (k: "cash" | "card", id: string) => {
    const next = { ...accChoice, [k]: id };
    setAccChoice(next);
    try {
      localStorage.setItem(ACC_KEY, JSON.stringify(next));
    } catch {}
  };

  const customer = (contacts.data ?? []).find((c) => c.id === contactId);

  // --- hesap ---
  const calc = React.useMemo(
    () =>
      calcDocument(
        { prices_include_vat: true, discount_type: discountType, discount_value: discountValue, exchange_rate: 1 },
        cart.map((l) => ({ quantity: l.quantity, unit_price: l.unit_price, discount_rate: 0, vat_rate: l.vat_rate })),
      ),
    [cart, discountType, discountValue],
  );
  const grossTotal = r2(cart.reduce((s, l) => s + l.quantity * l.unit_price, 0));
  const discountAmount = r2(grossTotal - calc.total);
  const change = received > calc.total ? r2(received - calc.total) : 0;

  /** TOPLAM elle girildiğinde aradaki fark ₺ indirim olarak yazılır; kasaya girilen tutar geçer */
  const setManualTotal = (target: number) => {
    target = r2(target);
    if (target >= grossTotal) {
      setDiscountValue(0);
      if (target > grossTotal) toast.info("Toplam artırılamaz — artırmak için ürün fiyatını değiştirin");
      return;
    }
    const lines = cart.map((l) => ({ quantity: l.quantity, unit_price: l.unit_price, discount_rate: 0, vat_rate: l.vat_rate }));
    const totalFor = (d: number) =>
      calcDocument({ prices_include_vat: true, discount_type: "amount", discount_value: d, exchange_rate: 1 }, lines).total;
    // Satır bazlı KDV kuruş yuvarlamasını telafi et: indirim 4 ondalıkla saklandığı için ince ayar yapılır
    const r4 = (n: number) => Math.round((n + Number.EPSILON) * 10000) / 10000;
    const off = (x: number) => Math.abs(totalFor(x) - target);
    let d = r2(grossTotal - target);
    for (let i = 0; i < 3 && off(d) >= 0.005; i++) d = r4(d + (totalFor(d) - target));
    if (off(d) >= 0.005) {
      let best = d;
      for (let k = 1; k <= 500 && off(best) >= 0.005; k++) {
        for (const c of [r4(d + k / 10000), r4(d - k / 10000)]) if (c >= 0 && off(c) < off(best)) best = c;
      }
      d = best;
    }
    if (off(d) >= 0.005) {
      toast.info(`KDV kuruş yuvarlaması nedeniyle toplam ${formatMoney(totalFor(d))} oldu`, {
        description: "Kasaya belgenin bu toplamı yazılır; belge ile kasa tutarlı kalır.",
      });
    }
    setDiscountType("amount");
    setDiscountValue(Math.max(0, d));
  };

  // Müşteri ekranı (fiyat gör) ile eşitle
  React.useEffect(() => {
    try {
      const last = cart[cart.length - 1];
      localStorage.setItem(
        "ren:pos-display",
        JSON.stringify(
          last
            ? {
                mode: "item",
                sku: last.product?.barcode || "",
                productName: last.name,
                qty: last.quantity,
                unitPriceGross: last.unit_price,
                cartTotal: calc.total,
                cartCount: cart.reduce((s, l) => s + l.quantity, 0),
                updatedAt: Date.now(),
              }
            : { mode: "idle", updatedAt: Date.now() },
        ),
      );
    } catch {}
  }, [cart, calc.total]);

  // --- ürün ---
  const priceOf = React.useCallback(
    (p: Row<"products">) => {
      let raw = Number(p.sale_price || 0);
      if (p.sale_currency && p.sale_currency !== "TRY") raw *= rateFor(rates.data, p.sale_currency) || 1;
      return r2(convertVat(raw, Number(p.vat_rate ?? 20), p.sale_price_includes_vat ?? true, true));
    },
    [rates.data],
  );

  const addProduct = (p: Row<"products">, qty = 1) => {
    setCart((prev) => {
      const i = prev.findIndex((l) => l.product_id === p.id);
      if (i >= 0) return prev.map((l, j) => (j === i ? { ...l, quantity: r2(l.quantity + qty) } : l));
      const price = priceOf(p);
      return [
        ...prev,
        {
          key: newId(),
          product_id: p.id,
          product: p,
          name: p.name,
          quantity: qty,
          unit_price: price,
          list_price: price,
          vat_rate: Number(p.vat_rate ?? 20),
          unit: (units.data ?? []).find((u) => u.id === p.unit_id)?.code || "ad",
        },
      ];
    });
    setQuery("");
    searchRef.current?.focus();
  };

  const addFreeLine = (name: string) => {
    setCart((prev) => [
      ...prev,
      { key: newId(), product_id: null, name, quantity: 1, unit_price: 0, list_price: 0, vat_rate: 20, unit: "ad" },
    ]);
    setQuery("");
    toast.info("Listede olmayan ürün eklendi — fiyatını girin");
  };

  const matches = React.useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr");
    if (q.length < 2) return [];
    return (products.data ?? [])
      .filter(
        (p) =>
          p.is_active !== false &&
          (p.name.toLocaleLowerCase("tr").includes(q) || p.barcode?.toLowerCase().includes(q) || p.code?.toLowerCase().includes(q)),
      )
      .slice(0, 8);
  }, [query, products.data]);

  const submitSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    const raw = query.trim();
    if (!raw) return;
    // "3*8690001" → 3 adet
    const m = raw.match(/^(\d+(?:[.,]\d+)?)[*xX](.+)$/);
    const qty = m ? Number(m[1].replace(",", ".")) || 1 : 1;
    const code = (m ? m[2] : raw).trim().toLowerCase();
    const exact = (products.data ?? []).find(
      (p) => p.barcode?.toLowerCase() === code || p.code?.toLowerCase() === code || p.name.toLowerCase() === code,
    );
    if (exact) return addProduct(exact, qty);
    if (matches.length === 1) return addProduct(matches[0], qty);
    if (matches.length === 0) toast.error(`Ürün bulunamadı: "${raw}"`);
  };

  const updateLine = (key: string, patch: Partial<CartLine>) =>
    setCart((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const removeLine = (key: string) => setCart((prev) => prev.filter((l) => l.key !== key));

  const reset = () => {
    setCart([]);
    setContactId(null);
    setDiscountValue(0);
    setReceived(0);
    setSplitOpen(false);
    setCreditOpen(false);
    searchRef.current?.focus();
  };

  // --- satış kaydı ---
  const checkout = async (method: Method, opts: { cash?: number; card?: number; dueDate?: string } = {}) => {
    if (busy) return;
    if (!cart.length) return toast.error("Sepette ürün yok");
    if (calc.total <= 0) return toast.error("Toplam tutar sıfır — fiyatları kontrol edin");
    if (cart.some((l) => !l.name.trim())) return toast.error("Ürün adı boş olamaz");

    const cashAmt = method === "cash" ? calc.total : method === "split" ? r2(opts.cash ?? 0) : 0;
    const cardAmt = method === "card" ? calc.total : method === "split" ? r2(opts.card ?? 0) : 0;
    const openAmt = r2(calc.total - cashAmt - cardAmt);

    if (openAmt > 0.009 && !contactId) {
      toast.error("Vadeli / açık kalan tutar için müşteri seçin");
      return;
    }
    if (cashAmt > 0 && !cashAccId) return toast.error("Önce bir TL kasa hesabı tanımlayın (Hesaplar)");
    if (cardAmt > 0 && !cardAccId) return toast.error("Kart tahsilatı için bir TL banka hesabı tanımlayın (Hesaplar)");

    if (warnNegative || blockNegative) {
      const neg = cart.filter((l) => l.product?.track_stock && Number(l.product.stock_qty || 0) - l.quantity < 0);
      if (neg.length) {
        if (blockNegative) return toast.error("Eksi stoklu ürün satışı işletme ayarlarında engellenmiş");
        const ok = await confirm({
          title: "Stok yetersiz",
          description: `${neg.map((n) => `${n.name} (stok: ${formatQty(Number(n.product?.stock_qty || 0))})`).join(", ")} — yine de satılsın mı?`,
          confirmText: "Satışı onayla",
        });
        if (!ok) return;
      }
    }

    const docId = newId();
    const label =
      method === "split"
        ? `Parçalı (${[cashAmt > 0 && "Nakit", cardAmt > 0 && "Kart", openAmt > 0.009 && "Vadeli"].filter(Boolean).join(" + ")})`
        : METHOD_LABEL[method];
    // Belgeye bağlı ilk tahsilat save_document ile, ikincisi (parçalıda kart) ayrıca kaydedilir
    const first =
      cashAmt > 0
        ? { account_id: cashAccId, method: "cash", amount: cashAmt }
        : cardAmt > 0
          ? { account_id: cardAccId, method: "credit_card", amount: cardAmt }
          : null;
    const secondCard = cashAmt > 0 && cardAmt > 0;

    setBusy(true);
    try {
      await saveDoc.call({
        p_doc: {
          id: docId,
          org_id: org!.id,
          doc_type: "pos_sale",
          status: "approved",
          issue_date: today,
          due_date: openAmt > 0.009 ? opts.dueDate || addDays(today, customer?.payment_term_days || 30) : today,
          contact_id: contactId,
          currency: "TRY",
          exchange_rate: 1,
          prices_include_vat: true,
          discount_type: discountType,
          discount_value: discountValue,
          description: `POS Satışı · ${label}`,
        },
        p_lines: cart.map((l) => ({
          product_id: l.product_id,
          description: l.name,
          quantity: l.quantity,
          unit_factor: 1,
          unit_price: l.unit_price,
          discount_rate: 0,
          vat_rate: l.vat_rate,
        })),
        p_payment: first ? { id: newId(), ...first } : null,
      });

      if (secondCard) {
        try {
          await saveTxn.call({
            p_txn: {
              id: newId(),
              org_id: org!.id,
              type: "collection",
              direction: "in",
              txn_date: today,
              account_id: cardAccId,
              contact_id: contactId,
              amount: cardAmt,
              currency: "TRY",
              exchange_rate: 1,
              method: "credit_card",
              description: "POS Satışı · Kart",
            },
            p_allocations: [{ document_id: docId, amount: cardAmt }],
          });
        } catch {
          toast.error("Satış kaydedildi ama kart tahsilatı kaydedilemedi", {
            description: `${formatMoney(cardAmt)} satış belgesinde açık görünüyor; Satışlar'dan tahsilat ekleyin.`,
          });
        }
      }

      setDone({
        id: docId,
        customer: customer?.name || "Perakende Müşteri",
        total: calc.total,
        method: label,
        change: method === "cash" ? change : 0,
        lines: cart.map((l) => ({ name: l.name, qty: l.quantity, unitPrice: l.unit_price, total: r2(l.quantity * l.unit_price) })),
      });
      reset();
    } catch {
      // hata mesajını useRpc gösterir; sepet korunur
    } finally {
      setBusy(false);
    }
  };

  // Kısayollar: F1 nakit, F2 kart, F3 parçalı, F4 vadeli
  React.useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (done || splitOpen || creditOpen) return;
      if (e.key === "F1") checkout("cash");
      else if (e.key === "F2") checkout("card");
      else if (e.key === "F3") setSplitOpen(true);
      else if (e.key === "F4") setCreditOpen(true);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });
  React.useEffect(() => searchRef.current?.focus(), []);

  // --- bugünkü satışlar ---
  const daySales = todayDocs.data ?? [];
  const sign = (d: TodayDoc) => (d.doc_type === "sales_return" ? -1 : 1);
  const dayTotal = daySales.reduce((s, d) => s + sign(d) * Number(d.total || 0), 0);
  const dayPaid = daySales.reduce((s, d) => s + sign(d) * Number(d.paid_amount || 0), 0);
  const dayCount = daySales.filter((d) => d.doc_type !== "sales_return").length;

  const accSelect = (k: "cash" | "card", list: typeof cashAccounts, value: string) =>
    list.length > 1 ? (
      <select
        value={value}
        onChange={(e) => chooseAcc(k, e.target.value)}
        className="h-8 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-2 text-xs font-medium max-w-[10rem]"
        aria-label={k === "cash" ? "Nakit kasası" : "Kart hesabı"}
      >
        {list.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>
    ) : (
      <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{list[0]?.name ?? "tanımlı değil"}</span>
    );

  const payButtons: { method: Method; icon: React.ReactNode; hint: string; cls: string }[] = [
    { method: "cash", icon: <Banknote size={20} />, hint: "F1", cls: "bg-emerald-600 hover:bg-emerald-700" },
    { method: "card", icon: <CreditCard size={20} />, hint: "F2", cls: "bg-blue-600 hover:bg-blue-700" },
    { method: "split", icon: <Split size={20} />, hint: "F3", cls: "bg-violet-600 hover:bg-violet-700" },
    { method: "credit", icon: <CalendarClock size={20} />, hint: "F4", cls: "bg-amber-600 hover:bg-amber-700" },
  ];
  const onPay = (m: Method) => {
    if (m === "split") setSplitOpen(true);
    else if (m === "credit") setCreditOpen(true);
    else checkout(m);
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="lg:h-full grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-3 p-3 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] lg:pb-3">
        {/* ------------------------------ SOL: ürün + sepet ------------------------------ */}
        <section className="flex flex-col min-h-0 gap-3">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-xl font-bold">Hızlı Satış</h1>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Bugün: {dayCount} satış · <b className="text-emerald-600 dark:text-emerald-400">{formatMoney(dayTotal)}</b>
            </span>
          </div>

          <form onSubmit={submitSearch} className="relative">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-300" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Escape" && setQuery("")}
                  placeholder="Barkod okutun veya ürün adı yazın (3*barkod = 3 adet)"
                  className="w-full h-12 pl-10 pr-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-base text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  autoComplete="off"
                />
              </div>
              <ScanButton
                onDetected={(code) => {
                  const p = (products.data ?? []).find((x) => x.barcode === code || x.code === code);
                  if (p) addProduct(p);
                  else toast.error(`Barkod bulunamadı: ${code}`);
                }}
                className="h-12"
              />
            </div>
            {query.trim().length >= 2 && (
              <div className="absolute z-20 left-0 right-0 mt-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg overflow-hidden">
                {matches.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addProduct(p)}
                    className="w-full px-4 py-2.5 text-left flex items-center justify-between gap-3 hover:bg-brand-50 dark:hover:bg-slate-800"
                  >
                    <span className="min-w-0">
                      <span className="block font-medium truncate">{p.name}</span>
                      <span className="block text-xs text-slate-600 dark:text-slate-300">
                        {p.barcode || p.code || "barkod yok"} · Stok: {formatQty(Number(p.stock_qty ?? 0))}
                      </span>
                    </span>
                    <span className="font-bold text-brand-600 dark:text-brand-400 shrink-0">{formatMoney(priceOf(p))}</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => addFreeLine(query.trim())}
                  className="w-full px-4 py-2.5 text-left flex items-center gap-2 text-sm font-semibold text-brand-700 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-slate-800 border-t border-slate-100 dark:border-slate-800"
                >
                  <PackagePlus size={16} />
                  &quot;{query.trim()}&quot; listede yok — elle fiyatla ekle
                </button>
              </div>
            )}
          </form>

          <div className="card p-0 flex-1 min-h-[16rem] flex flex-col overflow-hidden">
            <div className="hidden sm:grid grid-cols-[minmax(0,1fr)_8.5rem_8.5rem_7rem_2.5rem] gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
              <span>Ürün</span>
              <span className="text-center">Miktar</span>
              <span className="text-right">Birim fiyat</span>
              <span className="text-right">Tutar</span>
              <span />
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {cart.length === 0 ? (
                <div className="h-full min-h-[12rem] flex flex-col items-center justify-center gap-2 text-slate-600 dark:text-slate-300">
                  <Receipt size={32} />
                  <p className="text-sm font-medium">Sepet boş — barkod okutun veya ürün arayın</p>
                </div>
              ) : (
                cart.map((l) => (
                  <div
                    key={l.key}
                    className="grid grid-cols-2 sm:grid-cols-[minmax(0,1fr)_8.5rem_8.5rem_7rem_2.5rem] gap-2 items-center px-4 py-2.5"
                  >
                    <div className="col-span-2 sm:col-span-1 min-w-0">
                      {l.product_id ? (
                        <div className="font-semibold truncate">{l.name}</div>
                      ) : (
                        <input
                          value={l.name}
                          onChange={(e) => updateLine(l.key, { name: e.target.value })}
                          className="w-full h-8 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 text-sm font-semibold"
                          aria-label="Ürün adı"
                        />
                      )}
                      <div className="text-xs text-slate-600 dark:text-slate-300">
                        KDV %{l.vat_rate}
                        {l.product && ` · Stok: ${formatQty(Number(l.product.stock_qty ?? 0))} ${l.unit}`}
                        {l.unit_price !== l.list_price && l.product_id && (
                          <span className="text-amber-700 dark:text-amber-300 font-semibold"> · fiyat değiştirildi (liste {formatMoney(l.list_price)})</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => (l.quantity <= 1 ? removeLine(l.key) : updateLine(l.key, { quantity: r2(l.quantity - 1) }))}
                        className="h-8 w-8 rounded-lg border border-slate-300 dark:border-slate-600 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800"
                        aria-label="Azalt"
                      >
                        <Minus size={14} />
                      </button>
                      <NumberInput
                        value={l.quantity}
                        onChange={(v) => updateLine(l.key, { quantity: v > 0 ? v : 1 })}
                        decimals={3}
                        className="h-8 w-14 text-center px-1 font-semibold"
                        aria-label="Miktar"
                      />
                      <button
                        type="button"
                        onClick={() => updateLine(l.key, { quantity: r2(l.quantity + 1) })}
                        className="h-8 w-8 rounded-lg border border-slate-300 dark:border-slate-600 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800"
                        aria-label="Artır"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <NumberInput
                      value={l.unit_price}
                      onChange={(v) => updateLine(l.key, { unit_price: v >= 0 ? v : 0 })}
                      suffix="₺"
                      className="h-8 text-right font-semibold"
                      aria-label="Birim fiyat (KDV dahil)"
                    />
                    <div className="text-right font-bold tabular-nums">{formatMoney(r2(l.quantity * l.unit_price))}</div>
                    <button
                      type="button"
                      onClick={() => removeLine(l.key)}
                      className="h-8 w-8 justify-self-end rounded-lg text-rose-600 dark:text-rose-400 flex items-center justify-center hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      aria-label="Sil"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* ------------------------------ SAĞ: ödeme + günlük ------------------------------ */}
        <aside className="flex flex-col min-h-0 gap-3">
          <div className="card p-4 space-y-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300 mb-1">Müşteri</div>
              <ContactPicker value={contactId} onChange={(id) => setContactId(id)} kind="customer" placeholder="Perakende müşteri" clearable />
            </div>

            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-700 dark:text-slate-200">Ara toplam ({cart.length} kalem)</span>
                <span className="font-semibold tabular-nums">{formatMoney(grossTotal)}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-700 dark:text-slate-200 shrink-0">İndirim</span>
                <div className="inline-flex rounded-lg border border-slate-300 dark:border-slate-600 overflow-hidden text-xs font-bold shrink-0">
                  {(
                    [
                      ["amount", "₺ Nakit"],
                      ["rate", "% İskonto"],
                    ] as const
                  ).map(([t, label]) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setDiscountType(t)}
                      className={cn(
                        "px-2.5 py-1.5",
                        discountType === t ? "bg-brand-500 text-white" : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="flex-1 min-w-0">
                  <NumberInput
                    value={discountValue}
                    onChange={(v) => setDiscountValue(Math.max(0, discountType === "rate" ? Math.min(v, 100) : v))}
                    suffix={discountType === "rate" ? "%" : "₺"}
                    className="h-8 text-right"
                    aria-label="İndirim"
                  />
                </div>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-rose-600 dark:text-rose-400 font-semibold">
                  <span>İndirim tutarı</span>
                  <span className="tabular-nums">−{formatMoney(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-700 dark:text-slate-200">
                <span>KDV (dahil)</span>
                <span className="tabular-nums">{formatMoney(calc.vat_total)}</span>
              </div>
            </div>

            <div className="rounded-xl bg-brand-50 dark:bg-brand-900/30 border border-brand-200 dark:border-brand-800 px-4 py-3 flex items-center justify-between gap-3">
              <span className="font-bold text-brand-800 dark:text-brand-200">
                TOPLAM
                <span className="block text-[11px] font-medium text-brand-700 dark:text-brand-300">elle değiştirilebilir</span>
              </span>
              <div className="w-44">
                <NumberInput
                  value={calc.total}
                  onChange={setManualTotal}
                  suffix="₺"
                  disabled={cart.length === 0}
                  title="Toplamı elle değiştirebilirsiniz — fark indirim olarak yazılır"
                  aria-label="Toplam (elle değiştirilebilir)"
                  className="h-11 text-right text-2xl font-extrabold tabular-nums text-brand-700 dark:text-brand-300 bg-white dark:bg-slate-900 border-brand-300 dark:border-brand-700"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-700 dark:text-slate-200 shrink-0">Alınan nakit</span>
              <div className="flex-1">
                <NumberInput value={received || null} onChange={setReceived} suffix="₺" className="h-9 text-right" aria-label="Alınan nakit" />
              </div>
              <span className={cn("shrink-0 font-bold tabular-nums", change > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-700 dark:text-slate-200")}>
                Üstü {formatMoney(change)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {payButtons.map((b) => (
                <button
                  key={b.method}
                  type="button"
                  onClick={() => onPay(b.method)}
                  disabled={busy || cart.length === 0}
                  className={cn(
                    "h-16 rounded-xl font-bold text-white flex flex-col items-center justify-center gap-0.5 shadow-sm transition active:scale-[.98] disabled:opacity-50 disabled:cursor-not-allowed",
                    b.cls,
                  )}
                >
                  <span className="flex items-center gap-2 text-base">
                    {b.icon}
                    {METHOD_LABEL[b.method]}
                  </span>
                  <span className="text-[11px] font-semibold text-white/90">{b.hint}</span>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-[auto_1fr] items-center gap-x-2 gap-y-1 text-xs">
              <span className="text-slate-600 dark:text-slate-300">Nakit kasası:</span>
              {accSelect("cash", cashAccounts, cashAccId)}
              <span className="text-slate-600 dark:text-slate-300">Kart hesabı:</span>
              {accSelect("card", bankAccounts, cardAccId)}
            </div>

            {cart.length > 0 && (
              <button
                type="button"
                onClick={async () => {
                  if (await confirm({ title: "Sepet temizlensin mi?", confirmText: "Temizle" })) reset();
                }}
                className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-600 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5"
              >
                <X size={15} /> Sepeti temizle
              </button>
            )}
          </div>

          {/* Bugünkü satışlar */}
          <div className="card p-0 flex flex-col min-h-[14rem] lg:flex-1 lg:min-h-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <h2 className="font-bold">Bugünkü Satışlar</h2>
                <Link href={`/satislar?baslangic=${today}&bitis=${today}`} className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline">
                  Tümü →
                </Link>
              </div>
              <div className="mt-1.5 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <div className="text-slate-600 dark:text-slate-300">Toplam ({dayCount})</div>
                  <div className="font-bold tabular-nums">{formatMoney(dayTotal)}</div>
                </div>
                <div>
                  <div className="text-slate-600 dark:text-slate-300">Tahsil edilen</div>
                  <div className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{formatMoney(dayPaid)}</div>
                </div>
                <div>
                  <div className="text-slate-600 dark:text-slate-300">Vadeli / açık</div>
                  <div className="font-bold tabular-nums text-amber-700 dark:text-amber-300">{formatMoney(r2(dayTotal - dayPaid))}</div>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {daySales.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-600 dark:text-slate-300">Bugün henüz satış yok.</p>
              ) : (
                daySales.map((d) => {
                  const cfg = DOC_TYPES[d.doc_type as DocType];
                  const method = d.description?.includes(" · ") ? d.description.split(" · ").slice(1).join(" · ") : cfg?.label;
                  const isReturn = d.doc_type === "sales_return";
                  return (
                    <Link
                      key={d.id}
                      href={cfg ? `${cfg.base}/detay?id=${d.id}` : "/satislar"}
                      className="flex items-center justify-between gap-2 px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{d.contact?.name || "Perakende Müşteri"}</div>
                        <div className="text-xs text-slate-600 dark:text-slate-300 truncate">
                          {new Date(d.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                          {d.number ? ` · ${d.number}` : ""} · {isReturn ? "İade" : method}
                        </div>
                      </div>
                      <span className={cn("text-sm font-bold tabular-nums shrink-0", isReturn ? "text-rose-600 dark:text-rose-400" : "")}>
                        {isReturn ? "−" : ""}
                        {formatMoney(Number(d.total || 0))}
                      </span>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </aside>
      </div>

      <SplitDialog
        open={splitOpen}
        onOpenChange={setSplitOpen}
        total={calc.total}
        hasCustomer={!!contactId}
        busy={busy}
        onConfirm={(cash, card) => checkout("split", { cash, card })}
      />
      <CreditDialog
        open={creditOpen}
        onOpenChange={setCreditOpen}
        total={calc.total}
        customerName={customer?.name}
        defaultDue={addDays(today, customer?.payment_term_days || 30)}
        busy={busy}
        customerPicker={<ContactPicker value={contactId} onChange={(id) => setContactId(id)} kind="customer" placeholder="Müşteri seçin" />}
        onConfirm={(due) => checkout("credit", { dueDate: due })}
      />
      <DoneDialog sale={done} onClose={() => setDone(null)} orgName={org?.legal_name || org?.name || ""} />
    </div>
  );
}

function SplitDialog({
  open,
  onOpenChange,
  total,
  hasCustomer,
  busy,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  total: number;
  hasCustomer: boolean;
  busy: boolean;
  onConfirm: (cash: number, card: number) => void;
}) {
  const [cash, setCash] = React.useState(0);
  const [card, setCard] = React.useState(0);
  React.useEffect(() => {
    if (open) {
      setCash(0); // eslint-disable-line react-hooks/set-state-in-effect
      setCard(total);
    }
  }, [open, total]);
  const rest = r2(total - cash - card);
  const over = rest < -0.009;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Parçalı ödeme" description={`Toplam ${formatMoney(total)} — nakit ve kart olarak bölün; kalan vadeli yazılır.`} className="max-w-sm">
        <div className="space-y-3">
          <label className="block">
            <span className="text-sm font-semibold">Nakit</span>
            <NumberInput
              value={cash}
              onChange={(v) => {
                const c = Math.max(0, Math.min(v, total));
                setCash(c);
                setCard(r2(Math.max(0, total - c)));
              }}
              suffix="₺"
              className="h-11 text-right text-lg font-bold"
              autoFocus
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Kredi kartı</span>
            <NumberInput value={card} onChange={(v) => setCard(Math.max(0, v))} suffix="₺" className="h-11 text-right text-lg font-bold" />
          </label>
          <div
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-semibold flex justify-between",
              over
                ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300"
                : rest > 0
                  ? "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200"
                  : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300",
            )}
          >
            <span>{over ? "Fazla girildi" : rest > 0 ? "Vadeli (açık) kalan" : "Tamamı ödendi"}</span>
            <span className="tabular-nums">{formatMoney(Math.abs(rest))}</span>
          </div>
          {rest > 0.009 && !hasCustomer && (
            <p className="text-sm text-amber-800 dark:text-amber-200">Açık kalan tutar için önce sağdan müşteri seçin.</p>
          )}
          <button
            type="button"
            disabled={busy || over || cash + card <= 0 || (rest > 0.009 && !hasCustomer)}
            onClick={() => onConfirm(cash, card)}
            className="btn-primary w-full h-11 justify-center text-base disabled:opacity-50"
          >
            Satışı tamamla
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreditDialog({
  open,
  onOpenChange,
  total,
  customerName,
  defaultDue,
  busy,
  customerPicker,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  total: number;
  customerName?: string;
  defaultDue: string;
  busy: boolean;
  customerPicker: React.ReactNode;
  onConfirm: (due: string) => void;
}) {
  const [due, setDue] = React.useState(defaultDue);
  React.useEffect(() => {
    if (open) setDue(defaultDue); // eslint-disable-line react-hooks/set-state-in-effect
  }, [open, defaultDue]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Vadeli satış" description={`${formatMoney(total)} müşterinin hesabına borç yazılır.`} className="max-w-sm">
        <div className="space-y-3">
          <div>
            <span className="text-sm font-semibold">Müşteri</span>
            {customerPicker}
          </div>
          <label className="block">
            <span className="text-sm font-semibold">Vade tarihi</span>
            <DateInput
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              className="w-full h-11 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3"
            />
          </label>
          <button
            type="button"
            disabled={busy || !customerName || !due}
            onClick={() => onConfirm(due)}
            className="btn-primary w-full h-11 justify-center text-base disabled:opacity-50"
          >
            {customerName ? `${customerName} hesabına yaz` : "Önce müşteri seçin"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DoneDialog({ sale, onClose, orgName }: { sale: DoneSale | null; onClose: () => void; orgName: string }) {
  return (
    <Dialog open={!!sale} onOpenChange={(o) => !o && onClose()}>
      <DialogContent title="Satış tamamlandı" className="max-w-sm">
        {sale && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-1 py-2">
              <CheckCircle2 size={44} className="text-emerald-500" />
              <div className="text-3xl font-extrabold tabular-nums">{formatMoney(sale.total)}</div>
              <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {sale.customer} · {sale.method}
              </div>
              {sale.change > 0 && (
                <div className="mt-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 text-emerald-700 dark:text-emerald-300 font-bold">
                  Para üstü: {formatMoney(sale.change)}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => printReceipt(sale, orgName)}
                className="h-11 rounded-lg border border-slate-300 dark:border-slate-600 font-semibold flex items-center justify-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Printer size={17} /> Fiş yazdır
              </button>
              <button type="button" onClick={onClose} className="btn-primary h-11 justify-center" autoFocus>
                Yeni satış
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** 80 mm termal bilgi fişi — yalnızca fişi yazdırmak için gizli iframe kullanır */
function printReceipt(sale: DoneSale, orgName: string) {
  const frame = document.createElement("iframe");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc) return;
  doc.open();
  doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Fiş</title><style>
    @page{size:80mm auto;margin:2mm 3mm}*{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Courier New',monospace;font-size:12px;color:#000;background:#fff;width:74mm;margin:0 auto;padding:3mm 1mm;line-height:1.35}
    .c{text-align:center}.b{font-weight:bold}.hr{border-top:1px dashed #000;margin:5px 0}.r{display:flex;justify-content:space-between}
    .t{font-size:15px;font-weight:900}
  </style></head><body>
    <div class="c t">${esc(orgName || "Fiş")}</div><div class="c">BİLGİ FİŞİ</div><div class="hr"></div>
    <div class="r"><span>Tarih</span><span>${new Date().toLocaleString("tr-TR")}</span></div>
    <div class="r"><span>Müşteri</span><span class="b">${esc(sale.customer)}</span></div><div class="hr"></div>
    ${sale.lines
      .map(
        (l) =>
          `<div class="b">${esc(l.name)}</div><div class="r"><span>${formatQty(l.qty)} x ${formatMoney(l.unitPrice)}</span><span class="b">${formatMoney(l.total)}</span></div>`,
      )
      .join("")}
    <div class="hr"></div><div class="r t"><span>TOPLAM</span><span>${formatMoney(sale.total)}</span></div>
    <div class="r"><span>Ödeme</span><span class="b">${esc(sale.method)}</span></div>
    ${sale.change > 0 ? `<div class="r"><span>Para üstü</span><span>${formatMoney(sale.change)}</span></div>` : ""}
    <div class="hr"></div><div class="c">Mali değeri yoktur · Teşekkür ederiz</div>
  </body></html>`);
  doc.close();
  setTimeout(() => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 3000);
  }, 250);
}
