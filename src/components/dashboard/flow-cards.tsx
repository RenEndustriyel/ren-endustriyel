import { Printer, Percent } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { formatNumber } from "@/lib/format";
import { Ring } from "./ring";
import { Money } from "./money";
import type { DashboardSummary } from "./types";

function SideStat({ icon, value, label, sub }: { icon: React.ReactNode; value: React.ReactNode; label: string; sub?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-4 py-4 sm:px-5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted [&_svg]:size-5">{icon}</span>
      <div className="min-w-0">
        <div className="text-xl font-semibold leading-tight">{value}</div>
        <div className="text-[11px] font-bold uppercase tracking-wide text-muted">{label}</div>
        {sub && <div className="text-xs text-muted">{sub}</div>}
      </div>
    </div>
  );
}

export function CollectionsCard({ data }: { data: DashboardSummary }) {
  const c = data.collections;
  return (
    <Card>
      <CardHeader title={<span className="text-chart-in">Tahsilatlar</span>} href="/satislar/faturalar" hrefLabel="Faturalar" />
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_220px]">
        <div className="grid grid-cols-3 gap-2 p-4 sm:gap-4 sm:p-5 [&>*]:min-w-0">
          <Ring
            label="Toplam tahsil edilecek"
            value={c.total}
            segments={[
              { value: c.overdue, color: "var(--danger)" },
              { value: c.total - c.overdue, color: "var(--chart-in)" },
            ]}
            emptyText="Alacak yok"
          />
          <Ring
            label="Gecikmiş"
            value={c.overdue}
            valueClassName="text-danger"
            segments={[
              { value: c.overdue, color: "var(--danger)" },
              { value: c.total - c.overdue, color: "var(--neutral-ring)" },
            ]}
            emptyText="Gecikme yok"
          />
          <Ring
            label="Planlanmamış"
            value={c.unplanned}
            segments={[
              { value: c.unplanned, color: "var(--muted)" },
              { value: c.total - c.unplanned, color: "var(--neutral-ring)" },
            ]}
            emptyText="Fatura yok"
          />
        </div>
        <div className="border-t border-border md:border-l md:border-t-0">
          <SideStat icon={<Printer />} value={c.unprinted} label="Yazdırılmamış / gönderilmemiş" />
        </div>
      </div>
      <Legend items={[["var(--chart-in)", "Vadesi gelmemiş"], ["var(--danger)", "Gecikmiş"], ["var(--muted)", "Vadesiz"]]} />
    </Card>
  );
}

export function PaymentsCard({ data }: { data: DashboardSummary }) {
  const p = data.payments;
  return (
    <Card>
      <CardHeader title="Ödemeler" href="/giderler/alis-faturalari" hrefLabel="Giderler" />
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_220px]">
        <div className="grid grid-cols-3 gap-2 p-4 sm:gap-4 sm:p-5 [&>*]:min-w-0">
          <Ring
            label="Toplam ödenecek"
            value={p.total}
            segments={[
              { value: p.overdue, color: "var(--danger)" },
              { value: p.total - p.overdue, color: "var(--chart-out)" },
            ]}
            emptyText="Borç yok"
          />
          <Ring
            label="Gecikmiş"
            value={p.overdue}
            valueClassName="text-danger"
            segments={[
              { value: p.overdue, color: "var(--danger)" },
              { value: p.total - p.overdue, color: "var(--neutral-ring)" },
            ]}
            emptyText="Gecikme yok"
          />
          <Ring
            label="Planlanmamış"
            value={p.unplanned}
            segments={[
              { value: p.unplanned, color: "var(--muted)" },
              { value: p.total - p.unplanned, color: "var(--neutral-ring)" },
            ]}
            emptyText="Gider yok"
          />
        </div>
        <div className="border-t border-border md:border-l md:border-t-0">
          <SideStat
            icon={<Percent />}
            value={<Money value={data.vat.this_month} />}
            label="Bu ay oluşan KDV"
            sub={<>Geçen ay: <span className="num font-medium text-text">{formatNumber(data.vat.last_month)}</span></>}
          />
        </div>
      </div>
      <Legend items={[["var(--chart-out)", "Vadesi gelmemiş"], ["var(--danger)", "Gecikmiş"], ["var(--muted)", "Vadesiz"]]} />
    </Card>
  );
}

function Legend({ items }: { items: [string, string][] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border px-4 py-2.5 text-[11px] text-muted sm:px-5">
      {items.map(([color, label]) => (
        <span key={label} className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ background: color }} />
          {label}
        </span>
      ))}
    </div>
  );
}
