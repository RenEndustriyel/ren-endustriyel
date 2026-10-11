"use client";

import { QuickDocModal, type QuickDocKind } from "@/components/documents/quick-doc-modal";
import type { DocType } from "@/lib/doc-types";
import type { SupplierItem } from "./supplier-select-modal";

interface PurchaseInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: SupplierItem | null;
  /** Eski arayüz uyumluluğu; tedarikçi artık pencere içindeki listeden değiştirilir */
  onChangeSupplierRequest?: () => void;
  onSaved?: (doc: { id: string; doc_type: DocType }) => void;
  initialDocType?: QuickDocKind;
}

/** Pusulam "Yeni Alış Belgesi" penceresi */
export function PurchaseInvoiceModal({ open, onOpenChange, supplier, onSaved, initialDocType = "Fatura" }: PurchaseInvoiceModalProps) {
  return (
    <QuickDocModal
      side="purchase"
      open={open}
      onOpenChange={onOpenChange}
      contact={supplier}
      initialKind={initialDocType}
      onSaved={onSaved}
    />
  );
}
