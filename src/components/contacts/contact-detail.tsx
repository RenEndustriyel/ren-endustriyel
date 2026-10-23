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
  Sparkles,
  ListTree,
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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { formatDate, formatMoney, isoDate, formatNumber } from "@/lib/format";
import { exportExcel } from "@/lib/excel";
import { DOC_TYPES, PAYMENT_STATUS, docFlow, statusLabel, type DocType } from "@/lib/doc-types";
import { PaymentDialog } from "@/components/cash/payment-dialog";
import { ContactPaymentDialog } from "@/components/cash/contact-payment-dialog";
import { TYPE_LABELS } from "@/components/dashboard/types";
import { reconcileContactAllocations } from "@/lib/reconcile-allocations";
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
import { TransactionEditDialog, txnEditBlock } from "@/components/cash/transaction-edit-dialog";
import { SupplierInsights } from "./supplier-insights";
import { OpeningBalanceDialog } from "./opening-balance-dialog";
import { CustomerInsights } from "./customer-insights";

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
    "ozet" | "analiz" | "faturalar" | "tahsilatlar" | "cek-senet" | "teklifler" | "belgeler" | "kart-nakit"
  >("ozet");

  // Modallar
  const [editOpen, setEditOpen] = React.useState(false);
  const [ekstreModalOpen, setEkstreModalOpen] = React.useState(false);
  const [withLines, setWithLines] = React.useState(true);
  const [adjustmentOpen, setAdjustmentOpen] = React.useState(false);
  const [selectedRow, setSelectedRow] = React.useState<StatementRow | null>(null);
  const [printDoc, setPrintDoc] = React.useState<Row<"documents"> | null>(null);
  // Önizle: belge listede yoksa veritabanından çekilir, yine doğrudan önizleme açılır
  const openDocPreview = async (docId: string | null | undefined) => {
    if (!docId) return;
    const found = (docs.data ?? []).find((x) => x.id === docId);
    if (found) return setPrintDoc(found);
    const { data, error } = await supabase
      .from("documents")
      .select("*, contact:contacts(name, phone, email), lines:document_lines(*)")
      .eq("id", docId)
      .maybeSingle();
    if (error || !data) return void toast.error("Belge bulunamadı");
    setPrintDoc(data as never);
  };
  const [editTxn, setEditTxn] = React.useState<Row<"transactions"> | null>(null);
  const [payDoc, setPayDoc] = React.useState<Row<"documents"> | null>(null);
  const [payFlow, setPayFlow] = React.useState<"in" | "out" | null>(null);
  const [openingOpen, setOpeningOpen] = React.useState(false);
  // Satışlar / Alışlar sekmesi: tarih filtresi
  const [docPeriod, setDocPeriod] = React.useState<"all" | "month" | "lastmonth" | "year" | "custom">("all");
  const [docFrom, setDocFrom] = React.useState(isoDate().slice(0, 7) + "-01");
  const [docTo, setDocTo] = React.useState(isoDate());

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

  const yearStart = `${new Date().getFullYear()}-01-01`;
  const yearProfit = useRpcQuery<{ key: string | null; net: number; profit: number }[]>(
    "report_sales",
    { p_org: org?.id, p_from: yearStart, p_to: isoDate(), p_group: "contact" },
    { enabled: !!org?.id },
  );

  const cheques = useRows<Row<"cheques">>("cheques", {
    params: ["contact_cheques", id],
    filter: (q) => q.eq("contact_id", id),
    order: [{ column: "due_date", ascending: false }],
  });

  // Sayfa açıldığında veya cari değiştiğinde yapay mahsupları temizle ve katı FIFO'yu senkronize et
  React.useEffect(() => {
    if (!org?.id || !id) return;
    reconcileContactAllocations(org.id, id)
      .then(() => {
        qc.invalidateQueries({ queryKey: ["contact_statement"] });
        qc.invalidateQueries({ queryKey: ["contact_docs"] });
        qc.invalidateQueries({ queryKey: ["contact_txns"] });
      })
      .catch((err) => {
        console.warn("Cari mutabakat eşitleme hatası:", err);
      });
  }, [org?.id, id, qc]);

  // Ekstre hesaplamaları ve birleştirme (Yapay mahsuplar hariç ne ise o görünür)
  const all = React.useMemo(() => {
    const raw = (statement.data ?? [])
      .filter((r) => {
        const num = r.number ?? "";
        const desc = r.description ?? "";
        if (
          num.startsWith("oto-mahsup") ||
          num.includes("oto-mahsup") ||
          desc.includes("Otomatik mahsup") ||
          desc.includes("oto-mahsup")
        ) {
          return false;
        }
        return true;
      })
      .map((r) => ({ ...r }));
    const hasOrders = raw.some((r) => r.ref_type === "sales_order" || r.ref_type === "purchase_order");
    const orders = hasOrders
      ? []
      : (docs.data ?? []).filter(
          (d) =>
            (d.doc_type === "sales_order" || d.doc_type === "purchase_order") &&
            d.status !== "draft" &&
            d.status !== "cancelled" &&
            d.status !== "converted"
        );

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

    // Aynı günde önce açılış, sonra belgeler (fatura), sonra tahsilat/ödeme — peşin faturada ikisi aynı anda kaydedilir
    const rank = (k: string) => (k === "opening" ? 0 : k === "document" ? 1 : 2);
    const order = new Map(merged.map((r, i) => [r, i]));
    merged.sort((a, b) => a.entry_date.localeCompare(b.entry_date) || rank(a.kind) - rank(b.kind) || order.get(a)! - order.get(b)!);
    let runBal = 0;
    for (const r of merged) {
      runBal += Number(r.debit) - Number(r.credit);
      r.balance = Math.round(runBal * 100) / 100;
    }
    return merged;
  }, [statement.data, docs.data]);

  const c = contact.data;

  // Strict FIFO: Carinin açık belgelerine yapılan tahsilat ve ödemelerin
  // en eskiden yeniye doğru (strictly sequential) hesaplanması.
  // Bir faturayı %100 kapatmadan asla sonrakine geçmez -> Asla 2 kısmi olamaz.
  const fifoMap = React.useMemo(() => {
    const map = new Map<string, { paid: number; remaining: number; status: "paid" | "partial" | "unpaid" }>();
    if (!docs.data) return map;

    const openingBal = Number(c?.opening_balance || 0);
    const validDocs = (docs.data ?? [])
      .filter((d) => {
        const cfg = DOC_TYPES[d.doc_type as DocType];
        return cfg?.payable && d.status !== "draft" && d.status !== "cancelled";
      })
      .sort((a, b) => (a.issue_date || "").localeCompare(b.issue_date || "") || (a.created_at || "").localeCompare(b.created_at || ""));

    const validTxns = (txns.data ?? [])
      .filter((t) => {
        if (Number(t.amount) <= 0) return false;
        const ref = t.reference ?? "";
        const desc = t.description ?? "";
        if (ref.startsWith("oto-mahsup") || ref.includes("oto-mahsup") || desc.includes("Otomatik mahsup") || desc.includes("oto-mahsup")) {
          return false;
        }
        return true;
      })
      .sort((a, b) => (a.txn_date || "").localeCompare(b.txn_date || "") || (a.created_at || "").localeCompare(b.created_at || ""));

    for (const flow of ["in", "out"] as const) {
      const flowDocs = validDocs.filter((d) => docFlow(d.doc_type as DocType) === flow);
      const flowTxns = validTxns.filter((t) => t.direction === flow).map((t) => ({ ...t, avail: Number(t.amount) }));

      let reserve = flow === "in" ? Math.max(0, openingBal) : Math.max(0, -openingBal);
      for (const t of flowTxns) {
        if (reserve <= 0.009) break;
        const take = Math.min(t.avail, reserve);
        t.avail = Math.round((t.avail - take) * 100) / 100;
        reserve = Math.round((reserve - take) * 100) / 100;
      }

      let txnIdx = 0;
      for (const doc of flowDocs) {
        const docTotal = Number(doc.total || 0);
        let needed = docTotal;

        while (needed > 0.009 && txnIdx < flowTxns.length) {
          const txn = flowTxns[txnIdx];
          if (txn.avail <= 0.009) {
            txnIdx++;
            continue;
          }
          const pay = Math.round(Math.min(needed, txn.avail) * 100) / 100;
          needed = Math.round((needed - pay) * 100) / 100;
          txn.avail = Math.round((txn.avail - pay) * 100) / 100;
          if (txn.avail <= 0.009) {
            txnIdx++;
          }
        }

        const paid = Math.max(0, Math.round((docTotal - needed) * 100) / 100);
        const rem = Math.max(0, Math.round((docTotal - paid) * 100) / 100);
        const status: "paid" | "partial" | "unpaid" =
          rem <= 0.009 ? "paid" : paid > 0.009 ? "partial" : "unpaid";
        map.set(doc.id, { paid, remaining: rem, status });
      }
    }
    return map;
  }, [docs.data, txns.data, c?.opening_balance]);

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
    const seq = new Map(rows.map((r, i) => [r, i]));
    return [...rows].sort((a, b) => {
      if (sortField === "date") {
        const r = seq.get(a)! - seq.get(b)!;
        return sortDir === "asc" ? r : -r;
      }
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
        <Skeleton className="h-10 w-48 bg-slate-50 dark:bg-[#16202c]" />
        <Skeleton className="h-36 rounded-2xl bg-white dark:bg-[#131b26]" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <Skeleton className="h-24 rounded-xl bg-white dark:bg-[#131b26]" />
          <Skeleton className="h-24 rounded-xl bg-white dark:bg-[#131b26]" />
          <Skeleton className="h-24 rounded-xl bg-white dark:bg-[#131b26]" />
          <Skeleton className="h-24 rounded-xl bg-white dark:bg-[#131b26]" />
        </div>
      </div>
    );
  }

  if (!c) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-[#1e2a3a] bg-white dark:bg-[#131b26] p-12 text-center text-slate-700 dark:text-slate-300">
        <AlertCircle className="mx-auto mb-3 size-10 text-rose-600 dark:text-rose-400" />
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Cari kartı bulunamadı</h3>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Bu cari silinmiş veya ID geçersiz olabilir.</p>
        <Button
          variant="outline"
          className="mt-4 border-slate-300 dark:border-[#233144] bg-slate-50 dark:bg-[#16202c] text-slate-800 dark:text-slate-200"
          onClick={() => router.back()}
        >
          Geri Dön
        </Button>
      </div>
    );
  }

  // Tedarikçi görünümü: kart türü tedarikçi ya da bu cariyle yalnızca alış yapılmış (müşteri olarak açılmış tedarikçiler)
  const hasPurchaseDocs = (docs.data ?? []).some((d) => d.doc_type.startsWith("purchase"));
  const hasSalesDocs = (docs.data ?? []).some((d) => d.doc_type.startsWith("sales") || d.doc_type === "pos_sale" || d.doc_type === "quote");
  const isSupplier = c.kind === "supplier" || (hasPurchaseDocs && !hasSalesDocs);
  const balance = Number(balances.data?.find((b) => b.contact_id === id)?.balance ?? c.opening_balance ?? 0);
  const isSettled = Math.abs(balance) <= 0.009;
  const hasNoDebt = isSupplier ? balance >= -0.009 : balance <= 0.009;
  const openDocs = (docs.data ?? []).filter((d) => d.payment_status === "unpaid" || d.payment_status === "partial");
  const openDocsTotal = openDocs.reduce(
    (acc, d) => acc + (Number(d.total) - Number(d.paid_amount || 0)) * Number(d.exchange_rate || 1),
    0
  );
  const effectiveOpenDocsTotal = isSettled ? 0 : openDocsTotal;

  // Cari kart metrikleri (TL): taslak / iptal / sipariş hariç, iadeler düşülür
  const today = isoDate();
  const live = (docs.data ?? []).filter((d) => d.status !== "draft" && d.status !== "cancelled");
  const tl = (d: Row<"documents">) => Number(d.total_try ?? Number(d.total) * Number(d.exchange_rate || 1));
  const mainTypes = isSupplier ? ["purchase_invoice"] : ["sales_invoice", "pos_sale"];
  const returnType = isSupplier ? "purchase_return" : "sales_return";
  const mainDocs = live.filter((d) => mainTypes.includes(d.doc_type));
  const totalSalesOrPurchases =
    mainDocs.reduce((acc, d) => acc + tl(d), 0) - live.filter((d) => d.doc_type === returnType).reduce((acc, d) => acc + tl(d), 0);
  const thisYearTotal = mainDocs.filter((d) => d.issue_date >= yearStart).reduce((acc, d) => acc + tl(d), 0);

  const flowTxns = (txns.data ?? []).filter((t) =>
    isSupplier ? t.direction === "out" && t.type === "payment" : t.direction === "in" && t.type === "collection",
  );
  const totalCollectedOrPaid = flowTxns.reduce((acc, t) => acc + Number(t.amount_try ?? t.amount ?? 0), 0);
  // Hem müşteri hem tedarikçi: karşı yöndeki satış/alış ve tahsilat/ödeme (kutuda ikinci satır)
  const otherTypes = isSupplier ? ["sales_invoice", "pos_sale"] : ["purchase_invoice"];
  const otherTotal = live.filter((d) => otherTypes.includes(d.doc_type)).reduce((acc, d) => acc + tl(d), 0);
  const otherFlow = (txns.data ?? [])
    .filter((t) => (isSupplier ? t.direction === "in" && t.type === "collection" : t.direction === "out" && t.type === "payment"))
    .reduce((acc, t) => acc + Number(t.amount_try ?? t.amount ?? 0), 0);
  const lastFlow = flowTxns.reduce<string | null>((m, t) => (!m || t.txn_date > m ? t.txn_date : m), null);

  // Vadesi geçen açık belgeler
  const overdueDocs = openDocs.filter((d) => d.due_date && d.due_date < today && d.status !== "draft" && d.status !== "cancelled");
  const overdueTotal = overdueDocs.reduce((acc, d) => acc + (Number(d.total) - Number(d.paid_amount || 0)) * Number(d.exchange_rate || 1), 0);
  const effectiveOverdueTotal = hasNoDebt ? 0 : overdueTotal;
  const oldestDue = overdueDocs.reduce<string | null>((m, d) => (!m || d.due_date! < m ? d.due_date! : m), null);
  const daysSince = (iso: string) => Math.max(0, Math.round((Date.parse(today) - Date.parse(iso)) / 864e5));

  const profitRow = (yearProfit.data ?? []).find((r) => r.key === id);
  const lastDoc = mainDocs.reduce<string | null>((m, d) => (!m || d.issue_date > m ? d.issue_date : m), null);

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

  const exportStatement = async () => {
    type LineRow = { entry_date: string; number: string | null; name: string; quantity: number; unit: string | null; unit_price: number; discount_rate: number; vat_rate: number; total: number };
    let lineRows: LineRow[] = [];
    if (withLines) {
      try {
        const map = await fetchStatementLines();
        lineRows = rows.flatMap((r) => (r.kind === "document" && r.ref_id ? (map.get(r.ref_id) ?? []).map((l) => ({ entry_date: r.entry_date, number: r.number, ...l })) : []));
      } catch (e) {
        toast.error("Ürün detayları alınamadı: " + (e as Error).message);
      }
    }
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
          {
            header: "Ödeme Durumu",
            value: (r) => {
              if (r.kind !== "document") return "";
              const doc = (docs.data ?? []).find((d) => d.id === r.ref_id);
              if (!doc || !DOC_TYPES[doc.doc_type as DocType]?.payable) return "";
              const fifo = fifoMap.get(doc.id);
              if (fifo) {
                if (fifo.status === "paid") return "Ödendi";
                if (fifo.status === "partial") return `Kısmi Ödendi (Kalan: ${formatMoney(fifo.remaining, doc.currency)})`;
                return "Ödenmedi";
              }
              const tot = Number(doc.total || 0);
              const pd = Number(doc.paid_amount || 0);
              if (doc.payment_status === "paid" || (tot > 0 && pd >= tot - 0.009)) return "Ödendi";
              if (doc.payment_status === "partial" || pd > 0.009) return `Kısmi Ödendi (Kalan: ${formatMoney(tot - pd, doc.currency)})`;
              return "Ödenmedi";
            },
          },
          { header: "Borç", value: (r) => Number(r.debit), type: "money" },
          { header: "Alacak", value: (r) => Number(r.credit), type: "money" },
          { header: "Bakiye", value: (r) => Number(r.balance), type: "money" },
        ],
      },
      ...((lineRows.length
        ? [
            {
              name: "Ürün Detayı",
              title: `${c.name} — Ekstre Ürün Detayı (${formatDate(from)} - ${formatDate(to)})`,
              rows: lineRows,
              columns: [
                { header: "Tarih", value: (r: LineRow) => r.entry_date, type: "date" as const },
                { header: "Belge no", value: (r: LineRow) => r.number },
                { header: "Ürün", value: (r: LineRow) => r.name, width: 40 },
                { header: "Miktar", value: (r: LineRow) => r.quantity, type: "number" as const },
                { header: "Birim", value: (r: LineRow) => r.unit },
                { header: "Birim Fiyat", value: (r: LineRow) => r.unit_price, type: "money" as const },
                { header: "İskonto %", value: (r: LineRow) => r.discount_rate, type: "number" as const },
                { header: "KDV %", value: (r: LineRow) => r.vat_rate, type: "number" as const },
                { header: "Tutar", value: (r: LineRow) => r.total, type: "money" as const },
              ],
            },
          ]
          : []) as never[]),
    ]);
  };

  // Ekstredeki belgelerin ürün kalemleri (detaylı ekstre için)
  const fetchStatementLines = async (src: { kind?: string | null; ref_id?: string | null }[] = rows) => {
    const ids = [...new Set(src.filter((r) => r.kind === "document" && r.ref_id).map((r) => r.ref_id as string))].sort();
    const map = new Map<string, { name: string; quantity: number; unit: string | null; unit_price: number; discount_rate: number; vat_rate: number; total: number }[]>();
    for (let i = 0; i < ids.length; i += 150) {
      const part = ids.slice(i, i + 150);
      const res = await supabase.from("document_lines").select("*, unit:units(name)").in("document_id", part);
      if (res.error) throw res.error;
      const list = ((res.data ?? []) as Record<string, any>[]).filter((l) => !l.deleted_at);
      list.sort((a, b) => Number(a.position ?? a.sort_order ?? a.line_no ?? 0) - Number(b.position ?? b.sort_order ?? b.line_no ?? 0));
      for (const l of list) {
        const name = l.description || l.product_name;
        if (!name) continue;
        const arr = map.get(l.document_id) ?? [];
        arr.push({
          name,
          quantity: Number(l.quantity) || 0,
          unit: l.unit?.name ?? l.unit_name ?? null,
          unit_price: Number(l.unit_price) || 0,
          discount_rate: Number(l.discount_rate) || 0,
          vat_rate: Number(l.vat_rate) || 0,
          total: Number(l.total_amount ?? l.total ?? 0),
        });
        map.set(l.document_id, arr);
      }
    }
    return map;
  };

  // Ekrandaki ekstre: faturaların altında ürünler
  const [detailed, setDetailed] = React.useState(false);
  const screenDocIds = displayRows.filter((r) => r.kind === "document" && r.ref_id).map((r) => r.ref_id as string).sort().join(",");
  const screenLines = useQuery({
    queryKey: ["ekstre_kalemleri", id, screenDocIds],
    enabled: detailed && !!screenDocIds,
    queryFn: () => fetchStatementLines(displayRows),
  });

  const handlePdf = async (mode: "download" | "open") => {
    let pdfRows: (typeof rows[number] & { lines?: { name: string; quantity: number; unit: string | null; unit_price: number; discount_rate: number; vat_rate: number; total: number }[] })[] = rows;
    if (withLines) {
      try {
        const map = await fetchStatementLines();
        pdfRows = rows.map((r) => (r.kind === "document" && r.ref_id ? { ...r, lines: map.get(r.ref_id) } : r));
      } catch (e) {
        toast.error("Ürün detayları alınamadı: " + (e as Error).message);
      }
    }
    const { shareStatementPdf } = await import("@/lib/pdf/share");
    await shareStatementPdf({ org: org!, contact: c, rows: pdfRows as never, carried, from, to, mode });
  };

  /** Kalan tutarı olan, ödemesi yapılabilir belge (satış → tahsilat, alış → ödeme) */
  const payableDoc = (docId: string) => {
    const d = (docs.data ?? []).find((x) => x.id === docId);
    if (!d || !DOC_TYPES[d.doc_type as DocType]?.payable || d.status === "draft" || d.status === "cancelled") return null;
    const fifo = fifoMap.get(docId);
    const rem = fifo ? fifo.remaining : Number(d.total) - Number(d.paid_amount || 0);
    return rem > 0.004 ? d : null;
  };
  /** Satışlar / Alışlar sekmesi için seçilen tarih aralığı (null = tümü) */
  const docRange = ((): [string, string] | null => {
    const t = new Date();
    const p2 = (x: number) => String(x).padStart(2, "0");
    const ymd = (x: Date) => x.getFullYear() + "-" + p2(x.getMonth() + 1) + "-" + p2(x.getDate());
    if (docPeriod === "month") return [ymd(new Date(t.getFullYear(), t.getMonth(), 1)), ymd(t)];
    if (docPeriod === "lastmonth") return [ymd(new Date(t.getFullYear(), t.getMonth() - 1, 1)), ymd(new Date(t.getFullYear(), t.getMonth(), 0))];
    if (docPeriod === "year") return [t.getFullYear() + "-01-01", ymd(t)];
    if (docPeriod === "custom") return [docFrom || "0000-01-01", docTo || "9999-12-31"];
    return null;
  })();
  const docList = (docs.data ?? []).filter((d) => !docRange || (d.issue_date >= docRange[0] && d.issue_date <= docRange[1]));
  const docEditHref = (type: string, docId: string) => `${DOC_TYPES[type as DocType]?.base ?? "/satislar/faturalar"}/duzenle?id=${docId}`;
  const openTxnEdit = (txnId: string) => {
    const t = (txns.data ?? []).find((x) => x.id === txnId);
    if (!t) return toast.error("Hareket bulunamadı, sayfayı yenileyin.");
    const block = txnEditBlock(t);
    if (block) return toast.info(block);
    setEditTxn(t);
  };
  const handleEditRow = (r: StatementRow) => {
    setSelectedRow(null);
    if (r.kind === "opening") setOpeningOpen(true);
    else if (r.kind === "document") router.push(docEditHref(r.ref_type, r.ref_id));
    else if (r.kind === "transaction") openTxnEdit(r.ref_id);
  };
  const refreshAfterEdit = () =>
    Promise.all([
      statement.refetch(),
      docs.refetch(),
      txns.refetch(),
      balances.refetch(),
      qc.invalidateQueries({ queryKey: ["contact_statement"] }),
      qc.invalidateQueries({ queryKey: ["contact_balances"] }),
      qc.invalidateQueries({ queryKey: ["dashboard_summary"] }),
    ]);

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

  const [reconciling, setReconciling] = React.useState(false);

  const handleAutoReconcile = async () => {
    if (!org?.id || !id) return;
    setReconciling(true);
    try {
      const count = await reconcileContactAllocations(org.id, id);
      await Promise.all([
        statement.refetch(),
        docs.refetch(),
        txns.refetch(),
        balances.refetch(),
        qc.invalidateQueries({ queryKey: ["rows", "documents"] }),
        qc.invalidateQueries({ queryKey: ["rows", "transactions"] }),
        qc.invalidateQueries({ queryKey: ["contact_statement"] }),
      ]);
      if (count > 0) {
        toast.success("Eşleştirme Tamamlandı", {
          description: `${count} tahsilat/ödeme en eski açık faturalarla (FIFO) eşleştirildi.`,
        });
      } else {
        toast.info("Tüm açık faturalar ve tahsilatlar zaten güncel ve eşleşmiş durumda.");
      }
    } catch (err: any) {
      toast.error("Eşleştirme hatası: " + (err?.message || ""));
    } finally {
      setReconciling(false);
    }
  };

  // Açılışta bu carinin bağlanmamış tahsilat ve ödemelerini en eski açık faturalara bağla
  React.useEffect(() => {
    if (!org?.id || !id) return;
    reconcileContactAllocations(org.id, id)
      .then((count) => {
        if (count > 0) {
          statement.refetch();
          docs.refetch();
          txns.refetch();
          balances.refetch();
        }
      })
      .catch(() => {});
  }, [org?.id, id]);

  const renderSortHeader = (label: string, field: "date" | "type" | "description" | "debit" | "credit" | "balance", alignRight?: boolean) => (
    <button
      type="button"
      onClick={() => handleSort(field)}
      className={cn(
        "inline-flex items-center gap-1.5 font-semibold transition-colors hover:text-slate-900 dark:hover:text-white select-none",
        sortField === field ? "text-[#00b49c] font-bold" : "text-slate-600 dark:text-slate-400",
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
    { id: "analiz", label: "Analiz" },
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
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-[#233144] bg-white dark:bg-[#131b26] px-3.5 py-1.5 text-sm font-medium text-slate-800 dark:text-slate-200 shadow-sm transition hover:bg-slate-100 dark:hover:bg-[#1a2534]"
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
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-[#233144] bg-slate-50 dark:bg-[#16202c] px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-[#1f2c3d]"
          >
            <Pencil className="size-3.5 text-slate-600 dark:text-slate-400" />
            <span>Düzenle</span>
          </button>

          {/* Ekstre */}
          <button
            type="button"
            onClick={() => setEkstreModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-[#233144] bg-slate-50 dark:bg-[#16202c] px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-[#1f2c3d]"
          >
            <FileText className="size-3.5 text-slate-600 dark:text-slate-400" />
            <span>Ekstre</span>
          </button>

          {/* Fatura / Satış (Müşteri) veya Fatura / Alış (Tedarikçi) */}
          <Link
            href={isSupplier ? `/giderler/alis-faturalari/yeni?cari=${c.id}` : `/satislar/faturalar/yeni?cari=${c.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-[#233144] bg-slate-50 dark:bg-[#16202c] px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-[#1f2c3d]"
          >
            <ShoppingCart className="size-3.5 text-slate-600 dark:text-slate-400" />
            <span>{isSupplier ? "Fatura / Alış" : "Fatura / Satış"}</span>
          </Link>

          {/* İade Al (Müşteri) veya İade Et (Tedarikçi) */}
          <Link
            href={isSupplier ? `/giderler/iadeler/yeni?cari=${c.id}` : `/satislar/iadeler/yeni?cari=${c.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 dark:border-rose-900/40 bg-slate-50 dark:bg-[#16202c] px-3 py-1.5 text-xs sm:text-sm font-medium text-rose-600 dark:text-rose-400 transition hover:bg-rose-50 dark:hover:bg-rose-950/30"
          >
            <RotateCcw className="size-3.5 text-rose-600 dark:text-rose-400" />
            <span>{isSupplier ? "İade Et" : "İade Al"}</span>
          </Link>

          {/* Müşteriden Alım (Müşteri) veya Tedarikçiye Satış (Tedarikçi) */}
          <Link
            href={isSupplier ? `/satislar/faturalar/yeni?cari=${c.id}` : `/giderler/alis-faturalari/yeni?cari=${c.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-[#233144] bg-slate-50 dark:bg-[#16202c] px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-[#1f2c3d]"
          >
            <Scale className="size-3.5 text-slate-600 dark:text-slate-400" />
            <span>{isSupplier ? "Tedarikçiye Satış" : "Müşteriden Alım"}</span>
          </Link>

          {/* Tahsilat Al (Müşteri) veya Ödeme Yap (Tedarikçi) -> Yeşil Vurgulu Buton */}
          <button
            type="button"
            onClick={() => setPayFlow(isSupplier ? "out" : "in")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#00b49c] hover:bg-[#009e89] px-4 py-1.5 text-xs sm:text-sm font-bold text-white shadow-sm transition"
          >
            <Coins className="size-4" />
            <span>{isSupplier ? "Ödeme Yap" : "Tahsilat Al"}</span>
          </button>

          {/* Hem müşteri hem tedarikçi: karşı yöndeki para hareketi (tedarikçiden tahsilat / müşteriye ödeme) */}
          {(isSupplier || hasPurchaseDocs) && (
            <button
              type="button"
              onClick={() => setPayFlow(isSupplier ? "in" : "out")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#00b49c] px-3 py-1.5 text-xs sm:text-sm font-bold text-[#008f7b] dark:text-[#00d4b8] transition hover:bg-[#00b49c]/10"
            >
              <Coins className="size-4" />
              <span>{isSupplier ? "Tahsilat Al" : "Ödeme Yap"}</span>
            </button>
          )}

          {/* Borç / Alacak Kaydı */}
          <button
            type="button"
            onClick={() => setAdjustmentOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-[#233144] bg-slate-50 dark:bg-[#16202c] px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-[#1f2c3d]"
          >
            <ArrowLeftRight className="size-3.5 text-slate-600 dark:text-slate-400" />
            <span>Borç / Alacak Kaydı</span>
          </button>

          {/* Faturaları Eşleştir (FIFO) */}
          <button
            type="button"
            disabled={reconciling}
            onClick={handleAutoReconcile}
            className="inline-flex items-center gap-1.5 rounded-lg border border-teal-300 dark:border-teal-700/60 bg-teal-50 dark:bg-teal-950/40 px-3 py-1.5 text-xs sm:text-sm font-bold text-teal-700 dark:text-teal-300 transition hover:bg-teal-100 dark:hover:bg-teal-900/50"
            title="Tahsilat ve ödemeleri en eski faturadan yeniye doğru (FIFO) otomatik eşleştirir"
          >
            <Sparkles className={cn("size-3.5 text-teal-600 dark:text-teal-400", reconciling && "animate-spin")} />
            <span>{reconciling ? "Eşleştiriliyor..." : "Faturaları Eşleştir"}</span>
          </button>
        </div>
      </div>

      {/* 2. CARİ ANA BAŞLIK KARTI (Fotoğraf Birebir Tasarım) */}
      <div className="rounded-2xl border border-slate-200 dark:border-[#1e2a3a] bg-white dark:bg-[#131b26] p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          {/* Sol Kısım: Avatar ve Bilgiler */}
          <div className="flex items-start gap-4 sm:gap-5 min-w-0">
            <div className="flex size-16 sm:size-20 shrink-0 items-center justify-center rounded-2xl border border-slate-200 dark:border-[#273549] bg-slate-100 dark:bg-[#1a2332] text-slate-600 dark:text-slate-400 shadow-inner">
              {isSupplier ? (
                <Building2 className="size-8 sm:size-9 text-slate-600 dark:text-slate-400 stroke-[1.5]" />
              ) : (
                <User className="size-8 sm:size-9 text-slate-600 dark:text-slate-400 stroke-[1.5]" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[#00b49c]">
                {isSupplier ? "TEDARİKÇİ DETAYI" : "MÜŞTERİ DETAYI"}
              </div>
              <h1 className="truncate text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                {c.name}
              </h1>

              {/* Adres & Konum */}
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                {(c.address || c.district || c.city) ? (
                  <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                    <MapPin className="size-3.5 text-slate-600 dark:text-slate-400 shrink-0" />
                    <span>{[c.address, c.district, c.city].filter(Boolean).join(" - ")}</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                    <MapPin className="size-3.5 text-slate-600 shrink-0" />
                    <span>Adres tanımlanmamış</span>
                  </span>
                )}

                {c.tax_number && (
                  <span className="text-slate-600 dark:text-slate-400">
                    VKN/TCKN: <strong className="font-medium text-slate-700 dark:text-slate-300">{c.tax_number}</strong>
                    {c.tax_office ? ` · ${c.tax_office}` : ""}
                  </span>
                )}

                {(c.phone || c.mobile) && (
                  <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                    <Phone className="size-3 text-slate-600 dark:text-slate-400" />
                    <span>{c.phone || c.mobile}</span>
                  </span>
                )}
              </div>

              {/* Hatırlatma Durumu (Fotoğraftaki sarı metin) */}
              <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                <Clock className="size-3.5 text-amber-600 dark:text-amber-400" />
                <span>Hatırlatma açık · 7 gün önce</span>
              </div>
            </div>
          </div>

          {/* Sağ Kısım: Güncel Bakiye (Fotoğraftaki Birebir Düzen) */}
          <div className="shrink-0 border-t border-slate-200 dark:border-[#1e2a3a] pt-3 sm:border-t-0 sm:pt-0 sm:text-right">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              GÜNCEL BAKİYE
            </div>
            <div
              className={cn(
                "mt-1 text-2xl sm:text-3xl font-black tracking-tight",
                isSettled
                  ? "text-slate-800 dark:text-slate-100"
                  : balance > 0.004
                    ? isSupplier ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                    : isSupplier ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
              )}
            >
              {isSettled ? "0,00 ₺" : formatMoney(Math.abs(balance))}
            </div>
            <div className="mt-1 flex items-center gap-1.5 sm:justify-end text-xs font-semibold">
              {isSettled ? (
                <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" /> Hesap Kapalı (Borç/Alacak Yok)
                </span>
              ) : isSupplier ? (
                balance < 0 ? (
                  <span className="text-rose-600 dark:text-rose-400">Alacaklı (Biz Borçluyuz)</span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400">Borçlu (Bize Borçlu)</span>
                )
              ) : balance > 0 ? (
                <span className="text-emerald-600 dark:text-emerald-400">Borçlu (Bize Borçlu)</span>
              ) : (
                <span className="text-rose-600 dark:text-rose-400">Alacaklı (Biz Borçluyuz)</span>
              )}
            </div>
            <div className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
              {isSettled ? "Açık bakiye yok" : `Açık belge: ${formatMoney(effectiveOpenDocsTotal)}`}
            </div>
            {Math.abs(Number(c.opening_balance ?? 0)) > 0.004 && (
              <button
                type="button"
                disabled={!canWrite}
                onClick={() => setOpeningOpen(true)}
                className="mt-0.5 text-xs font-semibold text-amber-700 hover:underline disabled:no-underline dark:text-amber-400"
                title="Açılış bakiyesini düzenle"
              >
                Devir (açılış) bakiyesi: {formatMoney(Math.abs(Number(c.opening_balance)))} ✎
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. CARİ ÖZET KARTLARI: satış/alış, tahsilat/ödeme, vadesi geçen, kâr / son alış */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="flex flex-col justify-center rounded-xl bg-gradient-to-r from-[#00b49c] to-[#008f7b] p-4 text-white shadow-sm min-w-0">
          <div className="text-xl sm:text-2xl font-black tracking-tight truncate">
            {formatMoney(totalSalesOrPurchases)}
          </div>
          <div className="mt-1 text-xs font-semibold text-emerald-50/90">{isSupplier ? "Toplam Alış" : "Toplam Satış"}</div>
          <div className="mt-0.5 text-[11px] text-emerald-50/90 truncate">
            {mainDocs.length} fatura · bu yıl {formatMoney(thisYearTotal)}
          </div>
          {otherTotal > 0.004 && (
            <div className="text-[11px] font-semibold text-emerald-50/90 truncate">
              {isSupplier ? "Satışımız" : "Alışımız"}: {formatMoney(otherTotal)}
            </div>
          )}
        </div>

        <div className="flex flex-col justify-center rounded-xl bg-gradient-to-r from-[#3b82f6] to-[#2563eb] p-4 text-white shadow-sm min-w-0">
          <div className="text-xl sm:text-2xl font-black tracking-tight truncate">
            {formatMoney(totalCollectedOrPaid)}
          </div>
          <div className="mt-1 text-xs font-semibold text-blue-50/90">{isSupplier ? "Ödeme" : "Tahsilat"}</div>
          <div className="mt-0.5 text-[11px] text-blue-50/90 truncate">
            {lastFlow ? `Son: ${formatDate(lastFlow)} · ${daysSince(lastFlow)} gün önce` : "Henüz yok"}
          </div>
          {otherFlow > 0.004 && (
            <div className="text-[11px] font-semibold text-blue-50/90 truncate">
              {isSupplier ? "Aldığımız tahsilat" : "Yaptığımız ödeme"}: {formatMoney(otherFlow)}
            </div>
          )}
        </div>

        <div
          className={cn(
            "flex flex-col justify-center rounded-xl bg-gradient-to-r p-4 text-white shadow-sm min-w-0",
            effectiveOverdueTotal > 0.004 ? "from-[#f43f5e] to-[#e11d48]" : "from-[#475569] to-[#334155]",
          )}
        >
          <div className="text-xl sm:text-2xl font-black tracking-tight truncate">{formatMoney(effectiveOverdueTotal)}</div>
          <div className="mt-1 text-xs font-semibold text-white/90">{isSupplier ? "Vadesi Geçen Borcumuz" : "Vadesi Geçen Alacağımız"}</div>
          <div className="mt-0.5 text-[11px] text-white/90 truncate">
            {effectiveOverdueTotal > 0.004 && oldestDue ? `${overdueDocs.length} belge · en eski ${daysSince(oldestDue)} gün` : "Gecikme yok"}
          </div>
        </div>

        {isSupplier ? (
          <div className="flex flex-col justify-center rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] p-4 text-white shadow-sm min-w-0">
            <div className="text-xl sm:text-2xl font-black tracking-tight truncate">
              {lastDoc ? formatDate(lastDoc) : "—"}
            </div>
            <div className="mt-1 text-xs font-semibold text-violet-50/90">Son Alış</div>
            <div className="mt-0.5 text-[11px] text-violet-50/90 truncate">
              {lastDoc ? `${daysSince(lastDoc)} gün önce` : "Henüz alış yok"}
            </div>
          </div>
        ) : (
          <div className="flex flex-col justify-center rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] p-4 text-white shadow-sm min-w-0">
            <div className="text-xl sm:text-2xl font-black tracking-tight truncate">
              {formatMoney(Number(profitRow?.profit ?? 0))}
            </div>
            <div className="mt-1 text-xs font-semibold text-violet-50/90">Bu Yıl Kâr</div>
            <div className="mt-0.5 text-[11px] text-violet-50/90 truncate">
              {profitRow && Number(profitRow.net) ? `Marj %${((Number(profitRow.profit) / Number(profitRow.net)) * 100).toFixed(1).replace(".", ",")} · KDV hariç` : "Bu yıl satış yok"}
            </div>
          </div>
        )}
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
                  : "bg-white dark:bg-[#131b26] hover:bg-slate-100 dark:hover:bg-[#1a2534] text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-[#233144]"
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 5. SEKME İÇERİK KUTUSU */}
      <div className="rounded-2xl border border-slate-200 dark:border-[#1e2a3a] bg-white dark:bg-[#131b26] p-5 min-h-[350px] shadow-sm">
        {/* SEKME 1: ÖZET (Son Hareketler Tablosu) */}
        {activeTab === "ozet" && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-slate-200 dark:border-[#1e2a3a] pb-3">
              <div className="flex items-center gap-2.5">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-wide">Son Hareketler (Cari Ekstre)</h2>
                <span className="rounded-full bg-slate-100 dark:bg-[#1a2332] px-2 py-0.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
                  {displayRows.length} kayıt
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEkstreModalOpen(true)}
                  className="h-8 text-xs font-medium border-slate-300 dark:border-[#233144] bg-slate-50 dark:bg-[#16202c] text-slate-800 dark:text-slate-200"
                >
                  <FileText className="size-3.5 mr-1 text-slate-600 dark:text-slate-400" /> Ekstre Raporu
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDetailed((v) => !v)}
                  className={cn("h-8 text-xs font-bold border-slate-300 dark:border-[#233144]", detailed ? "bg-[#00b49c] text-white hover:bg-[#009e89] border-[#00b49c]" : "bg-slate-50 dark:bg-[#16202c] text-slate-800 dark:text-slate-200")}
                  title="Faturaların altında ürünleri göster"
                >
                  <ListTree className="size-3.5 mr-1" /> {detailed ? "Detaylı Ekstre: Açık" : "Detaylı Ekstre"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAutoReconcile}
                  disabled={reconciling}
                  className="h-8 text-xs font-bold border-teal-300 dark:border-teal-700/60 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/50"
                  title="Tahsilat ve ödemeleri en eski faturadan yeniye doğru (FIFO) otomatik eşleştirir"
                >
                  <Sparkles className={cn("size-3.5 mr-1 text-teal-600 dark:text-teal-400", reconciling && "animate-spin")} />
                  {reconciling ? "Eşleştiriliyor..." : "Faturaları Eşleştir (FIFO)"}
                </Button>
              </div>
            </div>

            {isSettled && (
              <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/70 dark:bg-emerald-950/20 px-3.5 py-2.5 text-xs text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="font-bold">Hesap Bakiyesi Kapalı (0,00 ₺):</span>
                  <span className="text-emerald-700/90 dark:text-emerald-300/90">
                    Bu cari ile açık borç/alacak bulunmamaktadır. Tüm tahsilat ve ödemeler mutabık durumdadır.
                  </span>
                </div>
              </div>
            )}

            {detailed && screenLines.isFetching && (
              <div className="mb-2 text-xs text-slate-500">Ürün detayları yükleniyor…</div>
            )}
            {statement.isPending ? (
              <div className="space-y-2 py-8">
                <Skeleton className="h-8 w-full bg-slate-50 dark:bg-[#16202c]" />
                <Skeleton className="h-8 w-full bg-slate-50 dark:bg-[#16202c]" />
                <Skeleton className="h-8 w-full bg-slate-50 dark:bg-[#16202c]" />
              </div>
            ) : displayRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-600 dark:text-slate-400 text-sm">
                <span>Henüz hareket yok.</span>
              </div>
            ) : (
              <div className="thin-scroll overflow-x-auto rounded-xl border border-slate-200 dark:border-[#1e2a3a]">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-200 dark:border-[#1e2a3a] bg-slate-50/80 dark:bg-[#16202c]/80 text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    <tr>
                      <th className="px-3.5 py-3 text-left">{renderSortHeader("Tarih", "date")}</th>
                      <th className="px-3.5 py-3 text-left">{renderSortHeader("İşlem & Belge", "type")}</th>
                      <th className="hidden px-3.5 py-3 text-left md:table-cell">{renderSortHeader("Açıklama & Vade", "description")}</th>
                      <th className="px-3.5 py-3 text-right">{renderSortHeader("Borç", "debit", true)}</th>
                      <th className="px-3.5 py-3 text-right">{renderSortHeader("Alacak", "credit", true)}</th>
                      <th className="px-3.5 py-3 text-right">{renderSortHeader("Bakiye", "balance", true)}</th>
                      <th className="px-3 py-3 text-center font-semibold">Ödeme Durumu</th>
                      <th className="w-24 px-3 py-3 text-right font-semibold">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#1e2a3a]/60">
                    <tr className="bg-slate-50/60 dark:bg-[#16202c]/20 text-slate-600 dark:text-slate-400 text-xs">
                      <td className="px-3.5 py-2.5 whitespace-nowrap font-medium">{formatDate(from)}</td>
                      <td className="px-3.5 py-2.5 font-medium text-slate-700 dark:text-slate-300">Devreden Bakiye</td>
                      <td className="hidden px-3.5 py-2.5 md:table-cell">—</td>
                      <td className="px-3.5 py-2.5 text-right">—</td>
                      <td className="px-3.5 py-2.5 text-right">—</td>
                      <td className="num px-3.5 py-2.5 text-right font-semibold text-slate-800 dark:text-slate-200">{formatMoney(carried)}</td>
                      <td className="px-3.5 py-2.5 text-center">—</td>
                      <td />
                    </tr>
                    {displayRows.map((r) => {
                      const doc = r.kind === "document" ? (docs.data ?? []).find((d) => d.id === r.ref_id) : null;
                      const isPayable = doc ? DOC_TYPES[doc.doc_type as DocType]?.payable : false;
                      const fifo = doc ? fifoMap.get(doc.id) : null;
                      const docTotal = doc ? Number(doc.total || 0) : 0;
                      const docPaid = fifo ? fifo.paid : (doc ? Number(doc.paid_amount || 0) : 0);
                      const docRemaining = fifo ? fifo.remaining : Math.max(0, docTotal - docPaid);
                      const isPaid = fifo ? fifo.status === "paid" : (doc ? (doc.payment_status === "paid" || (docTotal > 0 && docPaid >= docTotal - 0.009)) : false);
                      const isPartial = fifo ? fifo.status === "partial" : (!isPaid && doc ? (doc.payment_status === "partial" || docPaid > 0.009) : false);
                      const rBal = Number(r.balance || 0);
                      const isRowZero = Math.abs(rBal) <= 0.009;

                      const subLines = detailed && r.kind === "document" && r.ref_id ? screenLines.data?.get(r.ref_id) : undefined;
                      return (
                        <React.Fragment key={`${r.kind}-${r.ref_id}`}>
                        <tr
                          className="group cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-[#1a2534]/50"
                          onClick={() => setSelectedRow(r)}
                        >
                          {/* Tarih */}
                          <td className="px-3.5 py-3 whitespace-nowrap text-slate-700 dark:text-slate-300 font-medium text-xs">
                            {formatDate(r.entry_date)}
                          </td>

                          {/* İşlem & Belge No */}
                          <td className="px-3.5 py-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-slate-900 dark:text-white text-xs">
                                {DOC_TYPES[r.ref_type as DocType]?.label ?? TYPE_LABELS[r.ref_type] ?? "Açılış"}
                              </span>
                              {r.number && (
                                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#1a2332] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
                                  {r.number}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Açıklama & Vade */}
                          <td className="hidden px-3.5 py-3 text-slate-600 dark:text-slate-400 md:table-cell text-xs">
                            <div className="flex items-center gap-1.5 truncate max-w-xs">
                              <span className="truncate">{r.description !== r.number ? r.description || "—" : "—"}</span>
                              {r.due_date && (
                                <span className="shrink-0 text-[10px] px-1 py-0.5 rounded bg-slate-100 dark:bg-[#16202c] text-slate-500 dark:text-slate-400">
                                  Vade: {formatDate(r.due_date)}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Borç */}
                          <td className="num px-3.5 py-3 text-right font-semibold text-slate-800 dark:text-slate-200 text-xs">
                            {Number(r.debit) ? formatMoney(r.debit) : "—"}
                          </td>

                          {/* Alacak */}
                          <td className="num px-3.5 py-3 text-right font-semibold text-slate-800 dark:text-slate-200 text-xs">
                            {Number(r.credit) ? formatMoney(r.credit) : "—"}
                          </td>

                          {/* Bakiye */}
                          <td
                            className={cn(
                              "num px-3.5 py-3 text-right font-bold text-xs",
                              isRowZero
                                ? "text-slate-700 dark:text-slate-300"
                                : rBal < 0
                                  ? "text-rose-600 dark:text-rose-400"
                                  : "text-emerald-600 dark:text-emerald-400"
                            )}
                          >
                            {isRowZero ? "0,00 ₺" : formatMoney(rBal)}
                          </td>

                          {/* Ödeme Durumu (Temiz kurumsal sütun) */}
                          <td className="px-3 py-3 text-center whitespace-nowrap">
                            {r.kind === "document" && doc && isPayable ? (
                              isPaid || (isSettled && hasNoDebt) ? (
                                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                                  <span className="size-1.5 rounded-full bg-emerald-500" /> Ödendi
                                </span>
                              ) : isPartial ? (
                                <span
                                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50"
                                  title={`Ödenen: ${formatMoney(docPaid)} · Kalan: ${formatMoney(docRemaining)}`}
                                >
                                  <span className="size-1.5 rounded-full bg-amber-500" /> Kısmi ({formatMoney(docRemaining)})
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                  <span className="size-1.5 rounded-full bg-slate-400" /> Açık
                                </span>
                              )
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500 text-xs">—</span>
                            )}
                          </td>

                          {/* İşlemler (Mikro butonlar) */}
                          <td className="px-3 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              {canWrite && r.kind === "document" && payableDoc(r.ref_id) && !hasNoDebt && (() => {
                                const pd = payableDoc(r.ref_id)!;
                                const inFlow = docFlow(pd.doc_type as DocType) === "in";
                                const pdRem = Math.max(0, Number(pd.total) - Number(pd.paid_amount || 0));
                                return (
                                  <button
                                    type="button"
                                    className={cn(
                                      "h-7 px-2 rounded-lg flex items-center gap-1 text-white text-xs font-bold transition shadow-sm",
                                      inFlow ? "bg-[#00b49c] hover:bg-[#009e89]" : "bg-rose-600 hover:bg-rose-700",
                                    )}
                                    title={`${inFlow ? "Tahsilat Al" : "Ödeme Yap"} · Kalan: ${formatMoney(pdRem, pd.currency)}`}
                                    onClick={() => setPayDoc(pd)}
                                  >
                                    <Coins className="size-3" />
                                    <span className="text-[10px] font-bold">{formatMoney(pdRem, pd.currency)}</span>
                                  </button>
                                );
                              })()}
                              {r.kind === "document" && (
                                <button
                                  type="button"
                                  className="h-7 w-7 rounded-lg border border-slate-300 dark:border-[#233144] bg-white dark:bg-[#16202c] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition"
                                  title="Belge Önizle / Yazdır"
                                  onClick={() => openDocPreview(r.ref_id)}
                                >
                                  <Printer className="size-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                className="h-7 w-7 rounded-lg border border-slate-300 dark:border-[#233144] bg-white dark:bg-[#16202c] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition"
                                title="İncele / Detay"
                                onClick={() => setSelectedRow(r)}
                              >
                                <Eye className="size-3.5" />
                              </button>
                              {canWrite && (
                                <button
                                  type="button"
                                  className="h-7 w-7 rounded-lg border border-slate-300 dark:border-[#233144] bg-white dark:bg-[#16202c] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition"
                                  title="Düzenle"
                                  onClick={() => handleEditRow(r)}
                                >
                                  <Pencil className="size-3.5" />
                                </button>
                              )}
                              {canWrite && r.kind !== "opening" && (
                                <button
                                  type="button"
                                  className="h-7 w-7 rounded-lg border border-rose-200 dark:border-rose-900/40 bg-white dark:bg-[#16202c] text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center justify-center transition"
                                  title="Sil"
                                  onClick={() => handleDeleteRow(r)}
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {subLines && subLines.length > 0 && (
                          <tr className="bg-slate-50/50 dark:bg-[#16202c]/40">
                            <td />
                            <td colSpan={7} className="px-3.5 pb-3 pt-0">
                              <table className="w-full text-xs border-l-2 border-[#00b49c]/50">
                                <tbody>
                                  {subLines.map((l, j) => (
                                    <tr key={j} className="text-slate-600 dark:text-slate-400">
                                      <td className="pl-3 py-1">{l.name}</td>
                                      <td className="py-1 text-right num whitespace-nowrap">{formatNumber(l.quantity)} {l.unit ?? ""}</td>
                                      <td className="py-1 text-right num whitespace-nowrap">x {formatMoney(l.unit_price)}{l.discount_rate ? " (-%" + formatNumber(l.discount_rate) + ")" : ""}</td>
                                      <td className="py-1 text-right num whitespace-nowrap">KDV %{formatNumber(l.vat_rate)}</td>
                                      <td className="py-1 pr-2 text-right num font-semibold whitespace-nowrap text-slate-800 dark:text-slate-200">{formatMoney(l.total)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TEDARİKÇİ ANALİZİ */}
        {activeTab === "analiz" &&
          (isSupplier ? (
            <SupplierInsights contactId={c.id} docs={docs.data ?? []} balance={balance} />
          ) : (
            <CustomerInsights contactId={c.id} docs={docs.data ?? []} termDays={Number(c.payment_term_days ?? 0)} balance={balance} />
          ))}

        {/* SEKME 2: SATIŞLAR veya ALIŞLAR */}
        {activeTab === "faturalar" && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-slate-200 dark:border-[#1e2a3a] pb-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-wide">
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

            <div className="mb-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex overflow-hidden rounded-lg border border-slate-300 dark:border-[#233144]">
                  {(
                    [
                      ["all", "Tümü"],
                      ["month", "Bu ay"],
                      ["lastmonth", "Geçen ay"],
                      ["year", "Bu yıl"],
                      ["custom", "Tarih aralığı"],
                    ] as const
                  ).map(([v, l], i) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setDocPeriod(v)}
                      className={cn(
                        "px-3 py-1.5 text-xs font-semibold transition",
                        i > 0 && "border-l border-slate-300 dark:border-[#233144]",
                        docPeriod === v ? "bg-[#00b49c] text-white" : "bg-white text-slate-700 hover:bg-slate-100 dark:bg-[#16202c] dark:text-slate-200 dark:hover:bg-[#1f2c3d]",
                      )}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                {docPeriod === "custom" && (
                  <div className="flex items-center gap-2">
                    <div className="w-40">
                      <Input type="date" value={docFrom} onChange={(e) => setDocFrom(e.target.value)} aria-label="Başlangıç" />
                    </div>
                    <span className="text-slate-500">–</span>
                    <div className="w-40">
                      <Input type="date" value={docTo} onChange={(e) => setDocTo(e.target.value)} aria-label="Bitiş" />
                    </div>
                  </div>
                )}
              </div>
              {docRange &&
                (() => {
                  const live = docList.filter((d) => d.status !== "draft" && d.status !== "cancelled" && !["quote", "sales_order", "purchase_order"].includes(d.doc_type));
                  const sg = (d: Row<"documents">) => (d.doc_type.endsWith("_return") ? -1 : 1);
                  const rate = (d: Row<"documents">) => Number(d.exchange_rate || 1);
                  const total = live.reduce((a, d) => a + sg(d) * Number(d.total_try ?? Number(d.total) * rate(d)), 0);
                  const net = live.reduce((a, d) => a + sg(d) * Number(d.net_total ?? 0) * rate(d), 0);
                  const open = live
                    .filter((d) => !d.doc_type.endsWith("_return"))
                    .reduce((a, d) => a + Math.max(Number(d.total) - Number(d.paid_amount || 0), 0) * rate(d), 0);
                  return (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {[
                        ["Belge", String(live.length)],
                        [isSupplier ? "Toplam alış (KDV dahil)" : "Toplam satış (KDV dahil)", formatMoney(total)],
                        ["KDV hariç", formatMoney(net)],
                        [isSupplier ? "Ödenecek (açık)" : "Tahsil edilecek (açık)", formatMoney(open)],
                      ].map(([k, v]) => (
                        <div key={k} className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-[#16202c]">
                          <div className="text-[11px] text-slate-600 dark:text-slate-400">{k}</div>
                          <div className="font-bold tabular-nums text-slate-900 dark:text-white">{v}</div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              {docRange && docList.length === 0 && <p className="py-6 text-center text-sm text-slate-600 dark:text-slate-400">Bu tarih aralığında belge yok.</p>}
            </div>

            {docs.isPending ? (
              <Skeleton className="h-40 bg-slate-50 dark:bg-[#16202c]" />
            ) : (docs.data ?? []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-600 dark:text-slate-400 text-sm">
                <span>Henüz kayıtlı fatura veya belge yok.</span>
              </div>
            ) : (
              <div className="thin-scroll overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-200 dark:border-[#1e2a3a] bg-slate-50 dark:bg-[#16202c]/60 text-[11px] uppercase tracking-wide text-slate-600 dark:text-slate-400">
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
                  <tbody className="divide-y divide-slate-200 dark:divide-[#1e2a3a]">
                    {docList.map((d) => (
                      <tr
                        key={d.id}
                        className="group cursor-pointer hover:bg-slate-50 dark:hover:bg-[#1a2534]/60 transition"
                        onClick={() => setPrintDoc(d)}
                      >
                        <td className="px-3 py-2.5 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
                          {formatDate(d.issue_date)}
                        </td>
                        <td className="px-3 py-2.5 text-slate-900 dark:text-white font-semibold">{d.number || "Taslak"}</td>
                        <td className="px-3 py-2.5 text-slate-700 dark:text-slate-300 text-xs">
                          {DOC_TYPES[d.doc_type as DocType]?.label ?? d.doc_type}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400 text-xs whitespace-nowrap">
                          {formatDate(d.due_date)}
                        </td>
                        <td className="px-3 py-2.5">
                          {(() => {
                            const fifo = fifoMap.get(d.id);
                            const tot = Number(d.total || 0);
                            const pd = fifo ? fifo.paid : Number(d.paid_amount || 0);
                            const rem = fifo ? fifo.remaining : Math.max(0, tot - pd);
                            const isP = fifo ? fifo.status === "paid" : (d.payment_status === "paid" || (tot > 0 && pd >= tot - 0.009));
                            const isPart = fifo ? fifo.status === "partial" : (!isP && (d.payment_status === "partial" || pd > 0.009));
                            return (
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold",
                                  isP
                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50"
                                    : isPart
                                      ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50"
                                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                                )}
                              >
                                <span className={cn("size-1.5 rounded-full", isP ? "bg-emerald-500" : isPart ? "bg-amber-500" : "bg-slate-400")} />
                                {isP ? "Ödendi" : isPart ? `Kısmi (${formatMoney(rem, d.currency)})` : "Açık"}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="num px-3 py-2.5 text-right font-black text-slate-900 dark:text-white">
                          <div>{formatMoney(d.total, d.currency)}</div>
                          {(() => {
                            const fifo = fifoMap.get(d.id);
                            const rem = fifo ? fifo.remaining : Math.max(0, Number(d.total || 0) - Number(d.paid_amount || 0));
                            if (rem > 0.009 && rem < Number(d.total || 0) - 0.009) {
                              return (
                                <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                                  Kalan: {formatMoney(rem, d.currency)}
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {canWrite &&
                              DOC_TYPES[d.doc_type as DocType]?.payable &&
                              d.status !== "draft" &&
                              d.status !== "cancelled" &&
                              (fifoMap.get(d.id)?.remaining ?? (Number(d.total) - Number(d.paid_amount || 0))) > 0.004 && (() => {
                                const rem = fifoMap.get(d.id)?.remaining ?? Math.max(0, Number(d.total) - Number(d.paid_amount || 0));
                                const inFlow = docFlow(d.doc_type as DocType) === "in";
                                return (
                                  <button
                                    type="button"
                                    onClick={() => setPayDoc(d)}
                                    className={cn(
                                      "inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold text-white shadow-sm transition",
                                      inFlow ? "bg-[#00b49c] hover:bg-[#009e89]" : "bg-rose-600 hover:bg-rose-700",
                                    )}
                                    title={`Kalan: ${formatMoney(rem, d.currency)}`}
                                  >
                                    <Coins className="size-3.5" />
                                    <span>{inFlow ? "Tahsilat Al" : "Ödeme Yap"} · {formatMoney(rem, d.currency)}</span>
                                  </button>
                                );
                              })()}
                            <button
                              type="button"
                              onClick={() => setPrintDoc(d)}
                              className="rounded-lg border border-slate-300 dark:border-[#233144] bg-slate-50 dark:bg-[#16202c] p-1.5 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition"
                              title="Yazdır / Önizle"
                            >
                              <Printer className="size-3.5" />
                            </button>
                            <Link
                              href={`${DOC_TYPES[d.doc_type as DocType]?.base ?? "/satislar/faturalar"}/detay?id=${d.id}`}
                              className="rounded-lg border border-slate-300 dark:border-[#233144] bg-slate-50 dark:bg-[#16202c] p-1.5 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition"
                              title="Tam Detay Sayfası"
                            >
                              <Eye className="size-3.5" />
                            </Link>
                            {canWrite && (
                              <Link
                                href={docEditHref(d.doc_type, d.id)}
                                className="rounded-lg border border-slate-300 dark:border-[#233144] bg-slate-50 dark:bg-[#16202c] p-1.5 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition"
                                title="Düzenle"
                              >
                                <Pencil className="size-3.5" />
                              </Link>
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

        {/* SEKME 3: TAHSİLATLAR veya ÖDEMELER */}
        {activeTab === "tahsilatlar" && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-slate-200 dark:border-[#1e2a3a] pb-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-wide">
                {isSupplier ? "Ödeme Hareketleri" : "Tahsilat Hareketleri"}
              </h2>
              <button
                type="button"
                onClick={() => setPayFlow(isSupplier ? "out" : "in")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#00b49c] hover:bg-[#009e89] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition"
              >
                <Plus className="size-3.5" />
                <span>Yeni {isSupplier ? "Ödeme Yap" : "Tahsilat Al"}</span>
              </button>
            </div>

            {txns.isPending ? (
              <Skeleton className="h-40 bg-slate-50 dark:bg-[#16202c]" />
            ) : (txns.data ?? []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-600 dark:text-slate-400 text-sm">
                <span>Henüz tahsilat veya ödeme kaydı yok.</span>
              </div>
            ) : (
              <div className="thin-scroll overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-200 dark:border-[#1e2a3a] bg-slate-50 dark:bg-[#16202c]/60 text-[11px] uppercase tracking-wide text-slate-600 dark:text-slate-400">
                    <tr>
                      <th className="px-3 py-2.5 text-left">Tarih</th>
                      <th className="px-3 py-2.5 text-left">İşlem Türü</th>
                      <th className="px-3 py-2.5 text-left">Ödeme Yöntemi</th>
                      <th className="px-3 py-2.5 text-left">Açıklama</th>
                      <th className="px-3 py-2.5 text-right">Tutar</th>
                      {canWrite && <th className="px-3 py-2.5 text-right">İşlemler</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-[#1e2a3a]">
                    {(txns.data ?? [])
                      .filter((t) => {
                        const ref = t.reference ?? "";
                        const desc = t.description ?? "";
                        return !ref.startsWith("oto-mahsup") && !ref.includes("oto-mahsup") && !desc.includes("Otomatik mahsup") && !desc.includes("oto-mahsup");
                      })
                      .map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-[#1a2534]/60 transition">
                        <td className="px-3 py-2.5 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
                          {formatDate(t.txn_date)}
                        </td>
                        <td className="px-3 py-2.5 text-slate-900 dark:text-white font-semibold">
                          {TYPE_LABELS[t.type] || t.type}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400 text-xs">
                          {t.method === "card" || t.method === "pos" ? "Kredi Kartı / POS" : t.method === "bank" ? "Banka Havalesi" : "Nakit"}
                        </td>
                        <td className="px-3 py-2.5 text-slate-700 dark:text-slate-300 text-xs">
                          {t.description || "—"}
                        </td>
                        <td className={cn("num px-3 py-2.5 text-right font-black", t.direction === "in" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                          {t.direction === "in" ? "+" : "-"}{formatMoney(t.amount, t.currency)}
                        </td>
                        {canWrite && (
                          <td className="px-3 py-2.5 text-right">
                            <div className="flex justify-end">
                              <button type="button" className="h-7 w-7 rounded-lg border border-slate-300 dark:border-[#233144] bg-slate-50 dark:bg-[#16202c] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition" title="Düzenle" onClick={() => openTxnEdit(t.id)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
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
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-slate-200 dark:border-[#1e2a3a] pb-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-wide">Çek ve Senet Portföyü</h2>
              <Link
                href="/nakit/cek-senet"
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 dark:bg-[#16202c] hover:bg-slate-100 dark:hover:bg-[#1f2c3d] border border-slate-300 dark:border-[#233144] px-3.5 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 transition"
              >
                <Plus className="size-3.5" />
                <span>Çek/Senet Yönetimine Git</span>
              </Link>
            </div>

            {cheques.isPending ? (
              <Skeleton className="h-40 bg-slate-50 dark:bg-[#16202c]" />
            ) : (cheques.data ?? []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-600 dark:text-slate-400 text-sm">
                <span>Henüz kayıtlı çek veya senet bulunmuyor.</span>
              </div>
            ) : (
              <div className="thin-scroll overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-200 dark:border-[#1e2a3a] bg-slate-50 dark:bg-[#16202c]/60 text-[11px] uppercase tracking-wide text-slate-600 dark:text-slate-400">
                    <tr>
                      <th className="px-3 py-2.5 text-left">Vade Tarihi</th>
                      <th className="px-3 py-2.5 text-left">Seri No</th>
                      <th className="px-3 py-2.5 text-left">Banka / Şube</th>
                      <th className="px-3 py-2.5 text-left">Tür</th>
                      <th className="px-3 py-2.5 text-left">Durum</th>
                      <th className="px-3 py-2.5 text-right">Tutar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-[#1e2a3a]">
                    {(cheques.data ?? []).map((ch) => (
                      <tr key={ch.id} className="hover:bg-slate-50 dark:hover:bg-[#1a2534]/60 transition">
                        <td className="px-3 py-2.5 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
                          {formatDate(ch.due_date)}
                        </td>
                        <td className="px-3 py-2.5 text-slate-900 dark:text-white font-semibold">{ch.serial_number || "—"}</td>
                        <td className="px-3 py-2.5 text-slate-700 dark:text-slate-300 text-xs">
                          {[ch.bank_name, ch.branch].filter(Boolean).join(" / ") || "—"}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400 text-xs">
                          {ch.kind === "cheque" ? "Çek" : "Senet"}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="inline-block rounded-md border border-amber-800/40 bg-amber-950/40 px-2 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                            {ch.status === "portfolio" ? "Portföyde" : ch.status === "collected" ? "Tahsil Edildi" : ch.status === "paid" ? "Ödendi" : ch.status}
                          </span>
                        </td>
                        <td className="num px-3 py-2.5 text-right font-black text-slate-900 dark:text-white">
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
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-slate-200 dark:border-[#1e2a3a] pb-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-wide">Teklifler</h2>
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
                  <div className="flex flex-col items-center justify-center py-20 text-slate-600 dark:text-slate-400 text-sm">
                    <span>Henüz kayıtlı teklif bulunmuyor.</span>
                  </div>
                );
              }
              return (
                <div className="thin-scroll overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-slate-200 dark:border-[#1e2a3a] bg-slate-50 dark:bg-[#16202c]/60 text-[11px] uppercase tracking-wide text-slate-600 dark:text-slate-400">
                      <tr>
                        <th className="px-3 py-2.5 text-left">Tarih</th>
                        <th className="px-3 py-2.5 text-left">Teklif No</th>
                        <th className="px-3 py-2.5 text-left">Geçerlilik</th>
                        <th className="px-3 py-2.5 text-left">Durum</th>
                        <th className="px-3 py-2.5 text-right">Tutar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-[#1e2a3a]">
                      {quotes.map((q) => (
                        <tr
                          key={q.id}
                          className="hover:bg-slate-50 dark:hover:bg-[#1a2534]/60 transition cursor-pointer"
                          onClick={() => setPrintDoc(q)}
                        >
                          <td className="px-3 py-2.5 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
                            {formatDate(q.issue_date)}
                          </td>
                          <td className="px-3 py-2.5 text-slate-900 dark:text-white font-semibold">{q.number || "Taslak"}</td>
                          <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400 text-xs">{formatDate(q.due_date)}</td>
                          <td className="px-3 py-2.5">
                            <span className="inline-block rounded-md border border-cyan-800/40 bg-cyan-950/40 px-2 py-0.5 text-[11px] font-bold text-cyan-400">
                              {statusLabel("quote", q.status)}
                            </span>
                          </td>
                          <td className="num px-3 py-2.5 text-right font-black text-slate-900 dark:text-white">
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
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-slate-200 dark:border-[#1e2a3a] pb-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-wide">Tüm Belgeler ve İrsaliyeler</h2>
              <div className="text-xs text-slate-600 dark:text-slate-400">
                Toplam {(docs.data ?? []).length} belge
              </div>
            </div>

            {(docs.data ?? []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-600 dark:text-slate-400 text-sm">
                <span>Henüz kayıtlı belge bulunmuyor.</span>
              </div>
            ) : (
              <div className="thin-scroll overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-200 dark:border-[#1e2a3a] bg-slate-50 dark:bg-[#16202c]/60 text-[11px] uppercase tracking-wide text-slate-600 dark:text-slate-400">
                    <tr>
                      <th className="px-3 py-2.5 text-left">Tarih</th>
                      <th className="px-3 py-2.5 text-left">Belge Türü</th>
                      <th className="px-3 py-2.5 text-left">Belge No</th>
                      <th className="px-3 py-2.5 text-left">Vade Tarihi</th>
                      <th className="px-3 py-2.5 text-right">Tutar</th>
                      <th className="px-3 py-2.5 text-right">Yazdır / İncele</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-[#1e2a3a]">
                    {(docs.data ?? []).map((d) => (
                      <tr
                        key={d.id}
                        className="hover:bg-slate-50 dark:hover:bg-[#1a2534]/60 transition cursor-pointer"
                        onClick={() => setPrintDoc(d)}
                      >
                        <td className="px-3 py-2.5 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
                          {formatDate(d.issue_date)}
                        </td>
                        <td className="px-3 py-2.5 text-slate-900 dark:text-white font-semibold">
                          {DOC_TYPES[d.doc_type as DocType]?.label ?? d.doc_type}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400 text-xs font-mono">
                          {d.number || "Taslak"}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400 text-xs whitespace-nowrap">
                          {formatDate(d.due_date)}
                        </td>
                        <td className="num px-3 py-2.5 text-right font-black text-slate-900 dark:text-white">
                          {formatMoney(d.total, d.currency)}
                        </td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setPrintDoc(d)}
                            className="rounded-lg border border-slate-300 dark:border-[#233144] bg-slate-50 dark:bg-[#16202c] p-1.5 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition"
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
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-slate-200 dark:border-[#1e2a3a] pb-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-wide">Kredi Kartı ve Nakit Hareketleri</h2>
            </div>

            {(() => {
              const cardCashTxns = (txns.data ?? []).filter(
                (t) => t.method === "card" || t.method === "pos" || t.method === "cash" || t.method === "kredi_karti"
              );
              if (cardCashTxns.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-600 dark:text-slate-400 text-sm">
                    <span>Henüz kart veya nakit hareketi kaydedilmemiş.</span>
                  </div>
                );
              }
              return (
                <div className="thin-scroll overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-slate-200 dark:border-[#1e2a3a] bg-slate-50 dark:bg-[#16202c]/60 text-[11px] uppercase tracking-wide text-slate-600 dark:text-slate-400">
                      <tr>
                        <th className="px-3 py-2.5 text-left">Tarih</th>
                        <th className="px-3 py-2.5 text-left">Yöntem</th>
                        <th className="px-3 py-2.5 text-left">İşlem</th>
                        <th className="px-3 py-2.5 text-left">Açıklama</th>
                        <th className="px-3 py-2.5 text-right">Tutar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-[#1e2a3a]">
                      {cardCashTxns.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-[#1a2534]/60 transition">
                          <td className="px-3 py-2.5 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
                            {formatDate(t.txn_date)}
                          </td>
                          <td className="px-3 py-2.5 text-slate-900 dark:text-white font-semibold">
                            {t.method === "card" || t.method === "pos" || t.method === "kredi_karti"
                              ? "💳 Kredi Kartı"
                              : "💵 Nakit"}
                          </td>
                          <td className="px-3 py-2.5 text-slate-700 dark:text-slate-300 text-xs">
                            {TYPE_LABELS[t.type] || t.type}
                          </td>
                          <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400 text-xs">
                            {t.description || "—"}
                          </td>
                          <td className={cn("num px-3 py-2.5 text-right font-black", t.direction === "in" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
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
        <DialogContent title="Cariyi Düzenle" className="sm:max-w-2xl bg-white dark:bg-[#131b26] border-slate-200 dark:border-[#1e2a3a] text-slate-900 dark:text-white">
          <ContactForm contact={c} onSaved={() => setEditOpen(false)} onCancel={() => setEditOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Modal B: Hesap Ekstresi Detay ve İndirme */}
      <Dialog open={ekstreModalOpen} onOpenChange={setEkstreModalOpen}>
        <DialogContent
          title={`${c.name} — Hesap Ekstresi`}
          description="Tarih aralığına göre hesap hareketlerini inceleyebilir, PDF veya Excel olarak dışa aktarabilirsiniz."
          className="sm:max-w-3xl bg-white dark:bg-[#131b26] border-slate-200 dark:border-[#1e2a3a] text-slate-900 dark:text-white"
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-3 rounded-xl bg-slate-50 dark:bg-[#16202c] p-3 border border-slate-300 dark:border-[#233144]">
              <label className="flex flex-col gap-1 text-xs text-slate-600 dark:text-slate-400">
                Başlangıç Tarihi
                <Input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="h-9 w-40 bg-white dark:bg-[#131b26] border-slate-300 dark:border-[#233144] text-slate-900 dark:text-white"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-slate-600 dark:text-slate-400">
                Bitiş Tarihi
                <Input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="h-9 w-40 bg-white dark:bg-[#131b26] border-slate-300 dark:border-[#233144] text-slate-900 dark:text-white"
                />
              </label>
              <label className="flex items-center gap-2 h-9 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                <input type="checkbox" className="size-4 accent-[#00b49c]" checked={withLines} onChange={(e) => setWithLines(e.target.checked)} />
                Ürün detaylı
              </label>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-slate-300 dark:border-[#233144] bg-white dark:bg-[#131b26] text-slate-800 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white"
                  onClick={() => handlePdf("open")}
                >
                  <Printer className="size-4" /> Yazdır / Görüntüle
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-slate-300 dark:border-[#233144] bg-white dark:bg-[#131b26] text-slate-800 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white"
                  onClick={() => handlePdf("download")}
                >
                  <FileText className="size-4" /> PDF İndir
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-slate-300 dark:border-[#233144] bg-white dark:bg-[#131b26] text-slate-800 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white"
                  onClick={exportStatement}
                >
                  <Download className="size-4" /> Excel
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="rounded-lg bg-slate-50 dark:bg-[#16202c] p-2.5 border border-slate-300 dark:border-[#233144]">
                <div className="text-slate-600 dark:text-slate-400">Devreden Bakiye</div>
                <div className="num font-bold text-slate-900 dark:text-white mt-0.5">{formatMoney(carried)}</div>
              </div>
              <div className="rounded-lg bg-slate-50 dark:bg-[#16202c] p-2.5 border border-slate-300 dark:border-[#233144]">
                <div className="text-slate-600 dark:text-slate-400">Dönem Borç</div>
                <div className="num font-bold text-slate-900 dark:text-white mt-0.5">
                  {formatMoney(rows.reduce((s, r) => s + Number(r.debit), 0))}
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 dark:bg-[#16202c] p-2.5 border border-slate-300 dark:border-[#233144]">
                <div className="text-slate-600 dark:text-slate-400">Dönem Alacak</div>
                <div className="num font-bold text-slate-900 dark:text-white mt-0.5">
                  {formatMoney(rows.reduce((s, r) => s + Number(r.credit), 0))}
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 dark:bg-[#16202c] p-2.5 border border-slate-300 dark:border-[#233144]">
                <div className="text-slate-600 dark:text-slate-400">Dönem Sonu Bakiye</div>
                <div className={cn("num font-bold mt-0.5", balance < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400")}>
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
          className="sm:max-w-md bg-white dark:bg-[#131b26] border-slate-200 dark:border-[#1e2a3a] text-slate-900 dark:text-white"
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
                    : "bg-slate-50 dark:bg-[#16202c] border-slate-300 dark:border-[#233144] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                )}
              >
                <span>Borç Kaydı</span>
                <span className="text-[10px] font-normal text-slate-600 dark:text-slate-400">Cariyi Borçlandır</span>
              </button>

              <button
                type="button"
                onClick={() => setAdjType("credit")}
                className={cn(
                  "py-2.5 px-3 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1",
                  adjType === "credit"
                    ? "bg-rose-500/20 border-rose-500 text-rose-400"
                    : "bg-slate-50 dark:bg-[#16202c] border-slate-300 dark:border-[#233144] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                )}
              >
                <span>Alacak Kaydı</span>
                <span className="text-[10px] font-normal text-slate-600 dark:text-slate-400">Cariyi Alacaklandır</span>
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tutar (TL) *
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={adjAmount || ""}
                onChange={(e) => setAdjAmount(parseFloat(e.target.value) || 0)}
                className="bg-slate-50 dark:bg-[#16202c] border-slate-300 dark:border-[#233144] text-slate-900 dark:text-white font-bold text-base h-10"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  İşlem Tarihi
                </label>
                <Input
                  type="date"
                  value={adjDate}
                  onChange={(e) => setAdjDate(e.target.value)}
                  className="bg-slate-50 dark:bg-[#16202c] border-slate-300 dark:border-[#233144] text-slate-900 dark:text-white text-xs h-10"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Kasa / Banka Hesabı
                </label>
                <select
                  value={adjAccountId}
                  onChange={(e) => setAdjAccountId(e.target.value)}
                  className="w-full h-10 rounded-md border border-slate-300 dark:border-[#233144] bg-slate-50 dark:bg-[#16202c] px-3 text-xs text-slate-900 dark:text-white"
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
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Açıklama
              </label>
              <Input
                type="text"
                placeholder="Örn: Fiyat farkı, mutabakat dekontu..."
                value={adjDesc}
                onChange={(e) => setAdjDesc(e.target.value)}
                className="bg-slate-50 dark:bg-[#16202c] border-slate-300 dark:border-[#233144] text-slate-900 dark:text-white text-xs h-10"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
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

      <ContactPaymentDialog
        flow={payFlow}
        contact={{ id: c.id, name: c.name }}
        docs={docs.data ?? []}
        balance={balance}
        onOpenChange={(o) => !o && setPayFlow(null)}
        onSaved={refreshAfterEdit}
      />

      {payDoc && (
        <PaymentDialog
          open={!!payDoc}
          onOpenChange={(o) => {
            if (!o) {
              setPayDoc(null);
              refreshAfterEdit();
            }
          }}
          flow={docFlow(payDoc.doc_type as DocType) === "in" ? "in" : "out"}
          contactId={payDoc.contact_id}
          target={{
            id: payDoc.id,
            number: payDoc.number,
            remaining: Math.max(Number(payDoc.total) - Number(payDoc.paid_amount || 0), 0),
            currency: payDoc.currency,
            exchange_rate: Number(payDoc.exchange_rate || 1),
          }}
        />
      )}

      <OpeningBalanceDialog
        contact={c}
        open={openingOpen}
        onOpenChange={setOpeningOpen}
        onSaved={() => {
          contact.refetch();
          refreshAfterEdit();
        }}
      />

      <TransactionEditDialog txn={editTxn} onOpenChange={(o) => !o && setEditTxn(null)} onSaved={refreshAfterEdit} />

      {/* Modal D: Seçili Hareket İşlem Pop-up */}
      <Dialog open={!!selectedRow} onOpenChange={(o) => !o && setSelectedRow(null)}>
        <DialogContent
          title={
            selectedRow?.kind === "opening"
              ? "Açılış Bakiyesi"
              : `${(selectedRow && (DOC_TYPES[selectedRow.ref_type as DocType]?.label ?? TYPE_LABELS[selectedRow.ref_type])) || "Hareket İşlemi"} ${selectedRow?.number ? `· ${selectedRow.number}` : ""}`
          }
          description="Bu hareket üzerinde detay görüntüleme, düzenleme veya silme işlemi yapabilirsiniz."
          className="sm:max-w-md bg-white dark:bg-[#131b26] border-slate-200 dark:border-[#1e2a3a] text-slate-900 dark:text-white"
        >
          <div className="space-y-4">
            <div className="space-y-2 rounded-xl bg-slate-50 dark:bg-[#16202c] p-3.5 text-xs border border-slate-300 dark:border-[#233144]">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">İşlem Tarihi:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{selectedRow && formatDate(selectedRow.entry_date)}</span>
              </div>
              {selectedRow?.due_date && (
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Vade Tarihi:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{formatDate(selectedRow.due_date)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-300 dark:border-[#233144] pt-1.5">
                <span className="text-slate-600 dark:text-slate-400">İşlem Türü:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {selectedRow?.kind === "opening"
                    ? "Açılış"
                    : selectedRow?.kind === "document"
                      ? (DOC_TYPES[selectedRow.ref_type as DocType]?.label ?? selectedRow.ref_type)
                      : (TYPE_LABELS[selectedRow?.ref_type ?? ""] ?? "Nakit/Banka Hareketi")}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-300 dark:border-[#233144] pt-1.5">
                <span className="text-slate-600 dark:text-slate-400">Tutar:</span>
                <span className={cn("num font-bold text-sm", Number(selectedRow?.debit) > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                  {selectedRow && (Number(selectedRow.debit) > 0 ? `+${formatMoney(selectedRow.debit)} (Borç)` : `-${formatMoney(selectedRow.credit)} (Alacak)`)}
                </span>
              </div>
              {selectedRow?.description && selectedRow.description !== selectedRow.number && (
                <div className="flex justify-between border-t border-slate-300 dark:border-[#233144] pt-1.5">
                  <span className="text-slate-600 dark:text-slate-400">Açıklama:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{selectedRow.description}</span>
                </div>
              )}
              {selectedRow?.kind === "document" && (() => {
                const doc = (docs.data ?? []).find((d) => d.id === selectedRow?.ref_id);
                if (!doc) return null;
                const fifo = fifoMap.get(doc.id);
                const docTotal = Number(doc.total || 0);
                const docPaid = fifo ? fifo.paid : Number(doc.paid_amount || 0);
                const docRemaining = fifo ? fifo.remaining : Math.max(0, docTotal - docPaid);
                const isPaid = fifo ? fifo.status === "paid" : (doc.payment_status === "paid" || (docTotal > 0 && docPaid >= docTotal - 0.009));
                const isPartial = fifo ? fifo.status === "partial" : (!isPaid && (doc.payment_status === "partial" || docPaid > 0.009));
                return (
                  <div className="space-y-1.5 border-t border-slate-300 dark:border-[#233144] pt-2">
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Belge Toplamı:</span>
                      <span className="font-bold text-slate-900 dark:text-white tabular-nums">{formatMoney(docTotal, doc.currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Ödenen / Tahsil Edilen:</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatMoney(docPaid, doc.currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Kalan (Ödeme Kısmı):</span>
                      <span className="font-black text-rose-600 dark:text-rose-400 text-sm tabular-nums">{formatMoney(docRemaining, doc.currency)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-slate-600 dark:text-slate-400">Ödeme Durumu:</span>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold",
                          isPaid
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800"
                            : isPartial
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-300 dark:border-amber-800"
                              : "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-300 dark:border-rose-800"
                        )}
                      >
                        <span className={cn("size-1.5 rounded-full", isPaid ? "bg-emerald-500" : isPartial ? "bg-amber-500" : "bg-rose-500")} />
                        {isPaid ? "Ödendi" : isPartial ? "Kısmi Ödendi" : "Ödenmedi"}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="flex flex-col gap-2 pt-2">
              {selectedRow?.kind === "document" && (
                <Button
                  className="w-full justify-center gap-2 font-bold bg-[#00b49c] hover:bg-[#009e89] text-white"
                  onClick={() => {
                    const refId = selectedRow?.ref_id;
                    setSelectedRow(null);
                    openDocPreview(refId);
                  }}
                >
                  <Printer className="size-4" /> Belgeyi Önizle ve Yazdır
                </Button>
              )}

              {canWrite && selectedRow?.kind === "document" && payableDoc(selectedRow.ref_id) && (() => {
                const pd = payableDoc(selectedRow.ref_id)!;
                const inFlow = docFlow(selectedRow.ref_type as DocType) === "in";
                const pdRem = Math.max(0, Number(pd.total) - Number(pd.paid_amount || 0));
                return (
                  <Button
                    className={cn(
                      "w-full justify-center gap-2 font-bold text-white",
                      inFlow ? "bg-[#00b49c] hover:bg-[#009e89]" : "bg-rose-600 hover:bg-rose-700",
                    )}
                    onClick={() => {
                      setSelectedRow(null);
                      setPayDoc(pd);
                    }}
                  >
                    <Coins className="size-4" /> {inFlow ? "Tahsilat Al" : "Ödeme Yap"} · Kalan: {formatMoney(pdRem, pd.currency)}
                  </Button>
                );
              })()}

              {canWrite && (selectedRow?.kind === "document" || selectedRow?.kind === "transaction" || selectedRow?.kind === "opening") && (
                <Button
                  variant="outline"
                  className="w-full justify-center gap-2 font-bold"
                  onClick={() => selectedRow && handleEditRow(selectedRow)}
                >
                  <Pencil className="size-4" /> Düzenle
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
                className="w-full justify-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
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
