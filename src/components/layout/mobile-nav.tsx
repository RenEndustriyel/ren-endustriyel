"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Zap, Users, Tag, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { MobileMenuSheet } from "./mobile-menu";

export function MobileNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = React.useState(false);

  const isPanelActive = pathname === "/panel" || pathname === "/";
  const isSatisActive = pathname.startsWith("/hizli-satis");
  const isMusteriActive = pathname.startsWith("/cariler/musteriler") || pathname.startsWith("/musteriler");
  const isUrunActive = pathname.startsWith("/stok/urunler") || pathname.startsWith("/urunler");

  return (
    <>
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl"
        aria-label="Mobil menü"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="grid h-14" style={{ gridTemplateColumns: "repeat(5, minmax(0px, 1fr))" }}>
          {/* 1. Panel */}
          <Link
            href="/panel"
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition active:scale-95",
              isPanelActive
                ? "text-brand-600 dark:text-brand-400"
                : "text-slate-400 dark:text-slate-500"
            )}
            aria-current={isPanelActive ? "page" : undefined}
          >
            <span
              className={cn(
                "flex items-center justify-center h-7 w-11 rounded-full transition",
                isPanelActive
                  ? "bg-brand-50 dark:bg-brand-950/60"
                  : ""
              )}
            >
              <LayoutGrid
                size={20}
                className={isPanelActive ? "text-brand-600 dark:text-brand-400" : "text-brand-500"}
              />
            </span>
            <span className="leading-none truncate max-w-[4.5rem]">Panel</span>
          </Link>

          {/* 2. Satış */}
          <Link
            href="/hizli-satis"
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition active:scale-95",
              isSatisActive
                ? "text-brand-600 dark:text-brand-400"
                : "text-slate-400 dark:text-slate-500"
            )}
          >
            <span
              className={cn(
                "flex items-center justify-center h-7 w-11 rounded-full transition",
                isSatisActive ? "bg-brand-50 dark:bg-brand-950/60" : ""
              )}
            >
              <Zap size={20} className={isSatisActive ? "text-brand-600 dark:text-brand-400" : "text-amber-500"} />
            </span>
            <span className="leading-none truncate max-w-[4.5rem]">Satış</span>
          </Link>

          {/* 3. Müşteriler */}
          <Link
            href="/musteriler"
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition active:scale-95",
              isMusteriActive
                ? "text-brand-600 dark:text-brand-400"
                : "text-slate-400 dark:text-slate-500"
            )}
          >
            <span
              className={cn(
                "flex items-center justify-center h-7 w-11 rounded-full transition",
                isMusteriActive ? "bg-brand-50 dark:bg-brand-950/60" : ""
              )}
            >
              <Users size={20} className={isMusteriActive ? "text-brand-600 dark:text-brand-400" : "text-sky-500"} />
            </span>
            <span className="leading-none truncate max-w-[4.5rem]">Müşteriler</span>
          </Link>

          {/* 4. Ürünler */}
          <Link
            href="/urunler"
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition active:scale-95",
              isUrunActive
                ? "text-brand-600 dark:text-brand-400"
                : "text-slate-400 dark:text-slate-500"
            )}
          >
            <span
              className={cn(
                "flex items-center justify-center h-7 w-11 rounded-full transition",
                isUrunActive ? "bg-brand-50 dark:bg-brand-950/60" : ""
              )}
            >
              <Tag size={20} className={isUrunActive ? "text-brand-600 dark:text-brand-400" : "text-brand-500"} />
            </span>
            <span className="leading-none truncate max-w-[4.5rem]">Ürünler</span>
          </Link>

          {/* 5. Menü */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition active:scale-95 text-slate-400 dark:text-slate-500"
            aria-label="Tüm menü"
          >
            <span className="flex items-center justify-center h-7 w-11 rounded-full transition">
              <Menu size={20} />
            </span>
            <span className="leading-none">Menü</span>
          </button>
        </div>
      </nav>

      <MobileMenuSheet open={menuOpen} onOpenChange={setMenuOpen} />
    </>
  );
}
