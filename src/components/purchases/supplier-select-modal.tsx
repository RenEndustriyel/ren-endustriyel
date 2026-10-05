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

// Foto 1'deki birebir tedarikçiler ve gerçekçi başlangıç listesi
const DEFAULT_SUPPLIERS: SupplierItem[] = [
  {
    id: "sup-akin",
    name: "AKIN AMBALAJ-BALIKESİR",
    phone: null,
    tax_office: null,
  },
  {
    id: "sup-aykim",
    name: "AYKİM TEMİZLİK MADDELERİ SANAYİ VE Tİ...",
    phone: "0(212) 475 0834",
    tax_number: "1111111111",
  },
  {
    id: "sup-fcs",
    name: "FCS TEDARİK SANAYİ VE TİCARET LİMİTED ...",
    phone: null,
    tax_office: "ŞİRİNYER VERGİ DAİRESİ MÜD.",
  },
  {
    id: "sup-nihat",
    name: "NİHAT SAĞLIK-HAYAL DÜNYAM",
    phone: null,
    tax_office: null,
  },
  {
    id: "sup-oguzhan",
    name: "OĞUZHAN OSMANAĞAOĞLU (ALKALİ KİMY...",
    phone: null,
    tax_office: null,
  },
  {
    id: "sup-onur",
    name: "ONUR KARAKAYALI-ONKAYALI",
    phone: null,
    tax_office: null,
  },
  {
    id: "sup-ozcan",
    name: "ÖZCAN ŞEN - AKDENİZ AMBALAJ",
    phone: null,
    tax_office: null,
  },
  {
    id: "sup-reha",
    name: "REHA SÖZERİ-AMBALAJ",
    phone: null,
    tax_office: null,
  },
  {
    id: "sup-seypa",
    name: "SEYPA GIDA VE İHT.MAD.ÜRETİM.DAĞ.VE TİC.A.Ş.",
    phone: null,
    tax_office: null,
  },
];

interface SupplierSelectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (supplier: SupplierItem | null) => void;
}

/** Pusulam "Tedarikçi seç" penceresi (ortak cari seçici) */
export function SupplierSelectModal({ open, onOpenChange, onSelect }: SupplierSelectModalProps) {
  return <ContactSelectModal kind="supplier" open={open} onOpenChange={onOpenChange} onSelect={onSelect} presets={DEFAULT_SUPPLIERS} />;
}
