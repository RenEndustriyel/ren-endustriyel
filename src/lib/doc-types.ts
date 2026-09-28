export type DocType =
  | "quote"
  | "sales_order"
  | "sales_delivery"
  | "sales_invoice"
  | "sales_return"
  | "pos_sale"
  | "purchase_order"
  | "purchase_delivery"
  | "purchase_invoice"
  | "purchase_return"
  | "expense"
  | "salary";

export type DocConfig = {
  type: DocType;
  label: string;
  plural: string;
  base: string; // liste rotası
  side: "sales" | "purchase";
  contactKind: "customer" | "supplier";
  contactLabel: string;
  /** vade / ödeme takibi */
  payable: boolean;
  /** stok etkisi (1 giriş, -1 çıkış) */
  stock: -1 | 0 | 1;
  /** fiyat/tutar içerir mi (irsaliyede isteğe bağlı) */
  priced: boolean;
  autoNumber: boolean;
  /** dönüştürülebileceği belgeler */
  convertTo: DocType[];
  statuses?: { value: string; label: string }[];
};

const QUOTE_STATUSES = [
  { value: "pending", label: "Bekliyor" },
  { value: "sent", label: "Gönderildi" },
  { value: "accepted", label: "Kabul edildi" },
  { value: "rejected", label: "Reddedildi" },
  { value: "converted", label: "Dönüştürüldü" },
];
const ORDER_STATUSES = [
  { value: "pending", label: "Bekliyor" },
  { value: "approved", label: "Onaylandı" },
  { value: "converted", label: "Faturalandı" },
  { value: "cancelled", label: "İptal" },
];

export const DOC_TYPES: Record<DocType, DocConfig> = {
  quote: { type: "quote", label: "Teklif", plural: "Teklifler", base: "/satislar/teklifler", side: "sales", contactKind: "customer", contactLabel: "Müşteri", payable: false, stock: 0, priced: true, autoNumber: true, convertTo: ["sales_order", "sales_invoice"], statuses: QUOTE_STATUSES },
  sales_order: { type: "sales_order", label: "Satış Siparişi", plural: "Siparişler", base: "/satislar/siparisler", side: "sales", contactKind: "customer", contactLabel: "Müşteri", payable: false, stock: 0, priced: true, autoNumber: true, convertTo: ["sales_delivery", "sales_invoice"], statuses: ORDER_STATUSES },
  sales_delivery: { type: "sales_delivery", label: "Giden İrsaliye", plural: "Giden İrsaliyeler", base: "/satislar/irsaliyeler", side: "sales", contactKind: "customer", contactLabel: "Müşteri", payable: false, stock: -1, priced: true, autoNumber: true, convertTo: ["sales_invoice"] },
  sales_invoice: { type: "sales_invoice", label: "Satış Faturası", plural: "Satış Faturaları", base: "/satislar/faturalar", side: "sales", contactKind: "customer", contactLabel: "Müşteri", payable: true, stock: -1, priced: true, autoNumber: true, convertTo: ["sales_return"] },
  sales_return: { type: "sales_return", label: "Satış İadesi", plural: "Satış İadeleri", base: "/satislar/iadeler", side: "sales", contactKind: "customer", contactLabel: "Müşteri", payable: true, stock: 1, priced: true, autoNumber: true, convertTo: [] },
  pos_sale: { type: "pos_sale", label: "Hızlı Satış", plural: "Hızlı Satışlar", base: "/satislar/hizli-satislar", side: "sales", contactKind: "customer", contactLabel: "Müşteri", payable: true, stock: -1, priced: true, autoNumber: true, convertTo: ["sales_return"] },
  purchase_order: { type: "purchase_order", label: "Satın Alma Siparişi", plural: "Satın Alma Siparişleri", base: "/giderler/siparisler", side: "purchase", contactKind: "supplier", contactLabel: "Tedarikçi", payable: false, stock: 0, priced: true, autoNumber: true, convertTo: ["purchase_delivery", "purchase_invoice"], statuses: ORDER_STATUSES },
  purchase_delivery: { type: "purchase_delivery", label: "Gelen İrsaliye", plural: "Gelen İrsaliyeler", base: "/giderler/irsaliyeler", side: "purchase", contactKind: "supplier", contactLabel: "Tedarikçi", payable: false, stock: 1, priced: true, autoNumber: false, convertTo: ["purchase_invoice"] },
  purchase_invoice: { type: "purchase_invoice", label: "Alış Faturası", plural: "Alış Faturaları", base: "/giderler/alis-faturalari", side: "purchase", contactKind: "supplier", contactLabel: "Tedarikçi", payable: true, stock: 1, priced: true, autoNumber: false, convertTo: ["purchase_return"] },
  purchase_return: { type: "purchase_return", label: "Alış İadesi", plural: "Alış İadeleri", base: "/giderler/iadeler", side: "purchase", contactKind: "supplier", contactLabel: "Tedarikçi", payable: true, stock: -1, priced: true, autoNumber: true, convertTo: [] },
  expense: { type: "expense", label: "Masraf", plural: "Masraflar", base: "/giderler/masraflar", side: "purchase", contactKind: "supplier", contactLabel: "Tedarikçi", payable: true, stock: 0, priced: true, autoNumber: false, convertTo: [] },
  salary: { type: "salary", label: "Maaş Tahakkuku", plural: "Maaşlar", base: "/giderler/maaslar", side: "purchase", contactKind: "supplier", contactLabel: "Çalışan", payable: true, stock: 0, priced: true, autoNumber: false, convertTo: [] },
};

/** Tahsilat (in) mı ödeme (out) mu doğurur */
export const docFlow = (t: DocType): "in" | "out" =>
  t === "sales_invoice" || t === "pos_sale" || t === "purchase_return" ? "in" : "out";

export const PAYMENT_STATUS: Record<string, { label: string; tone: "success" | "warning" | "danger" | "neutral" }> = {
  paid: { label: "Ödendi", tone: "success" },
  partial: { label: "Kısmi", tone: "warning" },
  unpaid: { label: "Açık", tone: "danger" },
  none: { label: "—", tone: "neutral" },
};

export const STATUS_LABEL: Record<string, string> = {
  draft: "Taslak",
  pending: "Bekliyor",
  sent: "Gönderildi",
  accepted: "Kabul edildi",
  rejected: "Reddedildi",
  approved: "Onaylı",
  converted: "Dönüştürüldü",
  cancelled: "İptal",
};

export const VAT_RATES = [0, 1, 10, 20];
export const CURRENCIES = ["TRY", "USD", "EUR"];

export const MOVEMENT_LABELS: Record<string, string> = {
  opening: "Açılış",
  purchase: "Alış",
  sale: "Satış",
  sales_return: "Satış iadesi",
  purchase_return: "Alış iadesi",
  transfer_in: "Transfer girişi",
  transfer_out: "Transfer çıkışı",
  adjustment: "Düzeltme",
  count: "Sayım",
};
