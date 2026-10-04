"use client";

import * as React from "react";
import {
  Sparkles,
  Store,
  Flame,
  Zap,
  Package,
  Search,
  SlidersHorizontal,
  TrendingUp,
  Calculator,
} from "lucide-react";
import { SmartPricingCard } from "@/components/pricing/smart-pricing-card";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useProducts, useUpdate } from "@/lib/data";

type SelectedProduct = {
  id?: string;
  name: string;
  barcode: string;
  purchasePrice: number;
  vatRate: number;
};

export default function SmartPricingPage() {
  const productsQuery = useProducts();
  const products = productsQuery.data ?? [];
  const updateProduct = useUpdate("products");

  const [activeTab, setActiveTab] = React.useState<"calculator" | "stock">("calculator");
  const [searchFilter, setSearchFilter] = React.useState("");
  const [selectedProduct, setSelectedProduct] = React.useState<SelectedProduct>({
    name: "",
    barcode: "",
    purchasePrice: 0,
    vatRate: 20,
  });

  // Stok filtrelemesi — alış fiyatı girilmiş ürünler
  const filteredProducts = React.useMemo(() => {
    const hasPrice = products.filter((p) => Number(p.purchase_price ?? 0) > 0);
    if (!searchFilter.trim()) return hasPrice;
    const q = searchFilter.toLowerCase();
    return hasPrice.filter(
      (p) =>
        (p.name ?? "").toLowerCase().includes(q) ||
        (p.barcode ?? "").includes(q) ||
        (p.code ?? "").includes(q)
    );
  }, [products, searchFilter]);

  const handleSelectProduct = (p: (typeof products)[0]) => {
    setSelectedProduct({
      id: p.id,
      name: String(p.name ?? ""),
      barcode: String(p.barcode ?? ""),
      purchasePrice: Number(p.purchase_price ?? 0),
      vatRate: Number(p.vat_rate ?? 20),
    });
    setActiveTab("calculator");
    toast.info(`${p.name} hesaplayıcıya yüklendi.`);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Üst Başlık */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-[#00b49c] text-white flex items-center justify-center shadow-md shadow-[#00b49c]/25">
              <Calculator size={18} strokeWidth={2.5} />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Akıllı Satış Fiyatlandırma
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Gerçek alış maliyeti, dükkân gider payı (%12–15) ve hedef kâr marjına göre optimum satış fiyatı hesabı.
          </p>
        </div>

        {/* Sekmeler */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-[#14232c] border border-slate-200 dark:border-[#1e3544] self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab("calculator")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
              activeTab === "calculator"
                ? "bg-[#00b49c] text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <Calculator size={13} />
            <span>Fiyat Hesaplayıcı</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("stock")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
              activeTab === "stock"
                ? "bg-[#00b49c] text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <Package size={13} />
            <span>Stoktan Seç</span>
            {filteredProducts.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 dark:bg-[#1e3544] font-extrabold text-slate-600 dark:text-slate-300">
                {filteredProducts.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* TAB: Fiyat Hesaplayıcı */}
      {activeTab === "calculator" && (
        <div className="space-y-6">
          <SmartPricingCard
            key={`${selectedProduct.id}-${selectedProduct.purchasePrice}`}
            initialProductName={selectedProduct.name}
            initialBarcode={selectedProduct.barcode}
            initialPurchasePrice={selectedProduct.purchasePrice}
            initialVatRate={selectedProduct.vatRate}
            productId={selectedProduct.id}
            onApplyPrice={(price, isVatInc) => {
              if (selectedProduct.name) {
                toast.success(
                  `${selectedProduct.name} için ${formatMoney(price)} ${isVatInc ? "KDV Dahil" : "KDV Hariç"} fiyat uygulandı!`
                );
              }
            }}
          />

          {/* Motor Çalışma İlkeleri */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-[#182c37] bg-white dark:bg-[#101e26] space-y-2 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                <Store size={16} className="text-[#00b49c]" />
                <span>1. Dükkân Operasyonel Gider Payı</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Yalnızca ürün faturasını değil; kira, elektrik, çalışan ve nakliye giderlerini (%12–15) taban maliyete ekleyerek gerçek başabaş noktanızı hesaplar.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-[#182c37] bg-white dark:bg-[#101e26] space-y-2 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                <TrendingUp size={16} className="text-emerald-500" />
                <span>2. Hedef Kâr Marjı</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Gider payı eklendikten sonra kalan net maliyet üzerine belirlediğiniz kâr marjı uygulanır. Standart %25, ancak ürün kategorisine göre ayarlayabilirsiniz.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-[#182c37] bg-white dark:bg-[#101e26] space-y-2 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                <Zap size={16} className="text-purple-500" />
                <span>3. Psikolojik Fiyat Yuvarlama</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Perakende satış standardına uygun olarak hesaplanan nihai KDV dahil fiyat otomatik olarak <strong>.90 kuruş</strong> bitişli profesyonel raf fiyatına dönüştürülür.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Stoktan Seç */}
      {activeTab === "stock" && (
        <div className="space-y-4">
          {/* Arama */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Ürün adı, barkod veya kod ile ara..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-xl bg-white dark:bg-[#12202a] border border-slate-200 dark:border-[#182c37] text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-[#00b49c]"
              />
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              <strong>{filteredProducts.length}</strong> ürün alış fiyatı girilmiş
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400 dark:text-slate-500">
              <Package size={40} className="mb-3 opacity-30" />
              <p className="text-sm font-semibold">Alış fiyatı girilmiş ürün bulunamadı</p>
              <p className="text-xs mt-1">
                Stok → Ürünler bölümünden ürünlerinize alış fiyatı ekleyebilirsiniz.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-[#182c37] bg-white dark:bg-[#101e26] shadow-sm">
              <table className="w-full text-left text-xs min-w-[600px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-[#182c37] text-[10.5px] font-extrabold uppercase text-slate-400 bg-slate-50/70 dark:bg-[#0d1820]">
                    <th className="py-3 px-4">ÜRÜN</th>
                    <th className="py-3 px-3 text-right">NET ALIŞ FİYATI</th>
                    <th className="py-3 px-3 text-right">MEVCUT SATIŞ</th>
                    <th className="py-3 px-3 text-right">KDV</th>
                    <th className="py-3 px-4 text-center">İŞLEM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#152733]">
                  {filteredProducts.map((p) => {
                    const purchasePrice = Number(p.purchase_price ?? 0);
                    const salePrice = Number(p.sale_price ?? 0);
                    const vatRate = Number(p.vat_rate ?? 20);
                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-[#13222c] transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                            {p.name}
                          </div>
                          {(p.barcode || p.code) && (
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                              {p.barcode || p.code}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-bold tabular-nums text-slate-800 dark:text-slate-200">
                          {formatMoney(purchasePrice)}
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums">
                          {salePrice > 0 ? (
                            <span className="font-semibold text-teal-600 dark:text-teal-400">
                              {formatMoney(salePrice)}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Girilmemiş</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-500 dark:text-slate-400 font-medium">
                          %{vatRate}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleSelectProduct(p)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#00b49c] hover:bg-[#009e89] text-white transition active:scale-95 cursor-pointer shadow-2xs"
                          >
                            <Calculator size={12} />
                            <span>Hesapla</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
