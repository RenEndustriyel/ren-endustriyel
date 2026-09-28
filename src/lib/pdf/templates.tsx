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
});

const nf = (n: number, d = 2) => Number(n ?? 0).toLocaleString("tr-TR", { minimumFractionDigits: d, maximumFractionDigits: d });
const qf = (n: number) => Number(n ?? 0).toLocaleString("tr-TR", { maximumFractionDigits: 3 });
const df = (d?: string | null) => (d ? new Date(`${d.slice(0, 10)}T00:00:00`).toLocaleDateString("tr-TR") : "");
const sym = (c: string) => (c === "USD" ? "$" : c === "EUR" ? "€" : "₺");

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
};

export function DocumentPdf({ doc, org, logo }: { doc: PdfDocument; org: PdfOrg; logo?: string | null }) {
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
}: {
  org: PdfOrg;
  logo?: string | null;
  contact: { name: string; tax_number?: string | null; tax_office?: string | null; address?: string | null };
  rows: PdfStatementRow[];
  carried: number;
  from: string;
  to: string;
}) {
  const last = rows.length ? rows[rows.length - 1].balance : carried;
  const W = ["12%", "18%", "30%", "13%", "13%", "14%"];
  return (
    <Document title={`Hesap Ekstresi ${contact.name}`} author={org.name}>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <OrgHeader org={org} logo={logo} />
          <View>
            <Text style={s.title}>HESAP EKSTRESİ</Text>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Dönem</Text>
              <Text style={[s.metaValue, { width: 130 }]}>{df(from)} – {df(to)}</Text>
            </View>
          </View>
        </View>
        <View style={s.box}>
          <Text style={s.boxLabel}>Cari</Text>
          <Text style={{ fontSize: 10, fontWeight: 700 }}>{contact.name}</Text>
          {contact.address ? <Text style={s.small}>{contact.address}</Text> : null}
          {contact.tax_number ? <Text style={s.small}>VKN/TCKN: {contact.tax_number}{contact.tax_office ? ` · ${contact.tax_office} V.D.` : ""}</Text> : null}
        </View>
        <View style={s.row} fixed>
          {["Tarih", "İşlem", "Açıklama", "Borç", "Alacak", "Bakiye"].map((h, i) => (
            <Text key={h} style={[s.th, { width: W[i] }, i >= 3 ? s.right : {}]}>
              {h}
            </Text>
          ))}
        </View>
        <View style={s.row}>
          <Text style={[s.td, { width: W[0] }]}>{df(from)}</Text>
          <Text style={[s.td, { width: W[1] }]}>Devreden</Text>
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
            <Text>{last >= 0 ? "BORÇ BAKİYESİ" : "ALACAK BAKİYESİ"}</Text>
            <Text>{nf(Math.abs(last))} ₺</Text>
          </View>
        </View>
        <Text style={[s.small, { marginTop: 18 }]}>
          Ekstremizde mutabık olmadığınız hususları 15 gün içinde bildirmediğiniz takdirde bakiyenin kabul edilmiş sayılacağını rica ederiz.
        </Text>
        <Footer org={org} />
      </Page>
    </Document>
  );
}
