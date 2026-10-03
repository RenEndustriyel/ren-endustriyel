"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Sparkles,
  Zap,
  Tag,
  Scale,
  ShoppingCart,
  Banknote,
  Warehouse,
  Users,
  Truck,
  FileText,
  Wallet,
  Bell,
  ChartColumn,
  GripVertical,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { useOrg } from "@/providers/org-provider";
import { cn } from "@/lib/utils";
import { useLocalStorage } from "@/lib/use-local-storage";
import { useChangelog } from "./changelog-context";
import { LATEST_VERSION } from "@/lib/changelog";

export const PUSULAM_SIDEBAR_NAV = [
  { href: "/panel", label: "Panel", icon: LayoutGrid, color: "text-[#00b49c]" },
  { href: "/yapay-zeka", label: "REN AI", icon: Sparkles, color: "text-purple-400 animate-pulse-slow" },
  { href: "/hizli-satis", label: "Hızlı Satış", icon: Zap, color: "text-amber-400" },
  { href: "/urunler", label: "Ürünler", icon: Tag, color: "text-[#00b49c]" },
  { href: "/alislar", label: "Alışlar", icon: Scale, color: "text-amber-400" },
  { href: "/satislar", label: "Satışlar", icon: ShoppingCart, color: "text-emerald-400" },
  { href: "/masraflar", label: "Masraflar", icon: Banknote, color: "text-rose-400" },
  { href: "/stok/hareketler", label: "Stoklar", icon: Warehouse, color: "text-cyan-400" },
  { href: "/musteriler", label: "Müşteriler", icon: Users, color: "text-sky-400" },
  { href: "/tedarikciler", label: "Tedarikçiler", icon: Truck, color: "text-indigo-400" },
  { href: "/satislar/teklifler", label: "Teklifler", icon: FileText, color: "text-purple-400" },
  { href: "/hesaplar", label: "Hesaplar", icon: Wallet, color: "text-teal-400" },
  { href: "/cari-hatirlatmalar", label: "Hatırlatmalar", icon: Bell, color: "text-amber-500" },
  { href: "/raporlar", label: "Raporlar", icon: ChartColumn, color: "text-fuchsia-400" },
];

export function SidebarNav({ onNavigate, collapsed = false }: { onNavigate?: () => void; collapsed?: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 overflow-y-auto thin-scroll py-1.5 space-y-0.5 px-2" aria-label="Ana menü">
      {PUSULAM_SIDEBAR_NAV.map((item) => {
        const isActive =
          item.href === "/panel"
            ? pathname === "/panel" || pathname === "/"
            : item.href === "/satislar"
              ? pathname.startsWith("/satislar")
              : item.href === "/alislar"
                ? pathname.startsWith("/alislar")
                : item.href === "/urunler"
                  ? pathname.startsWith("/urunler") || pathname.startsWith("/stok/urunler")
                  : pathname.startsWith(item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-xl transition text-[13px] font-semibold leading-none",
              collapsed ? "justify-center p-2.5" : "px-3 py-2",
              isActive
                ? "bg-[#00b49c] text-white shadow-xs font-bold"
                : "text-slate-300 hover:text-white hover:bg-[#142530]"
            )}
            title={item.label}
          >
            <Icon size={17} className={cn("shrink-0", isActive ? "text-white" : item.color)} />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { org } = useOrg();
  const { openChangelog } = useChangelog();
  const [stored, setStored] = useLocalStorage("ren-sidebar");
  const collapsed = stored === "collapsed";
  const toggle = () => setStored(collapsed ? "open" : "collapsed");

  const [items, setItems] = React.useState(PUSULAM_SIDEBAR_NAV);
  const [draggedIdx, setDraggedIdx] = React.useState<number | null>(null);
  const [overIdx, setOverIdx] = React.useState<number | null>(null);

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("ren-sidebar-order");
      if (saved) {
        const order: string[] = JSON.parse(saved);
        const sorted = [...PUSULAM_SIDEBAR_NAV].sort((a, b) => {
          const idxA = order.indexOf(a.href);
          const idxB = order.indexOf(b.href);
          if (idxA === -1 && idxB === -1) return 0;
          if (idxA === -1) return 1;
          if (idxB === -1) return -1;
          return idxA - idxB;
        });
        setItems(sorted);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (overIdx !== index) setOverIdx(index);
  };

  const handleDragLeave = () => {
    setOverIdx(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    setOverIdx(null);
    if (draggedIdx === null || draggedIdx === targetIndex) {
      setDraggedIdx(null);
      return;
    }

    const updated = [...items];
    const [moved] = updated.splice(draggedIdx, 1);
    updated.splice(targetIndex, 0, moved);
    setItems(updated);
    setDraggedIdx(null);

    try {
      localStorage.setItem("ren-sidebar-order", JSON.stringify(updated.map((i) => i.href)));
    } catch {
      // ignore
    }
  };

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col fixed inset-y-0 bg-[#0b171e] border-r border-[#182c37] z-20 transition-[width] duration-200 text-slate-300 select-none",
        collapsed ? "w-[68px]" : "w-56"
      )}
    >
      {/* 1. Header: Logo, Firma Adı & Daralt Butonu */}
      <div className="py-2.5 min-h-[3.75rem] flex items-center border-b border-[#182c37] gap-2 px-3 bg-[#091319]">
        <Link
          href="/panel"
          title="Panele git"
          className="transition hover:opacity-85 block flex-1 min-w-0"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/logo-mark.png"
              alt="Ren Endüstriyel"
              width={34}
              height={34}
              draggable={false}
              className="shrink-0 object-contain select-none rounded-xl"
              style={{ width: "34px", height: "34px" }}
            />
            {!collapsed && (
              <div className="min-w-0 space-y-0.5">
                <div className="font-extrabold tracking-tight text-white text-[13px] leading-tight truncate">
                  {org?.name || "Ren Endüstriyel"}
                </div>
                <div className="font-medium text-slate-400 tracking-wide text-[10.5px] leading-none truncate">
                  Kolay kullanım · Ön muhasebe
                </div>
              </div>
            )}
          </div>
        </Link>

        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Menüyü aç" : "Menüyü daralt"}
          title={collapsed ? "Menüyü aç" : "Menüyü daralt"}
          className="h-7 w-7 shrink-0 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-[#142530] transition"
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {/* 2. Menü Listesi */}
      <nav className="flex-1 overflow-y-auto thin-scroll py-1.5 space-y-0.5 px-2" aria-label="Ana menü">
        {!collapsed && (
          <p className="px-2 pb-1 text-[10px] font-medium text-slate-500 select-none">
            Sıralamak için ⋮⋮ sürükleyin
          </p>
        )}

        {items.map((item, idx) => {
          const isActive =
            item.href === "/panel"
              ? pathname === "/panel" || pathname === "/"
              : item.href === "/satislar"
                ? pathname.startsWith("/satislar")
                : item.href === "/alislar"
                  ? pathname.startsWith("/alislar")
                  : item.href === "/urunler"
                    ? pathname.startsWith("/urunler") || pathname.startsWith("/stok/urunler")
                    : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <div
              key={item.href}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, idx)}
              className={cn(
                "rounded-xl transition relative",
                draggedIdx === idx && "opacity-40",
                overIdx === idx && draggedIdx !== idx && "ring-2 ring-[#00b49c] rounded-xl"
              )}
            >
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-xl transition text-[13px] font-semibold leading-none",
                  collapsed ? "justify-center p-2.5" : "pl-1.5 pr-2.5 py-2",
                  isActive
                    ? "bg-[#00b49c] text-white shadow-xs font-bold"
                    : "text-slate-300 hover:bg-[#142530] hover:text-white"
                )}
                title={item.label}
              >
                {!collapsed && (
                  <span
                    draggable
                    onDragStart={(e) => handleDragStart(e, idx)}
                    role="button"
                    tabIndex={0}
                    aria-label={`${item.label} sırasını değiştir`}
                    title="Sürükleyerek sırala"
                    className={cn(
                      "shrink-0 cursor-grab active:cursor-grabbing p-0.5 rounded touch-none",
                      isActive
                        ? "text-white/70 hover:text-white hover:bg-white/10"
                        : "text-slate-600 hover:text-slate-400"
                    )}
                  >
                    <GripVertical size={13} />
                  </span>
                )}

                <Icon
                  size={17}
                  className={cn(
                    "shrink-0",
                    isActive ? "text-white" : item.color
                  )}
                />

                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            </div>
          );
        })}
      </nav>

      {/* 3. Alt Kısım: Versiyon Notları & Ayarlar */}
      <div className="p-2 border-t border-[#182c37] bg-[#091319] space-y-1">
        {!collapsed ? (
          <>
            <button
              type="button"
              onClick={openChangelog}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-[#00b49c] hover:bg-[#142530] transition text-left"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <Sparkles size={14} className="text-[#00b49c] shrink-0" />
                <span className="truncate">v{LATEST_VERSION} Versiyon Notları</span>
              </div>
              <ExternalLink size={12} className="shrink-0 opacity-70" />
            </button>

            <Link
              href="/ayarlar"
              className={cn(
                "flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition text-slate-400 hover:text-white hover:bg-[#142530]",
                pathname === "/ayarlar" && "bg-[#142530] text-white font-bold"
              )}
            >
              <Settings size={15} />
              <span>Ayarlar</span>
            </Link>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={openChangelog}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-[#00b49c] hover:bg-[#142530] transition"
              title={`v${LATEST_VERSION} Güncelleme Notları`}
            >
              <Sparkles size={16} />
            </button>
            <Link
              href="/ayarlar"
              className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-[#142530] transition"
              title="Ayarlar"
            >
              <Settings size={16} />
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
