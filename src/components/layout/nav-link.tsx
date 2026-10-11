"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function useIsActive() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(href + "/");
}

export function SidebarLink({
  item,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const isActive = useIsActive();
  const active = isActive(item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? item.title : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] transition-colors",
        active
          ? "bg-white/[0.07] font-semibold text-white"
          : "text-sidebar-fg/85 hover:bg-white/[0.04] hover:text-white",
        collapsed && "justify-center px-0",
      )}
    >
      {active && <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-r bg-sidebar-active" />}
      <Icon className={cn("size-[18px] shrink-0", active ? "text-sidebar-active" : "text-sidebar-muted group-hover:text-sidebar-fg")} />
      {!collapsed && <span className="truncate">{item.title}</span>}
      {!collapsed && item.href === "/yapay-zeka" && (
        <span className="ml-auto rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 px-1.5 py-0.5 text-[9.5px] font-extrabold text-white shadow-xs">
          AI
        </span>
      )}
      {!collapsed && item.phase && (
        <span className="ml-auto size-1.5 shrink-0 rounded-full bg-sidebar-muted/50" title="Yakında" aria-label="yakında" />
      )}
    </Link>
  );
}
