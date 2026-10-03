"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useContacts } from "@/lib/data";

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

export function CustomerSelectModal({
  open,
  onOpenChange,
  onSelect,
}: CustomerSelectModalProps) {
  const [q, setQ] = React.useState("");
  const contactsQuery = useContacts();

  // Veritabanındaki carilerle varsayılan müşteri listesini birleştir
  const customers = React.useMemo(() => {
    const dbCustomers = (contactsQuery.data ?? [])
      .filter((c) => c.kind === "customer" || c.kind === "both")
      .map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        tax_number: c.tax_number,
        tax_office: c.tax_office,
        city: c.city,
      }));

    const combined: CustomerItem[] = [...dbCustomers];
    for (const def of DEFAULT_CUSTOMERS) {
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

  const handleChoose = (c: CustomerItem | null) => {
    onSelect(c);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Müşteri seç"
        description="Listeden müşteri seçin; satış belgesi seçili cari ile açılır."
        className="max-w-lg bg-[#101e26] border border-[#182c37] text-slate-100 p-5 sm:p-6 rounded-2xl shadow-2xl"
      >
        {/* Arama Alanı (Pusulam Birebir) */}
        <div className="relative mb-3">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            className="w-full rounded-xl bg-[#14232c] border border-[#1e3544] pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-500 outline-none focus:border-[#00b49c] transition-colors"
            placeholder="müşteri adı, telefon veya vergi no..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
          />
        </div>

        {/* Müşteri Listesi (Pusulam Birebir) */}
        <div className="max-h-[350px] overflow-y-auto space-y-1 pr-1 thin-scroll">
          {customers.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              Aramanıza uygun müşteri bulunamadı.
            </div>
          ) : (
            customers.map((c) => {
              const initial = (c.name.trim()[0] || "M").toLocaleUpperCase("tr-TR");
              const subtitle = c.phone
                ? `${c.phone}${c.tax_number ? ` · ${c.tax_number}` : ""}`
                : c.tax_office
                  ? c.tax_office
                  : c.city
                    ? c.city
                    : "İletişim yok";

              return (
                <div
                  key={c.id}
                  onClick={() => handleChoose(c)}
                  className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl hover:bg-[#152733] cursor-pointer transition border border-transparent hover:border-[#1e3849] group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-full bg-[#1c2c37] border border-[#243d4d] text-slate-300 font-bold flex items-center justify-center text-sm shrink-0">
                      {initial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-white text-xs sm:text-sm truncate uppercase tracking-tight">
                        {c.name}
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

        {/* Modal Alt Butonları (Pusulam Birebir) */}
        <div className="flex items-center justify-between pt-4 mt-3 border-t border-[#182c37]">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#14232c] hover:bg-[#192d39] text-slate-300 border border-[#1e3544] transition active:scale-95 cursor-pointer"
          >
            Vazgeç
          </button>

          <button
            type="button"
            onClick={() => handleChoose(null)}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#14232c] hover:bg-[#192d39] text-slate-200 border border-[#1e3544] transition active:scale-95 cursor-pointer"
          >
            Müşterisiz devam
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
