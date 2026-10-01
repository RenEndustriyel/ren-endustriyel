"use client";

import Link from "next/link";
import {
  Sparkles,
  ScanBarcode,
  Package,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  FileText,
  Store,
  Layers,
  Users,
  Building2,
  CreditCard,
  Wallet,
  Landmark,
  BarChart3,
  Calendar,
  Users2,
  Scan,
  BookOpen,
  LayoutDashboard,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const DASHBOARD_MODULES = [
  {
    to: "/panel",
    label: "Panel",
    icon: LayoutDashboard,
    color: "text-slate-700 dark:text-slate-300",
  },
  {
    to: "/yapay-zeka",
    label: "REN AI",
    icon: Sparkles,
    color: "text-purple-500 animate-pulse",
  },
  {
    to: "/hizli-satis",
    label: "Hızlı Satış",
    icon: ScanBarcode,
    color: "text-amber-500",
  },
  {
    to: "/stok/urunler",
    label: "Ürünler",
    icon: Package,
    color: "text-violet-500",
  },
  {
    to: "/giderler/alis-faturalari",
    label: "Alışlar",
    icon: ArrowDownLeft,
    color: "text-amber-500",
  },
  {
    to: "/satislar/faturalar",
    label: "Satışlar",
    icon: ArrowUpRight,
    color: "text-emerald-500",
  },
  {
    to: "/giderler/masraflar",
    label: "Masraflar",
    icon: Receipt,
    color: "text-rose-500",
  },
  {
    to: "/e-fatura",
    label: "e-Fatura",
    icon: FileText,
    color: "text-teal-600",
  },
  {
    to: "/stok/depolar",
    label: "Depolar & Şubeler",
    icon: Store,
    color: "text-sky-600",
  },
  {
    to: "/stok/hareketler",
    label: "Stok Hareketleri",
    icon: Layers,
    color: "text-cyan-500",
  },
  {
    to: "/cariler/musteriler",
    label: "Müşteriler",
    icon: Users,
    color: "text-sky-500",
  },
  {
    to: "/cariler/tedarikciler",
    label: "Tedarikçiler",
    icon: Building2,
    color: "text-indigo-500",
  },
  {
    to: "/satislar/teklifler",
    label: "Teklifler",
    icon: FileText,
    color: "text-purple-500",
  },
  {
    to: "/nakit/cek-senet",
    label: "Çek & Senet",
    icon: CreditCard,
    color: "text-orange-600",
  },
  {
    to: "/nakit/hesaplar",
    label: "Hesaplar",
    icon: Wallet,
    color: "text-teal-500",
  },
  {
    to: "/nakit/ekstre",
    label: "Banka Ekstresi",
    icon: Landmark,
    color: "text-emerald-600",
  },
  {
    to: "/raporlar",
    label: "Raporlar",
    icon: BarChart3,
    color: "text-fuchsia-500",
  },
  {
    to: "/ajanda",
    label: "Ajanda (Takvim)",
    icon: Calendar,
    color: "text-blue-500",
  },
  {
    to: "/giderler/calisanlar",
    label: "Çalışanlar & Ekip",
    icon: Users2,
    color: "text-indigo-500",
  },
  {
    to: "/fiyat-gor",
    label: "Fiyat Gör (Kiosk)",
    icon: Scan,
    color: "text-amber-600",
  },
  {
    to: "/katalog",
    label: "Online Katalog",
    icon: BookOpen,
    color: "text-violet-600",
  },
];

export function ModulesGrid() {
  return (
    <div className="space-y-3">
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        Modüller
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-2.5 sm:gap-3">
        {DASHBOARD_MODULES.map((t) => {
          const Icon = t.icon;
          return (
            <Link
              key={t.to}
              href={t.to}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 sm:p-4 flex flex-col items-center gap-2 shadow-2xs hover:shadow-sm hover:-translate-y-0.5 transition-all group min-w-0"
            >
              <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-slate-200/70 dark:group-hover:bg-slate-700 transition shrink-0">
                <Icon size={20} className={t.color} />
              </div>
              <span className="text-[11px] sm:text-xs font-semibold text-center text-slate-700 dark:text-slate-300 leading-tight line-clamp-2">
                {t.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
