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
} from "lucide-react";
import { useOrg } from "@/providers/org-provider";
import { cn } from "@/lib/utils";
import { useLocalStorage } from "@/lib/use-local-storage";

export const PUSULAM_SIDEBAR_NAV = [
  { href: "/panel", label: "Panel", icon: LayoutGrid, color: "text-white" },
  { href: "/yapay-zeka", label: "REN AI", icon: Sparkles, color: "text-purple-500 animate-pulse-slow" },
  { href: "/hizli-satis", label: "Hızlı Satış", icon: Zap, color: "text-amber-500" },
  { href: "/urunler", label: "Ürünler", icon: Tag, color: "text-violet-500" },
  { href: "/alislar", label: "Alışlar", icon: Scale, color: "text-amber-500" },
  { href: "/satislar/faturalar", label: "Satışlar", icon: ShoppingCart, color: "text-emerald-500" },
  { href: "/masraflar", label: "Masraflar", icon: Banknote, color: "text-rose-500" },
  { href: "/stok/hareketler", label: "Stoklar", icon: Warehouse, color: "text-cyan-500" },
  { href: "/musteriler", label: "Müşteriler", icon: Users, color: "text-sky-500" },
  { href: "/tedarikciler", label: "Tedarikçiler", icon: Truck, color: "text-indigo-500" },
  { href: "/satislar/teklifler", label: "Teklifler", icon: FileText, color: "text-purple-500" },
  { href: "/hesaplar", label: "Hesaplar", icon: Wallet, color: "text-teal-500" },
  { href: "/cari-hatirlatmalar", label: "Hatırlatmalar", icon: Bell, color: "text-amber-600" },
  { href: "/raporlar", label: "Raporlar", icon: ChartColumn, color: "text-fuchsia-500" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { org } = useOrg();
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
        "hidden lg:flex flex-col fixed inset-y-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-20 transition-[width] duration-200",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      {/* 1. Header: Logo, Firma Adı & Daralt Butonu */}
      <div className="py-4 min-h-[4.75rem] flex items-center border-b border-slate-200 dark:border-slate-800 gap-2 px-4">
        <Link
          href="/panel"
          title="Panele git"
          className="transition hover:opacity-80 block flex-1 min-w-0"
        >
          <div className="flex items-center gap-3 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/logo-mark.png"
              alt="Ren Endüstriyel"
              width={48}
              height={48}
              draggable={false}
              className="shrink-0 object-contain select-none"
              style={{ width: "48px", height: "48px" }}
            />
            {!collapsed && (
              <div className="min-w-0 space-y-1">
                <div className="font-extrabold tracking-tight text-slate-900 dark:text-white text-lg leading-none truncate">
                  {org?.name || "Ren Endüstriyel"}
                </div>
                <div className="font-medium text-slate-500 dark:text-slate-400 tracking-wide text-[10px] leading-snug">
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
          className="h-8 w-8 shrink-0 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
        </button>
      </div>

      {/* 2. Menü Listesi */}
      <nav className="flex-1 overflow-y-auto thin-scroll py-2 space-y-0.5 px-3" aria-label="Ana menü">
        {!collapsed && (
          <p className="px-2 pb-1.5 text-[10px] font-medium text-slate-400 dark:text-slate-500 select-none">
            Sıralamak için ⋮⋮ tutup sürükleyin
          </p>
        )}

        {items.map((item, idx) => {
          const isActive =
            item.href === "/panel"
              ? pathname === "/panel" || pathname === "/"
              : item.href === "/urunler"
                ? pathname.startsWith("/urunler") || pathname.startsWith("/stok/urunler")
                : item.href === "/alislar"
                  ? pathname.startsWith("/alislar") || pathname.startsWith("/giderler/alis-faturalari")
                  : item.href === "/masraflar"
                    ? pathname.startsWith("/masraflar") || pathname.startsWith("/giderler/masraflar")
                    : item.href === "/musteriler"
                      ? pathname.startsWith("/musteriler") || pathname.startsWith("/cariler/musteriler")
                      : item.href === "/tedarikciler"
                        ? pathname.startsWith("/tedarikciler") || pathname.startsWith("/cariler/tedarikciler")
                        : item.href === "/hesaplar"
                          ? pathname.startsWith("/hesaplar") || pathname.startsWith("/nakit")
                          : item.href === "/cari-hatirlatmalar"
                            ? pathname.startsWith("/cari-hatirlatmalar") || pathname.startsWith("/ajanda")
                            : item.href === "/raporlar"
                              ? pathname.startsWith("/raporlar")
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
                overIdx === idx && draggedIdx !== idx && "ring-2 ring-slate-400 dark:ring-slate-500 rounded-xl"
              )}
            >
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-xl transition text-sm font-medium",
                  collapsed ? "justify-center p-2.5" : "pl-1.5 pr-3 py-2.5",
                  isActive
                    ? "bg-slate-900 text-white shadow-sm shadow-slate-900/30 font-semibold"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
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
                      "shrink-0 cursor-grab active:cursor-grabbing p-1 rounded-lg touch-none",
                      isActive
                        ? "text-white/70 hover:text-white hover:bg-white/10"
                        : "text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400"
                    )}
                  >
                    <GripVertical size={16} />
                  </span>
                )}

                <Icon
                  size={18}
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
      <div className="p-3 border-t border-slate-100 dark:border-slate-800 space-y-1">
        {!collapsed ? (
          <>
            <Link
              href="/versiyonlar"
              title="Sürüm Geçmişi ve Değişiklik Günlüğü"
              className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              <span className="flex items-center gap-2">
                <Sparkles size={14} className="text-purple-500" />
                <span>v2.4.50 Versiyon Notları</span>
              </span>
              <ExternalLink size={12} className="text-slate-400" />
            </Link>

            <Link
              href="/ayarlar"
              className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <Settings size={18} className="text-slate-400" />
              <span>Ayarlar</span>
            </Link>
          </>
        ) : (
          <Link
            href="/ayarlar"
            title="Ayarlar"
            className="flex items-center justify-center h-10 w-10 mx-auto rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 transition"
          >
            <Settings size={18} />
          </Link>
        )}
      </div>
    </aside>
  );
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-0.5" aria-label="Mobil tam menü">
      {PUSULAM_SIDEBAR_NAV.map((item) => {
        const isActive =
          item.href === "/panel"
            ? pathname === "/panel" || pathname === "/"
            : pathname.startsWith(item.href);
        const Icon = item.icon;

        return (
          <div key={item.href} className="rounded-xl transition">
            <Link
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                isActive
                  ? "bg-slate-900 text-white font-semibold shadow-sm shadow-slate-900/30"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              <Icon size={18} className={cn("shrink-0", isActive ? "text-white" : item.color)} />
              <span className="truncate">{item.label}</span>
            </Link>
          </div>
        );
      })}
    </nav>
  );
}
