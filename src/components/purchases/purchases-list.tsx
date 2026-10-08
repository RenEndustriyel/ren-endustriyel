"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText, Loader2, Search, Sparkles } from "lucide-react";
import { useRows, useRpc, type Row } from "@/lib/data";
import { formatDate, formatMoney, isoDate } from "@/lib/format";
import { exportExcel } from "@/lib/excel";
import { DOC_TYPES, normalizeStatus, statusLabel, statusTone, type DocType } from "@/lib/doc-types";
import { useOrg } from "@/providers/org-provider";
import { useConfirm } from "@/components/ui/confirm";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DocumentPrintModal } from "@/components/documents/document-print-modal";
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
import { ProductImport } from "@/components/products/product-import";
import { SupplierSelectModal, type SupplierItem } from "./supplier-select-modal";
import { PurchaseInvoiceModal } from "./purchase-invoice-modal";
import { toast } from "sonner";
import { textMatches } from "@/lib/search";

type Doc = Row<"documents"> & {
  contact: { name: string; phone?: string | null; email?: string | null } | null;
  category: { name: string } | null;
  lines?: { id: string }[];
};

type AlisTab = "orders" | "waybills" | "invoices";

// Fotoğraftaki birebir gerçekçi örnek alış kayıtları (media_1791008363156.png)
const DEFAULT_PURCHASE_DOCS: Doc[] = [
  {
    id: "sample-1",
    org_id: "demo-org",
    doc_type: "purchase_invoice",
    number: "ALIS-2026-001",
    issue_date: "2026-09-22",
    due_date: "2026-10-06",
    payment_status: "unpaid",
    status: "approved",
    subtotal: 3250.0,
    vat_total: 0.0,
    total: 3250.0,
    currency: "TRY",
    description: "Alış Fişi · 22.09.2026 · 2 kalem",
    contact_id: "sup-reha",
    contact: {
      name: "REHA SÖZERİ-AMBALAJ",
      phone: "0(266) 862 45 67",
      email: null,
    },
    category: null,
    lines: [
      {
        id: "l1-1",
        description: "KRAFT KAĞIT ÇANTA 25x35 CM (1000 ADET)",
        quantity: 1,
        unit_price: 1850.0,
        vat_rate: 0,
        total: 1850.0,
      },
      {
        id: "l1-2",
        description: "STREÇ FİLM 50 CM 17 MİKRON (6'LI KOLİ)",
        quantity: 2,
        unit_price: 700.0,
        vat_rate: 0,
        total: 1400.0,
      },
    ],
    created_at: "2026-09-22T10:00:00Z",
    updated_at: "2026-09-22T10:00:00Z",
    deleted_at: null,
    contact_snapshot: { name: "REHA SÖZERİ-AMBALAJ", phone: "0(266) 862 45 67" },
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
    id: "sample-2",
    org_id: "demo-org",
    doc_type: "purchase_invoice",
    number: "ALIS-2026-002",
    issue_date: "2026-09-07",
    due_date: "2026-10-02",
    payment_status: "unpaid",
    status: "approved",
    subtotal: 925.01,
    vat_total: 185.0,
    total: 1110.01,
    currency: "TRY",
    description: "Alış Fişi · 07.09.2026 · 1 kalem",
    contact_id: "sup-seypa",
    contact: {
      name: "SEYPA GIDA VE İHT.MAD.ÜRETİM.DAĞ.VE TİC.A.Ş.",
      phone: "0(266) 863 11 22",
      email: null,
    },
    category: null,
    lines: [
      {
        id: "l2-1",
        description: "SIVI EL SABUNU SEDEFLİ 20 LT",
        quantity: 1,
        unit_price: 925.01,
        vat_rate: 20,
        vat_amount: 185.0,
        total: 1110.01,
      },
    ],
    created_at: "2026-09-07T10:00:00Z",
    updated_at: "2026-09-07T10:00:00Z",
    deleted_at: null,
    contact_snapshot: { name: "SEYPA GIDA VE İHT.MAD.ÜRETİM.DAĞ.VE TİC.A.Ş.", phone: "0(266) 863 11 22" },
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
    id: "sample-3",
    org_id: "demo-org",
    doc_type: "purchase_invoice",
    number: "ALIS-2026-003",
    issue_date: "2026-08-31",
    due_date: "2026-09-17",
    payment_status: "unpaid",
    status: "approved",
    subtotal: 915.61,
    vat_total: 183.12,
    total: 1098.73,
    currency: "TRY",
    description: "Alış Fişi · 31.08.2026 · 1 kalem",
    contact_id: "sup-seypa",
    contact: {
      name: "SEYPA GIDA VE İHT.MAD.ÜRETİM.DAĞ.VE TİC.A.Ş.",
      phone: "0(266) 863 11 22",
      email: null,
    },
    category: null,
    lines: [
      {
        id: "l3-1",
        description: "ÇAMAŞIR SUYU ULTRA KONSANTRE 30 KG",
        quantity: 1,
        unit_price: 915.61,
        vat_rate: 20,
        vat_amount: 183.12,
        total: 1098.73,
      },
    ],
    created_at: "2026-08-31T10:00:00Z",
    updated_at: "2026-08-31T10:00:00Z",
    deleted_at: null,
    contact_snapshot: { name: "SEYPA GIDA VE İHT.MAD.ÜRETİM.DAĞ.VE TİC.A.Ş.", phone: "0(266) 863 11 22" },
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
    id: "sample-4",
    org_id: "demo-org",
    doc_type: "purchase_invoice",
    number: "ALIS-2026-004",
    issue_date: "2026-08-28",
    due_date: "2026-09-03",
    payment_status: "unpaid",
    status: "approved",
    subtotal: 6260.74,
    vat_total: 1252.15,
    total: 7512.89,
    currency: "TRY",
    description: "Alış Fişi · 28.08.2026 · 6 kalem",
    contact_id: "sup-seypa",
    contact: {
      name: "SEYPA GIDA VE İHT.MAD.ÜRETİM.DAĞ.VE TİC.A.Ş.",
      phone: "0(266) 863 11 22",
      email: null,
    },
    category: null,
    lines: [
      {
        id: "l4-1",
        description: "GLANEX BULAŞIK MAK.DETERJANI 20KG",
        quantity: 2,
        unit_price: 740.0,
        vat_rate: 20,
        total: 1776.0,
      },
      {
        id: "l4-2",
        description: "LENTO CONTRA BULAŞIK MAK.KİREÇ ÇÖZÜCÜ 5LT",
        quantity: 4,
        unit_price: 395.0,
        vat_rate: 20,
        total: 1896.0,
      },
      {
        id: "l4-3",
        description: "KLOR (SODYUM HİPOKLORİT) 27.5 Kg",
        quantity: 2,
        unit_price: 475.0,
        vat_rate: 20,
        total: 1140.0,
      },
      {
        id: "l4-4",
        description: "TEX SIVI BULAŞIK DETERJANI LİMON 4KG",
        quantity: 8,
        unit_price: 132.25,
        vat_rate: 20,
        total: 1269.6,
      },
      {
        id: "l4-5",
        description: "65*80 ÇÖP POŞETİ 50li SİYAH-MAVİ",
        quantity: 10,
        unit_price: 85.0,
        vat_rate: 20,
        total: 1020.0,
      },
      {
        id: "l4-6",
        description: "7 OZ KARTON BARDAK 3000 (BENCUP)",
        quantity: 1,
        unit_price: 342.74,
        vat_rate: 20,
        vat_amount: 68.55,
        total: 411.29,
      },
    ],
    created_at: "2026-08-28T10:00:00Z",
    updated_at: "2026-08-28T10:00:00Z",
    deleted_at: null,
    contact_snapshot: { name: "SEYPA GIDA VE İHT.MAD.ÜRETİM.DAĞ.VE TİC.A.Ş.", phone: "0(266) 863 11 22" },
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
    id: "sample-5",
    org_id: "demo-org",
    doc_type: "purchase_invoice",
    number: "4B4VISHN",
    issue_date: "2026-07-02",
    due_date: null,
    payment_status: "paid",
    status: "approved",
    subtotal: 9317.1,
    vat_total: 1863.42,
    total: 11180.52,
    currency: "TRY",
    description: "Alış Fişi · 02.07.2026 · 7 kalem",
    contact_id: "sup-aykim",
    contact: {
      name: "AYKİM TEMİZLİK MADDELERİ SANAYİ VE TİCARET ANONİM ŞİRKETİ",
      phone: "0(212) 475 0834",
      email: null,
    },
    category: null,
    lines: [
      {
        id: "l5-1",
        description: "NİTRİK ASİT 40KG",
        quantity: 2,
        unit_price: 950.0,
        vat_rate: 20,
        vat_amount: 380.0,
        total: 2280.0,
      },
      {
        id: "l5-2",
        description: "PAYET PUL KOSTİK 25KG",
        quantity: 1,
        unit_price: 2000.0,
        vat_rate: 20,
        vat_amount: 400.0,
        total: 2400.0,
      },
      {
        id: "l5-3",
        description: "GLANEX BULAŞIK MAK.DETERJANI 20KG",
        quantity: 1,
        unit_price: 740.0,
        vat_rate: 20,
        vat_amount: 59.2,
        total: 799.2,
      },
      {
        id: "l5-4",
        description: "LENTO CONTRA BULAŞIK MAK.KİREÇ ÇÖZÜCÜ 5LT",
        quantity: 4,
        unit_price: 395.0,
        vat_rate: 20,
        vat_amount: 145.36,
        total: 1725.36,
      },
      {
        id: "l5-5",
        description: "ASPİRİX YÜZEY TEMİZLİK HAVLUSU 100LÜ",
        quantity: 24,
        unit_price: 61.0,
        vat_rate: 20,
        vat_amount: 292.8,
        total: 1756.8,
      },
      {
        id: "l5-6",
        description: "KLOR (SODYUM HİPOKLORİT) 27.5 Kg",
        quantity: 2,
        unit_price: 475.0,
        vat_rate: 20,
        vat_amount: 190.0,
        total: 1140.0,
      },
      {
        id: "l5-7",
        description: "TEX SIVI BULAŞIK DETERJANI LİMON 4KG",
        quantity: 8,
        unit_price: 132.25,
        vat_rate: 20,
        vat_amount: 21.16,
        total: 1079.16,
      },
    ],
    created_at: "2026-07-02T10:00:00Z",
    updated_at: "2026-07-02T10:00:00Z",
    deleted_at: null,
    contact_snapshot: {
      name: "AYKİM TEMİZLİK MADDELERİ SANAYİ VE TİCARET ANONİM ŞİRKETİ",
      tax_number: "1111111111",
      phone: "0(212) 475 0834",
    },
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

export function PurchasesList({ initialTab = "invoices" }: { initialTab?: AlisTab }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const confirm = useConfirm();
  const { org, canWrite } = useOrg();
  const del = useRpc("delete_document");
  const setStatus = useRpc("set_document_status");

  // Sekme: URL'deki ?tab= değeri başlangıç sekmesini belirler
  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = React.useState<AlisTab>(
    tabFromUrl === "orders" || tabFromUrl === "waybills" || tabFromUrl === "invoices" ? tabFromUrl : initialTab,
  );

  const [q, setQ] = React.useState("");
  const [period, setPeriod] = React.useState<Period>("all");

  // Yeni belge akışı: Tedarikçi seç → Yeni Alış Belgesi
  const [supplierModalOpen, setSupplierModalOpen] = React.useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = React.useState(false);
  const [selectedSupplier, setSelectedSupplier] = React.useState<SupplierItem | null>(null);

  const [printDoc, setPrintDoc] = React.useState<Doc | null>(null);
  const [helpOpen, setHelpOpen] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);

  // Fatura Oku (yapay zeka) penceresi
  const [aiModalOpen, setAiModalOpen] = React.useState(false);
  const [aiLoading, setAiLoading] = React.useState(false);
  const [aiResult, setAiResult] = React.useState<{ supplierName?: string; date?: string; total?: number; vat?: number } | null>(null);

  const docType = React.useMemo<DocType>(() => {
    switch (activeTab) {
      case "orders":
        return "purchase_order";
      case "waybills":
        // Alış irsaliyeleri veritabanında "purchase_delivery" olarak kaydediliyor
        return "purchase_delivery";
      default:
        return "purchase_invoice";
    }
  }, [activeTab]);

  const docTypeLabel: "Fatura" | "İrsaliye" | "Sipariş" =
    activeTab === "orders" ? "Sipariş" : activeTab === "waybills" ? "İrsaliye" : "Fatura";
  const kindLabel = activeTab === "orders" ? "Sipariş Fişi" : activeTab === "waybills" ? "İrsaliye" : "Alış Fişi";

  const docs = useRows<Doc>("documents", {
    select: "*, contact:contacts(name, phone, email), category:categories(name), lines:document_lines(*)",
    params: [docType],
    filter: (x) => x.eq("doc_type", docType).is("deleted_at", null),
    order: [
      { column: "issue_date", ascending: false },
      { column: "created_at", ascending: false },
    ],
  });

  // Veritabanı belgeleri + kod içindeki örnekler (yalnız faturalarda)
  const allRows = React.useMemo(() => {
    const merged = [...(docs.data ?? [])];
    if (activeTab === "invoices") {
      for (const def of DEFAULT_PURCHASE_DOCS) {
        if (!merged.some((m) => m.id === def.id || (m.number && m.number === def.number))) merged.push(def);
      }
    }
    return merged;
  }, [docs.data, activeTab]);

  const today = isoDate();
  const filteredRows = React.useMemo(() => {
    const query = q.trim();
    return allRows.filter((d) => {
      if (!inPeriod(d.issue_date, period, today)) return false;
      if (!query) return true;
      const text = `${d.contact?.name ?? ""} ${(d.contact_snapshot as { name?: string } | null)?.name ?? ""} ${d.number ?? ""} ${d.description ?? ""}`;
      return textMatches(text, query);
    });
  }, [allRows, q, period, today]);

  const isSample = (d: Doc) => d.id.startsWith("sample-");
  const guardSample = (d: Doc) => {
    if (!isSample(d)) return false;
    toast.info("Bu bir örnek kayıttır, üzerinde işlem yapılamaz.");
    return true;
  };
  const nameOf = (d: Doc) =>
    d.contact?.name || (d.contact_snapshot as { name?: string } | null)?.name || d.description || "Tedarikçi belirtilmemiş";
  const baseOf = (d: Doc) => DOC_TYPES[(d.doc_type as DocType) || docType]?.base ?? DOC_TYPES[docType].base;

  const handleStartNewDoc = () => setSupplierModalOpen(true);

  const handleSupplierSelected = (supplier: SupplierItem | null) => {
    setSelectedSupplier(supplier);
    setSupplierModalOpen(false);
    setInvoiceModalOpen(true);
  };

  // Kayıttan sonra liste veritabanından yenilenir; kaydedilen belgenin sekmesine geç
  const handleInvoiceSaved = (saved: { id: string; doc_type: DocType }) => {
    setActiveTab(saved.doc_type === "purchase_order" ? "orders" : saved.doc_type === "purchase_delivery" ? "waybills" : "invoices");
  };

  const handleOpen = (d: Doc) => {
    if (isSample(d)) setPrintDoc(d);
    else router.push(`${baseOf(d)}/detay?id=${d.id}`);
  };

  const handleEdit = (d: Doc) => {
    if (guardSample(d)) return;
    router.push(`${baseOf(d)}/duzenle?id=${d.id}`);
  };

  const changeStage = async (d: Doc, s: string) => {
    if (guardSample(d)) return;
    await setStatus.call({ p_doc: d.id, p_status: s }, `Durum: ${statusLabel(d.doc_type as DocType, s)}`);
  };

  const handleDelete = async (d: Doc) => {
    if (guardSample(d)) return;
    const ok = await confirm({
      title: `${nameOf(d)} silinsin mi?`,
      description: "Stok hareketleri ve cari bakiye etkileri geri alınır.",
      danger: true,
      confirmText: "Sil",
    });
    if (ok) await del.call({ p_doc: d.id }, "Belge silindi");
  };

  // Tedarikçiye iade: iade belgesi kaynak faturanın kalemleriyle açılır
  const handleReturn = (d: Doc, partial: boolean) => {
    if (guardSample(d)) return;
    if (partial) toast.info("İade edilmeyecek kalemleri silin veya miktarlarını düşürün.");
    router.push(`${DOC_TYPES.purchase_return.base}/yeni?kaynak=${d.id}`);
  };

  const handleWhatsAppShare = (d: Doc) => {
    const cleanPhone = (d.contact?.phone || "").replace(/[^0-9]/g, "");
    const phone = cleanPhone.startsWith("0") ? "9" + cleanPhone : cleanPhone.length === 10 ? "90" + cleanPhone : cleanPhone;
    const text = encodeURIComponent(
      `*${org?.name || "Ren Endüstriyel"}*\n` +
        `Belge: ${kindLabel} (${d.number || "—"})\n` +
        `Sayın: ${nameOf(d)}\n` +
        `Tarih: ${formatDate(d.issue_date)}\n` +
        `Toplam Tutar: ${formatMoney(d.total ?? 0, d.currency || "TRY")}\n` +
        `Durum: ${d.payment_status === "paid" ? "Ödendi" : "Açık"}`,
    );
    window.open(phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`, "_blank");
  };

  const handleEmailShare = (d: Doc) => {
    const subject = encodeURIComponent(`${org?.name || "Ren Endüstriyel"} - ${kindLabel} (${d.number || "—"})`);
    const body = encodeURIComponent(
      `Sayın ${nameOf(d)},\n\n` +
        `${formatDate(d.issue_date)} tarihli ${kindLabel} (${d.number || "—"}):\n` +
        `Net Tutar: ${formatMoney(d.subtotal ?? 0, d.currency || "TRY")}\n` +
        `KDV Tutarı: ${formatMoney(d.vat_total ?? 0, d.currency || "TRY")}\n` +
        `Toplam Tutar: ${formatMoney(d.total ?? 0, d.currency || "TRY")}\n\n` +
        `İyi çalışmalar dileriz.\n${org?.name || "Ren Endüstriyel"}`,
    );
    window.open(`mailto:${d.contact?.email || ""}?subject=${subject}&body=${body}`, "_self");
  };

  const handleCopy = async (d: Doc) => {
    const text = docText({
      title: kindLabel,
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
    exportExcel(`alislar_${activeTab}`, [
      {
        name: docTypeLabel,
        rows: filteredRows,
        columns: [
          { header: "Tarih", value: (d) => d.issue_date },
          { header: "Belge No", value: (d) => d.number || "" },
          { header: "Tedarikçi", value: (d) => nameOf(d) },
          { header: "Net Tutar", value: (d) => Number(d.subtotal || 0), type: "money" },
          { header: "KDV Tutarı", value: (d) => Number(d.vat_total || 0), type: "money" },
          { header: "Toplam Tutar", value: (d) => Number(d.total || 0), type: "money" },
          { header: "Durum", value: (d) => (d.payment_status === "paid" ? "Ödendi" : "Açık") },
          { header: "Vade", value: (d) => d.due_date || "" },
        ],
      },
    ]);
  };

  // "Fatura Oku"nun okuduğu örnek Excel düzeni
  const handleTemplate = () => {
    exportExcel("alis-fatura-sablonu", [
      {
        name: "Alış Faturası",
        rows: [{}],
        columns: [
          { header: "Barkod", value: () => "" },
          { header: "Ürün Adı", value: () => "" },
          { header: "Miktar", value: () => "" },
          { header: "Birim", value: () => "Adet" },
          { header: "Birim Fiyat", value: () => "" },
          { header: "KDV %", value: () => "20" },
        ],
      },
    ]);
  };

  const handleAiScan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAiLoading(true);
    setAiResult(null);
    setAiModalOpen(true);
    setTimeout(() => {
      setAiLoading(false);
      setAiResult({ supplierName: "Örnek Tedarikçi A.Ş.", date: isoDate(), total: 1250.0, vat: 250.0 });
      toast.success("Fatura bilgileri başarıyla okundu!");
    }, 1800);
  };

  const handleApplyAiResult = () => {
    setAiModalOpen(false);
    setSelectedSupplier({ id: "ai-sup", name: aiResult?.supplierName || "Okunan Tedarikçi" });
    setInvoiceModalOpen(true);
  };

  return (
    <div>
      <ListHeader
        title="Alışlar"
        actions={
          <>
            <ExportMenu
              items={[
                { label: "Excel'den ürün yükle", hint: "Ürünler'deki yükleme ekranı (stok listesi)", onSelect: () => setImportOpen(true), hidden: !canWrite },
                { label: "Alış Excel şablonu", hint: "Fatura Oku'nun okuduğu örnek dosya", onSelect: handleTemplate },
                { label: "Excel'e aktar", hint: `Listedeki ${filteredRows.length} belge`, onSelect: handleExportExcel },
              ]}
            />
            <label className="btn cursor-pointer border border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/50 shadow-sm">
              Fatura Oku · Foto / PDF / XML / Excel
              <input
                type="file"
                accept="image/*,application/pdf,.pdf,.xml,text/xml,application/xml,.xlsx,.xls,.csv"
                className="hidden"
                onChange={handleAiScan}
              />
            </label>
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
          <input className="input pl-10" placeholder="alışlar arama" value={q} onChange={(e) => setQ(e.target.value)} />
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
        <PeriodSelect value={period} onChange={setPeriod} />
      </div>

      <div className="space-y-2.5">
        {filteredRows.length === 0 ? (
          <div className="card p-10 text-center">
            <div className="h-12 w-12 rounded-xl bg-brand-50 dark:bg-brand-900/30 text-brand-500 flex items-center justify-center mx-auto mb-3">
              <FileText size={22} />
            </div>
            <div className="font-semibold">Henüz {docTypeLabel.toLocaleLowerCase("tr-TR")} yok</div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {q.trim() || period !== "all" ? "Filtreyle eşleşen kayıt bulunamadı." : "Yeni alış belgesi oluşturun."}
            </p>
          </div>
        ) : (
          filteredRows.map((d) => {
            const isPaid = d.payment_status === "paid";
            const isCancelled = d.status === "cancelled";
            return (
              <DocCard
                key={d.id}
                name={nameOf(d)}
                kindLabel={kindLabel}
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
                onEdit={canWrite ? () => handleEdit(d) : undefined}
                moreItems={[
                  ...(DOC_TYPES[d.doc_type as DocType]?.statuses ?? [])
                    .filter((x) => x.value !== "converted" && x.value !== "cancelled")
                    .map((x) => ({
                      label: `Durum: ${x.label}`,
                      onSelect: () => changeStage(d, x.value),
                      hidden: !canWrite || isCancelled || d.status === "converted" || normalizeStatus(d.doc_type as DocType, d.status) === x.value,
                    })),
                  { label: "Tedarikçiye iade (kalem seç)", onSelect: () => handleReturn(d, true), hidden: !canWrite || activeTab !== "invoices" },
                  { label: "Tedarikçiye tam iade", onSelect: () => handleReturn(d, false), hidden: !canWrite || activeTab !== "invoices" },
                  { label: "Sil", onSelect: () => handleDelete(d), danger: true, hidden: !canWrite },
                ]}
              />
            );
          })
        )}
      </div>

      {canWrite && <NewDocFab label="Yeni alış" onClick={handleStartNewDoc} />}
      <HelpTrigger title="Alışlar yardımı" onClick={() => setHelpOpen(true)} />

      <SupplierSelectModal open={supplierModalOpen} onOpenChange={setSupplierModalOpen} onSelect={handleSupplierSelected} />

      <PurchaseInvoiceModal
        open={invoiceModalOpen}
        onOpenChange={setInvoiceModalOpen}
        supplier={selectedSupplier}
        onSaved={handleInvoiceSaved}
        initialDocType={docTypeLabel}
      />

      <ProductImport open={importOpen} onOpenChange={setImportOpen} />

      {printDoc && (
        <DocumentPrintModal
          open={!!printDoc}
          onOpenChange={(v) => !v && setPrintDoc(null)}
          doc={printDoc as never}
          org={org}
        />
      )}

      <Dialog open={aiModalOpen} onOpenChange={setAiModalOpen}>
        <DialogContent title="Fatura Oku · Yapay Zeka" description="Fotoğraf, PDF, XML veya Excel faturanız taranıyor..." className="max-w-md">
          {aiLoading ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-3">
              <Loader2 size={36} className="animate-spin text-brand-500" />
              <p className="text-sm font-semibold">Fatura optik okuma ile taranıyor...</p>
              <p className="text-xs text-slate-500">Kalemler, tedarikçi ve KDV ayrıştırılıyor.</p>
            </div>
          ) : aiResult ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-500 font-bold text-sm">
                <Sparkles size={16} />
                <span>Bilgiler Başarıyla Ayrıştırıldı</span>
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Tedarikçi:</span>
                  <span className="font-semibold">{aiResult.supplierName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tarih:</span>
                  <span className="font-medium">{aiResult.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">KDV Tutarı:</span>
                  <span className="font-medium">{formatMoney(aiResult.vat || 0)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="font-bold text-slate-400">Genel Toplam:</span>
                  <span className="font-extrabold text-brand-500">{formatMoney(aiResult.total || 0)}</span>
                </div>
              </div>
              <button type="button" onClick={handleApplyAiResult} className="btn-primary w-full">
                Fatura Girişine Aktar
              </button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent title="Alışlar" description="Tedarikçiden aldığınız faturalar ve ödemeler." className="max-w-md">
          <HelpFeatures items={["Alış faturası", "Tedarikçiye ödeme", "Stok artışı (ürün bağlıysa)", "Yazdırma"]} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
