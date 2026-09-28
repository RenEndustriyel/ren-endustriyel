"use client";

import * as React from "react";
import Link from "next/link";
import { LayoutDashboard, FileText, Plus, Users, Menu } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useIsActive } from "./nav-link";
import { QuickActionsGrid } from "./quick-actions";
import { MobileMenuSheet } from "./mobile-menu";

const TABS = [
  { title: "Panel", href: "/panel", icon: LayoutDashboard },
  { title: "Satışlar", href: "/satislar/faturalar", icon: FileText },
  { title: "Cariler", href: "/cariler/musteriler", icon: Users },
];

export function MobileNav() {
  const isActive = useIsActive();
  const [quickOpen, setQuickOpen] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);

  const tab = (t: (typeof TABS)[number]) => {
    const active = isActive(t.href);
    return (
      <Link
        key={t.href}
        href={t.href}
        className={cn("flex flex-1 flex-col items-center gap-0.5 py-2 text-[10.5px] font-medium", active ? "text-primary" : "text-muted")}
      >
        <t.icon className="size-[22px]" />
        {t.title}
      </Link>
    );
  };

  return (
    <>
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur md:hidden">
        <div className="flex items-stretch">
          {tab(TABS[0])}
          {tab(TABS[1])}
          <div className="flex flex-1 items-center justify-center">
            <button
              onClick={() => setQuickOpen(true)}
              aria-label="Hızlı işlem"
              className="-mt-6 flex size-14 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 ring-4 ring-bg active:scale-95"
            >
              <Plus className="size-7" />
            </button>
          </div>
          {tab(TABS[2])}
          <button
            onClick={() => setMenuOpen(true)}
            className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[10.5px] font-medium text-muted"
          >
            <Menu className="size-[22px]" />
            Menü
          </button>
        </div>
      </nav>

      <Dialog open={quickOpen} onOpenChange={setQuickOpen}>
        <DialogContent title="Hızlı İşlemler">
          <QuickActionsGrid onNavigate={() => setQuickOpen(false)} />
        </DialogContent>
      </Dialog>

      <MobileMenuSheet open={menuOpen} onOpenChange={setMenuOpen} />
    </>
  );
}
