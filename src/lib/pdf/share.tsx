"use client";

import * as React from "react";
import { toast } from "sonner";
import { supabase, type Tables } from "@/lib/supabase/client";
import { downloadBlob } from "@/lib/excel";
import { DOC_TYPES, type DocType } from "@/lib/doc-types";
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

/** Telefonda paylaşım menüsü (WhatsApp vb.), masaüstünde indirme */
export async function shareOrDownload(blob: Blob, fileName: string, text: string, mode: "share" | "download" | "open" = "share") {
  const file = new File([blob], fileName, { type: "application/pdf" });
  if (mode === "open") {
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  }
  if (mode === "share" && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: fileName, text });
      return;
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
    }
  }
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
}: {
  org: Org;
  contact: Tables<"contacts">;
  rows: { entry_date: string; ref_type: string; number: string | null; description: string | null; debit: number; credit: number; balance: number }[];
  carried: number;
  from: string;
  to: string;
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
    await shareOrDownload(blob, `Ekstre-${safe(contact.name)}.pdf`, `${org.name} hesap ekstresi`);
  } catch (e) {
    toast.error("PDF oluşturulamadı: " + (e as Error).message, { id: t });
  }
}

export type DocForPdf = Tables<"documents"> & {
  lines: (Tables<"document_lines"> & { unit_name?: string | null; product_name?: string | null })[];
  contact_balance_info?: {
    previous_balance?: number | null;
    this_amount?: number | null;
    current_balance?: number | null;
  } | null;
};

export async function shareDocumentPdf(org: Org, doc: DocForPdf, mode: "share" | "download" | "open" = "share") {
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

        const isSales = doc.doc_type.startsWith("sales") || doc.doc_type === "pos_sale" || doc.doc_type === "quote";
        const docAmtTry = Number(doc.total_try ?? Number(doc.total) * Number(doc.exchange_rate || 1));
        const isActive = doc.status !== "draft" && doc.status !== "cancelled";

        let prevBal = 0;
        let curBal = 0;
        if (isActive) {
          curBal = baseBal + (cb?.includes_orders ? 0 : isSales ? docAmtTry : -docAmtTry);
          prevBal = isSales ? curBal - docAmtTry : curBal + docAmtTry;
        } else {
          prevBal = baseBal;
          curBal = isSales ? prevBal + docAmtTry : prevBal - docAmtTry;
        }

        balanceInfo = {
          previous_balance: Math.round(prevBal * 100) / 100,
          this_amount: Number(doc.total),
          current_balance: Math.round(curBal * 100) / 100,
        };
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
    await shareOrDownload(blob, `${cfg.label}-${safe(doc.number ?? "taslak")}.pdf`, `${org.name} · ${cfg.label} ${doc.number ?? ""}`, mode);
    if (!doc.is_printed) await supabase.from("documents").update({ is_printed: true }).eq("id", doc.id);
  } catch (e) {
    toast.error("PDF oluşturulamadı: " + (e as Error).message, { id: t });
  }
}
