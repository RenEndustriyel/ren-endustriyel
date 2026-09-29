"use client";

import * as React from "react";
import { newId } from "./data";

export type EInvoiceType = "e-fatura" | "e-arsiv";
export type EInvoiceDirection = "incoming" | "outgoing";
export type EInvoiceProfile = "TICARIFATURA" | "TEMELFATURA" | "EARSIVFATURA" | "IHRACAT" | "KAMU";
export type EInvoiceStatus = "draft" | "queued" | "sent" | "approved" | "rejected" | "cancelled";

export interface EInvoiceItem {
  id: string;
  product_id?: string;
  name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_rate: number;
  vat_rate: number;
  total: number;
}

export interface EInvoice {
  id: string;
  invoice_no: string;
  ettn: string;
  direction: EInvoiceDirection;
  type: EInvoiceType;
  profile: EInvoiceProfile;
  issue_date: string; // YYYY-MM-DD
  issue_time: string; // HH:mm:ss
  party_name: string;
  party_vkn_tckn: string;
  party_tax_office?: string;
  party_address?: string;
  party_city?: string;
  currency: string;
  subtotal: number;
  discount_total: number;
  vat_total: number;
  grand_total: number;
  status: EInvoiceStatus;
  status_description: string;
  lines: EInvoiceItem[];
  notes?: string;
  source_doc_id?: string;
  is_imported_to_purchase?: boolean;
  created_at: string;
}

const STORAGE_KEY = "ren_einvoices_data_v1";

const INITIAL_EINVOICES: EInvoice[] = [
  // Gelen E-Faturalar (Tedarikçilerden gelen)
  {
    id: "einv-in-01",
    invoice_no: "GIB2026000004120",
    ettn: "8a4b2c1d-9e3f-4a5b-b6c7-d8e9f0a1b2c3",
    direction: "incoming",
    type: "e-fatura",
    profile: "TICARIFATURA",
    issue_date: "2026-09-27",
    issue_time: "10:30:00",
    party_name: "Siemens Sanayi ve Ticaret A.Ş.",
    party_vkn_tckn: "7700034120",
    party_tax_office: "Kozyatağı",
    party_address: "Yakacık Yolu No:111 Kartal",
    party_city: "İstanbul",
    currency: "TRY",
    subtotal: 125000,
    discount_total: 0,
    vat_total: 25000,
    grand_total: 150000,
    status: "approved",
    status_description: "GİB Başarıyla Alındı / Ticari Kabul Edildi",
    lines: [
      { id: "l1", name: "S7-1200 CPU 1214C DC/DC/DC PLC", quantity: 5, unit: "Adet", unit_price: 18000, discount_rate: 0, vat_rate: 20, total: 90000 },
      { id: "l2", name: "SM 1223 Dijital Giriş/Çıkış Modülü", quantity: 7, unit: "Adet", unit_price: 5000, discount_rate: 0, vat_rate: 20, total: 35000 },
    ],
    notes: "İrsaliye No: IRS2026000003410. Vadesi 30 gündür.",
    is_imported_to_purchase: true,
    created_at: "2026-09-27T10:35:00Z",
  },
  {
    id: "einv-in-02",
    invoice_no: "GIB2026000008914",
    ettn: "c5e6f7a8-1b2c-3d4e-5f6a-7b8c9d0e1f2a",
    direction: "incoming",
    type: "e-fatura",
    profile: "TICARIFATURA",
    issue_date: "2026-09-25",
    issue_time: "14:15:00",
    party_name: "Schneider Electric San. Tic. A.Ş.",
    party_vkn_tckn: "7590012845",
    party_tax_office: "Boğaziçi",
    party_address: "Büyükdere Cad. No:245 Sarıyer",
    party_city: "İstanbul",
    currency: "TRY",
    subtotal: 48500,
    discount_total: 0,
    vat_total: 9700,
    grand_total: 58200,
    status: "approved",
    status_description: "GİB Başarıyla Alındı",
    lines: [
      { id: "l3", name: "TeSys D Kontaktör 3P 25A 220V", quantity: 20, unit: "Adet", unit_price: 1450, discount_rate: 0, vat_rate: 20, total: 29000 },
      { id: "l4", name: "Kompakt Şalter 3P 100A", quantity: 6, unit: "Adet", unit_price: 3250, discount_rate: 0, vat_rate: 20, total: 19500 },
    ],
    notes: "Sevkiyat Gebze depodan yapılmıştır.",
    is_imported_to_purchase: false,
    created_at: "2026-09-25T14:20:00Z",
  },
  {
    id: "einv-in-03",
    invoice_no: "GIB2026000001205",
    ettn: "1d2e3f4a-5b6c-7d8e-9f0a-1b2c3d4e5f6a",
    direction: "incoming",
    type: "e-fatura",
    profile: "TEMELFATURA",
    issue_date: "2026-09-23",
    issue_time: "09:45:00",
    party_name: "ABB Elektrik Sanayi A.Ş.",
    party_vkn_tckn: "0010045120",
    party_tax_office: "Ümraniye",
    party_address: "Dudullu OSB 2. Cadde No:5 Ümraniye",
    party_city: "İstanbul",
    currency: "TRY",
    subtotal: 82000,
    discount_total: 2000,
    vat_total: 16000,
    grand_total: 96000,
    status: "approved",
    status_description: "Temel Fatura Onaylandı",
    lines: [
      { id: "l5", name: "ACS580 15kW VFD Hız Kontrol Sürücüsü", quantity: 2, unit: "Adet", unit_price: 41000, discount_rate: 2.44, vat_rate: 20, total: 80000 },
    ],
    notes: "Proje kodu: P-2026-09",
    is_imported_to_purchase: false,
    created_at: "2026-09-23T09:50:00Z",
  },
  {
    id: "einv-in-04",
    invoice_no: "GIB2026000099412",
    ettn: "3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f",
    direction: "incoming",
    type: "e-fatura",
    profile: "TEMELFATURA",
    issue_date: "2026-09-20",
    issue_time: "17:10:00",
    party_name: "Yurtiçi Kargo Servisi A.Ş.",
    party_vkn_tckn: "9910058472",
    party_tax_office: "Zincirlikuyu",
    party_address: "Maslak Mah. Sümer Sok. No:4 Şişli",
    party_city: "İstanbul",
    currency: "TRY",
    subtotal: 3200,
    discount_total: 0,
    vat_total: 640,
    grand_total: 3840,
    status: "approved",
    status_description: "GİB Başarıyla Alındı",
    lines: [
      { id: "l6", name: "Şehirlerarası Kargo Gönderim Bedelleri (Eylül)", quantity: 1, unit: "Hizmet", unit_price: 3200, discount_rate: 0, vat_rate: 20, total: 3200 },
    ],
    notes: "Aylık toplu taşıma faturasıdır.",
    is_imported_to_purchase: true,
    created_at: "2026-09-20T17:15:00Z",
  },

  // Giden E-Faturalar ve E-Arşivler (Müşterilere kesilenler)
  {
    id: "einv-out-01",
    invoice_no: "GIB2026000000045",
    ettn: "f1a2b3c4-d5e6-7a8b-9c0d-1e2f3a4b5c6d",
    direction: "outgoing",
    type: "e-fatura",
    profile: "TICARIFATURA",
    issue_date: "2026-09-28",
    issue_time: "11:20:00",
    party_name: "Aselsan Elektronik Sanayi A.Ş.",
    party_vkn_tckn: "0910012345",
    party_tax_office: "Yenimahalle",
    party_address: "Mehmet Akif Ersoy Mah. 296. Cad. No:16 Yenimahalle",
    party_city: "Ankara",
    currency: "TRY",
    subtotal: 240000,
    discount_total: 0,
    vat_total: 48000,
    grand_total: 288000,
    status: "approved",
    status_description: "1300: Başarıyla Tamamlandı (GİB Onaylı)",
    lines: [
      { id: "ol1", name: "Otomasyon Kumanda Panosu Özel İmalat", quantity: 2, unit: "Takım", unit_price: 90000, discount_rate: 0, vat_rate: 20, total: 180000 },
      { id: "ol2", name: "Saha Kablolama ve Devreye Alma Hizmeti", quantity: 1, unit: "Hizmet", unit_price: 60000, discount_rate: 0, vat_rate: 20, total: 60000 },
    ],
    notes: "Sözleşme No: ASL-2026-PAN-04. Banka IBAN: TR33 0006 2000 0001 2345 6789 01",
    created_at: "2026-09-28T11:22:00Z",
  },
  {
    id: "einv-out-02",
    invoice_no: "GIB2026000000046",
    ettn: "d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a",
    direction: "outgoing",
    type: "e-fatura",
    profile: "TICARIFATURA",
    issue_date: "2026-09-26",
    issue_time: "15:40:00",
    party_name: "Baykar Makina San. ve Tic. A.Ş.",
    party_vkn_tckn: "1520038914",
    party_tax_office: "Esenyurt",
    party_address: "Hadımköy OSB Mah. İhsan Dede Cad. No:8 Esenyurt",
    party_city: "İstanbul",
    currency: "TRY",
    subtotal: 95000,
    discount_total: 5000,
    vat_total: 18000,
    grand_total: 108000,
    status: "approved",
    status_description: "1300: Başarıyla Tamamlandı",
    lines: [
      { id: "ol3", name: "Endüstriyel Optik Sensör Seti", quantity: 10, unit: "Set", unit_price: 7500, discount_rate: 0, vat_rate: 20, total: 75000 },
      { id: "ol4", name: "Emniyet Rölesi 24V DC", quantity: 5, unit: "Adet", unit_price: 4000, discount_rate: 25, vat_rate: 20, total: 15000 },
    ],
    notes: "Sipariş No: BYK-9921",
    created_at: "2026-09-26T15:42:00Z",
  },
  {
    id: "einv-out-03",
    invoice_no: "EAR2026000000189",
    ettn: "b2c3d4e5-6f7a-8b9c-0d1e-2f3a4b5c6d7e",
    direction: "outgoing",
    type: "e-arsiv",
    profile: "EARSIVFATURA",
    issue_date: "2026-09-24",
    issue_time: "16:10:00",
    party_name: "Özkan Torna ve Makina Ltd. Şti.",
    party_vkn_tckn: "6980045123",
    party_tax_office: "İkitelli",
    party_address: "İOSB Metal-İş Sanayi Sitesi 14. Blok No:22 Başakşehir",
    party_city: "İstanbul",
    currency: "TRY",
    subtotal: 35000,
    discount_total: 0,
    vat_total: 7000,
    grand_total: 42000,
    status: "approved",
    status_description: "GİB 5000/30000 E-Arşiv Portalı İmzalandı",
    lines: [
      { id: "ol5", name: "Pano Revizyonu ve Kompanzasyon Bakımı", quantity: 1, unit: "Hizmet", unit_price: 35000, discount_rate: 0, vat_rate: 20, total: 35000 },
    ],
    notes: "E-Arşiv Fatura İnternet Çıktısıdır. 433 Sıra No'lu VUK Genel Tebliği uyarınca kaşe ve imza aranmaz.",
    created_at: "2026-09-24T16:15:00Z",
  },
  {
    id: "einv-out-04",
    invoice_no: "EAR2026000000190",
    ettn: "e6f7a8b9-0c1d-2e3f-4a5b-6c7d8e9f0a1b",
    direction: "outgoing",
    type: "e-arsiv",
    profile: "EARSIVFATURA",
    issue_date: "2026-09-22",
    issue_time: "11:05:00",
    party_name: "Ahmet Yılmaz (Şahıs)",
    party_vkn_tckn: "12345678901",
    party_tax_office: "Kadıköy",
    party_address: "Bağdat Cad. No:142 D:6 Kadıköy",
    party_city: "İstanbul",
    currency: "TRY",
    subtotal: 12000,
    discount_total: 0,
    vat_total: 2400,
    grand_total: 14400,
    status: "approved",
    status_description: "E-Posta ile Alıcıya İletildi",
    lines: [
      { id: "ol6", name: "Akıllı Röle ve Zaman Saati Kiti", quantity: 2, unit: "Adet", unit_price: 6000, discount_rate: 0, vat_rate: 20, total: 12000 },
    ],
    notes: "Nihai Tüketici Satışıdır.",
    created_at: "2026-09-22T11:08:00Z",
  },
];

export function getEInvoices(): EInvoice[] {
  if (typeof window === "undefined") return INITIAL_EINVOICES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_EINVOICES));
      return INITIAL_EINVOICES;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_EINVOICES;
  }
}

export function saveEInvoice(data: Partial<EInvoice>): EInvoice {
  const current = getEInvoices();
  const year = new Date().getFullYear();
  const isEArsiv = data.type === "e-arsiv";
  const prefix = isEArsiv ? `EAR${year}` : `GIB${year}`;
  
  // Sonraki fatura numarası üret
  const matchNum = current
    .filter((inv) => inv.direction === "outgoing" && inv.invoice_no?.startsWith(prefix))
    .map((inv) => parseInt(inv.invoice_no.replace(prefix, "") || "0", 10))
    .filter((n) => !isNaN(n));
  const nextSeq = (matchNum.length ? Math.max(...matchNum) : 0) + 1;
  const seqStr = String(nextSeq).padStart(9, "0");
  const invoiceNo = data.invoice_no || `${prefix}${seqStr}`;

  const ettn = data.ettn || newId();
  const id = data.id || `einv-${Date.now()}`;

  const full: EInvoice = {
    id,
    invoice_no: invoiceNo,
    ettn,
    direction: data.direction || "outgoing",
    type: data.type || "e-fatura",
    profile: data.profile || (isEArsiv ? "EARSIVFATURA" : "TICARIFATURA"),
    issue_date: data.issue_date || new Date().toISOString().slice(0, 10),
    issue_time: data.issue_time || new Date().toTimeString().slice(0, 8),
    party_name: data.party_name || "Müşteri",
    party_vkn_tckn: data.party_vkn_tckn || "1111111111",
    party_tax_office: data.party_tax_office || "",
    party_address: data.party_address || "",
    party_city: data.party_city || "İstanbul",
    currency: data.currency || "TRY",
    subtotal: Number(data.subtotal || 0),
    discount_total: Number(data.discount_total || 0),
    vat_total: Number(data.vat_total || 0),
    grand_total: Number(data.grand_total || 0),
    status: data.status || "approved",
    status_description: data.status_description || (isEArsiv ? "E-Arşiv İmzalandı & GİB Kaydedildi" : "1300: Başarıyla Tamamlandı (GİB Onaylı)"),
    lines: data.lines || [],
    notes: data.notes || "",
    source_doc_id: data.source_doc_id,
    created_at: new Date().toISOString(),
  };

  const updated = [full, ...current.filter((i) => i.id !== id)];
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("ren_einvoice_updated"));
  }
  return full;
}

export function updateEInvoiceStatus(id: string, status: EInvoiceStatus, desc?: string): void {
  const current = getEInvoices();
  const updated = current.map((inv) =>
    inv.id === id
      ? {
          ...inv,
          status,
          status_description: desc || (status === "cancelled" ? "İptal Edildi" : inv.status_description),
        }
      : inv
  );
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("ren_einvoice_updated"));
  }
}

export function markAsImported(id: string): void {
  const current = getEInvoices();
  const updated = current.map((inv) => (inv.id === id ? { ...inv, is_imported_to_purchase: true } : inv));
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("ren_einvoice_updated"));
  }
}

export function deleteEInvoice(id: string): void {
  const current = getEInvoices();
  const updated = current.filter((inv) => inv.id !== id);
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("ren_einvoice_updated"));
  }
}

export function useEInvoices(direction?: EInvoiceDirection) {
  const [data, setData] = React.useState<EInvoice[]>(() => {
    const list = getEInvoices();
    return direction ? list.filter((i) => i.direction === direction) : list;
  });

  const reload = React.useCallback(() => {
    const list = getEInvoices();
    setData(direction ? list.filter((i) => i.direction === direction) : list);
  }, [direction]);

  React.useEffect(() => {
    reload();
    const handleUpdate = () => reload();
    window.addEventListener("ren_einvoice_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("ren_einvoice_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [reload]);

  return { data, reload };
}

/**
 * GİB UBL-TR 2.1 Standard XML Üretici
 */
export function generateGibXml(inv: EInvoice): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>TR1.2</cbc:CustomizationID>
  <cbc:ProfileID>${inv.profile}</cbc:ProfileID>
  <cbc:ID>${inv.invoice_no}</cbc:ID>
  <cbc:CopyIndicator>false</cbc:CopyIndicator>
  <cbc:UUID>${inv.ettn}</cbc:UUID>
  <cbc:IssueDate>${inv.issue_date}</cbc:IssueDate>
  <cbc:IssueTime>${inv.issue_time || "12:00:00"}</cbc:IssueTime>
  <cbc:InvoiceTypeCode>SATIS</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${inv.currency}</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="VKN">7340058491</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name>REN ENDÜSTRİYEL OTOMASYON ELEKTRİK TİC. LTD. ŞTİ.</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:CitySubdivisionName>Pendik</cbc:CitySubdivisionName>
        <cbc:CityName>İstanbul</cbc:CityName>
        <cac:Country><cbc:Name>Türkiye</cbc:Name></cac:Country>
      </cac:PostalAddress>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="${inv.party_vkn_tckn?.length === 11 ? "TCKN" : "VKN"}">${inv.party_vkn_tckn}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name>${inv.party_name}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:CityName>${inv.party_city || "İstanbul"}</cbc:CityName>
        <cac:Country><cbc:Name>Türkiye</cbc:Name></cac:Country>
      </cac:PostalAddress>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${inv.currency}">${inv.vat_total.toFixed(2)}</cbc:TaxAmount>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${inv.currency}">${inv.subtotal.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${inv.currency}">${inv.subtotal.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${inv.currency}">${inv.grand_total.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${inv.currency}">${inv.grand_total.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
</Invoice>`;
}

/**
 * Tarayıcıda XML dosyası indir
 */
export function downloadXmlFile(inv: EInvoice): void {
  const xml = generateGibXml(inv);
  const blob = new Blob([xml], { type: "application/xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${inv.invoice_no}_${inv.ettn.slice(0, 8)}.xml`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
