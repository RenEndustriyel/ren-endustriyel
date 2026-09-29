"use client";

import * as React from "react";
import Link from "next/link";
import { PanelLeftClose, PanelLeftOpen, ChevronDown } from "lucide-react";
import { NAV } from "@/lib/nav";
import { useOrg } from "@/providers/org-provider";
import { cn } from "@/lib/utils";
import { useLocalStorage } from "@/lib/use-local-storage";
import { BrandMark } from "./brand";
import { SidebarLink, useIsActive } from "./nav-link";

export function SidebarNav({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const { role } = useOrg();
  const isActive = useIsActive();
  // İlk açılışta hepsi kapalı
  const [openGroup, setOpenGroup] = React.useState<string | null>(null);

  const toggleGroup = (title: string) => {
    // Tıklanan açılır, diğeri kapanır (tek açık modül)
    setOpenGroup((prev) => (prev === title ? null : title));
  };

  return (
    <nav className="flex flex-col gap-3">
      {NAV.map((group, gi) => {
        const items = group.items.filter((i) => !role || !i.hideFor?.includes(role));
        if (!items.length) return null;

        // Başlıksız gruplar (Güncel Durum, Hızlı Satış veya Ajanda, Ayarlar) doğrudan link olarak görünür
        if (!group.title) {
          return (
            <div key={gi} className="flex flex-col gap-0.5">
              {items.map((item) => (
                <SidebarLink key={item.href} item={item} collapsed={collapsed} onNavigate={onNavigate} />
              ))}
            </div>
          );
        }

        const hasActiveChild = items.some((item) => isActive(item.href));
        const isOpen = openGroup === group.title || (openGroup === null && hasActiveChild);
        const Icon = group.icon;

        return (
          <div key={gi} className="flex flex-col gap-0.5">
            {collapsed ? (
              <>
                <div className="mx-3 my-1 h-px bg-white/[0.06]" />
                <button
                  type="button"
                  onClick={() => toggleGroup(group.title)}
                  title={group.title}
                  className={cn(
                    "group relative flex size-10 mx-auto items-center justify-center rounded-lg transition-colors",
                    isOpen
                      ? "bg-white/[0.09] text-white"
                      : hasActiveChild
                      ? "bg-white/[0.05] text-sidebar-active"
                      : "text-sidebar-muted hover:bg-white/[0.04] hover:text-white",
                  )}
                  aria-expanded={isOpen}
                >
                  {Icon && <Icon className="size-[18px]" />}
                </button>
                {isOpen && (
                  <div className="my-1 flex flex-col gap-0.5">
                    {items.map((item) => (
                      <SidebarLink key={item.href} item={item} collapsed onNavigate={onNavigate} />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => toggleGroup(group.title)}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] transition-all text-left select-none",
                    isOpen
                      ? "bg-white/[0.07] font-semibold text-white"
                      : hasActiveChild
                      ? "text-white font-medium bg-white/[0.03]"
                      : "text-sidebar-fg/80 font-medium hover:bg-white/[0.04] hover:text-white",
                  )}
                  aria-expanded={isOpen}
                >
                  {Icon && (
                    <Icon
                      className={cn(
                        "size-[18px] shrink-0 transition-colors",
                        isOpen || hasActiveChild
                          ? "text-sidebar-active"
                          : "text-sidebar-muted group-hover:text-sidebar-fg",
                      )}
                    />
                  )}
                  <span className="truncate flex-1">{group.title}</span>
                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 text-sidebar-muted transition-transform duration-200",
                      isOpen && "rotate-180 text-sidebar-fg",
                    )}
                  />
                </button>

                {isOpen && (
                  <div className="flex flex-col gap-0.5 ml-3 pl-3 border-l border-white/[0.08] my-0.5">
                    {items.map((item) => (
                      <SidebarLink
                        key={item.href}
                        item={item}
                        collapsed={false}
                        onNavigate={onNavigate}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </nav>
  );
}

import { useChangelog } from "./changelog-context";
import { LATEST_VERSION } from "@/lib/changelog";
import { Sparkles } from "lucide-react";
import { InstallButton } from "./install-banner";

export function Sidebar() {
  const { org } = useOrg();
  const { openChangelog, hasUnread } = useChangelog();
  const [stored, setStored] = useLocalStorage("ren-sidebar");
  const collapsed = stored === "collapsed";
  const toggle = () => setStored(collapsed ? "open" : "collapsed");

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 flex-col bg-sidebar text-sidebar-fg md:flex",
        // tablet: dar ikon çubuğu, masaüstü: tam menü (kullanıcı daraltabilir)
        "md:w-[72px]",
        collapsed ? "lg:w-[72px]" : "lg:w-60",
      )}
    >
      <Link
        href="/panel"
        className={cn(
          "flex h-16 shrink-0 items-center gap-3 border-b border-white/[0.06] md:justify-center md:px-0",
          !collapsed && "lg:justify-start lg:px-4",
        )}
      >
        <BrandMark size={38} />
        <div className={cn("min-w-0 leading-tight", "hidden", !collapsed && "lg:block")}>
          <div className="truncate text-[15px] font-bold text-white">{org?.name ?? "Ren Endüstriyel"}</div>
          <div className="text-[11px] text-sidebar-muted">Ön Muhasebe</div>
        </div>
      </Link>

      <div className="thin-scroll flex-1 overflow-y-auto px-2.5 py-4">
        {/* tablet */}
        <div className="lg:hidden">
          <SidebarNav collapsed />
        </div>
        {/* masaüstü */}
        <div className="hidden lg:block">
          <SidebarNav collapsed={collapsed} />
        </div>
      </div>

      {/* Sabit Sol Alt Alan: Uygulama Yükle, Güncelleme Notları & Menü Daralt */}
      <div className="shrink-0 border-t border-white/[0.06] p-2 flex flex-col gap-1">
        {collapsed ? (
          <>
            <InstallButton
              className="group relative flex size-10 mx-auto items-center justify-center rounded-lg text-sidebar-muted hover:bg-white/[0.08] hover:text-white transition-colors"
            />
            <button
              type="button"
              onClick={openChangelog}
              title={`Güncelleme Notları (v${LATEST_VERSION})`}
              className="group relative flex size-10 mx-auto items-center justify-center rounded-lg text-sidebar-muted hover:bg-white/[0.08] hover:text-white transition-colors"
            >
              <Sparkles className="size-4 text-amber-400" />
              {hasUnread && (
                <>
                  <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-emerald-500 animate-ping" />
                  <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-emerald-500" />
                </>
              )}
            </button>
          </>
        ) : (
          <>
            <InstallButton
              variant="menuItem"
              className="group flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium text-sidebar-fg/80 hover:bg-white/[0.08] hover:text-white transition-colors select-none"
            />
            <button
              type="button"
              onClick={openChangelog}
              className="group flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium text-sidebar-fg/80 hover:bg-white/[0.08] hover:text-white transition-colors select-none"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex size-6 items-center justify-center rounded-md bg-amber-400/15 text-amber-400 group-hover:bg-amber-400/25 transition-colors">
                  <Sparkles className="size-3.5" />
                </div>
                <span className="truncate">Güncelleme Notları</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="rounded bg-white/[0.08] px-1.5 py-0.5 text-[10px] font-semibold text-white/90">
                  v{LATEST_VERSION}
                </span>
                {hasUnread && (
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                  </span>
                )}
              </div>
            </button>
          </>
        )}

        <button
          onClick={toggle}
          className="hidden h-9 w-full shrink-0 items-center gap-2 rounded-lg px-2.5 text-xs font-medium text-sidebar-muted hover:bg-white/[0.04] hover:text-white lg:flex"
        >
          {collapsed ? <PanelLeftOpen className="mx-auto size-4" /> : <PanelLeftClose className="size-4" />}
          {!collapsed && "Menüyü daralt"}
        </button>
      </div>
    </aside>
  );
}
