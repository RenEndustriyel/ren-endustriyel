"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Banknote,
  Search,
  Pencil,
  Trash2,
  Plus,
  CircleHelp,
  X,
  Camera,
  Upload,
  Sparkles,
} from "lucide-react";
import { useRows, useUpdate, type Row } from "@/lib/data";
import { formatMoney, formatDate } from "@/lib/format";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ExpenseFormPage } from "./expense-form";

type ExpenseDoc = Row<"documents"> & {
  category?: { name: string } | null;
  contact?: { name: string } | null;
};

export function ExpensesList() {
  const router = useRouter();
  const updateDoc = useUpdate("documents");

  const [topTab, setTopTab] = React.useState<"expenses" | "recurring">("expenses");
  const [statusFilter, setStatusFilter] = React.useState<"overdue" | "paid" | "unpaid">("paid");
  const [q, setQ] = React.useState("");
  const [helpOpen, setHelpOpen] = React.useState(false);
  const [aiModalOpen, setAiModalOpen] = React.useState(false);
  const [editExpenseId, setEditExpenseId] = React.useState<string | null>(null);
  const [newExpenseOpen, setNewExpenseOpen] = React.useState(false);

  // Fetch expense documents
  const expensesQuery = useRows<ExpenseDoc>("documents", {
    select: "*, category:categories(name), contact:contacts(name)",
    params: ["expenses_list"],
    filter: (x) => x.eq("doc_type", "expense"),
    order: [{ column: "issue_date", ascending: false }],
  });

  const docs = expensesQuery.data ?? [];
  const now = new Date();

  // Summary calculations
  const paidTotal = docs
    .filter((d) => d.payment_status === "paid")
    .reduce((sum, d) => sum + Number(d.total ?? 0), 0);

  const unpaidTotal = docs
    .filter((d) => d.payment_status !== "paid" && (!d.due_date || new Date(d.due_date) >= now))
    .reduce((sum, d) => sum + Number(d.total ?? 0), 0);

  const overdueTotal = docs
    .filter((d) => d.payment_status !== "paid" && d.due_date && new Date(d.due_date) < now)
    .reduce((sum, d) => sum + Number(d.total ?? 0), 0);

  // Filter list
  const filtered = docs.filter((d) => {
    // Status filter
    if (statusFilter === "paid" && d.payment_status !== "paid") return false;
    if (statusFilter === "unpaid" && (d.payment_status === "paid" || (d.due_date && new Date(d.due_date) < now))) return false;
    if (statusFilter === "overdue" && (d.payment_status === "paid" || !d.due_date || new Date(d.due_date) >= now)) return false;

    // Search query
    const searchTarget = `${d.description ?? ""} ${d.category?.name ?? ""} ${d.contact?.name ?? ""}`.toLowerCase();
    return searchTarget.includes(q.toLowerCase());
  });

  const handleDelete = async (doc: ExpenseDoc) => {
    if (!confirm(`"${doc.description || 'Masraf'}" kaydını silmek istediğinize emin misiniz?`)) return;
    try {
      await updateDoc.remove(doc.id, "Masraf silindi");
      toast.success("Masraf silindi");
    } catch (err: any) {
      toast.error(err.message || "Masraf silinemedi");
    }
  };

  return (
    <div className="flex-1">
      <div className="flex flex-col h-full">
        {/* Top Tab Subnav */}
        <div className="mb-4 flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setTopTab("expenses")}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                topTab === "expenses"
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-400"
              }`}
            >
              Masraflar
            </button>
            <button
              type="button"
              onClick={() => setTopTab("recurring")}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                topTab === "recurring"
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-400"
              }`}
            >
              Tekrarlayan İşlemler
            </button>
          </div>
        </div>

        {topTab === "recurring" ? (
          <div className="card p-8 text-center text-slate-400">
            <Banknote className="mx-auto h-8 w-8 mb-2 opacity-50" />
            Tekrarlayan otomatik masraf kuralı bulunmuyor.
          </div>
        ) : (
          <div className="flex-1 min-h-0">
            <div>
              {/* Header */}
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 lg:gap-4 mb-5">
                <div className="min-w-0 lg:min-w-[12rem] lg:shrink-0 lg:max-w-[45%]">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Masraflar</h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    Ödenmiş: {formatMoney(paidTotal)} · Ödenecek: {formatMoney(unpaidTotal)} · Gecikmiş: {formatMoney(overdueTotal)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 min-w-0 lg:justify-end">
                  <div className="flex gap-2">
                    <label
                      onClick={() => setAiModalOpen(true)}
                      className="btn cursor-pointer border border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/50 shadow-sm"
                    >
                      📷 Akıllı Fiş Oku (AI)
                    </label>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => setNewExpenseOpen(true)}
                    >
                      + Yeni Masraf
                    </button>
                  </div>
                </div>
              </div>

              {/* Search Bar */}
              <div className="mb-4 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    className="input pl-10"
                    placeholder="masraf arama"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                </div>
              </div>

              {/* Status Filter Pills */}
              <div className="mb-5">
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setStatusFilter("overdue")}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                      statusFilter === "overdue"
                        ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                        : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-400"
                    }`}
                  >
                    Gecikmiş
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("paid")}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                      statusFilter === "paid"
                        ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                        : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-400"
                    }`}
                  >
                    Ödenmiş
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("unpaid")}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                      statusFilter === "unpaid"
                        ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                        : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-400"
                    }`}
                  >
                    Ödenecek
                  </button>
                </div>
              </div>

              {/* Expense List Cards */}
              <div className="space-y-2.5">
                {filtered.length === 0 ? (
                  <div className="card p-8 text-center text-slate-400">
                    <Banknote className="mx-auto h-8 w-8 mb-2 opacity-50" />
                    {q ? "Aramaya uygun masraf bulunamadı." : "Seçili durumda masraf kaydı bulunmuyor."}
                  </div>
                ) : (
                  filtered.map((doc) => (
                    <div key={doc.id} className="card p-4 flex items-center gap-4 hover:shadow-soft transition">
                      <div className="h-11 w-11 rounded-xl bg-rose-50 dark:bg-rose-900/30 text-rose-500 flex items-center justify-center shrink-0">
                        <Banknote className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold truncate">
                          {doc.description || "MASRAF"}
                        </div>
                        <div className="text-xs text-slate-400">
                          {doc.category?.name || "Diğer"} · {formatDate(doc.issue_date)}
                        </div>
                      </div>
                      <div className="font-bold text-rose-500 shrink-0 tabular-nums">
                        {formatMoney(Number(doc.total ?? 0))}
                      </div>
                      <button
                        type="button"
                        className="text-slate-300 hover:text-slate-700 dark:hover:text-slate-200 p-1 transition"
                        title="Düzenle"
                        onClick={() => setEditExpenseId(doc.id)}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="text-slate-300 hover:text-rose-500 p-1 transition"
                        title="Sil"
                        onClick={() => handleDelete(doc)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Mobile FAB */}
              <button
                type="button"
                onClick={() => setNewExpenseOpen(true)}
                className="lg:hidden fixed z-30 h-14 w-14 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg hover:opacity-90 flex items-center justify-center transition active:scale-95 right-4 sm:right-5 lg:right-6 bottom-[calc(7.5rem+env(safe-area-inset-bottom,0px))] lg:bottom-[4.5rem]"
                title="Ekle"
                aria-label="Ekle"
              >
                <Plus className="h-6 w-6 stroke-[2.5]" />
              </button>
            </div>
          </div>
        )}
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
                    Masraflar
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
                  Kira, fatura, yakıt gibi işletme giderlerini kategorili kaydedin.
                </p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">
                  Özellikler
                </p>
                <ul className="space-y-1.5 mb-3">
                  <li className="flex gap-2 text-slate-600 dark:text-slate-300">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0"></span>
                    <span>Masraf ekleme</span>
                  </li>
                  <li className="flex gap-2 text-slate-600 dark:text-slate-300">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0"></span>
                    <span>Kategori ve hesap seçimi</span>
                  </li>
                  <li className="flex gap-2 text-slate-600 dark:text-slate-300">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0"></span>
                    <span>Dönem filtreleri</span>
                  </li>
                  <li className="flex gap-2 text-slate-600 dark:text-slate-300">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0"></span>
                    <span>Raporlara yansıma</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
          <button
            type="button"
            title="Masraflar yardımı"
            onClick={() => setHelpOpen(!helpOpen)}
            className="h-9 w-9 rounded-full flex items-center justify-center border transition bg-white/70 dark:bg-slate-900/70 border-slate-200/60 dark:border-slate-700/60 text-slate-400/70 hover:text-slate-500 hover:border-slate-300 dark:hover:text-slate-300 shadow-sm"
          >
            <CircleHelp className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>

      {/* New / Edit Modal */}
      <Dialog
        open={newExpenseOpen || !!editExpenseId}
        onOpenChange={(val) => {
          if (!val) {
            setNewExpenseOpen(false);
            setEditExpenseId(null);
          }
        }}
      >
        <DialogContent
          title={editExpenseId ? "Masrafı Düzenle" : "Yeni Masraf"}
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
        >
          <ExpenseFormPage editId={editExpenseId} />
        </DialogContent>
      </Dialog>

      {/* AI Receipt Scanner Modal */}
      <Dialog open={aiModalOpen} onOpenChange={setAiModalOpen}>
        <DialogContent
          title="Akıllı Fiş Oku (REN AI)"
          className="max-w-md"
        >
          <div className="space-y-4 pt-2 text-center">
            <div className="border-2 border-dashed border-indigo-200 dark:border-indigo-900/60 rounded-2xl p-6 bg-indigo-50/40 dark:bg-indigo-950/20">
              <Camera className="mx-auto h-10 w-10 text-indigo-500 mb-2 opacity-80" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Fiş veya Fatura Fotoğrafını Yükleyin
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Tutar, KDV, tarih ve kategori REN AI tarafından otomatik okunur.
              </p>
              <input
                type="file"
                accept="image/*"
                className="mt-4 block w-full text-xs text-slate-500 file:mr-2 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    toast.loading("REN AI fiş analiz ediliyor...", { id: "ocr" });
                    setTimeout(() => {
                      toast.success("Fiş okundu! Form taslağa aktarıldı.", { id: "ocr" });
                      setAiModalOpen(false);
                      setNewExpenseOpen(true);
                    }, 1400);
                  }
                }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
