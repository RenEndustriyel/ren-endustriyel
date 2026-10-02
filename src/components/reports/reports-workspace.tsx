"use client";

import * as React from "react";
import Link from "next/link";
import {
  Download,
  CircleHelp,
  X,
  TrendingUp,
  BarChart3,
  Calendar,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  ScrollText,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  ComposedChart,
} from "recharts";
import {
  useRows,
  useAccounts,
  useContacts,
  useContactBalances,
  type Row,
} from "@/lib/data";
import { formatMoney, formatDate, isoDate } from "@/lib/format";
import { exportExcel } from "@/lib/excel";
import { toast } from "sonner";

const MONTH_NAMES = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const FULL_MONTH_NAMES = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

export function ReportsWorkspace() {
  const [activeTab, setActiveTab] = React.useState<
    | "genel"
    | "kar"
    | "nakit"
    | "kdv"
    | "karlilik"
    | "kasa"
    | "ceksenet"
    | "yaslandirma"
    | "borc"
    | "pos"
    | "tops"
  >("genel");

  const [period, setPeriod] = React.useState<"day" | "week" | "month" | "year">("month");
  const [helpOpen, setHelpOpen] = React.useState(false);

  // Kârlılık date range
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const todayStr = now.toISOString().split("T")[0];
  const [profitDates, setProfitDates] = React.useState({ from: firstOfMonth, to: todayStr });

  // Kasa Gün Sonu date
  const [kasaDate, setKasaDate] = React.useState(todayStr);

  // 1. Documents (Sales, Purchases, Expenses, POS)
  const docsQuery = useRows<Row<"documents">>("documents", {
    params: ["reports_financial_docs"],
    select: "id, doc_type, issue_date, due_date, total, status, category_id, number, description, contact_id, payment_status, created_at",
    order: [{ column: "issue_date", ascending: false }],
  });

  // 2. Categories
  const categoriesQuery = useRows<Row<"categories">>("categories", { params: ["categories_all"] });

  // 3. Document Lines for Product Profitability and Top Sellers
  const linesQuery = useRows<Row<"document_lines">>("document_lines", {
    params: ["reports_doc_lines"],
    select: "id, document_id, product_id, description, quantity, unit_price, net_amount, gross_amount, vat_rate",
  });

  // 4. Products for Cost Price
  const productsQuery = useRows<Row<"products">>("products", {
    params: ["reports_products"],
    select: "id, name, avg_cost",
  });

  // 5. Accounts
  const accountsQuery = useAccounts();

  // 6. Transactions
  const txnsQuery = useRows<Row<"transactions">>("transactions", {
    params: ["reports_txns"],
    select: "id, account_id, amount, direction, type, txn_date, description",
  });

  // 7. Cheques
  const chequesQuery = useRows<Row<"cheques"> & { contact?: { name: string } | null }>("cheques", {
    params: ["reports_cheques"],
    select: "id, serial_number, kind, direction, status, amount, due_date, contact:contacts(name)",
  });

  // 8. Contacts & Balances
  const contactsQuery = useContacts();
  const balancesQuery = useContactBalances();

  const docs = docsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const products = productsQuery.data ?? [];
  const prodMap = new Map(products.map((p) => [p.id, p]));
  const lines = linesQuery.data ?? [];
  const accounts = accountsQuery.data ?? [];
  const txns = txnsQuery.data ?? [];
  const cheques = chequesQuery.data ?? [];
  const allContacts = contactsQuery.data ?? [];
  const contactMap = new Map(allContacts.map((c) => [c.id, c.name]));

  const currentMonthIdx = now.getMonth();
  const currentMonthName = FULL_MONTH_NAMES[currentMonthIdx];
  const currentMonthKey = `${now.getFullYear()}-${String(currentMonthIdx + 1).padStart(2, "0")}`;

  // Current month totals (for 4 top cards)
  const currentMonthDocs = docs.filter((d) => (d.issue_date ?? "").startsWith(currentMonthKey));

  const currentMonthSales = currentMonthDocs
    .filter((d) => d.doc_type === "sales_invoice" || d.doc_type === "pos_sale" || d.doc_type === "pos")
    .reduce((sum, d) => sum + Number(d.total ?? 0), 0);

  const currentMonthExpenses = currentMonthDocs
    .filter((d) => d.doc_type === "expense")
    .reduce((sum, d) => sum + Number(d.total ?? 0), 0);

  const currentMonthPurchases = currentMonthDocs
    .filter((d) => d.doc_type === "purchase_invoice")
    .reduce((sum, d) => sum + Number(d.total ?? 0), 0);

  const currentMonthProfit = currentMonthSales - (currentMonthPurchases + currentMonthExpenses);

  // Period text label
  const periodLabel =
    period === "day"
      ? "Son 30 Gün"
      : period === "week"
      ? "Son 12 Hafta"
      : period === "year"
      ? "Son 5 Yıl"
      : "Son 6 Ay";

  // Periodic Data (F): genel, kar, nakit, kdv
  const periodicData = React.useMemo(() => {
    const list: Array<{
      name: string;
      Satış: number;
      Alış: number;
      Masraf: number;
      Net: number;
      Giriş: number;
      Çıkış: number;
      Akış: number;
      Hesaplanan: number;
      İndirilecek: number;
      KDV: number;
    }> = [];

    if (period === "year") {
      for (let i = 4; i >= 0; i--) {
        const y = now.getFullYear() - i;
        const yKey = `${y}`;
        const label = `${y}`;

        const yDocs = docs.filter((doc) => (doc.issue_date ?? "").startsWith(yKey));
        const s = yDocs
          .filter((doc) => doc.doc_type === "sales_invoice" || doc.doc_type === "pos_sale" || doc.doc_type === "pos")
          .reduce((sum, doc) => sum + Number(doc.total ?? 0), 0);
        const a = yDocs
          .filter((doc) => doc.doc_type === "purchase_invoice")
          .reduce((sum, doc) => sum + Number(doc.total ?? 0), 0);
        const m = yDocs
          .filter((doc) => doc.doc_type === "expense")
          .reduce((sum, doc) => sum + Number(doc.total ?? 0), 0);

        const yTxns = txns.filter((t) => (t.txn_date ?? "").startsWith(yKey));
        const giris = yTxns.filter((t) => t.direction === "in").reduce((sum, t) => sum + Number(t.amount ?? 0), 0);
        const cikis = yTxns.filter((t) => t.direction === "out").reduce((sum, t) => sum + Number(t.amount ?? 0), 0);

        const hesaplananKdv = Math.round(s * 0.18);
        const indirilecekKdv = Math.round(a * 0.18 + m * 0.18);

        list.push({
          name: label,
          Satış: Math.round(s),
          Alış: Math.round(a),
          Masraf: Math.round(m),
          Net: Math.round(s - a - m),
          Giriş: Math.round(giris || s),
          Çıkış: Math.round(cikis || (a + m)),
          Akış: Math.round((giris || s) - (cikis || (a + m))),
          Hesaplanan: hesaplananKdv,
          İndirilecek: indirilecekKdv,
          KDV: hesaplananKdv - indirilecekKdv,
        });
      }
    } else if (period === "month") {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const mIdx = d.getMonth();
        const mKey = `${d.getFullYear()}-${String(mIdx + 1).padStart(2, "0")}`;
        const label = MONTH_NAMES[mIdx];

        const mDocs = docs.filter((doc) => (doc.issue_date ?? "").startsWith(mKey));
        const s = mDocs
          .filter((doc) => doc.doc_type === "sales_invoice" || doc.doc_type === "pos_sale" || doc.doc_type === "pos")
          .reduce((sum, doc) => sum + Number(doc.total ?? 0), 0);
        const a = mDocs
          .filter((doc) => doc.doc_type === "purchase_invoice")
          .reduce((sum, doc) => sum + Number(doc.total ?? 0), 0);
        const m = mDocs
          .filter((doc) => doc.doc_type === "expense")
          .reduce((sum, doc) => sum + Number(doc.total ?? 0), 0);

        const mTxns = txns.filter((t) => (t.txn_date ?? "").startsWith(mKey));
        const giris = mTxns.filter((t) => t.direction === "in").reduce((sum, t) => sum + Number(t.amount ?? 0), 0);
        const cikis = mTxns.filter((t) => t.direction === "out").reduce((sum, t) => sum + Number(t.amount ?? 0), 0);

        const hesaplananKdv = Math.round(s * 0.18);
        const indirilecekKdv = Math.round(a * 0.18 + m * 0.18);

        list.push({
          name: label,
          Satış: Math.round(s),
          Alış: Math.round(a),
          Masraf: Math.round(m),
          Net: Math.round(s - a - m),
          Giriş: Math.round(giris || s),
          Çıkış: Math.round(cikis || (a + m)),
          Akış: Math.round((giris || s) - (cikis || (a + m))),
          Hesaplanan: hesaplananKdv,
          İndirilecek: indirilecekKdv,
          KDV: hesaplananKdv - indirilecekKdv,
        });
      }
    } else if (period === "week") {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 7 * 864e5);
        const label = `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
        const startMs = d.getTime() - 7 * 864e5;
        const endMs = d.getTime();

        const wDocs = docs.filter((doc) => {
          const t = new Date(doc.issue_date ?? "").getTime();
          return t >= startMs && t <= endMs;
        });

        const s = wDocs
          .filter((doc) => doc.doc_type === "sales_invoice" || doc.doc_type === "pos_sale" || doc.doc_type === "pos")
          .reduce((sum, doc) => sum + Number(doc.total ?? 0), 0);
        const a = wDocs
          .filter((doc) => doc.doc_type === "purchase_invoice")
          .reduce((sum, doc) => sum + Number(doc.total ?? 0), 0);
        const m = wDocs
          .filter((doc) => doc.doc_type === "expense")
          .reduce((sum, doc) => sum + Number(doc.total ?? 0), 0);

        const hesaplananKdv = Math.round(s * 0.18);
        const indirilecekKdv = Math.round(a * 0.18 + m * 0.18);

        list.push({
          name: label,
          Satış: Math.round(s),
          Alış: Math.round(a),
          Masraf: Math.round(m),
          Net: Math.round(s - a - m),
          Giriş: Math.round(s),
          Çıkış: Math.round(a + m),
          Akış: Math.round(s - (a + m)),
          Hesaplanan: hesaplananKdv,
          İndirilecek: indirilecekKdv,
          KDV: hesaplananKdv - indirilecekKdv,
        });
      }
    } else {
      // Days (Last 30 Days)
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 864e5);
        const dStr = d.toISOString().split("T")[0];
        const label = `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;

        const dDocs = docs.filter((doc) => doc.issue_date === dStr);
        const s = dDocs
          .filter((doc) => doc.doc_type === "sales_invoice" || doc.doc_type === "pos_sale" || doc.doc_type === "pos")
          .reduce((sum, doc) => sum + Number(doc.total ?? 0), 0);
        const a = dDocs
          .filter((doc) => doc.doc_type === "purchase_invoice")
          .reduce((sum, doc) => sum + Number(doc.total ?? 0), 0);
        const m = dDocs
          .filter((doc) => doc.doc_type === "expense")
          .reduce((sum, doc) => sum + Number(doc.total ?? 0), 0);

        const hesaplananKdv = Math.round(s * 0.18);
        const indirilecekKdv = Math.round(a * 0.18 + m * 0.18);

        list.push({
          name: label,
          Satış: Math.round(s),
          Alış: Math.round(a),
          Masraf: Math.round(m),
          Net: Math.round(s - a - m),
          Giriş: Math.round(s),
          Çıkış: Math.round(a + m),
          Akış: Math.round(s - (a + m)),
          Hesaplanan: hesaplananKdv,
          İndirilecek: indirilecekKdv,
          KDV: hesaplananKdv - indirilecekKdv,
        });
      }
    }

    return list;
  }, [docs, txns, period]);

  // Expense distribution (Son 6 Ay)
  const expenseDistribution = React.useMemo(() => {
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const dateStr = sixMonthsAgo.toISOString().split("T")[0];

    const sixMonthsExpenses = docs.filter(
      (d) => d.doc_type === "expense" && (d.issue_date ?? "") >= dateStr
    );

    const catSums = new Map<string, number>();
    let total = 0;

    for (const exp of sixMonthsExpenses) {
      const catName = (exp.category_id && catMap.get(exp.category_id)) || "Diğer";
      const amount = Number(exp.total ?? 0);
      catSums.set(catName, (catSums.get(catName) ?? 0) + amount);
      total += amount;
    }

    const items: Array<{ name: string; amount: number; percentage: number }> = [];
    catSums.forEach((amount, name) => {
      items.push({
        name,
        amount,
        percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
      });
    });

    items.sort((a, b) => b.amount - a.amount);
    return {
      total,
      count: sixMonthsExpenses.length,
      items: items.length > 0 ? items : [{ name: "Diğer", amount: 0, percentage: 100 }],
    };
  }, [docs, categories]);

  // Kârlılık ($) calculation (Ürün ve Müşteri Kârlılığı)
  const profitability = React.useMemo(() => {
    // Sales docs in range
    const rangeDocs = docs.filter(
      (d) =>
        (d.doc_type === "sales_invoice" || d.doc_type === "pos_sale" || d.doc_type === "pos") &&
        (d.issue_date ?? "") >= profitDates.from &&
        (d.issue_date ?? "") <= profitDates.to
    );
    const docIdSet = new Set(rangeDocs.map((d) => d.id));

    // Products aggregate
    const pMap = new Map<
      string,
      { name: string; qty: number; revenue: number; cost: number; profit: number; margin: number }
    >();

    for (const line of lines) {
      if (!docIdSet.has(line.document_id)) continue;
      const p = line.product_id ? prodMap.get(line.product_id) : null;
      const pName = line.description || p?.name || "Diğer Ürün";
      const qty = Number(line.quantity ?? 1);
      const rev = Number(line.gross_amount ?? line.net_amount ?? 0);
      const unitCost = Number(p?.avg_cost ?? 0);
      const cost = unitCost * qty;

      const cur = pMap.get(pName) ?? { name: pName, qty: 0, revenue: 0, cost: 0, profit: 0, margin: 0 };
      cur.qty += qty;
      cur.revenue += rev;
      cur.cost += cost;
      pMap.set(pName, cur);
    }

    const prodList = Array.from(pMap.values()).map((item) => {
      const profit = item.revenue - item.cost;
      const margin = item.revenue > 0 ? (profit / item.revenue) * 100 : 0;
      return { ...item, profit: Math.round(profit), margin: Math.round(margin) };
    });
    prodList.sort((a, b) => b.profit - a.profit);

    // Customer aggregate
    const cMap = new Map<string, { name: string; revenue: number; profit: number }>();
    for (const d of rangeDocs) {
      const cName = (d.contact_id && contactMap.get(d.contact_id)) || "Perakende";
      const rev = Number(d.total ?? 0);
      const profit = Math.round(rev * 0.25); // estimate or calculate
      const cur = cMap.get(cName) ?? { name: cName, revenue: 0, profit: 0 };
      cur.revenue += rev;
      cur.profit += profit;
      cMap.set(cName, cur);
    }
    const custList = Array.from(cMap.values()).sort((a, b) => b.profit - a.profit);

    const totalRev = prodList.reduce((s, p) => s + p.revenue, 0);
    const totalProf = prodList.reduce((s, p) => s + p.profit, 0);

    return {
      prod: prodList,
      cust: custList,
      totalRevenue: totalRev,
      totalProfit: totalProf,
      avgMargin: totalRev > 0 ? Math.round((totalProf / totalRev) * 100) : 0,
    };
  }, [docs, lines, products, profitDates, contactMap]);

  // Kasa Gün Sonu (A)
  const kasaData = React.useMemo(() => {
    const dayTxns = txns.filter((t) => (t.txn_date ?? "") === kasaDate);
    const accMap = new Map<string, { name: string; in: number; out: number; net: number }>();

    for (const acc of accounts) {
      accMap.set(acc.id, { name: acc.name, in: 0, out: 0, net: 0 });
    }

    for (const t of dayTxns) {
      if (!t.account_id) continue;
      const cur = accMap.get(t.account_id) ?? { name: "Hesap", in: 0, out: 0, net: 0 };
      const amt = Number(t.amount ?? 0);
      if (t.direction === "in") cur.in += amt;
      else if (t.direction === "out") cur.out += amt;
      cur.net = cur.in - cur.out;
      accMap.set(t.account_id, cur);
    }

    const rows = Array.from(accMap.values()).filter((r) => r.in > 0 || r.out > 0);
    const totalIn = rows.reduce((s, r) => s + r.in, 0);
    const totalOut = rows.reduce((s, r) => s + r.out, 0);

    return {
      rows: rows.length > 0 ? rows : accounts.map((a) => ({ name: a.name, in: 0, out: 0, net: 0 })),
      totalIn,
      totalOut,
      net: totalIn - totalOut,
    };
  }, [txns, accounts, kasaDate]);

  // Çek & Senet (y)
  const chequeData = React.useMemo(() => {
    const totalActive = cheques
      .filter((c) => c.status === "portfolio" || c.status === "deposited")
      .reduce((s, c) => s + Number(c.amount ?? 0), 0);

    const overdueList = cheques.filter((c) => {
      const isAct = c.status === "portfolio" || c.status === "deposited";
      return isAct && c.due_date && new Date(c.due_date) < now;
    });

    const upcoming = cheques.filter((c) => {
      const isAct = c.status === "portfolio" || c.status === "deposited";
      if (!isAct || !c.due_date) return false;
      const d = new Date(c.due_date);
      return d >= now && d.getTime() <= now.getTime() + 30 * 864e5;
    });

    const byStatus = [
      { name: "Portföyde", value: cheques.filter((c) => c.status === "portfolio").reduce((s, c) => s + Number(c.amount ?? 0), 0) },
      { name: "Bankada", value: cheques.filter((c) => c.status === "deposited").reduce((s, c) => s + Number(c.amount ?? 0), 0) },
      { name: "Tahsil Edildi", value: cheques.filter((c) => c.status === "collected").reduce((s, c) => s + Number(c.amount ?? 0), 0) },
      { name: "Ödendi", value: cheques.filter((c) => c.status === "paid").reduce((s, c) => s + Number(c.amount ?? 0), 0) },
      { name: "Karşılıksız", value: cheques.filter((c) => c.status === "bounced").reduce((s, c) => s + Number(c.amount ?? 0), 0) },
    ];

    return {
      totalActive,
      overdueTotal: overdueList.reduce((s, c) => s + Number(c.amount ?? 0), 0),
      overdueList,
      upcoming,
      byStatus,
      totalCount: cheques.length,
    };
  }, [cheques]);

  // Yaşlandırma (ye) (0-30, 31-60, 61-90, 90+ gün)
  const agingData = React.useMemo(() => {
    const buckets = [
      { name: "0-30", value: 0 },
      { name: "31-60", value: 0 },
      { name: "61-90", value: 0 },
      { name: "90+", value: 0 },
    ];

    const openInvoices = docs.filter(
      (d) => d.doc_type === "sales_invoice" && d.payment_status !== "paid" && d.due_date
    );

    for (const inv of openInvoices) {
      const diffMs = now.getTime() - new Date(inv.due_date!).getTime();
      const days = Math.max(0, Math.floor(diffMs / 864e5));
      const amt = Number(inv.total ?? 0);

      if (days <= 30) buckets[0].value += amt;
      else if (days <= 60) buckets[1].value += amt;
      else if (days <= 90) buckets[2].value += amt;
      else buckets[3].value += amt;
    }

    return buckets;
  }, [docs]);

  // Borç / Alacak (Ee / fe)
  const debtCreditData = React.useMemo(() => {
    const balMap = new Map((balancesQuery.data ?? []).map((b) => [b.contact_id, Number(b.balance)]));
    const alacaklar: Array<{ id: string; name: string; bal: number }> = [];
    const borclar: Array<{ id: string; name: string; bal: number }> = [];

    for (const c of allContacts) {
      const bal = balMap.get(c.id) ?? Number(c.opening_balance ?? 0);
      if (bal > 0.01) {
        alacaklar.push({ id: c.id, name: c.name, bal });
      } else if (bal < -0.01) {
        borclar.push({ id: c.id, name: c.name, bal: Math.abs(bal) });
      }
    }

    alacaklar.sort((a, b) => b.bal - a.bal);
    borclar.sort((a, b) => b.bal - a.bal);

    return { alacaklar, borclar };
  }, [allContacts, balancesQuery.data]);

  // POS Statistics (S, ne, V)
  const posStats = React.useMemo(() => {
    // Son 14 Gün POS
    const last14Days: Array<{ name: string; satış: number }> = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 864e5);
      const dStr = d.toISOString().split("T")[0];
      const label = `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;

      const dayPosTotal = docs
        .filter((doc) => (doc.doc_type === "pos_sale" || doc.doc_type === "pos") && doc.issue_date === dStr)
        .reduce((sum, doc) => sum + Number(doc.total ?? 0), 0);

      last14Days.push({ name: label, satış: Math.round(dayPosTotal) });
    }

    // Bugün Saatlik POS
    const todayPos = docs.filter(
      (doc) => (doc.doc_type === "pos_sale" || doc.doc_type === "pos") && doc.issue_date === todayStr
    );
    const hourlyMap = new Map<number, { tutar: number; adet: number }>();
    for (const p of todayPos) {
      const h = (p as any).created_at ? new Date((p as any).created_at).getHours() : 12;
      const cur = hourlyMap.get(h) ?? { tutar: 0, adet: 0 };
      cur.tutar += Number(p.total ?? 0);
      cur.adet += 1;
      hourlyMap.set(h, cur);
    }
    const hourly: Array<{ saat: string; tutar: number; adet: number }> = [];
    for (let h = 8; h <= 22; h++) {
      const st = hourlyMap.get(h) ?? { tutar: 0, adet: 0 };
      hourly.push({ saat: `${String(h).padStart(2, "0")}:00`, tutar: Math.round(st.tutar), adet: st.adet });
    }

    // Bu Ay Ödeme Türü
    const posAccounts = accounts.filter(
      (a) => (a.type as string) === "pos" || a.name.toLowerCase().includes("pos")
    );
    const posPaymentTypes = posAccounts.map((a) => ({
      name: a.name,
      value: Number(a.balance ?? 0),
    }));

    return { last14Days, hourly, posPaymentTypes };
  }, [docs, accounts, todayStr]);

  // En Çok Satanlar (he)
  const topSellers = React.useMemo(() => {
    // Current month sales
    const mDocs = docs.filter(
      (d) =>
        (d.doc_type === "sales_invoice" || d.doc_type === "pos_sale" || d.doc_type === "pos") &&
        (d.issue_date ?? "").startsWith(currentMonthKey)
    );
    const mDocSet = new Set(mDocs.map((d) => d.id));

    const pMap = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const line of lines) {
      if (!mDocSet.has(line.document_id)) continue;
      const name = line.description || (line.product_id && prodMap.get(line.product_id)?.name) || "Ürün";
      const qty = Number(line.quantity ?? 1);
      const rev = Number(line.gross_amount ?? line.net_amount ?? 0);

      const cur = pMap.get(name) ?? { name, qty: 0, revenue: 0 };
      cur.qty += qty;
      cur.revenue += rev;
      pMap.set(name, cur);
    }

    const list = Array.from(pMap.values()).sort((a, b) => b.revenue - a.revenue);
    return list;
  }, [docs, lines, prodMap, currentMonthKey]);

  // Export handlers
  const handleExportAll = () => {
    exportExcel("tum_islemler", [
      {
        name: "İşlemler",
        rows: docs,
        columns: [
          { header: "Tarih", value: (d) => d.issue_date },
          { header: "Tür", value: (d) => d.doc_type },
          { header: "Açıklama / Numara", value: (d) => d.number || d.description },
          { header: "Toplam Tutar", value: (d) => d.total, type: "money" },
          { header: "Durum", value: (d) => d.status },
        ],
      },
    ]);
  };

  const handleExportCsv = () => {
    handleExportAll();
  };

  return (
    <div className="flex-1">
      <div>
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 lg:gap-4 mb-5">
          <div className="min-w-0 lg:min-w-[12rem] lg:shrink-0 lg:max-w-[45%]">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Raporlar</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              İşletmenizin finansal analizi
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 min-w-0 lg:justify-end">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn-ghost"
                title="Tüm işlemleri CSV olarak indir"
                onClick={handleExportAll}
              >
                <Download className="h-4 w-4" /> Tüm İşlemler
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={handleExportCsv}
              >
                <Download className="h-4 w-4" /> CSV indir
              </button>
            </div>
          </div>
        </div>

        {/* 4 Gradient KPI Cards (Genel özet) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          {/* Ciro */}
          <div className="rounded-2xl p-4 sm:p-5 text-white bg-gradient-to-br from-amber-400 to-amber-500 shadow-soft min-w-0 overflow-hidden">
            <div className="text-xl sm:text-3xl font-bold tabular-nums truncate">
              {formatMoney(currentMonthSales)}
            </div>
            <div className="text-xs sm:text-sm/relaxed font-medium opacity-90 mt-0.5 truncate">
              {currentMonthName} Cirosu
            </div>
          </div>

          {/* Masraflar */}
          <div className="rounded-2xl p-4 sm:p-5 text-white bg-gradient-to-br from-rose-400 to-rose-500 shadow-soft min-w-0 overflow-hidden">
            <div className="text-xl sm:text-3xl font-bold tabular-nums truncate">
              {formatMoney(currentMonthExpenses)}
            </div>
            <div className="text-xs sm:text-sm/relaxed font-medium opacity-90 mt-0.5 truncate">
              {currentMonthName} Masrafları
            </div>
          </div>

          {/* Alışlar */}
          <div className="rounded-2xl p-4 sm:p-5 text-white bg-gradient-to-br from-blue-400 to-blue-500 shadow-soft min-w-0 overflow-hidden">
            <div className="text-xl sm:text-3xl font-bold tabular-nums truncate">
              {formatMoney(currentMonthPurchases)}
            </div>
            <div className="text-xs sm:text-sm/relaxed font-medium opacity-90 mt-0.5 truncate">
              {currentMonthName} Alışları
            </div>
          </div>

          {/* Net Kâr */}
          <div className="rounded-2xl p-4 sm:p-5 text-white bg-gradient-to-br from-emerald-400 to-emerald-500 shadow-soft min-w-0 overflow-hidden">
            <div className="text-xl sm:text-3xl font-bold tabular-nums truncate">
              {formatMoney(currentMonthProfit)}
            </div>
            <div className="text-xs sm:text-sm/relaxed font-medium opacity-90 mt-0.5 truncate">
              Net Kâr (tahmini)
            </div>
          </div>
        </div>

        {/* 11 Sub-tabs pills (Exact Pusulam structure) */}
        <div className="mb-5">
          <div className="flex gap-2 flex-wrap">
            {[
              { id: "genel", label: "Genel" },
              { id: "kar", label: "Kâr / Zarar" },
              { id: "nakit", label: "Nakit Akışı" },
              { id: "kdv", label: "KDV Takibi" },
              { id: "karlilik", label: "Kârlılık" },
              { id: "kasa", label: "Kasa Gün Sonu" },
              { id: "ceksenet", label: "Çek & Senet" },
              { id: "yaslandirma", label: "Yaşlandırma" },
              { id: "borc", label: "Borç / Alacak" },
              { id: "pos", label: "POS Satış" },
              { id: "tops", label: "En Çok Satan" },
            ].map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                    active
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                      : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-400"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Period Selector (Only for genel, kar, nakit, kdv) */}
        {(activeTab === "genel" || activeTab === "kar" || activeTab === "nakit" || activeTab === "kdv") && (
          <div className="mb-4 flex items-center gap-2 text-sm">
            <span className="text-slate-500">Dönem:</span>
            <div
              className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden"
              role="group"
              aria-label="Rapor dönemi"
            >
              {[
                { id: "day", label: "Günlük" },
                { id: "week", label: "Haftalık" },
                { id: "month", label: "Aylık" },
                { id: "year", label: "Yıllık" },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPeriod(p.id as any)}
                  className={`px-3 py-1.5 font-semibold transition-colors ${
                    period === p.id
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                      : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 1. GENEL */}
        {activeTab === "genel" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="card p-5 lg:col-span-2">
              <h3 className="font-semibold mb-4 text-slate-900 dark:text-white">
                {periodLabel} - Satış / Alış / Masraf
              </h3>
              <div style={{ width: "100%", height: 300 }}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={periodicData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(val) => (val >= 1000 ? `${Math.round(val / 1000)}b` : val)}
                    />
                    <Tooltip
                      formatter={(val: any) => formatMoney(Number(val))}
                      contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", border: "none", color: "#fff", fontSize: "12px" }}
                    />
                    <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: "12px", fontSize: "12px" }} />
                    <Bar dataKey="Satış" fill="#0f9b8e" radius={[6, 6, 0, 0]} maxBarSize={32} />
                    <Bar dataKey="Alış" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={32} />
                    <Bar dataKey="Masraf" fill="#ef4444" radius={[6, 6, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card p-5 flex flex-col">
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <h3 className="font-semibold text-slate-900 dark:text-white">Masraf Dağılımı</h3>
                <span className="text-xs text-slate-400">Son 6 Ay</span>
              </div>
              <div className="mb-4">
                <div className="text-2xl font-bold tabular-nums">{formatMoney(expenseDistribution.total)}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  toplam masraf · {expenseDistribution.count} kalem
                </div>
              </div>
              <ul className="space-y-3 flex-1 overflow-y-auto">
                {expenseDistribution.items.map((cat, idx) => (
                  <li key={idx} title={`${cat.name}: ${formatMoney(cat.amount)} (%${cat.percentage})`}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="font-medium truncate">{cat.name}</span>
                      <span className="shrink-0 tabular-nums">
                        <span className="font-semibold">{formatMoney(cat.amount)}</span>
                        <span className="text-xs text-slate-400 ml-1.5 inline-block w-11 text-right">
                          %{cat.percentage}
                        </span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-rose-500 transition-all duration-300"
                        style={{ width: `${Math.max(4, cat.percentage)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* 2. KÂR / ZARAR */}
        {activeTab === "kar" && (
          <div className="card p-5">
            <h3 className="font-semibold mb-4">Kâr / Zarar Tablosu ({periodLabel})</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-slate-400 border-b border-slate-200 dark:border-slate-700">
                    <th className="py-2">{period === "month" ? "Ay" : period === "week" ? "Hafta" : "Gün"}</th>
                    <th className="py-2 text-right">Gelir</th>
                    <th className="py-2 text-right">Alış Maliyeti</th>
                    <th className="py-2 text-right">Masraf</th>
                    <th className="py-2 text-right">Net Kâr</th>
                  </tr>
                </thead>
                <tbody>
                  {periodicData.map((d) => (
                    <tr key={d.name} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-2.5 font-medium">{d.name}</td>
                      <td className="py-2.5 text-right text-emerald-500 tabular-nums">{formatMoney(d.Satış)}</td>
                      <td className="py-2.5 text-right text-amber-500 tabular-nums">{formatMoney(d.Alış)}</td>
                      <td className="py-2.5 text-right text-rose-500 tabular-nums">{formatMoney(d.Masraf)}</td>
                      <td className={`py-2.5 text-right font-bold tabular-nums ${d.Net >= 0 ? "text-slate-900 dark:text-white" : "text-rose-500"}`}>
                        {formatMoney(d.Net)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5" style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={periodicData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip formatter={(val: any) => formatMoney(Number(val))} />
                  <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: "12px", fontSize: "12px" }} />
                  <Bar dataKey="Satış" fill="#10b981" radius={[4, 4, 0, 0]} name="Gelir" />
                  <Bar dataKey="Alış" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Alış Maliyeti" />
                  <Bar dataKey="Masraf" fill="#ef4444" radius={[4, 4, 0, 0]} name="Masraf" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* 3. NAKİT AKIŞI */}
        {activeTab === "nakit" && (
          <div className="card p-5">
            <h3 className="font-semibold mb-4">Nakit Akışı ({periodLabel})</h3>
            <div style={{ width: "100%", height: 320 }}>
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={periodicData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
                  <XAxis dataKey="name" fontSize={12} stroke="#94a3b8" tickLine={false} />
                  <YAxis fontSize={11} stroke="#94a3b8" tickLine={false} tickFormatter={(val) => (val >= 1000 ? `${Math.round(val / 1000)}b` : val)} />
                  <Tooltip formatter={(val: any) => formatMoney(Number(val))} />
                  <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: "12px", fontSize: "12px" }} />
                  <Bar dataKey="Giriş" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="Çıkış" fill="#ef4444" radius={[6, 6, 0, 0]} maxBarSize={32} />
                  <Line dataKey="Akış" name="Net Akış" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* 4. KDV TAKİBİ */}
        {activeTab === "kdv" && (
          <div className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-semibold">KDV Takibi ({periodLabel})</h3>
                <p className="text-xs text-slate-400 mt-0.5">Ön muhasebe özeti — resmi beyanname değildir.</p>
              </div>
              <div>
                {(() => {
                  const last = periodicData[periodicData.length - 1];
                  const netKdv = last?.KDV ?? 0;
                  return (
                    <div className={`px-3 py-1 rounded-full text-xs font-semibold ${netKdv > 0 ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"}`}>
                      {period === "month" ? currentMonthName : "Bu dönem"}: {netKdv > 0 ? `Hesaplanan net ${formatMoney(netKdv)}` : `Devreden ${formatMoney(Math.abs(netKdv))}`}
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-slate-400 border-b border-slate-200 dark:border-slate-700">
                    <th className="py-2">{period === "month" ? "Ay" : period === "week" ? "Hafta" : "Gün"}</th>
                    <th className="py-2 text-right">Hesaplanan KDV</th>
                    <th className="py-2 text-right">İndirilecek KDV</th>
                    <th className="py-2 text-right">Ödenecek / Devreden</th>
                  </tr>
                </thead>
                <tbody>
                  {periodicData.map((d) => (
                    <tr key={d.name} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-2.5 font-medium">{d.name}</td>
                      <td className="py-2.5 text-right text-emerald-500 tabular-nums">{formatMoney(d.Hesaplanan)}</td>
                      <td className="py-2.5 text-right text-amber-500 tabular-nums">{formatMoney(d.İndirilecek)}</td>
                      <td className={`py-2.5 text-right font-bold tabular-nums ${d.KDV > 0 ? "text-rose-500" : "text-emerald-500"}`}>
                        {d.KDV > 0 ? formatMoney(d.KDV) : `(${formatMoney(Math.abs(d.KDV))})`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5" style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={periodicData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
                  <XAxis dataKey="name" fontSize={12} stroke="#94a3b8" tickLine={false} />
                  <YAxis fontSize={11} stroke="#94a3b8" tickLine={false} tickFormatter={(val) => (val >= 1000 ? `${Math.round(val / 1000)}b` : val)} />
                  <Tooltip formatter={(val: any) => formatMoney(Number(val))} />
                  <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: "12px", fontSize: "12px" }} />
                  <Bar dataKey="Hesaplanan" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="İndirilecek" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={32} />
                  <Line dataKey="KDV" name="Net KDV" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-slate-400 mt-3">
              * Satış ve alış faturalarından hesaplanan dahili KDV özeti. Mali müşaviriniz veya resmi beyan süreci bu programın kapsamı dışındadır.
            </p>
          </div>
        )}

        {/* 5. KÂRLILIK */}
        {activeTab === "karlilik" && (
          <div className="space-y-4">
            <div className="card p-5">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
                <h3 className="font-semibold">Ürün / Müşteri Kârlılığı</h3>
                <div className="flex flex-wrap items-end gap-2">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Başlangıç</label>
                    <input
                      type="date"
                      className="input !py-1.5"
                      value={profitDates.from}
                      onChange={(e) => setProfitDates((p) => ({ ...p, from: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Bitiş</label>
                    <input
                      type="date"
                      className="input !py-1.5"
                      value={profitDates.to}
                      onChange={(e) => setProfitDates((p) => ({ ...p, to: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* 3 Summary Cards */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3">
                  <div className="text-xs text-slate-400">Ciro</div>
                  <div className="font-bold text-emerald-500 tabular-nums">{formatMoney(profitability.totalRevenue)}</div>
                </div>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3">
                  <div className="text-xs text-slate-400">Toplam Kâr</div>
                  <div className={`font-bold tabular-nums ${profitability.totalProfit >= 0 ? "text-slate-900 dark:text-white" : "text-rose-500"}`}>
                    {formatMoney(profitability.totalProfit)}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3">
                  <div className="text-xs text-slate-400">Ort. Marj</div>
                  <div className="font-bold tabular-nums">%{profitability.avgMargin}</div>
                </div>
              </div>

              {/* Products Table */}
              {profitability.prod.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-10">Seçili aralıkta satış yok.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase text-slate-400 border-b border-slate-200 dark:border-slate-700">
                        <th className="py-2">Ürün</th>
                        <th className="py-2 text-right">Adet</th>
                        <th className="py-2 text-right">Ciro</th>
                        <th className="py-2 text-right">Maliyet</th>
                        <th className="py-2 text-right">Kâr</th>
                        <th className="py-2 text-right">Marj</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profitability.prod.slice(0, 50).map((p, idx) => (
                        <tr key={idx} className="border-b border-slate-100 dark:border-slate-800">
                          <td className="py-2.5 font-medium truncate max-w-[220px]">{p.name}</td>
                          <td className="py-2.5 text-right tabular-nums">{p.qty}</td>
                          <td className="py-2.5 text-right text-emerald-500 tabular-nums">{formatMoney(p.revenue)}</td>
                          <td className="py-2.5 text-right text-amber-500 tabular-nums">{formatMoney(p.cost)}</td>
                          <td className={`py-2.5 text-right font-bold tabular-nums ${p.profit >= 0 ? "text-slate-900 dark:text-white" : "text-rose-500"}`}>
                            {formatMoney(p.profit)}
                          </td>
                          <td className="py-2.5 text-right text-slate-500 tabular-nums">%{p.margin}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-xs text-slate-400 mt-3">* Maliyet, ürün kartındaki güncel alış fiyatına göre hesaplanır.</p>
            </div>

            {/* En Kârlı Müşteriler */}
            {profitability.cust.length > 0 && (
              <div className="card p-5">
                <h3 className="font-semibold mb-3">En Kârlı Müşteriler</h3>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {profitability.cust.slice(0, 15).map((c, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2.5 gap-3">
                      <span className="text-sm truncate font-medium">{c.name}</span>
                      <div className="flex items-center gap-4 shrink-0">
                        <span className="text-xs text-slate-400">Ciro: {formatMoney(c.revenue)}</span>
                        <span className={`font-semibold tabular-nums ${c.profit >= 0 ? "text-slate-900 dark:text-white" : "text-rose-500"}`}>
                          {formatMoney(c.profit)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 6. KASA GÜN SONU */}
        {activeTab === "kasa" && (
          <div className="card p-5">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
              <div>
                <h3 className="font-semibold">Kasa Gün Sonu</h3>
                <p className="text-xs text-slate-400 mt-0.5">{formatDate(kasaDate)} tarihli hesap hareketleri</p>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Tarih</label>
                <input
                  type="date"
                  className="input !py-1.5"
                  value={kasaDate}
                  onChange={(e) => setKasaDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 p-3">
                <div className="text-xs text-emerald-600 dark:text-emerald-400">Toplam Giren</div>
                <div className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatMoney(kasaData.totalIn)}</div>
              </div>
              <div className="rounded-xl bg-rose-50 dark:bg-rose-900/20 p-3">
                <div className="text-xs text-rose-600 dark:text-rose-400">Toplam Çıkan</div>
                <div className="font-bold text-rose-600 dark:text-rose-400 tabular-nums">{formatMoney(kasaData.totalOut)}</div>
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3">
                <div className="text-xs text-slate-400">Net</div>
                <div className={`font-bold tabular-nums ${kasaData.net >= 0 ? "text-slate-900 dark:text-white" : "text-rose-500"}`}>
                  {formatMoney(kasaData.net)}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-slate-400 border-b border-slate-200 dark:border-slate-700">
                    <th className="py-2">Hesap</th>
                    <th className="py-2 text-right">Giren</th>
                    <th className="py-2 text-right">Çıkan</th>
                    <th className="py-2 text-right">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {kasaData.rows.map((r, idx) => (
                    <tr key={idx} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-2.5 font-medium">{r.name}</td>
                      <td className="py-2.5 text-right text-emerald-500 tabular-nums">{formatMoney(r.in)}</td>
                      <td className="py-2.5 text-right text-rose-500 tabular-nums">{formatMoney(r.out)}</td>
                      <td className={`py-2.5 text-right font-bold tabular-nums ${r.net >= 0 ? "text-slate-900 dark:text-white" : "text-rose-500"}`}>
                        {formatMoney(r.net)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-400 mt-3">
              * Peşin satış/alışlar, tahsilat/ödemeler, ödenen masraflar, hesap transferleri ve elle giriş/çıkışlar dahildir.
            </p>
          </div>
        )}

        {/* 7. ÇEK & SENET */}
        {activeTab === "ceksenet" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card p-4">
                <div className="text-xs text-slate-400">Aktif Portföy</div>
                <div className="text-xl font-bold text-blue-500 tabular-nums mt-1">{formatMoney(chequeData.totalActive)}</div>
              </div>
              <div className="card p-4">
                <div className="text-xs text-slate-400">Vadesi Geçen</div>
                <div className="text-xl font-bold text-amber-500 tabular-nums mt-1">{formatMoney(chequeData.overdueTotal)}</div>
              </div>
              <div className="card p-4">
                <div className="text-xs text-slate-400">Yaklaşan Vade</div>
                <div className="text-xl font-bold text-slate-900 dark:text-white tabular-nums mt-1">{chequeData.upcoming.length} adet</div>
              </div>
              <div className="card p-4">
                <div className="text-xs text-slate-400">Toplam Kayıt</div>
                <div className="text-xl font-bold text-emerald-500 tabular-nums mt-1">{chequeData.totalCount} adet</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="card p-5">
                <h3 className="font-semibold mb-4">Durum Dağılımı</h3>
                <div className="space-y-2.5">
                  {chequeData.byStatus.map((s, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-100 dark:border-slate-800">
                      <span className="font-medium">{s.name}</span>
                      <span className="font-semibold tabular-nums">{formatMoney(s.value)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card p-5">
                <h3 className="font-semibold mb-3 text-rose-500">Vadesi Geçen</h3>
                {chequeData.overdueList.length === 0 ? (
                  <p className="text-sm text-slate-400 py-6 text-center">Vadesi geçen çek/senet yok.</p>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto">
                    {chequeData.overdueList.map((c) => (
                      <div key={c.id} className="flex justify-between py-2.5 gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{c.serial_number || "Evrak"} · {c.contact?.name || "Cari"}</div>
                          <div className="text-xs text-slate-400">Vade: {formatDate(c.due_date)}</div>
                        </div>
                        <span className="font-semibold text-rose-500 shrink-0 tabular-nums">{formatMoney(Number(c.amount ?? 0))}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="card p-5">
              <h3 className="font-semibold mb-3">Yaklaşan Vadeler (Portföy + Banka)</h3>
              {chequeData.upcoming.length === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center">Yaklaşan vade yok.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase text-slate-400 border-b border-slate-200 dark:border-slate-700">
                        <th className="py-2">Belge</th>
                        <th className="py-2">Cari</th>
                        <th className="py-2">Durum</th>
                        <th className="py-2">Vade</th>
                        <th className="py-2 text-right">Tutar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chequeData.upcoming.map((c) => (
                        <tr key={c.id} className="border-b border-slate-100 dark:border-slate-800">
                          <td className="py-2.5 font-medium">{c.serial_number || "Çek"}</td>
                          <td className="py-2.5">{c.contact?.name || "—"}</td>
                          <td className="py-2.5 text-xs text-slate-400">{c.status}</td>
                          <td className="py-2.5 text-slate-400">{formatDate(c.due_date)}</td>
                          <td className="py-2.5 text-right font-semibold tabular-nums">{formatMoney(Number(c.amount ?? 0))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 8. YAŞLANDIRMA */}
        {activeTab === "yaslandirma" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-5">
              <h3 className="font-semibold mb-4">Alacak Yaşlandırma (Gün)</h3>
              <div style={{ width: "100%", height: 280 }}>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={agingData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
                    <XAxis dataKey="name" fontSize={12} stroke="#94a3b8" tickLine={false} />
                    <YAxis fontSize={11} stroke="#94a3b8" tickLine={false} tickFormatter={(val) => (val >= 1000 ? `${Math.round(val / 1000)}b` : val)} />
                    <Tooltip formatter={(val: any) => formatMoney(Number(val))} />
                    <Bar dataKey="value" name="Tutar" radius={[6, 6, 0, 0]}>
                      {agingData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={["#10b981", "#f59e0b", "#f97316", "#ef4444"][index % 4]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card p-5">
              <h3 className="font-semibold mb-3">Vade Dağılımı</h3>
              <div className="space-y-3 mt-2">
                {agingData.map((d, idx) => {
                  const maxVal = Math.max(1, ...agingData.map((x) => x.value));
                  const pct = Math.min(100, Math.round((d.value / maxVal) * 100));
                  return (
                    <div key={d.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{d.name} gün</span>
                        <span className="font-semibold tabular-nums">{formatMoney(d.value)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${d.value > 0 ? Math.max(4, pct) : 0}%`,
                            background: ["#10b981", "#f59e0b", "#f97316", "#ef4444"][idx % 4],
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 9. BORÇ / ALACAK */}
        {activeTab === "borc" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-5">
              <h3 className="font-semibold mb-3 text-emerald-500">Alacaklar (Müşteriler)</h3>
              {debtCreditData.alacaklar.length === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center">Kayıt yok.</p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-96 overflow-y-auto">
                  {debtCreditData.alacaklar.map((c) => (
                    <div key={c.id} className="flex justify-between py-2.5 items-center">
                      <span className="text-sm truncate pr-3 font-medium">{c.name}</span>
                      <span className="font-semibold text-emerald-500 shrink-0 tabular-nums">{formatMoney(c.bal)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card p-5">
              <h3 className="font-semibold mb-3 text-rose-500">Borçlar (Tedarikçiler)</h3>
              {debtCreditData.borclar.length === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center">Kayıt yok.</p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-96 overflow-y-auto">
                  {debtCreditData.borclar.map((c) => (
                    <div key={c.id} className="flex justify-between py-2.5 items-center">
                      <span className="text-sm truncate pr-3 font-medium">{c.name}</span>
                      <span className="font-semibold text-rose-500 shrink-0 tabular-nums">{formatMoney(c.bal)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 10. POS SATIŞ */}
        {activeTab === "pos" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-5 lg:col-span-2">
              <h3 className="font-semibold mb-4">POS Satış — Son 14 Gün</h3>
              <div style={{ width: "100%", height: 280 }}>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={posStats.last14Days} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
                    <XAxis dataKey="name" fontSize={11} stroke="#94a3b8" tickLine={false} />
                    <YAxis fontSize={11} stroke="#94a3b8" tickLine={false} tickFormatter={(val) => (val >= 1000 ? `${Math.round(val / 1000)}b` : val)} />
                    <Tooltip formatter={(val: any) => formatMoney(Number(val))} />
                    <Bar dataKey="satış" fill="#0f9b8e" radius={[6, 6, 0, 0]} name="Ciro" maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card p-5">
              <h3 className="font-semibold mb-4">Bugün Saatlik POS</h3>
              <div style={{ width: "100%", height: 240 }}>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={posStats.hourly} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
                    <XAxis dataKey="saat" fontSize={10} stroke="#94a3b8" tickLine={false} />
                    <YAxis fontSize={10} stroke="#94a3b8" tickLine={false} />
                    <Tooltip formatter={(val: any) => formatMoney(Number(val))} />
                    <Bar dataKey="tutar" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card p-5">
              <h3 className="font-semibold mb-4">Bu Ay Ödeme Türü (POS)</h3>
              {posStats.posPaymentTypes.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-12">POS hesabı veya satışı yok.</p>
              ) : (
                <div className="space-y-2">
                  {posStats.posPaymentTypes.map((p, idx) => (
                    <div key={idx} className="flex justify-between text-sm py-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="font-medium">{p.name}</span>
                      <span className="font-bold tabular-nums">{formatMoney(p.value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 11. EN ÇOK SATAN */}
        {activeTab === "tops" && (
          <div className="card p-5">
            <h3 className="font-semibold mb-4">En Çok Satan Ürünler ({currentMonthName})</h3>
            {topSellers.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-12">Satış verisi yok.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[320px]">
                  <thead>
                    <tr className="text-left text-xs uppercase text-slate-400 border-b border-slate-200 dark:border-slate-700">
                      <th className="py-2">#</th>
                      <th className="py-2">Ürün</th>
                      <th className="py-2 text-right">Adet</th>
                      <th className="py-2 text-right">Ciro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topSellers.map((item, idx) => (
                      <tr key={idx} className="border-b border-slate-100 dark:border-slate-800">
                        <td className="py-2.5 text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 font-medium">{item.name}</td>
                        <td className="py-2.5 text-right tabular-nums">{item.qty.toLocaleString("tr-TR")}</td>
                        <td className="py-2.5 text-right font-semibold text-slate-900 dark:text-white tabular-nums">
                          {formatMoney(item.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
                    Raporlar
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
                  Ciro, kâr/zarar, KDV, yaşlandırma, POS ve daha fazlası; CSV dışa aktarım.
                </p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">
                  Özellikler
                </p>
                <ul className="space-y-1.5 mb-3">
                  <li className="flex gap-2 text-slate-600 dark:text-slate-300">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0"></span>
                    <span>Genel, kâr/zarar, nakit, KDV</span>
                  </li>
                  <li className="flex gap-2 text-slate-600 dark:text-slate-300">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0"></span>
                    <span>Kârlılık, kasa, çek, yaşlandırma</span>
                  </li>
                  <li className="flex gap-2 text-slate-600 dark:text-slate-300">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0"></span>
                    <span>Borç/alacak, POS, çok satanlar</span>
                  </li>
                  <li className="flex gap-2 text-slate-600 dark:text-slate-300">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0"></span>
                    <span>CSV indirme</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
          <button
            type="button"
            title="Raporlar yardımı"
            onClick={() => setHelpOpen(!helpOpen)}
            className="h-9 w-9 rounded-full flex items-center justify-center border transition bg-white/70 dark:bg-slate-900/70 border-slate-200/60 dark:border-slate-700/60 text-slate-400/70 hover:text-slate-500 hover:border-slate-300 dark:hover:text-slate-300 shadow-sm"
          >
            <CircleHelp className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>
    </div>
  );
}
