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
import { useChangelog } from "./changelog-context";
import { LATEST_VERSION } from "@/lib/changelog";

// Kullanıcının Pusulam hesabındaki menüyle birebir (14 öğe): sıra, adres ve ikon renkleri.
// `also`: aynı modülün uygulamadaki iç adresleri (bu sayfalardayken de öğe seçili görünür)
export const PUSULAM_SIDEBAR_NAV = [
  { href: "/panel", label: "Panel", icon: LayoutGrid, color: "text-brand-500", also: ["/"] },
  { href: "/numex-ai", label: "REN AI", icon: Sparkles, color: "text-purple-500 animate-pulse-slow", also: ["/yapay-zeka"] },
  { href: "/hizli-satis", label: "Hızlı Satış", icon: Zap, color: "text-amber-500" },
  { href: "/urunler", label: "Ürünler", icon: Tag, color: "text-violet-500", also: ["/stok/urunler"] },
  { href: "/alislar", label: "Alışlar", icon: Scale, color: "text-amber-500", also: ["/giderler/alis-faturalari", "/giderler/irsaliyeler", "/giderler/siparisler", "/giderler/iadeler"] },
  { href: "/satislar", label: "Satışlar", icon: ShoppingCart, color: "text-emerald-500" },
  { href: "/masraflar", label: "Masraflar", icon: Banknote, color: "text-rose-500", also: ["/giderler/masraflar"] },
  { href: "/stoklar", label: "Stoklar", icon: Warehouse, color: "text-cyan-500", also: ["/stok/hareketler", "/stok/sayim", "/stok/transfer", "/stok/depolar"] },
  { href: "/musteriler", label: "Müşteriler", icon: Users, color: "text-sky-500", also: ["/cariler/musteriler"] },
  { href: "/tedarikciler", label: "Tedarikçiler", icon: Truck, color: "text-indigo-500", also: ["/cariler/tedarikciler"] },
  { href: "/teklifler", label: "Teklifler", icon: FileText, color: "text-purple-500", also: ["/satislar/teklifler"] },
  { href: "/hesaplar", label: "Hesaplar", icon: Wallet, color: "text-teal-500", also: ["/nakit/hesaplar", "/nakit/hareketler"] },
  { href: "/cari-hatirlatmalar", label: "Hatırlatmalar", icon: Bell, color: "text-amber-600" },
  { href: "/raporlar", label: "Raporlar", icon: ChartColumn, color: "text-fuchsia-500" },
];

/** Menü öğesinin aktif olup olmadığı (alt sayfalar ve iç adresler dahil) */
function isNavActive(href: string, pathname: string) {
  const item = PUSULAM_SIDEBAR_NAV.find((i) => i.href === href);
  const paths = [href, ...(item?.also ?? [])];
  return paths.some((p) => {
    if (p === "/") return pathname === "/";
    if (p === "/satislar") return pathname.startsWith("/satislar") && !pathname.startsWith("/satislar/teklifler");
    return pathname === p || pathname.startsWith(p + "/");
  });
}

export function SidebarNav({ onNavigate, collapsed = false }: { onNavigate?: () => void; collapsed?: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 overflow-y-auto thin-scroll py-2 space-y-0.5 px-3" aria-label="Ana menü">
      {PUSULAM_SIDEBAR_NAV.map((item) => {
        const isActive = isNavActive(item.href, pathname);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl text-sm font-medium transition",
              collapsed ? "justify-center p-2.5" : "px-3 py-3",
              isActive
                ? "bg-brand-500 text-white shadow-sm shadow-brand-500/30"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
            title={item.label}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon size={18} className={cn("shrink-0", isActive ? "text-white" : item.color)} />
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
        "hidden lg:flex flex-col fixed inset-y-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-20 transition-[width] duration-200",
        collapsed ? "w-[68px]" : "w-64"
      )}
    >
      {/* 1. Başlık: logo, firma adı ve daralt butonu (Pusulam birebir) */}
      <div
        className={cn(
          "py-4 min-h-[4.75rem] flex items-center border-b border-slate-200 dark:border-slate-800 gap-2",
          collapsed ? "px-2 flex-col justify-center" : "px-4"
        )}
      >
        <Link href="/panel" title="Panele git" className="transition hover:opacity-80 block flex-1 min-w-0">
          <div className={cn("flex items-center gap-3 min-w-0", collapsed && "justify-center")}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/logo-mark.png"
              alt={org?.name || "Ren Endüstriyel"}
              width={collapsed ? 36 : 48}
              height={collapsed ? 36 : 48}
              draggable={false}
              className="shrink-0 object-contain select-none rounded-xl"
              style={{ width: collapsed ? 36 : 48, height: collapsed ? 36 : 48 }}
            />
            {!collapsed && (
              <div className="min-w-0 space-y-1">
                <div className="font-extrabold tracking-tight text-brand-600 dark:text-brand-400 text-lg leading-none truncate">
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
          aria-expanded={!collapsed}
          title={collapsed ? "Menüyü aç" : "Menüyü daralt"}
          className="h-8 w-8 shrink-0 rounded-lg flex items-center justify-center text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
        </button>
      </div>

      {/* 2. Menü listesi */}
      <nav className={cn("flex-1 overflow-y-auto thin-scroll py-2 space-y-0.5", collapsed ? "px-2" : "px-3")} aria-label="Ana menü">
        {!collapsed && (
          <p className="px-2 pb-1.5 text-[10px] font-medium text-slate-400 dark:text-slate-500 select-none">
            Sıralamak için ⋮⋮ tutup sürükleyin
          </p>
        )}

        {items.map((item, idx) => {
          const isActive = isNavActive(item.href, pathname);
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
                overIdx === idx && draggedIdx !== idx && "ring-2 ring-brand-400 rounded-xl"
              )}
            >
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-xl text-sm font-medium transition",
                  collapsed ? "justify-center p-2.5" : "pl-1.5 pr-3 py-3 lg:py-2.5",
                  isActive
                    ? "bg-brand-500 text-white shadow-sm shadow-brand-500/30"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
                title={item.label}
                aria-current={isActive ? "page" : undefined}
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

      {/* 3. Alt kısım: versiyon notları ve Ayarlar (Pusulam birebir) */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800 space-y-1">
        {!collapsed ? (
          <>
            <button
              type="button"
              onClick={openChangelog}
              title="Sürüm Geçmişi ve Değişiklik Günlüğü"
              className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/40 hover:bg-brand-100 dark:hover:bg-brand-900/60 transition text-left"
            >
              <span className="flex items-center gap-2 min-w-0">
                <Sparkles size={14} className="shrink-0" />
                <span className="truncate">v{LATEST_VERSION} Versiyon Notları</span>
              </span>
              <ExternalLink size={12} className="shrink-0" />
            </button>

            <Link
              href="/ayarlar"
              className={cn(
                "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                pathname.startsWith("/ayarlar")
                  ? "bg-brand-500 text-white shadow-sm shadow-brand-500/30"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              <Settings size={18} className={pathname.startsWith("/ayarlar") ? "text-white" : "text-slate-400"} />
              Ayarlar
            </Link>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={openChangelog}
              className="h-9 w-9 rounded-lg flex items-center justify-center text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/40 hover:bg-brand-100 dark:hover:bg-brand-900/60 transition"
              title={`v${LATEST_VERSION} Versiyon Notları`}
            >
              <Sparkles size={16} />
            </button>
            <Link
              href="/ayarlar"
              className="h-9 w-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
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
