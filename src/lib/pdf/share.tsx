"use client";

import * as React from "react";
import { toast } from "sonner";
import { supabase, type Tables } from "@/lib/supabase/client";
import { downloadBlob } from "@/lib/excel";
import { formatMoney } from "@/lib/format";
import { DOC_TYPES, docBalanceInfo, type DocType } from "@/lib/doc-types";
import { TYPE_LABELS } from "@/components/dashboard/types";

type Org = Tables<"organizations">;

async function logoDataUrl(path: string | null | undefined): Promise<string | null> {
  if (!path || /\.(webp|svg)$/i.test(path)) return null;
  try {
    const { data } = await supabase.storage.from("files").download(path);
    if (!data) return null;
    return await new Promise((res) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.onerror = () => res(null);
      r.readAsDataURL(data);
    });
  } catch {
    return null;
  }
}

async function render(el: React.ReactElement) {
  const { pdf } = await import("@react-pdf/renderer");
  const { registerFonts } = await import("./templates");
  registerFonts(window.location.origin);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return pdf(el as any).toBlob();
}

/** Telefonda paylaşım menüsü (WhatsApp vb.), masaüstünde indirme veya yeni sekmede yazdırma/görüntüleme */
export async function shareOrDownload(
  blob: Blob,
  fileName: string,
  text: string,
  mode: "share" | "download" | "open" | "print" = "download",
  /** Tıklama anında önceden açılmış sekme (açılır pencere engelleyicisine takılmamak için) */
  targetWin?: Window | null,
) {
  const file = new File([blob], fileName, { type: "application/pdf" });

  if (mode === "open" || mode === "print") {
    const url = URL.createObjectURL(blob);
    let win = targetWin && !targetWin.closed ? targetWin : null;
    if (win) win.location.href = url;
    else win = window.open(url, "_blank");
    if (!win) {
      downloadBlob(blob, fileName);
      return;
    }
    if (mode === "print") {
      win.addEventListener("load", () => {
        try {
          win.focus();
          win.print();
        } catch {
          // Browser PDF viewer handles printing
        }
      });
    }
    setTimeout(() => URL.revokeObjectURL(url), 120_000);
    return;
  }

  // Windows ve Mac masaüstünde OS Share (OneNote / Bluetooth) diyalogunu asla açma!
  // Sadece mobil cihazlarda WhatsApp/vb. paylaşımı için navigator.share kullan:
  const isMobile =
    typeof navigator !== "undefined" &&
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");

  if (mode === "share" && isMobile && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: fileName, text });
      return;
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
    }
  }

  // Masaüstünde veya download seçildiğinde doğrudan PDF dosyasını indir:
  downloadBlob(blob, fileName);
}

const safe = (s: string) => s.replace(/[^\p{L}\p{N}\-_ ]/gu, "").trim().replace(/\s+/g, "-");

export async function shareStatementPdf({
  org,
  contact,
  rows,
  carried,
  from,
  to,
  mode = "download",
}: {
  org: Org;
  contact: Tables<"contacts">;
  rows: { entry_date: string; ref_type: string; number: string | null; description: string | null; debit: number; credit: number; balance: number }[];
  carried: number;
  from: string;
  to: string;
  mode?: "share" | "download" | "open" | "print";
}) {
  const t = toast.loading("PDF hazırlanıyor…");
  try {
    const { StatementPdf } = await import("./templates");
    const logo = await logoDataUrl(org.logo_path);
    const blob = await render(
      <StatementPdf
        org={org}
        logo={logo}
        contact={{ name: contact.name, tax_number: contact.tax_number, tax_office: contact.tax_office, address: [contact.address, contact.district, contact.city].filter(Boolean).join(" ") }}
        carried={carried}
        from={from}
        to={to}
        rows={rows.map((r) => ({
          entry_date: r.entry_date,
          label: DOC_TYPES[r.ref_type as DocType]?.label ?? TYPE_LABELS[r.ref_type] ?? "Açılış",
          number: r.number,
          description: r.description,
          debit: Number(r.debit),
          credit: Number(r.credit),
          balance: Number(r.balance),
        }))}
      />,
    );
    toast.dismiss(t);
    await shareOrDownload(blob, `Ekstre-${safe(contact.name)}.pdf`, `${org.name} hesap ekstresi`, mode);
  } catch (e) {
    toast.error("PDF oluşturulamadı: " + (e as Error).message, { id: t });
  }
}

export async function shareAccountStatementPdf({
  org,
  account,
  rows,
  from,
  to,
  mode = "download",
}: {
  org: Org;
  account: Tables<"accounts">;
  rows: { id: string; txn_date: string; type: string; direction: string; description: string | null; reference: string | null; party: string | null; amount_in: number; amount_out: number; balance: number }[];
  from: string;
  to: string;
  mode?: "share" | "download" | "open" | "print";
}) {
  const t = toast.loading("PDF hazırlanıyor…");
  try {
    const { StatementPdf } = await import("./templates");
    const logo = await logoDataUrl(org.logo_path);
    const carried = rows.length > 0 ? Number(rows[0].balance) - (Number(rows[0].amount_in) - Number(rows[0].amount_out)) : Number(account.balance);
    const blob = await render(
      <StatementPdf
        org={org}
        logo={logo}
        title="KASA / BANKA HESAP EKSTRESİ"
        partyTitle="Hesap Bilgisi"
        debitHeader="Giriş (Borç)"
        creditHeader="Çıkış (Alacak)"
        carriedText="Dönem Başı"
        note=""
        currency={account.currency}
        contact={{
          name: account.name,
          tax_number: account.iban ? `IBAN: ${account.iban}` : undefined,
          tax_office: account.currency,
          address: account.bank_name ? `Banka: ${account.bank_name}` : undefined,
        }}
        carried={carried}
        from={from}
        to={to}
        rows={rows.map((r) => ({
          entry_date: r.txn_date,
          label: TYPE_LABELS[r.type] ?? r.type,
          number: r.reference,
          description: [r.party, r.description].filter(Boolean).join(" · "),
          debit: Number(r.amount_in),
          credit: Number(r.amount_out),
          balance: Number(r.balance),
        }))}
      />,
    );
    toast.dismiss(t);
    await shareOrDownload(blob, `Hesap-Ekstre-${safe(account.name)}.pdf`, `${org.name} ${account.name} ekstresi`, mode);
  } catch (e) {
    toast.error("PDF oluşturulamadı: " + (e as Error).message, { id: t });
  }
}

export async function shareListPdf({
  org,
  title,
  subtitle,
  columns,
  rows,
  summary,
  fileName,
  orientation = "landscape",
  mode = "download",
}: {
  org: Org;
  title: string;
  subtitle?: string;
  columns: { header: string; width?: string; align?: "left" | "right" | "center" }[];
  rows: (string | number)[][];
  summary?: { label: string; value: string }[];
  fileName: string;
  orientation?: "portrait" | "landscape";
  mode?: "share" | "download" | "open" | "print";
}) {
  const t = toast.loading("PDF hazırlanıyor…");
  try {
    const { ListReportPdf } = await import("./templates");
    const logo = await logoDataUrl(org.logo_path);
    const blob = await render(
      <ListReportPdf
        org={org}
        logo={logo}
        title={title}
        subtitle={subtitle}
        columns={columns}
        rows={rows}
        summary={summary}
        orientation={orientation}
      />,
    );
    toast.dismiss(t);
    await shareOrDownload(blob, `${safe(fileName)}.pdf`, `${org.name} · ${title}`, mode);
  } catch (e) {
    toast.error("PDF oluşturulamadı: " + (e as Error).message, { id: t });
  }
}

/** Tahsilata/ödemeye çıkarken çıktısı alınacak bakiye listesi: telefon, yer, bakiye ve elle not alanı */
export async function shareBalanceListPdf({
  org,
  title,
  subtitle,
  rows,
  fileName,
  mode = "download",
}: {
  org: Org;
  title: string;
  subtitle?: string;
  /** balance > 0: cari bize borçlu, balance < 0: biz cariye borçluyuz */
  rows: { name: string; phone?: string | null; place?: string | null; balance: number }[];
  fileName: string;
  mode?: "share" | "download" | "open" | "print";
}) {
  const list = rows.filter((r) => Math.abs(r.balance) > 0.004);
  if (list.length === 0) {
    toast.error("Listede bakiyesi olan cari yok");
    return;
  }
  const rec = list.filter((r) => r.balance > 0).reduce((s, r) => s + r.balance, 0);
  const pay = list.filter((r) => r.balance < 0).reduce((s, r) => s - r.balance, 0);
  const mixed = rec > 0 && pay > 0;
  const summary = [{ label: "Cari Sayısı", value: `${list.length} adet` }];
  if (rec > 0) summary.push({ label: mixed ? "Toplam Alacağımız (B: bize borçlu)" : "Toplam Alacağımız", value: formatMoney(rec, "TRY") });
  if (pay > 0) summary.push({ label: mixed ? "Toplam Borcumuz (A: bizden alacaklı)" : "Toplam Borcumuz", value: formatMoney(pay, "TRY") });
  if (mixed) summary.push({ label: "Net", value: formatMoney(rec - pay, "TRY") });

  await shareListPdf({
    org,
    title,
    subtitle,
    orientation: "portrait",
    fileName,
    mode,
    columns: [
      { header: "#", width: "5%" },
      { header: "Cari", width: "34%" },
      { header: "Telefon", width: "16%" },
      { header: "İlçe / İl", width: "15%" },
      { header: "Bakiye", width: "16%", align: "right" },
      { header: "Tahsilat / Not", width: "14%", align: "center" },
    ],
    rows: list.map((r, i) => [
      i + 1,
      r.name,
      r.phone || "—",
      r.place || "—",
      formatMoney(Math.abs(r.balance), "TRY") + (mixed ? (r.balance > 0 ? " (B)" : " (A)") : ""),
      "",
    ]),
    summary,
  });
}

export type DocForPdf =Tables<"documents"> & {
  lines: (Tables<"document_lines"> & { unit_name?: string | null; product_name?: string | null })[];
  contact_balance_info?: {
    previous_balance?: number | null;
    this_amount?: number | null;
    current_balance?: number | null;
  } | null;
};

export async function shareDocumentPdf(
  org: Org,
  doc: DocForPdf,
  mode: "share" | "download" | "open" | "print" = "open",
  targetWin?: Window | null,
) {
  const t = toast.loading("PDF hazırlanıyor…");
  try {
    const { DocumentPdf } = await import("./templates");
    const logo = await logoDataUrl(org.logo_path);
    const cfg = DOC_TYPES[doc.doc_type as DocType];
    const snap = (doc.contact_snapshot ?? {}) as Record<string, string | null>;
    const isDelivery = doc.doc_type === "sales_delivery" || doc.doc_type === "purchase_delivery";

    let balanceInfo = doc.contact_balance_info;
    if (balanceInfo === undefined && doc.contact_id) {
      try {
        const { data: rawCb } = await (supabase.from as any)("contact_balances")
          .select("*")
          .eq("contact_id", doc.contact_id)
          .maybeSingle();
        const cb = rawCb as { balance?: number | null; includes_orders?: boolean } | null;

        const { data: contactRow } = await supabase
          .from("contacts")
          .select("opening_balance")
          .eq("id", doc.contact_id)
          .maybeSingle();

        let baseBal =
          cb?.balance !== undefined && cb?.balance !== null
            ? Number(cb.balance)
            : Number(contactRow?.opening_balance ?? 0);

        if (!cb?.includes_orders) {
          const { data: openOrders } = await supabase
            .from("documents")
            .select("id, doc_type, total_try, total, exchange_rate, status")
            .eq("contact_id", doc.contact_id)
            .is("deleted_at", null)
            .in("doc_type", ["sales_order", "purchase_order"])
            .not("status", "in", '("draft","cancelled","converted")');

          for (const o of openOrders ?? []) {
            if (o.id === doc.id) continue;
            const amt = Number(o.total_try ?? Number(o.total) * Number(o.exchange_rate || 1));
            if (o.doc_type === "sales_order") baseBal += amt;
            else if (o.doc_type === "purchase_order") baseBal -= amt;
          }
        }

        // baseBal: fatura/iade bakiyede zaten var; sipariş ise yukarıda kendisi hariç tutuldu (görünüm siparişi içermiyorsa)
        const isOrder = doc.doc_type === "sales_order" || doc.doc_type === "purchase_order";
        const included = doc.status !== "draft" && (!isOrder || !!cb?.includes_orders);
        balanceInfo = docBalanceInfo(doc, baseBal, included);
      } catch (err) {
        console.warn("Bakiye bilgisi alınamadı:", err);
      }
    }

    const blob = await render(
      <DocumentPdf
        org={org}
        logo={logo}
        doc={{
          id: doc.id,
          doc_type: doc.doc_type,
          title: doc.doc_type === "sales_invoice" || doc.doc_type === "pos_sale" ? "Fatura" : cfg.label,
          number: doc.number,
          issue_date: doc.issue_date,
          due_date: doc.due_date,
          valid_until: doc.valid_until,
          currency: doc.currency,
          exchange_rate: Number(doc.exchange_rate),
          party: {
            label: cfg.side === "sales" ? "Sayın" : cfg.contactLabel,
            name: snap.name,
            tax_number: snap.tax_number,
            tax_office: snap.tax_office,
            address: [snap.address, snap.district, snap.city].filter(Boolean).join(" "),
            phone: snap.phone,
            email: snap.email,
          },
          lines: doc.lines.map((l) => ({
            description: l.description || l.product_name || "",
            quantity: Number(l.quantity),
            unit: l.unit_name,
            unit_price: Number(l.unit_price),
            discount_rate: Number(l.discount_rate),
            vat_rate: Number(l.vat_rate),
            net_amount: Number(l.net_amount),
            vat_amount: Number(l.vat_amount),
            total_amount: Number(l.total_amount),
          })),
          subtotal: Number(doc.subtotal),
          discount_total: Number(doc.discount_total),
          net_total: Number(doc.net_total),
          vat_total: Number(doc.vat_total),
          total: Number(doc.total),
          paid_amount: cfg.payable ? Number(doc.paid_amount) : 0,
          notes: doc.notes,
          terms: doc.terms,
          showPrices: !isDelivery,
          contact_balance_info: balanceInfo,
        }}
      />,
    );
    toast.dismiss(t);
    await shareOrDownload(blob, `${cfg.label}-${safe(doc.number ?? "taslak")}.pdf`, `${org.name} · ${cfg.label} ${doc.number ?? ""}`, mode, targetWin);
    if (!doc.is_printed) await supabase.from("documents").update({ is_printed: true }).eq("id", doc.id);
  } catch (e) {
    toast.error("PDF oluşturulamadı: " + (e as Error).message, { id: t });
  }
}
