"use client";

import { usePathname, useRouter } from "next/navigation";
import { Search, Moon, Sun, Monitor, LogOut, Settings, Building2, Check, ChevronDown, Plus } from "lucide-react";
import { findNavItem } from "@/lib/nav";
import { useIsClient } from "@/lib/use-local-storage";
import { formatLongDate } from "@/lib/format";
import { useAuth } from "@/providers/auth-provider";
import { useOrg, ROLE_LABELS } from "@/providers/org-provider";
import { useTheme } from "@/providers/theme-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown";
import { BrandMark } from "./brand";
import { OnlineStatus } from "./online-status";
import { useCommandPalette } from "./command-palette";
import { InstallButton } from "./install-banner";

function initials(name: string) {
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
  const { org, role, memberships, switchOrg } = useOrg();
  const { theme, setTheme } = useTheme();
  const palette = useCommandPalette();
  const current = findNavItem(pathname);
  const isClient = useIsClient();
  const today = isClient ? formatLongDate(new Date()) : "";

  const name = (user?.user_metadata?.full_name as string | undefined) || user?.email || "";

  return (
    <header className="pt-safe sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur">
      <div className="flex h-14 items-center gap-2 px-3 sm:h-16 sm:gap-3 sm:px-5">
        {/* telefon: logo */}
        <div className="md:hidden">
          <BrandMark size={32} />
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold sm:text-lg">{current?.title ?? "Ren Endüstriyel"}</h1>
          <DropdownMenu>
            <DropdownMenuTrigger className="hidden max-w-full items-center gap-1 text-xs text-muted hover:text-text sm:flex">
              <span className="truncate">
                {org?.name}
                {today && ` · ${today}`}
              </span>
              {memberships.length > 1 && <ChevronDown className="size-3 shrink-0" />}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Firmalar</DropdownMenuLabel>
              {memberships.map((m) => (
                <DropdownMenuItem key={m.organization.id} onSelect={() => switchOrg(m.organization.id)}>
                  <Building2 />
                  <span className="flex-1 truncate">{m.organization.name}</span>
                  {m.organization.id === org?.id && <Check className="!text-primary" />}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => router.push("/kurulum?yeni=1")}>
                <Plus />
                Yeni firma ekle
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <button
          onClick={palette.open}
          className="hidden h-9 items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 text-sm text-muted hover:text-text md:flex md:w-56 lg:w-64"
        >
          <Search className="size-4" />
          <span className="flex-1 text-left">Ara…</span>
          <kbd className="rounded border border-border bg-surface px-1.5 text-[10px]">Ctrl K</kbd>
        </button>
        <button onClick={palette.open} className="rounded-lg p-2 text-muted hover:bg-surface-2 md:hidden" aria-label="Ara">
          <Search className="size-5" />
        </button>

        <InstallButton />

        <OnlineStatus />

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-full outline-none" aria-label="Kullanıcı menüsü">
            <span className="flex size-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
              {initials(name) || "?"}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <div className="px-2.5 py-2">
              <div className="truncate text-sm font-semibold">{name}</div>
              <div className="truncate text-xs text-muted">
                {org?.name} · {role ? ROLE_LABELS[role] : ""}
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Görünüm</DropdownMenuLabel>
            {(
              [
                ["light", "Açık", Sun],
                ["dark", "Koyu", Moon],
                ["system", "Sistem", Monitor],
              ] as const
            ).map(([t, label, Icon]) => (
              <DropdownMenuItem key={t} onSelect={(e) => { e.preventDefault(); setTheme(t); }}>
                <Icon />
                <span className="flex-1">{label}</span>
                {theme === t && <Check className="!text-primary" />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => router.push("/ayarlar")}>
              <Settings />
              Ayarlar
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={async () => {
                await signOut();
                router.replace("/giris");
              }}
              className="text-danger"
            >
              <LogOut className="!text-danger" />
              Çıkış
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
