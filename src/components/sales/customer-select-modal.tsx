"use client";

import { ContactSelectModal } from "@/components/documents/contact-select-modal";

export interface CustomerItem {
  id: string;
  name: string;
  phone?: string | null;
  tax_number?: string | null;
  tax_office?: string | null;
  city?: string | null;
}


interface CustomerSelectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (customer: CustomerItem | null) => void;
}

/** Pusulam "Müşteri seç" penceresi (ortak cari seçici) */
export function CustomerSelectModal({ open, onOpenChange, onSelect }: CustomerSelectModalProps) {
  return <ContactSelectModal kind="customer" open={open} onOpenChange={onOpenChange} onSelect={onSelect} />;
}
