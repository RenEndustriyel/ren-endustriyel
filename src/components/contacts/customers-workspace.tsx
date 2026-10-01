"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  UserRound,
  Phone,
  Trash2,
  ChevronRight,
  ChevronDown,
  Download,
  FileSpreadsheet,
  Search,
  Plus,
  CircleHelp,
  X,
} from "lucide-react";
import { useContacts, useContactBalances, useUpdate, type Row } from "@/lib/data";
import { formatMoney } from "@/lib/format";
import { exportExcel } from "@/lib/excel";
import { toast } from "sonner";
import { ContactImport } from "./contact-import";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ContactForm } from "./contact-form";

export function CustomersWorkspace({ kind = "customer" }: { kind?: "customer" | "supplier" }) {
  const router = useRouter();
  const contactsQuery = useContacts();
  const balancesQuery = useContactBalances();
  const updateContact = useUpdate("contacts");

  const [q, setQ] = React.useState("");
  const [limit, setLimit] = React.useState(50);
  const [helpOpen, setHelpOpen] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);
  const [newModalOpen, setNewModalOpen] = React.useState(false);

  const isCustomer = kind === "customer";
  const title = isCustomer ? "Müşteriler" : "Tedarikçiler";

  const rows = React.useMemo(() => {
    const balMap = new Map((balancesQuery.data ?? []).map((b) => [b.contact_id, Number(b.balance)]));
    return (contactsQuery.data ?? [])
      .filter((c) => c.kind === kind || c.kind === "both")
      .map((c) => ({
        ...c,
        balance: balMap.get(c.id) ?? Number(c.opening_balance ?? 0),
      }));
  }, [contactsQuery.data, balancesQuery.data, kind]);

  const filtered = rows.filter((c) => {
    const searchTarget = `${c.name} ${c.code ?? ""} ${c.tax_number ?? ""} ${c.phone ?? ""} ${c.mobile ?? ""}`.toLowerCase();
    return searchTarget.includes(q.toLowerCase());
  });

  const displayed = filtered.slice(0, limit);
  const totalCount = filtered.length;

  const handleDelete = async (e: React.MouseEvent, c: typeof rows[0]) => {
    e.stopPropagation();
    if (!confirm(`"${c.name}" kaydını silmek istediğinize emin misiniz?`)) return;
    try {
      await updateContact.remove(c.id, `${title.slice(0, -3)} silindi`);
      toast.success(`${title.slice(0, -3)} silindi`);
    } catch (err: any) {
      toast.error(err.message || "Silinemedi");
    }
  };

  const handleExportExcel = () => {
    exportExcel(isCustomer ? "musteriler" : "tedarikciler", [
      {
        name: title,
        rows: filtered,
        columns: [
          { header: "Unvan", value: (c) => c.name, width: 36 },
          { header: "Kod", value: (c) => c.code },
          { header: "VKN/TCKN", value: (c) => c.tax_number },
          { header: "Telefon", value: (c) => c.phone },
          { header: "Cep", value: (c) => c.mobile },
          { header: "E-posta", value: (c) => c.email },
          { header: "İlçe", value: (c) => c.district },
          { header: "İl", value: (c) => c.city },
          { header: "Bakiye", value: (c) => c.balance, type: "money" },
        ],
      },
    ]);
  };

  return (
    <div className="flex-1">
      <div>
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 lg:gap-4 mb-5">
          <div className="min-w-0 lg:min-w-[12rem] lg:shrink-0 lg:max-w-[45%]">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{title}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {rows.length} {isCustomer ? "müşteri" : "tedarikçi"} kayıtlı
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 min-w-0 lg:justify-end">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-ghost"
                onClick={handleExportExcel}
              >
                <Download className="h-4 w-4" /> Excel'e Aktar
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setImportOpen(true)}
              >
                <FileSpreadsheet className="h-4 w-4" /> Excel'den Yükle
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setNewModalOpen(true)}
              >
                + Yeni {isCustomer ? "Müşteri" : "Tedarikçi"}
              </button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-4 max-w-md">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              className="input pl-10"
              placeholder={`${isCustomer ? "müşteri" : "tedarikçi"} arama`}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        {/* Customer Cards Grid */}
        <div>
          {displayed.length === 0 ? (
            <div className="card p-8 text-center text-slate-400">
              <UserRound className="mx-auto h-8 w-8 mb-2 opacity-50" />
              {q ? "Arama kriterine uygun kayıt bulunamadı." : `Henüz kayıtlı ${isCustomer ? "müşteri" : "tedarikçi"} yok.`}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {displayed.map((c) => {
                const phone = c.mobile || c.phone;
                const bal = c.balance;
                const isEmerald = bal > 0.01;
                const isRose = bal < -0.01;

                return (
                  <div
                    key={c.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(`/cariler/detay?id=${c.id}`)}
                    className="cursor-pointer text-left focus:outline-none"
                  >
                    <div className="card p-4 hover:shadow-soft transition">
                      <div className="flex items-start gap-3">
                        <div className="h-11 w-11 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0 overflow-hidden">
                          <UserRound className="h-[22px] w-[22px]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold leading-snug line-clamp-2 flex flex-wrap items-center gap-1.5">
                            {c.name}
                          </div>
                          {phone && (
                            <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                              <Phone className="h-[11px] w-[11px]" /> {phone}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          className="text-slate-300 hover:text-rose-500 p-1 transition"
                          title="Sil"
                          onClick={(e) => handleDelete(e, c)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <div>
                          <div className="text-[11px] text-slate-400">Bakiye</div>
                          <div
                            className={`font-bold tabular-nums ${
                              isEmerald
                                ? "text-emerald-500"
                                : isRose
                                ? "text-slate-400"
                                : "text-slate-400"
                            }`}
                          >
                            {formatMoney(bal)}
                          </div>
                        </div>
                        <span className="text-slate-900 dark:text-white text-sm font-semibold flex items-center gap-1">
                          detay <ChevronRight className="h-4 w-4" />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Load More Pagination */}
          {totalCount > limit && (
            <div className="flex flex-col items-center gap-1.5 py-3">
              <span className="text-xs text-slate-400">
                {limit} / {totalCount} kayıt gösteriliyor
              </span>
              <button
                type="button"
                className="btn-ghost !py-1.5 text-sm inline-flex items-center gap-1.5"
                onClick={() => setLimit((prev) => prev + 50)}
              >
                <ChevronDown className="h-[15px] w-[15px]" />
                Daha fazla göster (+{Math.min(50, totalCount - limit)})
              </button>
            </div>
          )}
        </div>

        {/* Mobile FAB */}
        <button
          type="button"
          onClick={() => setNewModalOpen(true)}
          className="lg:hidden fixed z-30 h-14 w-14 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg hover:opacity-90 flex items-center justify-center transition active:scale-95 right-4 sm:right-5 lg:right-6 bottom-[calc(7.5rem+env(safe-area-inset-bottom,0px))] lg:bottom-[4.5rem]"
          title="Ekle"
          aria-label="Ekle"
        >
          <Plus className="h-6 w-6 stroke-[2.5]" />
        </button>
      </div>

      {/* Floating Help Popover */}
      <div className="pointer-events-none fixed z-[80] right-4 sm:right-5 lg:right-6 bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] lg:bottom-6">
        <div className="pointer-events-auto relative flex flex-col items-end gap-2">
          {helpOpen && (
            <div
              role="dialog"
              aria-modal="false"
              className="w-[min(22rem,calc(100vw-1.5rem))] origin-bottom-right rounded-2xl border border-slate-200/90 dark:border-slate-700/90 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md transition-all duration-200 ease-out shadow-xl absolute bottom-12 right-0 p-0"
            >
              <div className="flex items-start justify-between gap-2 px-4 pt-3.5 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                    {title}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Bu sayfa hakkında · Esc</div>
                </div>
                <button
                  type="button"
                  onClick={() => setHelpOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
                  aria-label="Kapat"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="px-4 py-3 max-h-[min(60vh,28rem)] overflow-y-auto text-[13px] leading-relaxed">
                <p className="text-slate-600 dark:text-slate-300 mb-3">
                  Cari {isCustomer ? "müşteri" : "tedarikçi"} kartları. Bakiye, iletişim ve hareket geçmişi buradan yönetilir.
                </p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">
                  Özellikler
                </p>
                <ul className="space-y-1.5 mb-3">
                  <li className="flex gap-2 text-slate-600 dark:text-slate-300">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0"></span>
                    <span>{isCustomer ? "Müşteri" : "Tedarikçi"} ekleme / düzenleme / silme</span>
                  </li>
                  <li className="flex gap-2 text-slate-600 dark:text-slate-300">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0"></span>
                    <span>Bakiye ve borç-alacak takibi</span>
                  </li>
                  <li className="flex gap-2 text-slate-600 dark:text-slate-300">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0"></span>
                    <span>Excel içe / dışa aktarma</span>
                  </li>
                  <li className="flex gap-2 text-slate-600 dark:text-slate-300">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0"></span>
                    <span>Detay sayfasında ekstre ve hareket dökümü</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
          <button
            type="button"
            title={`${title} yardımı`}
            onClick={() => setHelpOpen(!helpOpen)}
            className="h-9 w-9 rounded-full flex items-center justify-center border transition bg-white/70 dark:bg-slate-900/70 border-slate-200/60 dark:border-slate-700/60 text-slate-400/70 hover:text-slate-500 hover:border-slate-300 dark:hover:text-slate-300 shadow-sm"
          >
            <CircleHelp className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>

      {/* New Contact Dialog */}
      <Dialog open={newModalOpen} onOpenChange={setNewModalOpen}>
        <DialogContent
          title={`Yeni ${isCustomer ? "Müşteri" : "Tedarikçi"}`}
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
        >
          <ContactForm
            defaultKind={kind}
            onSaved={() => setNewModalOpen(false)}
            onCancel={() => setNewModalOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Excel Import Dialog */}
      <ContactImport
        kind={kind}
        open={importOpen}
        onOpenChange={setImportOpen}
      />
    </div>
  );
}
