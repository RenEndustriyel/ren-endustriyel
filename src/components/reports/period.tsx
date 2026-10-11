"use client";

import * as React from "react";
import { Input, NativeSelect } from "@/components/ui/input";
import { isoDate } from "@/lib/format";

export type Period = { from: string; to: string };

const presets = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const q = Math.floor(m / 3);
  return {
    this_month: { label: "Bu ay", from: isoDate(new Date(y, m, 1)), to: isoDate(new Date(y, m + 1, 0)) },
    last_month: { label: "Geçen ay", from: isoDate(new Date(y, m - 1, 1)), to: isoDate(new Date(y, m, 0)) },
    this_quarter: { label: "Bu çeyrek", from: isoDate(new Date(y, q * 3, 1)), to: isoDate(new Date(y, q * 3 + 3, 0)) },
    this_year: { label: "Bu yıl", from: `${y}-01-01`, to: `${y}-12-31` },
    last_year: { label: "Geçen yıl", from: `${y - 1}-01-01`, to: `${y - 1}-12-31` },
    last_12: { label: "Son 12 ay", from: isoDate(new Date(y, m - 11, 1)), to: isoDate(new Date(y, m + 1, 0)) },
  } as Record<string, { label: string; from: string; to: string }>;
};

export function usePeriod(initial = "this_year") {
  const [key, setKey] = React.useState(initial);
  const [custom, setCustom] = React.useState<Period>(() => ({ from: presets()[initial].from, to: presets()[initial].to }));
  const p = key === "custom" ? custom : presets()[key];
  return { key, setKey, custom, setCustom, period: { from: p.from, to: p.to } };
}

export function PeriodPicker({ state }: { state: ReturnType<typeof usePeriod> }) {
  const all = presets();
  return (
    <div className="flex flex-wrap gap-2">
      <NativeSelect value={state.key} onChange={(e) => state.setKey(e.target.value)} className="w-40">
        {Object.entries(all).map(([k, v]) => (
          <option key={k} value={k}>
            {v.label}
          </option>
        ))}
        <option value="custom">Tarih aralığı</option>
      </NativeSelect>
      {state.key === "custom" && (
        <>
          <Input type="date" value={state.custom.from} onChange={(e) => state.setCustom((c) => ({ ...c, from: e.target.value }))} className="w-40" aria-label="Başlangıç" />
          <Input type="date" value={state.custom.to} onChange={(e) => state.setCustom((c) => ({ ...c, to: e.target.value }))} className="w-40" aria-label="Bitiş" />
        </>
      )}
    </div>
  );
}

const MONTHS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
export const monthLabel = (m: string) => `${MONTHS[Number(m.slice(5, 7)) - 1]} ${m.slice(2, 4)}`;
