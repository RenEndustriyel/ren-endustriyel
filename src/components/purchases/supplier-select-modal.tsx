"use client";

import { ContactSelectModal } from "@/components/documents/contact-select-modal";

export interface SupplierItem {
  id: string;
  name: string;
  phone?: string | null;
  tax_number?: string | null;
  tax_office?: string | null;
  city?: string | null;
}


interface SupplierSelectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (supplier: SupplierItem | null) => void;
}

/** Pusulam "Tedarikçi seç" penceresi (ortak cari seçici) */
export function SupplierSelectModal({ open, onOpenChange, onSelect }: SupplierSelectModalProps) {
  return <ContactSelectModal kind="supplier" open={open} onOpenChange={onOpenChange} onSelect={onSelect} />;
}
