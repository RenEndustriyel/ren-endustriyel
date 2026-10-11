"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, ExternalLink, Eye, EyeOff, ImageOff, Info, MessageCircle, Package, Pencil, Phone, Search, ShoppingBag, Store, Tag, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import catalog from "@/components/store/catalog.json";
import { ORDER_STATUSES, previewAdmin, usePreviewAdmin, type OrderStatus, type StoreOrder } from "@/components/store/preview-admin";
import { ProductThumb } from "@/components/store/product-thumb";
import { STORE_CATEGORIES, categoryOf, productHref, type StoreProduct } from "@/components/store/store-shared";
import { Badge } from "@/components/ui/badge";
import { useConfirm } from "@/components/ui/confirm";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { Switch } from "@/components/ui/switch";
import { useProducts, type Row } from "@/lib/data";
import { formatMoney, formatQty } from "@/lib/format";
import { fold } from "@/lib/search";
import { cn } from "@/lib/utils";

const PRODUCTS = catalog as StoreProduct[];
const PAGE = 50;

type Tab = "genel" | "siparisler" | "urunler" | "ayarlar";
type ErpProduct = Row<"products">;

const PAYMENT_LABEL: Record<string, string> = { havale: "Havale / EFT", onay: "Sipariş onayında", kart: "Kart" };
const statusOf = (v: OrderStatus) => ORDER_STATUSES.find((s) => s.value === v) ?? ORDER_STATUSES[0];
const dateTime = (iso: string) => new Date(iso).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const orderTotal = (o: StoreOrder) => o.subtotal + (o.shipping ?? 0);

/** ERP satış fiyatı, KDV dahil */
const erpPrice = (p: ErpProduct | undefined) => {
  if (!p) return 0;
  const price = Number(p.sale_price) || 0;
  return Math.round((p.sale_price_includes_vat ? price : price * (1 + Number(p.vat_rate) / 100)) * 100) / 100;
};

/** Katalog + önizleme ayarları + ERP kaydı birleşik satır */
function useRows() {
  const admin = usePreviewAdmin();
  const erp = useProducts();
  const erpById = React.useMemo(() => new Map((erp.data ?? []).map((p) => [p.id, p])), [erp.data]);
  const rows = React.useMemo(
    () =>
      PRODUCTS.map((p) => {
        const o = admin.products[p.id];
        const price = o?.price === undefined ? p.price : (o.price ?? undefined);
        return { ...p, storePrice: price, hidden: !!o?.hidden, erp: erpById.get(p.id) };
      }),
    [admin.products, erpById],
  );
  return { rows, admin, erpLoading: erp.isLoading };
}
type AdminRow = ReturnType<typeof useRows>["rows"][number];

// ---------------------------------------------------------------------------
// Genel bakış
// ---------------------------------------------------------------------------

function Progress({ label, done, total, action }: { label: string; done: number; total: number; action?: React.ReactNode }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>
        <span className="num text-muted">
          {done} / {total}
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2">
        <div className={cn("h-full rounded-full", pct === 100 ? "bg-success" : "bg-primary")} style={{ width: `${pct}%` }} />
      </div>
      {action && <div className="mt-1.5 text-xs">{action}</div>}
    </div>
  );
}

function Overview({ rows, orders, statusFor, go }: { rows: AdminRow[]; orders: StoreOrder[]; statusFor: (ref: string) => OrderStatus; go: (tab: Tab, filter?: string) => void }) {
  const live = rows.filter((r) => !r.hidden);
  const active = orders.filter((o) => statusFor(o.ref) !== "iptal");
  const fresh = orders.filter((o) => statusFor(o.ref) === "yeni");
  const linkBtn = "font-semibold text-primary hover:underline";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Yeni sipariş" value={fresh.length} currency={null} tone={fresh.length ? "warning" : undefined} sub="Onay bekliyor" />
        <Stat label="Sipariş tutarı" value={active.reduce((s, o) => s + orderTotal(o), 0)} sub={`${active.length} sipariş (iptaller hariç)`} />
        <Stat label="Yayındaki ürün" value={live.length} currency={null} sub={`${rows.length - live.length} ürün gizli`} />
        <Stat label="Fiyatı görünen ürün" value={live.filter((r) => r.storePrice !== undefined).length} currency={null} sub="Diğerleri “Fiyat sorunuz”" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="card p-5">
          <h3 className="font-semibold">Mağaza hazırlık durumu</h3>
          <p className="mt-0.5 text-sm text-muted">Yayındaki {live.length} ürün üzerinden</p>
          <div className="mt-5 space-y-5">
            <Progress
              label="Fiyatı girilmiş ürünler"
              done={live.filter((r) => r.storePrice !== undefined).length}
              total={live.length}
              action={
                <button className={linkBtn} onClick={() => go("urunler", "fiyatsiz")}>
                  Fiyatsız ürünleri göster
                </button>
              }
            />
            <Progress
              label="Görseli olan ürünler"
              done={live.filter((r) => r.image).length}
              total={live.length}
              action={
                <button className={linkBtn} onClick={() => go("urunler", "gorselsiz")}>
                  Görselsiz ürünleri göster
                </button>
              }
            />
            <Progress label="Markası belirlenmiş ürünler" done={live.filter((r) => r.brand).length} total={live.length} />
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <h3 className="font-semibold">Son siparişler</h3>
            <button className={cn(linkBtn, "text-sm")} onClick={() => go("siparisler")}>
              Tümünü gör
            </button>
          </div>
          {orders.length ? (
            <ul className="divide-y divide-border">
              {orders.slice(0, 6).map((o) => {
                const s = statusOf(statusFor(o.ref));
                return (
                  <li key={o.ref} className="flex items-center gap-3 px-5 py-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{o.customer.ad || "—"}</div>
                      <div className="num text-xs text-muted">
                        {o.ref} · {dateTime(o.createdAt)}
                      </div>
                    </div>
                    <Badge tone={s.tone}>{s.label}</Badge>
                    <div className="num w-24 text-right font-semibold">{formatMoney(orderTotal(o))}</div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState icon={<ShoppingBag />} title="Henüz sipariş yok" description="Mağazadan verilen siparişler burada görünür." />
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Siparişler
// ---------------------------------------------------------------------------

function OrderDrawer({ order, status, note, onClose }: { order: StoreOrder; status: OrderStatus; note: string; onClose: () => void }) {
  const confirm = useConfirm();
  const c = order.customer;
  const phone = (c.telefon || "").replace(/\D/g, "").replace(/^0/, "90");
  const info: [string, string | undefined][] = [
    ["Telefon", c.telefon],
    ["E-posta", c.eposta],
    ["Adres", [c.adres, [c.ilce, c.il].filter(Boolean).join(" / ")].filter(Boolean).join(", ")],
    ["Firma", c.firma],
    ["Vergi dairesi / no", c.vergi],
    ["Müşteri notu", c.not],
    ["Ödeme", PAYMENT_LABEL[order.payment] ?? order.payment],
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="flex h-full w-full max-w-lg flex-col bg-surface shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <div className="num text-lg font-semibold">{order.ref}</div>
            <div className="text-sm text-muted">{dateTime(order.createdAt)}</div>
          </div>
          <button className="rounded-lg p-2 text-muted hover:bg-surface-2" aria-label="Kapat" onClick={onClose}>
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Durum</div>
            <div className="flex flex-wrap gap-1.5">
              {ORDER_STATUSES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => previewAdmin.setOrder(order.ref, { status: s.value })}
                  className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold transition", status === s.value ? "border-primary bg-primary text-white" : "border-border text-muted hover:border-primary hover:text-primary")}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Müşteri</div>
            <div className="rounded-xl border border-border p-4">
              <div className="font-semibold">{c.ad || "—"}</div>
              <dl className="mt-2 space-y-1.5 text-sm">
                {info
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <div key={k} className="grid grid-cols-[130px_1fr] gap-2">
                      <dt className="text-muted">{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
              </dl>
              {phone && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <a href={`tel:+${phone}`} className="btn-ghost">
                    <Phone className="size-4" /> Ara
                  </a>
                  <a href={`https://wa.me/${phone}?text=${encodeURIComponent(`Merhaba ${c.ad ?? ""}, ${order.ref} numaralı siparişiniz hakkında yazıyoruz.`)}`} target="_blank" rel="noopener noreferrer" className="btn-ghost">
                    <MessageCircle className="size-4" /> WhatsApp
                  </a>
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Ürünler</div>
            <div className="overflow-hidden rounded-xl border border-border">
              <ul className="divide-y divide-border">
                {order.lines.map((l) => (
                  <li key={l.slug} className="flex items-center gap-3 p-3 text-sm">
                    <div className="size-11 shrink-0 overflow-hidden rounded-lg border border-border">
                      <ProductThumb image={l.image} name={l.name} cat={l.cat} brand="" sizes="44px" className="size-full text-[8px]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{l.name}</div>
                      <div className="num text-xs text-muted">
                        {l.qty} × {l.price !== undefined ? formatMoney(l.price) : "fiyat verilecek"}
                      </div>
                    </div>
                    <div className="num font-semibold">{l.price !== undefined ? formatMoney(l.price * l.qty) : "—"}</div>
                  </li>
                ))}
              </ul>
              <div className="space-y-1 border-t border-border bg-surface-2 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Ara toplam</span>
                  <span className="num">{formatMoney(order.subtotal)}</span>
                </div>
                {!!order.shipping && (
                  <div className="flex justify-between">
                    <span className="text-muted">Teslimat</span>
                    <span className="num">{formatMoney(order.shipping)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-semibold">
                  <span>Toplam</span>
                  <span className="num">{formatMoney(orderTotal(order))}</span>
                </div>
                {order.unpriced > 0 && <div className="text-xs text-warning">{order.unpriced} ürünün fiyatı teklifle belirlenecek; toplama dahil değil.</div>}
              </div>
            </div>
          </div>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted">İç not (müşteri görmez)</span>
            <textarea key={order.ref} defaultValue={note} rows={3} onBlur={(e) => previewAdmin.setOrder(order.ref, { note: e.target.value })} className="input h-auto w-full resize-y py-2" placeholder="Örn. Salı günü teslim edilecek" />
          </label>
        </div>

        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <button
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-danger hover:underline"
            onClick={async () => {
              if (!(await confirm({ title: "Sipariş silinsin mi?", description: `${order.ref} numaralı sipariş kalıcı olarak silinir.`, confirmText: "Sil", danger: true }))) return;
              previewAdmin.removeOrder(order.ref);
              onClose();
            }}
          >
            <Trash2 className="size-4" /> Siparişi sil
          </button>
          <button className="btn-primary" onClick={onClose}>
            Tamam
          </button>
        </div>
      </aside>
    </div>
  );
}

function Orders({ orders, statusFor, noteFor }: { orders: StoreOrder[]; statusFor: (ref: string) => OrderStatus; noteFor: (ref: string) => string }) {
  const [filter, setFilter] = React.useState<OrderStatus | "tumu">("tumu");
  const [q, setQ] = React.useState("");
  const [openRef, setOpenRef] = React.useState<string | null>(null);
  const open = orders.find((o) => o.ref === openRef);
  const needle = fold(q.trim());
  const shown = orders.filter((o) => (filter === "tumu" || statusFor(o.ref) === filter) && (!needle || fold(`${o.ref} ${o.customer.ad ?? ""} ${o.customer.telefon ?? ""} ${o.customer.firma ?? ""}`).includes(needle)));
  const count = (v: OrderStatus) => orders.filter((o) => statusFor(o.ref) === v).length;

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
        <div className="flex flex-1 flex-wrap gap-1.5">
          <button onClick={() => setFilter("tumu")} className={cn("rounded-lg px-3 py-1.5 text-sm font-semibold", filter === "tumu" ? "bg-primary-soft text-primary" : "text-muted hover:bg-surface-2")}>
            Tümü <span className="num ml-1 text-xs">{orders.length}</span>
          </button>
          {ORDER_STATUSES.map((s) => (
            <button key={s.value} onClick={() => setFilter(s.value)} className={cn("rounded-lg px-3 py-1.5 text-sm font-semibold", filter === s.value ? "bg-primary-soft text-primary" : "text-muted hover:bg-surface-2")}>
              {s.label} <span className="num ml-1 text-xs">{count(s.value)}</span>
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Sipariş no, müşteri, telefon" className="input w-full pl-9" />
        </div>
      </div>

      {shown.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                <th className="px-4 py-2.5">Sipariş</th>
                <th className="px-4 py-2.5">Müşteri</th>
                <th className="px-4 py-2.5">Ürün</th>
                <th className="px-4 py-2.5">Ödeme</th>
                <th className="px-4 py-2.5">Durum</th>
                <th className="px-4 py-2.5 text-right">Tutar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {shown.map((o) => {
                const s = statusOf(statusFor(o.ref));
                return (
                  <tr key={o.ref} onClick={() => setOpenRef(o.ref)} className="cursor-pointer hover:bg-surface-2">
                    <td className="px-4 py-3">
                      <div className="num font-semibold text-primary">{o.ref}</div>
                      <div className="num text-xs text-muted">{dateTime(o.createdAt)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{o.customer.ad || "—"}</div>
                      <div className="text-xs text-muted">{[o.customer.ilce, o.customer.il].filter(Boolean).join(" / ")}</div>
                    </td>
                    <td className="num px-4 py-3">
                      {o.lines.length} çeşit · {o.lines.reduce((n, l) => n + l.qty, 0)} adet
                    </td>
                    <td className="px-4 py-3">{PAYMENT_LABEL[o.payment] ?? o.payment}</td>
                    <td className="px-4 py-3">
                      <Badge tone={s.tone}>{s.label}</Badge>
                    </td>
                    <td className="num px-4 py-3 text-right font-semibold">
                      {formatMoney(orderTotal(o))}
                      {o.unpriced > 0 && <div className="text-[11px] font-normal text-warning">+ teklif</div>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          icon={<ShoppingBag />}
          title={orders.length ? "Bu süzgeçte sipariş yok" : "Henüz sipariş yok"}
          description={orders.length ? undefined : "Mağazadan bir deneme siparişi verin; burada görünecek."}
          action={
            orders.length ? undefined : (
              <Link href="/magaza" target="_blank" className="btn-primary">
                Mağazayı aç
              </Link>
            )
          }
        />
      )}

      {open && <OrderDrawer order={open} status={statusFor(open.ref)} note={noteFor(open.ref)} onClose={() => setOpenRef(null)} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ürünler
// ---------------------------------------------------------------------------

const PRODUCT_FILTERS = [
  { value: "tumu", label: "Tüm ürünler" },
  { value: "yayinda", label: "Yayında" },
  { value: "gizli", label: "Gizli" },
  { value: "fiyatsiz", label: "Fiyatsız" },
  { value: "gorselsiz", label: "Görselsiz" },
  { value: "stoksuz", label: "ERP stoğu yok" },
];

function PriceCell({ row }: { row: AdminRow }) {
  const [text, setText] = React.useState<string | null>(null);
  const shown = text ?? (row.storePrice !== undefined ? String(row.storePrice).replace(".", ",") : "");
  const save = () => {
    if (text === null) return;
    const t = text.trim();
    const n = Number(t.replace(/\./g, "").replace(",", "."));
    setText(null);
    if (!t) return previewAdmin.setProducts([row.id], { price: null });
    if (!Number.isFinite(n) || n < 0) return void toast.error("Geçerli bir fiyat girin");
    previewAdmin.setProducts([row.id], { price: Math.round(n * 100) / 100 });
  };
  return (
    <div className="relative ml-auto w-28">
      <input
        value={shown}
        onChange={(e) => setText(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        inputMode="decimal"
        placeholder="Fiyat sor"
        aria-label={`${row.name} mağaza fiyatı`}
        className="input num h-9 w-full pr-6 text-right"
      />
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted">₺</span>
    </div>
  );
}

function Products({ rows, erpLoading, initialFilter }: { rows: AdminRow[]; erpLoading: boolean; initialFilter: string }) {
  const confirm = useConfirm();
  const [q, setQ] = React.useState("");
  const [filter, setFilter] = React.useState(initialFilter);
  const [cat, setCat] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  const words = fold(q).split(/\s+/).filter(Boolean);
  const list = rows.filter((r) => {
    if (cat && r.cat !== cat) return false;
    if (filter === "yayinda" && r.hidden) return false;
    if (filter === "gizli" && !r.hidden) return false;
    if (filter === "fiyatsiz" && r.storePrice !== undefined) return false;
    if (filter === "gorselsiz" && r.image) return false;
    if (filter === "stoksuz" && (!r.erp || Number(r.erp.stock_qty) > 0)) return false;
    if (words.length) {
      const hay = fold(`${r.name} ${r.brand} ${r.barcode ?? ""}`);
      if (!words.every((w) => hay.includes(w))) return false;
    }
    return true;
  });
  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  const cur = Math.min(page, pages);
  const shown = list.slice((cur - 1) * PAGE, cur * PAGE);
  const reset = () => {
    setPage(1);
    setSelected(new Set());
  };

  const ids = [...selected];
  const allOnPage = shown.length > 0 && shown.every((r) => selected.has(r.id));
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const applyErpPrices = async (target: AdminRow[]) => {
    const prices = Object.fromEntries(target.map((r) => [r.id, erpPrice(r.erp)] as const).filter(([, p]) => p > 0));
    const n = Object.keys(prices).length;
    if (!n) return void toast.error("Seçilen ürünlerde ERP satış fiyatı bulunamadı");
    if (!(await confirm({ title: "ERP fiyatları mağazaya aktarılsın mı?", description: `${n} ürünün mağaza fiyatı, ERP'deki KDV dahil satış fiyatıyla değiştirilecek.`, confirmText: "Aktar" }))) return;
    previewAdmin.setPrices(prices);
    toast.success(`${n} ürünün fiyatı güncellendi`);
  };

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              reset();
            }}
            placeholder="Ürün adı, marka veya barkod"
            className="input w-full pl-9"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            reset();
          }}
          className="input w-auto"
          aria-label="Durum süzgeci"
        >
          {PRODUCT_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <select
          value={cat}
          onChange={(e) => {
            setCat(e.target.value);
            reset();
          }}
          className="input w-auto"
          aria-label="Kategori süzgeci"
        >
          <option value="">Tüm kategoriler</option>
          {STORE_CATEGORIES.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.title}
            </option>
          ))}
        </select>
      </div>

      <div className="flex min-h-12 flex-wrap items-center gap-2 border-b border-border bg-surface-2 px-3 py-2 text-sm">
        {ids.length ? (
          <>
            <span className="font-semibold">{ids.length} ürün seçildi</span>
            <button className="btn-ghost" onClick={() => previewAdmin.setProducts(ids, { hidden: false })}>
              <Eye className="size-4" /> Yayınla
            </button>
            <button className="btn-ghost" onClick={() => previewAdmin.setProducts(ids, { hidden: true })}>
              <EyeOff className="size-4" /> Gizle
            </button>
            <button className="btn-ghost" onClick={() => applyErpPrices(rows.filter((r) => selected.has(r.id)))}>
              <Tag className="size-4" /> ERP fiyatını uygula
            </button>
            <button className="ml-auto text-xs font-semibold text-muted hover:text-text" onClick={() => setSelected(new Set())}>
              Seçimi kaldır
            </button>
          </>
        ) : (
          <>
            <span className="text-muted">
              <span className="num font-semibold text-text">{list.length}</span> ürün
            </span>
            <button className="btn-ghost ml-auto" disabled={erpLoading || !list.length} onClick={() => applyErpPrices(list)}>
              <Tag className="size-4" /> Listelenenlere ERP fiyatını uygula
            </button>
          </>
        )}
      </div>

      {shown.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted">
                <th className="w-10 px-3 py-2.5">
                  <input
                    type="checkbox"
                    aria-label="Sayfadakilerin tümünü seç"
                    checked={allOnPage}
                    onChange={() =>
                      setSelected((s) => {
                        const n = new Set(s);
                        shown.forEach((r) => (allOnPage ? n.delete(r.id) : n.add(r.id)));
                        return n;
                      })
                    }
                    className="size-4 accent-[var(--primary)]"
                  />
                </th>
                <th className="px-2 py-2.5">Ürün</th>
                <th className="px-3 py-2.5">Kategori</th>
                <th className="px-3 py-2.5 text-right">ERP stok</th>
                <th className="px-3 py-2.5 text-right">ERP fiyat (KDV dahil)</th>
                <th className="px-3 py-2.5 text-right">Mağaza fiyatı</th>
                <th className="px-3 py-2.5 text-center">Yayında</th>
                <th className="w-20 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {shown.map((r) => {
                const c = categoryOf(r.cat);
                const stock = r.erp ? Number(r.erp.stock_qty) : null;
                return (
                  <tr key={r.id} className={cn("hover:bg-surface-2", r.hidden && "opacity-60")}>
                    <td className="px-3 py-2">
                      <input type="checkbox" aria-label={`${r.name} seç`} checked={selected.has(r.id)} onChange={() => toggle(r.id)} className="size-4 accent-[var(--primary)]" />
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-3">
                        <div className="size-11 shrink-0 overflow-hidden rounded-lg border border-border">
                          <ProductThumb image={r.image} name={r.name} cat={r.cat} brand="" sizes="44px" className="size-full text-[8px]" />
                        </div>
                        <div className="min-w-0">
                          <div className="max-w-[320px] truncate font-medium">{r.name}</div>
                          <div className="flex items-center gap-2 text-xs text-muted">
                            {r.brand && <span>{r.brand}</span>}
                            {!r.image && (
                              <span className="inline-flex items-center gap-1 text-warning">
                                <ImageOff className="size-3" /> görsel yok
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-muted">{c.short}</td>
                    <td className={cn("num px-3 py-2 text-right", stock !== null && stock <= 0 && "text-danger")}>{stock === null ? "—" : formatQty(stock)}</td>
                    <td className="num px-3 py-2 text-right text-muted">{r.erp && erpPrice(r.erp) > 0 ? formatMoney(erpPrice(r.erp)) : "—"}</td>
                    <td className="px-3 py-2">
                      <PriceCell row={r} />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Switch checked={!r.hidden} onCheckedChange={(v) => previewAdmin.setProducts([r.id], { hidden: !v })} aria-label={`${r.name} yayında`} />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        <Link href={productHref(r.slug)} target="_blank" title="Mağazada gör" className="rounded-lg p-2 text-muted hover:bg-surface hover:text-primary">
                          <ExternalLink className="size-4" />
                        </Link>
                        <Link href={`/urunler/${r.id}`} title="ERP ürün kartını aç" className="rounded-lg p-2 text-muted hover:bg-surface hover:text-primary">
                          <Pencil className="size-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon={<Package />} title="Bu süzgeçte ürün yok" />
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
          <span className="num text-muted">
            Sayfa {cur} / {pages}
          </span>
          <div className="flex gap-2">
            <button className="btn-ghost" disabled={cur <= 1} onClick={() => setPage(cur - 1)}>
              Önceki
            </button>
            <button className="btn-ghost" disabled={cur >= pages} onClick={() => setPage(cur + 1)}>
              Sonraki
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ayarlar
// ---------------------------------------------------------------------------

function NumberField({ label, hint, value, onSave }: { label: string; hint: string; value: number; onSave: (n: number) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <div className="relative mt-1.5 max-w-[200px]">
        <input
          key={value}
          defaultValue={value ? String(value).replace(".", ",") : ""}
          onBlur={(e) => {
            const n = Number(e.target.value.replace(/\./g, "").replace(",", "."));
            onSave(Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0);
          }}
          inputMode="decimal"
          placeholder="0"
          className="input num w-full pr-7 text-right"
        />
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-muted">₺</span>
      </div>
      <span className="mt-1 block text-xs text-muted">{hint}</span>
    </label>
  );
}

function Settings() {
  const { settings } = usePreviewAdmin();
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="card space-y-4 p-5">
        <h3 className="font-semibold">Duyuru şeridi</h3>
        <label className="block">
          <span className="text-sm font-medium">Mağazanın en üstünde görünen yazı</span>
          <input key={settings.announcement} defaultValue={settings.announcement} onBlur={(e) => previewAdmin.setSettings({ announcement: e.target.value.trim() })} className="input mt-1.5 w-full" placeholder="Boş bırakırsanız şerit görünmez" />
          <span className="mt-1 block text-xs text-muted">Örn. “Cumartesi siparişleri pazartesi teslim edilir.”</span>
        </label>
      </div>

      <div className="card space-y-4 p-5">
        <h3 className="font-semibold">Teslimat</h3>
        <NumberField label="Teslimat ücreti" hint="0 ise sepette “Onayda bildirilir” yazar." value={settings.shippingFee} onSave={(n) => previewAdmin.setSettings({ shippingFee: n })} />
        <NumberField label="Ücretsiz teslimat alt sınırı" hint="Sepet bu tutarı geçince teslimat ücreti alınmaz. 0 ise uygulanmaz." value={settings.freeShippingOver} onSave={(n) => previewAdmin.setSettings({ freeShippingOver: n })} />
      </div>

      <div className="card space-y-1 p-5 lg:col-span-2">
        <h3 className="mb-2 font-semibold">Ödeme yöntemleri</h3>
        {(
          [
            ["payHavale", "Havale / EFT", "Müşteri sipariş onayında banka bilgilerinizi alır."],
            ["payOnay", "Sipariş onayında ödeme", "Müşteriyi arayıp ödeme şeklini birlikte belirlersiniz."],
          ] as const
        ).map(([key, title, text]) => (
          <div key={key} className="flex items-center justify-between gap-4 border-t border-border py-3 first:border-t-0">
            <div>
              <div className="text-sm font-medium">{title}</div>
              <div className="text-xs text-muted">{text}</div>
            </div>
            <Switch
              checked={settings[key]}
              onCheckedChange={(v) => {
                if (!v && !settings[key === "payHavale" ? "payOnay" : "payHavale"]) return void toast.error("En az bir ödeme yöntemi açık kalmalı");
                previewAdmin.setSettings({ [key]: v });
              }}
              aria-label={title}
            />
          </div>
        ))}
        <div className="flex items-center justify-between gap-4 border-t border-border py-3 opacity-60">
          <div>
            <div className="text-sm font-medium">Kredi / banka kartı</div>
            <div className="text-xs text-muted">Sanal POS bağlandığında açılabilir.</div>
          </div>
          <Badge>Yakında</Badge>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sayfa
// ---------------------------------------------------------------------------

export function StoreAdmin() {
  const { rows, admin, erpLoading } = useRows();
  const [tab, setTab] = React.useState<Tab>("genel");
  const [productFilter, setProductFilter] = React.useState("tumu");
  const orders = admin.orderList;
  const statusFor = (ref: string): OrderStatus => admin.orders[ref]?.status ?? "yeni";
  const noteFor = (ref: string) => admin.orders[ref]?.note ?? "";
  const fresh = orders.filter((o) => statusFor(o.ref) === "yeni").length;

  const tabs: { value: Tab; label: string; icon: React.ElementType; badge?: number }[] = [
    { value: "genel", label: "Genel Bakış", icon: Store },
    { value: "siparisler", label: "Siparişler", icon: ShoppingBag, badge: fresh },
    { value: "urunler", label: "Ürünler", icon: Package },
    { value: "ayarlar", label: "Ayarlar", icon: CheckCircle2 },
  ];

  return (
    <div>
      <PageHeader
        title="E-Ticaret Mağazası"
        description="Siparişler, mağazadaki ürünler ve mağaza ayarları"
        actions={
          <Link href="/magaza" target="_blank" className="btn-primary">
            <ExternalLink className="size-4" /> Mağazayı aç
          </Link>
        }
      />

      <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-warning/40 bg-warning-soft px-4 py-3 text-sm">
        <Info className="mt-0.5 size-4 shrink-0 text-warning" />
        <span>
          <strong>Önizleme:</strong> Buradaki ayarlar ve siparişler şimdilik yalnızca bu bilgisayardaki tarayıcıda saklanır; başka cihazdan görünmez. Beğendiğinizde veritabanına bağlanacak.
        </span>
      </div>

      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={cn("-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition", tab === t.value ? "border-primary text-primary" : "border-transparent text-muted hover:text-text")}
          >
            <t.icon className="size-4" /> {t.label}
            {!!t.badge && <span className="num grid h-5 min-w-5 place-items-center rounded-full bg-warning px-1.5 text-[11px] font-bold text-white">{t.badge}</span>}
          </button>
        ))}
      </div>

      {tab === "genel" && (
        <Overview
          rows={rows}
          orders={orders}
          statusFor={statusFor}
          go={(t, f) => {
            if (f) setProductFilter(f);
            setTab(t);
          }}
        />
      )}
      {tab === "siparisler" && <Orders orders={orders} statusFor={statusFor} noteFor={noteFor} />}
      {tab === "urunler" && <Products key={productFilter} rows={rows} erpLoading={erpLoading} initialFilter={productFilter} />}
      {tab === "ayarlar" && <Settings />}
    </div>
  );
}
