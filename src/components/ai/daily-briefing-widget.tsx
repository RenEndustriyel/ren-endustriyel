"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sun,
  Sparkles,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  Receipt,
  MessageSquare,
  Package,
  Layers,
  CheckCircle2,
  Calendar,
  Building2,
  ChevronRight,
  Clock,
  Send,
  AlertCircle,
  Lightbulb,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useOrg } from "@/providers/org-provider";
import {
  generateDailyBriefing,
  type RenAiDailyBriefing,
  type DueItem,
  type SlowMovingProduct,
} from "@/lib/ren-ai-briefing";

export function DailyBriefingWidget({
  variant = "full", // "full" (sayfa için) veya "banner" (dashboard için)
}: {
  variant?: "full" | "banner";
}) {
  const router = useRouter();
  const { org } = useOrg();
  const [briefing, setBriefing] = React.useState<RenAiDailyBriefing | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [activeSection, setActiveSection] = React.useState<"collections" | "payments" | "top" | "slow">("slow");

  const loadData = React.useCallback(async () => {
    if (!org?.id) return;
    setLoading(true);
    try {
      const res = await generateDailyBriefing(org.id);
      setBriefing(res);
    } catch (err) {
      console.error("Brifing yükleme hatası:", err);
    } finally {
      setLoading(false);
    }
  }, [org?.id]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading && variant === "banner") {
    return (
      <div className="flex h-14 animate-pulse items-center justify-between rounded-xl border border-purple-500/20 bg-purple-500/5 px-4 text-xs text-muted">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 animate-spin text-purple-600" />
          <span>REN Yapay Zeka Günlük Sabah Brifingi hazırlanıyor...</span>
        </div>
      </div>
    );
  }

  if (!briefing) return null;

  const handleSendReminderWhatsapp = (item: DueItem) => {
    const text = `Sayın ${item.contactName} Yetkilisi,\n\n${item.dueDate} vadeli, ${item.docNumber} numaralı ${formatMoney(item.amount)} tutarındaki faturanızın vadesi dolmuştur. Ödemenizi rica eder, iyi çalışmalar dileriz.\n\nRen Endüstriyel`;
    navigator.clipboard.writeText(text);
    toast.success(`${item.contactName} için ödeme hatırlatma metni kopyalandı!`);
  };

  const handleCreateCampaignQuote = (prod: SlowMovingProduct) => {
    // Satış teklifi sayfasına kampanyalı ürünle yönlendir
    const params = new URLSearchParams({
      cari: "",
      aciklama: `${prod.name} (${prod.aiCampaignTitle})`,
      tutar: String(Math.round(prod.salePrice * (1 - prod.suggestedDiscountRate / 100))),
      iskonto: String(prod.suggestedDiscountRate),
    });
    router.push(`/satislar/teklifler/yeni?${params.toString()}`);
  };

  // DASHBOARD İÇİN HIZLI BANNER GÖRÜNÜMÜ
  if (variant === "banner") {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-500/15 via-indigo-500/10 to-transparent p-3.5 shadow-sm transition-all hover:border-purple-500/50">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-md">
              <Sun className="size-5 text-amber-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-purple-700 dark:text-purple-300 tracking-wide uppercase">
                  GÜNLÜK SABAH BRİFİNGİ
                </span>
                <span className="text-[11px] text-muted">· {briefing.formattedDate}</span>
              </div>
              <p className="mt-0.5 text-xs text-text/90 line-clamp-1">
                {briefing.totalExpectedInflow > 0 && `Tahsilat: ${formatMoney(briefing.totalExpectedInflow)} · `}
                {briefing.totalExpectedOutflow > 0 && `Ödeme: ${formatMoney(briefing.totalExpectedOutflow)} · `}
                {briefing.slowMoving.length > 0 && `${briefing.slowMoving.length} üründe kampanya önerisi`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <Button
              size="sm"
              onClick={() => router.push("/yapay-zeka?tab=briefing")}
              className="h-8 gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-semibold shadow-xs"
            >
              <Sparkles className="size-3.5" />
              <span>Brifingi İncele</span>
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // TAM DETAYLI YÖNETİCİ BRİFİNGİ (YAPAY ZEKA SAYFASI İÇİN)
  return (
    <div className="space-y-4">
      {/* 1. YÖNETİCİ ÖZET KARTI */}
      <Card className="relative overflow-hidden border-purple-500/30 bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-transparent p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-lg">
            <Sun className="size-6 text-amber-300 animate-spin-slow" />
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                  REN YAPAY ZEKA YÖNETİCİ BRİFİNGİ
                </span>
                <span className="rounded-full bg-purple-500/15 px-2 py-0.5 text-[10.5px] font-bold text-purple-700 dark:text-purple-300">
                  CANLI RAPOR
                </span>
              </div>
              <span className="text-xs text-muted font-medium flex items-center gap-1.5">
                <Calendar className="size-3.5 text-muted" />
                {briefing.formattedDate}
              </span>
            </div>

            <div className="mt-2 text-xs sm:text-sm text-text/90 leading-relaxed font-normal bg-surface/60 rounded-xl p-3 border border-border/80">
              💡 {briefing.executiveSummary}
            </div>
          </div>
        </div>
      </Card>

      {/* 2. DÖRT ANA BRİFİNG KARTI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <button
          type="button"
          onClick={() => setActiveSection("collections")}
          className={cn(
            "rounded-xl border p-3.5 text-left transition-all",
            activeSection === "collections"
              ? "border-emerald-500 bg-emerald-500/10 shadow-xs ring-1 ring-emerald-500/30"
              : "border-border bg-surface hover:border-emerald-500/40",
          )}
        >
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Günün Tahsilatları</span>
            <TrendingUp className="size-4 text-emerald-600" />
          </div>
          <div className="mt-2 font-mono text-lg font-bold text-emerald-600 dark:text-emerald-400">
            {formatMoney(briefing.totalExpectedInflow)}
          </div>
          <div className="mt-0.5 text-[11px] text-muted">
            {briefing.todayCollections.length} müşteri faturası
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection("payments")}
          className={cn(
            "rounded-xl border p-3.5 text-left transition-all",
            activeSection === "payments"
              ? "border-red-500 bg-red-500/10 shadow-xs ring-1 ring-red-500/30"
              : "border-border bg-surface hover:border-red-500/40",
          )}
        >
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Günün Ödemeleri</span>
            <TrendingDown className="size-4 text-red-600" />
          </div>
          <div className="mt-2 font-mono text-lg font-bold text-red-600 dark:text-red-400">
            {formatMoney(briefing.totalExpectedOutflow)}
          </div>
          <div className="mt-0.5 text-[11px] text-muted">
            {briefing.todayPayments.length} tedarikçi ödemesi
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection("top")}
          className={cn(
            "rounded-xl border p-3.5 text-left transition-all",
            activeSection === "top"
              ? "border-indigo-500 bg-indigo-500/10 shadow-xs ring-1 ring-indigo-500/30"
              : "border-border bg-surface hover:border-indigo-500/40",
          )}
        >
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Çok Satanlar (30 Gün)</span>
            <Sparkles className="size-4 text-indigo-500" />
          </div>
          <div className="mt-2 font-mono text-lg font-bold text-text">
            {briefing.topSellers.length} Ürün
          </div>
          <div className="mt-0.5 text-[11px] text-muted">Yüksek satış trendi</div>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection("slow")}
          className={cn(
            "rounded-xl border p-3.5 text-left transition-all",
            activeSection === "slow"
              ? "border-amber-500 bg-amber-500/10 shadow-xs ring-1 ring-amber-500/30"
              : "border-border bg-surface hover:border-amber-500/40",
          )}
        >
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Hareketsiz Stok / Fikir</span>
            <Lightbulb className="size-4 text-amber-500" />
          </div>
          <div className="mt-2 font-mono text-lg font-bold text-amber-700 dark:text-amber-400">
            {formatMoney(briefing.totalIdleCapital)}
          </div>
          <div className="mt-0.5 text-[11px] text-muted">
            {briefing.slowMoving.length} üründe kampanya fikri
          </div>
        </button>
      </div>

      {/* 3. AKTİF BÖLÜMÜN DETAYLI LİSTESİ */}
      {/* A) HAREKETSİZ STOKLAR VE YAPAY ZEKA KAMPANYA FİKİRLERİ */}
      {activeSection === "slow" && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <div>
              <div className="font-bold text-sm text-text flex items-center gap-2">
                <Lightbulb className="size-4 text-amber-500" />
                Hareketsiz Stoklar & Yapay Zeka Kampanya Önerileri
              </div>
              <p className="text-[11px] text-muted mt-0.5">
                Son 30 gündür satılmayan ve depoda sermaye bağlayan ürünler için kâr artırıcı kampanya fikirleri.
              </p>
            </div>
            <span className="font-mono text-xs font-bold text-amber-700 dark:text-amber-300">
              Toplam Bağlı Sermaye: {formatMoney(briefing.totalIdleCapital)}
            </span>
          </div>

          {briefing.slowMoving.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted">
              Tüm ürünleriniz aktif olarak satılıyor, uzun süredir hareketsiz kalan stok bulunamadı!
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {briefing.slowMoving.map((prod) => (
                <div
                  key={prod.id}
                  className="rounded-xl border border-border bg-surface p-3.5 space-y-2.5 transition-all hover:border-amber-400/50 hover:shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs text-text truncate">{prod.name}</div>
                      <div className="text-[10.5px] text-muted flex items-center gap-2 mt-0.5">
                        <span>Mevcut: <strong>{prod.stockQty} Adet</strong></span>
                        <span>·</span>
                        <span>Alış: {formatMoney(prod.purchasePrice)}</span>
                        <span>·</span>
                        <span>Satış: {formatMoney(prod.salePrice)}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-[10px] text-muted">Bağlı Sermaye</div>
                      <div className="font-mono text-xs font-bold text-amber-700 dark:text-amber-400">
                        {formatMoney(prod.idleCapital)}
                      </div>
                    </div>
                  </div>

                  {/* AI Kampanya Önerisi */}
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-2 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-[11px] text-amber-900 dark:text-amber-300">
                      <Sparkles className="size-3 text-amber-500" />
                      {prod.aiCampaignTitle} (%{prod.suggestedDiscountRate} İskonto)
                    </div>
                    <div className="text-[11px] text-text/80 mt-1 leading-relaxed">
                      {prod.aiCampaignIdea}
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleCreateCampaignQuote(prod)}
                      className="text-xs h-7 gap-1 bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      <Receipt className="size-3" />
                      <span>Kampanyalı Teklif Hazırla</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* B) GÜNÜN VE VADESİ GEÇEN TAHSİLATLARI */}
      {activeSection === "collections" && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <div>
              <div className="font-bold text-sm text-text flex items-center gap-2">
                <TrendingUp className="size-4 text-emerald-600" />
                Günün & Vadesi Geçen Müşteri Tahsilatları
              </div>
              <p className="text-[11px] text-muted mt-0.5">
                Bugün beklenen veya vadesi geciken müşteri alacakları.
              </p>
            </div>
            <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
              Toplam Beklenen: {formatMoney(briefing.totalExpectedInflow)}
            </span>
          </div>

          {briefing.todayCollections.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted">
              Bugün için vadesi gelmiş veya gecikmiş müşteri alacağı bulunmuyor!
            </div>
          ) : (
            <div className="divide-y divide-border">
              {briefing.todayCollections.map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-text">{item.contactName}</span>
                      {item.isOverdue ? (
                        <span className="rounded bg-red-500/15 px-1.5 py-0.2 text-[10px] font-bold text-red-600">
                          {item.daysDiff} Gün Gecikti
                        </span>
                      ) : (
                        <span className="rounded bg-emerald-500/15 px-1.5 py-0.2 text-[10px] font-bold text-emerald-600">
                          Bugün Vadeli
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted mt-0.5">
                      Fatura: {item.docNumber} · Vade: {item.dueDate}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="font-mono text-sm font-bold text-text">
                      {formatMoney(item.amount)}
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleSendReminderWhatsapp(item)}
                      className="text-xs h-7 gap-1"
                      title="Müşteriye WhatsApp hatırlatması kopyalar"
                    >
                      <MessageSquare className="size-3 text-emerald-600" />
                      <span className="hidden sm:inline">WhatsApp Hatırlat</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* C) GÜNÜN VE VADESİ GEÇEN ÖDEMELERİ */}
      {activeSection === "payments" && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <div>
              <div className="font-bold text-sm text-text flex items-center gap-2">
                <TrendingDown className="size-4 text-red-600" />
                Günün & Vadesi Gelen Tedarikçi Ödemeleri
              </div>
              <p className="text-[11px] text-muted mt-0.5">
                Bugün veya öncesinde vadesi gelmiş tedarikçi borçları.
              </p>
            </div>
            <span className="font-mono text-xs font-bold text-red-600 dark:text-red-400">
              Toplam Ödenecek: {formatMoney(briefing.totalExpectedOutflow)}
            </span>
          </div>

          {briefing.todayPayments.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted">
              Bugün için vadesi gelmiş veya gecikmiş tedarikçi borcu bulunmuyor!
            </div>
          ) : (
            <div className="divide-y divide-border">
              {briefing.todayPayments.map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-text">{item.contactName}</span>
                      {item.isOverdue && (
                        <span className="rounded bg-red-500/15 px-1.5 py-0.2 text-[10px] font-bold text-red-600">
                          {item.daysDiff} Gün Gecikti
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted mt-0.5">
                      Fatura: {item.docNumber} · Vade: {item.dueDate}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="font-mono text-sm font-bold text-red-600 dark:text-red-400">
                      {formatMoney(item.amount)}
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => router.push("/nakit/hareketler/yeni?tip=odeme")}
                      className="text-xs h-7"
                    >
                      Ödeme Yap
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* D) ÇOK SATANLAR VE HIZLI TÜKENENLER */}
      {activeSection === "top" && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <div>
              <div className="font-bold text-sm text-text flex items-center gap-2">
                <Sparkles className="size-4 text-indigo-500" />
                En Çok Satan Ürünler & Stok Tükenme Öngörüsü
              </div>
              <p className="text-[11px] text-muted mt-0.5">
                Son 30 günün en çok ciro getiren ürünleri ve tahmini stok tükenme süresi.
              </p>
            </div>
          </div>

          {briefing.topSellers.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted">
              Son 30 günde satış kaydı bulunamadı.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {briefing.topSellers.map((item, idx) => {
                const isCriticalDays = item.daysOfStockLeft <= 7;
                return (
                  <div key={item.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary font-bold text-xs">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="font-semibold text-xs text-text truncate">{item.name}</div>
                        <div className="text-[11px] text-muted mt-0.5">
                          Satış: <strong>{item.soldQty} Adet</strong> · Günlük Hız: ~{item.dailyBurnRate} adet/gün
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono text-xs font-bold text-text">
                        {formatMoney(item.totalRevenue)}
                      </div>
                      <div className="text-[10.5px]">
                        Stok: <strong>{item.stockQty}</strong> ·{" "}
                        <span className={cn(isCriticalDays ? "text-red-500 font-bold" : "text-muted")}>
                          {item.daysOfStockLeft < 999 ? `~${item.daysOfStockLeft} gün yetecek` : "Yeterli"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
