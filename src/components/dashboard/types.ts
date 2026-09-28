export type DashboardSummary = {
  today: string;
  rates: { USD: number; EUR: number };
  kpi: {
    month_sales: number;
    month_expenses: number;
    today_collections: number;
    cash_bank: number;
    receivable: number;
    payable: number;
  };
  collections: { total: number; overdue: number; unplanned: number; unprinted: number };
  payments: { total: number; overdue: number; unplanned: number };
  vat: { this_month: number; last_month: number };
  timeline: {
    id: string;
    doc_type: string;
    number: string | null;
    due_date: string;
    flow: "in" | "out";
    party: string | null;
    amount: number;
    days_overdue: number;
  }[];
  sales_daily: { date: string; amount: number }[];
  sales_monthly: { month: string; amount: number }[];
  top_products: { id: string; name: string; quantity: number; amount: number }[];
  recent: {
    kind: "document" | "transaction";
    id: string;
    type: string;
    number: string | null;
    date: string;
    party: string | null;
    amount: number;
  }[];
  critical_stock: { id: string; name: string; stock_qty: number; critical_stock: number }[];
  currency: { sales_usd: number; sales_eur: number; cash_usd: number; cash_eur: number };
  cash_flow: { opening: number; weeks: { week: number; start: string; in: number; out: number }[] };
};

export const TYPE_LABELS: Record<string, string> = {
  sales_invoice: "Satış",
  pos_sale: "Hızlı satış",
  purchase_invoice: "Alış",
  expense: "Masraf",
  salary: "Maaş",
  sales_return: "Satış iadesi",
  purchase_return: "Alış iadesi",
  collection: "Tahsilat",
  payment: "Ödeme",
  transfer: "Virman",
  opening: "Açılış",
  adjustment: "Düzeltme",
  advance: "Avans",
  cheque_in: "Çek tahsilatı",
  cheque_out: "Çek ödemesi",
  cheque_collect: "Çek tahsili",
  cheque_pay: "Çek ödemesi",
  other_income: "Diğer gelir",
  other_expense: "Diğer gider",
};
