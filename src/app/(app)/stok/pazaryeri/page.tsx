"use client";

import * as React from "react";
import { Store, Calculator, Search, TrendingUp, TrendingDown } from "lucide-react";
import { useProducts } from "@/lib/data";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  MARKETPLACE_PRESETS,
  calcMarketplace,
  type MarketplaceInputs,
} from "@/lib/marketplace";

const DEFAULTS: MarketplaceInputs = {
  commission: 15,
  shipping: 60,
  packaging: 10,
  ads: 8,
  returns: 5,
  fee: 8,
  targetMargin: 20,
};

const FIELDS: { key: keyof MarketplaceInputs; label: string; suffix: string }[] = [
  { key: "commission", label: "Komisyon", suffix: "%" },
  { key: "shipping", label: "Kargo (KDV dahil)", suffix: "₺" },
  { key: "packaging", label: "Paketleme", suffix: "₺" },
  { key: "ads", label: "Reklam payı", suffix: "%" },
  { key: "returns", label: "İade oranı", suffix: "%" },
  { key: "fee", label: "Hizmet bedeli (KDV dahil)", suffix: "₺" },
  { key: "targetMargin", label: "Hedef net marj", suffix: "%" },
];

const pct = (n: number) => `%${n.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}`;

export default function MarketplacePage() {
  const productsData = useProducts().data;
  const [inputs, setInputs] = React.useState<MarketplaceInputs>(DEFAULTS);
  const [preset, setPreset] = React.useState("trendyol");
  const [search, setSearch] = React.useState("");

  const setField = (key: keyof MarketplaceInputs, value: string) =>
    setInputs((s) => ({ ...s, [key]: Number(value) || 0 }));

  const pickPreset = (id: string) => {
    setPreset(id);
    const p = MARKETPLACE_PRESETS.find((x) => x.id === id);
    if (p) setInputs((s) => ({ ...s, commission: p.commission }));
  };

  const rows = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return (productsData ?? [])
      .filter((p) => Number(p.purchase_price ?? 0) > 0)
      .filter(
        (p) =>
          !q ||
          (p.name ?? "").toLowerCase().includes(q) ||
          (p.barcode ?? "").includes(q) ||
          (p.code ?? "").includes(q)
      )
      .map((p) => {
        const vatRate = Number(p.vat_rate ?? 20);
        const cost = Number(p.purchase_price ?? 0);
        const rawSale = Number(p.sale_price ?? 0);
        const saleGross = p.sale_price_includes_vat ? rawSale : rawSale * (1 + vatRate / 100);
        const r = calcMarketplace(cost, saleGross, vatRate, inputs);
        return { id: p.id, name: String(p.name ?? ""), code: p.barcode || p.code || "", cost, saleGross, vatRate, r };
      })
      .sort((a, b) => a.r.margin - b.r.margin);
  }, [productsData, inputs, search]);

  const losing = rows.filter((x) => x.saleGross > 0 && x.r.profit < 0).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-[#00b49c] text-white flex items-center justify-center shadow-md shadow-[#00b49c]/25">
            <Store size={18} strokeWidth={2.5} />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Pazaryeri Kârlılık
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Stoktaki ürünlerinizin gerçek alış fiyatıyla, pazaryerinde satılırsa net kârını hesaplar. Komisyon ve
          kargo değerleri başlangıç varsayımıdır; kendi pazaryeri tarifenize göre değiştirin.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 dark:border-[#182c37] bg-white dark:bg-[#101e26] p-4 space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {MARKETPLACE_PRESETS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => pickPreset(m.id)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition",
                preset === m.id
                  ? "bg-[#00b49c] text-white"
                  : "bg-slate-100 dark:bg-[#14232c] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              {m.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {FIELDS.map((f) => (
            <label key={f.key} className="space-y-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              <span>{f.label}</span>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={inputs[f.key]}
                  onChange={(e) => setField(f.key, e.target.value)}
                  className="w-full h-9 pl-3 pr-7 rounded-xl bg-white dark:bg-[#12202a] border border-slate-200 dark:border-[#182c37] text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-[#00b49c]"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">{f.suffix}</span>
              </div>
            </label>
          ))}
        </div>
        <p className="text-[11px] text-slate-400">
          Komisyon, kargo ve reklam faturalarındaki %20 KDV indirilebilir kabul edilir. Komisyon KDV dahil satış fiyatı
          üzerinden alınır.
        </p>
      </section>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Ürün adı, barkod veya kod ile ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-xl bg-white dark:bg-[#12202a] border border-slate-200 dark:border-[#182c37] text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-[#00b49c]"
          />
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          <strong>{rows.length}</strong> ürün
          {losing > 0 && (
            <>
              {" · "}
              <strong className="text-rose-500">{losing}</strong> ürün bu ayarlarla zararda
            </>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400 dark:text-slate-500">
          <Calculator size={40} className="mb-3 opacity-30" />
          <p className="text-sm font-semibold">Alış fiyatı girilmiş ürün bulunamadı</p>
          <p className="text-xs mt-1">Stok → Ürün ve Hizmetler bölümünden ürünlerinize alış fiyatı ekleyin.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-[#182c37] bg-white dark:bg-[#101e26] shadow-sm">
          <table className="w-full text-left text-xs min-w-[820px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-[#182c37] text-[10.5px] font-extrabold uppercase text-slate-400 bg-slate-50/70 dark:bg-[#0d1820]">
                <th className="py-3 px-4">Ürün</th>
                <th className="py-3 px-3 text-right">Alış (KDV hariç)</th>
                <th className="py-3 px-3 text-right">Mevcut satış (KDV dahil)</th>
                <th className="py-3 px-3 text-right">Net kâr</th>
                <th className="py-3 px-3 text-right">Marj</th>
                <th className="py-3 px-3 text-right">Başabaş fiyat</th>
                <th className="py-3 px-4 text-right">Önerilen fiyat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#152733]">
              {rows.map(({ id, name, code, cost, saleGross, r }) => {
                const hasSale = saleGross > 0;
                const loss = hasSale && r.profit < 0;
                return (
                  <tr key={id} className="hover:bg-slate-50/80 dark:hover:bg-[#13222c] transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{name}</div>
                      {code && <div className="text-[11px] text-slate-400 font-mono mt-0.5">{code}</div>}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums font-semibold">{formatMoney(cost)}</td>
                    <td className="py-3 px-3 text-right tabular-nums">
                      {hasSale ? formatMoney(saleGross) : <span className="text-slate-400 italic">Girilmemiş</span>}
                    </td>
                    <td
                      className={cn(
                        "py-3 px-3 text-right tabular-nums font-bold",
                        !hasSale ? "text-slate-400" : loss ? "text-rose-500" : "text-emerald-600 dark:text-emerald-400"
                      )}
                    >
                      {hasSale ? (
                        <span className="inline-flex items-center gap-1">
                          {loss ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
                          {formatMoney(r.profit)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums">{hasSale ? pct(r.margin) : "—"}</td>
                    <td className="py-3 px-3 text-right tabular-nums text-slate-500">
                      {r.breakEven ? formatMoney(r.breakEven) : "—"}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums font-bold text-[#00b49c]">
                      {r.suggested ? formatMoney(Math.ceil(r.suggested)) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
