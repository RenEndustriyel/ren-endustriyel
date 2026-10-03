"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Download,
  Plus,
  Search,
  FileText,
  Printer,
  Pencil,
  Trash2,
  CircleHelp,
  X,
  MessageCircle,
  Mail,
  Copy,
  MoreHorizontal,
  ChevronDown,
  Eye,
  ShoppingCart,
} from "lucide-react";
import { CustomerSelectModal, type CustomerItem } from "./customer-select-modal";
import { useRows, useRpc, type Row } from "@/lib/data";
import { formatDate, formatMoney, isoDate } from "@/lib/format";
import { exportExcel } from "@/lib/excel";
import { useOrg } from "@/providers/org-provider";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/components/ui/confirm";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown";
import { DocumentPrintModal } from "@/components/documents/document-print-modal";
import { toast } from "sonner";

type Doc = Row<"documents"> & {
  contact: { name: string; phone?: string | null; email?: string | null } | null;
  category: { name: string } | null;
  lines?: any[];
};

type SatisTab = "orders" | "waybills" | "invoices";
type SatisSubTab = "documents" | "pos" | "cancelled";
type DateFilter = "all" | "today" | "this_week" | "this_month" | "last_30" | "this_year";

const DEFAULT_SALES_DOCS: Doc[] = [
  {
    id: "sale-1",
    org_id: "demo-org",
    doc_type: "sales_invoice",
    number: "SAT-2026-001",
    issue_date: "2026-09-24",
    due_date: "2026-10-15",
    payment_status: "unpaid",
    status: "approved",
    subtotal: 21030.0,
    vat_total: 4206.0,
    total: 25236.0,
    currency: "TRY",
    description: "Satış Faturası · 24.09.2026 · 4 kalem",
    contact_id: "cust-balikesir",
    contact: {
      name: "BALIKESİR BÜYÜKŞEHİR BELEDİYESİ",
      phone: "0(266) 245 10 00",
      email: "info@balikesir.bel.tr",
    },
    category: null,
    lines: [
      {
        id: "sl1-1",
        description: "SIVI EL SABUNU SEDEFLİ 20 LT",
        quantity: 5,
        unit_price: 1150.0,
        vat_rate: 20,
        total: 6900.0,
      },
      {
        id: "sl1-2",
        description: "ÇAMAŞIR SUYU ULTRA KONSANTRE 30 KG",
        quantity: 10,
        unit_price: 1100.0,
        vat_rate: 20,
        total: 13200.0,
      },
      {
        id: "sl1-3",
        description: "65*80 ÇÖP POŞETİ 50li SİYAH-MAVİ",
        quantity: 20,
        unit_price: 115.0,
        vat_rate: 20,
        total: 2760.0,
      },
      {
        id: "sl1-4",
        description: "TEX SIVI BULAŞIK DETERJANI 4KG",
        quantity: 12,
        unit_price: 165.0,
        vat_rate: 20,
        total: 2376.0,
      },
    ],
    created_at: "2026-09-24T10:00:00Z",
    updated_at: "2026-09-24T10:00:00Z",
    deleted_at: null,
    contact_snapshot: { name: "BALIKESİR BÜYÜKŞEHİR BELEDİYESİ", phone: "0(266) 245 10 00" },
    prices_include_vat: true,
    discount_total: 0,
    withholding_total: 0,
    notes: null,
    terms: null,
    valid_until: null,
    warehouse_id: null,
    assigned_to: null,
    is_e_invoice: false,
    e_invoice_status: null,
    e_invoice_uuid: null,
    source_document_id: null,
  } as any,
  {
    id: "sale-2",
    org_id: "demo-org",
    doc_type: "sales_invoice",
    number: "SAT-2026-002",
    issue_date: "2026-09-18",
    due_date: "2026-10-05",
    payment_status: "paid",
    status: "approved",
    subtotal: 9160.0,
    vat_total: 1832.0,
    total: 10992.0,
    currency: "TRY",
    description: "Satış Faturası · 18.09.2026 · 3 kalem",
    contact_id: "cust-borsa",
    contact: {
      name: "SUSURLUK TİCARET BORSASI",
      phone: "0(266) 862 14 50",
      email: "info@susurluktb.org.tr",
    },
    category: null,
    lines: [
      {
        id: "sl2-1",
        description: "KRAFT KAĞIT ÇANTA 25x35 CM (1000 ADET)",
        quantity: 2,
        unit_price: 2250.0,
        vat_rate: 20,
        total: 5400.0,
      },
      {
        id: "sl2-2",
        description: "STREÇ FİLM 50 CM 17 MİKRON (6'LI KOLİ)",
        quantity: 4,
        unit_price: 850.0,
        vat_rate: 20,
        total: 4080.0,
      },
      {
        id: "sl2-3",
        description: "7 OZ KARTON BARDAK 3000 (BENCUP)",
        quantity: 3,
        unit_price: 420.0,
        vat_rate: 20,
        total: 1512.0,
      },
    ],
    created_at: "2026-09-18T10:00:00Z",
    updated_at: "2026-09-18T10:00:00Z",
    deleted_at: null,
    contact_snapshot: { name: "SUSURLUK TİCARET BORSASI", phone: "0(266) 862 14 50" },
    prices_include_vat: true,
    discount_total: 0,
    withholding_total: 0,
    notes: null,
    terms: null,
    valid_until: null,
    warehouse_id: null,
    assigned_to: null,
    is_e_invoice: false,
    e_invoice_status: null,
    e_invoice_uuid: null,
    source_document_id: null,
  } as any,
  {
    id: "sale-3",
    org_id: "demo-org",
    doc_type: "pos_sale",
    number: "KASA-2026-0089",
    issue_date: "2026-09-25",
    due_date: null,
    payment_status: "paid",
    status: "approved",
    subtotal: 975.0,
    vat_total: 195.0,
    total: 1170.0,
    currency: "TRY",
    description: "Kasa Fişi (POS) · 25.09.2026 · 3 kalem",
    contact_id: null,
    contact: {
      name: "Perakende Müşteri",
      phone: null,
      email: null,
    },
    category: null,
    lines: [
      {
        id: "sl3-1",
        description: "ASPİRİX YÜZEY TEMİZLİK HAVLUSU 100LÜ",
        quantity: 3,
        unit_price: 75.0,
        vat_rate: 20,
        total: 270.0,
      },
      {
        id: "sl3-2",
        description: "TEX SIVI BULAŞIK DETERJANI 4KG",
        quantity: 2,
        unit_price: 165.0,
        vat_rate: 20,
        total: 396.0,
      },
      {
        id: "sl3-3",
        description: "7 OZ KARTON BARDAK 3000 (BENCUP)",
        quantity: 1,
        unit_price: 420.0,
        vat_rate: 20,
        total: 504.0,
      },
    ],
    created_at: "2026-09-25T10:00:00Z",
    updated_at: "2026-09-25T10:00:00Z",
    deleted_at: null,
    contact_snapshot: { name: "Perakende Müşteri" },
    prices_include_vat: true,
    discount_total: 0,
    withholding_total: 0,
    notes: null,
    terms: null,
    valid_until: null,
    warehouse_id: null,
    assigned_to: null,
    is_e_invoice: false,
    e_invoice_status: null,
    e_invoice_uuid: null,
    source_document_id: null,
  } as any,
  {
    id: "sale-4",
    org_id: "demo-org",
    doc_type: "sales_order",
    number: "SIP-2026-0012",
    issue_date: "2026-09-26",
    due_date: "2026-10-10",
    payment_status: "unpaid",
    status: "approved",
    subtotal: 14500.0,
    vat_total: 2900.0,
    total: 17400.0,
    currency: "TRY",
    description: "Satış Siparişi · 26.09.2026 · 2 kalem",
    contact_id: "cust-reninsaat",
    contact: {
      name: "REN İNŞAAT & TAAHHÜT LTD. ŞTİ.",
      phone: "0(266) 862 30 40",
      email: null,
    },
    category: null,
    lines: [
      {
        id: "sl4-1",
        description: "NİTRİK ASİT 40KG",
        quantity: 10,
        unit_price: 1100.0,
        vat_rate: 20,
        total: 13200.0,
      },
      {
        id: "sl4-2",
        description: "PAYET PUL KOSTİK 25KG",
        quantity: 1,
        unit_price: 3500.0,
        vat_rate: 20,
        total: 4200.0,
      },
    ],
    created_at: "2026-09-26T10:00:00Z",
    updated_at: "2026-09-26T10:00:00Z",
    deleted_at: null,
    contact_snapshot: { name: "REN İNŞAAT & TAAHHÜT LTD. ŞTİ." },
    prices_include_vat: true,
    discount_total: 0,
    withholding_total: 0,
    notes: null,
    terms: null,
    valid_until: null,
    warehouse_id: null,
    assigned_to: null,
    is_e_invoice: false,
    e_invoice_status: null,
    e_invoice_uuid: null,
    source_document_id: null,
  } as any,
  {
    id: "sale-5",
    org_id: "demo-org",
    doc_type: "sales_waybill",
    number: "IRS-2026-0005",
    issue_date: "2026-09-25",
    due_date: null,
    payment_status: "paid",
    status: "approved",
    subtotal: 5800.0,
    vat_total: 1160.0,
    total: 6960.0,
    currency: "TRY",
    description: "Satış İrsaliyesi · 25.09.2026 · 2 kalem",
    contact_id: "cust-marmara",
    contact: {
      name: "MARMARA ZEYTİN TARIM SATIŞ KOOP.",
      phone: "0(266) 862 18 90",
      email: null,
    },
    category: null,
    lines: [
      {
        id: "sl5-1",
        description: "KLOR (SODYUM HİPOKLORİT) 27.5 Kg",
        quantity: 8,
        unit_price: 550.0,
        vat_rate: 20,
        total: 5280.0,
      },
      {
        id: "sl5-2",
        description: "LENTO CONTRA KİREÇ ÇÖZÜCÜ 5LT",
        quantity: 3,
        unit_price: 466.67,
        vat_rate: 20,
        total: 1680.0,
      },
    ],
    created_at: "2026-09-25T10:00:00Z",
    updated_at: "2026-09-25T10:00:00Z",
    deleted_at: null,
    contact_snapshot: { name: "MARMARA ZEYTİN TARIM SATIŞ KOOP." },
    prices_include_vat: true,
    discount_total: 0,
    withholding_total: 0,
    notes: null,
    terms: null,
    valid_until: null,
    warehouse_id: null,
    assigned_to: null,
    is_e_invoice: false,
    e_invoice_status: null,
    e_invoice_uuid: null,
    source_document_id: null,
  } as any,
];

export function SalesList({ initialTab = "invoices" }: { initialTab?: SatisTab }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const confirm = useConfirm();
  const { org, canWrite } = useOrg();
  const del = useRpc("delete_document");

  // Primary Tab: "orders" | "waybills" | "invoices"
  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = React.useState<SatisTab>(
    tabFromUrl === "orders" || tabFromUrl === "waybills" || tabFromUrl === "invoices"
      ? tabFromUrl
      : initialTab
  );

  // Sub Tab (when Faturalar): "documents" | "pos" | "cancelled"
  const [subTab, setSubTab] = React.useState<SatisSubTab>("documents");

  React.useEffect(() => {
    if (tabFromUrl === "orders" || tabFromUrl === "waybills" || tabFromUrl === "invoices") {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  // Search & Date Filter
  const [q, setQ] = React.useState("");
  const [dateFilter, setDateFilter] = React.useState<DateFilter>("all");

  // Print modal state
  const [printDoc, setPrintDoc] = React.useState<Doc | null>(null);

  // Müşteri Seçim Modalı (Pusulam Birebir)
  const [customerModalOpen, setCustomerModalOpen] = React.useState(false);

  // Help modal
  const [helpOpen, setHelpOpen] = React.useState(false);

  // Map active tab & subTab to doc_type
  const docType = React.useMemo(() => {
    if (activeTab === "orders") return "sales_order";
    if (activeTab === "waybills") return "sales_waybill";
    if (subTab === "pos") return "pos_sale";
    return "sales_invoice";
  }, [activeTab, subTab]);

  const docTypeLabel = React.useMemo(() => {
    switch (activeTab) {
      case "orders":
        return "Sipariş";
      case "waybills":
        return "İrsaliye";
      default:
        return subTab === "pos" ? "Kasa Fişi" : "Fatura";
    }
  }, [activeTab, subTab]);

  // Query documents for current type
  const docs = useRows<Doc>("documents", {
    select: "*, contact:contacts(name, phone, email), category:categories(name), lines:document_lines(*)",
    params: [docType, subTab],
    filter: (x) => {
      let qb = x.is("deleted_at", null);
      if (activeTab === "invoices" && subTab === "cancelled") {
        qb = qb.in("doc_type", ["sales_invoice", "pos_sale"]).eq("status", "cancelled");
      } else {
        qb = qb.eq("doc_type", docType);
      }
      return qb;
    },
    order: [
      { column: "issue_date", ascending: false },
      { column: "created_at", ascending: false },
    ],
  });

  const allRows = React.useMemo(() => {
    const dbData = docs.data ?? [];
    const merged = [...dbData];

    let defaultCandidates: Doc[] = [];
    if (activeTab === "invoices") {
      if (subTab === "documents") {
        defaultCandidates = DEFAULT_SALES_DOCS.filter((d) => d.doc_type === "sales_invoice");
      } else if (subTab === "pos") {
        defaultCandidates = DEFAULT_SALES_DOCS.filter((d) => d.doc_type === "pos_sale");
      }
    } else if (activeTab === "orders") {
      defaultCandidates = DEFAULT_SALES_DOCS.filter((d) => d.doc_type === "sales_order");
    } else if (activeTab === "waybills") {
      defaultCandidates = DEFAULT_SALES_DOCS.filter((d) => d.doc_type === "sales_waybill");
    }

    for (const def of defaultCandidates) {
      if (!merged.some((m) => m.id === def.id || (m.number && m.number === def.number))) {
        merged.push(def);
      }
    }

    return merged;
  }, [docs.data, activeTab, subTab]);

  // Date filtering logic
  const filterByDate = (d: Doc, filter: DateFilter) => {
    if (filter === "all") return true;
    const docDate = new Date(d.issue_date);
    const now = new Date();

    if (filter === "today") {
      return docDate.toDateString() === now.toDateString();
    }
    if (filter === "this_week") {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      startOfWeek.setHours(0, 0, 0, 0);
      return docDate >= startOfWeek;
    }
    if (filter === "this_month") {
      return docDate.getFullYear() === now.getFullYear() && docDate.getMonth() === now.getMonth();
    }
    if (filter === "last_30") {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return docDate >= thirtyDaysAgo;
    }
    if (filter === "this_year") {
      return docDate.getFullYear() === now.getFullYear();
    }
    return true;
  };

  // Filtered rows
  const filteredRows = React.useMemo(() => {
    let res = allRows;

    // Filter by Date
    res = res.filter((d) => filterByDate(d, dateFilter));

    // Filter by search query
    if (q.trim()) {
      const query = q.toLowerCase();
      res = res.filter((d) => {
        const customerName = (
          d.contact?.name ||
          (d.contact_snapshot as any)?.name ||
          (d.doc_type === "pos_sale" ? "Perakende Müşteri" : "")
        ).toLowerCase();
        const docNum = (d.number || "").toLowerCase();
        const desc = (d.description || "").toLowerCase();
        return customerName.includes(query) || docNum.includes(query) || desc.includes(query);
      });
    }

    return res;
  }, [allRows, q, dateFilter]);

  const isDocOverdue = (d: Doc) => {
    if (!d.due_date || d.payment_status === "paid" || d.status === "cancelled") return false;
    return d.due_date < isoDate();
  };

  const getNewUrl = () => {
    switch (activeTab) {
      case "orders":
        return "/satislar/siparisler/yeni";
      case "waybills":
        return "/satislar/irsaliyeler/yeni";
      default:
        return "/satislar/faturalar/yeni";
    }
  };

  const handleStartNewDoc = () => {
    setCustomerModalOpen(true);
  };

  const handleCustomerSelected = (customer: CustomerItem | null) => {
    setCustomerModalOpen(false);
    const baseUrl = getNewUrl();
    const targetUrl = customer ? `${baseUrl}?cari=${customer.id}` : baseUrl;
    router.push(targetUrl);
  };

  const getDetailUrl = (id: string) => {
    switch (activeTab) {
      case "orders":
        return `/satislar/siparisler/detay?id=${id}`;
      case "waybills":
        return `/satislar/irsaliyeler/detay?id=${id}`;
      default:
        return `/satislar/faturalar/detay?id=${id}`;
    }
  };

  const getEditUrl = (id: string) => {
    switch (activeTab) {
      case "orders":
        return `/satislar/siparisler/duzenle?id=${id}`;
      case "waybills":
        return `/satislar/irsaliyeler/duzenle?id=${id}`;
      default:
        return `/satislar/faturalar/duzenle?id=${id}`;
    }
  };

  // Actions
  const handleDelete = async (d: Doc) => {
    const name = d.contact?.name || d.number || docTypeLabel;
    if (
      !(await confirm({
        title: `${name} silinsin mi?`,
        description: "Stok hareketleri ve cari bakiye etkileri geri alınır.",
        danger: true,
        confirmText: "Sil",
      }))
    ) {
      return;
    }
    await del.call({ p_doc: d.id }, "Belge silindi");
  };

  const handleDuplicate = (d: Doc) => {
    router.push(`${getNewUrl()}?kopya=${d.id}`);
  };

  const handleWhatsAppShare = (d: Doc) => {
    const customerName = d.contact?.name || (d.contact_snapshot as any)?.name || (d.doc_type === "pos_sale" ? "Perakende Müşteri" : "Müşteri");
    const phone = d.contact?.phone || "";
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const formattedPhone = cleanPhone.startsWith("0")
      ? "9" + cleanPhone
      : cleanPhone.length === 10
        ? "90" + cleanPhone
        : cleanPhone;

    const text = encodeURIComponent(
      `*${org?.name || "Ren Endüstriyel"}*\n` +
      `Belge: ${docTypeLabel} (${d.number || "—"})\n` +
      `Sayın: ${customerName}\n` +
      `Tarih: ${formatDate(d.issue_date)}\n` +
      `Toplam Tutar: ${formatMoney(d.total ?? 0, d.currency || "TRY")}\n` +
      `Durum: ${d.payment_status === "paid" ? "Ödendi" : "Açık"}`
    );

    const waUrl = formattedPhone ? `https://wa.me/${formattedPhone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(waUrl, "_blank");
  };

  const handleEmailShare = (d: Doc) => {
    const customerName = d.contact?.name || (d.contact_snapshot as any)?.name || "İlgili";
    const email = d.contact?.email || "";
    const subject = encodeURIComponent(`${org?.name || "Ren Endüstriyel"} - ${docTypeLabel} (${d.number || "—"})`);
    const body = encodeURIComponent(
      `Sayın ${customerName},\n\n` +
      `${formatDate(d.issue_date)} tarihli ${docTypeLabel} (${d.number || "—"}) faturanız:\n` +
      `Net Tutar: ${formatMoney(d.subtotal ?? 0, d.currency || "TRY")}\n` +
      `KDV Tutarı: ${formatMoney(d.vat_total ?? 0, d.currency || "TRY")}\n` +
      `Toplam Tutar: ${formatMoney(d.total ?? 0, d.currency || "TRY")}\n\n` +
      `Bilgilerinize sunar, iyi çalışmalar dileriz.\n${org?.name || "Ren Endüstriyel"}`
    );

    window.open(`mailto:${email}?subject=${subject}&body=${body}`, "_blank");
  };

  const handleExportExcel = () => {
    exportExcel(`satislar_${activeTab}`, [
      {
        name: docTypeLabel,
        rows: filteredRows,
        columns: [
          { header: "Tarih", value: (d) => d.issue_date },
          { header: "Belge No", value: (d) => d.number || "" },
          { header: "Müşteri", value: (d) => d.contact?.name || (d.contact_snapshot as any)?.name || (d.doc_type === "pos_sale" ? "Perakende Müşteri" : "") },
          { header: "Net Tutar", value: (d) => Number(d.subtotal || 0), type: "money" },
          { header: "KDV Tutarı", value: (d) => Number(d.vat_total || 0), type: "money" },
          { header: "Toplam Tutar", value: (d) => Number(d.total || 0), type: "money" },
          { header: "Durum", value: (d) => d.payment_status || d.status },
          { header: "Vade", value: (d) => d.due_date || "" },
        ],
      },
    ]);
  };

  const dateFilterLabels: Record<DateFilter, string> = {
    all: "Tüm tarihler",
    today: "Bugün",
    this_week: "Bu Hafta",
    this_month: "Bu Ay",
    last_30: "Son 30 Gün",
    this_year: "Bu Yıl",
  };

  return (
    <div className="flex-1 pb-16">
      {/* 1. Başlık ve Aksiyon Butonları (Pusulam Birebir) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Satışlar
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Sipariş, irsaliye ve faturalarınız
          </p>
        </div>

        {/* Sağ Buton Grubu */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* İçe / Dışa Aktar */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold bg-white dark:bg-[#142530] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#1e3544] hover:bg-slate-100 dark:hover:bg-[#1b2f3b] transition-colors shadow-xs"
              >
                <Download size={15} />
                <span>İçe / Dışa Aktar</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={handleExportExcel}>
                <Download size={14} />
                <span>Excel Olarak İndir (.xlsx)</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => toast.info("CSV dışa aktarım hazırlanıyor...")}>
                <FileText size={14} />
                <span>CSV Olarak Dışa Aktar</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* + Yeni Fatura Butonu (Pusulam Birebir: Müşteri Seçim Modalı Açar) */}
          {canWrite && (
            <button
              type="button"
              onClick={handleStartNewDoc}
              className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold bg-[#00b49c] hover:bg-[#009e89] text-white shadow-xs transition active:scale-95 cursor-pointer"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>+ Yeni {docTypeLabel}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Arama Çubuğu (Pusulam Birebir) */}
      <div className="mb-4 w-full max-w-md">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            className="w-full rounded-xl bg-white dark:bg-[#111e26] border border-slate-200 dark:border-[#182c37] pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-[#00b49c] transition-colors"
            placeholder="satışlar arama"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      {/* 3. Birincil Sekmeler (Siparişler, İrsaliyeler, Faturalar) */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("orders")}
          className={cn(
            "px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all",
            activeTab === "orders"
              ? "bg-[#00b49c] text-white shadow-xs font-bold"
              : "bg-white dark:bg-[#111e26] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#182c37] hover:border-slate-300 dark:hover:border-slate-600"
          )}
        >
          Siparişler
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("waybills")}
          className={cn(
            "px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all",
            activeTab === "waybills"
              ? "bg-[#00b49c] text-white shadow-xs font-bold"
              : "bg-white dark:bg-[#111e26] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#182c37] hover:border-slate-300 dark:hover:border-slate-600"
          )}
        >
          İrsaliyeler
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("invoices")}
          className={cn(
            "px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all",
            activeTab === "invoices"
              ? "bg-[#00b49c] text-white shadow-xs font-bold"
              : "bg-white dark:bg-[#111e26] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#182c37] hover:border-slate-300 dark:hover:border-slate-600"
          )}
        >
          Faturalar
        </button>
      </div>

      {/* 4. İkincil Alt Sekmeler (Faturalar seçiliyken: Belgeler, Kasa fişleri, İptal edilenler, Tarih) */}
      {activeTab === "invoices" && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSubTab("documents")}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all",
              subTab === "documents"
                ? "bg-[#00b49c] text-white shadow-xs font-bold"
                : "bg-white dark:bg-[#111e26] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#182c37] hover:border-slate-300 dark:hover:border-slate-600"
            )}
          >
            Belgeler
          </button>

          <button
            type="button"
            onClick={() => setSubTab("pos")}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all",
              subTab === "pos"
                ? "bg-[#00b49c] text-white shadow-xs font-bold"
                : "bg-white dark:bg-[#111e26] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#182c37] hover:border-slate-300 dark:hover:border-slate-600"
            )}
          >
            Kasa fişleri (gün gün)
          </button>

          <button
            type="button"
            onClick={() => setSubTab("cancelled")}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all",
              subTab === "cancelled"
                ? "bg-[#00b49c] text-white shadow-xs font-bold"
                : "bg-white dark:bg-[#111e26] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#182c37] hover:border-slate-300 dark:hover:border-slate-600"
            )}
          >
            İptal edilenler
          </button>

          {/* Tarih Dropdown Pill */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-[#111e26] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#182c37] hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
              >
                <span>{dateFilterLabels[dateFilter]}</span>
                <ChevronDown size={14} className="text-slate-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onSelect={() => setDateFilter("all")}>Tüm tarihler</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setDateFilter("today")}>Bugün</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setDateFilter("this_week")}>Bu Hafta</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setDateFilter("this_month")}>Bu Ay</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setDateFilter("last_30")}>Son 30 Gün</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setDateFilter("this_year")}>Bu Yıl</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* 5. Satış Belgeleri Listesi (Pusulam Birebir Kart Yapısı) */}
      <div className="space-y-2.5">
        {filteredRows.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 dark:border-[#182c37] bg-white dark:bg-[#0c1822] p-12 sm:p-16 text-center shadow-xs">
            <div className="size-16 rounded-2xl bg-emerald-500/10 dark:bg-[#0e1d27] border border-emerald-500/20 dark:border-[#142633] flex items-center justify-center text-[#00b49c] mx-auto mb-4">
              <ShoppingCart size={32} strokeWidth={2} />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-1">
              Henüz satış belgesi yok
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
              Yeni satış belgesi oluşturun veya Hızlı Satış ekranını kullanın.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleStartNewDoc}
                className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs sm:text-sm font-bold bg-[#00b49c] hover:bg-[#009e89] text-white shadow-md shadow-[#00b49c]/20 transition active:scale-95 cursor-pointer"
              >
                <Plus size={16} strokeWidth={2.5} />
                <span>+ Yeni {docTypeLabel}</span>
              </button>
              <button
                type="button"
                onClick={() => router.push("/hizli-satis")}
                className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs sm:text-sm font-semibold bg-slate-100 dark:bg-[#13232e] hover:bg-slate-200 dark:hover:bg-[#192f3e] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#1e3544] transition active:scale-95 cursor-pointer"
              >
                <span>Hızlı Satış</span>
              </button>
            </div>
          </div>
        ) : (
          filteredRows.map((d) => {
            const customerName =
              d.contact?.name ||
              (d.contact_snapshot as any)?.name ||
              (d.doc_type === "pos_sale" ? "Perakende Müşteri" : d.description || "Müşteri Belirtilmemiş");
            const isOverdue = isDocOverdue(d);
            const isPaid = d.payment_status === "paid";
            const isCancelled = d.status === "cancelled";
            const linesCount = d.lines?.length || 1;

            return (
              <div
                key={d.id}
                role="button"
                tabIndex={0}
                onClick={() => setPrintDoc(d)}
                className="rounded-2xl border border-slate-200 dark:border-[#182c37] bg-white dark:bg-[#111e26] hover:border-slate-300 dark:hover:border-[#223d4c] p-3 sm:p-4 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 group cursor-pointer shadow-xs"
              >
                {/* Sol Bölüm: İkon ve Bilgiler */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-teal-50 dark:bg-[#0d282e] text-[#00b49c] border border-teal-200/50 dark:border-[#14474f] flex items-center justify-center shrink-0">
                    <FileText size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold truncate text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
                      {customerName}
                    </div>
                    <div className="text-xs text-slate-400 truncate mt-1">
                      {docTypeLabel} Fişi · {formatDate(d.issue_date)} · {linesCount} kalem
                    </div>
                    <div className="text-[11px] text-slate-400/80 mt-0.5 tabular-nums">
                      Net {formatMoney(d.subtotal ?? 0)} · KDV {formatMoney(d.vat_total ?? 0)}
                    </div>
                  </div>
                </div>

                {/* Orta Bölüm: 6'lı Aksiyon Butonları (Pusulam Birebir) */}
                <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 shrink-0">
                  {/* 1. Belge */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPrintDoc(d);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg px-2 sm:px-2.5 py-1 text-xs font-medium bg-slate-100 dark:bg-[#142530] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#1e3544] hover:bg-slate-200 dark:hover:bg-[#1c3241] transition"
                    title="Belgeyi Yazdır / Görüntüle"
                  >
                    <Printer size={13} className="text-slate-500 dark:text-slate-400" />
                    <span>Belge</span>
                  </button>

                  {/* 2. WhatsApp */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleWhatsAppShare(d);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg px-2 sm:px-2.5 py-1 text-xs font-semibold bg-slate-100 dark:bg-[#142530] text-[#10b981] border border-slate-200 dark:border-[#1e3544] hover:bg-emerald-50 dark:hover:bg-[#163a33] transition"
                    title="WhatsApp ile Paylaş"
                  >
                    <MessageCircle size={13} className="text-[#10b981]" />
                    <span>WhatsApp</span>
                  </button>

                  {/* 3. E-posta */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEmailShare(d);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg px-2 sm:px-2.5 py-1 text-xs font-medium bg-slate-100 dark:bg-[#142530] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#1e3544] hover:bg-slate-200 dark:hover:bg-[#1c3241] transition"
                    title="E-posta ile Gönder"
                  >
                    <Mail size={13} className="text-slate-500 dark:text-slate-400" />
                    <span>E-posta</span>
                  </button>

                  {/* 4. Kopyala */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicate(d);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg px-2 sm:px-2.5 py-1 text-xs font-medium bg-slate-100 dark:bg-[#142530] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#1e3544] hover:bg-slate-200 dark:hover:bg-[#1c3241] transition"
                    title="Belgeyi Kopyala"
                  >
                    <Copy size={13} className="text-slate-500 dark:text-slate-400" />
                    <span>Kopyala</span>
                  </button>

                  {/* 5. Düzenle */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(getEditUrl(d.id));
                    }}
                    className="inline-flex items-center gap-1 rounded-lg px-2 sm:px-2.5 py-1 text-xs font-medium bg-slate-100 dark:bg-[#142530] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#1e3544] hover:bg-slate-200 dark:hover:bg-[#1c3241] transition"
                    title="Düzenle"
                  >
                    <Pencil size={13} className="text-slate-500 dark:text-slate-400" />
                    <span>Düzenle</span>
                  </button>

                  {/* 6. Diğer (Dropdown) */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 rounded-lg px-2 sm:px-2.5 py-1 text-xs font-medium bg-slate-100 dark:bg-[#142530] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#1e3544] hover:bg-slate-200 dark:hover:bg-[#1c3241] transition"
                        title="Diğer Seçenekler"
                      >
                        <MoreHorizontal size={13} className="text-slate-500 dark:text-slate-400" />
                        <span>Diğer</span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => router.push(getDetailUrl(d.id))}>
                        <Eye size={14} />
                        <span>Detayı Görüntüle</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setPrintDoc(d)}>
                        <Printer size={14} />
                        <span>Yazdır / PDF</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => handleDelete(d)} className="text-rose-500 focus:text-rose-500">
                        <Trash2 size={14} />
                        <span>Belgeyi Sil</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Sağ Bölüm: Tutar, Durum ve Vade */}
                <div className="shrink-0 flex md:flex-col items-center md:items-end justify-between md:justify-center gap-1.5 md:min-w-[130px] border-t md:border-t-0 border-slate-100 dark:border-[#182c37] pt-2 md:pt-0 text-right">
                  <div className="font-extrabold text-sm sm:text-base tabular-nums text-slate-900 dark:text-white">
                    {formatMoney(d.total ?? 0)}
                  </div>

                  <div className="flex flex-col items-end gap-0.5">
                    {isPaid ? (
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-500 select-none">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span>Ödendi</span>
                      </span>
                    ) : isCancelled ? (
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-rose-500 select-none">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                        <span>İptal</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-500 select-none">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                        <span>Açık</span>
                      </span>
                    )}

                    {d.due_date && (
                      <span
                        className={cn(
                          "text-[11px] font-medium leading-tight",
                          isOverdue
                            ? "text-rose-500 dark:text-rose-400"
                            : "text-slate-400 dark:text-slate-500"
                        )}
                      >
                        Vade: {formatDate(d.due_date)} {isOverdue && "· gecikti"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 6. Pusulam Floating Action Button (FAB) */}
      <button
        type="button"
        onClick={handleStartNewDoc}
        className="fixed z-30 h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-[#00b49c] hover:bg-[#009e89] text-white shadow-xl shadow-[#00b49c]/30 flex items-center justify-center transition-all hover:scale-105 active:scale-95 right-5 sm:right-7 bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] lg:bottom-8 cursor-pointer"
        title={`Yeni ${docTypeLabel}`}
        aria-label={`Yeni ${docTypeLabel}`}
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>

      {/* Müşteri Seç Pop-up Modalı (Pusulam Birebir) */}
      <CustomerSelectModal
        open={customerModalOpen}
        onOpenChange={setCustomerModalOpen}
        onSelect={handleCustomerSelected}
      />

      {/* 7. Pusulam Sağ Alt Yardım Butonu */}
      <button
        type="button"
        onClick={() => setHelpOpen(true)}
        className="fixed z-20 h-7 w-7 rounded-full text-slate-500 hover:text-slate-300 flex items-center justify-center transition right-2 bottom-2"
        title="Sayfa Yardımı"
        aria-label="Sayfa Yardımı"
      >
        <CircleHelp size={18} />
      </button>

      {/* Belge Yazdır / Önizleme Modalı */}
      {printDoc && (
        <DocumentPrintModal
          open={!!printDoc}
          onOpenChange={(v) => !v && setPrintDoc(null)}
          doc={printDoc as any}
          org={org}
        />
      )}

      {/* Sayfa Yardımı Modalı */}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent
          title="Satışlar Sayfası Yardımı"
          description="Satış belgelerini ve tahsilatları yönetme rehberi"
          className="max-w-md bg-white dark:bg-[#111e26] border border-slate-200 dark:border-[#182c37]"
        >
          <div className="space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            <p>
              <strong>Siparişler, İrsaliyeler ve Faturalar:</strong> Üstteki sekmeleri kullanarak ilgili belge türünü anında listeleyebilirsiniz.
            </p>
            <p>
              <strong>Kasa Fişleri &amp; İptaller:</strong> Faturalar sekmesindeyken kasa fişlerinizi ve iptal edilen satışlarınızı alt sekmelerden görebilirsiniz.
            </p>
            <p>
              <strong>Hızlı İşlemler:</strong> Kart üzerinde yer alan Belge (yazdır), WhatsApp, E-posta, Kopyala ve Düzenle butonlarıyla tek tıkla aksiyon alabilirsiniz.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
