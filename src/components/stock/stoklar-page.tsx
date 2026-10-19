"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, Download, Eraser, Info, Pencil, Search, Trash2, Upload, Warehouse, X } from "lucide-react";
import { toast } from "sonner";
import { newId, useCategories, useProducts, useRows, useRpc, useSave, useUnits, useUpdate, useWarehouses, type Row } from "@/lib/data";
import { exportExcel, readSpreadsheet, toNumber } from "@/lib/excel";
import { formatMoney, formatQty, isoDate } from "@/lib/format";
import { useOrg } from "@/providers/org-provider";
import { useConfirm } from "@/components/ui/confirm";
import { cn } from "@/lib/utils";
import { NumberInput } from "@/components/ui/money-input";
import { fold } from "@/lib/search";

type Tab = "depolar" | "sayim" | "eksi" | "fiyat";
type Product = Row<"products">;
type WarehouseRow = Row<"warehouses">;

const PAGE = 200;
const normalize = (s: string) => fold(s);

/** Ürünün birim maliyeti: ortalama maliyet, yoksa alış fiyatı (KDV hariç) */
const unitCost = (p: Product) => {
  const avg = Number(p.avg_cost) || 0;
  if (avg > 0) return avg;
  const buy = Number(p.purchase_price) || 0;
  return p.purchase_price_includes_vat ? buy / (1 + Number(p.vat_rate) / 100) : buy;
};

// ---------------------------------------------------------------------------
// Ortak veri
// ---------------------------------------------------------------------------

function useStockData() {
  const products = useProducts();
  const warehouses = useWarehouses();
  const units = useUnits();
  const stocks = useRows<Row<"product_stocks">>("product_stocks", { softDelete: false });

  const tracked = React.useMemo(
    () => (products.data ?? []).filter((p) => p.is_active && p.type === "product" && p.track_stock),
    [products.data],
  );
  const qty = React.useCallback(
    (pid: string, wid: string) =>
      Number(stocks.data?.find((s) => s.product_id === pid && s.warehouse_id === wid)?.quantity ?? 0),
    [stocks.data],
  );
  const unitLabel = React.useCallback(
    (p: Product) => {
      const u = units.data?.find((x) => x.id === p.unit_id);
      return !u || /adet/i.test(u.name) ? "ad" : u.name.toLocaleLowerCase("tr-TR");
    },
    [units.data],
  );
  return { products, warehouses, stocks, tracked, qty, unitLabel };
}

// ---------------------------------------------------------------------------
// Depo penceresi (Pusulam "Yeni Depo")
// ---------------------------------------------------------------------------

function WarehouseDialog({ initial, onClose }: { initial: WarehouseRow | null; onClose: () => void }) {
  const save = useSave("warehouses");
  const update = useUpdate("warehouses");
  const [name, setName] = React.useState(initial?.name ?? "");
  const [address, setAddress] = React.useState(initial?.address ?? "");
  const [busy, setBusy] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      if (initial) await update.update(initial.id, { name: name.trim(), address: address.trim() || null }, "Depo güncellendi");
      else await save.save({ name: name.trim(), address: address.trim() || null }, "Depo eklendi");
      onClose();
    } catch {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl animate-scale-in"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-bold">{initial ? "Depoyu Düzenle" : "Yeni Depo"}</h2>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600" aria-label="Kapat">
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-5 space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Depo adı *</span>
            <input className="input" autoFocus required value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Adres</span>
            <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
          </label>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-200 dark:border-slate-800">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Vazgeç
          </button>
          <button type="submit" className="btn-primary" disabled={busy || !name.trim()}>
            Kaydet
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Depolar & Transfer
// ---------------------------------------------------------------------------

function WarehousesTab() {
  const { canWrite } = useOrg();
  const confirm = useConfirm();
  const { warehouses, tracked, qty, unitLabel } = useStockData();
  const update = useUpdate("warehouses");
  const [dialog, setDialog] = React.useState<WarehouseRow | "new" | null>(null);
  const [expanded, setExpanded] = React.useState<string | null>(null);

  const list = warehouses.data ?? [];

  const remove = async (w: WarehouseRow, totalQty: number) => {
    if (w.is_default) {
      toast.error("Varsayılan depo silinemez.");
      return;
    }
    if (totalQty !== 0) {
      toast.error("İçinde stok bulunan depo silinemez. Önce stokları transfer edin.");
      return;
    }
    if (await confirm({ title: `${w.name} silinsin mi?`, danger: true, confirmText: "Sil" })) {
      await update.remove(w.id, "Depo silindi");
    }
  };

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 lg:gap-4 mb-5">
        <div className="min-w-0 lg:min-w-[12rem] lg:shrink-0 lg:max-w-[45%]">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Stoklar / Depolar</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {list.length} depo · {tracked.length} ürün
          </p>
        </div>
        {canWrite && (
          <div className="flex flex-wrap items-center gap-2 min-w-0 lg:justify-end">
            <Link href="/stok/transfer" className="btn-ghost">
              Depolar arası transfer
            </Link>
            <button type="button" className="btn-primary" onClick={() => setDialog("new")}>
              + Yeni Depo
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {list.map((w) => {
          const rows = tracked.map((p) => ({ p, q: qty(p.id, w.id) })).filter((r) => r.q !== 0);
          const totalQty = rows.reduce((s, r) => s + r.q, 0);
          const value = rows.reduce((s, r) => s + Math.max(r.q, 0) * unitCost(r.p), 0);
          const open = expanded === w.id;
          return (
            <div key={w.id} className={cn("card p-4", open && "md:col-span-2 xl:col-span-3")}>
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-xl bg-cyan-50 dark:bg-cyan-900/30 text-cyan-500 flex items-center justify-center shrink-0">
                  <Warehouse size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{w.name}</div>
                  <div className="text-xs text-slate-400">{w.address || (w.is_default ? "Merkez" : "—")}</div>
                </div>
                {canWrite && (
                  <>
                    <button className="text-slate-300 hover:text-brand-500 p-1" title="Düzenle" onClick={() => setDialog(w)}>
                      <Pencil size={16} />
                    </button>
                    <button className="text-slate-300 hover:text-rose-500 p-1" title="Sil" onClick={() => remove(w, totalQty)}>
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <div className="text-[11px] text-slate-400">Toplam Adet</div>
                  <div className="font-semibold">{formatQty(totalQty)}</div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">Stok Değeri</div>
                  <div className="font-semibold text-brand-500">{formatMoney(value)}</div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3">
                <button
                  type="button"
                  className="text-brand-500 text-sm font-semibold flex items-center gap-1 hover:gap-2 transition-all"
                  onClick={() => setExpanded(open ? null : w.id)}
                >
                  {open ? "ürünleri gizle" : "ürünleri gör"} <ChevronRight size={16} className={cn("transition", open && "rotate-90")} />
                </button>
              </div>
              {open && (
                <div className="mt-3 max-h-96 overflow-y-auto rounded-xl border border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                  {rows.length === 0 ? (
                    <p className="p-4 text-sm text-slate-400 text-center">Bu depoda stok yok.</p>
                  ) : (
                    rows
                      .sort((a, b) => a.p.name.localeCompare(b.p.name, "tr"))
                      .map(({ p, q }) => (
                        <Link
                          key={p.id}
                          href={`/urunler/${p.id}`}
                          className="flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/60"
                        >
                          <span className="truncate">{p.name}</span>
                          <span className={cn("font-semibold shrink-0 tabular-nums", q <= 0 && "text-rose-500")}>
                            {formatQty(q)} {unitLabel(p)}
                          </span>
                        </Link>
                      ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {dialog && <WarehouseDialog initial={dialog === "new" ? null : dialog} onClose={() => setDialog(null)} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stok Sayım & Düzeltme
// ---------------------------------------------------------------------------

function CountTab() {
  const { org, canWrite } = useOrg();
  const confirm = useConfirm();
  const { warehouses, tracked, qty, unitLabel } = useStockData();
  const adjust = useRpc("adjust_stock");
  const [q, setQ] = React.useState("");
  const [wh, setWh] = React.useState("");
  const [note, setNote] = React.useState("");
  const [limit, setLimit] = React.useState(PAGE);
  const [counts, setCounts] = React.useState<Record<string, number>>({});
  const [busy, setBusy] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const whList = React.useMemo(() => warehouses.data ?? [], [warehouses.data]);
  const key = (pid: string, wid: string) => `${pid}|${wid}`;

  // Her ürün × depo bir satır (depo filtresi seçiliyse yalnızca o depo)
  const rows = React.useMemo(() => {
    const ws = wh ? whList.filter((w) => w.id === wh) : whList;
    const query = normalize(q.trim());
    const out: { p: Product; w: WarehouseRow; sys: number }[] = [];
    for (const p of tracked) {
      if (query && !normalize(`${p.name} ${p.code ?? ""} ${p.barcode ?? ""}`).includes(query)) continue;
      for (const w of ws) out.push({ p, w, sys: qty(p.id, w.id) });
    }
    return out.sort((a, b) => a.p.name.localeCompare(b.p.name, "tr"));
  }, [tracked, whList, wh, q, qty]);

  const changed = Object.entries(counts).filter(([k, v]) => {
    const [pid, wid] = k.split("|");
    return Number.isFinite(v) && v !== qty(pid, wid);
  });

  const fillSystem = () => {
    const next: Record<string, number> = { ...counts };
    for (const r of rows) next[key(r.p.id, r.w.id)] = r.sys;
    setCounts(next);
  };

  const downloadSheet = () =>
    exportExcel(`stok-sayim-${isoDate()}`, [
      {
        name: "Sayım",
        rows,
        columns: [
          { header: "Ürün ID", value: (r) => r.p.id },
          { header: "Depo ID", value: (r) => r.w.id },
          { header: "Barkod", value: (r) => r.p.barcode ?? "" },
          { header: "Ürün", value: (r) => r.p.name },
          { header: "Depo", value: (r) => r.w.name },
          { header: "Sistem Stok", value: (r) => r.sys, type: "qty" },
          { header: "Sayılan Stok", value: () => "" },
        ],
      },
    ]);

  const uploadSheet = async (file: File) => {
    try {
      const { rows: data } = await readSpreadsheet(file);
      const next: Record<string, number> = { ...counts };
      let n = 0;
      for (const r of data) {
        const raw = r["Sayılan Stok"];
        if (raw === undefined || raw === null || String(raw).trim() === "") continue;
        const barcode = String(r["Barkod"] ?? "").trim();
        const pid = String(r["Ürün ID"] ?? "").trim() || tracked.find((p) => barcode && p.barcode === barcode)?.id;
        const wid = String(r["Depo ID"] ?? "").trim() || whList.find((w) => w.name === r["Depo"])?.id || whList.find((w) => w.is_default)?.id;
        if (!pid || !wid || !tracked.some((p) => p.id === pid)) continue;
        next[key(pid, wid)] = toNumber(raw);
        n++;
      }
      setCounts(next);
      toast.success(n ? `${n} satır sayımı yüklendi — kontrol edip kaydedin` : "Dosyada doldurulmuş 'Sayılan Stok' bulunamadı");
    } catch (e) {
      toast.error("Dosya okunamadı: " + (e as Error).message);
    }
  };

  const save = async () => {
    if (!changed.length || !org) return;
    const ok = await confirm({
      title: `${changed.length} satırda sayım farkı işlensin mi?`,
      description: "Sayılan miktarlar stok olarak kaydedilir ve stok hareketi oluşur.",
      confirmText: "İşle",
    });
    if (!ok) return;
    setBusy(true);
    let done = 0;
    try {
      for (const [k, v] of changed) {
        const [pid, wid] = k.split("|");
        await adjust.call({
          p_org: org.id,
          p_product: pid,
          p_warehouse: wid,
          p_quantity: v,
          p_mode: "set",
          p_date: isoDate(),
          p_note: note.trim() || "Stok sayımı",
          p_unit_cost: null,
          p_id: newId(),
        });
        done++;
      }
      toast.success(`${done} sayım farkı işlendi`);
      setCounts({});
    } catch {
      // Hata gösterildi; işlenmeyen satırlar ekranda kalır
      setCounts((c) => Object.fromEntries(Object.entries(c).filter(([k]) => !changed.slice(0, done).some(([d]) => d === k))));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 lg:gap-4 mb-5">
        <div className="min-w-0 lg:min-w-[12rem] lg:shrink-0 lg:max-w-[45%]">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Stok Sayım / Düzeltme</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Listeyi indirin, Sayılan Stok sütununu doldurun, Excel/CSV olarak geri yükleyin
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 min-w-0 lg:justify-end">
          <button type="button" className="btn-ghost" onClick={downloadSheet}>
            <Download size={16} /> Sayım Excel İndir
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.csv,.tsv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) uploadSheet(f);
            }}
          />
          <button type="button" className="btn-ghost" onClick={() => fileRef.current?.click()}>
            <Upload size={16} /> Sayım Excel Yükle
          </button>
          {canWrite && changed.length > 0 && (
            <button type="button" className="btn-primary" onClick={save} disabled={busy}>
              {busy ? "İşleniyor…" : `Farkları işle (${changed.length})`}
            </button>
          )}
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50 dark:bg-sky-900/20 dark:border-sky-800 px-4 py-3 text-sm text-sky-900 dark:text-sky-100 flex items-start gap-2">
        <Info size={16} className="shrink-0 mt-0.5" />
        <div>
          <b>Ürün ID</b> ve <b>Barkod</b> sütunlarını silmeyin / değiştirmeyin. Sadece <b>Sayılan Stok</b> sütununu doldurun.
          Excel’de kaydederken <b>.xlsx</b> veya <b>.csv</b> olabilir — ikisi de yüklenir.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="md:col-span-2 self-end">
          <div className="relative">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-10"
              placeholder="ürün / barkod ara"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setLimit(PAGE);
              }}
            />
          </div>
        </div>
        <div>
          <label className="block mb-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">Depo filtresi</label>
          <select className="input" value={wh} onChange={(e) => setWh(e.target.value)}>
            <option value="">Tüm depolar</option>
            {whList.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <button type="button" className="btn-ghost text-sm" onClick={fillSystem}>
          Sistem stoğunu doldur
        </button>
        <button type="button" className="btn-ghost text-sm" onClick={() => setCounts({})}>
          <Eraser size={15} /> Sayımları temizle
        </button>
        <input
          className="input flex-1 min-w-[200px] !py-2 text-sm"
          placeholder="Açıklama (opsiyonel) — örn. Aralık sayımı"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-left text-slate-400 text-xs">
              <tr>
                <th className="px-4 py-2.5 font-medium">Ürün</th>
                <th className="px-4 py-2.5 font-medium">SKU</th>
                <th className="px-4 py-2.5 font-medium">Depo</th>
                <th className="px-4 py-2.5 font-medium text-right">Sistem</th>
                <th className="px-4 py-2.5 font-medium text-right w-28">Sayım</th>
                <th className="px-4 py-2.5 font-medium text-right">Fark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.slice(0, limit).map(({ p, w, sys }) => {
                const k = key(p.id, w.id);
                const counted = counts[k];
                const diff = counted === undefined ? null : counted - sys;
                return (
                  <tr key={k} className={cn(diff !== null && diff !== 0 && "bg-amber-50/50 dark:bg-amber-900/10")}>
                    <td className="px-4 py-2.5">
                      <div className="font-medium">{p.name}</div>
                    </td>
                    <td className="px-4 py-2.5 text-slate-400 text-xs">{p.barcode || p.code || "—"}</td>
                    <td className="px-4 py-2.5 text-slate-400 text-xs">{w.name}</td>
                    <td className={cn("px-4 py-2.5 text-right font-semibold", sys < 0 && "text-rose-500")}>
                      {formatQty(sys)} {unitLabel(p)}
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="number"
                        step="any"
                        className="input !py-1.5 text-right text-sm w-full"
                        placeholder="—"
                        disabled={!canWrite}
                        value={counted ?? ""}
                        onChange={(e) =>
                          setCounts((c) => {
                            const next = { ...c };
                            if (e.target.value === "") delete next[k];
                            else next[k] = Number(e.target.value);
                            return next;
                          })
                        }
                      />
                    </td>
                    <td
                      className={cn(
                        "px-4 py-2.5 text-right font-semibold tabular-nums",
                        diff === null || diff === 0 ? "text-slate-300" : diff > 0 ? "text-emerald-500" : "text-rose-500",
                      )}
                    >
                      {diff === null ? "—" : `${diff > 0 ? "+" : ""}${formatQty(diff)}`}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    Stok takibi yapılan ürün bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {rows.length > limit && (
          <div className="p-3 text-center border-t border-slate-100 dark:border-slate-800">
            <button type="button" className="btn-ghost text-sm" onClick={() => setLimit((l) => l + PAGE)}>
              Daha fazla göster ({rows.length - limit} ürün daha) — ya da yukarıdan arayın
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Eksi stok toplu girişi
// ---------------------------------------------------------------------------

/** Alış penceresine ön yüklenecek kalemler (sessionStorage) */
export const PREFILL_KEY = "ren-alis-onyukleme";

function NegativeTab() {
  const { org, canWrite } = useOrg();
  const router = useRouter();
  const confirm = useConfirm();
  const { warehouses, products, stocks, unitLabel } = useStockData();
  const adjust = useRpc("adjust_stock");
  const [q, setQ] = React.useState("");
  const [sel, setSel] = React.useState<Record<string, boolean>>({});
  const [amounts, setAmounts] = React.useState<Record<string, number>>({});
  const [busy, setBusy] = React.useState(false);
  // aynı satır iki kez gönderilse de tek hareket oluşsun (adjust_stock p_id ile tekrar etmez)
  const moveIds = React.useRef<Record<string, string>>({});

  const whName = (id: string) => warehouses.data?.find((w) => w.id === id)?.name ?? "Depo";
  const rows = React.useMemo(() => {
    // pasife alınmış ürünler de dahil: eksi stok her durumda düzeltilmeli
    const byId = new Map((products.data ?? []).filter((p) => p.track_stock).map((p) => [p.id, p]));
    const query = normalize(q.trim());
    return (stocks.data ?? [])
      .filter((s) => Number(s.quantity) < 0 && byId.has(s.product_id))
      .map((s) => ({ key: `${s.product_id}|${s.warehouse_id}`, p: byId.get(s.product_id)!, wid: s.warehouse_id, qty: Number(s.quantity) }))
      .filter((r) => !query || normalize(`${r.p.name} ${r.p.code ?? ""} ${r.p.barcode ?? ""}`).includes(query))
      .sort((a, b) => a.qty - b.qty);
  }, [stocks.data, products.data, q]);

  const amountOf = (r: (typeof rows)[number]) => amounts[r.key] ?? -r.qty;
  const chosen = rows.filter((r) => sel[r.key] && amountOf(r) > 0);
  const allSelected = rows.length > 0 && rows.every((r) => sel[r.key]);
  const toggleAll = () => setSel(allSelected ? {} : Object.fromEntries(rows.map((r) => [r.key, true])));

  /** Seçilenleri alış faturası penceresine eksik miktarlarıyla aktar */
  const toPurchase = () => {
    if (!chosen.length) return toast.error("Önce ürün seçin");
    // Aynı ürün birden fazla depoda eksideyse miktarlar toplanır
    const merged = new Map<string, number>();
    for (const r of chosen) merged.set(r.p.id, (merged.get(r.p.id) ?? 0) + amountOf(r));
    try {
      sessionStorage.setItem(PREFILL_KEY, JSON.stringify([...merged].map(([product_id, quantity]) => ({ product_id, quantity }))));
    } catch {}
    router.push("/giderler/alis-faturalari/yeni?onyukleme=1");
  };

  /** Faturasız stok girişi: yalnızca stok artar, cari/kasa etkilenmez */
  const toStock = async () => {
    if (!org || !chosen.length) return toast.error("Önce ürün seçin");
    const ok = await confirm({
      title: `${chosen.length} ürüne faturasız stok girişi yapılsın mı?`,
      description: "Yalnızca stok miktarı artar; tedarikçi borcu, kasa ve maliyet kaydı oluşmaz. Ürünü satın aldıysanız 'Alış faturası oluştur' seçeneğini kullanın.",
      confirmText: "Stok girişi yap",
    });
    if (!ok) return;
    setBusy(true);
    let done = 0;
    try {
      for (const r of chosen) {
        moveIds.current[r.key] ??= newId();
        await adjust.call({
          p_org: org.id,
          p_product: r.p.id,
          p_warehouse: r.wid,
          p_quantity: amountOf(r),
          p_mode: "add",
          p_date: isoDate(),
          p_note: "Toplu eksi stok girişi (faturasız)",
          p_unit_cost: null,
          p_id: moveIds.current[r.key],
        });
        done++;
      }
      toast.success(`${done} ürüne stok girişi yapıldı`);
      setSel({});
      setAmounts({});
      moveIds.current = {};
    } catch {
      toast.error(`${done} ürün işlendi, kalanlar işlenemedi — tekrar deneyebilirsiniz (işlenenler çift sayılmaz)`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Eksi Stok Girişi</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Stoğu eksiye düşmüş {rows.length} ürün/depo. Girilecek miktar varsayılan olarak stoğu sıfıra getirir; değiştirebilirsiniz.
          </p>
        </div>
        {canWrite && (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={toPurchase} disabled={!chosen.length || busy} className="btn-primary disabled:opacity-50">
              Alış faturası oluştur ({chosen.length})
            </button>
            <button type="button" onClick={toStock} disabled={!chosen.length || busy} className="btn-ghost disabled:opacity-50">
              {busy ? "İşleniyor…" : `Faturasız stok girişi (${chosen.length})`}
            </button>
          </div>
        )}
      </div>

      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-300" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ürün adı, kod veya barkod" className="input pl-9" />
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              <th className="px-3 py-2.5 w-10">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Tümünü seç" />
              </th>
              <th className="px-3 py-2.5 text-left">Ürün</th>
              <th className="px-3 py-2.5 text-center w-32">Depo</th>
              <th className="px-3 py-2.5 text-center w-28">Mevcut stok</th>
              <th className="px-3 py-2.5 text-center w-36">Girilecek miktar</th>
              <th className="px-3 py-2.5 text-center w-28">Yeni stok</th>
              <th className="px-3 py-2.5 text-center w-32">Birim maliyet</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-slate-600 dark:text-slate-300">
                  Eksi stoklu ürün yok.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const amt = amountOf(r);
                return (
                  <tr key={r.key} className={cn(sel[r.key] && "bg-brand-50/60 dark:bg-brand-900/20")}>
                    <td className="px-3 py-2 text-center">
                      <input type="checkbox" checked={!!sel[r.key]} onChange={(e) => setSel((s) => ({ ...s, [r.key]: e.target.checked }))} aria-label={`${r.p.name} seç`} />
                    </td>
                    <td className="px-3 py-2">
                      <Link href={`/urunler/${r.p.id}`} className="font-medium hover:text-brand-600 dark:hover:text-brand-400">
                        {r.p.name}
                      </Link>
                      {(r.p.barcode || !r.p.is_active) && (
                        <div className="text-xs text-slate-600 dark:text-slate-300">
                          {r.p.barcode}
                          {!r.p.is_active && <span className="ml-1 font-semibold text-amber-700 dark:text-amber-300">· pasif ürün</span>}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">{whName(r.wid)}</td>
                    <td className="px-3 py-2 text-center font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                      {formatQty(r.qty)} {unitLabel(r.p)}
                    </td>
                    <td className="px-3 py-2">
                      <NumberInput
                        value={amt}
                        decimals={3}
                        onChange={(v) => {
                          setAmounts((a) => ({ ...a, [r.key]: Math.max(0, v) }));
                          if (v > 0) setSel((s) => ({ ...s, [r.key]: true }));
                        }}
                        className="h-9 text-center"
                        aria-label="Girilecek miktar"
                      />
                    </td>
                    <td className={cn("px-3 py-2 text-center font-semibold tabular-nums", r.qty + amt < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400")}>
                      {formatQty(r.qty + amt)}
                    </td>
                    <td className="px-3 py-2 text-center tabular-nums">{formatMoney(unitCost(r.p))}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toplu fiyat düzenleme
// ---------------------------------------------------------------------------

type PriceField = "sale_price" | "purchase_price";
type PriceMode = "yuzde" | "tl" | "sabit";
type Rounding = "yok" | "kurus" | "tam" | "bes";

const roundPrice = (v: number, r: Rounding) => {
  if (r === "tam") return Math.round(v);
  if (r === "bes") return Math.round(v / 5) * 5;
  return Math.round(v * 100) / 100;
};

function PriceTab() {
  const { canWrite } = useOrg();
  const confirm = useConfirm();
  const products = useProducts();
  const categories = useCategories();
  const update = useUpdate("products");
  const [q, setQ] = React.useState("");
  const [cat, setCat] = React.useState("");
  const [field, setField] = React.useState<PriceField>("sale_price");
  const [mode, setMode] = React.useState<PriceMode>("yuzde");
  const [dir, setDir] = React.useState<1 | -1>(1);
  const [amount, setAmount] = React.useState(0);
  const [rounding, setRounding] = React.useState<Rounding>("kurus");
  // fiyatlar bu esasa çevrilerek gösterilir, hesaplanır ve kaydedilir
  const [vatIncl, setVatIncl] = React.useState(true);
  // varsayılan: kapsamdaki tüm ürünler seçili; işareti kaldırılanlar burada tutulur
  const [off, setOff] = React.useState<Record<string, boolean>>({});
  const [manual, setManual] = React.useState<Record<string, number>>({});
  const [busy, setBusy] = React.useState(false);

  const rows = React.useMemo(() => {
    const query = normalize(q.trim());
    return (products.data ?? [])
      .filter((p) => p.is_active)
      .filter((p) => !cat || p.category_id === cat)
      .filter((p) => !query || normalize(`${p.name} ${p.code ?? ""} ${p.barcode ?? ""}`).includes(query));
  }, [products.data, q, cat]);

  const inclField = field === "sale_price" ? "sale_price_includes_vat" : "purchase_price_includes_vat";
  /** Kayıtlı fiyat, seçilen KDV esasına (dahil/hariç) çevrilmiş olarak */
  const oldOf = (p: Product) => {
    const v = Number(p[field]) || 0;
    const k = 1 + (Number(p.vat_rate) || 0) / 100;
    const stored = !!p[inclField];
    return stored === vatIncl ? v : Math.round((vatIncl ? v * k : v / k) * 100) / 100;
  };
  const calc = (p: Product) => {
    if (manual[p.id] !== undefined) return manual[p.id];
    const old = oldOf(p);
    const v = mode === "yuzde" ? old * (1 + (dir * amount) / 100) : mode === "tl" ? old + dir * amount : amount;
    return Math.max(0, roundPrice(v, rounding));
  };
  const picked = rows.filter((p) => !off[p.id]);
  const allSelected = rows.length > 0 && picked.length === rows.length;
  const toggleAll = () => setOff(allSelected ? Object.fromEntries(rows.map((p) => [p.id, true])) : {});
  const fieldLabel = field === "sale_price" ? "satış" : "alış";
  /** Önerilen fiyat: yeni fiyatın en yakın 5 TL katı (87,55 → 90; 86 → 85) */
  const suggest = (p: Product) => {
    const v = calc(p);
    return v > 0 ? Math.max(5, Math.round(v / 5) * 5) : 0;
  };
  const chosenNew = picked.filter((p) => calc(p) !== oldOf(p));
  const chosenSug = picked.filter((p) => suggest(p) > 0 && suggest(p) !== oldOf(p));

  const apply = async (kind: "yeni" | "onerilen") => {
    const chosen = kind === "yeni" ? chosenNew : chosenSug;
    const priceOf = kind === "yeni" ? calc : suggest;
    if (!chosen.length) return toast.error("Fiyatı değişecek ürün yok");
    const ok = await confirm({
      title: `${chosen.length} ürünün ${fieldLabel} fiyatı ${kind === "onerilen" ? "önerilen fiyata " : ""}güncellensin mi?`,
      description: "Yalnızca ürün kartındaki fiyat değişir; kesilmiş faturalar ve teklifler etkilenmez. Değişiklikler İşlem Geçmişi'nde görünür.",
      confirmText: `Fiyatları güncelle (KDV ${vatIncl ? "dahil" : "hariç"})`,
    });
    if (!ok) return;
    setBusy(true);
    let done = 0;
    try {
      for (const p of chosen) {
        // fiyat seçilen esasla kaydedilir (90 TL KDV dahil → tam 90 kalır)
        await update.update(p.id, { [field]: priceOf(p), [inclField]: vatIncl });
        done++;
      }
      toast.success(`${done} ürünün ${fieldLabel} fiyatı güncellendi`);
      setOff({});
      setManual({});
    } catch {
      toast.error(`${done} ürün güncellendi, kalanlar güncellenemedi — tekrar deneyebilirsiniz`);
    } finally {
      setBusy(false);
    }
  };

  const seg = (active: boolean) =>
    cn(
      "px-3 py-1.5 rounded-lg text-sm font-semibold transition",
      active ? "bg-brand-500 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Toplu Fiyat Düzenleme</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Tüm ürünlere veya bir kategoriye yüzde / TL artış uygulayın. En sağda en yakın 5 TL'ye yuvarlanmış önerilen fiyat çıkar; tek düğmeyle hepsine uygulanır.
          </p>
        </div>
        {canWrite && (
          <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => apply("yeni")} disabled={!chosenNew.length || busy} className="btn-ghost disabled:opacity-50">
            {`Yeni fiyatları kaydet (${chosenNew.length})`}
          </button>
          <button type="button" onClick={() => apply("onerilen")} disabled={!chosenSug.length || busy} className="btn-primary disabled:opacity-50">
            {busy ? "Güncelleniyor…" : `Önerilen fiyatları uygula (${chosenSug.length})`}
          </button>
          </div>
        )}
      </div>

      <div className="card p-4 flex flex-wrap items-end gap-4">
        <div>
          <div className="mb-1 text-xs font-semibold text-slate-600 dark:text-slate-300">Ürünler</div>
          <select value={cat} onChange={(e) => { setCat(e.target.value); setOff({}); }} className="input h-10 w-auto">
            <option value="">Tüm ürünler</option>
            {(categories.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <div className="mb-1 text-xs font-semibold text-slate-600 dark:text-slate-300">Fiyat</div>
          <div className="flex gap-1 rounded-xl border border-slate-200 dark:border-slate-700 p-1">
            <button type="button" className={seg(field === "sale_price")} onClick={() => { setField("sale_price"); setManual({}); }}>Satış</button>
            <button type="button" className={seg(field === "purchase_price")} onClick={() => { setField("purchase_price"); setManual({}); }}>Alış</button>
          </div>
        </div>
        <div>
          <div className="mb-1 text-xs font-semibold text-slate-600 dark:text-slate-300">KDV</div>
          <div className="flex gap-1 rounded-xl border border-slate-200 dark:border-slate-700 p-1">
            <button type="button" className={seg(vatIncl)} onClick={() => { setVatIncl(true); setManual({}); }}>KDV Dahil</button>
            <button type="button" className={seg(!vatIncl)} onClick={() => { setVatIncl(false); setManual({}); }}>KDV Hariç</button>
          </div>
        </div>
        <div>
          <div className="mb-1 text-xs font-semibold text-slate-600 dark:text-slate-300">İşlem</div>
          <div className="flex gap-1 rounded-xl border border-slate-200 dark:border-slate-700 p-1">
            <button type="button" className={seg(mode === "yuzde")} onClick={() => setMode("yuzde")}>% Yüzde</button>
            <button type="button" className={seg(mode === "tl")} onClick={() => setMode("tl")}>TL</button>
            <button type="button" className={seg(mode === "sabit")} onClick={() => setMode("sabit")}>Yeni fiyat</button>
          </div>
        </div>
        {mode !== "sabit" && (
          <div>
            <div className="mb-1 text-xs font-semibold text-slate-600 dark:text-slate-300">Yön</div>
            <div className="flex gap-1 rounded-xl border border-slate-200 dark:border-slate-700 p-1">
              <button type="button" className={seg(dir === 1)} onClick={() => setDir(1)}>Artır</button>
              <button type="button" className={seg(dir === -1)} onClick={() => setDir(-1)}>Azalt</button>
            </div>
          </div>
        )}
        <div className="w-36">
          <div className="mb-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
            {mode === "yuzde" ? "Oran (%)" : mode === "tl" ? "Tutar (TL)" : "Yeni fiyat"}
          </div>
          <NumberInput value={amount} decimals={2} onChange={(v) => { setAmount(Math.max(0, v)); setManual({}); }} className="h-10 text-center" aria-label="Değer" />
        </div>
        <div>
          <div className="mb-1 text-xs font-semibold text-slate-600 dark:text-slate-300">Yuvarlama</div>
          <select value={rounding} onChange={(e) => setRounding(e.target.value as Rounding)} className="input h-10">
            <option value="kurus">Kuruş (0,01)</option>
            <option value="tam">Tam TL</option>
            <option value="bes">5 TL'ye</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-300" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ürün adı, kod veya barkod" className="input pl-9" />
        </div>
        <span className="self-center text-sm text-slate-600 dark:text-slate-300">{picked.length} / {rows.length} ürün seçili</span>
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              <th className="px-3 py-2.5 w-10">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Tümünü seç" />
              </th>
              <th className="px-3 py-2.5 text-left">Ürün</th>
              <th className="px-3 py-2.5 text-center w-36">Eski {fieldLabel} fiyatı</th>
              <th className="px-3 py-2.5 text-center w-40">Yeni {fieldLabel} fiyatı</th>
              <th className="px-3 py-2.5 text-center w-28">Fark</th>
              <th className="px-3 py-2.5 text-center w-32">Önerilen fiyat ({vatIncl ? "KDV dahil" : "KDV hariç"})</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-slate-600 dark:text-slate-300">Ürün bulunamadı.</td>
              </tr>
            ) : (
              rows.map((p) => {
                const old = oldOf(p);
                const nw = calc(p);
                const diff = nw - old;
                const cur = (field === "sale_price" ? p.sale_currency : p.purchase_currency) || "TRY";
                return (
                  <tr key={p.id} className={cn(!off[p.id] && "bg-brand-50/60 dark:bg-brand-900/20")}>
                    <td className="px-3 py-2 text-center">
                      <input type="checkbox" checked={!off[p.id]} onChange={(e) => setOff((o) => ({ ...o, [p.id]: !e.target.checked }))} aria-label={`${p.name} seç`} />
                    </td>
                    <td className="px-3 py-2">
                      <Link href={`/urunler/${p.id}`} className="font-medium hover:text-brand-600 dark:hover:text-brand-400">{p.name}</Link>
                      <div className="text-xs text-slate-600 dark:text-slate-300">{[p.code, p.barcode].filter(Boolean).join(" · ")}</div>
                    </td>
                    <td className="px-3 py-2 text-center tabular-nums">
                      {formatMoney(old, cur)}
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{vatIncl ? "KDV dahil" : "KDV hariç"} · %{Number(p.vat_rate) || 0}</div>
                    </td>
                    <td className="px-3 py-2">
                      <NumberInput
                        value={nw}
                        decimals={2}
                        onChange={(v) => {
                          setManual((m) => ({ ...m, [p.id]: Math.max(0, v) }));
                          setOff((o) => ({ ...o, [p.id]: false }));
                        }}
                        className={cn("h-9 text-center", manual[p.id] !== undefined && "ring-1 ring-amber-400")}
                        aria-label="Yeni fiyat"
                      />
                    </td>
                    <td className={cn("px-3 py-2 text-center font-semibold tabular-nums", diff > 0 ? "text-emerald-700 dark:text-emerald-400" : diff < 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-500")}>
                      {diff === 0 ? "—" : `${diff > 0 ? "+" : ""}${formatMoney(diff, cur)}`}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {(() => {
                        const sg = suggest(p);
                        return sg > 0 && sg !== nw ? (
                          <button
                            type="button"
                            title="Bu fiyatı yeni fiyat olarak kullan"
                            onClick={() => {
                              setManual((m) => ({ ...m, [p.id]: sg }));
                              setOff((o) => ({ ...o, [p.id]: false }));
                            }}
                            className="rounded-lg border border-brand-300 dark:border-brand-700 px-2.5 py-1 font-semibold tabular-nums text-brand-700 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-900/30"
                          >
                            {formatMoney(sg, cur)}
                          </button>
                        ) : (
                          <span className="tabular-nums text-slate-500">{sg > 0 ? formatMoney(sg, cur) : "—"}</span>
                        );
                      })()}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sayfa
// ---------------------------------------------------------------------------

export function StoklarPage() {
  const sp = useSearchParams();
  const [tab, setTab] = React.useState<Tab>(() => (["sayim", "eksi", "fiyat"].includes(sp.get("sekme") ?? "") ? (sp.get("sekme") as Tab) : "depolar"));
  const tabs: { id: Tab; label: string }[] = [
    { id: "depolar", label: "Depolar & Transfer" },
    { id: "sayim", label: "Stok Sayım & Düzeltme" },
    { id: "eksi", label: "Eksi Stok Girişi" },
    { id: "fiyat", label: "Toplu Fiyat Düzenleme" },
  ];
  return (
    <div className="flex flex-col h-full">
      <div className="mb-4 flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex gap-2 flex-wrap">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-semibold transition",
                tab === t.id
                  ? "bg-brand-500 text-white shadow-sm"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-brand-400",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 min-h-0">{tab === "depolar" ? <WarehousesTab /> : tab === "sayim" ? <CountTab /> : tab === "eksi" ? <NegativeTab /> : <PriceTab />}</div>
    </div>
  );
}
