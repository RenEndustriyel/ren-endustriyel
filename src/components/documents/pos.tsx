"use client";

import * as React from "react";
import Link from "next/link";
import { Minus, Plus, Trash2, ShoppingCart, Banknote, CreditCard, Landmark, BookUser, CheckCircle2, Printer, History, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { newId, useAccounts, useCategories, useContacts, useProducts, useRpc, useUnits, type Row } from "@/lib/data";
import { addDays, calcDocument, convertVat } from "@/lib/doc-calc";
import { formatDate, formatMoney, formatQty, isoDate } from "@/lib/format";
import { rateFor, useRates } from "@/lib/rates";
import { useOrg } from "@/providers/org-provider";
import { useConfirm } from "@/components/ui/confirm";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/money-input";
import { SearchInput, matches } from "@/components/ui/search-input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScanButton } from "@/components/shared/barcode-scanner";
import { ContactPicker } from "@/components/contacts/contact-picker";
import { useLocalStorage } from "@/lib/use-local-storage";
import { cn } from "@/lib/utils";

type CartLine = { key: string; product: Row<"products">; quantity: number; unit_price: number; discount_rate: number; vat_rate: number };
type Method = "cash" | "credit_card" | "bank_transfer" | "credit";

const VAT_OPTIONS = [0, 1, 10, 20] as const;

const METHODS: { value: Method; label: string; icon: React.ElementType }[] = [
  { value: "cash", label: "Nakit", icon: Banknote },
  { value: "credit_card", label: "Kart", icon: CreditCard },
  { value: "bank_transfer", label: "Havale", icon: Landmark },
  { value: "credit", label: "Veresiye", icon: BookUser },
];

export function PosPage() {
  const { org, canWrite } = useOrg();
  const confirm = useConfirm();
  const orgSettings = (org?.settings && typeof org.settings === "object" ? org.settings : {}) as Record<string, any>;
  const warnNegativeStock = orgSettings.warn_negative_stock !== false;
  const blockNegativeStock = orgSettings.block_negative_stock === true;
  const products = useProducts();
  const units = useUnits();
  const cats = useCategories("product");
  const contacts = useContacts();
  const accounts = useAccounts();
  const rates = useRates();
  const save = useRpc<Row<"documents">>("save_document");
  const [q, setQ] = React.useState("");
  const [cat, setCat] = React.useState("");
  const [cart, setCart] = React.useState<CartLine[]>([]);
  const [manualVatRate, setManualVatRate] = React.useState<number | null>(null);
  const [contactId, setContactId] = React.useState<string | null>(null);
  const [dueDate, setDueDate] = React.useState<string>(isoDate());
  const [method, setMethod] = React.useState<Method>("cash");
  const [storedAcc, setStoredAcc] = useLocalStorage("ren-pos-accounts");
  const accMap: Record<string, string> = React.useMemo(() => {
    try {
      return JSON.parse(storedAcc ?? "{}");
    } catch {
      return {};
    }
  }, [storedAcc]);
  const [received, setReceived] = React.useState(0);
  const [cartOpen, setCartOpen] = React.useState(false);
  const [done, setDone] = React.useState<{
    id: string;
    total: number;
    change: number;
    isCredit?: boolean;
    dueDate?: string;
    customerName?: string;
  } | null>(null);

  const handleContactChange = (id: string | null) => {
    setContactId(id);
    const c = (contacts.data ?? []).find((x) => x.id === id);
    if (c?.payment_term_days) {
      setDueDate(addDays(isoDate(), c.payment_term_days));
    }
  };

  const active = (accounts.data ?? []).filter((a) => a.is_active && a.currency === "TRY");
  const defaultAcc = (m: Method) =>
    accMap[m] ?? (m === "cash" ? active.find((a) => a.type === "cash")?.id : active.find((a) => a.type === "bank")?.id) ?? active[0]?.id ?? "";
  const accountId = method === "credit" ? "" : defaultAcc(method);

  const priceIncl = React.useCallback(
    (p: Row<"products">) => {
      let price = Number(p.sale_price);
      if (p.sale_currency !== "TRY") price *= rateFor(rates.data, p.sale_currency) || 1;
      return Math.round(convertVat(price, Number(p.vat_rate), p.sale_price_includes_vat, true) * 100) / 100;
    },
    [rates.data],
  );

  const add = (p: Row<"products">) => {
    setCart((c) => {
      const i = c.findIndex((l) => l.product.id === p.id);
      if (i >= 0) return c.map((l, j) => (j === i ? { ...l, quantity: l.quantity + 1 } : l));
      const initialVat = manualVatRate !== null ? manualVatRate : Number(p.vat_rate ?? 20);
      return [...c, { key: newId(), product: p, quantity: 1, unit_price: priceIncl(p), discount_rate: 0, vat_rate: initialVat }];
    });
  };
  const byBarcode = (code: string) => {
    const p = products.data?.find((x) => x.barcode === code || x.code === code);
    if (p) add(p);
    else toast.error(`Barkod bulunamadı: ${code}`);
  };

  const applyVatToAll = (rate: number) => {
    setManualVatRate(rate);
    setCart((c) => c.map((l) => ({ ...l, vat_rate: rate })));
  };

  const resetVatToProducts = () => {
    setManualVatRate(null);
    setCart((c) => c.map((l) => ({ ...l, vat_rate: Number(l.product.vat_rate ?? 20) })));
  };

  const calc = calcDocument(
    { prices_include_vat: true, discount_type: "rate", discount_value: 0, exchange_rate: 1 },
    cart.map((l) => ({ quantity: l.quantity, unit_price: l.unit_price, discount_rate: l.discount_rate, vat_rate: Number(l.vat_rate) })),
  );
  const change = method === "cash" && received > calc.total ? received - calc.total : 0;

  const list = (products.data ?? []).filter((p) => p.is_active && (!cat || p.category_id === cat) && matches(`${p.name} ${p.code ?? ""} ${p.barcode ?? ""}`, q));

  const complete = async () => {
    if (!cart.length) return;
    if (method === "credit" && !contactId) return toast.error("Veresiye satış için müşteri seçin");
    if (method !== "credit" && !accountId) return toast.error("Önce Kasa ve Bankalar sayfasından hesap ekleyin");

    // Eksi stok kontrolü
    if (warnNegativeStock || blockNegativeStock) {
      const negativeLines: { name: string; current: number; requested: number; remaining: number }[] = [];

      for (const l of cart) {
        if (!l.product || !l.product.track_stock || l.product.type !== "product") continue;
        const req = l.quantity || 0;
        const cur = Number(l.product.stock_qty || 0);
        if (cur - req < 0) {
          negativeLines.push({
            name: l.product.name,
            current: cur,
            requested: req,
            remaining: cur - req,
          });
        }
      }

      if (negativeLines.length > 0) {
        const listText = negativeLines
          .map((item) => `• ${item.name} (Mevcut: ${formatQty(item.current)}, Satış: ${formatQty(item.requested)}, Kalan: ${formatQty(item.remaining)})`)
          .join("\n");

        if (blockNegativeStock) {
          toast.error(`Eksi stok satışı engellenmiştir!\n${listText}`);
          return;
        }

        if (warnNegativeStock) {
          const ok = await confirm({
            title: "⚠️ Eksi Stok Uyarısı",
            description: `Sepetteki bazı ürünlerin miktarı depodaki mevcut stok miktarından fazladır ve stok eksiye düşecektir:\n\n${listText}\n\nYine de satışı tamamlamak istiyor musunuz?`,
            confirmText: "Evet, Eksi Stokla Sat",
          });
          if (!ok) return;
        }
      }
    }

    const id = newId();
    const contactObj = (contacts.data ?? []).find((c) => c.id === contactId);
    const finalDueDate = method === "credit" ? (dueDate || isoDate()) : isoDate();
    await save.call(
      {
        p_doc: {
          id,
          org_id: org!.id,
          doc_type: "pos_sale",
          status: "approved",
          issue_date: isoDate(),
          due_date: finalDueDate,
          contact_id: contactId,
          currency: "TRY",
          exchange_rate: 1,
          prices_include_vat: true,
          discount_type: "rate",
          discount_value: 0,
        },
        p_lines: cart.map((l) => ({
          product_id: l.product.id,
          description: l.product.name,
          quantity: l.quantity,
          unit_id: l.product.unit_id,
          unit_factor: 1,
          unit_price: l.unit_price,
          discount_rate: l.discount_rate,
          vat_rate: Number(l.vat_rate),
        })),
        p_payment: method === "credit" ? null : { id: newId(), account_id: accountId, method },
      },
    );
    setDone({
      id,
      total: calc.total,
      change,
      isCredit: method === "credit",
      dueDate: finalDueDate,
      customerName: contactObj?.name || "",
    });
    setCart([]);
    setManualVatRate(null);
    setReceived(0);
    setContactId(null);
    setDueDate(isoDate());
    setCartOpen(false);
  };

  const cartPanel = (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-3">
        <ContactPicker value={contactId} onChange={handleContactChange} kind="customer" placeholder="Perakende müşteri" clearable />
      </div>
      <div className="thin-scroll flex-1 overflow-y-auto">
        {!cart.length && (
          <div className="flex flex-col items-center gap-2 p-10 text-center text-sm text-muted">
            <ShoppingCart className="size-8" />
            Sepet boş. Ürüne dokunun veya barkod okutun.
          </div>
        )}
        <ul className="divide-y divide-border">
          {cart.map((l, i) => (
            <li key={l.key} className="flex flex-col gap-2 px-3 py-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-medium">{l.product.name}</span>
                  {warnNegativeStock && l.product.track_stock && l.product.type === "product" && (Number(l.product.stock_qty || 0) - l.quantity) < 0 && (
                    <span className="inline-flex items-center gap-0.5 rounded bg-danger-soft px-1.5 py-0.5 text-[10px] font-bold text-danger animate-pulse">
                      <AlertTriangle className="size-3" /> Yetersiz ({formatQty(l.product.stock_qty)})
                    </span>
                  )}
                </div>
                <button onClick={() => setCart(cart.filter((_, j) => j !== i))} className="p-1 text-muted hover:text-danger" aria-label="Kaldır">
                  <Trash2 className="size-4" />
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex items-center rounded-lg border border-border">
                  <button className="p-2" onClick={() => setCart(cart.map((x, j) => (j === i ? { ...x, quantity: Math.max(1, x.quantity - 1) } : x)))} aria-label="Azalt">
                    <Minus className="size-3.5" />
                  </button>
                  <span className="num w-9 text-center text-sm font-semibold">{formatQty(l.quantity)}</span>
                  <button className="p-2" onClick={() => setCart(cart.map((x, j) => (j === i ? { ...x, quantity: x.quantity + 1 } : x)))} aria-label="Artır">
                    <Plus className="size-3.5" />
                  </button>
                </div>
                <NumberInput className="h-9 min-w-0 flex-1" value={l.unit_price} onChange={(n) => setCart(cart.map((x, j) => (j === i ? { ...x, unit_price: n } : x)))} aria-label="Birim fiyat" />
                <select
                  value={l.vat_rate}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setCart((c) => c.map((x, j) => (j === i ? { ...x, vat_rate: v } : x)));
                  }}
                  className="h-9 shrink-0 rounded-lg border border-border bg-surface px-1 text-xs font-semibold text-text hover:border-primary focus:border-primary focus:outline-none cursor-pointer"
                  aria-label="KDV Oranı"
                  title="KDV Oranı"
                >
                  {VAT_OPTIONS.map((rate) => (
                    <option key={rate} value={rate}>
                      %{rate}
                    </option>
                  ))}
                  {!VAT_OPTIONS.includes(l.vat_rate as (typeof VAT_OPTIONS)[number]) && (
                    <option value={l.vat_rate}>%{l.vat_rate}</option>
                  )}
                </select>
                <span className="num w-20 shrink-0 text-right text-sm font-semibold">{formatMoney(calc.lines[i]?.total_amount)}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="border-t border-border p-3">
        {/* Manuel KDV Seçimi */}
        <div className="mb-2.5 rounded-lg border border-border/70 bg-surface-2/60 p-2">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-semibold text-text">KDV Oranı (Toplam):</span>
            {manualVatRate !== null && (
              <button
                type="button"
                onClick={resetVatToProducts}
                className="text-[11px] font-medium text-primary hover:underline"
              >
                Ürün KDV'lerine Dön
              </button>
            )}
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {VAT_OPTIONS.map((rate) => {
              const isSelected =
                manualVatRate === rate ||
                (manualVatRate === null && cart.length > 0 && cart.every((l) => l.vat_rate === rate));
              return (
                <button
                  key={rate}
                  type="button"
                  onClick={() => (manualVatRate === rate ? resetVatToProducts() : applyVatToAll(rate))}
                  className={cn(
                    "flex items-center justify-center rounded-md py-1.5 text-xs font-semibold transition-all",
                    isSelected
                      ? "border border-primary bg-primary text-white shadow-sm font-bold"
                      : "border border-border bg-surface text-muted hover:border-primary/60 hover:text-text",
                  )}
                  title={`Tüm sepete %${rate} KDV uygula`}
                >
                  %{rate}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-1 flex justify-between text-xs text-muted">
          <span>KDV Hariç Tutar</span>
          <span className="num">{formatMoney(calc.net_total)}</span>
        </div>
        <div className="mb-1 flex justify-between text-sm text-muted">
          <span>KDV Toplamı</span>
          <span className="num font-semibold text-text">{formatMoney(calc.vat_total)}</span>
        </div>
        <div className="mb-3 flex justify-between text-xl font-bold">
          <span>Toplam</span>
          <span className="num text-primary">{formatMoney(calc.total)}</span>
        </div>
        <div className="mb-3 grid grid-cols-4 gap-1.5">
          {METHODS.map((m) => (
            <button
              key={m.value}
              onClick={() => setMethod(m.value)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-xs font-medium",
                method === m.value ? "border-primary bg-primary-soft text-primary" : "border-border text-muted",
              )}
            >
              <m.icon className="size-4" />
              {m.label}
            </button>
          ))}
        </div>
        {method !== "credit" && (
          <NativeSelect
            className="mb-2 h-9"
            value={accountId}
            onChange={(e) => setStoredAcc(JSON.stringify({ ...accMap, [method]: e.target.value }))}
            aria-label="Hesap"
          >
            {active.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </NativeSelect>
        )}
        {method === "credit" && (
          <div className="mb-2.5 rounded-lg border border-amber-300 dark:border-amber-700/60 bg-amber-50/60 dark:bg-amber-950/20 p-2 text-xs">
            <div className="mb-1.5 flex items-center justify-between font-semibold text-amber-800 dark:text-amber-300">
              <span>Vade Tarihi:</span>
              <span className="font-mono text-[11px] font-bold text-amber-700 dark:text-amber-400">
                {dueDate ? formatDate(dueDate) : "Peşin"}
              </span>
            </div>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mb-1.5 h-8 w-full rounded border border-border bg-surface px-2 text-xs font-medium text-text focus:border-primary focus:outline-none"
            />
            <div className="flex flex-wrap gap-1">
              {[
                { label: "Bugün", days: 0 },
                { label: "7 Gün", days: 7 },
                { label: "15 Gün", days: 15 },
                { label: "30 Gün", days: 30 },
                { label: "45 Gün", days: 45 },
                { label: "60 Gün", days: 60 },
              ].map((btn) => {
                const targetD = addDays(isoDate(), btn.days);
                const isSelected = dueDate === targetD;
                return (
                  <button
                    key={btn.days}
                    type="button"
                    onClick={() => setDueDate(targetD)}
                    className={cn(
                      "rounded px-2 py-0.5 text-[10px] font-medium transition",
                      isSelected
                        ? "bg-amber-600 text-white font-bold"
                        : "bg-surface text-muted border border-border hover:bg-surface-2 hover:text-text",
                    )}
                  >
                    {btn.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {method === "cash" && (
          <div className="mb-2 flex items-center gap-2 text-sm">
            <span className="shrink-0 text-muted">Alınan</span>
            <NumberInput className="h-9" value={received} onChange={setReceived} />
            <span className="num shrink-0 text-muted">Üstü: <b className="text-text">{formatMoney(change)}</b></span>
          </div>
        )}
        <Button size="lg" className="w-full" disabled={!cart.length || !canWrite} loading={save.isPending} onClick={complete}>
          <CheckCircle2 /> Satışı tamamla
        </Button>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="flex-1 text-lg font-semibold sm:text-xl">Hızlı Satış</h2>
        <Button asChild variant="ghost" size="sm">
          <Link href="/satislar/hizli-satislar">
            <History /> Geçmiş
          </Link>
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0">
          <div className="mb-3 flex gap-2">
            <SearchInput value={q} onChange={setQ} placeholder="Ürün ara veya barkod yaz…" className="flex-1" autoFocus />
            <ScanButton onDetected={byBarcode} />
          </div>
          <div className="thin-scroll mb-3 flex gap-1.5 overflow-x-auto pb-1">
            <button onClick={() => setCat("")} className={cn("shrink-0 rounded-full px-3 py-1.5 text-xs font-medium", !cat ? "bg-primary text-white" : "bg-surface text-muted")}>
              Tümü
            </button>
            {cats.data?.map((c) => (
              <button key={c.id} onClick={() => setCat(c.id)} className={cn("shrink-0 rounded-full px-3 py-1.5 text-xs font-medium", cat === c.id ? "bg-primary text-white" : "bg-surface text-muted")}>
                {c.name}
              </button>
            ))}
          </div>
          <div
            className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4"
            onKeyDown={(e) => {
              if (e.key === "Enter" && list.length === 1) add(list[0]);
            }}
          >
            {list.slice(0, 120).map((p) => (
              <button
                key={p.id}
                onClick={() => add(p)}
                className="flex min-h-24 flex-col justify-between rounded-card border border-border bg-surface p-3 text-left transition-colors hover:border-primary active:scale-[0.98]"
              >
                <span className="line-clamp-2 text-sm font-medium">{p.name}</span>
                <span className="mt-2 flex items-end justify-between gap-1">
                  <span className="num font-semibold text-primary">{formatMoney(priceIncl(p))}</span>
                  <span className="flex items-center gap-1.5">
                    <span className="rounded bg-surface-2 px-1 py-0.5 text-[10.5px] font-semibold text-muted">
                      %{p.vat_rate}
                    </span>
                    {p.type === "product" && p.track_stock && (
                      <span className={cn("text-[11px]", Number(p.stock_qty) <= 0 ? "text-danger" : "text-muted")}>
                        {formatQty(p.stock_qty)} {units.data?.find((u) => u.id === p.unit_id)?.code.toLocaleLowerCase("tr-TR")}
                      </span>
                    )}
                  </span>
                </span>
              </button>
            ))}
          </div>
          {!list.length && <p className="p-8 text-center text-sm text-muted">Ürün bulunamadı.</p>}
        </div>

        <Card className="hidden h-[calc(100dvh-7rem)] overflow-hidden lg:sticky lg:top-20 lg:block">{cartPanel}</Card>
      </div>

      {/* telefon/tablet: alttaki sepet çubuğu */}
      <div className="fixed inset-x-3 bottom-24 z-30 lg:hidden">
        <Button size="lg" className="w-full shadow-lg" onClick={() => setCartOpen(true)}>
          <ShoppingCart /> Sepet ({cart.reduce((s, l) => s + l.quantity, 0)}) · {formatMoney(calc.total)}
        </Button>
      </div>
      <Dialog open={cartOpen} onOpenChange={setCartOpen}>
        <DialogContent title="Sepet" className="h-[90dvh] [&>div:last-child]:flex [&>div:last-child]:flex-1 [&>div:last-child]:flex-col [&>div:last-child]:p-0">
          {cartPanel}
        </DialogContent>
      </Dialog>

      <Dialog open={!!done} onOpenChange={(o) => !o && setDone(null)}>
        <DialogContent title="Satış tamamlandı">
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <CheckCircle2 className="size-12 text-success" />
            <div className="num text-2xl font-bold">{formatMoney(done?.total)}</div>
            {done?.isCredit && (
              <div className="w-full rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-3 text-xs text-amber-800 dark:text-amber-300">
                <div className="font-semibold text-sm">Veresiye / Açık Hesap Satış</div>
                {done.customerName && <div className="mt-1 font-medium text-slate-700 dark:text-slate-200">{done.customerName}</div>}
                {done.dueDate && (
                  <div className="mt-1 text-slate-500 dark:text-slate-400 text-[11px]">
                    Vade Tarihi: <span className="font-bold text-amber-700 dark:text-amber-400">{formatDate(done.dueDate)}</span>
                  </div>
                )}
              </div>
            )}
            {!!done?.change && <div className="text-sm">Para üstü: <b className="num">{formatMoney(done.change)}</b></div>}
            <div className="mt-2 flex w-full gap-2">
              <Button asChild variant="outline" className="flex-1">
                <Link href={`/satislar/hizli-satislar/detay?id=${done?.id}`}>
                  <Printer /> Fiş / Fatura
                </Link>
              </Button>
              <Button className="flex-1" onClick={() => setDone(null)}>
                Yeni satış
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
