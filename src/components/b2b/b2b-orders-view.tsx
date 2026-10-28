"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Clock,
  Package,
  Truck,
  CheckCircle2,
  FileText,
  ChevronDown,
  ChevronUp,
  RotateCw,
  Search,
  ShoppingCart,
  Calendar,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Building2,
} from "lucide-react";
import { useRows, type Row } from "@/lib/data";
import { formatDate, formatMoney } from "@/lib/format";
import { useOrg } from "@/providers/org-provider";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Doc = Row<"documents"> & {
  lines?: {
    id: string;
    product_id?: string | null;
    description: string;
    quantity: number;
    unit_price: number;
    vat_rate?: number;
    total_amount?: number;
  }[];
  contact?: {
    name: string;
    phone?: string | null;
    email?: string | null;
  } | null;
};

// Sipariş durumu adımları
const STEPS = [
  { key: "received", label: "Sipariş Alındı", desc: "Siparişiniz sisteme ulaştı", icon: Clock },
  { key: "preparing", label: "Hazırlanıyor", desc: "Depomuzda hazırlanıyor", icon: Package },
  { key: "shipped", label: "Kargoda / Sevk", desc: "Sevkiyata çıkarıldı", icon: Truck },
  { key: "delivered", label: "Teslim Edildi", desc: "Müşteriye teslim edildi", icon: CheckCircle2 },
];

function getStepIndex(status: string | null) {
  switch (status) {
    case "pending":
      return 1; // Hazırlanıyor
    case "approved":
      return 1; // Hazırlanıyor
    case "sent":
      return 2; // Kargoda / Sevk
    case "accepted":
      return 3; // Teslim edildi
    case "converted":
      return 3; // Faturalaştı (teslim edildi aşamasını geçmiş)
    case "cancelled":
      return -1; // İptal
    default:
      return 0; // Alındı
  }
}

function getStatusBadge(status: string | null) {
  switch (status) {
    case "pending":
      return {
        label: "Sipariş Alındı / Hazırlanıyor",
        className: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200",
        dotColor: "bg-amber-500",
      };
    case "approved":
      return {
        label: "Onaylandı & Hazırlanıyor",
        className: "bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200",
        dotColor: "bg-sky-500",
      };
    case "sent":
      return {
        label: "Kargoya / Sevkiyata Verildi",
        className: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200",
        dotColor: "bg-indigo-500",
      };
    case "accepted":
      return {
        label: "Teslim Edildi",
        className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200",
        dotColor: "bg-emerald-500",
      };
    case "converted":
      return {
        label: "Faturalaştı & Tamamlandı",
        className: "bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border-violet-200",
        dotColor: "bg-violet-500",
      };
    case "cancelled":
      return {
        label: "İptal Edildi",
        className: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200",
        dotColor: "bg-rose-500",
      };
    default:
      return {
        label: "İnceleniyor",
        className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200",
        dotColor: "bg-slate-400",
      };
  }
}

export function B2BOrdersView() {
  const router = useRouter();
  const { user } = useAuth();
  const { org, b2bContactId } = useOrg();
  const [q, setQ] = React.useState("");
  const [filterTab, setFilterTab] = React.useState<"all" | "active" | "completed">("all");
  const [expandedOrders, setExpandedOrders] = React.useState<Record<string, boolean>>({});

  // Belgeler tablosundan B2B kullanıcısına ait satış siparişlerini çek
  const ordersQuery = useRows<Doc>("documents", {
    select: "*, contact:contacts(name, phone, email), lines:document_lines(*)",
    params: [org?.id, b2bContactId, user?.id],
    filter: (x) => {
      let q = x.is("deleted_at", null).eq("doc_type", "sales_order");
      // Eğer cari bağlantısı varsa o cariye ait siparişler; yoksa kullanıcının kendi oluşturduğu siparişler
      if (b2bContactId) {
        q = q.eq("contact_id", b2bContactId);
      }
      return q;
    },
    order: [
      { column: "issue_date", ascending: false },
      { column: "created_at", ascending: false },
    ],
  });

  const toggleExpand = (orderId: string) => {
    setExpandedOrders((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  // Tekrar sipariş ver (Sepete doldur)
  const handleReorder = (order: Doc) => {
    if (!order.lines || order.lines.length === 0) return;
    try {
      const storageKey = `ren_b2b_cart_${org?.id || "default"}`;
      // Mevcut sepeti al veya yeni oluştur
      let currentCart: any[] = [];
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) currentCart = JSON.parse(saved);
      } catch {}

      for (const line of order.lines) {
        if (!line.product_id) continue;
        const existingIdx = currentCart.findIndex((c) => c.id === line.product_id);
        if (existingIdx >= 0) {
          currentCart[existingIdx].quantity += line.quantity;
        } else {
          currentCart.push({
            id: line.product_id,
            product: {
              id: line.product_id,
              name: line.description,
              sale_price: line.unit_price,
              vat_rate: line.vat_rate ?? 20,
              sale_price_includes_vat: true,
            },
            quantity: line.quantity,
          });
        }
      }

      localStorage.setItem(storageKey, JSON.stringify(currentCart));
      toast.success("Siparişteki ürünler sepetinize eklendi!");
      router.push("/urunler");
    } catch {
      toast.error("Ürünler sepete eklenemedi");
    }
  };

  // Filtrelenmiş liste
  const filteredOrders = React.useMemo(() => {
    const list = ordersQuery.data ?? [];
    return list.filter((order) => {
      // Sekme filtresi
      const isCompleted = order.status === "accepted" || order.status === "converted";
      const isCancelled = order.status === "cancelled";
      if (filterTab === "active" && (isCompleted || isCancelled)) return false;
      if (filterTab === "completed" && !isCompleted) return false;

      // Arama
      if (q.trim()) {
        const query = q.toLowerCase();
        const matchesNum = order.number?.toLowerCase().includes(query);
        const matchesDesc = order.description?.toLowerCase().includes(query);
        const matchesLine = order.lines?.some((l) => l.description?.toLowerCase().includes(query));
        if (!matchesNum && !matchesDesc && !matchesLine) return false;
      }

      return true;
    });
  }, [ordersQuery.data, filterTab, q]);

  return (
    <div className="min-h-[calc(100vh-4rem)] pb-24">
      {/* Üst Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-md">
              <Clock size={13} className="text-brand-300" />
              <span>Canlı Takip Paneli</span>
            </div>
            <h1 className="mt-2 text-2xl md:text-3xl font-extrabold tracking-tight">
              Siparişlerim ve Süreç Takibi
            </h1>
            <p className="mt-1 text-sm text-slate-300 max-w-xl">
              Verdiğiniz tüm siparişleri, hazırlık ve kargo durumlarını anlık olarak canlı takip edebilirsiniz.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/urunler">
              <Button className="bg-brand-600 hover:bg-brand-700 text-white font-bold">
                <ShoppingCart size={16} className="mr-2" />
                Yeni Sipariş Ver
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Arama ve Durum Sekmeleri */}
      <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setFilterTab("all")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition",
              filterTab === "all"
                ? "bg-brand-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            Tüm Siparişler ({ordersQuery.data?.length ?? 0})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("active")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition",
              filterTab === "active"
                ? "bg-brand-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            Hazırlanan / Yoldaki Siparişler
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("completed")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition",
              filterTab === "completed"
                ? "bg-brand-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            Teslim Edilenler
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Sipariş no veya ürün ara..."
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {/* Sipariş Listesi */}
      {ordersQuery.isPending ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-44 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
          <Package size={48} className="text-slate-300 dark:text-slate-600 mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            {filterTab === "active" ? "Aktif bir siparişiniz bulunmuyor" : "Henüz bir sipariş kaydı bulunmuyor"}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Kataloğumuzdan dilediğiniz ürünleri inceleyip sepete ekleyerek hemen yeni bir sipariş oluşturabilirsiniz.
          </p>
          <Link href="/urunler" className="mt-4">
            <Button className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs">
              <ShoppingCart size={15} className="mr-1.5" />
              Ürün Kataloğuna Git
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const badge = getStatusBadge(order.status);
            const activeStepIdx = getStepIndex(order.status);
            const isExpanded = !!expandedOrders[order.id];
            const linesCount = order.lines?.length ?? 0;

            return (
              <div
                key={order.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden transition hover:shadow-md"
              >
                {/* Kart Başlığı */}
                <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold">
                        <Package size={22} className="text-brand-600 dark:text-brand-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-extrabold text-slate-900 dark:text-slate-100">
                            {order.number || "SIP-TANIMSIZ"}
                          </span>
                          <span className="text-xs text-slate-400">·</span>
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Calendar size={13} />
                            {formatDate(order.issue_date)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {order.description || "Satış Siparişi"} · {linesCount} Kalem
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <div className="text-right">
                        <div className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-50 tracking-tight">
                          {formatMoney(order.total ?? 0, order.currency || "TRY")}
                        </div>
                        <div className="text-[10px] text-slate-400">KDV Dahil Toplam</div>
                      </div>

                      <Badge
                        tone="neutral"
                        className={cn("px-2.5 py-1 text-xs font-semibold flex items-center gap-1.5", badge.className)}
                      >
                        <span className={cn("h-1.5 w-1.5 rounded-full animate-pulse", badge.dotColor)} />
                        {badge.label}
                      </Badge>
                    </div>
                  </div>

                  {/* Canlı Adım Takip Çubuğu (Stepper) */}
                  {order.status !== "cancelled" ? (
                    <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
                      <div className="relative">
                        {/* Arka plan bağlantı çizgisi */}
                        <div className="absolute top-4 left-6 right-6 h-0.5 bg-slate-100 dark:bg-slate-800 hidden sm:block" />
                        <div
                          className="absolute top-4 left-6 h-0.5 bg-emerald-500 transition-all duration-500 hidden sm:block"
                          style={{
                            width: `${(Math.max(0, activeStepIdx) / (STEPS.length - 1)) * 100}%`,
                          }}
                        />

                        {/* Adımlar */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-2 relative z-10">
                          {STEPS.map((step, idx) => {
                            const isCompleted = idx < activeStepIdx;
                            const isCurrent = idx === activeStepIdx;
                            const isUpcoming = idx > activeStepIdx;
                            const Icon = step.icon;

                            return (
                              <div
                                key={step.key}
                                className={cn(
                                  "flex flex-col items-center text-center p-2 rounded-xl transition",
                                  isCurrent
                                    ? "bg-brand-50/70 dark:bg-brand-950/40 ring-1 ring-brand-500/30"
                                    : ""
                                )}
                              >
                                <div
                                  className={cn(
                                    "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition shadow-sm",
                                    isCompleted
                                      ? "bg-emerald-500 text-white"
                                      : isCurrent
                                      ? "bg-brand-600 text-white ring-4 ring-brand-100 dark:ring-brand-950"
                                      : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                                  )}
                                >
                                  {isCompleted ? <CheckCircle2 size={16} /> : <Icon size={14} />}
                                </div>
                                <span
                                  className={cn(
                                    "mt-2 text-xs font-bold leading-tight",
                                    isCurrent
                                      ? "text-brand-600 dark:text-brand-400"
                                      : isCompleted
                                      ? "text-slate-800 dark:text-slate-200"
                                      : "text-slate-400"
                                  )}
                                >
                                  {step.label}
                                </span>
                                <span className="text-[10px] text-slate-400 mt-0.5 hidden sm:block">
                                  {step.desc}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                      <AlertCircle size={16} className="shrink-0" />
                      <span>Bu sipariş iptal edilmiştir. Yeni bir sipariş oluşturmak isterseniz kataloğu ziyaret edebilirsiniz.</span>
                    </div>
                  )}
                </div>

                {/* Kart Alt Çubuğu & Detay Açma */}
                <div className="bg-slate-50/60 dark:bg-slate-900/60 px-4 py-3 flex items-center justify-between gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => toggleExpand(order.id)}
                    className="flex items-center gap-1.5 font-semibold text-slate-600 dark:text-slate-300 hover:text-brand-600 transition"
                  >
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    <span>{isExpanded ? "Ürünleri Gizle" : `Sipariş Edilen Ürünleri Gör (${linesCount} Kalem)`}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReorder(order)}
                      className="text-xs h-8 border-slate-200 dark:border-slate-700"
                    >
                      <RotateCw size={13} className="mr-1.5" />
                      Yeniden Sipariş Ver
                    </Button>
                  </div>
                </div>

                {/* Açılır Kalem Detayları */}
                {isExpanded && (
                  <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950/40">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3">
                      Sipariş Kalemleri
                    </h4>

                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden mb-4">
                      {order.lines && order.lines.length > 0 ? (
                        order.lines.map((line, idx) => (
                          <div key={line.id || idx} className="flex items-center justify-between p-3 text-xs gap-3">
                            <div className="flex-1 min-w-0">
                              <span className="font-semibold text-slate-900 dark:text-slate-100">
                                {line.description}
                              </span>
                              <div className="text-[11px] text-slate-400">
                                Birim Fiyat: {formatMoney(line.unit_price, order.currency || "TRY")}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-slate-700 dark:text-slate-300 mr-4">
                                {line.quantity} Adet
                              </span>
                              <span className="font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
                                {formatMoney(line.unit_price * line.quantity, order.currency || "TRY")}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-xs text-slate-400 italic">Kalem bilgisi bulunamadı.</div>
                      )}
                    </div>

                    {/* Müşteri Notu veya Kargo Açıklaması */}
                    {order.notes && (
                      <div className="rounded-xl bg-slate-50 dark:bg-slate-900 p-3 text-xs text-slate-600 dark:text-slate-400">
                        <span className="font-bold text-slate-800 dark:text-slate-200">Sipariş Notunuz: </span>
                        {order.notes}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
