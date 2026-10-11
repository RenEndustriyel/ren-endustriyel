"use client";

import { useRouter } from "next/navigation";
import { listHref } from "./store-shared";

/** Liste sıralama seçimi; diğer süzgeçleri koruyarak adresi günceller */
export function SortSelect({ value, options, params }: { value: string; options: readonly { value: string; label: string }[]; params: Record<string, string | undefined> }) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-2 text-[13px] text-[#6f6f6f]">
      <span className="hidden sm:inline">Sırala:</span>
      <select
        value={value}
        aria-label="Sıralama"
        onChange={(e) => router.push(listHref({ ...params, sirala: e.target.value === "onerilen" ? undefined : e.target.value, sayfa: undefined }))}
        className="h-10 rounded-lg border border-[#d9d9d9] bg-white px-3 text-[13px] font-semibold text-[#1e1e1e] outline-none focus:border-[#2d1b7e]"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
