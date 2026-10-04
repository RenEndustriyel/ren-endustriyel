"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  CalendarDays,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Building2,
  Wallet,
  Search,
  ExternalLink,
  MessageCircle,
  Phone,
  FileSpreadsheet,
  TrendingUp,
  Scale,
  Plus,
  Copy,
  Check,
  Send,
  X,
  CreditCard,
  Sparkles,
} from "lucide-react";
import { useOrg } from "@/providers/org-provider";
import { useRows, type Row } from "@/lib/data";
import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { exportExcel } from "@/lib/excel";
import { PaymentDialog, type AllocTarget } from "@/components/cash/payment-dialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { DashboardSummary } from "./types";

export interface FinFlowItem {
  id: string;
  type: "collection" | "payment";
  docType: "sales_invoice" | "sales_order" | "purchase_invoice" | "expense" | "salary";
  docTypeLabel: string;
  docNumber: string;
  partyName: string;
  partyPhone?: string | null;
  partyEmail?: string | null;
  categoryName?: string;
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  remainingAmount: number;
  currency: string;
  isRealDoc: boolean;
  contactId?: string | null;
}

interface UpcomingFinancesSectionProps {
  dashboardData?: DashboardSummary;
}

// Tarih göreceli yardımcılar
function parseDaysDiff(dueDateStr: string, today = new Date()): number {
  if (!dueDateStr) return 999;
  const d = new Date(dueDateStr);
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const d0 = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((d0 - t0) / (1000 * 60 * 60 * 24));
}

function getUrgencyBadge(daysDiff: number) {
  if (daysDiff < 0) {
    const overdue = Math.abs(daysDiff);
    return {
      label: `${overdue} gün gecikti`,
      urgency: "overdue" as const,
      className: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30",
    };
  }
  if (daysDiff === 0) {
    return {
      label: "Bugün Son Gün",
      urgency: "today" as const,
      className: "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40 font-black animate-pulse",
    };
  }
  if (daysDiff === 1) {
    return {
      label: "Yarın Vadesi",
      urgency: "tomorrow" as const,
      className: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25 font-bold",
    };
  }
  if (daysDiff <= 7) {
    return {
      label: `${daysDiff} gün kaldı`,
      urgency: "this_week" as const,
      className: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/25",
    };
  }
  return {
    label: `${daysDiff} gün kaldı`,
    urgency: "future" as const,
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
  };
}

// Dinamik örnek veri üretici (bugünkü tarihe göre hep güncel kalır)
function getOffsetDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

const DEFAULT_COLLECTIONS: FinFlowItem[] = [
  {
    id: "sample-col-1",
    type: "collection",
    docType: "sales_invoice",
    docTypeLabel: "Satış Faturası",
    docNumber: "SAT-2026-002",
    partyName: "SUSURLUK TİCARET BORSASI",
    partyPhone: "0(266) 862 14 50",
    partyEmail: "info@susurluktb.org.tr",
    issueDate: getOffsetDate(-16),
    dueDate: getOffsetDate(1), // Yarın
    totalAmount: 10992.0,
    remainingAmount: 10992.0,
    currency: "TRY",
    isRealDoc: false,
  },
  {
    id: "sample-col-2",
    type: "collection",
    docType: "sales_invoice",
    docTypeLabel: "Satış Faturası",
    docNumber: "SAT-2026-0045",
    partyName: "MARMARA ZEYTİN TARIM SATIŞ KOOP.",
    partyPhone: "0(266) 862 18 90",
    partyEmail: null,
    issueDate: getOffsetDate(-25),
    dueDate: getOffsetDate(-2), // 2 gün gecikmiş
    totalAmount: 8650.0,
    remainingAmount: 8650.0,
    currency: "TRY",
    isRealDoc: false,
  },
  {
    id: "sample-col-3",
    type: "collection",
    docType: "sales_invoice",
    docTypeLabel: "Satış Faturası",
    docNumber: "SAT-2026-0038",
    partyName: "GÖNEN DERİ ORGANİZE SANAYİ",
    partyPhone: "0(266) 762 44 10",
    partyEmail: "muhasebe@gonenderiosb.org.tr",
    issueDate: getOffsetDate(-10),
    dueDate: getOffsetDate(4), // 4 gün sonra
    totalAmount: 32140.0,
    remainingAmount: 32140.0,
    currency: "TRY",
    isRealDoc: false,
  },
  {
    id: "sample-col-4",
    type: "collection",
    docType: "sales_order",
    docTypeLabel: "Onaylı Sipariş",
    docNumber: "SIP-2026-0012",
    partyName: "REN İNŞAAT & TAAHHÜT LTD. ŞTİ.",
    partyPhone: "0(266) 862 30 40",
    partyEmail: null,
    issueDate: getOffsetDate(-8),
    dueDate: getOffsetDate(6), // 6 gün sonra
    totalAmount: 17400.0,
    remainingAmount: 17400.0,
    currency: "TRY",
    isRealDoc: false,
  },
  {
    id: "sample-col-5",
    type: "collection",
    docType: "sales_invoice",
    docTypeLabel: "Satış Faturası",
    docNumber: "SAT-2026-001",
    partyName: "BALIKESİR BÜYÜKŞEHİR BELEDİYESİ",
    partyPhone: "0(266) 245 10 00",
    partyEmail: "info@balikesir.bel.tr",
    issueDate: getOffsetDate(-10),
    dueDate: getOffsetDate(11), // 11 gün sonra
    totalAmount: 25236.0,
    remainingAmount: 25236.0,
    currency: "TRY",
    isRealDoc: false,
  },
];

const DEFAULT_PAYMENTS: FinFlowItem[] = [
  {
    id: "sample-pay-1",
    type: "payment",
    docType: "expense",
    docTypeLabel: "Sabit Kira Masrafı",
    docNumber: "KIRA-2026-10",
    partyName: "MERKEZ OFİS & ATÖLYE MÜLK SAHİBİ",
    categoryName: "Kira & Tesis",
    issueDate: getOffsetDate(-5),
    dueDate: getOffsetDate(1), // Yarın
    totalAmount: 22500.0,
    remainingAmount: 22500.0,
    currency: "TRY",
    isRealDoc: false,
  },
  {
    id: "sample-pay-2",
    type: "payment",
    docType: "purchase_invoice",
    docTypeLabel: "Alış Faturası",
    docNumber: "ALIS-2026-002",
    partyName: "SEYPA GIDA VE İHT. MAD. A.Ş.",
    partyPhone: "0(266) 863 11 22",
    categoryName: "Hammadde & Temizlik",
    issueDate: getOffsetDate(-27),
    dueDate: getOffsetDate(-2), // 2 gün gecikti
    totalAmount: 1110.01,
    remainingAmount: 1110.01,
    currency: "TRY",
    isRealDoc: false,
  },
  {
    id: "sample-pay-3",
    type: "payment",
    docType: "purchase_invoice",
    docTypeLabel: "Alış Faturası",
    docNumber: "ALIS-2026-001",
    partyName: "REHA SÖZERİ-AMBALAJ",
    partyPhone: "0(266) 862 45 67",
    categoryName: "Ambalaj Malzemeleri",
    issueDate: getOffsetDate(-12),
    dueDate: getOffsetDate(2), // 2 gün sonra
    totalAmount: 3250.0,
    remainingAmount: 3250.0,
    currency: "TRY",
    isRealDoc: false,
  },
  {
    id: "sample-pay-4",
    type: "payment",
    docType: "expense",
    docTypeLabel: "Elektrik & Enerji",
    docNumber: "ENR-2026-09",
    partyName: "ULUDAĞ ELEKTRİK DAĞITIM A.Ş.",
    categoryName: "Enerji & Faturalar",
    issueDate: getOffsetDate(-15),
    dueDate: getOffsetDate(5), // 5 gün sonra
    totalAmount: 6480.0,
    remainingAmount: 6480.0,
    currency: "TRY",
    isRealDoc: false,
  },
  {
    id: "sample-pay-5",
    type: "payment",
    docType: "purchase_invoice",
    docTypeLabel: "Hammadde Alımı",
    docNumber: "ALIS-2026-008",
    partyName: "AKKİM KİMYA SANAYİ VE TİC. A.Ş.",
    partyPhone: "0(226) 815 30 00",
    categoryName: "Arıtma Kimyasalları",
    issueDate: getOffsetDate(-14),
    dueDate: getOffsetDate(10), // 10 gün sonra
    totalAmount: 44800.0,
    remainingAmount: 44800.0,
    currency: "TRY",
    isRealDoc: false,
  },
];

export function UpcomingFinancesSection({ dashboardData }: UpcomingFinancesSectionProps) {
  const router = useRouter();
  const { org } = useOrg();

  // Durum Filtreleri
  const [viewTab, setViewTab] = React.useState<"all" | "collections" | "payments">("all");
  const [urgencyFilter, setUrgencyFilter] = React.useState<"all" | "overdue" | "this_week" | "future">("all");
  const [searchQuery, setSearchQuery] = React.useState("");

  // Kopyalama animasyonu için durum
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  // WhatsApp Hatırlatma Modalı Durumu
  const [waModalOpen, setWaModalOpen] = React.useState(false);
  const [waTargetItem, setWaTargetItem] = React.useState<FinFlowItem | null>(null);
  const [waPhone, setWaPhone] = React.useState("");
  const [waTemplate, setWaTemplate] = React.useState<"gentle" | "urgent" | "bank">("gentle");

  // Hızlı Tahsilat / Ödeme Modalı
  const [paymentDialogOpen, setPaymentDialogOpen] = React.useState(false);
  const [paymentDialogFlow, setPaymentDialogFlow] = React.useState<"in" | "out">("in");
  const [paymentDialogTarget, setPaymentDialogTarget] = React.useState<AllocTarget>({
    id: "",
    number: "",
    remaining: 0,
    currency: "TRY",
    exchange_rate: 1,
  });
  const [paymentContactId, setPaymentContactId] = React.useState<string | null>(null);

  // Veritabanındaki gerçek açık belgeleri çek
  type DocRow = Row<"documents"> & {
    contact?: { id: string; name: string; phone?: string | null; email?: string | null } | null;
    category?: { id: string; name: string } | null;
  };

  const docsQuery = useRows<DocRow>("documents", {
    select: "*, contact:contacts(id, name, phone, email), category:categories(id, name)",
    params: ["dashboard_upcoming_finances"],
    filter: (x) =>
      x.not("payment_status", "in", '("paid","cancelled")')
        .not("status", "in", '("draft","cancelled")'),
    order: [{ column: "due_date", ascending: true }],
  });

  // Verileri harmanla ve birleştir
  const { collections, payments } = React.useMemo(() => {
    const rawDocs = docsQuery.data ?? [];

    const realCols: FinFlowItem[] = [];
    const realPays: FinFlowItem[] = [];

    for (const d of rawDocs) {
      const remaining = Math.max(0, Number(d.total ?? 0) - Number(d.paid_amount ?? 0));
      if (remaining <= 0.01) continue;

      const isCol = ["sales_invoice", "pos_sale", "sales_order"].includes(d.doc_type);
      const isPay = ["purchase_invoice", "expense", "salary", "purchase_order"].includes(d.doc_type);

      const item: FinFlowItem = {
        id: d.id,
        type: isCol ? "collection" : "payment",
        docType: d.doc_type as FinFlowItem["docType"],
        docTypeLabel:
          d.doc_type === "sales_invoice"
            ? "Satış Faturası"
            : d.doc_type === "sales_order"
            ? "Satış Siparişi"
            : d.doc_type === "pos_sale"
            ? "Hızlı Satış"
            : d.doc_type === "purchase_invoice"
            ? "Alış Faturası"
            : d.doc_type === "salary"
            ? "Personel Maaşı"
            : "İşletme Masrafı",
        docNumber: d.number || (isCol ? "SAT-AÇIK" : "ALIS-AÇIK"),
        partyName: d.contact?.name || d.category?.name || d.description || (isCol ? "Açık Müşteri Alacağı" : "Açık Gider"),
        partyPhone: d.contact?.phone ?? null,
        partyEmail: d.contact?.email ?? null,
        categoryName: d.category?.name,
        issueDate: d.issue_date,
        dueDate: d.due_date || d.issue_date,
        totalAmount: Number(d.total ?? 0),
        remainingAmount: remaining,
        currency: d.currency || "TRY",
        isRealDoc: true,
        contactId: d.contact_id,
      };

      if (isCol) realCols.push(item);
      else if (isPay) realPays.push(item);
    }

    // Gerçek veri varsa ve zenginse onu kullan; yoksa demo ile harmanla
    const finalCols = realCols.length >= 2 ? realCols : [...realCols, ...DEFAULT_COLLECTIONS.slice(realCols.length)];
    const finalPays = realPays.length >= 2 ? realPays : [...realPays, ...DEFAULT_PAYMENTS.slice(realPays.length)];

    // Vade tarihine göre sırala (en yakın / geciken en üstte)
    finalCols.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    finalPays.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    return { collections: finalCols, payments: finalPays };
  }, [docsQuery.data]);

  // Filtreleme mantığı
  const filterList = (items: FinFlowItem[]) => {
    return items.filter((item) => {
      // Metin Arama
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.partyName.toLowerCase().includes(q);
        const matchNum = item.docNumber.toLowerCase().includes(q);
        const matchCat = (item.categoryName || "").toLowerCase().includes(q);
        if (!matchName && !matchNum && !matchCat) return false;
      }

      // Vade Aciliyeti Filtresi
      if (urgencyFilter !== "all") {
        const diff = parseDaysDiff(item.dueDate);
        if (urgencyFilter === "overdue" && diff >= 0) return false;
        if (urgencyFilter === "this_week" && (diff < 0 || diff > 7)) return false;
        if (urgencyFilter === "future" && diff <= 7) return false;
      }

      return true;
    });
  };

  const filteredCollections = React.useMemo(() => filterList(collections), [collections, searchQuery, urgencyFilter]);
  const filteredPayments = React.useMemo(() => filterList(payments), [payments, searchQuery, urgencyFilter]);

  // İstatistiksel Özetler
  const stats = React.useMemo(() => {
    const colTotal = collections.reduce((acc, c) => acc + c.remainingAmount, 0);
    const colOverdue = collections
      .filter((c) => parseDaysDiff(c.dueDate) < 0)
      .reduce((acc, c) => acc + c.remainingAmount, 0);
    const colOverdueCount = collections.filter((c) => parseDaysDiff(c.dueDate) < 0).length;
    const colThisWeek = collections
      .filter((c) => {
        const d = parseDaysDiff(c.dueDate);
        return d >= 0 && d <= 7;
      })
      .reduce((acc, c) => acc + c.remainingAmount, 0);

    const payTotal = payments.reduce((acc, p) => acc + p.remainingAmount, 0);
    const payOverdue = payments
      .filter((p) => parseDaysDiff(p.dueDate) < 0)
      .reduce((acc, p) => acc + p.remainingAmount, 0);
    const payOverdueCount = payments.filter((p) => parseDaysDiff(p.dueDate) < 0).length;
    const payThisWeek = payments
      .filter((p) => {
        const d = parseDaysDiff(p.dueDate);
        return d >= 0 && d <= 7;
      })
      .reduce((acc, p) => acc + p.remainingAmount, 0);

    const netSurplus = colTotal - payTotal;

    return {
      colTotal,
      colOverdue,
      colOverdueCount,
      colThisWeek,
      payTotal,
      payOverdue,
      payOverdueCount,
      payThisWeek,
      netSurplus,
    };
  }, [collections, payments]);

  // Hızlı WhatsApp Açılışı
  const handleOpenWaModal = (item: FinFlowItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setWaTargetItem(item);
    setWaPhone(item.partyPhone || "");
    setWaTemplate(parseDaysDiff(item.dueDate) < 0 ? "urgent" : "gentle");
    setWaModalOpen(true);
  };

  const executeSendWhatsApp = () => {
    if (!waTargetItem) return;
    const clean = waPhone.replace(/\D/g, "");
    if (!clean) {
      toast.error("Lütfen geçerli bir telefon numarası giriniz.");
      return;
    }
    const formattedPhone = clean.startsWith("0") ? "90" + clean.slice(1) : clean.startsWith("90") ? clean : clean.length === 10 ? "90" + clean : clean;

    let msg = "";
    const company = org?.name || "Ren Endüstriyel";
    const amountStr = formatMoney(waTargetItem.remainingAmount);

    if (waTemplate === "gentle") {
      msg = `Sayın ${waTargetItem.partyName},\n\n${company} bünyesindeki ${waTargetItem.docNumber} numaralı faturanızın (${amountStr}) vadesi ${formatDate(waTargetItem.dueDate)} tarihlidir.\n\nBilgilerinize sunar, bereketli çalışmalar dileriz.`;
    } else if (waTemplate === "urgent") {
      msg = `Sayın ${waTargetItem.partyName},\n\n${company} sistemimizde ${waTargetItem.docNumber} numaralı faturanıza ait ${amountStr} tutarındaki açık bakiyenizin vadesi ${formatDate(waTargetItem.dueDate)} tarihinde dolmuştur.\n\nÖdemenizi kontrol etmenizi rica eder, iyi günler dileriz.`;
    } else {
      msg = `Sayın ${waTargetItem.partyName},\n\n${waTargetItem.docNumber} faturanıza ait ${amountStr} tutarındaki ödemeniz için banka hesap bilgilerimiz:\nTR42 0006 4000 0011 2233 4455 66\nİş Bankası - ${company}\n\nAçıklamaya '${waTargetItem.docNumber}' yazmanızı rica ederiz.`;
    }

    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
    setWaModalOpen(false);
    toast.success("WhatsApp mesaj penceresi açıldı.");
  };

  // Tahsil Et / Öde Butonuna Tıklanınca
  const handleOpenPayment = (item: FinFlowItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.isRealDoc) {
      setPaymentDialogFlow(item.type === "collection" ? "in" : "out");
      setPaymentDialogTarget({
        id: item.id,
        number: item.docNumber,
        remaining: item.remainingAmount,
        currency: item.currency,
        exchange_rate: 1,
      });
      setPaymentContactId(item.contactId ?? null);
      setPaymentDialogOpen(true);
    } else {
      // Örnek belge uyarısı
      toast.info(
        `${item.docNumber} bir gösterim kaydıdır. Canlı sisteme yeni fatura veya kasa hareketi ekleyebilirsiniz.`,
        {
          action: {
            label: item.type === "collection" ? "Satışlara Git" : "Alışlara Git",
            onClick: () => router.push(item.type === "collection" ? "/satislar" : "/alislar"),
          },
        }
      );
    }
  };

  // Belge Detayına Gitme
  const handleItemClick = (item: FinFlowItem) => {
    if (item.type === "collection") {
      if (item.docType === "sales_invoice") {
        router.push(`/satislar/faturalar/detay?id=${item.id}`);
      } else {
        router.push("/satislar");
      }
    } else {
      if (item.docType === "purchase_invoice") {
        router.push(`/alislar/detay?id=${item.id}`);
      } else {
        router.push("/masraflar");
      }
    }
  };

  // Fatura No Kopyalama
  const handleCopy = (id: string, text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success(`${text} panoya kopyalandı`);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Excel Raporu İndir
  const handleExportExcel = async () => {
    try {
      await exportExcel("Ren-Endustriyel-Vade-Raporu", [
        {
          name: "Yaklaşan Tahsilatlar",
          title: "Ren Endüstriyel - Yaklaşan Tahsilatlar ve Alacaklar Listesi",
          columns: [
            { header: "Fatura No", value: (r: FinFlowItem) => r.docNumber, type: "text" },
            { header: "Müşteri / Cari Adı", value: (r: FinFlowItem) => r.partyName, type: "text" },
            { header: "Vade Tarihi", value: (r: FinFlowItem) => r.dueDate, type: "date" },
            { header: "Kalan Tutar (TL)", value: (r: FinFlowItem) => r.remainingAmount, type: "money" },
            { header: "Telefon", value: (r: FinFlowItem) => r.partyPhone ?? "-", type: "text" },
          ],
          rows: collections,
        },
        {
          name: "Yaklaşan Ödemeler",
          title: "Ren Endüstriyel - Yaklaşan Ödemeler ve Borçlar Listesi",
          columns: [
            { header: "Belge No", value: (r: FinFlowItem) => r.docNumber, type: "text" },
            { header: "Tedarikçi / Alacaklı", value: (r: FinFlowItem) => r.partyName, type: "text" },
            { header: "Gider Türü", value: (r: FinFlowItem) => r.categoryName ?? r.docTypeLabel, type: "text" },
            { header: "Vade Tarihi", value: (r: FinFlowItem) => r.dueDate, type: "date" },
            { header: "Ödenecek Tutar (TL)", value: (r: FinFlowItem) => r.remainingAmount, type: "money" },
          ],
          rows: payments,
        },
      ]);
      toast.success("Vade takvimi Excel raporu indirildi.");
    } catch (err) {
      console.error(err);
      toast.error("Excel dışa aktarımı başarısız oldu.");
    }
  };

  return (
    <section className="rounded-3xl border-2 border-slate-300 dark:border-[#1e3848] bg-white dark:bg-[#101e26] p-5 sm:p-7 shadow-lg space-y-6 transition-all">
      {/* 1. ÜST BAŞLIK & KONTROLLER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-[#182c37]">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#00b49c] via-[#008f7c] to-emerald-600 text-white flex items-center justify-center shadow-lg shadow-[#00b49c]/25 shrink-0">
            <CalendarClock size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Vade Takvimi &amp; Nakit Akışı Yönetimi
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-[#00b49c]/15 text-[#00b49c] border border-[#00b49c]/30">
                <Sparkles size={11} />
                <span>Canlı Takip</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Müşteri tahsilatları (para girişi) ve tedarikçi / masraf ödemelerinin (para çıkışı) anlık vade dengesi
            </p>
          </div>
        </div>

        {/* Sağ Butonlar */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {/* Görünüm Sekmesi */}
          <div className="inline-flex rounded-xl p-1 bg-slate-100 dark:bg-[#14232c] border border-slate-200 dark:border-[#1e3544]">
            <button
              type="button"
              onClick={() => setViewTab("all")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition",
                viewTab === "all"
                  ? "bg-[#00b49c] text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              İkili Görünüm
            </button>
            <button
              type="button"
              onClick={() => setViewTab("collections")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1",
                viewTab === "collections"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-emerald-500"
              )}
            >
              <ArrowDownLeft size={13} />
              <span>Tahsilatlar</span>
            </button>
            <button
              type="button"
              onClick={() => setViewTab("payments")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1",
                viewTab === "payments"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-rose-500"
              )}
            >
              <ArrowUpRight size={13} />
              <span>Ödemeler</span>
            </button>
          </div>

          {/* Excel Rapor Butonu */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-[#14232c] dark:hover:bg-[#1a2f3a] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#1e3544] transition active:scale-95"
            title="Excel olarak indir"
          >
            <FileSpreadsheet size={15} className="text-emerald-500" />
            <span className="hidden sm:inline">Excel</span>
          </button>
        </div>
      </div>

      {/* 2. ÜÇLÜ KPI ŞERİDİ (Tahsilat - Ödeme - Net Denge) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* KART 1: BEKLENEN TAHSİLATLAR */}
        <div className="rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent dark:bg-[#0d1e1c] p-4 sm:p-5 relative overflow-hidden shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-extrabold text-xs uppercase tracking-wider">
              <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                <ArrowDownLeft size={16} />
              </span>
              <span>BEKLENEN TAHSİLATLAR</span>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
              {collections.length} Belge
            </span>
          </div>

          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-emerald-400 tabular-nums tracking-tight">
              {formatMoney(stats.colTotal)}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs">
              <span className="font-semibold text-rose-500 flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-rose-500 inline-block animate-ping" />
                {stats.colOverdueCount > 0 ? `${formatMoney(stats.colOverdue)} gecikti` : "Geciken alacak yok"}
              </span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                Bu hafta: <strong className="text-slate-800 dark:text-slate-200">{formatMoney(stats.colThisWeek)}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* KART 2: BEKLENEN ÖDEMELER */}
        <div className="rounded-2xl border-2 border-rose-500/40 bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent dark:bg-[#201317] p-4 sm:p-5 relative overflow-hidden shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-extrabold text-xs uppercase tracking-wider">
              <span className="p-1.5 rounded-lg bg-rose-500/20 text-rose-600 dark:text-rose-400">
                <ArrowUpRight size={16} />
              </span>
              <span>BEKLENEN ÖDEMELER</span>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-300">
              {payments.length} Belge
            </span>
          </div>

          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-rose-400 tabular-nums tracking-tight">
              {formatMoney(stats.payTotal)}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs">
              <span className="font-semibold text-rose-500 flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-rose-500 inline-block" />
                {stats.payOverdueCount > 0 ? `${formatMoney(stats.payOverdue)} vadesi geçmiş` : "Geciken ödeme yok"}
              </span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                Bu hafta: <strong className="text-slate-800 dark:text-slate-200">{formatMoney(stats.payThisWeek)}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* KART 3: NET NAKİT POZİSYONU */}
        <div
          className={cn(
            "rounded-2xl border-2 p-4 sm:p-5 relative overflow-hidden shadow-xs transition-all",
            stats.netSurplus >= 0
              ? "border-teal-500/50 bg-gradient-to-br from-teal-500/10 via-[#0d1e23] to-[#101e26]"
              : "border-amber-500/50 bg-gradient-to-br from-amber-500/10 via-[#221c15] to-[#101e26]"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-teal-600 dark:text-teal-300 font-extrabold text-xs uppercase tracking-wider">
              <span className="p-1.5 rounded-lg bg-teal-500/20 text-teal-600 dark:text-teal-300">
                <Scale size={16} />
              </span>
              <span>NET VADE PROJEKSİYONU</span>
            </div>
            <span
              className={cn(
                "text-[11px] font-bold px-2 py-0.5 rounded-full",
                stats.netSurplus >= 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
              )}
            >
              {stats.netSurplus >= 0 ? "Nakit Fazlası" : "Nakit Açığı"}
            </span>
          </div>

          <div className="mt-3">
            <div
              className={cn(
                "text-2xl sm:text-3xl font-black tabular-nums tracking-tight",
                stats.netSurplus >= 0 ? "text-emerald-500 dark:text-emerald-300" : "text-rose-500 dark:text-rose-300"
              )}
            >
              {stats.netSurplus >= 0 ? "+" : ""}
              {formatMoney(stats.netSurplus)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
              {stats.netSurplus >= 0
                ? "Tahsilatlar planlı ödemeleri rahatça karşılıyor. Likidite pozitif."
                : "Planlanan ödemeler tahsilatların üzerinde. Ek fonlama gerekebilir."}
            </p>
          </div>
        </div>
      </div>

      {/* 3. ARAMA VE ZAMAN FİLTRELERİ */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        {/* Aciliyet Filtre Butonları */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1">
            <CalendarDays size={14} />
            <span>Filtre:</span>
          </span>
          <button
            type="button"
            onClick={() => setUrgencyFilter("all")}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-bold transition",
              urgencyFilter === "all"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "bg-slate-100 dark:bg-[#14232c] text-slate-600 dark:text-slate-400 hover:text-white"
            )}
          >
            Tüm Vadeler
          </button>
          <button
            type="button"
            onClick={() => setUrgencyFilter("overdue")}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1",
              urgencyFilter === "overdue"
                ? "bg-rose-600 text-white"
                : "bg-slate-100 dark:bg-[#14232c] text-rose-500 hover:bg-rose-500/10"
            )}
          >
            <AlertTriangle size={12} />
            <span>Gecikenler ({stats.colOverdueCount + stats.payOverdueCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setUrgencyFilter("this_week")}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-bold transition",
              urgencyFilter === "this_week"
                ? "bg-sky-600 text-white"
                : "bg-slate-100 dark:bg-[#14232c] text-slate-600 dark:text-slate-400 hover:text-white"
            )}
          >
            Bu Hafta (Acil)
          </button>
          <button
            type="button"
            onClick={() => setUrgencyFilter("future")}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-bold transition",
              urgencyFilter === "future"
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 dark:bg-[#14232c] text-slate-600 dark:text-slate-400 hover:text-white"
            )}
          >
            Gelecek Hafta+
          </button>
        </div>

        {/* Hızlı Arama Kutusu */}
        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari adı, fatura no ara..."
            className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-[#0c161d] border border-slate-200 dark:border-[#1e3544] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-[#00b49c]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* 4. İKİLİ KOLON LİSTESİ (TAHSİLATLAR & ÖDEMELER) */}
      <div
        className={cn(
          "grid gap-6",
          viewTab === "all" ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"
        )}
      >
        {/* SOL KOLON: YAKLAŞAN TAHSİLATLAR */}
        {(viewTab === "all" || viewTab === "collections") && (
          <div className="space-y-3.5 flex flex-col justify-between rounded-2xl border-2 border-emerald-500/30 bg-slate-50/50 dark:bg-[#0c181f]/80 p-4 sm:p-5">
            <div className="space-y-3">
              {/* Kolon Başlığı */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#162a34]">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold">
                    <ArrowDownLeft size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>Yaklaşan Tahsilatlar</span>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full">
                        {filteredCollections.length} Belge
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Müşterilerden beklenen vadeli alacaklar
                    </p>
                  </div>
                </div>

                <Link
                  href="/satislar/faturalar/yeni"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition active:scale-95"
                >
                  <Plus size={13} />
                  <span className="hidden sm:inline">Yeni Fatura</span>
                </Link>
              </div>

              {/* Liste */}
              {filteredCollections.length === 0 ? (
                <div className="py-12 text-center rounded-xl border border-dashed border-slate-200 dark:border-[#1b3340] p-4">
                  <CheckCircle2 size={32} className="mx-auto text-emerald-500/60 mb-2" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Filtreye uygun bekleyen tahsilat bulunamadı
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Tüm alacaklar tahsil edilmiş veya filtrelenmiş olabilir.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredCollections.map((item) => {
                    const daysDiff = parseDaysDiff(item.dueDate);
                    const badge = getUrgencyBadge(daysDiff);

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleItemClick(item)}
                        className="rounded-xl border border-slate-200 dark:border-[#182c37] hover:border-emerald-500/70 bg-white dark:bg-[#101f28] p-3.5 transition-all shadow-xs hover:shadow-md cursor-pointer group"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          {/* Sol Bilgiler */}
                          <div className="space-y-1.5 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-extrabold text-sm text-slate-900 dark:text-white group-hover:text-emerald-500 transition-colors truncate">
                                {item.partyName}
                              </span>
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold shrink-0",
                                  badge.className
                                )}
                              >
                                <Clock size={11} />
                                <span>{badge.label}</span>
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                              <button
                                type="button"
                                onClick={(e) => handleCopy(item.id, item.docNumber, e)}
                                className="inline-flex items-center gap-1 font-mono font-bold text-slate-700 dark:text-slate-300 hover:text-emerald-500"
                                title="Fatura numarasını kopyala"
                              >
                                <span>{item.docNumber}</span>
                                {copiedId === item.id ? <Check size={12} className="text-emerald-500" /> : <Copy size={11} />}
                              </button>
                              <span>·</span>
                              <span>{item.docTypeLabel}</span>
                              <span>·</span>
                              <span>Vade: <strong className="text-slate-700 dark:text-slate-200">{formatDate(item.dueDate)}</strong></span>
                            </div>
                          </div>

                          {/* Sağ Tutar & Aksiyonlar */}
                          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-[#162732]">
                            <div className="text-base sm:text-lg font-black tabular-nums text-slate-900 dark:text-emerald-400">
                              {formatMoney(item.remainingAmount, item.currency)}
                            </div>

                            {/* Hızlı Butonlar */}
                            <div className="flex items-center gap-1.5">
                              {/* WhatsApp Hatırlat Butonu */}
                              <button
                                type="button"
                                onClick={(e) => handleOpenWaModal(item, e)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 transition active:scale-95"
                                title="Müşteriye WhatsApp hatırlatması gönder"
                              >
                                <MessageCircle size={12} />
                                <span>Hatırlat</span>
                              </button>

                              {/* Tahsil Et Butonu */}
                              <button
                                type="button"
                                onClick={(e) => handleOpenPayment(item, e)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#00b49c] hover:bg-[#009e89] text-white shadow-xs transition active:scale-95"
                                title="Tahsilat Kaydet"
                              >
                                <Wallet size={12} />
                                <span>Tahsil Et</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Alt Link */}
            <div className="pt-3 border-t border-slate-200 dark:border-[#162a34] flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">
                Toplam bekleyen alacak: <strong className="text-slate-900 dark:text-white">{formatMoney(stats.colTotal)}</strong>
              </span>
              <Link
                href="/satislar"
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <span>Tüm Satışları İncele</span>
                <ExternalLink size={12} />
              </Link>
            </div>
          </div>
        )}

        {/* SAĞ KOLON: YAKLAŞAN ÖDEMELER */}
        {(viewTab === "all" || viewTab === "payments") && (
          <div className="space-y-3.5 flex flex-col justify-between rounded-2xl border-2 border-rose-500/30 bg-slate-50/50 dark:bg-[#1c1115]/80 p-4 sm:p-5">
            <div className="space-y-3">
              {/* Kolon Başlığı */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#2a171d]">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-rose-500/20 text-rose-500 flex items-center justify-center font-bold">
                    <ArrowUpRight size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>Yaklaşan Ödemeler</span>
                      <span className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-500/15 px-2 py-0.5 rounded-full">
                        {filteredPayments.length} Belge
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Tedarikçi ve planlı işletme gider ödemeleri
                    </p>
                  </div>
                </div>

                <Link
                  href="/alislar/yeni"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition active:scale-95"
                >
                  <Plus size={13} />
                  <span className="hidden sm:inline">Yeni Alış Faturası</span>
                </Link>
              </div>

              {/* Liste */}
              {filteredPayments.length === 0 ? (
                <div className="py-12 text-center rounded-xl border border-dashed border-slate-200 dark:border-[#381c24] p-4">
                  <CheckCircle2 size={32} className="mx-auto text-rose-500/60 mb-2" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Filtreye uygun bekleyen ödeme bulunamadı
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Tüm borçlar ödenmiş veya filtrelenmiş olabilir.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredPayments.map((item) => {
                    const daysDiff = parseDaysDiff(item.dueDate);
                    const badge = getUrgencyBadge(daysDiff);

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleItemClick(item)}
                        className="rounded-xl border border-slate-200 dark:border-[#26171d] hover:border-rose-500/70 bg-white dark:bg-[#1a1216] p-3.5 transition-all shadow-xs hover:shadow-md cursor-pointer group"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          {/* Sol Bilgiler */}
                          <div className="space-y-1.5 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-extrabold text-sm text-slate-900 dark:text-white group-hover:text-rose-400 transition-colors truncate">
                                {item.partyName}
                              </span>
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold shrink-0",
                                  badge.className
                                )}
                              >
                                <Clock size={11} />
                                <span>{badge.label}</span>
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                              <button
                                type="button"
                                onClick={(e) => handleCopy(item.id, item.docNumber, e)}
                                className="inline-flex items-center gap-1 font-mono font-bold text-slate-700 dark:text-slate-300 hover:text-rose-400"
                                title="Fatura numarasını kopyala"
                              >
                                <span>{item.docNumber}</span>
                                {copiedId === item.id ? <Check size={12} className="text-rose-500" /> : <Copy size={11} />}
                              </button>
                              <span>·</span>
                              <span className="px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-[#251b20] text-slate-600 dark:text-slate-300 text-[10.5px]">
                                {item.categoryName || item.docTypeLabel}
                              </span>
                              <span>·</span>
                              <span>Vade: <strong className="text-slate-700 dark:text-slate-200">{formatDate(item.dueDate)}</strong></span>
                            </div>
                          </div>

                          {/* Sağ Tutar & Aksiyonlar */}
                          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-[#27181e]">
                            <div className="text-base sm:text-lg font-black tabular-nums text-slate-900 dark:text-rose-400">
                              {formatMoney(item.remainingAmount, item.currency)}
                            </div>

                            {/* Hızlı Butonlar */}
                            <div className="flex items-center gap-1.5">
                              {/* Ödeme Yap Butonu */}
                              <button
                                type="button"
                                onClick={(e) => handleOpenPayment(item, e)}
                                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition active:scale-95"
                                title="Ödeme Yap / Kaydet"
                              >
                                <CreditCard size={12} />
                                <span>Ödeme Yap</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Alt Link */}
            <div className="pt-3 border-t border-slate-200 dark:border-[#2a171d] flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">
                Toplam ödenecek borç: <strong className="text-slate-900 dark:text-white">{formatMoney(stats.payTotal)}</strong>
              </span>
              <Link
                href="/alislar"
                className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
              >
                <span>Tüm Alış ve Giderleri İncele</span>
                <ExternalLink size={12} />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* 5. WHATSAPP HATIRLATMA MODALI */}
      <Dialog open={waModalOpen} onOpenChange={setWaModalOpen}>
        <DialogContent
          title="WhatsApp ile Vade Hatırlatması Gönder"
          description={waTargetItem ? `${waTargetItem.partyName} · ${waTargetItem.docNumber}` : ""}
        >
          {waTargetItem && (
            <div className="space-y-4 pt-2">
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-slate-800 dark:text-slate-200 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <MessageCircle size={15} />
                  <span>Hazırlanan Hatırlatma Metni</span>
                </div>
                <div className="text-slate-600 dark:text-slate-300">
                  Fatura Tutarı: <strong>{formatMoney(waTargetItem.remainingAmount)}</strong> · Vade:{" "}
                  <strong>{formatDate(waTargetItem.dueDate)}</strong>
                </div>
              </div>

              {/* Telefon Girişi */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Müşteri Telefon Numarası
                </label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={waPhone}
                    onChange={(e) => setWaPhone(e.target.value)}
                    placeholder="05XX XXX XX XX"
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-[#0c161d] border border-slate-200 dark:border-[#1e3544] text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Şablon Seçimi */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Mesaj Şablonu Seçin
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setWaTemplate("gentle")}
                    className={cn(
                      "p-2.5 rounded-xl border text-left text-xs transition",
                      waTemplate === "gentle"
                        ? "border-emerald-500 bg-emerald-500/15 text-slate-900 dark:text-white font-bold"
                        : "border-slate-200 dark:border-[#1e3544] text-slate-500 dark:text-slate-400"
                    )}
                  >
                    <div>Nazik Vade Hatırlatma</div>
                    <div className="text-[10px] opacity-75 mt-0.5">Vadesi yaklaşan fatura</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWaTemplate("urgent")}
                    className={cn(
                      "p-2.5 rounded-xl border text-left text-xs transition",
                      waTemplate === "urgent"
                        ? "border-rose-500 bg-rose-500/15 text-slate-900 dark:text-white font-bold"
                        : "border-slate-200 dark:border-[#1e3544] text-slate-500 dark:text-slate-400"
                    )}
                  >
                    <div>Gecikme Uyarısı</div>
                    <div className="text-[10px] opacity-75 mt-0.5">Vadesi geçmiş fatura</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWaTemplate("bank")}
                    className={cn(
                      "p-2.5 rounded-xl border text-left text-xs transition",
                      waTemplate === "bank"
                        ? "border-sky-500 bg-sky-500/15 text-slate-900 dark:text-white font-bold"
                        : "border-slate-200 dark:border-[#1e3544] text-slate-500 dark:text-slate-400"
                    )}
                  >
                    <div>IBAN &amp; Banka Bilgisi</div>
                    <div className="text-[10px] opacity-75 mt-0.5">Havale/EFT detayları</div>
                  </button>
                </div>
              </div>

              {/* Gönder Butonu */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-[#182c37]">
                <button
                  type="button"
                  onClick={() => setWaModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#14232c]"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={executeSendWhatsApp}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#25D366] hover:bg-[#1EBE5D] text-white shadow-md transition active:scale-95"
                >
                  <Send size={14} />
                  <span>WhatsApp&apos;ta Aç</span>
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 6. GERÇEK TAHSİLAT & ÖDEME MODALI (PAYMENT DIALOG) */}
      <PaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        flow={paymentDialogFlow}
        target={paymentDialogTarget}
        contactId={paymentContactId}
        title={paymentDialogFlow === "in" ? "Tahsilat Kaydet" : "Ödeme Kaydet"}
      />
    </section>
  );
}
