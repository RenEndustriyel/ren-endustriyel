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
                ? "text-slate-900 dark:text-white"
                : "text-slate-400 dark:text-slate-500"
            )}
            aria-current={isPanelActive ? "page" : undefined}
          >
            <span
              className={cn(
                "flex items-center justify-center h-7 w-11 rounded-full transition",
                isPanelActive
                  ? "bg-slate-100 dark:bg-slate-800"
                  : ""
              )}
            >
              <LayoutGrid
                size={20}
                className={isPanelActive ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-500"}
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
                ? "text-slate-900 dark:text-white"
                : "text-slate-400 dark:text-slate-500"
            )}
          >
            <span
              className={cn(
                "flex items-center justify-center h-7 w-11 rounded-full transition",
                isSatisActive ? "bg-slate-100 dark:bg-slate-800" : ""
              )}
            >
              <Zap size={20} className="text-amber-500" />
            </span>
            <span className="leading-none truncate max-w-[4.5rem]">Satış</span>
          </Link>

          {/* 3. Müşteriler */}
          <Link
            href="/musteriler"
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition active:scale-95",
              isMusteriActive
                ? "text-slate-900 dark:text-white"
                : "text-slate-400 dark:text-slate-500"
            )}
          >
            <span
              className={cn(
                "flex items-center justify-center h-7 w-11 rounded-full transition",
                isMusteriActive ? "bg-slate-100 dark:bg-slate-800" : ""
              )}
            >
              <Users size={20} className="text-sky-500" />
            </span>
            <span className="leading-none truncate max-w-[4.5rem]">Müşteriler</span>
          </Link>

          {/* 4. Ürünler */}
          <Link
            href="/urunler"
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition active:scale-95",
              isUrunActive
                ? "text-slate-900 dark:text-white"
                : "text-slate-400 dark:text-slate-500"
            )}
          >
            <span
              className={cn(
                "flex items-center justify-center h-7 w-11 rounded-full transition",
                isUrunActive ? "bg-slate-100 dark:bg-slate-800" : ""
              )}
            >
              <Tag size={20} className="text-violet-500" />
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
