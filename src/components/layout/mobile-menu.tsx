"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dialog as D } from "radix-ui";
import { ExternalLink, Settings, Sparkles, X } from "lucide-react";
import { useOrg } from "@/providers/org-provider";
import { cn } from "@/lib/utils";
import { SidebarNav } from "./sidebar";

import { useChangelog } from "./changelog-context";
import { LATEST_VERSION } from "@/lib/changelog";
import { InstallButton } from "./install-banner";

/** Telefonda soldan açılan tam menü (masaüstü menüsüyle aynı Pusulam görünümü) */
export function MobileMenuSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { org, isB2B } = useOrg();
  const pathname = usePathname();
  const { openChangelog, hasUnread } = useChangelog();
  const close = () => onOpenChange(false);

  const handleOpenChangelog = () => {
    close();
    openChangelog();
  };

  const settingsActive = pathname.startsWith("/ayarlar");

  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <D.Content className="pt-safe fixed inset-y-0 left-0 z-50 flex w-[82%] max-w-80 flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-2xl focus:outline-none">
          <D.Title className="sr-only">Menü</D.Title>
          <D.Description className="sr-only">Uygulama menüsü</D.Description>

          {/* Başlık: logo ve firma adı */}
          <div className="py-4 min-h-[4.75rem] flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 px-4">
            <Link href="/panel" onClick={close} className="flex items-center gap-3 min-w-0 flex-1 transition hover:opacity-80">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icons/logo-mark.png"
                alt={org?.name || "Ren Endüstriyel"}
                width={44}
                height={44}
                draggable={false}
                className="shrink-0 object-contain select-none rounded-xl"
                style={{ width: 44, height: 44 }}
              />
              <div className="min-w-0 space-y-1">
                <div className="font-extrabold tracking-tight text-brand-600 dark:text-brand-400 text-lg leading-none truncate">
                  {org?.name || "Ren Endüstriyel"}
                </div>
                <div className="font-medium text-slate-500 dark:text-slate-400 tracking-wide text-[10px] leading-snug">
                  Kolay kullanım · Ön muhasebe
                </div>
              </div>
            </Link>
            <D.Close
              className="h-8 w-8 shrink-0 rounded-lg flex items-center justify-center text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-label="Kapat"
            >
              <X size={18} />
            </D.Close>
          </div>

          <div className="thin-scroll flex-1 overflow-y-auto">
            <SidebarNav onNavigate={close} />
          </div>

          {/* Alt kısım: uygulamayı yükle, versiyon notları, Ayarlar (B2B değilse) */}
          {!isB2B && (
            <div className="shrink-0 border-t border-slate-100 dark:border-slate-800 p-3 pb-safe space-y-1">
              <InstallButton
                variant="menuItem"
                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              />
              <button
                type="button"
                onClick={handleOpenChangelog}
                title="Sürüm Geçmişi ve Değişiklik Günlüğü"
                className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/40 hover:bg-brand-100 dark:hover:bg-brand-900/60 transition text-left"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <Sparkles size={14} className="shrink-0" />
                  <span className="truncate">v{LATEST_VERSION} Versiyon Notları</span>
                  {hasUnread && <span className="size-2 rounded-full bg-emerald-500 shrink-0" />}
                </span>
                <ExternalLink size={12} className="shrink-0" />
              </button>
              <Link
                href="/ayarlar"
                onClick={close}
                className={cn(
                  "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition",
                  settingsActive
                    ? "bg-brand-500 text-white shadow-sm shadow-brand-500/30"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                <Settings size={20} className={settingsActive ? "text-white" : "text-slate-400"} />
                Ayarlar
              </Link>
            </div>
          )}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
