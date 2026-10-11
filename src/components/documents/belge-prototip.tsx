"use client";

/**
 * ÖNİZLEME (yalnızca localde denemek için): daha pratik "Yeni Alış / Satış" ekranı önerisi.
 * Kaydetme KAPALI — veritabanına hiçbir şey yazmaz. Menüde yoktur; adres: /deneme/yeni-belge
 */

import * as React from "react";
import { DateInput } from "@/components/ui/date-input";
import { Minus, Plus, ScanBarcode, Search, Sparkles, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";
import { newId, useContactBalances, useProducts, useRows, useUnits, type Row } from "@/lib/data";
import { addDays, calcDocument, convertVat } from "@/lib/doc-calc";
import { formatDate, formatMoney, formatNumber, formatQty, isoDate } from "@/lib/format";
import { NumberInput } from "@/components/ui/money-input";
import { ContactPicker } from "@/components/contacts/contact-picker";
import { MultiDiscountInput } from "./multi-discount-input";
import { cn } from "@/lib/utils";

type Side = "sales" | "purchase";
type Kind = "Fatura" | "Sipariş" | "İrsaliye" | "Teklif";
type Pay = "acik" | "nakit" | "kart" | "havale";
type Line = {
  key: string;
  product_id: string;
  name: string;
  unit: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
  discount_rate: number;
  discount_str?: string;
};

const norm = (s: string) => s.toLocaleLowerCase("tr-TR").trim();
const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function BelgePrototip() {
  const products = useProducts();
  const units = useUnits();
  const balances = useContactBalances();

  const [side, setSide] = React.useState<Side>("sales");
  const [kind, setKind] = React.useState<Kind>("Fatura");
  const [contactId, setContactId] = React.useState<string | null>(null);
  const [issueDate, setIssueDate] = React.useState(isoDate());
  const [term, setTerm] = React.useState<number>(0);
  const [pay, setPay] = React.useState<Pay>("acik");
  const [inclVat, setInclVat] = React.useState(false); // yeni belge her zaman KDV hariç
  const [discType, setDiscType] = React.useState<"rate" | "amount">("rate");
  const [discValue, setDiscValue] = React.useState(0);
  const [lines, setLines] = React.useState<Line[]>([]);
  const [q, setQ] = React.useState("");
  const [hi, setHi] = React.useState(0);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const isSales = side === "sales";

  // Seçili carinin geçmiş kalemleri: son fiyat ipucu ve sık alınanlar
  const history = useRows<{ product_id: string; unit_price: number; quantity: number; document: { issue_date: string; doc_type: string; prices_include_vat: boolean } }>(
    "document_lines",
    {
      select: "product_id, unit_price, quantity, document:documents!inner(issue_date, doc_type, prices_include_vat, contact_id, deleted_at)",
      softDelete: false,
      params: ["prototip_gecmis", contactId],
      enabled: !!contactId,
      filter: (x) => x.eq("document.contact_id", contactId).is("document.deleted_at", null).not("product_id", "is", null),
      limit: 2000,
    },
  );
  const histTypes = React.useMemo(() => (isSales ? ["sales_invoice", "pos_sale", "sales_order"] : ["purchase_invoice", "purchase_order"]), [isSales]);
  const lastPrice = React.useMemo(() => {
    const m = new Map<string, { price: number; date: string; incl: boolean }>();
    for (const h of history.data ?? []) {
      if (!histTypes.includes(h.document.doc_type)) continue;
      const cur = m.get(h.product_id);
      if (!cur || h.document.issue_date > cur.date) m.set(h.product_id, { price: Number(h.unit_price), date: h.document.issue_date, incl: !!h.document.prices_include_vat });
    }
    return m;
  }, [history.data, histTypes]);
  const favorites = React.useMemo(() => {
    const c = new Map<string, number>();
    for (const h of history.data ?? []) if (histTypes.includes(h.document.doc_type)) c.set(h.product_id, (c.get(h.product_id) ?? 0) + Number(h.quantity));
    return [...c.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([id]) => (products.data ?? []).find((p) => p.id === id))
      .filter(Boolean) as Row<"products">[];
  }, [history.data, products.data, histTypes]);

  const matches = React.useMemo(() => {
    const t = norm(q);
    if (t.length < 2) return [];
    return (products.data ?? [])
      .filter((p) => p.is_active !== false && (norm(p.name).includes(t) || (p.barcode ?? "") === q.trim() || norm(p.code ?? "").includes(t)))
      .slice(0, 8);
  }, [q, products.data]);

  const priceOf = (p: Row<"products">) => {
    const lp = lastPrice.get(p.id);
    if (lp) return r2(convertVat(lp.price, Number(p.vat_rate), lp.incl, inclVat));
    const raw = isSales ? Number(p.sale_price) : Number(p.purchase_price);
    const incl = isSales ? p.sale_price_includes_vat : p.purchase_price_includes_vat;
    return r2(convertVat(raw, Number(p.vat_rate), incl, inclVat));
  };

  const focusLineField = (key: string, field: "qty" | "price") =>
    setTimeout(() => {
      const el = document.querySelector<HTMLInputElement>(`[data-k="${key}-${field}"]`);
      el?.focus();
      el?.select();
    }, 30);

  const add = (p: Row<"products">) => {
    const existing = lines.find((l) => l.product_id === p.id);
    if (existing) {
      setLines((ls) => ls.map((l) => (l.key === existing.key ? { ...l, quantity: l.quantity + 1 } : l)));
      focusLineField(existing.key, "qty");
    } else {
      const key = newId();
      setLines((ls) => [
        ...ls,
        {
          key,
          product_id: p.id,
          name: p.name,
          unit: (units.data ?? []).find((u) => u.id === p.unit_id)?.name?.toLocaleLowerCase("tr-TR") ?? "adet",
          quantity: 1,
          unit_price: priceOf(p),
          vat_rate: Number(p.vat_rate ?? 20),
          discount_rate: 0,
        },
      ]);
      focusLineField(key, "qty");
    }
    setQ("");
    setHi(0);
  };

  const patch = (key: string, v: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...v } : l)));
  const backToSearch = () => setTimeout(() => searchRef.current?.focus(), 30);

  const calc = calcDocument(
    { prices_include_vat: inclVat, discount_type: discType, discount_value: discValue, exchange_rate: 1 },
    lines.map((l) => ({ quantity: l.quantity, unit_price: l.unit_price, discount_rate: l.discount_rate, vat_rate: l.vat_rate })),
  );
  const balance = contactId ? Number((balances.data ?? []).find((b) => b.contact_id === contactId)?.balance ?? 0) : null;

  const save = () => toast.info("Önizleme ekranı — kaydetme kapalı", { description: "Beğenirseniz bu ekranı gerçek kayıtla devreye alırım." });

  // Kısayollar: F2 ürün ara, Ctrl+S kaydet
  React.useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key.toLowerCase() === "s" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", h);
    searchRef.current?.focus();
    return () => window.removeEventListener("keydown", h);
  }, []);

  const seg = (active: boolean) =>
    cn("px-3.5 py-2 text-sm font-semibold transition", active ? "bg-brand-500 text-white" : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800");

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 px-4 py-2.5 text-sm text-amber-900 dark:text-amber-100 flex items-center gap-2">
        <Sparkles size={16} /> <b>Önizleme:</b> Bu ekran öneridir, kaydetmez. Beğenirseniz gerçek kayıtla devreye alınır.
      </div>

      {/* Üst: belge yönü ve türü */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold mr-2">Yeni {isSales ? "Satış" : "Alış"} {kind}</h1>
        <div className="inline-flex overflow-hidden rounded-xl border border-slate-300 dark:border-slate-600">
          <button type="button" className={seg(isSales)} onClick={() => setSide("sales")}>Satış</button>
          <button type="button" className={seg(!isSales)} onClick={() => setSide("purchase")}>Alış</button>
        </div>
        <div className="inline-flex overflow-hidden rounded-xl border border-slate-300 dark:border-slate-600">
          {(["Fatura", "Sipariş", "İrsaliye", ...(isSales ? (["Teklif"] as Kind[]) : [])] as Kind[]).map((k) => (
            <button key={k} type="button" className={seg(kind === k)} onClick={() => setKind(k)}>
              {k}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-4 items-start">
        {/* SOL: arama + kalemler */}
        <div className="space-y-3 min-w-0">
          <div className="card p-3">
            <div className="relative">
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-300" />
              <input
                ref={searchRef}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setHi(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setHi((i) => Math.min(matches.length - 1, i + 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setHi((i) => Math.max(0, i - 1));
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    const exact = (products.data ?? []).find((p) => (p.barcode ?? "") === q.trim());
                    const p = exact ?? matches[hi];
                    if (p) add(p);
                    else if (q.trim()) toast.info(`"${q.trim()}" katalogda yok`);
                  } else if (e.key === "Escape") setQ("");
                }}
                placeholder="Barkod okutun ya da ürün adı yazın  (F2)"
                className="w-full h-14 rounded-xl border-2 border-brand-400 dark:border-brand-600 bg-white dark:bg-slate-900 pl-12 pr-12 text-lg outline-none focus:ring-4 focus:ring-brand-500/20"
                autoComplete="off"
              />
              <ScanBarcode size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-300" />
              {matches.length > 0 && (
                <div className="absolute z-30 left-0 right-0 mt-1 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
                  {matches.map((p, i) => {
                    const lp = lastPrice.get(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => add(p)}
                        onMouseEnter={() => setHi(i)}
                        className={cn("w-full px-4 py-2.5 text-left flex items-center gap-3", i === hi ? "bg-brand-500 text-white" : "hover:bg-slate-50 dark:hover:bg-slate-800")}
                      >
                        <span className="flex-1 min-w-0">
                          <span className="block font-semibold truncate">{p.name}</span>
                          <span className={cn("block text-xs", i === hi ? "text-white/90" : "text-slate-600 dark:text-slate-300")}>
                            {p.barcode || p.code || "barkodsuz"} · stok {formatQty(p.stock_qty)}
                            {lp && ` · son ${isSales ? "satış" : "alış"}: ${formatNumber(lp.price)} (${formatDate(lp.date)})`}
                          </span>
                        </span>
                        <span className="font-bold tabular-nums">{formatNumber(priceOf(p))}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            {favorites.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                  <Zap size={13} /> Bu cariye sık {isSales ? "satılanlar" : "alınanlar"}:
                </span>
                {favorites.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => add(p)}
                    className="rounded-full border border-slate-300 dark:border-slate-600 px-3 py-1 text-xs font-medium hover:border-brand-500 hover:text-brand-700 dark:hover:text-brand-300"
                  >
                    + {p.name.length > 28 ? p.name.slice(0, 28) + "…" : p.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="card p-0 overflow-hidden">
            <div className="hidden md:grid grid-cols-[minmax(0,1fr)_8.5rem_7rem_5.5rem_3.5rem_7rem_2.25rem] gap-2 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 text-center">
              <span className="text-left">Ürün</span>
              <span>Miktar</span>
              <span>Fiyat</span>
              <span>İsk. %</span>
              <span>KDV</span>
              <span>Tutar</span>
              <span />
            </div>
            {lines.length === 0 ? (
              <div className="py-16 text-center text-slate-600 dark:text-slate-300">
                <ScanBarcode size={36} className="mx-auto mb-2" />
                <p className="font-medium">Barkod okutun ya da üstten ürün arayın</p>
                <p className="text-xs mt-1">Ürün eklenince imleç miktara geçer · Enter → fiyat · Enter → tekrar arama</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {lines.map((l, i) => {
                  const lp = lastPrice.get(l.product_id);
                  const amount = l.quantity * l.unit_price * (1 - l.discount_rate / 100);
                  return (
                    <div key={l.key} className="grid grid-cols-2 md:grid-cols-[minmax(0,1fr)_8.5rem_7rem_5.5rem_3.5rem_7rem_2.25rem] gap-2 items-center px-4 py-3">
                      <div className="col-span-2 md:col-span-1 min-w-0">
                        <div className="font-semibold leading-snug line-clamp-2" title={l.name}>
                          <span className="text-slate-500 mr-1.5">{i + 1}.</span>
                          {l.name}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-300">
                          {l.unit}
                          {lp && ` · son ${isSales ? "satış" : "alış"} ${formatNumber(lp.price)} (${formatDate(lp.date)})`}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button type="button" tabIndex={-1} onClick={() => patch(l.key, { quantity: Math.max(1, l.quantity - 1) })} className="h-9 w-8 rounded-lg border border-slate-300 dark:border-slate-600 flex items-center justify-center">
                          <Minus size={14} />
                        </button>
                        <NumberInput
                          data-k={`${l.key}-qty`}
                          value={l.quantity}
                          decimals={3}
                          onChange={(v) => patch(l.key, { quantity: v > 0 ? v : 0 })}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              focusLineField(l.key, "price");
                            }
                          }}
                          className="h-9 w-14 px-1 text-center font-semibold"
                        />
                        <button type="button" tabIndex={-1} onClick={() => patch(l.key, { quantity: l.quantity + 1 })} className="h-9 w-8 rounded-lg border border-slate-300 dark:border-slate-600 flex items-center justify-center">
                          <Plus size={14} />
                        </button>
                      </div>
                      <NumberInput
                        data-k={`${l.key}-price`}
                        value={l.unit_price || null}
                        onChange={(v) => patch(l.key, { unit_price: v >= 0 ? v : 0 })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            backToSearch();
                          }
                        }}
                        className="h-9 text-center"
                      />
                      <MultiDiscountInput
                        value={l.discount_rate}
                        discountStr={l.discount_str}
                        unitPrice={l.unit_price}
                        onChange={(rate, str) => patch(l.key, { discount_rate: rate, discount_str: str })}
                        className="[&_input]:text-center"
                      />
                      <div className="text-center text-sm font-semibold">%{formatQty(l.vat_rate)}</div>
                      <div className="text-center font-bold tabular-nums">{formatNumber(amount)}</div>
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
                        className="h-9 w-9 justify-self-end rounded-lg text-rose-600 dark:text-rose-400 flex items-center justify-center hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        aria-label="Sil"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* SAĞ: cari, ödeme, toplam — sabit */}
        <aside className="card p-4 space-y-4 lg:sticky lg:top-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300 mb-1">{isSales ? "Müşteri" : "Tedarikçi"}</div>
            <ContactPicker value={contactId} onChange={(id) => setContactId(id)} kind={isSales ? "customer" : "supplier"} clearable />
            {balance !== null && (
              <div className={cn("mt-1.5 text-xs font-semibold", balance > 0 ? "text-emerald-700 dark:text-emerald-400" : balance < 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-600 dark:text-slate-300")}>
                Bakiye: {formatMoney(Math.abs(balance))} {balance > 0 ? "(bize borçlu)" : balance < 0 ? "(alacaklı)" : ""}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label>
              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">Tarih</span>
              <DateInput type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="input mt-1" />
            </label>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">Vade</span>
              <div className="mt-1 grid grid-cols-3 gap-1">
                {[0, 30, 60].map((d) => (
                  <button key={d} type="button" onClick={() => setTerm(d)} className={cn("h-10 rounded-lg border text-xs font-bold", term === d ? "border-brand-500 bg-brand-500 text-white" : "border-slate-300 dark:border-slate-600")}>
                    {d === 0 ? "Peşin" : `${d}g`}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {term > 0 && <div className="-mt-2 text-xs text-slate-600 dark:text-slate-300">Vade tarihi: {formatDate(addDays(issueDate, term))}</div>}

          {kind === "Fatura" && (
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">Ödeme</span>
              <div className="mt-1 grid grid-cols-4 gap-1">
                {([["acik", "Açık"], ["nakit", "Nakit"], ["kart", "Kart"], ["havale", "Havale"]] as const).map(([v, label]) => (
                  <button key={v} type="button" onClick={() => setPay(v)} className={cn("h-10 rounded-lg border text-xs font-bold", pay === v ? "border-brand-500 bg-brand-500 text-white" : "border-slate-300 dark:border-slate-600")}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-700 dark:text-slate-200">Fiyatlar</span>
            <div className="inline-flex overflow-hidden rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-bold">
              <button type="button" className={cn("px-3 py-1.5", inclVat ? "bg-brand-500 text-white" : "")} onClick={() => setInclVat(true)}>KDV dahil</button>
              <button type="button" className={cn("px-3 py-1.5", !inclVat ? "bg-brand-500 text-white" : "")} onClick={() => setInclVat(false)}>KDV hariç</button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-700 dark:text-slate-200 shrink-0">İndirim</span>
            <div className="inline-flex overflow-hidden rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-bold shrink-0">
              <button type="button" className={cn("px-2.5 py-1.5", discType === "rate" ? "bg-brand-500 text-white" : "")} onClick={() => setDiscType("rate")}>%</button>
              <button type="button" className={cn("px-2.5 py-1.5", discType === "amount" ? "bg-brand-500 text-white" : "")} onClick={() => setDiscType("amount")}>₺</button>
            </div>
            <NumberInput value={discValue || null} onChange={(v) => setDiscValue(Math.max(0, v))} className="h-9 text-right" />
          </div>

          <div className="space-y-1.5 border-t border-slate-200 dark:border-slate-700 pt-3 text-sm">
            <div className="flex justify-between"><span className="text-slate-700 dark:text-slate-200">Ara toplam ({lines.length} kalem)</span><span className="tabular-nums">{formatMoney(calc.subtotal)}</span></div>
            {calc.discount_total > 0 && <div className="flex justify-between text-rose-600 dark:text-rose-400"><span>İndirim</span><span className="tabular-nums">−{formatMoney(calc.discount_total)}</span></div>}
            <div className="flex justify-between"><span className="text-slate-700 dark:text-slate-200">KDV</span><span className="tabular-nums">{formatMoney(calc.vat_total)}</span></div>
          </div>
          <div className="rounded-xl bg-brand-50 dark:bg-brand-900/30 border border-brand-200 dark:border-brand-800 px-4 py-3 flex items-baseline justify-between">
            <span className="font-bold text-brand-800 dark:text-brand-200">TOPLAM</span>
            <span className="text-3xl font-extrabold tabular-nums text-brand-700 dark:text-brand-300">{formatMoney(calc.total)}</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={save} className="btn-primary h-12 justify-center text-base">Kaydet <span className="text-xs opacity-80">Ctrl+S</span></button>
            <button type="button" onClick={save} className="h-12 rounded-xl border border-slate-300 dark:border-slate-600 font-semibold">Kaydet + Yazdır</button>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-300">Kısayollar: F2 ürün ara · Enter sonraki kutu · Ctrl+S kaydet</p>
        </aside>
      </div>
    </div>
  );
}
