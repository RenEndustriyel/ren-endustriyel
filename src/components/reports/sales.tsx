"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { useRpcQuery } from "@/lib/data";
import { formatMoney, formatQty } from "@/lib/format";
import { exportExcel } from "@/lib/excel";
import { useOrg } from "@/providers/org-provider";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { DataTable } from "@/components/ui/data-table";
import { Stat } from "@/components/ui/stat";
import { cn } from "@/lib/utils";
import { PeriodPicker, usePeriod } from "./period";

type R = { key: string | null; name: string; quantity: number; net: number; vat: number; total: number; cost: number; profit: number; doc_count: number };

export function SalesReport() {
  const { org } = useOrg();
  const ps = usePeriod("this_month");
  const [group, setGroup] = React.useState<"product" | "contact" | "category">("product");
  const q = useRpcQuery<R[]>("report_sales", { p_org: org!.id, p_from: ps.period.from, p_to: ps.period.to, p_group: group });
  const rows = q.data ?? [];
  const net = rows.reduce((s, r) => s + Number(r.net), 0);
  const profit = rows.reduce((s, r) => s + Number(r.profit), 0);
  const max = Math.max(...rows.map((r) => Number(r.net)), 1);
  const label = group === "product" ? "Ürün" : group === "contact" ? "Müşteri" : "Kategori";

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Satış Analizi"
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              exportExcel(`satis-analizi-${group}`, [
                {
                  name: label,
                  rows,
                  columns: [
                    { header: label, value: (r) => r.name, width: 40 },
                    ...(group === "product" ? [{ header: "Miktar", value: (r: R) => Number(r.quantity), type: "qty" as const }] : []),
                    { header: "Net satış", value: (r) => Number(r.net), type: "money" },
                    { header: "KDV", value: (r) => Number(r.vat), type: "money" },
                    { header: "Toplam", value: (r) => Number(r.total), type: "money" },
                    { header: "Maliyet", value: (r) => Number(r.cost), type: "money" },
                    { header: "Kâr", value: (r) => Number(r.profit), type: "money" },
                    { header: "Marj %", value: (r) => (Number(r.net) ? Math.round((Number(r.profit) / Number(r.net)) * 1000) / 10 : 0) },
                  ],
                },
              ])
            }
          >
            <Download /> Excel
          </Button>
        }
      />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <PeriodPicker state={ps} />
        <Segmented value={group} onChange={setGroup} className="sm:ml-auto" options={[{ value: "product", label: "Ürün" }, { value: "contact", label: "Müşteri" }, { value: "category", label: "Kategori" }]} />
      </div>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Net satış (KDV hariç)" value={net} tone="primary" />
        <Stat label="Brüt kâr" value={profit} tone={profit >= 0 ? "success" : "danger"} />
        <Stat label="Kâr marjı" value={<span>%{net ? ((profit / net) * 100).toFixed(1) : "0"}</span>} className="col-span-2 lg:col-span-1" />
      </div>
      <DataTable
        rows={rows}
        loading={q.isPending}
        rowKey={(r) => r.key ?? r.name}
        initialSort={{ key: "net", dir: "desc" }}
        columns={[
          {
            key: "name",
            header: label,
            sortValue: (r) => r.name,
            cell: (r) => (
              <div className="min-w-40">
                <div className="font-medium">{r.name}</div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-chart-in" style={{ width: `${(Number(r.net) / max) * 100}%` }} />
                </div>
              </div>
            ),
          },
          ...(group === "product" ? [{ key: "q", header: "Miktar", align: "right" as const, hideBelow: "md" as const, sortValue: (r: R) => Number(r.quantity), cell: (r: R) => <span className="num">{formatQty(r.quantity)}</span> }] : []),
          { key: "net", header: "Net satış", align: "right", sortValue: (r) => Number(r.net), cell: (r) => <span className="num font-semibold">{formatMoney(r.net)}</span> },
          { key: "cost", header: "Maliyet", align: "right", hideBelow: "lg", sortValue: (r) => Number(r.cost), cell: (r) => <span className="num text-muted">{formatMoney(r.cost)}</span> },
          { key: "profit", header: "Kâr", align: "right", sortValue: (r) => Number(r.profit), cell: (r) => <span className={cn("num", Number(r.profit) < 0 ? "text-danger" : "text-success")}>{formatMoney(r.profit)}</span> },
          { key: "m", header: "Marj", align: "right", hideBelow: "md", sortValue: (r) => (Number(r.net) ? Number(r.profit) / Number(r.net) : 0), cell: (r) => <span className="num text-muted">%{Number(r.net) ? ((Number(r.profit) / Number(r.net)) * 100).toFixed(1) : "0"}</span> },
        ]}
      />
    </div>
  );
}
