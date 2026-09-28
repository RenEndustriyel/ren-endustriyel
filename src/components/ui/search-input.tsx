"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { inputClass } from "./input";

export function SearchInput({
  value,
  onChange,
  placeholder = "Ara…",
  className,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
      <input
        type="search"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(inputClass, "pl-9 pr-8 [&::-webkit-search-cancel-button]:hidden")}
      />
      {value && (
        <button onClick={() => onChange("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-text" aria-label="Temizle">
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

/** Türkçe duyarlı arama eşleşmesi */
export function matches(text: string | null | undefined, q: string) {
  if (!q) return true;
  const norm = (s: string) => s.toLocaleLowerCase("tr-TR").normalize("NFKD");
  const hay = norm(text ?? "");
  return norm(q)
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => hay.includes(w));
}
