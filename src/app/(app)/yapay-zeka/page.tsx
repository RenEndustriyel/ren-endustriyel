"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Sun,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Receipt,
  MessageSquare,
  Copy,
  Check,
  Building2,
  Calendar,
  AlertTriangle,
  ArrowRight,
  Filter,
  Search,
  Bot,
  Send,
  RefreshCw,
  CheckCircle2,
  Clock,
  Layers,
  HelpCircle,
  Package,
  Lightbulb,
  Trash2,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useOrg } from "@/providers/org-provider";
import {
  RenAiDiscrepancy,
  getStoredAiAlerts,
  getAiStats,
  updateAiAlertStatus,
  saveAiAlerts,
  deleteAiAlert,
} from "@/lib/ren-ai";
import {
  generateDailyBriefing,
  type RenAiDailyBriefing,
} from "@/lib/ren-ai-briefing";
import { DailyBriefingWidget } from "@/components/ai/daily-briefing-widget";
import { useContacts, useProducts, useAccounts } from "@/lib/data";

export default function RenAiPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { org } = useOrg();
  const contacts = useContacts();
  const products = useProducts();
  const accounts = useAccounts();

  const initialTab = (searchParams.get("tab") as "briefing" | "alerts" | "assistant") || "briefing";
  const [activeTab, setActiveTab] = React.useState<"briefing" | "alerts" | "assistant">(initialTab);
  const [alerts, setAlerts] = React.useState<RenAiDiscrepancy[]>([]);
  const [filterType, setFilterType] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [briefingData, setBriefingData] = React.useState<RenAiDailyBriefing | null>(null);

  // Asistan Sohbet Durumları
  const [chatMessages, setChatMessages] = React.useState<
    { sender: "user" | "ai"; text: string; time: string; actionUrl?: string; actionText?: string }[]
  >([
    {
      sender: "ai",
      text: "Merhaba! Ben **REN Yapay Zeka Baş Finans ve Operasyon Danışmanınız (AI CFO)**. \n\nİşletmenizin bir kuruş dahi zarar etmemesi için her sabah **günlük tahsilat/ödeme brifingi** hazırlıyor, tedarikçi iskonto kaçaklarını denetliyor, **uzun süredir satılmayan ürünlere kâr artırıcı kampanya fikirleri** üretiyor ve **çok satan yıldız ürünlerinizi** takip ediyorum.\n\nAşağıdaki hızlı analiz butonlarından birini seçebilir veya serbestçe aklınıza gelen herhangi bir finansal konuyu sorabilirsiniz.",
      time: "Şimdi",
    },
  ]);
  const [chatInput, setChatInput] = React.useState("");
  const [isTyping, setIsTyping] = React.useState(false);

  // URL'den tab parametresi değişirse
  React.useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "briefing" || t === "alerts" || t === "assistant") {
      setActiveTab(t);
    }
  }, [searchParams]);

  // Yerel depodaki uyarıları yükle ve dinle
  const loadAlerts = React.useCallback(() => {
    const list = getStoredAiAlerts(org?.id);
    setAlerts(list);
  }, [org?.id]);

  React.useEffect(() => {
    loadAlerts();
    const handleUpdate = () => loadAlerts();
    window.addEventListener("ren_ai_alerts_updated", handleUpdate);
    return () => window.removeEventListener("ren_ai_alerts_updated", handleUpdate);
  }, [loadAlerts]);

  // Canlı brifing verisini önceden asistan için de çek
  React.useEffect(() => {
    if (org?.id) {
      generateDailyBriefing(org.id).then(setBriefingData).catch(console.error);
    }
  }, [org?.id]);

  const stats = React.useMemo(() => getAiStats(alerts), [alerts]);

  // Filtreleme: Çözüldü olarak işaretlenenler aktif listeden kaldırılır
  const filteredAlerts = React.useMemo(() => {
    return alerts.filter((a) => {
      // Çözüldü olarak işaretlenenler varsayılan olarak tüm aktif filtrelerden kaldırılır
      if (filterType !== "resolved" && a.status === "accepted") return false;
      if (filterType === "resolved" && a.status !== "accepted") return false;

      if (filterType === "pending" && a.status !== "pending") return false;
      if (filterType === "invoiced" && a.status !== "invoiced") return false;
      if (filterType === "discount" && !a.type.includes("discount")) return false;
      if (filterType === "price" && !a.type.includes("price")) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchContact = a.contactName?.toLowerCase().includes(q);
        const matchProduct = a.productName?.toLowerCase().includes(q);
        const matchDoc = a.docNumber?.toLowerCase().includes(q);
        if (!matchContact && !matchProduct && !matchDoc) return false;
      }
      return true;
    });
  }, [alerts, filterType, searchQuery]);

  const handleCopyWhatsapp = (item: RenAiDiscrepancy) => {
    navigator.clipboard.writeText(item.whatsappDraft);
    setCopiedId(item.id);
    updateAiAlertStatus(item.id, "disputed", org?.id);
    toast.success("Tedarikçi itiraz metni panoya kopyalandı!");
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleCreatePriceDiffInvoice = (item: RenAiDiscrepancy) => {
    updateAiAlertStatus(item.id, "invoiced", org?.id);
    const params = new URLSearchParams({
      fiyat_farki: "1",
      contact_id: item.contactId,
      tutar: String(item.totalLoss),
      kdv: String(item.vatRate),
      aciklama: item.suggestedInvoiceDesc,
      belge_no: item.docNumber,
    });
    router.push(`/satislar/faturalar/yeni?${params.toString()}`);
  };

  const handleMarkResolved = (item: RenAiDiscrepancy) => {
    updateAiAlertStatus(item.id, "accepted", org?.id);
    toast.success("Fark çözüldü olarak işaretlendi ve listeden kaldırıldı.");
  };

  const handleUnmarkResolved = (item: RenAiDiscrepancy) => {
    updateAiAlertStatus(item.id, "pending", org?.id);
    toast.success("Kayıt tekrar aktif inceleme listesine alındı.");
  };

  const handleDeleteAlert = (item: RenAiDiscrepancy) => {
    deleteAiAlert(item.id, org?.id);
    toast.success("Kayıt sistemden kalıcı olarak silindi.");
  };

  // Yapay Zeka Akıllı Asistan Soru Cevaplayıcı
  const handleSendPrompt = async (questionText: string) => {
    const q = questionText.trim();
    if (!q) return;

    const userMsg = {
      sender: "user" as const,
      text: q,
      time: new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setIsTyping(true);

    let currentBrief = briefingData;
    if (!currentBrief && org?.id) {
      try {
        currentBrief = await generateDailyBriefing(org.id);
        setBriefingData(currentBrief);
      } catch (e) {
        console.error(e);
      }
    }

    setTimeout(() => {
      let reply = "";
      let actionUrl: string | undefined = undefined;
      let actionText: string | undefined = undefined;

      const qLower = q.toLowerCase();

      // 1. SABAH BRİFİNGİ / GÜNÜN ÖZETİ
      if (
        qLower.includes("sabah") ||
        qLower.includes("brifing") ||
        qLower.includes("bugün") ||
        qLower.includes("günlük") ||
        qLower.includes("özet")
      ) {
        if (currentBrief) {
          reply = `☀️ **GÜNLÜK SABAH YÖNETİCİ BRİFİNGİ (${currentBrief.formattedDate})**\n\n` +
            `💰 **Nakit & Finans Durumu:**\n` +
            `• Bugün beklenen tahsilatlar: **${formatMoney(currentBrief.totalExpectedInflow)}** (${currentBrief.todayCollections.length} fatura)\n` +
            `• Bugün yapılacak ödemeler: **${formatMoney(currentBrief.totalExpectedOutflow)}** (${currentBrief.todayPayments.length} ödeme)\n` +
            `• Net Günlük Nakit Farkı: **${currentBrief.netCashForecast >= 0 ? "+" : ""}${formatMoney(currentBrief.netCashForecast)}**\n\n` +
            `🚀 **Çok Satanlar:** Son 30 günde öne çıkan ${currentBrief.topSellers.length} yıldız ürününüz var.\n` +
            `🧊 **Hareketsiz Stoklar:** Son 30 gündür satılmayan ${currentBrief.slowMoving.length} ürün depoda **${formatMoney(currentBrief.totalIdleCapital)}** sermaye bağlıyor. Bu ürünler için kampanya fikirleri hazır!`;
          actionUrl = "#briefing";
          actionText = "Detaylı Sabah Brifingini Aç";
        } else {
          reply = "Bugünkü sabah brifingi verileri hazırlandı. Yukarıdaki 'Günlük Sabah Brifingi' sekmesinden tahsilat, ödeme ve kampanya detaylarını inceleyebilirsiniz.";
        }
      }

      // 2. UZUN ZAMANDIR SATILMAYAN ÜRÜNLER & KAMPANYA FİKİRLERİ
      else if (
        qLower.includes("satılmayan") ||
        qLower.includes("hareketsiz") ||
        qLower.includes("ölü stok") ||
        qLower.includes("kampanya") ||
        qLower.includes("yavaş")
      ) {
        if (currentBrief && currentBrief.slowMoving.length > 0) {
          const list = currentBrief.slowMoving.slice(0, 4);
          let itemsText = list
            .map(
              (p) =>
                `• **${p.name}** (Stok: ${p.stockQty} Adet, Bağlı Sermaye: ${formatMoney(p.idleCapital)})\n` +
                `  💡 *AI Kampanya Önerisi:* ${p.aiCampaignTitle} (%${p.suggestedDiscountRate} İskonto). ${p.aiCampaignIdea}`,
            )
            .join("\n\n");

          reply = `🧊 **UZUN SÜREDİR SATILMAYAN ÜRÜNLER VE YAPAY ZEKA KAMPANYA FİKİRLERİ:**\n\n` +
            `Deponuzda son 30 gündür satışı olmayan ve yaklaşık **${formatMoney(currentBrief.totalIdleCapital)}** atıl sermaye bağlayan ${currentBrief.slowMoving.length} kalem ürün tespit ettim:\n\n` +
            `${itemsText}\n\n` +
            `Bu ürünleri nakde çevirmek için doğrudan kampanyalı satış teklifi oluşturabilir veya ilgili müşterilerinize WhatsApp üzerinden kampanya metni paylaşabilirsiniz.`;
          actionUrl = "#briefing";
          actionText = "Kampanya Teklifi Hazırla";
        } else {
          reply = "Harika bir envanter yönetimi! Son 30 gün içinde depodaki tüm ürünleriniz düzenli olarak satılmış görünüyor; atıl / ölü stok tespit edilmedi.";
        }
      }

      // 3. ÇOK SATAN ÜRÜNLER VE TRENDLER
      else if (
        qLower.includes("çok satan") ||
        qLower.includes("yıldız") ||
        qLower.includes("hızlı") ||
        qLower.includes("trend")
      ) {
        if (currentBrief && currentBrief.topSellers.length > 0) {
          const list = currentBrief.topSellers.slice(0, 5);
          let itemsText = list
            .map(
              (p, idx) =>
                `${idx + 1}. **${p.name}**\n` +
                `   Satış: ${p.soldQty} Adet · Ciro: ${formatMoney(p.totalRevenue)} · Kalan Stok: ${p.stockQty} Adet (${p.daysOfStockLeft < 999 ? `~${p.daysOfStockLeft} gün yetecek` : "Yeterli"})`,
            )
            .join("\n");

          reply = `🚀 **SON 30 GÜNÜN EN ÇOK SATAN YILDIZ ÜRÜNLERİ:**\n\n${itemsText}\n\n💡 *Yapay Zeka Notu:* Hızlı tükenen ürünlerin stok mevcudunu erkenden sipariş vererek tedarikçi fiyat artışlarından önce güvenceye almanızı öneririm.`;
        } else {
          reply = "Son 30 güne ait satış faturalarından çok satan ürün trendleri hesaplanıyor.";
        }
      }

      // 4. MÜŞTERİLER & TAHSİLAT HATIRLATMALARI
      else if (
        qLower.includes("müşteri") ||
        qLower.includes("alacak") ||
        qLower.includes("tahsilat") ||
        qLower.includes("borçlu") ||
        qLower.includes("geciken")
      ) {
        if (currentBrief && currentBrief.todayCollections.length > 0) {
          const debtors = currentBrief.todayCollections.slice(0, 5);
          let dText = debtors
            .map(
              (d) =>
                `• **${d.contactName}**: ${formatMoney(d.amount)} (${d.isOverdue ? `⚠️ ${d.daysDiff} gün gecikmede` : "Bugün vadeli"})`,
            )
            .join("\n");

          reply = `👥 **MÜŞTERİ TAHSİLAT VE ALACAK RADARI:**\n\n` +
            `Bugün tahsil edilmesi gereken veya vadesi geciken toplam **${formatMoney(currentBrief.totalExpectedInflow)}** alacağınız bulunmaktadır:\n\n` +
            `${dText}\n\n` +
            `Bu müşterilere tek tıkla nazik WhatsApp ödeme hatırlatması gönderebilirsiniz.`;
          actionUrl = "#briefing";
          actionText = "Tahsilatları Gör & WhatsApp Gönder";
        } else {
          reply = "Tebrikler! Şu an için vadesi gecikmiş veya tahsilat bekleyen acil müşteri alacağı bulunmuyor.";
        }
      }

      // 5. KRİTİK STOKLAR
      else if (qLower.includes("kritik") || qLower.includes("azalan") || qLower.includes("tüken") || qLower.includes("stoktaki")) {
        const crit = (products.data ?? []).filter(
          (p) => p.track_stock && p.type === "product" && p.critical_stock !== null && Number(p.stock_qty) <= Number(p.critical_stock)
        );
        if (crit.length > 0) {
          const listStr = crit
            .slice(0, 8)
            .map((p) => `• **${p.name}**: Kalan **${p.stock_qty}** (Kritik sınır: ${p.critical_stock})`)
            .join("\n");
          reply = `⚠️ **KRİTİK STOK SEVİYESİNDEKİ ÜRÜNLER:**\n\n` +
            `İşletmenizde kritik eşiğin altına düşen **${crit.length} adet** ürün bulunmaktadır:\n\n` +
            `${listStr}\n\n` +
            `Müşteri siparişlerini aksatmamak için tedarikçinizden yeni sipariş oluşturmanızı öneririm.`;
          actionUrl = "/stok/urunler";
          actionText = "Kritik Stokları Gör";
        } else {
          reply = `✅ Tebrikler! Sistemde kritik stok eşiğinin altına inen ürün bulunmuyor. Tüm ürünlerinizin stok seviyesi güvenli bölgede.`;
        }
      }

      // 6. KASA VE BANKA BAKİYELERİ
      else if (qLower.includes("kasa") || qLower.includes("banka") || qLower.includes("bakiye")) {
        const accs = (accounts.data ?? []).filter((a) => a.is_active);
        if (accs.length > 0) {
          const listStr = accs
            .map((a) => `• **${a.name}** (${a.type === "cash" ? "Kasa" : a.type === "bank" ? "Banka" : "POS"}): **${formatMoney(a.balance, a.currency)}**`)
            .join("\n");
          reply = `🏦 **KASA VE BANKA BAKİYELERİ:**\n\n${listStr}\n\nToplam likidite durumunuz güncel hareketlerle eşzamanlıdır.`;
          actionUrl = "/nakit/hesaplar";
          actionText = "Kasa ve Bankaları Aç";
        } else {
          reply = "Aktif kasa veya banka hesabı bulunamadı. Kasa ve Bankalar sayfasından hesap ekleyebilirsiniz.";
        }
      }

      // 7. SATIŞ VE CİRO DURUMU
      else if (qLower.includes("satış") || qLower.includes("ciro") || qLower.includes("fatura durumu")) {
        if (currentBrief && currentBrief.topSellers.length > 0) {
          reply = `📈 **GÜNCEL SATIŞ VE CİRO DURUMU:**\n\n` +
            `• Son 30 günlük ciro hacmi: **${formatMoney(currentBrief.topSellers.reduce((s, p) => s + p.totalRevenue, 0))}**\n` +
            `• En çok ciro getiren ürün: **${currentBrief.topSellers[0]?.name || "—"}**\n` +
            `• Bugün beklenen tahsilatlar: **${formatMoney(currentBrief.totalExpectedInflow)}**\n\n` +
            `Satış faturalarınızı ve raporlarınızı Gelir/Gider sayfasından grafiksel olarak da inceleyebilirsiniz.`;
          actionUrl = "/raporlar/gelir-gider";
          actionText = "Satış Raporunu Aç";
        } else {
          reply = "Satış verileriniz hesaplanıyor. Raporlar sekmesinden anlık gelir/gider grafiklerinizi inceleyebilirsiniz.";
        }
      }

      // 8. TEDARİKÇİ FİYAT FARKI & İSKONTO KAYIPLARI
      else if (
        qLower.includes("fark") ||
        qLower.includes("fatura") ||
        qLower.includes("zarar") ||
        qLower.includes("tedarikçi") ||
        qLower.includes("iskonto")
      ) {
        const pending = alerts.filter((a) => a.status === "pending");
        if (pending.length > 0) {
          const totalP = pending.reduce((s, a) => s + a.totalLoss, 0);
          reply = `⚠️ **TEDARİKÇİ İSKONTO VE FİYAT FARKI DENETİMİ:**\n\n` +
            `Sistemde **${pending.length} adet** alımda iskonto kaybı veya fiyat artışı tespit edildi. Toplam kesilebilecek Fiyat Farkı Faturası tutarı: **${formatMoney(totalP)}** (+KDV).\n\n` +
            `Öne çıkan tedarikçiler: ${Array.from(new Set(pending.map((p) => p.contactName))).slice(0, 3).join(", ")}.\n\n` +
            `Fiyat Farkı Faturası keserek bu tutarı cari hesabınızdan mahsup edebilir veya nakit iadesi talep edebilirsiniz.`;
          actionUrl = "#alerts";
          actionText = "Bekleyen Farkları Listele & Fatura Kes";
        } else {
          reply = "Alış faturalarınız düzenli denetleniyor. Şu anda bekleyen bir iskonto kaybı veya fiyat artışı tespit edilmedi.";
        }
      }

      // 9. GENEL TAVSİYE
      else {
        reply = `Sorunuz analiz edildi. REN Yapay Zeka işletmenizi 3 temel eksende korur ve büyütür:\n\n` +
          `1. ☀️ **Sabah Brifingi:** Her sabah vadesi gelen ödemeler, tahsilatlar ve likidite dengesi.\n` +
          `2. 🧊 **Ölü Stok & Kampanyalar:** Satılmayan ürünleri nakde çevirmek için paket ve indirim fikirleri.\n` +
          `3. 🛡️ **Kâr Kalkanı:** Tedarikçi iskonto unutmaları ve fiyat artışlarında 1-tıkla Fiyat Farkı Faturası.\n\n` +
          `Dilediğiniz konuyu sormaya devam edebilirsiniz.`;
      }

      setChatMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: reply,
          time: new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
          actionUrl,
          actionText,
        },
      ]);
      setIsTyping(false);
    }, 500);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {/* BAŞLIK VE AI STATÜSÜ */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-md">
              <Sparkles className="size-5 animate-spin-slow" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-text">
              REN Yapay Zeka · Kâr Koruma ve Finansal Denetim Kalkanı
            </h1>
          </div>
          <p className="text-xs text-muted mt-1">
            Günlük sabah brifingi, tedarikçi iskonto denetimi, hareketsiz stok kampanya fikirleri ve finansal asistan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 shadow-2xs">
            <span className="size-2 rounded-full bg-slate-500 animate-ping" />
            7/24 Aktif Kâr Kalkanı
          </span>
        </div>
      </div>

      {/* SEKME BAŞLIKLARI */}
      <div className="flex border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab("briefing")}
          className={cn(
            "flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors",
            activeTab === "briefing"
              ? "border-primary text-primary"
              : "border-transparent text-muted hover:text-text",
          )}
        >
          <Sun className="size-4 text-amber-500" />
          Günlük Sabah Brifingi
          <span className="rounded-full bg-amber-500/15 px-1.5 py-0.2 text-[10px] font-bold text-amber-600">
            GÜNLÜK
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("alerts")}
          className={cn(
            "flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors",
            activeTab === "alerts"
              ? "border-primary text-primary"
              : "border-transparent text-muted hover:text-text",
          )}
        >
          <ShieldAlert className="size-4 text-red-500" />
          Zarar Önleme & Fiyat Farkları
          {stats.pendingCount > 0 && (
            <span className="rounded-full bg-red-500/15 px-1.5 py-0.2 text-[10px] font-bold text-red-600">
              {stats.pendingCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("assistant")}
          className={cn(
            "flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors",
            activeTab === "assistant"
              ? "border-primary text-primary"
              : "border-transparent text-muted hover:text-text",
          )}
        >
          <Bot className="size-4 text-purple-600" />
          REN AI Finansal Asistan
          <span className="rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 px-1.5 py-0.2 text-[9px] font-bold text-white">
            AI
          </span>
        </button>
      </div>

      {/* SEKME 1: GÜNLÜK SABAH BRİFİNGİ */}
      {activeTab === "briefing" && (
        <DailyBriefingWidget variant="full" />
      )}

      {/* SEKME 2: ZARAR ÖNLEME & FİYAT FARKLARI (FATURA KALKANI) */}
      {activeTab === "alerts" && (
        <div className="space-y-4">
          {/* METRİK KARTLARI */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent p-4">
              <div className="flex items-center justify-between text-muted text-xs">
                <span>Tespit Edilen Zarar</span>
                <ShieldAlert className="size-4 text-purple-600" />
              </div>
              <div className="mt-2 font-mono text-xl font-bold text-red-600 dark:text-red-400">
                {formatMoney(stats.totalLossDetected)}
              </div>
              <div className="mt-1 text-[11px] text-muted">
                {stats.pendingCount} işlem faturası bekliyor
              </div>
            </Card>

            <Card className="border-border p-4">
              <div className="flex items-center justify-between text-muted text-xs">
                <span>Kurtarılan / Kesilen</span>
                <CheckCircle2 className="size-4 text-emerald-600" />
              </div>
              <div className="mt-2 font-mono text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatMoney(stats.totalLossInvoiced)}
              </div>
              <div className="mt-1 text-[11px] text-muted">
                {stats.invoicedCount} fiyat farkı faturası kesildi
              </div>
            </Card>

            <Card className="border-border p-4">
              <div className="flex items-center justify-between text-muted text-xs">
                <span>İskonto Kaçakları</span>
                <TrendingDown className="size-4 text-amber-500" />
              </div>
              <div className="mt-2 font-mono text-xl font-bold text-text">
                {alerts.filter((a) => a.type.includes("discount")).length} Kalem
              </div>
              <div className="mt-1 text-[11px] text-muted">Uygulanmayan iskontolar</div>
            </Card>

            <Card className="border-border p-4">
              <div className="flex items-center justify-between text-muted text-xs">
                <span>İncelenen Tedarikçi</span>
                <Building2 className="size-4 text-indigo-500" />
              </div>
              <div className="mt-2 font-mono text-xl font-bold text-text">
                {stats.supplierCount} Firma
              </div>
              <div className="mt-1 text-[11px] text-muted">Kayıtlı fiyat geçmişi</div>
            </Card>
          </div>

          {/* FİLTRE VE ARAMA ÇUBUĞU */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: "all", label: "Tümü (Aktif)" },
                { id: "pending", label: "Fatura Bekleyenler" },
                { id: "discount", label: "İskonto Kayıpları" },
                { id: "price", label: "Fiyat Artışları" },
                { id: "invoiced", label: "Faturası Kesilenler" },
                { id: "resolved", label: "Çözülenler (Arşiv)" },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilterType(f.id)}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                    filterType === f.id
                      ? "bg-primary text-white font-semibold shadow-xs"
                      : "bg-surface border border-border text-muted hover:text-text",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted" />
              <input
                type="text"
                placeholder="Ürün, tedarikçi veya fatura no..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-full rounded-lg border border-border bg-surface pl-8 pr-3 text-xs placeholder:text-muted/60 focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {/* LİSTE */}
          {filteredAlerts.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                <ShieldCheck className="size-7" />
              </div>
              <h3 className="mt-3 text-base font-bold text-text">
                {filterType === "resolved"
                  ? "Çözülen Kayıt Bulunmuyor"
                  : alerts.length === 0
                  ? "Henüz Kayıtlı Fiyat Farkı Bulunmuyor"
                  : "Bu Kriterde Aktif Kayıt Bulunamadı"}
              </h3>
              <p className="mt-1 text-xs text-muted max-w-md mx-auto leading-relaxed">
                {filterType === "resolved"
                  ? "'Çözüldü Olarak İşaretle' dediğiniz kayıtlar burada arşivlenir."
                  : alerts.length === 0
                  ? "Alış faturası kaydettiğinizde tedarikçinin önceki iskontoları unutup unutmadığı veya fiyat artırıp artırmadığı otomatik olarak taranıp burada listelenecektir."
                  : "Çözülen kayıtlar listeden gizlenmiştir. Diğer filtreleri veya 'Çözülenler (Arşiv)' sekmesini inceleyebilirsiniz."}
              </p>
              <div className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/giderler/alis-faturalari/yeni")}
                  className="text-xs"
                >
                  Yeni Alış Faturası Girişi Yap
                </Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredAlerts.map((item) => {
                const isPending = item.status === "pending";
                const isInvoiced = item.status === "invoiced";
                const isDisputed = item.status === "disputed";
                const isResolved = item.status === "accepted";
                const isMissingDisc = item.type === "discount_missing";

                return (
                  <Card
                    key={item.id}
                    className={cn(
                      "p-4 transition-all hover:border-purple-400/50 shadow-xs",
                      isPending && "border-l-4 border-l-red-500",
                      isInvoiced && "border-l-4 border-l-emerald-500 opacity-90",
                      isResolved && "border-l-4 border-l-slate-400 opacity-75 bg-surface-2/40",
                    )}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-text">{item.productName}</span>
                          {isMissingDisc ? (
                            <span className="rounded bg-red-500/15 px-2 py-0.5 text-[10.5px] font-bold text-red-600 dark:text-red-400">
                              İskonto Uygulanmamış!
                            </span>
                          ) : item.type === "discount_reduced" ? (
                            <span className="rounded bg-amber-500/15 px-2 py-0.5 text-[10.5px] font-bold text-amber-600 dark:text-amber-400">
                              İskonto Düşürülmüş
                            </span>
                          ) : (
                            <span className="rounded bg-orange-500/15 px-2 py-0.5 text-[10.5px] font-bold text-orange-600 dark:text-orange-400">
                              Birim Fiyat Artırılmış
                            </span>
                          )}

                          {isResolved ? (
                            <span className="inline-flex items-center gap-1 rounded bg-slate-500/15 px-2 py-0.5 text-[10.5px] font-bold text-slate-700 dark:text-slate-300">
                              <CheckCircle2 className="size-3 text-emerald-500" /> Çözüldü & Listeden Kaldırıldı
                            </span>
                          ) : isInvoiced ? (
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-2 py-0.5 text-[10.5px] font-bold text-emerald-700 dark:text-emerald-300">
                              <Check className="size-3" /> Faturası Kesildi
                            </span>
                          ) : isDisputed ? (
                            <span className="inline-flex items-center gap-1 rounded bg-blue-500/15 px-2 py-0.5 text-[10.5px] font-bold text-blue-700 dark:text-blue-300">
                              <MessageSquare className="size-3" /> İtiraz Notu Gönderildi
                            </span>
                          ) : (
                            <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[10.5px] font-semibold text-amber-800 dark:text-amber-300">
                              İnceleme Bekliyor
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-muted mt-1 flex flex-wrap items-center gap-2">
                          <span>
                            Tedarikçi: <strong>{item.contactName}</strong>
                          </span>
                          <span>·</span>
                          <span>
                            Alım: <strong>{item.quantity} Adet</strong>
                          </span>
                          <span>·</span>
                          <span>Tarih: {item.docDate} ({item.docNumber})</span>
                        </div>
                      </div>

                      <div className="text-right sm:self-center shrink-0">
                        <div className="text-[11px] text-muted font-medium">Toplam Zarar / Fark</div>
                        <div className={cn("font-mono text-lg font-bold", isResolved ? "text-slate-500 line-through" : "text-red-600 dark:text-red-400")}>
                          +{formatMoney(item.totalLoss, item.currency)}
                        </div>
                      </div>
                    </div>

                    {/* FİYAT KARŞILAŞTIRMA BLOKU */}
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-lg bg-surface-2/60 p-2.5 text-xs">
                      <div>
                        <div className="text-[10.5px] text-muted font-medium">
                          Önceki Alım ({item.previousDocNumber} · {item.previousDocDate})
                        </div>
                        <div className="font-semibold text-text mt-0.5">
                          Net: {formatMoney(item.previousNet, item.currency)}{" "}
                          {item.previousDiscount > 0 ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                              (%{item.previousDiscount} iskonto)
                            </span>
                          ) : (
                            <span className="text-muted font-normal">(İskontosuz)</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10.5px] text-muted font-medium">
                          Bu Alım ({item.docNumber} · {item.docDate})
                        </div>
                        <div className="font-semibold text-text mt-0.5">
                          Net: {formatMoney(item.currentNet, item.currency)}{" "}
                          {item.currentDiscount > 0 ? (
                            <span className="text-muted">(%{item.currentDiscount} iskonto)</span>
                          ) : (
                            <span className="text-red-600 dark:text-red-400 font-bold">(İskonto Yok!)</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* AI AÇIKLAMA NOTU */}
                    <div className="mt-2.5 rounded-md border border-purple-500/20 bg-purple-500/5 p-2.5 text-xs text-text/85 leading-relaxed">
                      💡 <strong>Yapay Zeka Analizi:</strong> {item.explanation}
                    </div>

                    {/* AKSİYONLAR */}
                    <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-border pt-2.5">
                      {isResolved ? (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleUnmarkResolved(item)}
                            className="text-xs h-8 gap-1.5"
                          >
                            <RotateCcw className="size-3.5 text-blue-500" />
                            <span>Listeye Geri Al</span>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteAlert(item)}
                            className="text-xs h-8 gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-500/10"
                          >
                            <Trash2 className="size-3.5" />
                            <span>Kalıcı Olarak Sil</span>
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyWhatsapp(item)}
                            className="text-xs h-8 gap-1.5"
                          >
                            {copiedId === item.id ? (
                              <>
                                <Check className="size-3.5 text-emerald-500" />
                                <span>Kopyalandı!</span>
                              </>
                            ) : (
                              <>
                                <MessageSquare className="size-3.5 text-emerald-600" />
                                <span>WhatsApp İtiraz Metni</span>
                              </>
                            )}
                          </Button>

                          {!isInvoiced && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleMarkResolved(item)}
                              className="text-xs h-8"
                            >
                              Çözüldü Olarak İşaretle
                            </Button>
                          )}

                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleCreatePriceDiffInvoice(item)}
                            className="text-xs h-8 gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-xs"
                          >
                            <Receipt className="size-3.5" />
                            <span>Fiyat Farkı Faturası Kes</span>
                          </Button>
                        </>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SEKME 3: YAPAY ZEKA ASİSTANI (SOHBET VE FİNANSAL ZEKA) */}
      {activeTab === "assistant" && (
        <Card className="flex flex-col h-[600px] border-purple-500/30 overflow-hidden shadow-sm">
          {/* ASİSTAN ÜST BİLGİ */}
          <div className="flex items-center justify-between border-b border-border bg-surface-2 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-xs">
                <Sparkles className="size-4" />
              </div>
              <div>
                <div className="font-bold text-xs text-text">REN Akıllı Finansal Asistan</div>
                <div className="text-[10px] text-muted">Canlı Veri Analizi ve Kâr Koruma Modülü</div>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                setChatMessages([
                  {
                    sender: "ai",
                    text: "Sohbet sıfırlandı. Size işletmenizin finansal verileri, tedarikçi fiyat farkları veya iskonto analizleri konusunda nasıl yardımcı olabilirim?",
                    time: "Şimdi",
                  },
                ])
              }
              className="text-xs h-7"
            >
              <RefreshCw className="size-3" />
              Sıfırla
            </Button>
          </div>

          {/* SOHBET GEÇMİŞİ */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 thin-scroll">
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex flex-col max-w-[85%] text-xs leading-relaxed",
                  msg.sender === "user"
                    ? "ml-auto items-end"
                    : "mr-auto items-start",
                )}
              >
                <div
                  className={cn(
                    "rounded-2xl px-3.5 py-2.5 shadow-2xs",
                    msg.sender === "user"
                      ? "bg-primary text-white rounded-br-none"
                      : "bg-surface-2 border border-border text-text rounded-bl-none",
                  )}
                >
                  <div className="whitespace-pre-line">{msg.text}</div>
                  {msg.actionUrl && (
                    <div className="mt-2.5 pt-2 border-t border-border/60">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          if (msg.actionUrl === "#briefing") setActiveTab("briefing");
                          else if (msg.actionUrl === "#alerts") setActiveTab("alerts");
                        }}
                        className="text-[11px] h-7 bg-primary text-white"
                      >
                        {msg.actionText || "Görüntüle"}
                        <ArrowRight className="size-3 ml-1" />
                      </Button>
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-muted mt-1 px-1">{msg.time}</span>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-1.5 text-muted text-xs p-2">
                <Sparkles className="size-3.5 animate-spin text-purple-600" />
                <span>REN AI finansal kayıtları inceliyor...</span>
              </div>
            )}
          </div>

          {/* HIZLI SORU ÇİPLERİ */}
          <div className="border-t border-border bg-surface px-4 py-2 flex items-center gap-1.5 overflow-x-auto thin-scroll">
            <span className="text-[10px] font-semibold text-muted shrink-0">Hızlı Sor:</span>
            {[
              "Kritik stoktaki ürünler hangileri?",
              "Bu ayki satış durumum nasıl?",
              "Kasa ve banka bakiyelerim ne kadar?",
              "Bugünkü sabah brifingimi özetle",
              "Hangi ürünler satılmıyor ve kampanya fikrin nedir?",
              "Hangi müşterilere ödeme hatırlatması yapmalıyım?",
              "Hangi tedarikçiler fiyat artırdı?",
            ].map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => handleSendPrompt(chip)}
                className="shrink-0 rounded-full border border-border bg-surface-2 hover:border-purple-400 hover:bg-purple-500/10 px-2.5 py-1 text-[11px] text-text transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* MESAJ YAZMA ALANI */}
          <div className="border-t border-border p-3 bg-surface">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendPrompt(chatInput);
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Yapay zekaya brifing, tahsilatlar, ölü stoklar veya tedarikçiler hakkında soru sorun..."
                className="h-9 flex-1 rounded-xl border border-border bg-surface px-3 text-xs focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
              <Button
                type="submit"
                disabled={!chatInput.trim() || isTyping}
                size="sm"
                className="h-9 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
              >
                <Send className="size-3.5" />
              </Button>
            </form>
          </div>
        </Card>
      )}
    </div>
  );
}
