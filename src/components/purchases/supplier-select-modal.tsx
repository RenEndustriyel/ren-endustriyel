"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useContacts } from "@/lib/data";

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

export function SupplierSelectModal({
  open,
  onOpenChange,
  onSelect,
}: SupplierSelectModalProps) {
  const [q, setQ] = React.useState("");
  const contactsQuery = useContacts();

  // Veritabanındaki carilerle varsayılan listeyi birleştir
  const suppliers = React.useMemo(() => {
    const dbSuppliers = (contactsQuery.data ?? [])
      .filter((c) => c.kind === "supplier" || c.kind === "both")
      .map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        tax_number: c.tax_number,
        tax_office: c.tax_office,
        city: c.city,
      }));

    const combined: SupplierItem[] = [...dbSuppliers];
    for (const def of DEFAULT_SUPPLIERS) {
      if (!combined.some((s) => s.name.toLowerCase() === def.name.toLowerCase())) {
        combined.push(def);
      }
    }

    if (!q.trim()) return combined;
    const query = q.toLowerCase();
    return combined.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        (s.phone && s.phone.includes(query)) ||
        (s.tax_number && s.tax_number.includes(query)) ||
        (s.tax_office && s.tax_office.toLowerCase().includes(query))
    );
  }, [contactsQuery.data, q]);

  const handleChoose = (s: SupplierItem | null) => {
    onSelect(s);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Tedarikçi seç"
        description="Listeden tedarikçi seçin; alış belgesi seçili cari ile açılır."
        className="max-w-lg bg-[#101e26] border border-[#182c37] text-slate-100 p-5 sm:p-6 rounded-2xl shadow-2xl"
      >
        {/* Arama Alanı (Foto 1 Birebir) */}
        <div className="relative mb-3">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            className="w-full rounded-xl bg-[#14232c] border border-[#1e3544] pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-500 outline-none focus:border-[#00b49c] transition-colors"
            placeholder="tedarikçi adı, telefon veya vergi no..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
          />
        </div>

        {/* Tedarikçi Listesi (Foto 1 Birebir) */}
        <div className="max-h-[350px] overflow-y-auto space-y-1 pr-1 thin-scroll">
          {suppliers.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              Aramanıza uygun tedarikçi bulunamadı.
            </div>
          ) : (
            suppliers.map((s) => {
              const initial = (s.name.trim()[0] || "T").toLocaleUpperCase("tr-TR");
              const subtitle = s.phone
                ? `${s.phone}${s.tax_number ? ` · ${s.tax_number}` : ""}`
                : s.tax_office
                  ? s.tax_office
                  : "İletişim yok";

              return (
                <div
                  key={s.id}
                  onClick={() => handleChoose(s)}
                  className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl hover:bg-[#152733] cursor-pointer transition border border-transparent hover:border-[#1e3849] group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-full bg-[#1c2c37] border border-[#243d4d] text-slate-300 font-bold flex items-center justify-center text-sm shrink-0">
                      {initial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-white text-xs sm:text-sm truncate uppercase tracking-tight">
                        {s.name}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                        {subtitle}
                      </div>
                    </div>
                  </div>

                  <div className="text-xs font-semibold text-[#00b49c] shrink-0 flex items-center gap-1 group-hover:translate-x-1 transition-transform pl-3">
                    <span>Seç</span>
                    <span>→</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Alt Butonları (Foto 1 Birebir) */}
        <div className="flex items-center justify-between pt-4 mt-3 border-t border-[#182c37]">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#14232c] hover:bg-[#192d39] text-slate-300 border border-[#1e3544] transition active:scale-95"
          >
            Vazgeç
          </button>

          <button
            type="button"
            onClick={() => handleChoose(null)}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#14232c] hover:bg-[#192d39] text-slate-200 border border-[#1e3544] transition active:scale-95"
          >
            Tedarikçisiz devam
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
