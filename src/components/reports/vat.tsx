"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { useRpcQuery } from "@/lib/data";
import { formatMoney } from "@/lib/format";
import { exportExcel } from "@/lib/excel";
import { useOrg } from "@/providers/org-provider";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { PeriodPicker, usePeriod, monthLabel } from "./period";

type Row = { month: string; vat_rate: number; output_base: number; output_vat: number; input_base: number; input_vat: number };

export function VatReport() {
  const { org } = useOrg();
  const ps = usePeriod("this_year");
  const q = useRpcQuery<Row[]>("report_vat", { p_org: org!.id, p_from: ps.period.from, p_to: ps.period.to });
  const rows = q.data ?? [];
  const months = [...new Set(rows.map((r) => r.month))].sort();
  const byMonth = months.map((m) => {
    const rs = rows.filter((r) => r.month === m);
    const out = rs.reduce((s, r) => s + Number(r.output_vat), 0);
    const inp = rs.reduce((s, r) => s + Number(r.input_vat), 0);
    return { month: m, rates: rs, out, inp, net: out - inp };
  });
  // devreden KDV hesabı
  const withCarry = byMonth.reduce<(typeof byMonth[number] & { carryIn: number; payable: number; carryOut: number })[]>((acc, m) => {
    const carryIn = acc.length ? acc[acc.length - 1].carryOut : 0;
    const payable = m.net - carryIn;
    acc.push({ ...m, carryIn, payable: Math.max(payable, 0), carryOut: Math.max(-payable, 0) });
    return acc;
  }, []);
  const totOut = byMonth.reduce((s, m) => s + m.out, 0);
  const totIn = byMonth.reduce((s, m) => s + m.inp, 0);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="KDV Raporu"
        description="Hesaplanan (satış) ve indirilecek (alış + masraf) KDV"
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              exportExcel("kdv-raporu", [
                {
                  name: "KDV",
                  rows,
                  columns: [
                    { header: "Ay", value: (r) => monthLabel(r.month) },
                    { header: "KDV oranı", value: (r) => `%${Number(r.vat_rate)}` },
                    { header: "Satış matrahı", value: (r) => Number(r.output_base), type: "money" },
                    { header: "Hesaplanan KDV", value: (r) => Number(r.output_vat), type: "money" },
                    { header: "Alış matrahı", value: (r) => Number(r.input_base), type: "money" },
                    { header: "İndirilecek KDV", value: (r) => Number(r.input_vat), type: "money" },
                  ],
                },
              ])
            }
          >
            <Download /> Excel
          </Button>
        }
      />
      <div className="mb-4">
        <PeriodPicker state={ps} />
      </div>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Hesaplanan KDV" value={totOut} />
        <Stat label="İndirilecek KDV" value={totIn} />
        <Stat label={totOut - totIn >= 0 ? "Net ödenecek" : "Net devreden"} value={Math.abs(totOut - totIn)} tone={totOut - totIn >= 0 ? "danger" : "success"} className="col-span-2 lg:col-span-1" />
      </div>
      {q.isPending ? (
        <Skeleton className="h-64 rounded-card" />
      ) : (
        <div className="flex flex-col gap-3">
          {withCarry.map((m) => (
            <Card key={m.month} className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
                <span className="font-semibold">{monthLabel(m.month)}</span>
                <span className={cn("num text-sm font-semibold", m.payable > 0 ? "text-danger" : "text-success")}>
                  {m.payable > 0 ? `Ödenecek ${formatMoney(m.payable)}` : `Sonraki aya devreden ${formatMoney(m.carryOut)}`}
                </span>
              </div>
              <div className="thin-scroll overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-[11px] uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-4 py-2 text-left">Oran</th>
                      <th className="px-3 py-2 text-right">Satış matrahı</th>
                      <th className="px-3 py-2 text-right">Hesaplanan</th>
                      <th className="px-3 py-2 text-right">Alış matrahı</th>
                      <th className="px-4 py-2 text-right">İndirilecek</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {m.rates.map((r) => (
                      <tr key={r.vat_rate}>
                        <td className="px-4 py-2">%{Number(r.vat_rate)}</td>
                        <td className="num px-3 py-2 text-right">{formatMoney(r.output_base)}</td>
                        <td className="num px-3 py-2 text-right">{formatMoney(r.output_vat)}</td>
                        <td className="num px-3 py-2 text-right">{formatMoney(r.input_base)}</td>
                        <td className="num px-4 py-2 text-right">{formatMoney(r.input_vat)}</td>
                      </tr>
                    ))}
                    {m.carryIn > 0 && (
                      <tr className="text-muted">
                        <td className="px-4 py-2" colSpan={4}>
                          Önceki aydan devreden KDV
                        </td>
                        <td className="num px-4 py-2 text-right">{formatMoney(m.carryIn)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
          {!withCarry.length && <Card className="p-8 text-center text-sm text-muted">Bu dönemde KDV&apos;li işlem yok.</Card>}
          <p className="text-xs text-muted">Bilgi amaçlıdır; beyanname için muhasebecinizle kontrol edin. Devreden KDV yalnızca seçilen dönem içinde hesaplanır.</p>
        </div>
      )}
    </div>
  );
}
