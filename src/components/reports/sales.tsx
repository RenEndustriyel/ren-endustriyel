"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { useRows } from "@/lib/data";
import { formatMoney, formatQty } from "@/lib/format";
import { exportExcel } from "@/lib/excel";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Stat } from "@/components/ui/stat";
import { cn } from "@/lib/utils";
import { PeriodPicker, usePeriod } from "./period";

type Side = "sales" | "purchase";
type Group = "product" | "contact" | "category";
type VatFilter = "all" | "vat" | "novat";

type Line = {
  id: string;
  product_id: string | null;
  description: string | null;
  quantity: number;
  unit_factor: number | null;
  net_amount: number;
  vat_amount: number;
  total_amount: number;
  vat_rate: number;
  document: {
    id: string;
    doc_type: string;
    exchange_rate: number | null;
    contact_id: string | null;
    contact_snapshot: { name?: string } | null;
    contact: { name: string } | null;
  };
  product: { name: string; category_id: string | null; category: { name: string } | null } | null;
};
type Move = { document_line_id: string | null; quantity: number; unit_cost: number | null };

type R = {
  key: string;
  name: string;
  quantity: number;
  /** KDV'li kalemlerin KDV hariç tutarı */
  netVat: number;
  /** KDV'siz (%0) kalemlerin tutarı */
  netNoVat: number;
  vat: number;
  total: number;
  cost: number;
  docs: number;
};

const TYPES: Record<Side, string[]> = {
  sales: ["sales_invoice", "pos_sale", "sales_return"],
  purchase: ["purchase_invoice", "purchase_return"],
};

const pct = (a: number, b: number) => (b ? ((a / b) * 100).toFixed(1).replace(".", ",") : "0");

/**
 * Satış & alış analizi — KDV'li ve KDV'siz ayrı.
 * Kurallar veritabanı raporuyla (report_sales) aynı: tutarlar KDV hariç ve TL;
 * maliyet satışın stok hareketindeki birim maliyetten (KDV'li alışta KDV hariç, KDV'siz alışta ödenen tutar).
 */
export function SalesReport() {
  const ps = usePeriod("this_month");
  const [side, setSide] = React.useState<Side>("sales");
  const [group, setGroup] = React.useState<Group>("product");
  const [vatFilter, setVatFilter] = React.useState<VatFilter>("all");
  const isSales = side === "sales";
  const { from, to } = ps.period;

  const lines = useRows<Line>("document_lines", {
    select:
      "id, product_id, description, quantity, unit_factor, net_amount, vat_amount, total_amount, vat_rate, document:documents!inner(id, doc_type, issue_date, exchange_rate, contact_id, contact_snapshot, status, deleted_at, contact:contacts(name)), product:products(name, category_id, category:categories(name))",
    softDelete: false,
    params: ["rapor_kdv", side, from, to],
    filter: (q) =>
      q
        .in("document.doc_type", TYPES[side])
        .gte("document.issue_date", from)
        .lte("document.issue_date", to)
        .is("document.deleted_at", null)
        .not("document.status", "in", '("draft","cancelled")'),
  });
  const moves = useRows<Move>("stock_movements", {
    select: "document_line_id, quantity, unit_cost",
    params: ["rapor_kdv_maliyet", from, to],
    enabled: isSales,
    filter: (q) => q.in("movement_type", ["sale", "sales_return"]).gte("movement_date", from).lte("movement_date", to).not("document_line_id", "is", null),
  });

  const costByLine = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const x of moves.data ?? []) {
      if (!x.document_line_id) continue;
      m.set(x.document_line_id, (m.get(x.document_line_id) ?? 0) - Number(x.quantity) * Number(x.unit_cost ?? 0));
    }
    return m;
  }, [moves.data]);

  const { rows, sum } = React.useMemo(() => {
    const map = new Map<string, { r: R; docs: Set<string> }>();
    const sum = { netVat: 0, netNoVat: 0, vat: 0, total: 0, costVat: 0, costNoVat: 0 };
    for (const l of lines.data ?? []) {
      const d = l.document;
      const hasVat = Number(l.vat_rate) > 0;
      if ((vatFilter === "vat" && !hasVat) || (vatFilter === "novat" && hasVat)) continue;
      const sgn = d.doc_type.endsWith("_return") ? -1 : 1;
      const rate = Number(d.exchange_rate) || 1;
      const net = sgn * Number(l.net_amount) * rate;
      const vat = sgn * Number(l.vat_amount) * rate;
      const total = sgn * Number(l.total_amount) * rate;
      const cost = isSales ? (costByLine.get(l.id) ?? 0) : 0;
      const qty = sgn * Number(l.quantity) * (Number(l.unit_factor) || 1);

      const key =
        group === "contact" ? (d.contact_id ?? "_perakende") : group === "category" ? (l.product?.category_id ?? "_kategorisiz") : (l.product_id ?? `_${l.description ?? "—"}`);
      const name =
        group === "contact"
          ? (d.contact?.name ?? d.contact_snapshot?.name ?? (isSales ? "Perakende" : "—"))
          : group === "category"
            ? (l.product?.category?.name ?? "Kategorisiz")
            : (l.product?.name ?? l.description ?? "—");

      let e = map.get(key);
      if (!e) {
        e = { r: { key, name, quantity: 0, netVat: 0, netNoVat: 0, vat: 0, total: 0, cost: 0, docs: 0 }, docs: new Set() };
        map.set(key, e);
      }
      const r = e.r;
      r.quantity += qty;
      if (hasVat) {
        r.netVat += net;
        sum.netVat += net;
        sum.costVat += cost;
      } else {
        r.netNoVat += net;
        sum.netNoVat += net;
        sum.costNoVat += cost;
      }
      r.vat += vat;
      r.total += total;
      r.cost += cost;
      sum.vat += vat;
      sum.total += total;
      e.docs.add(d.id);
    }
    const rows = [...map.values()].map((e) => ({ ...e.r, docs: e.docs.size }));
    return { rows, sum };
  }, [lines.data, costByLine, vatFilter, group, isSales]);

  const net = (r: R) => r.netVat + r.netNoVat;
  const profit = (r: R) => net(r) - r.cost;
  const label = group === "product" ? "Ürün" : group === "contact" ? (isSales ? "Müşteri" : "Tedarikçi") : "Kategori";
  const max = Math.max(...rows.map((r) => Math.abs(net(r))), 1);
  const netAll = sum.netVat + sum.netNoVat;
  const costAll = sum.costVat + sum.costNoVat;
  const profitVat = sum.netVat - sum.costVat;
  const profitNoVat = sum.netNoVat - sum.costNoVat;
  const showVat = vatFilter !== "novat";
  const showNoVat = vatFilter !== "vat";

  const money = (n: number, cls?: string) => <span className={cn("num", cls)}>{formatMoney(n)}</span>;

  const columns: Column<R>[] = [
    {
      key: "name",
      header: label,
      sortValue: (r) => r.name,
      cell: (r) => (
        <div className="min-w-40">
          <div className="font-medium">{r.name}</div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div className={cn("h-full rounded-full", isSales ? "bg-chart-in" : "bg-chart-out")} style={{ width: `${(Math.abs(net(r)) / max) * 100}%` }} />
          </div>
        </div>
      ),
    },
    ...(group === "product"
      ? [{ key: "q", header: "Miktar", align: "right" as const, hideBelow: "md" as const, sortValue: (r: R) => r.quantity, cell: (r: R) => <span className="num">{formatQty(r.quantity)}</span> }]
      : []),
    ...(showVat
      ? [{ key: "nv", header: isSales ? "KDV'li satış" : "KDV'li alış", align: "right" as const, sortValue: (r: R) => r.netVat, cell: (r: R) => money(r.netVat, r.netVat ? "" : "text-muted") }]
      : []),
    ...(showVat && !isSales
      ? [{ key: "vat", header: "İndirilecek KDV", align: "right" as const, hideBelow: "md" as const, sortValue: (r: R) => r.vat, cell: (r: R) => money(r.vat, "text-muted") }]
      : []),
    ...(showNoVat
      ? [{ key: "nn", header: isSales ? "KDV'siz satış" : "KDV'siz alış", align: "right" as const, sortValue: (r: R) => r.netNoVat, cell: (r: R) => money(r.netNoVat, r.netNoVat ? "" : "text-muted") }]
      : []),
    ...(isSales
      ? [
          { key: "cost", header: "Maliyet", align: "right" as const, hideBelow: "lg" as const, sortValue: (r: R) => r.cost, cell: (r: R) => money(r.cost, "text-muted") },
          { key: "profit", header: "Kâr", align: "right" as const, sortValue: profit, cell: (r: R) => money(profit(r), profit(r) < 0 ? "text-danger" : "text-success") },
          { key: "m", header: "Marj", align: "right" as const, hideBelow: "md" as const, sortValue: (r: R) => (net(r) ? profit(r) / net(r) : 0), cell: (r: R) => <span className="num text-muted">%{pct(profit(r), net(r))}</span> },
        ]
      : [
          { key: "netall", header: "Maliyet (KDV hariç)", align: "right" as const, hideBelow: "lg" as const, sortValue: net, cell: (r: R) => money(net(r), "font-semibold") },
          { key: "total", header: "Ödenen toplam", align: "right" as const, sortValue: (r: R) => r.total, cell: (r: R) => money(r.total, "font-semibold") },
        ]),
  ];

  const exportRows = () =>
    exportExcel(`${isSales ? "satis" : "alis"}-analizi-${group}`, [
      {
        name: label,
        rows,
        columns: [
          { header: label, value: (r) => r.name, width: 40 },
          ...(group === "product" ? [{ header: "Miktar", value: (r: R) => r.quantity, type: "qty" as const }] : []),
          { header: isSales ? "KDV'li satış (KDV hariç)" : "KDV'li alış (KDV hariç)", value: (r) => r.netVat, type: "money" },
          { header: isSales ? "KDV'siz satış" : "KDV'siz alış", value: (r) => r.netNoVat, type: "money" },
          { header: isSales ? "Hesaplanan KDV" : "İndirilecek KDV", value: (r) => r.vat, type: "money" },
          { header: "Toplam (KDV dahil)", value: (r) => r.total, type: "money" },
          ...(isSales
            ? [
                { header: "Maliyet", value: (r: R) => r.cost, type: "money" as const },
                { header: "Kâr", value: (r: R) => profit(r), type: "money" as const },
                { header: "Marj %", value: (r: R) => (net(r) ? Math.round((profit(r) / net(r)) * 1000) / 10 : 0) },
              ]
            : []),
        ],
      },
    ]);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={isSales ? "Satış Analizi" : "Alış Analizi"}
        description="Tutarlar KDV hariç ve TL. KDV'siz (%0) kalemler ayrı gösterilir."
        actions={
          <Button size="sm" variant="outline" onClick={exportRows}>
            <Download /> Excel
          </Button>
        }
      />
      <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
        <Segmented
          value={side}
          onChange={setSide}
          options={[
            { value: "sales", label: "Satış" },
            { value: "purchase", label: "Alış" },
          ]}
        />
        <PeriodPicker state={ps} />
        <div className="flex flex-col gap-2 sm:flex-row lg:ml-auto">
          <Segmented
            value={vatFilter}
            onChange={setVatFilter}
            options={[
              { value: "all", label: "Tümü" },
              { value: "vat", label: "KDV'li" },
              { value: "novat", label: "KDV'siz" },
            ]}
          />
          <Segmented
            value={group}
            onChange={setGroup}
            options={[
              { value: "product", label: "Ürün" },
              { value: "contact", label: isSales ? "Müşteri" : "Tedarikçi" },
              { value: "category", label: "Kategori" },
            ]}
          />
        </div>
      </div>

      {isSales ? (
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="KDV'li satış (KDV hariç)" value={sum.netVat} tone="primary" sub={<span className="text-xs text-muted">Kâr {formatMoney(profitVat)} · marj %{pct(profitVat, sum.netVat)}</span>} />
          <Stat label="KDV'siz satış" value={sum.netNoVat} tone="primary" sub={<span className="text-xs text-muted">Kâr {formatMoney(profitNoVat)} · marj %{pct(profitNoVat, sum.netNoVat)}</span>} />
          <Stat label="Brüt kâr" value={netAll - costAll} tone={netAll - costAll >= 0 ? "success" : "danger"} sub={<span className="text-xs text-muted">Maliyet {formatMoney(costAll)}</span>} />
          <Stat label="Kâr marjı" value={<span>%{pct(netAll - costAll, netAll)}</span>} sub={<span className="text-xs text-muted">Hesaplanan KDV {formatMoney(sum.vat)}</span>} />
        </div>
      ) : (
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="KDV'li alış (KDV hariç)" value={sum.netVat} tone="primary" />
          <Stat label="İndirilecek KDV" value={sum.vat} tone="warning" />
          <Stat label="KDV'siz alış" value={sum.netNoVat} tone="primary" />
          <Stat label="Toplam maliyet (KDV hariç)" value={netAll} sub={<span className="text-xs text-muted">Ödenen toplam {formatMoney(sum.total)}</span>} />
        </div>
      )}

      <DataTable rows={rows} loading={lines.isPending || (isSales && moves.isPending)} rowKey={(r) => r.key} initialSort={{ key: showVat ? "nv" : "nn", dir: "desc" }} columns={columns} />
      <p className="mt-3 text-xs text-muted">
        {isSales
          ? "Kâr = KDV hariç satış − maliyet. Maliyet, satış anındaki ortalama alış maliyetidir: KDV'li alışta KDV hariç fiyat, KDV'siz alışta ödenen tutarın tamamı."
          : "KDV'li alışlarda ödenen KDV indirilecek KDV'dir ve maliyete girmez; KDV'siz alışta ödenen tutarın tamamı maliyettir."}
      </p>
    </div>
  );
}
