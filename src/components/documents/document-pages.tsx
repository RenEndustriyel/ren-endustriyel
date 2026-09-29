"use client";

import { useSearchParams } from "next/navigation";
import type { DocType } from "@/lib/doc-types";
import { DocumentEditor } from "./document-editor";
import { DocumentView } from "./document-view";

export function DocNewPage({ type }: { type: DocType }) {
  const p = useSearchParams();
  const isPriceDiff = p.get("fiyat_farki") === "1";
  const initialLine = isPriceDiff
    ? {
        description: p.get("aciklama") || "Fiyat Farkı Yansıtma",
        unit_price: Number(p.get("tutar") || 0),
        vat_rate: Number(p.get("kdv") || 20),
        quantity: 1,
      }
    : undefined;
  const initialNotes = isPriceDiff && p.get("belge_no")
    ? `${p.get("belge_no")} no'lu alış faturanızda iskonto/fiyat şartları yansıtılmadığı için düzenlenen fiyat farkı faturasıdır.`
    : undefined;

  return (
    <DocumentEditor
      type={type}
      sourceId={p.get("kaynak")}
      copyId={p.get("kopya")}
      contactId={p.get("cari") || p.get("contact_id")}
      initialLine={initialLine}
      initialNotes={initialNotes}
    />
  );
}

export function DocEditPage({ type }: { type: DocType }) {
  const id = useSearchParams().get("id");
  return id ? <DocumentEditor type={type} editId={id} /> : null;
}

export function DocDetailPage({ type }: { type: DocType }) {
  const id = useSearchParams().get("id");
  return id ? <DocumentView type={type} id={id} /> : null;
}
