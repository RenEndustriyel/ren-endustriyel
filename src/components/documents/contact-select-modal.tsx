"use client";

import * as React from "react";
import { Search, UserPlus, X } from "lucide-react";
import { Dialog as D } from "radix-ui";
import { toast } from "sonner";
import { useContacts, useSave } from "@/lib/data";
import { fold } from "@/lib/search";

export interface ContactItem {
  id: string;
  name: string;
  phone?: string | null;
  tax_number?: string | null;
  tax_office?: string | null;
  city?: string | null;
}

/** Veritabanında henüz olmayan hazır liste kaydı mı (ör. "sup-akin", "cus-karesi") */
export const isPresetContact = (c: ContactItem | null | undefined) => !!c && /^(sup|cus)-/.test(c.id);

const normalize = (s: string) => fold(s).trim();
/** Mükerrer kontrolü için: büyük/küçük harf, boşluk ve noktalama farkı yok sayılır */
export const contactKey = (s: string) => s.toLocaleUpperCase("tr-TR").replace(/[^A-ZÇĞİÖŞÜ0-9]/g, "");

interface Props {
  kind: "supplier" | "customer";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (contact: ContactItem | null) => void;
  /** Veritabanında bulunmayan, listede gösterilecek hazır cariler */
  presets?: ContactItem[];
}

/** Pusulam "Tedarikçi seç / Müşteri seç" penceresi */
export function ContactSelectModal({ kind, open, onOpenChange, onSelect, presets = [] }: Props) {
  const [q, setQ] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const contactsQuery = useContacts();
  const saveContact = useSave("contacts");
  const isSupplier = kind === "supplier";
  const label = isSupplier ? "Tedarikçi" : "Müşteri";

  const list = React.useMemo(() => {
    // Tüm cariler: önce bu türdekiler, sonra diğer türde kayıtlı olanlar (etiketli) — aynı firma ikinci kez açılmasın
    const db: (ContactItem & { other?: boolean })[] = (contactsQuery.data ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      tax_number: c.tax_number,
      tax_office: c.tax_office,
      city: c.city,
      other: !(c.kind === kind || c.kind === "both"),
    }));
    const combined = [...db];
    for (const p of presets) {
      if (!combined.some((c) => normalize(c.name) === normalize(p.name))) combined.push(p);
    }
    combined.sort((a, b) => Number(!!(a as { other?: boolean }).other) - Number(!!(b as { other?: boolean }).other) || a.name.localeCompare(b.name, "tr"));

    const query = normalize(q);
    if (!query) return combined;
    return combined.filter(
      (c) =>
        normalize(c.name).includes(query) ||
        (c.phone ?? "").includes(query) ||
        (c.tax_number ?? "").includes(query) ||
        normalize(c.tax_office ?? "").includes(query),
    );
  }, [contactsQuery.data, presets, kind, q]);

  const typed = q.trim();
  const exact = typed ? (contactsQuery.data ?? []).find((c) => contactKey(c.name) === contactKey(typed)) : undefined;

  /** Yazılan isimle cari yoksa kartı oluşturup belgeye devam et (aynı isim varsa onu seçer) */
  const createAndContinue = async () => {
    if (!typed || creating) return;
    if (exact) {
      // aynı isimde kayıt var: yenisini açma, onu seç (türü farklıysa da)
      return choose({ id: exact.id, name: exact.name, phone: exact.phone, tax_number: exact.tax_number, tax_office: exact.tax_office, city: exact.city });
    }
    setCreating(true);
    try {
      const res = await saveContact.save<{ id: string }>({ name: typed, kind, is_active: true });
      if (!res.queued) toast.success(`${typed} ${label.toLocaleLowerCase("tr-TR")} olarak kaydedildi`);
      setCreating(false);
      setQ("");
      onSelect({ id: res.data!.id, name: typed });
      onOpenChange(false);
    } catch {
      setCreating(false); // hata mesajı useSave tarafından gösterildi
    }
  };

  const choose = async (c: ContactItem | null) => {
    if (c && isPresetContact(c)) {
      // Hazır listeden seçilen cari veritabanında yok: belge cariye bağlansın diye kaydı oluştur
      setCreating(true);
      try {
        const res = await saveContact.save<{ id: string }>({
          name: c.name,
          kind,
          phone: c.phone ?? null,
          tax_number: c.tax_number ?? null,
          tax_office: c.tax_office ?? null,
          city: c.city ?? null,
        });
        toast.success(`${c.name} ${label.toLocaleLowerCase("tr-TR")} kartı oluşturuldu`);
        c = { ...c, id: res.data!.id };
      } catch {
        setCreating(false);
        return; // hata mesajı useSave tarafından gösterildi
      }
      setCreating(false);
    }
    setQ("");
    onSelect(c);
    onOpenChange(false);
  };

  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <D.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl focus:outline-none flex flex-col max-h-[90dvh]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
            <D.Title className="text-lg font-bold">{label} seç</D.Title>
            <D.Close className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition" aria-label="Kapat">
              <X size={18} />
            </D.Close>
          </div>

          <div className="px-5 pt-4 pb-3 space-y-3 min-h-0 flex flex-col">
            <D.Description className="text-sm text-slate-500 dark:text-slate-400">
              Listeden {label.toLocaleLowerCase("tr-TR")} seçin; {isSupplier ? "alış" : "satış"} belgesi seçili cari ile açılır.
            </D.Description>
            <div className="relative">
              <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-10"
                placeholder={`${label.toLocaleLowerCase("tr-TR")} adı, telefon veya vergi no...`}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  if (exact) createAndContinue();
                  else if (list.length === 1) choose(list[0]);
                  else if (list.length === 0) createAndContinue();
                }}
                autoFocus
              />
            </div>

            {typed && !exact && (
              <button
                type="button"
                disabled={creating}
                onClick={createAndContinue}
                className="w-full flex items-center gap-3 rounded-xl border border-dashed border-brand-400 dark:border-brand-600 bg-brand-50/60 dark:bg-brand-900/20 px-4 py-3 text-left hover:bg-brand-50 dark:hover:bg-brand-900/40 disabled:opacity-60"
              >
                <UserPlus size={18} className="text-brand-600 dark:text-brand-400 shrink-0" />
                <span className="min-w-0 flex-1 text-sm">
                  <b className="text-brand-700 dark:text-brand-300">“{typed}”</b> — yeni {label.toLocaleLowerCase("tr-TR")} olarak kaydet ve devam et
                  {list.length === 0 && <span className="block text-xs text-slate-600 dark:text-slate-300">Enter&apos;a basmanız yeterli</span>}
                </span>
              </button>
            )}

            <div className="min-h-0 max-h-[360px] overflow-y-auto thin-scroll rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
              {list.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-600 dark:text-slate-300">Kayıtlı {label.toLocaleLowerCase("tr-TR")} bulunamadı — yukarıdan yeni kayıt açabilirsiniz.</div>
              ) : (
                list.map((c) => {
                  const otherKind = (c as { other?: boolean }).other;
                  const base = c.phone ? `${c.phone}${c.tax_number ? ` · ${c.tax_number}` : ""}` : c.tax_office || "İletişim yok";
                  const subtitle = otherKind ? `${isSupplier ? "Müşteri" : "Tedarikçi"} olarak kayıtlı · ${base}` : base;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      disabled={creating}
                      onClick={() => choose(c)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition group disabled:opacity-60"
                    >
                      <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold flex items-center justify-center shrink-0">
                        {(c.name.trim()[0] || "?").toLocaleUpperCase("tr-TR")}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-sm truncate">{c.name}</div>
                        <div className="text-xs text-slate-400 truncate">{subtitle}</div>
                      </div>
                      <span className="text-xs font-semibold text-brand-600 dark:text-brand-400 shrink-0 group-hover:translate-x-0.5 transition-transform">
                        Seç →
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-200 dark:border-slate-800">
            <D.Close className="btn-ghost">Vazgeç</D.Close>
            <button type="button" className="btn-ghost" disabled={creating} onClick={() => choose(null)}>
              {label}siz devam
            </button>
          </div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
