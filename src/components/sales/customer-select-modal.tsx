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

// Pusulam ve gerçekçi müşteri başlangıç listesi
const DEFAULT_CUSTOMERS: CustomerItem[] = [
  {
    id: "cus-bld-bkr",
    name: "BALIKESİR BÜYÜKŞEHİR BELEDİYESİ",
    phone: "0(266) 245 1000",
    tax_office: "BALIKESİR V.D.",
    tax_number: "1350024410",
    city: "Balıkesir",
  },
  {
    id: "cus-karesi",
    name: "KARESİ BELEDİYESİ",
    phone: "0(266) 243 2020",
    tax_office: "KARESİ V.D.",
    tax_number: "5240581290",
    city: "Balıkesir",
  },
  {
    id: "cus-alti",
    name: "ALTIEYLÜL BELEDİYESİ",
    phone: "0(266) 244 4440",
    tax_office: "ALTIEYLÜL V.D.",
    tax_number: "0620612450",
    city: "Balıkesir",
  },
  {
    id: "cus-gonen",
    name: "GÖNEN BELEDİYESİ",
    phone: "0(266) 762 1845",
    tax_office: "GÖNEN V.D.",
    tax_number: "4080031120",
    city: "Balıkesir",
  },
  {
    id: "cus-burhaniye",
    name: "BURHANİYE BELEDİYESİ",
    phone: "0(266) 412 6450",
    tax_office: "BURHANİYE V.D.",
    tax_number: "1910041280",
    city: "Balıkesir",
  },
  {
    id: "cus-edremit",
    name: "EDREMİT BELEDİYESİ",
    phone: "0(266) 374 4444",
    tax_office: "EDREMİT V.D.",
    tax_number: "3240032910",
    city: "Balıkesir",
  },
  {
    id: "cus-ayvalik",
    name: "AYVALIK BELEDİYESİ",
    phone: "0(266) 312 1021",
    tax_office: "AYVALIK V.D.",
    tax_number: "1230048190",
    city: "Balıkesir",
  },
  {
    id: "cus-bandirma",
    name: "BANDIRMA BELEDİYESİ",
    phone: "0(266) 711 1111",
    tax_office: "BANDIRMA V.D.",
    tax_number: "1420038102",
    city: "Balıkesir",
  },
  {
    id: "cus-susurluk",
    name: "SUSURLUK BELEDİYESİ",
    phone: "0(266) 865 1018",
    tax_office: "SUSURLUK V.D.",
    tax_number: "7840019230",
    city: "Balıkesir",
  },
  {
    id: "cus-erdek",
    name: "ERDEK BELEDİYESİ",
    phone: "0(266) 835 1045",
    tax_office: "ERDEK V.D.",
    tax_number: "3380029140",
    city: "Balıkesir",
  },
  {
    id: "cus-dursunbey",
    name: "DURSUNBEY BELEDİYESİ",
    phone: "0(266) 662 1007",
    tax_office: "DURSUNBEY V.D.",
    tax_number: "3150018290",
    city: "Balıkesir",
  },
];

interface CustomerSelectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (customer: CustomerItem | null) => void;
}

/** Pusulam "Müşteri seç" penceresi (ortak cari seçici) */
export function CustomerSelectModal({ open, onOpenChange, onSelect }: CustomerSelectModalProps) {
  return <ContactSelectModal kind="customer" open={open} onOpenChange={onOpenChange} onSelect={onSelect} presets={DEFAULT_CUSTOMERS} />;
}
