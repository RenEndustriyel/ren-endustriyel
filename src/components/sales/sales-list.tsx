"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText, Search } from "lucide-react";
import { CustomerSelectModal, type CustomerItem } from "./customer-select-modal";
import { useRows, useRpc, type Row } from "@/lib/data";
import { formatDate, formatMoney, isoDate } from "@/lib/format";
import { exportExcel } from "@/lib/excel";
import { DOC_TYPES, normalizeStatus, statusLabel, statusTone, type DocType } from "@/lib/doc-types";
import { useOrg } from "@/providers/org-provider";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/components/ui/confirm";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DocumentPrintModal } from "@/components/documents/document-print-modal";
import { QuickDocModal } from "@/components/documents/quick-doc-modal";
import {
  DocCard,
  ExportMenu,
  HelpFeatures,
  HelpTrigger,
  ListHeader,
  NewDocFab,
  PeriodSelect,
  TypeTabs,
  docText,
  inPeriod,
  type Period,
} from "@/components/documents/pusulam-doc-list";
import { toast } from "sonner";
import { textMatches } from "@/lib/search";
import { useSessionState } from "@/lib/use-session-state";

type Doc = Row<"documents"> & {
  contact: { name: string; phone?: string | null; email?: string | null } | null;
  category: { name: string } | null;
  lines?: any[];
};

type SatisTab = "orders" | "waybills" | "invoices";

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

type SalesView = "all" | "documents" | "pos" | "cancelled";

export function SalesList({ initialTab = "invoices" }: { initialTab?: SatisTab }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const confirm = useConfirm();
  const { org, canWrite } = useOrg();
  const setStatus = useRpc("set_document_status");

  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = React.useState<SatisTab>(
    tabFromUrl === "orders" || tabFromUrl === "waybills" || tabFromUrl === "invoices" ? tabFromUrl : initialTab,
  );
  const [view, setView] = useSessionState<SalesView>("satislar:gorunum", "all");
  const [q, setQ] = useSessionState(`satislar:${initialTab}:arama`, "");
  const [period, setPeriod] = useSessionState<Period>(`satislar:${initialTab}:tarih`, "today");

  // Panelden gelen tarih aralığı (?baslangic=YYYY-MM-DD&bitis=YYYY-MM-DD)
  const isDay = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
  const rangeFrom = isDay(searchParams.get("baslangic"));
  const rangeTo = isDay(searchParams.get("bitis")) ?? rangeFrom;
  const rangeLabel = rangeFrom
    ? rangeFrom === rangeTo
      ? formatDate(rangeFrom)
      : `${formatDate(rangeFrom)} – ${formatDate(rangeTo)}`
    : null;

  const [printDoc, setPrintDoc] = React.useState<Doc | null>(null);
  const [helpOpen, setHelpOpen] = React.useState(false);

  // Yeni belge akışı: Müşteri seç → Yeni Satış Belgesi
  const [customerModalOpen, setCustomerModalOpen] = React.useState(false);
  const [docModalOpen, setDocModalOpen] = React.useState(false);
  const [selectedCustomer, setSelectedCustomer] = React.useState<CustomerItem | null>(null);

  // Sekmeye göre belge türleri (Faturalar: fatura + hızlı satış fişleri; görünüm çubuğu ayırır)
  const docTypes = React.useMemo<DocType[]>(() => {
    if (activeTab === "orders") return ["sales_order"];
    // Satış irsaliyeleri veritabanında "sales_delivery" olarak kaydediliyor
    if (activeTab === "waybills") return ["sales_delivery"];
    return ["sales_invoice", "pos_sale"];
  }, [activeTab]);

  const docTypeLabel: "Fatura" | "İrsaliye" | "Sipariş" =
    activeTab === "orders" ? "Sipariş" : activeTab === "waybills" ? "İrsaliye" : "Fatura";

  const docs = useRows<Doc>("documents", {
    select: "*, contact:contacts(name, phone, email), category:categories(name), lines:document_lines(*)",
    params: [activeTab],
    filter: (x) => x.is("deleted_at", null).in("doc_type", docTypes),
    order: [
      { column: "issue_date", ascending: false },
      { column: "created_at", ascending: false },
    ],
  });

  const allRows = React.useMemo(() => {
    const merged = [...(docs.data ?? [])];
    const sampleTypes: Record<SatisTab, string[]> = {
      invoices: ["sales_invoice", "pos_sale"],
      orders: ["sales_order"],
      waybills: ["sales_waybill", "sales_delivery"],
    };
    for (const def of DEFAULT_SALES_DOCS.filter((d) => sampleTypes[activeTab].includes(d.doc_type))) {
      if (!merged.some((m) => m.id === def.id || (m.number && m.number === def.number))) merged.push(def);
    }
    return merged;
  }, [docs.data, activeTab]);

  const today = isoDate();
  const filteredRows = React.useMemo(() => {
    const query = q.trim();
    return allRows.filter((d) => {
      if (activeTab === "invoices") {
        const cancelled = d.status === "cancelled";
        if (view === "all" && cancelled) return false;
        if (view === "cancelled" && !cancelled) return false;
        if (view === "documents" && (cancelled || d.doc_type === "pos_sale")) return false;
        if (view === "pos" && (cancelled || d.doc_type !== "pos_sale")) return false;
      }
      if (!inPeriod(d.issue_date, period, today)) return false;
      const day = String(d.issue_date).slice(0, 10);
      if (rangeFrom && rangeTo && (day < rangeFrom || day > rangeTo)) return false;
      if (!query) return true;
      const text = `${d.contact?.name ?? ""} ${(d.contact_snapshot as { name?: string } | null)?.name ?? ""} ${d.number ?? ""} ${d.description ?? ""}`;
      return textMatches(text, query);
    });
  }, [allRows, activeTab, view, period, today, rangeFrom, rangeTo, q]);

  const isSample = (d: Doc) => d.id.startsWith("sale-") || d.org_id === "demo-org";
  const guardSample = (d: Doc) => {
    if (!isSample(d)) return false;
    toast.info("Bu bir örnek kayıttır, üzerinde işlem yapılamaz.");
    return true;
  };
  const nameOf = (d: Doc) =>
    d.contact?.name ||
    (d.contact_snapshot as { name?: string } | null)?.name ||
    (d.doc_type === "pos_sale" ? "Perakende Müşteri" : "Cari seçilmedi");
  const kindOf = (d: Doc) =>
    d.doc_type === "pos_sale"
      ? "Perakende Satış"
      : d.doc_type === "sales_delivery" || d.doc_type === "sales_waybill"
        ? "İrsaliye"
        : "Sipariş Fişi";
  const baseOf = (d: Doc) => DOC_TYPES[d.doc_type as DocType]?.base ?? "/satislar/faturalar";

  const handleStartNewDoc = () => setCustomerModalOpen(true);

  const handleCustomerSelected = (customer: CustomerItem | null) => {
    setCustomerModalOpen(false);
    setSelectedCustomer(customer);
    setDocModalOpen(true);
  };

  const handleDocSaved = (saved: { id: string; doc_type: DocType }) => {
    setActiveTab(saved.doc_type === "sales_order" ? "orders" : saved.doc_type === "sales_delivery" ? "waybills" : "invoices");
  };

  const handleOpen = (d: Doc) => {
    if (isSample(d)) setPrintDoc(d);
    else router.push(`${baseOf(d)}/detay?id=${d.id}`);
  };

  const handleEdit = (d: Doc) => {
    if (guardSample(d)) return;
    router.push(`${baseOf(d)}/duzenle?id=${d.id}`);
  };

  // Faturadan iade belgesi: kalemler kaynak faturadan gelir, kısmi iadede miktarlar düşürülür
  const handleReturn = (d: Doc, partial: boolean) => {
    if (guardSample(d)) return;
    if (partial) toast.info("Kısmi iade: iade edilmeyecek kalemleri silin veya miktarlarını düşürün.");
    router.push(`${DOC_TYPES.sales_return.base}/yeni?kaynak=${d.id}`);
  };

  const handleCancel = async (d: Doc) => {
    if (guardSample(d)) return;
    const ok = await confirm({
      title: `${nameOf(d)} satışı iptal edilsin mi?`,
      description: "Stok hareketleri ve cari bakiye etkileri geri alınır. Belge 'İptal edilenler' görünümünde kalır.",
      danger: true,
      confirmText: "İptal et",
    });
    if (ok) await setStatus.call({ p_doc: d.id, p_status: "cancelled" }, "Satış iptal edildi");
  };

  const changeStage = async (d: Doc, s: string) => {
    if (guardSample(d)) return;
    await setStatus.call({ p_doc: d.id, p_status: s }, `Durum: ${statusLabel(d.doc_type as DocType, s)}`);
  };

  const handleWhatsAppShare = (d: Doc) => {
    const cleanPhone = (d.contact?.phone || "").replace(/[^0-9]/g, "");
    const phone = cleanPhone.startsWith("0") ? "9" + cleanPhone : cleanPhone.length === 10 ? "90" + cleanPhone : cleanPhone;
    const text = encodeURIComponent(
      `*${org?.name || "Ren Endüstriyel"}*\n` +
        `Belge: ${kindOf(d)} (${d.number || "—"})\n` +
        `Sayın: ${nameOf(d)}\n` +
        `Tarih: ${formatDate(d.issue_date)}\n` +
        `Toplam Tutar: ${formatMoney(d.total ?? 0, d.currency || "TRY")}\n` +
        `Durum: ${d.payment_status === "paid" ? "Ödendi" : "Açık"}`,
    );
    window.open(phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`, "_blank");
  };

  const handleEmailShare = (d: Doc) => {
    const subject = encodeURIComponent(`${org?.name || "Ren Endüstriyel"} - ${kindOf(d)} (${d.number || "—"})`);
    const body = encodeURIComponent(
      `Sayın ${nameOf(d)},\n\n` +
        `${formatDate(d.issue_date)} tarihli ${kindOf(d)} (${d.number || "—"}):\n` +
        `Net Tutar: ${formatMoney(d.subtotal ?? 0, d.currency || "TRY")}\n` +
        `KDV Tutarı: ${formatMoney(d.vat_total ?? 0, d.currency || "TRY")}\n` +
        `Toplam Tutar: ${formatMoney(d.total ?? 0, d.currency || "TRY")}\n\n` +
        `Bilgilerinize sunar, iyi çalışmalar dileriz.\n${org?.name || "Ren Endüstriyel"}`,
    );
    window.open(`mailto:${d.contact?.email || ""}?subject=${subject}&body=${body}`, "_self");
  };

  const handleCopy = async (d: Doc) => {
    const text = docText({
      title: kindOf(d),
      name: nameOf(d),
      number: d.number,
      date: d.issue_date,
      lines: (d.lines as { description?: string; quantity?: number; unit_price?: number; total_amount?: number }[] | undefined) ?? [],
      net: Number(d.net_total ?? d.subtotal ?? 0),
      vat: Number(d.vat_total ?? 0),
      total: Number(d.total ?? 0),
      currency: d.currency,
    });
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Belge metni panoya kopyalandı");
    } catch {
      toast.error("Panoya kopyalanamadı");
    }
  };

  const handleExportExcel = () => {
    exportExcel(`satislar_${activeTab}`, [
      {
        name: docTypeLabel,
        rows: filteredRows,
        columns: [
          { header: "Tarih", value: (d) => d.issue_date },
          { header: "Belge No", value: (d) => d.number || "" },
          { header: "Müşteri", value: (d) => nameOf(d) },
          { header: "Net Tutar", value: (d) => Number(d.subtotal || 0), type: "money" },
          { header: "KDV Tutarı", value: (d) => Number(d.vat_total || 0), type: "money" },
          { header: "Toplam Tutar", value: (d) => Number(d.total || 0), type: "money" },
          { header: "Durum", value: (d) => (d.status === "cancelled" ? "İptal" : d.payment_status === "paid" ? "Ödendi" : "Açık") },
          { header: "Vade", value: (d) => d.due_date || "" },
        ],
      },
    ]);
  };

  const views: { id: SalesView; label: string }[] = [
    { id: "all", label: "Tümü" },
    { id: "documents", label: "Faturalar" },
    { id: "pos", label: "Perakende" },
    { id: "cancelled", label: "İptal edilenler" },
  ];

  return (
    <div>
      <ListHeader
        title="Satışlar"
        actions={
          <>
            <ExportMenu items={[{ label: "Excel'e aktar", hint: `Listedeki ${filteredRows.length} belge`, onSelect: handleExportExcel }]} />
            {canWrite && (
              <button type="button" className="btn-primary" onClick={handleStartNewDoc}>
                + Yeni {docTypeLabel}
              </button>
            )}
          </>
        }
      />

      <div className="mb-4 max-w-md">
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
          <input className="input pl-10" placeholder="satışlar arama" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <TypeTabs
        tabs={[
          { id: "orders", label: "Siparişler" },
          { id: "waybills", label: "İrsaliyeler" },
          { id: "invoices", label: "Faturalar" },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {activeTab === "invoices" && (
          <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5" role="group" aria-label="Görünüm">
            {views.map((v) => (
              <button
                key={v.id}
                type="button"
                aria-pressed={view === v.id}
                onClick={() => setView(v.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-semibold transition",
                  view === v.id ? "bg-brand-600 text-white" : "text-slate-600 dark:text-slate-300 hover:text-brand-700",
                )}
              >
                {v.label}
              </button>
            ))}
          </div>
        )}
        <PeriodSelect value={period} onChange={setPeriod} />
        {rangeLabel && (
          <button
            type="button"
            onClick={() => router.replace("/satislar")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800 hover:bg-brand-100 transition-colors"
            title="Tarih filtresini kaldır"
          >
            <span>{rangeLabel}</span>
            <span aria-hidden>✕</span>
          </button>
        )}
      </div>

      {filteredRows.length > 0 && (
        <div className="mb-3 text-sm text-slate-600 dark:text-slate-300">
          <b className="text-slate-900 dark:text-white">{filteredRows.length}</b> kayıt · toplam{" "}
          <b className="text-slate-900 dark:text-white tabular-nums">
            {formatMoney(filteredRows.filter((d) => d.status !== "cancelled").reduce((t, d) => t + Number(d.total_try ?? Number(d.total) * Number(d.exchange_rate || 1)), 0))}
          </b>
        </div>
      )}

      <div className="space-y-2.5">
        {filteredRows.length === 0 ? (
          <div className="card p-10 text-center">
            <div className="h-12 w-12 rounded-xl bg-brand-50 dark:bg-brand-900/30 text-brand-500 flex items-center justify-center mx-auto mb-3">
              <FileText size={22} />
            </div>
            <div className="font-semibold">Kayıt yok</div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {q.trim() || period !== "all" || rangeLabel
                ? "Filtreyle eşleşen kayıt bulunamadı."
                : "Yeni satış belgesi oluşturun veya Hızlı Satış ekranını kullanın."}
            </p>
          </div>
        ) : (
          filteredRows.map((d) => {
            const isPaid = d.payment_status === "paid";
            const isCancelled = d.status === "cancelled";
            const isInvoice = d.doc_type === "sales_invoice" || d.doc_type === "pos_sale";
            const canAct = canWrite && isInvoice && !isCancelled;
            return (
              <DocCard
                key={d.id}
                name={nameOf(d)}
                kindLabel={kindOf(d)}
                date={d.issue_date}
                linesCount={d.lines?.length || 0}
                net={Number(d.net_total ?? d.subtotal ?? 0)}
                vat={Number(d.vat_total ?? 0)}
                total={Number(d.total ?? 0)}
                currency={d.currency}
                status={isCancelled ? "cancelled" : isPaid ? "paid" : "open"}
                stage={DOC_TYPES[d.doc_type as DocType]?.statuses ? { label: statusLabel(d.doc_type as DocType, d.status), tone: statusTone(normalizeStatus(d.doc_type as DocType, d.status)) } : null}
                dueDate={d.due_date}
                overdue={!!d.due_date && !isPaid && !isCancelled && d.due_date < today}
                whatsappTitle={d.contact?.phone ? `${nameOf(d)} kişisine WhatsApp'tan gönder` : "Carinin telefonu yok — sohbet seçtirilir"}
                onOpen={() => handleOpen(d)}
                onPrint={() => setPrintDoc(d)}
                onWhatsApp={() => handleWhatsAppShare(d)}
                onEmail={() => handleEmailShare(d)}
                onCopy={() => handleCopy(d)}
                onEdit={canWrite && !isCancelled ? () => handleEdit(d) : undefined}
                moreItems={[
                  ...(DOC_TYPES[d.doc_type as DocType]?.statuses ?? [])
                    .filter((x) => x.value !== "converted" && x.value !== "cancelled")
                    .map((x) => ({
                      label: `Durum: ${x.label}`,
                      onSelect: () => changeStage(d, x.value),
                      hidden: !canWrite || isCancelled || d.status === "converted" || normalizeStatus(d.doc_type as DocType, d.status) === x.value,
                    })),
                  { label: "Kısmi iade", onSelect: () => handleReturn(d, true), hidden: !canAct },
                  { label: "Tam iade", onSelect: () => handleReturn(d, false), hidden: !canAct },
                  { label: "Kargo gönderisi oluştur", onSelect: () => !guardSample(d) && toast.info("Kargo entegrasyonu henüz kurulmadı."), hidden: !canAct },
                  { label: "Satışı iptal et", onSelect: () => handleCancel(d), danger: true, hidden: !canAct },
                ]}
              />
            );
          })
        )}
      </div>

      {canWrite && <NewDocFab label="Yeni satış" onClick={handleStartNewDoc} />}
      <HelpTrigger title="Satışlar yardımı" onClick={() => setHelpOpen(true)} />

      <CustomerSelectModal open={customerModalOpen} onOpenChange={setCustomerModalOpen} onSelect={handleCustomerSelected} />

      <QuickDocModal
        side="sales"
        open={docModalOpen}
        onOpenChange={setDocModalOpen}
        contact={selectedCustomer}
        initialKind={docTypeLabel}
        onSaved={handleDocSaved}
      />

      {printDoc && (
        <DocumentPrintModal open={!!printDoc} onOpenChange={(v) => !v && setPrintDoc(null)} doc={printDoc as never} org={org} />
      )}

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent
          title="Satışlar"
          description="Satış faturaları ve tahsilatlar. Yeni fatura kesebilir, ödeme kaydedebilir, yazdırabilirsiniz."
          className="max-w-md"
        >
          <HelpFeatures
            items={["Satış faturası oluşturma", "Tahsilat (ödeme) kaydı", "Ödenmiş / ödenmemiş filtreleri", "Fatura yazdırma ve önizleme", "Dövizli fatura desteği"]}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
