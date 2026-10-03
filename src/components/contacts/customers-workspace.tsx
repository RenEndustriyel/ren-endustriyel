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
  List,
  LayoutGrid,
  Mail,
  MapPin,
  ArrowUpDown,
  MessageCircle,
} from "lucide-react";
import { useContacts, useContactBalances, useUpdate, type Row } from "@/lib/data";
import { formatMoney } from "@/lib/format";
import { exportExcel } from "@/lib/excel";
import { toast } from "sonner";
import { ContactImport } from "./contact-import";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ContactForm } from "./contact-form";
import { cn } from "@/lib/utils";

type FilterStatus = "all" | "has_balance" | "debt" | "credit";
type SortField = "name" | "balance" | "city";
type SortDir = "asc" | "desc";

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

  // View mode: default to "list", persistent in localStorage
  const [viewMode, setViewMode] = React.useState<"list" | "card">("list");
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("ren-contacts-view-mode");
      if (saved === "card" || saved === "list") {
        setViewMode(saved);
      }
    } catch {
      // ignore
    }
  }, []);

  const updateViewMode = (mode: "list" | "card") => {
    setViewMode(mode);
    try {
      localStorage.setItem("ren-contacts-view-mode", mode);
    } catch {
      // ignore
    }
  };

  const [filterStatus, setFilterStatus] = React.useState<FilterStatus>("all");
  const [sortField, setSortField] = React.useState<SortField>("name");
  const [sortDir, setSortDir] = React.useState<SortDir>("asc");

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

  // Statistics
  const stats = React.useMemo(() => {
    let totalDebit = 0; // Customer: Tahsil edilecek / Supplier: Tedarikçiye avans (alacak)
    let totalCredit = 0; // Customer: Müşteri avansı / Supplier: Ödenecek borç
    let withBalCount = 0;
    for (const c of rows) {
      if (c.balance > 0.004) {
        totalDebit += c.balance;
        withBalCount++;
      } else if (c.balance < -0.004) {
        totalCredit += Math.abs(c.balance);
        withBalCount++;
      }
    }
    return {
      totalCount: rows.length,
      withBalCount,
      totalDebit,
      totalCredit,
      net: isCustomer ? totalDebit - totalCredit : totalCredit - totalDebit,
    };
  }, [rows, isCustomer]);

  // Filtering
  const filtered = React.useMemo(() => {
    const qLower = q.toLowerCase().trim();
    return rows.filter((c) => {
      if (qLower) {
        const searchTarget = `${c.name} ${c.code ?? ""} ${c.tax_number ?? ""} ${c.phone ?? ""} ${c.mobile ?? ""} ${c.city ?? ""} ${c.district ?? ""} ${c.contact_person ?? ""} ${c.email ?? ""}`.toLowerCase();
        if (!searchTarget.includes(qLower)) return false;
      }
      if (filterStatus === "has_balance") {
        return Math.abs(c.balance) > 0.004;
      }
      if (filterStatus === "debt") {
        return c.balance > 0.004;
      }
      if (filterStatus === "credit") {
        return c.balance < -0.004;
      }
      return true;
    });
  }, [rows, q, filterStatus]);

  // Sorting
  const sorted = React.useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") {
        cmp = a.name.localeCompare(b.name, "tr");
      } else if (sortField === "balance") {
        cmp = a.balance - b.balance;
      } else if (sortField === "city") {
        cmp = (a.city || "").localeCompare(b.city || "", "tr");
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortField, sortDir]);

  const displayed = sorted.slice(0, limit);
  const totalCount = sorted.length;

  const handleSortToggle = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

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
        rows: sorted,
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

  const getCleanPhone = (phoneStr?: string | null) => {
    if (!phoneStr) return null;
    const digits = phoneStr.replace(/\D/g, "");
    if (!digits) return null;
    if (digits.startsWith("90")) return digits;
    if (digits.startsWith("0")) return "90" + digits.slice(1);
    return "90" + digits;
  };

  return (
    <div className="flex-1 space-y-4 min-w-0 w-full max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 lg:gap-4">
        <div className="min-w-0 lg:min-w-[12rem] lg:shrink-0 lg:max-w-[45%]">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate">
            {rows.length} {isCustomer ? "müşteri" : "tedarikçi"} kayıtlı · {stats.withBalCount} bakiyeli
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 min-w-0 lg:justify-end">
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
            <Plus className="h-4 w-4" /> Yeni {isCustomer ? "Müşteri" : "Tedarikçi"}
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full max-w-full">
        <div className="card p-3.5 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800/80 border border-slate-200/80 dark:border-slate-800">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Toplam {isCustomer ? "Müşteri" : "Tedarikçi"}
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            {stats.totalCount} <span className="text-xs font-normal text-slate-400">kayıt</span>
          </div>
        </div>

        <div className="card p-3.5 bg-gradient-to-br from-emerald-50/50 to-white dark:from-emerald-950/20 dark:to-slate-900 border border-emerald-100 dark:border-emerald-900/40">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            {isCustomer ? "Tahsil Edilecek (Alacak)" : "Tedarikçiye Avans"}
          </div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums truncate">
            {formatMoney(stats.totalDebit)}
          </div>
        </div>

        <div className="card p-3.5 bg-gradient-to-br from-rose-50/50 to-white dark:from-rose-950/20 dark:to-slate-900 border border-rose-100 dark:border-rose-900/40">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
            {isCustomer ? "Müşteri Avansı (Borç)" : "Ödenecek (Borç)"}
          </div>
          <div className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1 tabular-nums truncate">
            {formatMoney(stats.totalCredit)}
          </div>
        </div>

        <div className="card p-3.5 bg-gradient-to-br from-teal-50/50 to-white dark:from-teal-950/20 dark:to-slate-900 border border-teal-100 dark:border-teal-900/40">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400">
            Net Durum
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums truncate">
            {formatMoney(stats.net)}
          </div>
        </div>
      </div>

      {/* Toolbar: Search, Filters, Sort & View Mode */}
      <div className="flex flex-col gap-3 pt-1 w-full max-w-full">
        {/* Top Controls Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 w-full">
          {/* Search */}
          <div className="relative flex-1 min-w-0 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              className="input pl-10 pr-8 w-full"
              placeholder={`${isCustomer ? "Müşteri" : "Tedarikçi"} unvanı, kod, VKN, telefon, il...`}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                title="Temizle"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Right Controls: Sort & View Mode */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            {/* Sort Dropdown */}
            <select
              value={`${sortField}:${sortDir}`}
              onChange={(e) => {
                const [field, dir] = e.target.value.split(":") as [SortField, SortDir];
                setSortField(field);
                setSortDir(dir);
              }}
              className="input !w-auto !py-1.5 text-xs text-slate-700 dark:text-slate-200 shrink-0"
              aria-label="Sırala"
            >
              <option value="name:asc">Unvan (A → Z)</option>
              <option value="name:desc">Unvan (Z → A)</option>
              <option value="balance:desc">Bakiye (Yüksek → Düşük)</option>
              <option value="balance:asc">Bakiye (Düşük → Yüksek)</option>
              <option value="city:asc">Şehir (A → Z)</option>
            </select>

            {/* View Mode Toggle: Liste / Kart */}
            <div
              className="inline-flex shrink-0 rounded-xl border border-slate-200 dark:border-slate-700 p-0.5 bg-white dark:bg-slate-900"
              role="group"
              aria-label="Görünüm Seçimi"
            >
              <button
                type="button"
                onClick={() => updateViewMode("list")}
                aria-pressed={viewMode === "list"}
                title="Liste görünümü"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition",
                  viewMode === "list"
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
                )}
              >
                <List size={14} />
                <span>Liste</span>
              </button>
              <button
                type="button"
                onClick={() => updateViewMode("card")}
                aria-pressed={viewMode === "card"}
                title="Kart görünümü"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition",
                  viewMode === "card"
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
                )}
              >
                <LayoutGrid size={14} />
                <span>Kart</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filter Chips Row */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          <button
            type="button"
            onClick={() => setFilterStatus("all")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition",
              filterStatus === "all"
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
            )}
          >
            Tümü ({rows.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus("has_balance")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition",
              filterStatus === "has_balance"
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
            )}
          >
            Bakiyeliler ({stats.withBalCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus("debt")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition",
              filterStatus === "debt"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
            )}
          >
            {isCustomer ? "Borçlular (Alacak)" : "Alacaklı"}
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus("credit")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition",
              filterStatus === "credit"
                ? "bg-rose-600 text-white shadow-sm"
                : "bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300"
            )}
          >
            {isCustomer ? "Alacaklılar (Avans)" : "Borçlu"}
          </button>
        </div>
      </div>

      {/* Main Content: List or Card View */}
      {displayed.length === 0 ? (
        <div className="card p-12 text-center text-slate-400">
          <UserRound className="mx-auto h-10 w-10 mb-3 opacity-40 text-slate-400" />
          <div className="text-base font-medium text-slate-700 dark:text-slate-300">
            {q || filterStatus !== "all"
              ? "Arama ve filtre kriterine uygun kayıt bulunamadı."
              : `Henüz kayıtlı ${isCustomer ? "müşteri" : "tedarikçi"} yok.`}
          </div>
          {(q || filterStatus !== "all") && (
            <button
              type="button"
              onClick={() => {
                setQ("");
                setFilterStatus("all");
              }}
              className="btn-ghost mt-3 text-xs"
            >
              Filtreleri Temizle
            </button>
          )}
          {!q && filterStatus === "all" && (
            <button
              type="button"
              onClick={() => setNewModalOpen(true)}
              className="btn-primary mt-3 text-xs inline-flex items-center gap-1.5 mx-auto"
            >
              <Plus className="h-3.5 w-3.5" /> Yeni {isCustomer ? "Müşteri" : "Tedarikçi"} Ekle
            </button>
          )}
        </div>
      ) : viewMode === "list" ? (
        /* ================= LIST / TABLE VIEW ================= */
        <div className="w-full max-w-full">
          {/* Desktop Table View - STRICTLY FITTED INSIDE FRAME */}
          <div className="hidden md:block rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden w-full max-w-full">
            <div className="w-full overflow-hidden">
              <table className="w-full table-fixed text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="py-3 px-3 sm:px-4 text-left w-auto min-w-[180px]">
                      <button
                        type="button"
                        onClick={() => handleSortToggle("name")}
                        className="inline-flex items-center gap-1.5 hover:text-slate-800 dark:hover:text-slate-200 transition"
                      >
                        <span>{isCustomer ? "Müşteri / Cari" : "Tedarikçi / Cari"}</span>
                        <ArrowUpDown className="h-3 w-3 opacity-60" />
                      </button>
                    </th>
                    <th className="py-3 px-2 sm:px-3 text-left w-[130px] lg:w-[160px]">
                      İletişim
                    </th>
                    <th className="hidden lg:table-cell py-3 px-2 sm:px-3 text-left w-[110px] xl:w-[130px]">
                      <button
                        type="button"
                        onClick={() => handleSortToggle("city")}
                        className="inline-flex items-center gap-1.5 hover:text-slate-800 dark:hover:text-slate-200 transition"
                      >
                        <span>Şehir / İlçe</span>
                        <ArrowUpDown className="h-3 w-3 opacity-60" />
                      </button>
                    </th>
                    <th className="hidden xl:table-cell py-3 px-2 sm:px-3 text-left w-[110px] 2xl:w-[130px]">
                      VKN / TCKN
                    </th>
                    <th className="py-3 px-3 sm:px-4 text-right w-[110px] sm:w-[130px] lg:w-[150px]">
                      <button
                        type="button"
                        onClick={() => handleSortToggle("balance")}
                        className="inline-flex items-center gap-1.5 hover:text-slate-800 dark:hover:text-slate-200 transition ml-auto"
                      >
                        <span>Güncel Bakiye</span>
                        <ArrowUpDown className="h-3 w-3 opacity-60" />
                      </button>
                    </th>
                    <th className="py-3 px-3 sm:px-4 text-right w-[95px] sm:w-[105px] lg:w-[115px]">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                  {displayed.map((c) => {
                    const phone = c.mobile || c.phone;
                    const cleanPhone = getCleanPhone(phone);
                    const bal = c.balance;
                    const isPositive = bal > 0.004;
                    const isNegative = bal < -0.004;

                    return (
                      <tr
                        key={c.id}
                        onClick={() => router.push(`/cariler/detay?id=${c.id}`)}
                        className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/50 cursor-pointer transition"
                      >
                        {/* 1. Cari / Unvan & Kod */}
                        <td className="py-3 px-3 sm:px-4 min-w-0">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="h-9 w-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200/70 dark:border-teal-800/60 flex items-center justify-center text-teal-700 dark:text-teal-300 font-bold text-xs shrink-0 tracking-wider">
                              {c.name.trim().slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition truncate">
                                {c.name}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-400 truncate">
                                {c.code && (
                                  <span className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded text-slate-600 dark:text-slate-300 shrink-0">
                                    {c.code}
                                  </span>
                                )}
                                {c.contact_person && (
                                  <span className="truncate">· {c.contact_person}</span>
                                )}
                                {c.kind === "both" && (
                                  <span className="text-[10px] bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-1 py-0.2 rounded shrink-0">
                                    M+T
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. İletişim (Telefon / E-posta) */}
                        <td className="py-3 px-2 sm:px-3 text-xs text-slate-600 dark:text-slate-300 truncate">
                          <div className="space-y-0.5 min-w-0">
                            {phone ? (
                              <a
                                href={`tel:${phone}`}
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1 hover:text-teal-600 dark:hover:text-teal-400 font-medium truncate"
                              >
                                <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                                <span className="truncate">{phone}</span>
                              </a>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">-</span>
                            )}
                            {c.email && (
                              <a
                                href={`mailto:${c.email}`}
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 truncate text-[11px]"
                              >
                                <Mail className="h-3 w-3 shrink-0" />
                                <span className="truncate">{c.email}</span>
                              </a>
                            )}
                          </div>
                        </td>

                        {/* 3. Konum (İl / İlçe) */}
                        <td className="hidden lg:table-cell py-3 px-2 sm:px-3 text-xs text-slate-600 dark:text-slate-300 truncate">
                          {c.district || c.city ? (
                            <div className="flex items-center gap-1 truncate">
                              <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                              <span className="truncate">{[c.district, c.city].filter(Boolean).join(" / ")}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs">-</span>
                          )}
                        </td>

                        {/* 4. VKN / TCKN */}
                        <td className="hidden xl:table-cell py-3 px-2 sm:px-3 text-xs text-slate-600 dark:text-slate-300 truncate">
                          {c.tax_number ? (
                            <div className="truncate">
                              <span className="font-mono text-xs">{c.tax_number}</span>
                              {c.tax_office && (
                                <div className="text-[11px] text-slate-400 truncate">
                                  {c.tax_office}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs">-</span>
                          )}
                        </td>

                        {/* 5. Güncel Bakiye */}
                        <td className="py-3 px-3 sm:px-4 text-right">
                          <div className="inline-flex flex-col items-end whitespace-nowrap">
                            <span
                              className={cn(
                                "font-bold tabular-nums text-xs sm:text-sm",
                                isPositive
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : isNegative
                                  ? "text-rose-600 dark:text-rose-400"
                                  : "text-slate-500 dark:text-slate-400"
                              )}
                            >
                              {isPositive && "+"}
                              {formatMoney(bal)}
                            </span>
                            <span
                              className={cn(
                                "text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full mt-0.5 whitespace-nowrap",
                                isPositive
                                  ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300"
                                  : isNegative
                                  ? "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                              )}
                            >
                              {isPositive
                                ? isCustomer
                                  ? "Borçlu"
                                  : "Alacak"
                                : isNegative
                                ? isCustomer
                                  ? "Alacaklı"
                                  : "Borç"
                                : "0 TL"}
                            </span>
                          </div>
                        </td>

                        {/* 6. İşlemler */}
                        <td className="py-3 px-3 sm:px-4 text-right">
                          <div
                            className="flex items-center justify-end gap-0.5 sm:gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {cleanPhone && (
                              <a
                                href={`https://wa.me/${cleanPhone}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 sm:p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition shrink-0"
                                title="WhatsApp ile mesaj gönder"
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => router.push(`/cariler/detay?id=${c.id}`)}
                              className="inline-flex items-center gap-0.5 px-2 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition shrink-0"
                            >
                              <span>Detay</span>
                              <ChevronRight className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDelete(e, c)}
                              className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition shrink-0"
                              title="Sil"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Compact List Item View */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm w-full">
            {displayed.map((c) => {
              const phone = c.mobile || c.phone;
              const cleanPhone = getCleanPhone(phone);
              const bal = c.balance;
              const isPositive = bal > 0.004;
              const isNegative = bal < -0.004;

              return (
                <div
                  key={c.id}
                  onClick={() => router.push(`/cariler/detay?id=${c.id}`)}
                  className="p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="h-9 w-9 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200/70 dark:border-teal-800/60 flex items-center justify-center text-teal-700 dark:text-teal-300 font-bold text-xs shrink-0 mt-0.5">
                        {c.name.trim().slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                          {c.name}
                        </div>
                        {phone && (
                          <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <Phone className="h-3 w-3" /> {phone}
                          </div>
                        )}
                        {(c.district || c.city) && (
                          <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3" /> {[c.district, c.city].filter(Boolean).join(" / ")}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div
                        className={cn(
                          "font-bold tabular-nums text-sm",
                          isPositive
                            ? "text-emerald-600 dark:text-emerald-400"
                            : isNegative
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-slate-500 dark:text-slate-400"
                        )}
                      >
                        {isPositive && "+"}
                        {formatMoney(bal)}
                      </div>
                      <div
                        className={cn(
                          "text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full inline-block mt-0.5",
                          isPositive
                            ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300"
                            : isNegative
                            ? "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                        )}
                      >
                        {isPositive
                          ? (isCustomer ? "Borçlu" : "Alacak")
                          : isNegative
                          ? (isCustomer ? "Alacaklı" : "Borç")
                          : "0 TL"}
                      </div>
                    </div>
                  </div>

                  {/* Mobile Actions Footer */}
                  <div
                    className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-slate-100 dark:border-slate-800"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2">
                      {cleanPhone && (
                        <a
                          href={`https://wa.me/${cleanPhone}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline font-medium"
                        >
                          <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                        </a>
                      )}
                      {phone && (
                        <a
                          href={`tel:${phone}`}
                          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:underline font-medium ml-2"
                        >
                          <Phone className="h-3.5 w-3.5" /> Ara
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => router.push(`/cariler/detay?id=${c.id}`)}
                        className="text-xs font-semibold text-teal-600 dark:text-teal-400 inline-flex items-center gap-0.5"
                      >
                        Detay <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDelete(e, c)}
                        className="p-1 text-slate-300 hover:text-rose-500 ml-1"
                        title="Sil"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ================= CARD / GRID VIEW ================= */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 w-full">
          {displayed.map((c) => {
            const phone = c.mobile || c.phone;
            const bal = c.balance;
            const isEmerald = bal > 0.004;
            const isRose = bal < -0.004;

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
                    <div className="h-11 w-11 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0 overflow-hidden font-bold text-sm">
                      {c.name.trim().slice(0, 2).toUpperCase() || <UserRound className="h-[22px] w-[22px]" />}
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
                      {(c.district || c.city) && (
                        <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="h-[11px] w-[11px]" /> {[c.district, c.city].filter(Boolean).join(" / ")}
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
                        className={cn(
                          "font-bold tabular-nums",
                          isEmerald
                            ? "text-emerald-500"
                            : isRose
                            ? "text-rose-500"
                            : "text-slate-400"
                        )}
                      >
                        {isEmerald && "+"}
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
        <div className="flex flex-col items-center gap-1.5 py-4">
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
                    <span>Liste ve Kart görünümü arasında anlık geçiş</span>
                  </li>
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
