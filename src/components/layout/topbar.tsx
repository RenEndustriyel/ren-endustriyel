"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Search,
  Bell,
  Moon,
  Sun,
  ChevronDown,
  Building2,
  Check,
  Plus,
  LogOut,
  Settings,
} from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { useOrg } from "@/providers/org-provider";
import { useTheme } from "@/providers/theme-provider";
import { useCommandPalette } from "./command-palette";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown";
import { formatLongDate } from "@/lib/format";

function getInitials(name: string) {
  return name
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toLocaleUpperCase("tr-TR"))
    .join("");
}

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { org, memberships, switchOrg } = useOrg();
  const { theme, setTheme } = useTheme();
  const palette = useCommandPalette();

  const [dateStr, setDateStr] = React.useState("");
  React.useEffect(() => {
    setDateStr(formatLongDate(new Date()));
  }, []);

  const userName =
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email ||
    "Ren Endüstriyel";
  const userInitials = getInitials(userName) || "RE";

  const getPageTitle = (path: string) => {
    if (path === "/panel" || path === "/") return "Panel";
    if (path.startsWith("/urunler") || path.startsWith("/stok/urunler")) return "Ürünler";
    if (path.startsWith("/hizli-satis")) return "Hızlı Satış";
    if (path.startsWith("/yapay-zeka")) return "REN AI";
    if (path.startsWith("/giderler/alis-faturalari") || path.startsWith("/alislar")) return "Alışlar";
    if (path.startsWith("/satislar/faturalar") || path.startsWith("/satislar")) return "Satışlar";
    if (path.startsWith("/giderler/masraflar") || path.startsWith("/masraflar")) return "Masraflar";
    if (path.startsWith("/stok/hareketler") || path.startsWith("/stoklar")) return "Stoklar";
    if (path.startsWith("/cariler/musteriler") || path.startsWith("/musteriler")) return "Müşteriler";
    if (path.startsWith("/cariler/tedarikciler") || path.startsWith("/tedarikciler")) return "Tedarikçiler";
    if (path.startsWith("/satislar/teklifler") || path.startsWith("/teklifler")) return "Teklifler";
    if (path.startsWith("/nakit/hesaplar") || path.startsWith("/hesaplar")) return "Hesaplar";
    if (path.startsWith("/ajanda") || path.startsWith("/cari-hatirlatmalar")) return "Hatırlatmalar";
    if (path.startsWith("/raporlar")) return "Raporlar";
    if (path.startsWith("/ayarlar")) return "Ayarlar";
    return "Panel";
  };

  const pageTitle = getPageTitle(pathname);

  return (
    <header
      className="sticky top-0 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 items-center justify-between gap-2 px-2 sm:px-4 lg:px-8 min-w-0 flex"
      style={{
        paddingTop: "max(0.25rem, env(safe-area-inset-top, 0px))",
        minHeight: "calc(3.5rem + env(safe-area-inset-top, 0px))",
      }}
    >
      {/* Sol: Başlık & Şube & Tarih */}
      <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1 overflow-hidden">
        {/* Mobil Başlık */}
        <div className="min-w-0 flex-1 overflow-hidden lg:hidden">
          <div className="text-[10px] font-medium text-slate-400 truncate leading-none mb-0.5">
            {org?.name || "Ren Endüstriyel"}
          </div>
          <div className="font-bold text-[15px] truncate leading-tight text-slate-900 dark:text-white">
            {pageTitle}
          </div>
        </div>

        {/* Masaüstü Başlık */}
        <div className="hidden lg:block min-w-0 flex-1 overflow-hidden">
          <div className="font-semibold flex items-center gap-2 min-w-0">
            <span className="truncate max-w-[16rem] text-slate-900 dark:text-white font-bold text-sm">
              {org?.name || "Ren Endüstriyel"}
            </span>
            <select
              className="text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1 pr-6 min-w-0 max-w-[22rem] truncate text-slate-700 dark:text-slate-300 outline-none"
              title="Merkez"
              defaultValue="merkez"
            >
              <option value="merkez">Merkez</option>
            </select>
          </div>
          <div className="text-xs text-slate-400 truncate">
            {dateStr || "1 Ekim 2026 Perşembe"}
          </div>
        </div>

        {/* Mobil Şube Seçici */}
        <select
          className="lg:hidden text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-1.5 py-1.5 pr-5 min-w-0 max-w-[5.5rem] truncate shrink-0 text-slate-700 dark:text-slate-300 outline-none"
          title="Merkez"
          defaultValue="merkez"
        >
          <option value="merkez">Merkez</option>
        </select>
      </div>

      {/* Sağ: Arama, Bildirimler, Tema & Kullanıcı */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* Arama Butonu Masaüstü */}
        <button
          onClick={palette.open}
          className="hidden md:flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-400 hover:border-slate-400 dark:hover:border-slate-500 transition mr-1"
        >
          <Search size={15} />
          <span>Ara...</span>
          <kbd className="text-[10px] border border-slate-300 dark:border-slate-600 rounded px-1.5 py-0.5 ml-2 font-mono">
            Ctrl K
          </kbd>
        </button>

        {/* Arama Butonu Mobil */}
        <button
          onClick={palette.open}
          className="md:hidden h-10 w-10 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          title="Ara"
        >
          <Search size={18} className="text-slate-500" />
        </button>

        {/* Bildirimler */}
        <div className="relative">
          <button
            onClick={() => router.push("/ajanda")}
            className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            title="Bildirimler"
          >
            <Bell size={18} className="text-slate-600 dark:text-slate-300" />
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
              3
            </span>
          </button>
        </div>

        {/* Koyu / Açık Mod Geçişi */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="h-10 w-10 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition text-slate-600 dark:text-slate-300"
          title={theme === "dark" ? "Açık moda geç" : "Koyu moda geç"}
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Kullanıcı Menüsü */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 sm:gap-2 rounded-xl pl-1 pr-1 sm:pl-1.5 sm:pr-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition outline-none">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-white flex items-center justify-center text-xs font-bold">
                {userInitials}
              </div>
              <ChevronDown size={16} className="text-slate-400 hidden sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 shadow-xl border-slate-200 dark:border-slate-800">
            <DropdownMenuLabel className="font-semibold text-slate-800 dark:text-slate-200 truncate">
              {userName}
            </DropdownMenuLabel>
            <div className="text-xs text-slate-400 px-2 pb-1 truncate">{user?.email}</div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/ayarlar")} className="rounded-xl">
              <Settings className="size-4 mr-2" /> Ayarlar
            </DropdownMenuItem>
            {memberships && memberships.length > 1 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs font-semibold text-slate-400">Firmalar</DropdownMenuLabel>
                {memberships.map((m) => (
                  <DropdownMenuItem
                    key={m.organization.id}
                    onSelect={() => switchOrg(m.organization.id)}
                    className="rounded-xl"
                  >
                    <Building2 className="size-4 mr-2" />
                    <span className="flex-1 truncate">{m.organization.name}</span>
                    {m.organization.id === org?.id && <Check className="size-4 ml-1 text-emerald-500" />}
                  </DropdownMenuItem>
                ))}
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()} className="text-rose-600 rounded-xl">
              <LogOut className="size-4 mr-2" /> Çıkış Yap
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
