"use client";

import { useSearchParams } from "next/navigation";
import type { DocType } from "@/lib/doc-types";
import { DocumentEditor } from "./document-editor";
import { DocumentView } from "./document-view";

export function DocNewPage({ type }: { type: DocType }) {
  const p = useSearchParams();
  return <DocumentEditor type={type} sourceId={p.get("kaynak")} copyId={p.get("kopya")} contactId={p.get("cari")} />;
}

export function DocEditPage({ type }: { type: DocType }) {
  const id = useSearchParams().get("id");
  return id ? <DocumentEditor type={type} editId={id} /> : null;
}

export function DocDetailPage({ type }: { type: DocType }) {
  const id = useSearchParams().get("id");
  return id ? <DocumentView type={type} id={id} /> : null;
}
