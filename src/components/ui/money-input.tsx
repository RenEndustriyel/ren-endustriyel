"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { inputClass } from "./input";

/** "1.234,56" / "1234.56" / "1234,5" -> sayı */
export function parseNumber(s: string): number {
  const t = s.replace(/\s/g, "").replace(/[₺$€]/g, "");
  if (!t) return 0;
  const normalized = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

const fmt = (n: number, decimals: number) =>
  n.toLocaleString("tr-TR", { minimumFractionDigits: decimals === 2 ? 2 : 0, maximumFractionDigits: decimals });

/** Türkçe biçimli sayı girişi; odaktayken serbest yazılır, odak kaybında biçimlenir */
export function NumberInput({
  value,
  onChange,
  decimals = 2,
  className,
  suffix,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  value: number | null | undefined;
  onChange: (v: number) => void;
  decimals?: number;
  suffix?: string;
}) {
  const [text, setText] = React.useState(() => (value || value === 0 ? fmt(Number(value), decimals) : ""));
  const [focused, setFocused] = React.useState(false);
  const shown = focused ? text : value || value === 0 ? fmt(Number(value), decimals) : "";

  return (
    <div className="relative">
      <input
        {...props}
        inputMode="decimal"
        value={shown}
        onFocus={(e) => {
          setFocused(true);
          setText(value ? String(value).replace(".", ",") : "");
          requestAnimationFrame(() => e.target.select());
        }}
        onBlur={() => setFocused(false)}
        onChange={(e) => {
          setText(e.target.value);
          onChange(parseNumber(e.target.value));
        }}
        className={cn(inputClass, "num text-right", suffix && "pr-9", className)}
      />
      {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">{suffix}</span>}
    </div>
  );
}
