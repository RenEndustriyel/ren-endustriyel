"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import { useContactBalances, useContacts, useRpcQuery } from "@/lib/data";
import { formatMoney, isoDate } from "@/lib/format";
import { exportExcel, sheet } from "@/lib/excel";
import { useOrg } from "@/providers/org-provider";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { DataTable } from "@/components/ui/data-table";
import { Stat } from "@/components/ui/stat";
import { cn } from "@/lib/utils";

type Aging = { contact_id: string; name: string; flow: "in" | "out"; not_due: number | null; d0_30: number | null; d31_60: number | null; d61_90: number | null; d90_plus: number | null; total: number };

export function BalancesReport() {
  const router = useRouter();
  const { org } = useOrg();
  const [tab, setTab] = React.useState<"balances" | "in" | "out">("balances");
  const contacts = useContacts();
  const balances = useContactBalances();
  const aging = useRpcQuery<Aging[]>("report_aging", { p_org: org!.id, p_today: isoDate() });

  const bal = (balances.data ?? [])
    .filter((b) => Math.abs(Number(b.balance)) > 0.004)
    .map((b) => ({ ...b, contact: contacts.data?.find((c) => c.id === b.contact_id) }))
    .filter((b) => b.contact);
  const rec = bal.filter((b) => Number(b.balance) > 0).reduce((s, b) => s + Number(b.balance), 0);
  const pay = bal.filter((b) => Number(b.balance) < 0).reduce((s, b) => s - Number(b.balance), 0);
  const agingRows = (aging.data ?? []).filter((a) => a.flow === tab);
  const n = (v: number | null) => Number(v ?? 0);
  const bucket = (k: keyof Aging, label: string, danger?: boolean) => ({
    key: k as string,
    header: label,
    align: "right" as const,
    sortValue: (r: Aging) => n(r[k] as number),
    cell: (r: Aging) => <span className={cn("num", n(r[k] as number) && danger && "text-danger")}>{n(r[k] as number) ? formatMoney(n(r[k] as number)) : "—"}</span>,
  });

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Cari Bakiyeler ve Yaşlandırma"
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              exportExcel("cari-bakiyeler", [
                sheet({ name: "Bakiyeler", rows: bal, columns: [{ header: "Cari", value: (b) => b.contact!.name, width: 40 }, { header: "VKN/TCKN", value: (b) => b.contact!.tax_number }, { header: "Bakiye (+alacak / -borç)", value: (b) => Number(b.balance), type: "money" }] }),
                sheet<Aging>({
                  name: "Yaşlandırma",
                  rows: aging.data ?? [],
                  columns: [
                    { header: "Cari", value: (a) => a.name, width: 40 },
                    { header: "Tür", value: (a) => (a.flow === "in" ? "Alacak" : "Borç") },
                    { header: "Vadesi gelmemiş", value: (a) => n(a.not_due), type: "money" },
                    { header: "1-30 gün", value: (a) => n(a.d0_30), type: "money" },
                    { header: "31-60 gün", value: (a) => n(a.d31_60), type: "money" },
                    { header: "61-90 gün", value: (a) => n(a.d61_90), type: "money" },
                    { header: "90+ gün", value: (a) => n(a.d90_plus), type: "money" },
                    { header: "Toplam", value: (a) => n(a.total), type: "money" },
                  ],
                }),
              ])
            }
          >
            <Download /> Excel
          </Button>
        }
      />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Toplam alacak" value={rec} tone="success" />
        <Stat label="Toplam borç" value={pay} tone="danger" />
        <Stat label="Net" value={rec - pay} className="col-span-2 lg:col-span-1" />
      </div>
      <Segmented value={tab} onChange={setTab} className="mb-3" options={[{ value: "balances", label: "Bakiyeler" }, { value: "in", label: "Alacak yaşlandırma" }, { value: "out", label: "Borç yaşlandırma" }]} />
      {tab === "balances" ? (
        <DataTable
          rows={bal}
          loading={balances.isPending}
          rowKey={(b) => b.contact_id}
          initialSort={{ key: "b", dir: "desc" }}
          onRowClick={(b) => router.push(`/cariler/detay?id=${b.contact_id}`)}
          columns={[
            { key: "n", header: "Cari", sortValue: (b) => b.contact!.name, cell: (b) => <span className="font-medium">{b.contact!.name}</span> },
            { key: "t", header: "Tür", hideBelow: "md", cell: (b) => <span className="text-xs text-muted">{Number(b.balance) > 0 ? "Bize borçlu" : "Biz borçluyuz"}</span> },
            { key: "b", header: "Bakiye", align: "right", sortValue: (b) => Number(b.balance), cell: (b) => <span className={cn("num font-semibold", Number(b.balance) > 0 ? "text-success" : "text-danger")}>{formatMoney(Math.abs(Number(b.balance)))}</span> },
          ]}
        />
      ) : (
        <DataTable
          rows={agingRows}
          loading={aging.isPending}
          rowKey={(a) => a.contact_id}
          initialSort={{ key: "total", dir: "desc" }}
          onRowClick={(a) => router.push(`/cariler/detay?id=${a.contact_id}`)}
          columns={[
            { key: "name", header: "Cari", sortValue: (a) => a.name, cell: (a) => <span className="font-medium">{a.name}</span> },
            { ...bucket("not_due", "Vadesi gelmemiş"), hideBelow: "lg" as const },
            bucket("d0_30", "1-30", true),
            { ...bucket("d31_60", "31-60", true), hideBelow: "md" as const },
            { ...bucket("d61_90", "61-90", true), hideBelow: "md" as const },
            bucket("d90_plus", "90+", true),
            { ...bucket("total", "Toplam"), cell: (a: Aging) => <span className="num font-semibold">{formatMoney(n(a.total))}</span> },
          ]}
        />
      )}
    </div>
  );
}
