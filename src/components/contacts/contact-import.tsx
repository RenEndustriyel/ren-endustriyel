"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useOrg } from "@/providers/org-provider";
import { ImportDialog, type ImportField } from "@/components/shared/import-dialog";
import { toNumber } from "@/lib/excel";

const FIELDS: ImportField[] = [
  { key: "name", label: "Unvan", required: true, aliases: ["ad", "firma", "cari", "müşteri", "tedarikçi", "ad soyad", "cari adı", "müşteri adı"], example: "Örnek Ltd. Şti." },
  { key: "code", label: "Cari kodu", aliases: ["kod"] },
  { key: "tax_number", label: "VKN/TCKN", aliases: ["vergi no", "vergi numarası", "vkn", "tckn", "tc kimlik"], example: "1234567890" },
  { key: "tax_office", label: "Vergi dairesi", aliases: ["vd"] },
  { key: "phone", label: "Telefon", aliases: ["tel"] },
  { key: "mobile", label: "Cep", aliases: ["gsm", "cep telefonu"] },
  { key: "email", label: "E-posta", aliases: ["email", "mail"] },
  { key: "address", label: "Adres" },
  { key: "district", label: "İlçe" },
  { key: "city", label: "İl", aliases: ["şehir"] },
  { key: "contact_person", label: "Yetkili" },
  { key: "iban", label: "IBAN" },
  { key: "balance", label: "Açılış bakiyesi", aliases: ["bakiye", "borç", "alacak"], example: 1500 },
];

export function ContactImport({ open, onOpenChange, kind }: { open: boolean; onOpenChange: (o: boolean) => void; kind: "customer" | "supplier" }) {
  const { org } = useOrg();
  const qc = useQueryClient();
  return (
    <ImportDialog
      open={open}
      onOpenChange={onOpenChange}
      title={kind === "customer" ? "Müşterileri içe aktar" : "Tedarikçileri içe aktar"}
      templateName={kind === "customer" ? "musteri-sablonu" : "tedarikci-sablonu"}
      fields={FIELDS}
      onImport={async (rows) => {
        const s = (v: unknown) => (v === undefined || v === null || String(v).trim() === "" ? null : String(v).trim());
        const payload = rows.map((r) => ({
          org_id: org!.id,
          kind,
          name: String(r.name).trim(),
          code: s(r.code),
          tax_number: s(r.tax_number)?.replace(/\D/g, "") || null,
          tax_office: s(r.tax_office),
          phone: s(r.phone),
          mobile: s(r.mobile),
          email: s(r.email),
          address: s(r.address),
          district: s(r.district),
          city: s(r.city),
          contact_person: s(r.contact_person),
          iban: s(r.iban)?.replace(/\s/g, "") || null,
          // tedarikçi bakiyesi pozitif yazılırsa "biz borçluyuz" kabul edilir
          opening_balance: kind === "supplier" ? -Math.abs(toNumber(r.balance)) : toNumber(r.balance),
        }));
        for (let i = 0; i < payload.length; i += 500) {
          const { error } = await supabase.from("contacts").insert(payload.slice(i, i + 500));
          if (error) throw error;
        }
        qc.invalidateQueries();
        return payload.length;
      }}
    />
  );
}
