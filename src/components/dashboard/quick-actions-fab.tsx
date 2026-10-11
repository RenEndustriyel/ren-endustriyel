"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, X, FileText, Zap, Building2, Scale } from "lucide-react";
import { cn } from "@/lib/utils";

export function QuickActionsFab() {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="fixed z-40 bottom-6 right-6">
      {/* Pop-up Menü */}
      {open && (
        <div className="mb-3 w-64 rounded-2xl border border-slate-200 dark:border-[#1e3544] bg-white dark:bg-[#101e26] shadow-2xl p-3 animate-in fade-in slide-in-from-bottom-3">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 px-2.5 py-1 border-b border-slate-100 dark:border-[#182c37]">
            HIZLI İŞLEMLER
          </div>

          <div className="mt-1 space-y-1">
            <Link
              href="/satislar/faturalar/yeni"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#162732] hover:text-[#00b49c] transition"
            >
              <FileText size={15} className="text-[#00b49c]" />
              <span>SATIŞ FATURASI OLUŞTUR</span>
            </Link>

            <Link
              href="/hizli-satis"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#162732] hover:text-amber-500 transition"
            >
              <Zap size={15} className="text-amber-500" />
              <span>HIZLI FİŞ/FATURA OLUŞTUR</span>
            </Link>

            <Link
              href="/alislar/yeni"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#162732] hover:text-rose-500 transition"
            >
              <Scale size={15} className="text-rose-500" />
              <span>ALIŞ FATURASI OLUŞTUR</span>
            </Link>

            <Link
              href="/cariler/musteriler/yeni"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#162732] hover:text-sky-500 transition"
            >
              <Building2 size={15} className="text-sky-500" />
              <span>MÜŞTERİ OLUŞTUR</span>
            </Link>
          </div>
        </div>
      )}

      {/* Yüzen Yuvarlak Buton */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "h-14 w-14 rounded-full shadow-2xl flex items-center justify-center text-white transition-all transform active:scale-95",
          open
            ? "bg-slate-800 rotate-45"
            : "bg-[#00b49c] hover:bg-[#009e89] hover:scale-105 shadow-[#00b49c]/40"
        )}
        title="Hızlı İşlemler"
        aria-label="Hızlı İşlemler"
      >
        <Plus size={28} strokeWidth={2.5} />
      </button>
    </div>
  );
}
