"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { DOC_TYPES, type DocType } from "@/lib/doc-types";
import { Skeleton } from "@/components/ui/skeleton";
import { DocumentEditor, useDocument } from "./document-editor";
import { DocumentView } from "./document-view";
import { QUICK_DOC_TYPES, QuickDocModal, type QuickDocSide } from "./quick-doc-modal";

type InitialLine = { description: string; unit_price: number; vat_rate: number; quantity: number };

/** Teklif, sipariş, irsaliye, fatura ve iadeler Pusulam tarzı belge penceresinde açılır */
function PusulamDocPage({
  type,
  editId,
  sourceId,
  copyId,
  contactId,
  initialLine,
  initialNotes,
}: {
  type: DocType;
  editId?: string | null;
  sourceId?: string | null;
  copyId?: string | null;
  contactId?: string | null;
  initialLine?: InitialLine;
  initialNotes?: string;
}) {
  const router = useRouter();
  const cfg = DOC_TYPES[type];
  const existing = useDocument(editId);
  const source = useDocument(sourceId ?? copyId);
  const loading = (editId && existing.isPending) || ((sourceId || copyId) && source.isPending);
  if (loading) return <Skeleton className="mx-auto h-96 max-w-5xl rounded-card" />;

  if (editId && !existing.data) {
    return <p className="py-12 text-center text-sm text-slate-600 dark:text-slate-300">Belge bulunamadı.</p>;
  }

  const mode = existing.data ? "edit" : sourceId && source.data ? "convert" : copyId && source.data ? "copy" : "new";
  const base = existing.data ?? source.data ?? null;

  const close = () => {
    if (window.history.length > 1) router.back();
    else router.push(cfg.base);
  };

  return (
    <QuickDocModal
      key={`${editId ?? ""}-${sourceId ?? ""}-${copyId ?? ""}`}
      open
      side={cfg.side as QuickDocSide}
      docType={type}
      mode={mode}
      base={base}
      contact={null}
      contactId={contactId}
      initialLine={initialLine}
      initialNotes={initialNotes}
      onOpenChange={(o) => !o && close()}
      onSaved={(d) => router.replace(`${DOC_TYPES[d.doc_type].base}/detay?id=${d.id}`)}
    />
  );
}

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
  const contactId = p.get("cari") || p.get("contact_id");

  if (QUICK_DOC_TYPES.includes(type)) {
    return (
      <PusulamDocPage
        type={type}
        sourceId={p.get("kaynak")}
        copyId={p.get("kopya")}
        contactId={contactId}
        initialLine={initialLine}
        initialNotes={initialNotes}
      />
    );
  }

  return (
    <DocumentEditor
      type={type}
      sourceId={p.get("kaynak")}
      copyId={p.get("kopya")}
      contactId={contactId}
      initialLine={initialLine}
      initialNotes={initialNotes}
    />
  );
}

export function DocEditPage({ type }: { type: DocType }) {
  const id = useSearchParams().get("id");
  if (!id) return null;
  return QUICK_DOC_TYPES.includes(type) ? <PusulamDocPage type={type} editId={id} /> : <DocumentEditor type={type} editId={id} />;
}

export function DocDetailPage({ type }: { type: DocType }) {
  const id = useSearchParams().get("id");
  return id ? <DocumentView type={type} id={id} /> : null;
}
