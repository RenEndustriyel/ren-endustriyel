import * as React from "react";
import { Document, Page, Text, View, Image, StyleSheet, Font } from "@react-pdf/renderer";
import { amountInWords } from "./words";

let fontsRegistered = false;
export function registerFonts(origin: string) {
  if (fontsRegistered) return;
  Font.register({
    family: "Roboto",
    fonts: [
      { src: `${origin}/fonts/Roboto-Regular.ttf` },
      { src: `${origin}/fonts/Roboto-Bold.ttf`, fontWeight: 700 },
    ],
  });
  Font.registerHyphenationCallback((w) => [w]);
  fontsRegistered = true;
}

const C = { ink: "#1f2328", muted: "#6b7280", line: "#e1e4e8", brand: "#1ba2d0", soft: "#f4f6f8" };

const s = StyleSheet.create({
  page: { fontFamily: "Roboto", fontSize: 9, color: C.ink, paddingTop: 32, paddingBottom: 48, paddingHorizontal: 36 },
  row: { flexDirection: "row" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 18 },
  logo: { width: 64, height: 64, objectFit: "contain", marginRight: 10 },
  orgName: { fontSize: 13, fontWeight: 700 },
  small: { fontSize: 8, color: C.muted, lineHeight: 1.4 },
  title: { fontSize: 18, fontWeight: 700, color: C.brand, textAlign: "right" },
  metaRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 2 },
  metaLabel: { width: 70, color: C.muted, textAlign: "right", marginRight: 6 },
  metaValue: { width: 90, textAlign: "right", fontWeight: 700 },
  box: { borderWidth: 1, borderColor: C.line, borderRadius: 4, padding: 8, marginBottom: 14 },
  boxLabel: { fontSize: 7, color: C.muted, marginBottom: 3, textTransform: "uppercase" },
  th: { backgroundColor: C.soft, borderBottomWidth: 1, borderColor: C.line, paddingVertical: 5, paddingHorizontal: 4, fontSize: 7.5, fontWeight: 700, color: C.muted },
  td: { borderBottomWidth: 1, borderColor: C.line, paddingVertical: 5, paddingHorizontal: 4 },
  right: { textAlign: "right" },
  totals: { marginTop: 10, alignSelf: "flex-end", width: 230 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  grand: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, marginTop: 3, borderTopWidth: 1.5, borderColor: C.ink, fontSize: 11, fontWeight: 700 },
  words: { marginTop: 8, fontSize: 8, color: C.muted, fontStyle: "normal" },
  notes: { marginTop: 16, fontSize: 8, lineHeight: 1.5 },
  footer: { position: "absolute", bottom: 20, left: 36, right: 36, flexDirection: "row", justifyContent: "space-between", fontSize: 7, color: C.muted, borderTopWidth: 1, borderColor: C.line, paddingTop: 6 },
  balanceBox: { marginTop: 8, paddingTop: 5, borderTopWidth: 1, borderColor: C.line },
  balanceRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  balanceLabel: { color: C.muted, fontSize: 7.5 },
  balanceVal: { fontSize: 7.5 },
  currentBalanceRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, paddingHorizontal: 5, marginTop: 3, backgroundColor: C.soft, borderRadius: 3, borderWidth: 0.5, borderColor: C.line },
  currentBalanceLabel: { fontSize: 8, fontWeight: 700, color: C.ink },
  currentBalanceVal: { fontSize: 8, fontWeight: 700, color: C.ink },
});

const nf = (n: number, d = 2) => Number(n ?? 0).toLocaleString("tr-TR", { minimumFractionDigits: d, maximumFractionDigits: d });
const qf = (n: number) => Number(n ?? 0).toLocaleString("tr-TR", { maximumFractionDigits: 3 });
const df = (d?: string | null) => (d ? new Date(`${d.slice(0, 10)}T00:00:00`).toLocaleDateString("tr-TR") : "");
const sym = (c: string) => (c === "USD" ? "$" : c === "EUR" ? "€" : "₺");
const formatBal = (n?: number | null) => {
  const v = Number(n ?? 0);
  if (Math.abs(v) <= 0.009) return "0,00 ₺ (Kapalı)";
  const status = v > 0 ? "Borçlu" : "Alacaklı";
  return `${nf(Math.abs(v))} ₺ (${status})`;
};

export type PdfOrg = {
  name: string;
  legal_name?: string | null;
  tax_number?: string | null;
  tax_office?: string | null;
  address?: string | null;
  district?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  iban?: string | null;
};

function OrgHeader({ org, logo }: { org: PdfOrg; logo?: string | null }) {
  return (
    <View style={s.row}>
      {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image, HTML değil */}
      {logo ? <Image src={logo} style={s.logo} /> : null}
      <View style={{ maxWidth: 250 }}>
        <Text style={s.orgName}>{org.legal_name || org.name}</Text>
        <Text style={s.small}>{[org.address, [org.district, org.city].filter(Boolean).join("/")].filter(Boolean).join(" ")}</Text>
        {org.tax_number ? <Text style={s.small}>VKN/TCKN: {org.tax_number}{org.tax_office ? ` · ${org.tax_office} V.D.` : ""}</Text> : null}
        <Text style={s.small}>{[org.phone, org.email, org.website].filter(Boolean).join(" · ")}</Text>
      </View>
    </View>
  );
}

function Footer({ org }: { org: PdfOrg }) {
  return (
    <View style={s.footer} fixed>
      <Text>{org.iban ? `IBAN: ${org.iban}` : org.legal_name || org.name}</Text>
      <Text render={({ pageNumber, totalPages }) => `Sayfa ${pageNumber} / ${totalPages}`} />
    </View>
  );
}

export type PdfLine = {
  description: string;
  quantity: number;
  unit?: string | null;
  unit_price: number;
  discount_rate: number;
  vat_rate: number;
  net_amount: number;
  vat_amount: number;
  total_amount: number;
};

export type PdfDocument = {
  id?: string;
  doc_type?: string;
  title: string;
  number?: string | null;
  issue_date: string;
  due_date?: string | null;
  valid_until?: string | null;
  currency: string;
  exchange_rate?: number;
  party: { label: string; name?: string | null; tax_number?: string | null; tax_office?: string | null; address?: string | null; phone?: string | null; email?: string | null };
  lines: PdfLine[];
  subtotal: number;
  discount_total: number;
  net_total: number;
  vat_total: number;
  total: number;
  paid_amount?: number;
  notes?: string | null;
  terms?: string | null;
  showPrices?: boolean;
  contact_balance_info?: {
    previous_balance?: number | null;
    this_amount?: number | null;
    current_balance?: number | null;
  } | null;
};

const gib = StyleSheet.create({
  page: { fontFamily: "Roboto", fontSize: 8, color: "#18181b", paddingTop: 24, paddingBottom: 36, paddingHorizontal: 30 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 12, borderBottomWidth: 1, borderColor: "#e4e4e7" },
  senderCol: { width: "42%" },
  logoCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#18181b", justifyContent: "center", alignItems: "center", marginBottom: 5 },
  logoText: { color: "#ffffff", fontWeight: 700, fontSize: 11 },
  orgTitle: { fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", marginBottom: 2 },
  subText: { fontSize: 7.5, color: "#3f3f46", lineHeight: 1.35 },
  gibCenter: { width: "32%", alignItems: "center", justifyContent: "center", paddingTop: 2 },
  gibEmblem: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#dc2626", justifyContent: "center", alignItems: "center" },
  gibText: { color: "#ffffff", fontWeight: 700, fontSize: 10 },
  gibLabel: { fontSize: 9.5, fontWeight: 700, marginTop: 4, color: "#18181b" },
  qrBox: { width: "26%", alignItems: "flex-end" },
  qrContainer: { width: 56, height: 56, borderWidth: 1, borderColor: "#d4d4d8", backgroundColor: "#fafafa", justifyContent: "center", alignItems: "center" },
  metaRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderColor: "#e4e4e7" },
  sayinCol: { width: "58%" },
  sayinLabel: { fontSize: 7, color: "#71717a", marginBottom: 2 },
  sayinName: { fontSize: 9, fontWeight: 700, textTransform: "uppercase" },
  docMetaCol: { width: "42%", alignItems: "flex-end" },
  docMetaLabel: { fontSize: 7, color: "#71717a" },
  docMetaVal: { fontSize: 8.5, fontWeight: 700, marginBottom: 3 },
  th: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#d4d4d8", paddingVertical: 4, paddingHorizontal: 3, fontSize: 7.5, fontWeight: 700, color: "#52525b" },
  td: { paddingVertical: 4, paddingHorizontal: 3, fontSize: 8, color: "#18181b", borderBottomWidth: 0.5, borderColor: "#f4f4f5" },
  footerRow: { flexDirection: "row", justifyContent: "space-between", paddingTop: 8, borderTopWidth: 1, borderColor: "#d4d4d8", marginTop: 8 },
  bottomNotes: { marginTop: 14, paddingTop: 8, borderTopWidth: 1, borderColor: "#e4e4e7" },
});

const sn = StyleSheet.create({
  page: { fontFamily: "Roboto", fontSize: 8.5, color: "#18181b", paddingTop: 28, paddingBottom: 36, paddingHorizontal: 32 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 8 },
  companyCol: { width: "42%" },
  companyTitle: { fontSize: 10, fontWeight: 700, textTransform: "uppercase" },
  companySub: { fontSize: 8, color: "#3f3f46", lineHeight: 1.35 },
  titleCenter: { width: "34%", alignItems: "center", justifyContent: "center", paddingTop: 4 },
  titleText: { fontSize: 13, fontWeight: 700, letterSpacing: 1 },
  dateCol: { width: "24%", alignItems: "flex-end" },
  metaLine: { fontSize: 8, color: "#18181b", marginBottom: 2 },
  customerBox: { paddingVertical: 8, borderTopWidth: 1, borderColor: "#e4e4e7", marginBottom: 6 },
  customerName: { fontSize: 9.5, fontWeight: 700 },
  customerText: { fontSize: 8, color: "#3f3f46", lineHeight: 1.35 },
  attention: { fontSize: 8, fontWeight: 700, marginTop: 4 },
  th: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#d4d4d8", paddingVertical: 4, paddingHorizontal: 3, fontSize: 7.5, fontWeight: 700, color: "#3f3f46" },
  td: { paddingVertical: 4, paddingHorizontal: 3, fontSize: 8, color: "#18181b", borderBottomWidth: 0.5, borderColor: "#f4f4f5" },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingTop: 8, borderTopWidth: 1, borderColor: "#d4d4d8", marginTop: 8 },
  balanceLabel: { fontSize: 8, color: "#27272a" },
  balanceVal: { fontSize: 9, fontWeight: 700 },
  thankYou: { fontSize: 8, color: "#52525b", marginTop: 24, paddingTop: 8, borderTopWidth: 0.5, borderColor: "#e4e4e7" },
});

export function GibInvoicePdf({ doc, org, logo }: { doc: PdfDocument; org: PdfOrg; logo?: string | null }) {
  const vatGroups = Object.entries(
    doc.lines.reduce<Record<string, { base: number; vat: number }>>((acc, l) => {
      const k = String(l.vat_rate || 0);
      acc[k] = acc[k] ?? { base: 0, vat: 0 };
      acc[k].base += Number(l.net_amount || 0);
      acc[k].vat += Number(l.vat_amount || 0);
      return acc;
    }, {}),
  );

  const orgName = org.legal_name || org.name || "MEHMET ŞENEVREN";
  const orgAddress = org.address || "Han Mh. Yeni Cadde No:23/D / Susurluk";
  const orgCity = [org.district, org.city].filter(Boolean).join(" / ") || "Susurluk, BALIKESİR";
  const orgTax = org.tax_number || "21856457480";
  const orgTaxOffice = org.tax_office ? `(${org.tax_office.toLowerCase()})` : "(susurluk)";
  const iban = org.iban || "TR290001000313509372275007";

  return (
    <Document title={`Fatura ${doc.number ?? ""}`} author={org.name}>
      <Page size="A4" style={gib.page}>
        <View style={gib.header}>
          <View style={gib.senderCol}>
            {logo ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={logo} style={{ width: 34, height: 34, marginBottom: 5 }} />
            ) : (
              <View style={gib.logoCircle}>
                <Text style={gib.logoText}>REN</Text>
              </View>
            )}
            <Text style={gib.orgTitle}>{orgName}</Text>
            <Text style={gib.subText}>{orgAddress}</Text>
            <Text style={gib.subText}>{orgCity} – Türkiye</Text>
            <Text style={[gib.subText, { marginTop: 2, color: "#71717a" }]}>Vergi No</Text>
            <Text style={[gib.subText, { fontWeight: 700 }]}>{orgTax} {orgTaxOffice}</Text>
          </View>

          <View style={gib.gibCenter}>
            <View style={gib.gibEmblem}>
              <Text style={gib.gibText}>GİB</Text>
            </View>
            <Text style={gib.gibLabel}>e-Fatura</Text>
          </View>

          <View style={gib.qrBox}>
            <View style={gib.qrContainer}>
              <Text style={{ fontSize: 6, color: "#71717a" }}>KAREKOD</Text>
              <Text style={{ fontSize: 5, color: "#a1a1aa", marginTop: 2 }}>DOĞRULAMA</Text>
            </View>
          </View>
        </View>

        <View style={gib.metaRow}>
          <View style={gib.sayinCol}>
            <Text style={gib.sayinLabel}>Sayın</Text>
            <Text style={gib.sayinName}>{doc.party.name ?? "Perakende Müşteri"}</Text>
            <Text style={gib.subText}>{doc.party.address ? `${doc.party.address} – Türkiye` : ""}</Text>
            {doc.party.tax_number ? (
              <Text style={[gib.subText, { marginTop: 2 }]}>
                Vergi No: {doc.party.tax_number} {doc.party.tax_office ? `(${doc.party.tax_office})` : ""}
              </Text>
            ) : null}
          </View>

          <View style={gib.docMetaCol}>
            <Text style={gib.docMetaLabel}>Fatura Numarası</Text>
            <Text style={gib.docMetaVal}>{doc.number ?? "SF02026000000004"}</Text>
            <Text style={gib.docMetaLabel}>Fatura Tarihi</Text>
            <Text style={gib.docMetaVal}>{df(doc.issue_date)}</Text>
            {doc.due_date ? (
              <>
                <Text style={gib.docMetaLabel}>Ödeme Tarihi</Text>
                <Text style={gib.docMetaVal}>{df(doc.due_date)}</Text>
              </>
            ) : null}
          </View>
        </View>

        <View style={{ flexDirection: "row" }} fixed>
          <Text style={[gib.th, { width: "6%" }]}>No</Text>
          <Text style={[gib.th, { width: "42%" }]}>Hizmet / Ürün</Text>
          <Text style={[gib.th, { width: "12%", textAlign: "right" }]}>Miktar</Text>
          <Text style={[gib.th, { width: "14%", textAlign: "right" }]}>Birim Fiyat</Text>
          <Text style={[gib.th, { width: "10%", textAlign: "right" }]}>KDV</Text>
          <Text style={[gib.th, { width: "16%", textAlign: "right" }]}>Toplam</Text>
        </View>
        {doc.lines.map((l, i) => (
          <View key={i} style={{ flexDirection: "row" }} wrap={false}>
            <Text style={[gib.td, { width: "6%", color: "#71717a" }]}>{i + 1}</Text>
            <Text style={[gib.td, { width: "42%", fontWeight: 700 }]}>{l.description}</Text>
            <Text style={[gib.td, { width: "12%", textAlign: "right" }]}>{qf(l.quantity)}</Text>
            <Text style={[gib.td, { width: "14%", textAlign: "right" }]}>{nf(l.unit_price)} TL</Text>
            <Text style={[gib.td, { width: "10%", textAlign: "right" }]}>%{Number(l.vat_rate || 0).toFixed(2)}</Text>
            <Text style={[gib.td, { width: "16%", textAlign: "right", fontWeight: 700 }]}>{nf(l.net_amount)} TL</Text>
          </View>
        ))}

        <View style={gib.footerRow} wrap={false}>
          <View style={{ width: "42%" }}>
            <Text style={{ fontSize: 6.5, color: "#71717a" }}>Senaryo</Text>
            <Text style={{ fontSize: 8, fontWeight: 700, marginBottom: 3 }}>TEMELFATURA</Text>
            <Text style={{ fontSize: 6.5, color: "#71717a" }}>Fatura Tipi</Text>
            <Text style={{ fontSize: 8, fontWeight: 700, marginBottom: 3 }}>SATIS</Text>
            <Text style={{ fontSize: 6.5, color: "#71717a" }}>Özelleştirme No</Text>
            <Text style={{ fontSize: 8, marginBottom: 3 }}>TR1.2</Text>
            <Text style={{ fontSize: 6.5, color: "#71717a" }}>ETTN</Text>
            <Text style={{ fontSize: 7, color: "#3f3f46" }}>{doc.id ? `${doc.id}-471a-bfe7-ee908adc353d` : "49703fd2-c3cc-471a-bfe7-ee908adc353d"}</Text>
          </View>

          <View style={{ width: "58%", alignSelf: "flex-end" }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 1.5 }}>
              <Text style={{ color: "#71717a" }}>Mal Hizmet Toplam Tutarı</Text>
              <Text>{nf(doc.subtotal || doc.net_total)} TL</Text>
            </View>
            {Number(doc.discount_total || 0) > 0 ? (
              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 1.5 }}>
                <Text style={{ color: "#71717a" }}>Toplam İndirim</Text>
                <Text>{nf(doc.discount_total)} TL</Text>
              </View>
            ) : null}
            {vatGroups.map(([rate, g]) => (
              <View key={rate} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 1.5 }}>
                <Text style={{ color: "#71717a" }}>Hesaplanan KDV GERÇEK (%{Number(rate).toFixed(1)})</Text>
                <Text>{nf(g.vat)} TL</Text>
              </View>
            ))}
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2, borderTopWidth: 1, borderColor: "#e4e4e7", marginTop: 2 }}>
              <Text style={{ fontWeight: 700 }}>Vergiler Dahil Toplam Tutar</Text>
              <Text style={{ fontWeight: 700 }}>{nf(doc.total)} TL</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, borderTopWidth: 1.5, borderColor: "#18181b", marginTop: 2 }}>
              <Text style={{ fontSize: 9.5, fontWeight: 700 }}>Ödenecek Tutar</Text>
              <Text style={{ fontSize: 10, fontWeight: 700 }}>{nf(doc.total)} TL</Text>
            </View>
          </View>
        </View>

        <View style={gib.bottomNotes} wrap={false}>
          <Text style={{ fontSize: 7.5, fontWeight: 700 }}>Fatura Notu</Text>
          <Text style={{ fontSize: 7.5, color: "#27272a", marginBottom: 3 }}>
            Ziraat Bankası Susurluk IBAN (TRL) {iban}{doc.notes ? ` · ${doc.notes}` : ""}
          </Text>
          <Text style={{ fontSize: 7.5, fontWeight: 700 }}>
            Yazıyla Toplam Tutar: {amountInWords(Number(doc.total || 0), "TRY").replace("Yalnız: ", "").replace(/\s+/g, "")}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export function SalesNotePdf({ doc, org }: { doc: PdfDocument; org: PdfOrg }) {
  const vatGroups = Object.entries(
    doc.lines.reduce<Record<string, { base: number; vat: number }>>((acc, l) => {
      const k = String(l.vat_rate || 0);
      acc[k] = acc[k] ?? { base: 0, vat: 0 };
      acc[k].base += Number(l.net_amount || 0);
      acc[k].vat += Number(l.vat_amount || 0);
      return acc;
    }, {}),
  );

  const orgName = org.name || "REN ENDÜSTRİYEL";
  const orgAddress = org.address || "Han Mahallesi Yeni Cadde No:23/D";
  const orgCity = [org.district, org.city].filter(Boolean).join("/") || "Susurluk/Balıkesir";

  const isOrder = doc.doc_type === "sales_order" || doc.doc_type === "purchase_order";
  const isQuote = doc.doc_type === "quote";
  const title = isOrder ? "SİPARİŞ NOTU" : isQuote ? "TEKLİF NOTU" : "SATIŞ NOTU";

  return (
    <Document title={`${title} ${doc.number ?? ""}`} author={org.name}>
      <Page size="A4" style={sn.page}>
        <View style={sn.header}>
          <View style={sn.companyCol}>
            <Text style={sn.companyTitle}>{orgName}</Text>
            <Text style={sn.companySub}>Endüstriyel Temizlik Ürünleri</Text>
            <Text style={sn.companySub}>{orgAddress}</Text>
            <Text style={sn.companySub}>{orgCity}</Text>
          </View>

          <View style={sn.titleCenter}>
            <Text style={sn.titleText}>{title}</Text>
          </View>

          <View style={sn.dateCol}>
            <Text style={sn.metaLine}>Tarih: {df(doc.issue_date)}</Text>
            <Text style={sn.metaLine}>No: {doc.number || "20260000913"}</Text>
          </View>
        </View>

        <View style={sn.customerBox}>
          <Text style={sn.customerName}>{doc.party.name || "Perakende Müşteri"}</Text>
          {doc.party.phone ? <Text style={sn.customerText}>{doc.party.phone}</Text> : null}
          {(doc.party.tax_office || doc.party.tax_number) ? (
            <Text style={sn.customerText}>VD:{doc.party.tax_office || "Susurluk"} VN:{doc.party.tax_number || "—"}</Text>
          ) : null}
          <Text style={sn.attention}>Sayın Yetkili dikkatine;</Text>
          <Text style={sn.customerText}>Satış işlemine ait bilgiler aşağıdaki gibidir.</Text>
        </View>

        <View style={{ flexDirection: "row" }} fixed>
          <Text style={[sn.th, { width: "44%" }]}>Açıklama</Text>
          <Text style={[sn.th, { width: "14%", textAlign: "right" }]}>Miktar</Text>
          <Text style={[sn.th, { width: "14%", textAlign: "right" }]}>Fiyat</Text>
          <Text style={[sn.th, { width: "12%", textAlign: "right" }]}>İndirim (%)</Text>
          <Text style={[sn.th, { width: "16%", textAlign: "right" }]}>Tutar (KDV Hariç)</Text>
        </View>
        {doc.lines.map((l, i) => (
          <View key={i} style={{ flexDirection: "row" }} wrap={false}>
            <Text style={[sn.td, { width: "44%" }]}>{i + 1} {l.description}</Text>
            <Text style={[sn.td, { width: "14%", textAlign: "right" }]}>{qf(l.quantity)} {l.unit || "ad"}</Text>
            <Text style={[sn.td, { width: "14%", textAlign: "right" }]}>{nf(l.unit_price)} ₺</Text>
            <Text style={[sn.td, { width: "12%", textAlign: "right" }]}>%{Number(l.discount_rate || 0).toFixed(2)}</Text>
            <Text style={[sn.td, { width: "16%", textAlign: "right", fontWeight: 700 }]}>{nf(l.net_amount)} ₺</Text>
          </View>
        ))}

        <View style={sn.summaryRow} wrap={false}>
          <View style={{ width: "50%" }}>
            <Text style={sn.balanceLabel}>
              Güncel bakiyeniz:{" "}
              <Text style={sn.balanceVal}>
                {doc.contact_balance_info ? `${nf(Math.abs(doc.contact_balance_info.current_balance || 0))} TL` : "0,00 TL"}
              </Text>
            </Text>
          </View>

          <View style={{ width: "50%", alignSelf: "flex-end" }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 1.5 }}>
              <Text style={{ color: "#71717a" }}>Net</Text>
              <Text>{nf(doc.net_total || doc.subtotal)} ₺</Text>
            </View>
            {vatGroups.map(([rate, g]) => (
              <View key={rate} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 1.5 }}>
                <Text style={{ color: "#71717a" }}>KDV (%{Math.round(Number(rate))})</Text>
                <Text>{nf(g.vat)} ₺</Text>
              </View>
            ))}
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, borderTopWidth: 1.5, borderColor: "#18181b", marginTop: 2 }}>
              <Text style={{ fontSize: 9.5, fontWeight: 700 }}>Toplam</Text>
              <Text style={{ fontSize: 10, fontWeight: 700 }}>{nf(doc.total)} ₺</Text>
            </View>
          </View>
        </View>

        <Text style={sn.thankYou}>Teşekkür ederiz.</Text>
      </Page>
    </Document>
  );
}

export function DocumentPdf({ doc, org, logo }: { doc: PdfDocument; org: PdfOrg; logo?: string | null }) {
  if (doc.doc_type === "sales_invoice" || doc.doc_type === "purchase_invoice") {
    return <GibInvoicePdf doc={doc} org={org} logo={logo} />;
  }
  if (doc.doc_type === "sales_order" || doc.doc_type === "purchase_order" || doc.doc_type === "quote" || doc.doc_type === "pos_sale") {
    return <SalesNotePdf doc={doc} org={org} />;
  }
  const cur = sym(doc.currency);
  const priced = doc.showPrices !== false;
  const vatGroups = Object.entries(
    doc.lines.reduce<Record<string, { base: number; vat: number }>>((acc, l) => {
      const k = String(l.vat_rate);
      acc[k] = acc[k] ?? { base: 0, vat: 0 };
      acc[k].base += Number(l.net_amount);
      acc[k].vat += Number(l.vat_amount);
      return acc;
    }, {}),
  );
  const cols = priced
    ? [
        { h: "#", w: "5%" },
        { h: "Ürün / Hizmet", w: "35%" },
        { h: "Miktar", w: "12%", r: true },
        { h: "Birim Fiyat", w: "14%", r: true },
        { h: "İsk.", w: "7%", r: true },
        { h: "KDV", w: "7%", r: true },
        { h: "Tutar", w: "20%", r: true },
      ]
    : [
        { h: "#", w: "6%" },
        { h: "Ürün / Hizmet", w: "70%" },
        { h: "Miktar", w: "24%", r: true },
      ];

  return (
    <Document title={`${doc.title} ${doc.number ?? ""}`} author={org.name}>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <OrgHeader org={org} logo={logo} />
          <View>
            <Text style={s.title}>{doc.title.toLocaleUpperCase("tr-TR")}</Text>
            {doc.number ? (
              <View style={s.metaRow}>
                <Text style={s.metaLabel}>Belge No</Text>
                <Text style={s.metaValue}>{doc.number}</Text>
              </View>
            ) : null}
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Tarih</Text>
              <Text style={s.metaValue}>{df(doc.issue_date)}</Text>
            </View>
            {doc.due_date ? (
              <View style={s.metaRow}>
                <Text style={s.metaLabel}>Vade</Text>
                <Text style={s.metaValue}>{df(doc.due_date)}</Text>
              </View>
            ) : null}
            {doc.valid_until ? (
              <View style={s.metaRow}>
                <Text style={s.metaLabel}>Geçerlilik</Text>
                <Text style={s.metaValue}>{df(doc.valid_until)}</Text>
              </View>
            ) : null}
            {doc.currency !== "TRY" && doc.exchange_rate ? (
              <View style={s.metaRow}>
                <Text style={s.metaLabel}>Kur</Text>
                <Text style={s.metaValue}>1 {doc.currency} = {nf(doc.exchange_rate, 4)} ₺</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={s.box}>
          <Text style={s.boxLabel}>{doc.party.label}</Text>
          <Text style={{ fontSize: 10, fontWeight: 700 }}>{doc.party.name ?? "—"}</Text>
          {doc.party.address ? <Text style={s.small}>{doc.party.address}</Text> : null}
          {doc.party.tax_number ? (
            <Text style={s.small}>VKN/TCKN: {doc.party.tax_number}{doc.party.tax_office ? ` · ${doc.party.tax_office} V.D.` : ""}</Text>
          ) : null}
          {doc.party.phone || doc.party.email ? <Text style={s.small}>{[doc.party.phone, doc.party.email].filter(Boolean).join(" · ")}</Text> : null}
        </View>

        <View style={s.row} fixed>
          {cols.map((c) => (
            <Text key={c.h} style={[s.th, { width: c.w }, c.r ? s.right : {}]}>
              {c.h}
            </Text>
          ))}
        </View>
        {doc.lines.map((l, i) => (
          <View key={i} style={s.row} wrap={false}>
            <Text style={[s.td, { width: cols[0].w }]}>{i + 1}</Text>
            <Text style={[s.td, { width: cols[1].w }]}>{l.description}</Text>
            <Text style={[s.td, { width: cols[2].w }, s.right]}>
              {qf(l.quantity)} {l.unit ?? ""}
            </Text>
            {priced ? (
              <>
                <Text style={[s.td, { width: cols[3].w }, s.right]}>{nf(l.unit_price)}</Text>
                <Text style={[s.td, { width: cols[4].w }, s.right]}>{l.discount_rate ? `%${qf(l.discount_rate)}` : ""}</Text>
                <Text style={[s.td, { width: cols[5].w }, s.right]}>%{qf(l.vat_rate)}</Text>
                <Text style={[s.td, { width: cols[6].w }, s.right]}>{nf(l.net_amount)}</Text>
              </>
            ) : null}
          </View>
        ))}

        {priced ? (
          <View style={s.totals} wrap={false}>
            <View style={s.totalRow}>
              <Text style={{ color: C.muted }}>Ara toplam</Text>
              <Text>{nf(doc.subtotal)} {cur}</Text>
            </View>
            {Number(doc.discount_total) > 0 ? (
              <View style={s.totalRow}>
                <Text style={{ color: C.muted }}>İskonto</Text>
                <Text>-{nf(doc.discount_total)} {cur}</Text>
              </View>
            ) : null}
            <View style={s.totalRow}>
              <Text style={{ color: C.muted }}>Matrah</Text>
              <Text>{nf(doc.net_total)} {cur}</Text>
            </View>
            {vatGroups.map(([rate, g]) => (
              <View key={rate} style={s.totalRow}>
                <Text style={{ color: C.muted }}>KDV %{qf(Number(rate))}</Text>
                <Text>{nf(g.vat)} {cur}</Text>
              </View>
            ))}
            <View style={s.grand}>
              <Text>GENEL TOPLAM</Text>
              <Text>{nf(doc.total)} {cur}</Text>
            </View>
            {doc.paid_amount ? (
              <View style={s.totalRow}>
                <Text style={{ color: C.muted }}>Ödenen / Kalan</Text>
                <Text>{nf(doc.paid_amount)} / {nf(Number(doc.total) - Number(doc.paid_amount))} {cur}</Text>
              </View>
            ) : null}
            {doc.contact_balance_info ? (
              <View style={s.balanceBox} wrap={false}>
                {doc.contact_balance_info.previous_balance !== undefined && doc.contact_balance_info.previous_balance !== null ? (
                  <View style={s.balanceRow}>
                    <Text style={s.balanceLabel}>Önceki Bakiye:</Text>
                    <Text style={s.balanceVal}>{formatBal(doc.contact_balance_info.previous_balance)}</Text>
                  </View>
                ) : null}
                <View style={s.balanceRow}>
                  <Text style={s.balanceLabel}>Bu Belge / Sipariş:</Text>
                  <Text style={[s.balanceVal, { fontWeight: 700 }]}>
                    {nf(doc.contact_balance_info.this_amount ?? doc.total)} {cur}
                  </Text>
                </View>
                <View style={s.currentBalanceRow}>
                  <Text style={s.currentBalanceLabel}>GÜNCEL TOPLAM BAKİYE:</Text>
                  <Text style={s.currentBalanceVal}>{formatBal(doc.contact_balance_info.current_balance)}</Text>
                </View>
              </View>
            ) : null}
          </View>
        ) : null}
        {priced ? <Text style={s.words}>{amountInWords(doc.total, doc.currency)}</Text> : null}

        {doc.notes ? (
          <View style={s.notes}>
            <Text style={s.boxLabel}>Notlar</Text>
            <Text>{doc.notes}</Text>
          </View>
        ) : null}
        {doc.terms ? (
          <View style={s.notes}>
            <Text style={s.boxLabel}>Koşullar</Text>
            <Text>{doc.terms}</Text>
          </View>
        ) : null}

        {!priced ? (
          <View style={[s.row, { marginTop: 40, justifyContent: "space-between" }]}>
            <Text style={s.small}>Teslim eden: ____________________</Text>
            <Text style={s.small}>Teslim alan: ____________________</Text>
          </View>
        ) : null}
        <Footer org={org} />
      </Page>
    </Document>
  );
}

export type PdfStatementRow = { entry_date: string; label: string; number?: string | null; description?: string | null; debit: number; credit: number; balance: number };

export function StatementPdf({
  org,
  logo,
  contact,
  rows,
  carried,
  from,
  to,
  title = "HESAP EKSTRESİ",
  partyTitle = "Cari",
  debitHeader = "Borç",
  creditHeader = "Alacak",
  carriedText = "Devreden",
  note = "Ekstremizde mutabık olmadığınız hususları 15 gün içinde bildirmediğiniz takdirde bakiyenin kabul edilmiş sayılacağını rica ederiz.",
  currency = "₺",
}: {
  org: PdfOrg;
  logo?: string | null;
  contact: { name: string; tax_number?: string | null; tax_office?: string | null; address?: string | null };
  rows: PdfStatementRow[];
  carried: number;
  from: string;
  to: string;
  title?: string;
  partyTitle?: string;
  debitHeader?: string;
  creditHeader?: string;
  carriedText?: string;
  note?: string;
  currency?: string;
}) {
  const last = rows.length ? rows[rows.length - 1].balance : carried;
  const W = ["12%", "18%", "30%", "13%", "13%", "14%"];
  return (
    <Document title={`${title} - ${contact.name}`} author={org.name}>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <OrgHeader org={org} logo={logo} />
          <View>
            <Text style={s.title}>{title}</Text>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Dönem</Text>
              <Text style={[s.metaValue, { width: 130 }]}>{df(from)} – {df(to)}</Text>
            </View>
          </View>
        </View>
        <View style={s.box}>
          <Text style={s.boxLabel}>{partyTitle}</Text>
          <Text style={{ fontSize: 10, fontWeight: 700 }}>{contact.name}</Text>
          {contact.address ? <Text style={s.small}>{contact.address}</Text> : null}
          {contact.tax_number ? <Text style={s.small}>{contact.tax_number}{contact.tax_office ? ` · ${contact.tax_office}` : ""}</Text> : null}
        </View>
        <View style={s.row} fixed>
          {["Tarih", "İşlem", "Açıklama", debitHeader, creditHeader, "Bakiye"].map((h, i) => (
            <Text key={h} style={[s.th, { width: W[i] }, i >= 3 ? s.right : {}]}>
              {h}
            </Text>
          ))}
        </View>
        <View style={s.row}>
          <Text style={[s.td, { width: W[0] }]}>{df(from)}</Text>
          <Text style={[s.td, { width: W[1] }]}>{carriedText}</Text>
          <Text style={[s.td, { width: W[2] }]} />
          <Text style={[s.td, { width: W[3] }]} />
          <Text style={[s.td, { width: W[4] }]} />
          <Text style={[s.td, { width: W[5] }, s.right]}>{nf(carried)}</Text>
        </View>
        {rows.map((r, i) => (
          <View key={i} style={s.row} wrap={false}>
            <Text style={[s.td, { width: W[0] }]}>{df(r.entry_date)}</Text>
            <Text style={[s.td, { width: W[1] }]}>{r.label}{r.number ? `\n${r.number}` : ""}</Text>
            <Text style={[s.td, { width: W[2] }]}>{r.description && r.description !== r.number ? r.description : ""}</Text>
            <Text style={[s.td, { width: W[3] }, s.right]}>{r.debit ? nf(r.debit) : ""}</Text>
            <Text style={[s.td, { width: W[4] }, s.right]}>{r.credit ? nf(r.credit) : ""}</Text>
            <Text style={[s.td, { width: W[5] }, s.right]}>{nf(r.balance)}</Text>
          </View>
        ))}
        <View style={s.totals} wrap={false}>
          <View style={s.grand}>
            <Text>{last >= 0 ? `${debitHeader.toUpperCase()} BAKİYESİ` : `${creditHeader.toUpperCase()} BAKİYESİ`}</Text>
            <Text>{nf(Math.abs(last))} {currency}</Text>
          </View>
        </View>
        {note ? (
          <Text style={[s.small, { marginTop: 18 }]}>
            {note}
          </Text>
        ) : null}
        <Footer org={org} />
      </Page>
    </Document>
  );
}

export type PdfListColumn = {
  header: string;
  width?: string;
  align?: "left" | "right" | "center";
};

export function ListReportPdf({
  org,
  logo,
  title,
  subtitle,
  columns,
  rows,
  summary,
  orientation = "landscape",
}: {
  org: PdfOrg;
  logo?: string | null;
  title: string;
  subtitle?: string;
  columns: PdfListColumn[];
  rows: (string | number)[][];
  summary?: { label: string; value: string }[];
  orientation?: "portrait" | "landscape";
}) {
  const autoWidth = `${Math.floor(100 / (columns.length || 1))}%`;
  return (
    <Document title={title} author={org.name}>
      <Page size="A4" orientation={orientation} style={s.page}>
        <View style={s.header}>
          <OrgHeader org={org} logo={logo} />
          <View>
            <Text style={s.title}>{title}</Text>
            {subtitle ? (
              <View style={s.metaRow}>
                <Text style={s.metaLabel}>Filtre / Dönem</Text>
                <Text style={[s.metaValue, { width: 180 }]}>{subtitle}</Text>
              </View>
            ) : null}
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Rapor Tarihi</Text>
              <Text style={[s.metaValue, { width: 180 }]}>{new Date().toLocaleDateString("tr-TR")}</Text>
            </View>
          </View>
        </View>

        {/* Table Header */}
        <View style={s.row} fixed>
          {columns.map((col, i) => (
            <Text
              key={i}
              style={[
                s.th,
                { width: col.width || autoWidth },
                col.align === "right" ? s.right : col.align === "center" ? { textAlign: "center" } : {},
              ]}
            >
              {col.header}
            </Text>
          ))}
        </View>

        {/* Table Rows */}
        {rows.map((row, rIdx) => (
          <View
            key={rIdx}
            style={[s.row, rIdx % 2 === 1 ? { backgroundColor: C.soft } : {}]}
            wrap={false}
          >
            {row.map((cell, cIdx) => {
              const col = columns[cIdx];
              return (
                <Text
                  key={cIdx}
                  style={[
                    s.td,
                    { width: col?.width || autoWidth },
                    col?.align === "right" ? s.right : col?.align === "center" ? { textAlign: "center" } : {},
                  ]}
                >
                  {cell !== null && cell !== undefined ? String(cell) : ""}
                </Text>
              );
            })}
          </View>
        ))}

        {/* Summary */}
        {summary && summary.length > 0 ? (
          <View style={[s.totals, { marginTop: 12 }]} wrap={false}>
            {summary.map((sum, sIdx) => (
              <View key={sIdx} style={s.totalRow}>
                <Text style={{ fontSize: 8, color: C.muted }}>{sum.label}</Text>
                <Text style={{ fontSize: 9, fontWeight: 700 }}>{sum.value}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <Footer org={org} />
      </Page>
    </Document>
  );
}
