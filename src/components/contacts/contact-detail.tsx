"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  FileText,
  Download,
  MapPin,
  Phone,
  Mail,
  ShoppingCart,
  Eye,
  ChevronUp,
  ChevronDown,
  Printer,
  RotateCcw,
  Scale,
  Coins,
  ArrowLeftRight,
  User,
  Building2,
  Clock,
  Plus,
  CheckCircle2,
  AlertCircle,
  Calendar,
  CreditCard,
  Wallet,
  Banknote,
  Search,
  X,
} from "lucide-react";
import {
  useRow,
  useRows,
  useRpc,
  useRpcQuery,
  useUpdate,
  useContactBalances,
  useAccounts,
  newId,
  type Row,
} from "@/lib/data";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatDate, formatMoney, isoDate } from "@/lib/format";
import { exportExcel } from "@/lib/excel";
import { DOC_TYPES, PAYMENT_STATUS, STATUS_LABEL, type DocType } from "@/lib/doc-types";
import { TYPE_LABELS } from "@/components/dashboard/types";
import { useOrg } from "@/providers/org-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useConfirm } from "@/components/ui/confirm";
import { cn } from "@/lib/utils";
import { ContactForm } from "./contact-form";
import { DocumentPrintModal } from "@/components/documents/document-print-modal";

type Contact = Row<"contacts">;
type StatementRow = {
  entry_date: string;
  kind: string;
  ref_id: string;
  ref_type: string;
  number: string | null;
  description: string | null;
  debit: number;
  credit: number;
  balance: number;
  due_date: string | null;
};

export function ContactDetail({ id }: { id: string }) {
  const router = useRouter();
  const confirm = useConfirm();
  const { org, canWrite } = useOrg();
  const contact = useRow<Contact>("contacts", id);
  const balances = useContactBalances();
  const accountsQuery = useAccounts();
  const { remove } = useUpdate("contacts");
  const delDoc = useRpc("delete_document");
  const { remove: removeTxn } = useUpdate("transactions");
  const saveTxnRpc = useRpc("save_transaction");
  const qc = useQueryClient();

  // Aktif Sekme (Pusulam 7 Sekme)
  const [activeTab, setActiveTab] = React.useState<
    "ozet" | "faturalar" | "tahsilatlar" | "cek-senet" | "teklifler" | "belgeler" | "kart-nakit"
  >("ozet");

  // Modallar
  const [editOpen, setEditOpen] = React.useState(false);
  const [ekstreModalOpen, setEkstreModalOpen] = React.useState(false);
  const [adjustmentOpen, setAdjustmentOpen] = React.useState(false);
  const [selectedRow, setSelectedRow] = React.useState<StatementRow | null>(null);
  const [printDoc, setPrintDoc] = React.useState<Row<"documents"> | null>(null);

  // Borç / Alacak Kaydı Form State
  const [adjType, setAdjType] = React.useState<"debit" | "credit">("debit");
  const [adjAmount, setAdjAmount] = React.useState<number>(0);
  const [adjDate, setAdjDate] = React.useState(isoDate());
  const [adjAccountId, setAdjAccountId] = React.useState<string>("");
  const [adjDesc, setAdjDesc] = React.useState("");
  const [adjSaving, setAdjSaving] = React.useState(false);

  // Tarih Filtresi (Ekstre için)
  const firstOfYear = `${new Date().getFullYear()}-01-01`;
  const [from, setFrom] = React.useState(firstOfYear);
  const [to, setTo] = React.useState(isoDate());

  // Veri Sorguları
  const statement = useRpcQuery<StatementRow[]>(
    "contact_statement",
    { p_contact: id, p_from: null, p_to: to },
    { enabled: !!id }
  );

  const docs = useRows<Row<"documents">>("documents", {
    params: ["contact_docs", id],
    filter: (q) => q.eq("contact_id", id),
    order: [{ column: "issue_date", ascending: false }],
  });

  const txns = useRows<Row<"transactions">>("transactions", {
    params: ["contact_txns", id],
    filter: (q) => q.eq("contact_id", id),
    order: [{ column: "txn_date", ascending: false }],
  });

  const cheques = useRows<Row<"cheques">>("cheques", {
    params: ["contact_cheques", id],
    filter: (q) => q.eq("contact_id", id),
    order: [{ column: "due_date", ascending: false }],
  });

  // Ekstre hesaplamaları ve birleştirme
  const all = React.useMemo(() => {
    const raw = statement.data ?? [];
    if (!docs.data || raw.some((r) => r.ref_type === "sales_order" || r.ref_type === "purchase_order")) {
      return raw;
    }
    const orders = docs.data.filter(
      (d) =>
        (d.doc_type === "sales_order" || d.doc_type === "purchase_order") &&
        d.status !== "draft" &&
        d.status !== "cancelled" &&
        d.status !== "converted"
    );
    if (!orders.length) return raw;

    const merged = [...raw];
    for (const o of orders) {
      const isSales = o.doc_type === "sales_order";
      const amt = Number(o.total_try ?? Number(o.total) * Number(o.exchange_rate || 1));
      merged.push({
        entry_date: o.issue_date,
        kind: "document",
        ref_id: o.id,
        ref_type: o.doc_type,
        number: o.number,
        description: o.description || (isSales ? "Satış Siparişi" : "Satın Alma Siparişi"),
        debit: isSales ? amt : 0,
        credit: isSales ? 0 : amt,
        balance: 0,
        due_date: o.due_date,
      });
    }

    merged.sort((a, b) => a.entry_date.localeCompare(b.entry_date));
    let runBal = 0;
    for (const r of merged) {
      runBal += Number(r.debit) - Number(r.credit);
      r.balance = Math.round(runBal * 100) / 100;
    }
    return merged;
  }, [statement.data, docs.data]);

  const c = contact.data;

  // Sıralama State
  const [sortField, setSortField] = React.useState<"date" | "type" | "description" | "debit" | "credit" | "balance">("date");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");

  const handleSort = (field: "date" | "type" | "description" | "debit" | "credit" | "balance") => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const rows = React.useMemo(() => all.filter((r) => r.entry_date >= from), [all, from]);
  const before = React.useMemo(() => all.filter((r) => r.entry_date < from), [all, from]);
  const carried = before.length ? Number(before[before.length - 1].balance) : 0;

  const displayRows = React.useMemo(() => {
    return [...rows].sort((a, b) => {
      let va: any = a.entry_date;
      let vb: any = b.entry_date;
      if (sortField === "type") {
        va = (DOC_TYPES[a.ref_type as DocType]?.label ?? TYPE_LABELS[a.ref_type] ?? a.ref_type ?? "") + (a.number ?? "");
        vb = (DOC_TYPES[b.ref_type as DocType]?.label ?? TYPE_LABELS[b.ref_type] ?? b.ref_type ?? "") + (b.number ?? "");
      } else if (sortField === "description") {
        va = a.description ?? "";
        vb = b.description ?? "";
      } else if (sortField === "debit") {
        va = Number(a.debit ?? 0);
        vb = Number(b.debit ?? 0);
        return sortDir === "asc" ? va - vb : vb - va;
      } else if (sortField === "credit") {
        va = Number(a.credit ?? 0);
        vb = Number(b.credit ?? 0);
        return sortDir === "asc" ? va - vb : vb - va;
      } else if (sortField === "balance") {
        va = Number(a.balance ?? 0);
        vb = Number(b.balance ?? 0);
        return sortDir === "asc" ? va - vb : vb - va;
      }
      const r = String(va).localeCompare(String(vb), "tr", { numeric: true });
      return sortDir === "asc" ? r : -r;
    });
  }, [rows, sortField, sortDir]);

  if (contact.isPending && !c) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48 bg-[#16202c]" />
        <Skeleton className="h-36 rounded-2xl bg-[#131b26]" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <Skeleton className="h-24 rounded-xl bg-[#131b26]" />
          <Skeleton className="h-24 rounded-xl bg-[#131b26]" />
          <Skeleton className="h-24 rounded-xl bg-[#131b26]" />
          <Skeleton className="h-24 rounded-xl bg-[#131b26]" />
        </div>
      </div>
    );
  }

  if (!c) {
    return (
      <div className="rounded-2xl border border-[#1e2a3a] bg-[#131b26] p-12 text-center text-slate-300">
        <AlertCircle className="mx-auto mb-3 size-10 text-rose-400" />
        <h3 className="text-base font-bold text-white">Cari kartı bulunamadı</h3>
        <p className="mt-1 text-xs text-slate-400">Bu cari silinmiş veya ID geçersiz olabilir.</p>
        <Button
          variant="outline"
          className="mt-4 border-[#233144] bg-[#16202c] text-slate-200"
          onClick={() => router.back()}
        >
          Geri Dön
        </Button>
      </div>
    );
  }

  const isSupplier = c.kind === "supplier";
  const balance = Number(balances.data?.find((b) => b.contact_id === id)?.balance ?? c.opening_balance ?? 0);
  const openDocs = (docs.data ?? []).filter((d) => d.payment_status === "unpaid" || d.payment_status === "partial");
  const openDocsTotal = openDocs.reduce(
    (acc, d) => acc + (Number(d.total) - Number(d.paid_amount || 0)) * Number(d.exchange_rate || 1),
    0
  );

  // Pusulam 4 Kart Metrikleri Hesaplama
  const totalSalesOrPurchases = (docs.data ?? [])
    .filter((d) => {
      if (isSupplier) {
        return (d.doc_type === "purchase_invoice" || d.doc_type === "purchase_order") && d.status !== "cancelled";
      }
      return (d.doc_type === "sales_invoice" || d.doc_type === "sales_order" || d.doc_type === "pos_sale") && d.status !== "cancelled";
    })
    .reduce((acc, d) => acc + Number(d.total_try ?? Number(d.total) * Number(d.exchange_rate || 1)), 0);

  const totalCollectedOrPaid = (txns.data ?? [])
    .filter((t) => {
      if (isSupplier) {
        return t.direction === "out" && (t.type === "payment" || t.type === "odeme");
      }
      return t.direction === "in" && (t.type === "collection" || t.type === "tahsilat");
    })
    .reduce((acc, t) => acc + Number(t.amount_try ?? t.amount ?? 0), 0);

  const chequesCount = cheques.data?.length ?? 0;

  const cardAmount = (txns.data ?? [])
    .filter((t) => t.method === "card" || t.method === "pos" || t.method === "kredi_karti")
    .reduce((acc, t) => acc + Number(t.amount_try ?? t.amount ?? 0), 0);

  const del = async () => {
    if (
      !(await confirm({
        title: `${c.name} silinsin mi?`,
        description: "Cari listeden kaldırılır. Geçmiş belgeler ve hareketler korunur.",
        danger: true,
        confirmText: "Sil",
      }))
    )
      return;
    await remove(c.id, "Cari silindi");
    router.replace(isSupplier ? "/cariler/tedarikciler" : "/cariler/musteriler");
  };

  const exportStatement = () =>
    exportExcel(`ekstre-${c.name}`, [
      {
        name: "Ekstre",
        title: `${c.name} — Hesap Ekstresi (${formatDate(from)} - ${formatDate(to)})`,
        rows: [{ entry_date: from, description: "Devreden bakiye", debit: 0, credit: 0, balance: carried } as StatementRow, ...rows],
        columns: [
          { header: "Tarih", value: (r) => r.entry_date, type: "date" },
          { header: "İşlem", value: (r) => (r.ref_type ? TYPE_LABELS[r.ref_type] ?? DOC_TYPES[r.ref_type as DocType]?.label ?? r.ref_type : "") },
          { header: "Belge no", value: (r) => r.number },
          { header: "Açıklama", value: (r) => r.description, width: 36 },
          { header: "Vade", value: (r) => r.due_date, type: "date" },
          { header: "Borç", value: (r) => Number(r.debit), type: "money" },
          { header: "Alacak", value: (r) => Number(r.credit), type: "money" },
          { header: "Bakiye", value: (r) => Number(r.balance), type: "money" },
        ],
      },
    ]);

  const handlePdf = async (mode: "download" | "open") => {
    const { shareStatementPdf } = await import("@/lib/pdf/share");
    await shareStatementPdf({ org: org!, contact: c, rows, carried, from, to, mode });
  };

  const handleDeleteRow = async (r: StatementRow) => {
    if (r.kind === "document") {
      const label = DOC_TYPES[r.ref_type as DocType]?.label ?? "Belge";
      const ok = await confirm({
        title: `${label} (${r.number || "Taslak"}) silinsin mi?`,
        description: "Stok hareketleri ve ödeme eşleştirmeleri geri alınacaktır. Bu işlem geri alınamaz.",
        danger: true,
        confirmText: "Sil",
      });
      if (!ok) return;
      try {
        await delDoc.call({ p_doc: r.ref_id }, "Belge silindi");
        setSelectedRow(null);
        await Promise.all([
          statement.refetch(),
          docs.refetch(),
          balances.refetch(),
          contact.refetch(),
          qc.invalidateQueries({ queryKey: ["contact_statement"] }),
          qc.invalidateQueries({ queryKey: ["documents"] }),
          qc.invalidateQueries({ queryKey: ["transactions"] }),
          qc.invalidateQueries({ queryKey: ["contact_balances"] }),
          qc.invalidateQueries({ queryKey: ["dashboard_summary"] }),
        ]);
        toast.success("Belge başarıyla silindi");
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Silme işlemi başarısız");
      }
    } else if (r.kind === "transaction") {
      const label = TYPE_LABELS[r.ref_type] ?? "İşlem";
      const ok = await confirm({
        title: `${label} (${r.description || r.number || "Tahsilat/Ödeme"}) silinsin mi?`,
        description: "Hesap bakiyesi ve bağlı belge ödeme durumları güncellenecektir. Bu işlem geri alınamaz.",
        danger: true,
        confirmText: "Sil",
      });
      if (!ok) return;
      try {
        await removeTxn(r.ref_id, "İşlem silindi");
        setSelectedRow(null);
        await Promise.all([
          statement.refetch(),
          docs.refetch(),
          balances.refetch(),
          contact.refetch(),
          qc.invalidateQueries({ queryKey: ["contact_statement"] }),
          qc.invalidateQueries({ queryKey: ["documents"] }),
          qc.invalidateQueries({ queryKey: ["transactions"] }),
          qc.invalidateQueries({ queryKey: ["contact_balances"] }),
          qc.invalidateQueries({ queryKey: ["dashboard_summary"] }),
        ]);
        toast.success("İşlem başarıyla silindi");
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Silme işlemi başarısız");
      }
    }
  };

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adjAmount <= 0) {
      toast.error("Lütfen geçerli bir tutar girin");
      return;
    }
    const accounts = accountsQuery.data ?? [];
    const targetAcc = accounts.find((a) => a.id === adjAccountId) || accounts[0];
    if (!targetAcc) {
      toast.error("Lütfen en az bir kasa veya banka hesabı seçin");
      return;
    }

    setAdjSaving(true);
    try {
      const flow = adjType === "debit" ? "in" : "out";
      const type = adjType === "debit" ? "collection" : "payment";

      await saveTxnRpc.call(
        {
          p_txn: {
            id: newId(),
            org_id: org!.id,
            type,
            direction: flow,
            txn_date: adjDate,
            account_id: targetAcc.id,
            contact_id: c.id,
            amount: adjAmount,
            currency: targetAcc.currency || "TRY",
            exchange_rate: 1,
            method: "other",
            description: adjDesc || (adjType === "debit" ? "Borç Dekontu / Düzeltme" : "Alacak Dekontu / Düzeltme"),
          },
          p_allocations: null,
        },
        adjType === "debit" ? "Borç kaydı eklendi" : "Alacak kaydı eklendi"
      );

      await Promise.all([
        statement.refetch(),
        txns.refetch(),
        balances.refetch(),
        contact.refetch(),
        qc.invalidateQueries({ queryKey: ["rows", "transactions"] }),
        qc.invalidateQueries({ queryKey: ["contact_statement"] }),
        qc.invalidateQueries({ queryKey: ["contact_balances"] }),
      ]);

      setAdjustmentOpen(false);
      setAdjAmount(0);
      setAdjDesc("");
      toast.success("Borç/Alacak kaydı başarıyla işlendi");
    } catch (err: any) {
      toast.error(err?.message || "Kayıt sırasında bir hata oluştu");
    } finally {
      setAdjSaving(false);
    }
  };

  const renderSortHeader = (label: string, field: "date" | "type" | "description" | "debit" | "credit" | "balance", alignRight?: boolean) => (
    <button
      type="button"
      onClick={() => handleSort(field)}
      className={cn(
        "inline-flex items-center gap-1.5 font-semibold transition-colors hover:text-white select-none",
        sortField === field ? "text-[#00b49c] font-bold" : "text-slate-400",
        alignRight && "ml-auto"
      )}
    >
      <span>{label}</span>
      {sortField === field ? (
        sortDir === "asc" ? (
          <ChevronUp className="size-3.5 stroke-[2.5]" />
        ) : (
          <ChevronDown className="size-3.5 stroke-[2.5]" />
        )
      ) : (
        <span className="opacity-0 hover:opacity-50 text-[10px]">↕</span>
      )}
    </button>
  );

  const TABS = [
    { id: "ozet", label: "Özet" },
    { id: "faturalar", label: isSupplier ? "Alışlar" : "Satışlar" },
    { id: "tahsilatlar", label: isSupplier ? "Ödemeler" : "Tahsilatlar" },
    { id: "cek-senet", label: "Çek & Senet" },
    { id: "teklifler", label: "Teklifler" },
    { id: "belgeler", label: "Belgeler" },
    { id: "kart-nakit", label: "Kart / Nakit" },
  ] as const;

  return (
    <div className="space-y-4">
      {/* 1. ÜST BUTON BAR (Fotoğraf Birebir Dizilim) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Sol: Geri Dön Butonu */}
        <button
          type="button"
          onClick={() => router.push(isSupplier ? "/cariler/tedarikciler" : "/cariler/musteriler")}
          className="inline-flex items-center gap-2 rounded-lg border border-[#233144] bg-[#131b26] px-3.5 py-1.5 text-sm font-medium text-slate-200 shadow-sm transition hover:bg-[#1a2534]"
        >
          <ArrowLeft className="size-4" />
          <span>{isSupplier ? "Tedarikçiler" : "Müşteriler"}</span>
        </button>

        {/* Sağ: İşlem Butonları */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Düzenle */}
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#233144] bg-[#16202c] px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-200 transition hover:bg-[#1f2c3d]"
          >
            <Pencil className="size-3.5 text-slate-400" />
            <span>Düzenle</span>
          </button>

          {/* Ekstre */}
          <button
            type="button"
            onClick={() => setEkstreModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#233144] bg-[#16202c] px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-200 transition hover:bg-[#1f2c3d]"
          >
            <FileText className="size-3.5 text-slate-400" />
            <span>Ekstre</span>
          </button>

          {/* Fatura / Satış (Müşteri) veya Fatura / Alış (Tedarikçi) */}
          <Link
            href={isSupplier ? `/giderler/alis-faturalari/yeni?cari=${c.id}` : `/satislar/faturalar/yeni?cari=${c.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#233144] bg-[#16202c] px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-200 transition hover:bg-[#1f2c3d]"
          >
            <ShoppingCart className="size-3.5 text-slate-400" />
            <span>{isSupplier ? "Fatura / Alış" : "Fatura / Satış"}</span>
          </Link>

          {/* İade Al (Müşteri) veya İade Et (Tedarikçi) */}
          <Link
            href={isSupplier ? `/giderler/iadeler/yeni?cari=${c.id}` : `/satislar/iadeler/yeni?cari=${c.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-900/40 bg-[#16202c] px-3 py-1.5 text-xs sm:text-sm font-medium text-rose-400 transition hover:bg-rose-950/30"
          >
            <RotateCcw className="size-3.5 text-rose-400" />
            <span>{isSupplier ? "İade Et" : "İade Al"}</span>
          </Link>

          {/* Müşteriden Alım (Müşteri) veya Tedarikçiye Satış (Tedarikçi) */}
          <Link
            href={isSupplier ? `/satislar/faturalar/yeni?cari=${c.id}` : `/giderler/alis-faturalari/yeni?cari=${c.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#233144] bg-[#16202c] px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-200 transition hover:bg-[#1f2c3d]"
          >
            <Scale className="size-3.5 text-slate-400" />
            <span>{isSupplier ? "Tedarikçiye Satış" : "Müşteriden Alım"}</span>
          </Link>

          {/* Tahsilat Al (Müşteri) veya Ödeme Yap (Tedarikçi) -> Yeşil Vurgulu Buton */}
          <Link
            href={`/nakit/hareketler/yeni?tip=${isSupplier ? "odeme" : "tahsilat"}&cari=${c.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#00b49c] hover:bg-[#009e89] px-4 py-1.5 text-xs sm:text-sm font-bold text-white shadow-sm transition"
          >
            <Coins className="size-4" />
            <span>{isSupplier ? "Ödeme Yap" : "Tahsilat Al"}</span>
          </Link>

          {/* Borç / Alacak Kaydı */}
          <button
            type="button"
            onClick={() => setAdjustmentOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#233144] bg-[#16202c] px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-200 transition hover:bg-[#1f2c3d]"
          >
            <ArrowLeftRight className="size-3.5 text-slate-400" />
            <span>Borç / Alacak Kaydı</span>
          </button>
        </div>
      </div>

      {/* 2. CARİ ANA BAŞLIK KARTI (Fotoğraf Birebir Tasarım) */}
      <div className="rounded-2xl border border-[#1e2a3a] bg-[#131b26] p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          {/* Sol Kısım: Avatar ve Bilgiler */}
          <div className="flex items-start gap-4 sm:gap-5 min-w-0">
            <div className="flex size-16 sm:size-20 shrink-0 items-center justify-center rounded-2xl border border-[#273549] bg-[#1a2332] text-slate-400 shadow-inner">
              {isSupplier ? (
                <Building2 className="size-8 sm:size-9 text-slate-400 stroke-[1.5]" />
              ) : (
                <User className="size-8 sm:size-9 text-slate-400 stroke-[1.5]" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[#00b49c]">
                {isSupplier ? "TEDARİKÇİ DETAYI" : "MÜŞTERİ DETAYI"}
              </div>
              <h1 className="truncate text-xl sm:text-2xl font-black tracking-tight text-white">
                {c.name}
              </h1>

              {/* Adres & Konum */}
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                {(c.address || c.district || c.city) ? (
                  <span className="flex items-center gap-1 text-slate-400">
                    <MapPin className="size-3.5 text-slate-500 shrink-0" />
                    <span>{[c.address, c.district, c.city].filter(Boolean).join(" - ")}</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-slate-500">
                    <MapPin className="size-3.5 text-slate-600 shrink-0" />
                    <span>Adres tanımlanmamış</span>
                  </span>
                )}

                {c.tax_number && (
                  <span className="text-slate-500">
                    VKN/TCKN: <strong className="font-medium text-slate-300">{c.tax_number}</strong>
                    {c.tax_office ? ` · ${c.tax_office}` : ""}
                  </span>
                )}

                {(c.phone || c.mobile) && (
                  <span className="flex items-center gap-1 text-slate-400">
                    <Phone className="size-3 text-slate-500" />
                    <span>{c.phone || c.mobile}</span>
                  </span>
                )}
              </div>

              {/* Hatırlatma Durumu (Fotoğraftaki sarı metin) */}
              <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-amber-400">
                <Clock className="size-3.5 text-amber-400" />
                <span>Hatırlatma açık · 7 gün önce</span>
              </div>
            </div>
          </div>

          {/* Sağ Kısım: Güncel Bakiye (Fotoğraftaki Birebir Düzen) */}
          <div className="shrink-0 border-t border-[#1e2a3a] pt-3 sm:border-t-0 sm:pt-0 sm:text-right">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              GÜNCEL BAKİYE
            </div>
            <div
              className={cn(
                "mt-1 text-2xl sm:text-3xl font-black tracking-tight",
                balance > 0.004
                  ? isSupplier ? "text-rose-400" : "text-emerald-400"
                  : balance < -0.004
                    ? isSupplier ? "text-emerald-400" : "text-rose-400"
                    : "text-white"
              )}
            >
              {formatMoney(Math.abs(balance))}
            </div>
            <div className="mt-1 text-xs text-slate-400">
              {Math.abs(balance) <= 0.004
                ? "Hesap kapalı"
                : isSupplier
                  ? balance < 0
                    ? "Alacaklı (Biz Borçluyuz)"
                    : "Borçlu (Bize Borçlu)"
                  : balance > 0
                    ? "Borçlu (Bize Borçlu)"
                    : "Alacaklı (Biz Borçluyuz)"}
            </div>
            <div className="mt-0.5 text-xs text-slate-500">
              Açık belge: {formatMoney(openDocsTotal)}
            </div>
          </div>
        </div>
      </div>

      {/* 3. DÖRT RENKLİ İSTATİSTİK KARTI (Fotoğraftaki 4 Renk Bloğu) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. Kart: Toplam Satış / Toplam Alış (Koyu Zümrüt Yeşili) */}
        <div className="flex flex-col justify-center rounded-xl bg-gradient-to-r from-[#00b49c] to-[#008f7b] p-4 text-white shadow-sm">
          <div className="text-xl sm:text-2xl font-black tracking-tight">
            {formatMoney(totalSalesOrPurchases)}
          </div>
          <div className="mt-1 text-xs font-semibold text-emerald-100/90">
            {isSupplier ? "Toplam Alış" : "Toplam Satış"}
          </div>
        </div>

        {/* 2. Kart: Tahsilat / Ödeme (Okyanus Mavisi) */}
        <div className="flex flex-col justify-center rounded-xl bg-gradient-to-r from-[#3b82f6] to-[#2563eb] p-4 text-white shadow-sm">
          <div className="text-xl sm:text-2xl font-black tracking-tight">
            {formatMoney(totalCollectedOrPaid)}
          </div>
          <div className="mt-1 text-xs font-semibold text-blue-100/90">
            {isSupplier ? "Ödeme" : "Tahsilat"}
          </div>
        </div>

        {/* 3. Kart: Çek / Senet (Sarı/Turuncu) */}
        <div className="flex flex-col justify-center rounded-xl bg-gradient-to-r from-[#f59e0b] to-[#d97706] p-4 text-white shadow-sm">
          <div className="text-xl sm:text-2xl font-black tracking-tight">
            {chequesCount}
          </div>
          <div className="mt-1 text-xs font-semibold text-amber-100/90">
            Çek / Senet
          </div>
        </div>

        {/* 4. Kart: Kartlı Satış / Kartlı Alış (Açık Yeşil / Nane) */}
        <div className="flex flex-col justify-center rounded-xl bg-gradient-to-r from-[#10b981] to-[#059669] p-4 text-white shadow-sm">
          <div className="text-xl sm:text-2xl font-black tracking-tight">
            {formatMoney(cardAmount)}
          </div>
          <div className="mt-1 text-xs font-semibold text-emerald-100/90">
            {isSupplier ? "Kartlı Alış" : "Kartlı Satış"}
          </div>
        </div>
      </div>

      {/* 4. PUSULAM 7 YATAY SEKME PİLLERİ */}
      <div className="flex flex-wrap items-center gap-2 overflow-x-auto thin-scroll pb-1">
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap",
                active
                  ? "bg-[#00b49c] text-white shadow-sm"
                  : "bg-[#131b26] hover:bg-[#1a2534] text-slate-300 border border-[#233144]"
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 5. SEKME İÇERİK KUTUSU */}
      <div className="rounded-2xl border border-[#1e2a3a] bg-[#131b26] p-5 min-h-[350px] shadow-sm">
        {/* SEKME 1: ÖZET (Son Hareketler Tablosu) */}
        {activeTab === "ozet" && (
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-[#1e2a3a] pb-3">
              <h2 className="text-sm font-bold text-white tracking-wide">Son Hareketler</h2>
              <div className="text-xs text-slate-400">
                Toplam {displayRows.length} hareket bulundu
              </div>
            </div>

            {statement.isPending ? (
              <div className="space-y-2 py-8">
                <Skeleton className="h-8 w-full bg-[#16202c]" />
                <Skeleton className="h-8 w-full bg-[#16202c]" />
                <Skeleton className="h-8 w-full bg-[#16202c]" />
              </div>
            ) : displayRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-sm">
                <span>Henüz hareket yok.</span>
              </div>
            ) : (
              <div className="thin-scroll overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-[#1e2a3a] bg-[#16202c]/60 text-[11px] uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-3 py-2.5 text-left">{renderSortHeader("Tarih", "date")}</th>
                      <th className="px-3 py-2.5 text-left">{renderSortHeader("İşlem", "type")}</th>
                      <th className="hidden px-3 py-2.5 text-left md:table-cell">{renderSortHeader("Açıklama", "description")}</th>
                      <th className="px-3 py-2.5 text-right">{renderSortHeader("Borç", "debit", true)}</th>
                      <th className="px-3 py-2.5 text-right">{renderSortHeader("Alacak", "credit", true)}</th>
                      <th className="px-3 py-2.5 text-right">{renderSortHeader("Bakiye", "balance", true)}</th>
                      <th className="w-24 px-3 py-2.5 text-right font-semibold">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e2a3a]">
                    <tr className="bg-[#16202c]/30 text-slate-400 text-xs">
                      <td className="px-3 py-2 whitespace-nowrap">{formatDate(from)}</td>
                      <td className="px-3 py-2">Devreden Bakiye</td>
                      <td className="hidden md:table-cell" />
                      <td />
                      <td />
                      <td className="num px-3 py-2 text-right font-semibold text-slate-200">{formatMoney(carried)}</td>
                      <td />
                    </tr>
                    {displayRows.map((r) => (
                      <tr
                        key={`${r.kind}-${r.ref_id}`}
                        className="group cursor-pointer transition-colors hover:bg-[#1a2534]/60"
                        onClick={() => setSelectedRow(r)}
                      >
                        <td className="px-3 py-2.5 whitespace-nowrap text-slate-300 font-medium">
                          {formatDate(r.entry_date)}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="font-semibold text-white">
                            {DOC_TYPES[r.ref_type as DocType]?.label ?? TYPE_LABELS[r.ref_type] ?? "Açılış"}
                          </div>
                          {r.number && <div className="text-[11px] text-slate-400">{r.number}</div>}
                        </td>
                        <td className="hidden px-3 py-2.5 text-slate-300 md:table-cell text-xs">
                          {r.description !== r.number ? r.description : ""}
                          {r.due_date && <span className="ml-1 text-[11px] text-slate-500">(vade: {formatDate(r.due_date)})</span>}
                        </td>
                        <td className="num px-3 py-2.5 text-right font-medium text-slate-200">
                          {Number(r.debit) ? formatMoney(r.debit) : ""}
                        </td>
                        <td className="num px-3 py-2.5 text-right font-medium text-slate-200">
                          {Number(r.credit) ? formatMoney(r.credit) : ""}
                        </td>
                        <td className={cn("num px-3 py-2.5 text-right font-bold", Number(r.balance) < 0 ? "text-rose-400" : "text-emerald-400")}>
                          {formatMoney(r.balance)}
                        </td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100">
                            {r.kind === "document" && (
                              <button
                                type="button"
                                className="h-7 w-7 rounded-lg border border-[#233144] bg-[#16202c] text-slate-300 hover:text-white flex items-center justify-center transition"
                                title="Belge Önizle / Yazdır"
                                onClick={() => {
                                  const d = (docs.data ?? []).find((x) => x.id === r.ref_id);
                                  if (d) setPrintDoc(d);
                                  else setSelectedRow(r);
                                }}
                              >
                                <Printer className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              className="h-7 w-7 rounded-lg border border-[#233144] bg-[#16202c] text-slate-300 hover:text-white flex items-center justify-center transition"
                              title="Detay"
                              onClick={() => setSelectedRow(r)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            {canWrite && r.kind !== "opening" && (
                              <button
                                type="button"
                                className="h-7 w-7 rounded-lg border border-rose-900/40 bg-rose-950/20 text-rose-400 hover:bg-rose-900/40 flex items-center justify-center transition"
                                title="Sil"
                                onClick={() => handleDeleteRow(r)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* SEKME 2: SATIŞLAR veya ALIŞLAR */}
        {activeTab === "faturalar" && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-[#1e2a3a] pb-3">
              <h2 className="text-sm font-bold text-white tracking-wide">
                {isSupplier ? "Alış Belgeleri ve Faturalar" : "Satış Belgeleri ve Faturalar"}
              </h2>
              <Link
                href={isSupplier ? `/giderler/alis-faturalari/yeni?cari=${c.id}` : `/satislar/faturalar/yeni?cari=${c.id}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#00b49c] hover:bg-[#009e89] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition"
              >
                <Plus className="size-3.5" />
                <span>Yeni {isSupplier ? "Alış Faturası" : "Satış Faturası"}</span>
              </Link>
            </div>

            {docs.isPending ? (
              <Skeleton className="h-40 bg-[#16202c]" />
            ) : (docs.data ?? []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-sm">
                <span>Henüz kayıtlı fatura veya belge yok.</span>
              </div>
            ) : (
              <div className="thin-scroll overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-[#1e2a3a] bg-[#16202c]/60 text-[11px] uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-3 py-2.5 text-left">Tarih</th>
                      <th className="px-3 py-2.5 text-left">Belge No</th>
                      <th className="px-3 py-2.5 text-left">Tür</th>
                      <th className="px-3 py-2.5 text-left">Vade</th>
                      <th className="px-3 py-2.5 text-left">Durum</th>
                      <th className="px-3 py-2.5 text-right">Tutar</th>
                      <th className="px-3 py-2.5 text-right">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e2a3a]">
                    {(docs.data ?? []).map((d) => (
                      <tr
                        key={d.id}
                        className="group cursor-pointer hover:bg-[#1a2534]/60 transition"
                        onClick={() => setPrintDoc(d)}
                      >
                        <td className="px-3 py-2.5 text-slate-300 font-medium whitespace-nowrap">
                          {formatDate(d.issue_date)}
                        </td>
                        <td className="px-3 py-2.5 text-white font-semibold">{d.number || "Taslak"}</td>
                        <td className="px-3 py-2.5 text-slate-300 text-xs">
                          {DOC_TYPES[d.doc_type as DocType]?.label ?? d.doc_type}
                        </td>
                        <td className="px-3 py-2.5 text-slate-400 text-xs whitespace-nowrap">
                          {formatDate(d.due_date)}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={cn(
                              "inline-block rounded-md px-2 py-0.5 text-[11px] font-bold",
                              d.payment_status === "paid"
                                ? "bg-emerald-950/40 text-emerald-400 border border-emerald-800/40"
                                : d.payment_status === "partial"
                                  ? "bg-amber-950/40 text-amber-400 border border-amber-800/40"
                                  : "bg-rose-950/40 text-rose-400 border border-rose-800/40"
                            )}
                          >
                            {PAYMENT_STATUS[d.payment_status]?.label ?? "Açık"}
                          </span>
                        </td>
                        <td className="num px-3 py-2.5 text-right font-black text-white">
                          {formatMoney(d.total, d.currency)}
                        </td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setPrintDoc(d)}
                              className="rounded-lg border border-[#233144] bg-[#16202c] p-1.5 text-slate-300 hover:text-white transition"
                              title="Yazdır / Önizle"
                            >
                              <Printer className="size-3.5" />
                            </button>
                            <Link
                              href={`${DOC_TYPES[d.doc_type as DocType]?.base ?? "/satislar/faturalar"}/detay?id=${d.id}`}
                              className="rounded-lg border border-[#233144] bg-[#16202c] p-1.5 text-slate-300 hover:text-white transition"
                              title="Tam Detay Sayfası"
                            >
                              <Eye className="size-3.5" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* SEKME 3: TAHSİLATLAR veya ÖDEMELER */}
        {activeTab === "tahsilatlar" && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-[#1e2a3a] pb-3">
              <h2 className="text-sm font-bold text-white tracking-wide">
                {isSupplier ? "Ödeme Hareketleri" : "Tahsilat Hareketleri"}
              </h2>
              <Link
                href={`/nakit/hareketler/yeni?tip=${isSupplier ? "odeme" : "tahsilat"}&cari=${c.id}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#00b49c] hover:bg-[#009e89] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition"
              >
                <Plus className="size-3.5" />
                <span>Yeni {isSupplier ? "Ödeme Yap" : "Tahsilat Al"}</span>
              </Link>
            </div>

            {txns.isPending ? (
              <Skeleton className="h-40 bg-[#16202c]" />
            ) : (txns.data ?? []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-sm">
                <span>Henüz tahsilat veya ödeme kaydı yok.</span>
              </div>
            ) : (
              <div className="thin-scroll overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-[#1e2a3a] bg-[#16202c]/60 text-[11px] uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-3 py-2.5 text-left">Tarih</th>
                      <th className="px-3 py-2.5 text-left">İşlem Türü</th>
                      <th className="px-3 py-2.5 text-left">Ödeme Yöntemi</th>
                      <th className="px-3 py-2.5 text-left">Açıklama</th>
                      <th className="px-3 py-2.5 text-right">Tutar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e2a3a]">
                    {(txns.data ?? []).map((t) => (
                      <tr key={t.id} className="hover:bg-[#1a2534]/60 transition">
                        <td className="px-3 py-2.5 text-slate-300 font-medium whitespace-nowrap">
                          {formatDate(t.txn_date)}
                        </td>
                        <td className="px-3 py-2.5 text-white font-semibold">
                          {TYPE_LABELS[t.type] || t.type}
                        </td>
                        <td className="px-3 py-2.5 text-slate-400 text-xs">
                          {t.method === "card" || t.method === "pos" ? "Kredi Kartı / POS" : t.method === "bank" ? "Banka Havalesi" : "Nakit"}
                        </td>
                        <td className="px-3 py-2.5 text-slate-300 text-xs">
                          {t.description || "—"}
                        </td>
                        <td className={cn("num px-3 py-2.5 text-right font-black", t.direction === "in" ? "text-emerald-400" : "text-rose-400")}>
                          {t.direction === "in" ? "+" : "-"}{formatMoney(t.amount, t.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* SEKME 4: ÇEK & SENET */}
        {activeTab === "cek-senet" && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-[#1e2a3a] pb-3">
              <h2 className="text-sm font-bold text-white tracking-wide">Çek ve Senet Portföyü</h2>
              <Link
                href="/nakit/cek-senet"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#16202c] hover:bg-[#1f2c3d] border border-[#233144] px-3.5 py-1.5 text-xs font-bold text-slate-200 transition"
              >
                <Plus className="size-3.5" />
                <span>Çek/Senet Yönetimine Git</span>
              </Link>
            </div>

            {cheques.isPending ? (
              <Skeleton className="h-40 bg-[#16202c]" />
            ) : (cheques.data ?? []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-sm">
                <span>Henüz kayıtlı çek veya senet bulunmuyor.</span>
              </div>
            ) : (
              <div className="thin-scroll overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-[#1e2a3a] bg-[#16202c]/60 text-[11px] uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-3 py-2.5 text-left">Vade Tarihi</th>
                      <th className="px-3 py-2.5 text-left">Seri No</th>
                      <th className="px-3 py-2.5 text-left">Banka / Şube</th>
                      <th className="px-3 py-2.5 text-left">Tür</th>
                      <th className="px-3 py-2.5 text-left">Durum</th>
                      <th className="px-3 py-2.5 text-right">Tutar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e2a3a]">
                    {(cheques.data ?? []).map((ch) => (
                      <tr key={ch.id} className="hover:bg-[#1a2534]/60 transition">
                        <td className="px-3 py-2.5 text-slate-300 font-medium whitespace-nowrap">
                          {formatDate(ch.due_date)}
                        </td>
                        <td className="px-3 py-2.5 text-white font-semibold">{ch.serial_number || "—"}</td>
                        <td className="px-3 py-2.5 text-slate-300 text-xs">
                          {[ch.bank_name, ch.branch].filter(Boolean).join(" / ") || "—"}
                        </td>
                        <td className="px-3 py-2.5 text-slate-400 text-xs">
                          {ch.kind === "cheque" ? "Çek" : "Senet"}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="inline-block rounded-md border border-amber-800/40 bg-amber-950/40 px-2 py-0.5 text-[11px] font-bold text-amber-400">
                            {ch.status === "portfolio" ? "Portföyde" : ch.status === "collected" ? "Tahsil Edildi" : ch.status === "paid" ? "Ödendi" : ch.status}
                          </span>
                        </td>
                        <td className="num px-3 py-2.5 text-right font-black text-white">
                          {formatMoney(ch.amount, ch.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* SEKME 5: TEKLİFLER */}
        {activeTab === "teklifler" && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-[#1e2a3a] pb-3">
              <h2 className="text-sm font-bold text-white tracking-wide">Teklifler</h2>
              <Link
                href={`/satislar/teklifler/yeni?cari=${c.id}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#00b49c] hover:bg-[#009e89] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition"
              >
                <Plus className="size-3.5" />
                <span>Yeni Teklif Hazırla</span>
              </Link>
            </div>

            {(() => {
              const quotes = (docs.data ?? []).filter((d) => d.doc_type === "quote");
              if (quotes.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-sm">
                    <span>Henüz kayıtlı teklif bulunmuyor.</span>
                  </div>
                );
              }
              return (
                <div className="thin-scroll overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-[#1e2a3a] bg-[#16202c]/60 text-[11px] uppercase tracking-wide text-slate-400">
                      <tr>
                        <th className="px-3 py-2.5 text-left">Tarih</th>
                        <th className="px-3 py-2.5 text-left">Teklif No</th>
                        <th className="px-3 py-2.5 text-left">Geçerlilik</th>
                        <th className="px-3 py-2.5 text-left">Durum</th>
                        <th className="px-3 py-2.5 text-right">Tutar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e2a3a]">
                      {quotes.map((q) => (
                        <tr
                          key={q.id}
                          className="hover:bg-[#1a2534]/60 transition cursor-pointer"
                          onClick={() => setPrintDoc(q)}
                        >
                          <td className="px-3 py-2.5 text-slate-300 font-medium whitespace-nowrap">
                            {formatDate(q.issue_date)}
                          </td>
                          <td className="px-3 py-2.5 text-white font-semibold">{q.number || "Taslak"}</td>
                          <td className="px-3 py-2.5 text-slate-400 text-xs">{formatDate(q.due_date)}</td>
                          <td className="px-3 py-2.5">
                            <span className="inline-block rounded-md border border-cyan-800/40 bg-cyan-950/40 px-2 py-0.5 text-[11px] font-bold text-cyan-400">
                              {STATUS_LABEL[q.status] ?? q.status}
                            </span>
                          </td>
                          <td className="num px-3 py-2.5 text-right font-black text-white">
                            {formatMoney(q.total, q.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        )}

        {/* SEKME 6: BELGELER (Faturalar, İrsaliyeler, Siparişler) */}
        {activeTab === "belgeler" && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-[#1e2a3a] pb-3">
              <h2 className="text-sm font-bold text-white tracking-wide">Tüm Belgeler ve İrsaliyeler</h2>
              <div className="text-xs text-slate-400">
                Toplam {(docs.data ?? []).length} belge
              </div>
            </div>

            {(docs.data ?? []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-sm">
                <span>Henüz kayıtlı belge bulunmuyor.</span>
              </div>
            ) : (
              <div className="thin-scroll overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-[#1e2a3a] bg-[#16202c]/60 text-[11px] uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-3 py-2.5 text-left">Tarih</th>
                      <th className="px-3 py-2.5 text-left">Belge Türü</th>
                      <th className="px-3 py-2.5 text-left">Belge No</th>
                      <th className="px-3 py-2.5 text-left">Vade Tarihi</th>
                      <th className="px-3 py-2.5 text-right">Tutar</th>
                      <th className="px-3 py-2.5 text-right">Yazdır / İncele</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e2a3a]">
                    {(docs.data ?? []).map((d) => (
                      <tr
                        key={d.id}
                        className="hover:bg-[#1a2534]/60 transition cursor-pointer"
                        onClick={() => setPrintDoc(d)}
                      >
                        <td className="px-3 py-2.5 text-slate-300 font-medium whitespace-nowrap">
                          {formatDate(d.issue_date)}
                        </td>
                        <td className="px-3 py-2.5 text-white font-semibold">
                          {DOC_TYPES[d.doc_type as DocType]?.label ?? d.doc_type}
                        </td>
                        <td className="px-3 py-2.5 text-slate-400 text-xs font-mono">
                          {d.number || "Taslak"}
                        </td>
                        <td className="px-3 py-2.5 text-slate-400 text-xs whitespace-nowrap">
                          {formatDate(d.due_date)}
                        </td>
                        <td className="num px-3 py-2.5 text-right font-black text-white">
                          {formatMoney(d.total, d.currency)}
                        </td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setPrintDoc(d)}
                            className="rounded-lg border border-[#233144] bg-[#16202c] p-1.5 text-slate-300 hover:text-white transition"
                          >
                            <Printer className="size-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* SEKME 7: KART / NAKİT */}
        {activeTab === "kart-nakit" && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-[#1e2a3a] pb-3">
              <h2 className="text-sm font-bold text-white tracking-wide">Kredi Kartı ve Nakit Hareketleri</h2>
            </div>

            {(() => {
              const cardCashTxns = (txns.data ?? []).filter(
                (t) => t.method === "card" || t.method === "pos" || t.method === "cash" || t.method === "kredi_karti"
              );
              if (cardCashTxns.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-sm">
                    <span>Henüz kart veya nakit hareketi kaydedilmemiş.</span>
                  </div>
                );
              }
              return (
                <div className="thin-scroll overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-[#1e2a3a] bg-[#16202c]/60 text-[11px] uppercase tracking-wide text-slate-400">
                      <tr>
                        <th className="px-3 py-2.5 text-left">Tarih</th>
                        <th className="px-3 py-2.5 text-left">Yöntem</th>
                        <th className="px-3 py-2.5 text-left">İşlem</th>
                        <th className="px-3 py-2.5 text-left">Açıklama</th>
                        <th className="px-3 py-2.5 text-right">Tutar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e2a3a]">
                      {cardCashTxns.map((t) => (
                        <tr key={t.id} className="hover:bg-[#1a2534]/60 transition">
                          <td className="px-3 py-2.5 text-slate-300 font-medium whitespace-nowrap">
                            {formatDate(t.txn_date)}
                          </td>
                          <td className="px-3 py-2.5 text-white font-semibold">
                            {t.method === "card" || t.method === "pos" || t.method === "kredi_karti"
                              ? "💳 Kredi Kartı"
                              : "💵 Nakit"}
                          </td>
                          <td className="px-3 py-2.5 text-slate-300 text-xs">
                            {TYPE_LABELS[t.type] || t.type}
                          </td>
                          <td className="px-3 py-2.5 text-slate-400 text-xs">
                            {t.description || "—"}
                          </td>
                          <td className={cn("num px-3 py-2.5 text-right font-black", t.direction === "in" ? "text-emerald-400" : "text-rose-400")}>
                            {t.direction === "in" ? "+" : "-"}{formatMoney(t.amount, t.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* 6. MODALLER */}

      {/* Modal A: Cariyi Düzenle */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent title="Cariyi Düzenle" className="sm:max-w-2xl bg-[#131b26] border-[#1e2a3a] text-white">
          <ContactForm contact={c} onSaved={() => setEditOpen(false)} onCancel={() => setEditOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Modal B: Hesap Ekstresi Detay ve İndirme */}
      <Dialog open={ekstreModalOpen} onOpenChange={setEkstreModalOpen}>
        <DialogContent
          title={`${c.name} — Hesap Ekstresi`}
          description="Tarih aralığına göre hesap hareketlerini inceleyebilir, PDF veya Excel olarak dışa aktarabilirsiniz."
          className="sm:max-w-3xl bg-[#131b26] border-[#1e2a3a] text-white"
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-3 rounded-xl bg-[#16202c] p-3 border border-[#233144]">
              <label className="flex flex-col gap-1 text-xs text-slate-400">
                Başlangıç Tarihi
                <Input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="h-9 w-40 bg-[#131b26] border-[#233144] text-white"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-slate-400">
                Bitiş Tarihi
                <Input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="h-9 w-40 bg-[#131b26] border-[#233144] text-white"
                />
              </label>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-[#233144] bg-[#131b26] text-slate-200 hover:text-white"
                  onClick={() => handlePdf("open")}
                >
                  <Printer className="size-4" /> Yazdır / Görüntüle
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-[#233144] bg-[#131b26] text-slate-200 hover:text-white"
                  onClick={() => handlePdf("download")}
                >
                  <FileText className="size-4" /> PDF İndir
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-[#233144] bg-[#131b26] text-slate-200 hover:text-white"
                  onClick={exportStatement}
                >
                  <Download className="size-4" /> Excel
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="rounded-lg bg-[#16202c] p-2.5 border border-[#233144]">
                <div className="text-slate-400">Devreden Bakiye</div>
                <div className="num font-bold text-white mt-0.5">{formatMoney(carried)}</div>
              </div>
              <div className="rounded-lg bg-[#16202c] p-2.5 border border-[#233144]">
                <div className="text-slate-400">Dönem Borç</div>
                <div className="num font-bold text-white mt-0.5">
                  {formatMoney(rows.reduce((s, r) => s + Number(r.debit), 0))}
                </div>
              </div>
              <div className="rounded-lg bg-[#16202c] p-2.5 border border-[#233144]">
                <div className="text-slate-400">Dönem Alacak</div>
                <div className="num font-bold text-white mt-0.5">
                  {formatMoney(rows.reduce((s, r) => s + Number(r.credit), 0))}
                </div>
              </div>
              <div className="rounded-lg bg-[#16202c] p-2.5 border border-[#233144]">
                <div className="text-slate-400">Dönem Sonu Bakiye</div>
                <div className={cn("num font-bold mt-0.5", balance < 0 ? "text-rose-400" : "text-emerald-400")}>
                  {formatMoney(balance)}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal C: Borç / Alacak Kaydı Giriş Modalı */}
      <Dialog open={adjustmentOpen} onOpenChange={setAdjustmentOpen}>
        <DialogContent
          title={`Borç / Alacak Kaydı · ${c.name}`}
          description="Cari için manuel borç veya alacak dekontu girişi yapın."
          className="sm:max-w-md bg-[#131b26] border-[#1e2a3a] text-white"
        >
          <form onSubmit={handleSaveAdjustment} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAdjType("debit")}
                className={cn(
                  "py-2.5 px-3 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1",
                  adjType === "debit"
                    ? "bg-[#00b49c]/20 border-[#00b49c] text-[#00b49c]"
                    : "bg-[#16202c] border-[#233144] text-slate-400 hover:text-slate-200"
                )}
              >
                <span>Borç Kaydı</span>
                <span className="text-[10px] font-normal text-slate-400">Cariyi Borçlandır</span>
              </button>

              <button
                type="button"
                onClick={() => setAdjType("credit")}
                className={cn(
                  "py-2.5 px-3 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1",
                  adjType === "credit"
                    ? "bg-rose-500/20 border-rose-500 text-rose-400"
                    : "bg-[#16202c] border-[#233144] text-slate-400 hover:text-slate-200"
                )}
              >
                <span>Alacak Kaydı</span>
                <span className="text-[10px] font-normal text-slate-400">Cariyi Alacaklandır</span>
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Tutar (TL) *
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={adjAmount || ""}
                onChange={(e) => setAdjAmount(parseFloat(e.target.value) || 0)}
                className="bg-[#16202c] border-[#233144] text-white font-bold text-base h-10"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  İşlem Tarihi
                </label>
                <Input
                  type="date"
                  value={adjDate}
                  onChange={(e) => setAdjDate(e.target.value)}
                  className="bg-[#16202c] border-[#233144] text-white text-xs h-10"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Kasa / Banka Hesabı
                </label>
                <select
                  value={adjAccountId}
                  onChange={(e) => setAdjAccountId(e.target.value)}
                  className="w-full h-10 rounded-md border border-[#233144] bg-[#16202c] px-3 text-xs text-white"
                >
                  <option value="">Varsayılan Kasa/Banka</option>
                  {(accountsQuery.data ?? []).map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.currency})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Açıklama
              </label>
              <Input
                type="text"
                placeholder="Örn: Fiyat farkı, mutabakat dekontu..."
                value={adjDesc}
                onChange={(e) => setAdjDesc(e.target.value)}
                className="bg-[#16202c] border-[#233144] text-white text-xs h-10"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                className="text-slate-400 hover:text-white"
                onClick={() => setAdjustmentOpen(false)}
              >
                Vazgeç
              </Button>
              <Button
                type="submit"
                disabled={adjSaving || adjAmount <= 0}
                className="bg-[#00b49c] hover:bg-[#009e89] text-white font-bold"
              >
                {adjSaving ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal D: Seçili Hareket İşlem Pop-up */}
      <Dialog open={!!selectedRow} onOpenChange={(o) => !o && setSelectedRow(null)}>
        <DialogContent
          title={
            selectedRow?.kind === "opening"
              ? "Açılış Bakiyesi"
              : `${(selectedRow && (DOC_TYPES[selectedRow.ref_type as DocType]?.label ?? TYPE_LABELS[selectedRow.ref_type])) || "Hareket İşlemi"} ${selectedRow?.number ? `· ${selectedRow.number}` : ""}`
          }
          description="Bu hareket üzerinde detay görüntüleme veya silme işlemi yapabilirsiniz."
          className="sm:max-w-md bg-[#131b26] border-[#1e2a3a] text-white"
        >
          <div className="space-y-4">
            <div className="space-y-2 rounded-xl bg-[#16202c] p-3.5 text-xs border border-[#233144]">
              <div className="flex justify-between">
                <span className="text-slate-400">İşlem Tarihi:</span>
                <span className="font-semibold text-white">{selectedRow && formatDate(selectedRow.entry_date)}</span>
              </div>
              {selectedRow?.due_date && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Vade Tarihi:</span>
                  <span className="font-semibold text-white">{formatDate(selectedRow.due_date)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-[#233144] pt-1.5">
                <span className="text-slate-400">İşlem Türü:</span>
                <span className="font-semibold text-white">
                  {selectedRow?.kind === "opening"
                    ? "Açılış"
                    : selectedRow?.kind === "document"
                      ? (DOC_TYPES[selectedRow.ref_type as DocType]?.label ?? selectedRow.ref_type)
                      : (TYPE_LABELS[selectedRow?.ref_type ?? ""] ?? "Nakit/Banka Hareketi")}
                </span>
              </div>
              <div className="flex justify-between border-t border-[#233144] pt-1.5">
                <span className="text-slate-400">Tutar:</span>
                <span className={cn("num font-bold text-sm", Number(selectedRow?.debit) > 0 ? "text-emerald-400" : "text-rose-400")}>
                  {selectedRow && (Number(selectedRow.debit) > 0 ? `+${formatMoney(selectedRow.debit)} (Borç)` : `-${formatMoney(selectedRow.credit)} (Alacak)`)}
                </span>
              </div>
              {selectedRow?.description && selectedRow.description !== selectedRow.number && (
                <div className="flex justify-between border-t border-[#233144] pt-1.5">
                  <span className="text-slate-400">Açıklama:</span>
                  <span className="font-medium text-slate-200">{selectedRow.description}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 pt-2">
              {selectedRow?.kind === "document" && (
                <Button
                  className="w-full justify-center gap-2 font-bold bg-[#00b49c] hover:bg-[#009e89] text-white"
                  onClick={() => {
                    const doc = (docs.data ?? []).find((d) => d.id === selectedRow?.ref_id);
                    if (doc) {
                      setSelectedRow(null);
                      setPrintDoc(doc);
                    } else {
                      router.push(`${DOC_TYPES[selectedRow.ref_type as DocType]?.base ?? "/satislar/faturalar"}/detay?id=${selectedRow.ref_id}`);
                    }
                  }}
                >
                  <Printer className="size-4" /> Belgeyi Önizle ve Yazdır
                </Button>
              )}

              {canWrite && selectedRow?.kind !== "opening" && (
                <Button
                  variant="danger"
                  className="justify-center gap-2 font-bold bg-rose-600 hover:bg-rose-700 text-white"
                  onClick={() => {
                    if (selectedRow) handleDeleteRow(selectedRow);
                  }}
                >
                  <Trash2 className="size-4" /> Hareketi Sil
                </Button>
              )}

              <Button
                variant="ghost"
                className="w-full justify-center text-slate-400 hover:text-white"
                onClick={() => setSelectedRow(null)}
              >
                Kapat
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal E: Belge Önizleme ve Yazdırma (DocumentPrintModal) */}
      {printDoc && (
        <DocumentPrintModal
          open={!!printDoc}
          onOpenChange={(v) => !v && setPrintDoc(null)}
          doc={printDoc as any}
          org={org}
          contactPhone={c.phone || c.mobile || undefined}
        />
      )}
    </div>
  );
}
