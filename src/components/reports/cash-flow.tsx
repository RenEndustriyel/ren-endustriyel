"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import { useRows, type Row } from "@/lib/data";
import { formatDate, formatMoney, formatShortDay, isoDate } from "@/lib/format";
import { exportExcel } from "@/lib/excel";
import { DOC_TYPES, docFlow, type DocType } from "@/lib/doc-types";
import { addDays } from "@/lib/doc-calc";
import { useOrg } from "@/providers/org-provider";
import { useDashboard } from "@/components/dashboard/use-dashboard";
import { CashFlowCard } from "@/components/dashboard/cash-flow";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Segmented } from "@/components/ui/segmented";
import { cn } from "@/lib/utils";

type Doc = Row<"documents"> & { contact: { name: string } | null; employee: { name: string } | null; category: { name: string } | null };
type Item = { id: string; date: string; label: string; party: string; flow: "in" | "out"; amount: number; href: string };

export function CashFlowReport() {
  const router = useRouter();
  const { org } = useOrg();
  const dash = useDashboard(org!.id);
  const [filter, setFilter] = React.useState<"all" | "in" | "out">("all");
  const docs = useRows<Doc>("documents", {
    select: "*, contact:contacts(name), employee:employees(name), category:categories(name)",
    params: ["cashflow"],
    filter: (q) => q.in("payment_status", ["unpaid", "partial"]).in("doc_type", ["sales_invoice", "pos_sale", "purchase_invoice", "expense", "salary"]).not("status", "in", "(draft,cancelled)"),
  });
  const cheques = useRows<Row<"cheques"> & { contact: { name: string } | null }>("cheques", {
    select: "*, contact:contacts(name)",
    params: ["cashflow"],
    filter: (q) => q.in("status", ["portfolio", "deposited"]),
  });
  const today = isoDate();
  const items: Item[] = [
    ...(docs.data ?? []).map((d) => ({
      id: d.id,
      date: d.due_date ?? d.issue_date,
      label: `${DOC_TYPES[d.doc_type as DocType].label} ${d.number ?? ""}`,
      party: d.contact?.name ?? d.employee?.name ?? d.category?.name ?? d.description ?? "—",
      flow: docFlow(d.doc_type as DocType),
      amount: (Number(d.total) - Number(d.paid_amount)) * Number(d.exchange_rate),
      href: `${DOC_TYPES[d.doc_type as DocType].base}/detay?id=${d.id}`,
    })),
    ...(cheques.data ?? []).map((c) => ({
      id: c.id,
      date: c.due_date,
      label: `${c.kind === "note" ? "Senet" : "Çek"} ${c.serial_number ?? ""}`,
      party: c.contact?.name ?? c.drawer ?? "—",
      flow: (c.direction === "received" ? "in" : "out") as "in" | "out",
      amount: Number(c.amount) * Number(c.exchange_rate),
      href: "/nakit/cek-senet",
    })),
  ]
    .filter((i) => filter === "all" || i.flow === filter)
    .sort((a, b) => a.date.localeCompare(b.date));

  // haftalara grupla
  const groups = new Map<string, Item[]>();
  for (const i of items) {
    const key = i.date < today ? "Gecikmiş" : i.date <= addDays(today, 6) ? "Bu hafta" : `${formatShortDay(i.date)} haftası`;
    const k = i.date < today ? "0" : i.date <= addDays(today, 6) ? "1" : weekStart(i.date);
    const label = k.length === 1 ? key : `${formatShortDay(k)} haftası`;
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(i);
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Nakit Akışı"
        description="Vadeye göre beklenen tahsilat ve ödemeler"
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              exportExcel("nakit-akisi", [
                {
                  name: "Beklenen hareketler",
                  rows: items,
                  columns: [
                    { header: "Vade", value: (i) => i.date, type: "date" },
                    { header: "Belge", value: (i) => i.label },
                    { header: "Cari", value: (i) => i.party, width: 36 },
                    { header: "Giriş", value: (i) => (i.flow === "in" ? i.amount : ""), type: "money" },
                    { header: "Çıkış", value: (i) => (i.flow === "out" ? i.amount : ""), type: "money" },
                  ],
                },
              ])
            }
          >
            <Download /> Excel
          </Button>
        }
      />
      {dash.data ? <CashFlowCard data={dash.data} /> : <Skeleton className="h-80 rounded-card" />}
      <div className="my-4 flex justify-end">
        <Segmented value={filter} onChange={setFilter} options={[{ value: "all", label: "Tümü" }, { value: "in", label: "Tahsilatlar" }, { value: "out", label: "Ödemeler" }]} />
      </div>
      <div className="flex flex-col gap-3">
        {[...groups.entries()].map(([label, list]) => {
          const tin = list.filter((i) => i.flow === "in").reduce((s, i) => s + i.amount, 0);
          const tout = list.filter((i) => i.flow === "out").reduce((s, i) => s + i.amount, 0);
          return (
            <Card key={label} className="overflow-hidden">
              <CardHeader
                title={<span className={cn(label === "Gecikmiş" && "text-danger")}>{label}</span>}
                action={
                  <span className="num text-xs">
                    <span className="text-success">+{formatMoney(tin)}</span> · <span className="text-danger">−{formatMoney(tout)}</span>
                  </span>
                }
              />
              <ul className="divide-y divide-border">
                {list.map((i) => (
                  <li key={i.id}>
                    <button onClick={() => router.push(i.href)} className="grid w-full grid-cols-[80px_1fr_auto] items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-surface-2">
                      <span className="text-muted">{formatDate(i.date)}</span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{i.party}</span>
                        <span className="block truncate text-xs text-muted">{i.label}</span>
                      </span>
                      <span className={cn("num font-semibold", i.flow === "in" ? "text-success" : "text-danger")}>
                        {i.flow === "in" ? "+" : "−"}
                        {formatMoney(i.amount)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
        {!items.length && <Card className="p-8 text-center text-sm text-muted">Beklenen tahsilat veya ödeme yok.</Card>}
      </div>
    </div>
  );
}

function weekStart(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  const day = (d.getDay() + 6) % 7; // pazartesi
  d.setDate(d.getDate() - day);
  return isoDate(d);
}
