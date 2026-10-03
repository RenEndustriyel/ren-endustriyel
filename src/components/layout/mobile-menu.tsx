"use client";

import { Dialog as D } from "radix-ui";
import { X } from "lucide-react";
import { useOrg } from "@/providers/org-provider";
import { BrandMark } from "./brand";
import { SidebarNav } from "./sidebar";

import { useChangelog } from "./changelog-context";
import { LATEST_VERSION } from "@/lib/changelog";
import { Sparkles } from "lucide-react";
import { InstallButton } from "./install-banner";

/** Telefonda soldan açılan tam menü */
export function MobileMenuSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { org } = useOrg();
  const { openChangelog, hasUnread } = useChangelog();

  const handleOpenChangelog = () => {
    onOpenChange(false);
    openChangelog();
  };

  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <D.Content className="pt-safe fixed inset-y-0 left-0 z-50 flex w-[82%] max-w-80 flex-col bg-sidebar text-sidebar-fg shadow-2xl focus:outline-none">
          <D.Title className="sr-only">Menü</D.Title>
          <D.Description className="sr-only">Uygulama menüsü</D.Description>
          <div className="flex h-16 items-center gap-3 border-b border-white/[0.06] px-4">
            <BrandMark size={36} />
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-base font-bold text-white">{org?.name}</div>
              <div className="text-xs text-sidebar-muted">Ön Muhasebe</div>
            </div>
            <D.Close className="rounded-md p-1.5 text-sidebar-muted hover:text-white" aria-label="Kapat">
              <X className="size-5" />
            </D.Close>
          </div>
          <div className="thin-scroll flex-1 overflow-y-auto px-2.5 py-4">
            <SidebarNav onNavigate={() => onOpenChange(false)} />
          </div>

          {/* Uygulamayı Cihaza Yükle & Güncelleme Notları (Mobil) */}
          <div className="shrink-0 border-t border-white/[0.06] p-3 pb-safe space-y-2">
            <InstallButton
              variant="menuItem"
              className="flex w-full items-center justify-between rounded-lg bg-primary/15 px-3 py-2.5 text-sm font-semibold text-white hover:bg-primary/25 active:bg-primary/30 transition-colors"
            />
            <button
              type="button"
              onClick={handleOpenChangelog}
              className="flex w-full items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2.5 text-sm font-medium text-sidebar-fg hover:bg-white/[0.08] active:bg-white/[0.1] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex size-6 items-center justify-center rounded-md bg-amber-400/15 text-amber-400">
                  <Sparkles className="size-3.5" />
                </div>
                <span>Güncelleme Notları</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="rounded bg-white/[0.08] px-1.5 py-0.5 text-[10px] font-semibold text-white/90">
                  v{LATEST_VERSION}
                </span>
                {hasUnread && (
                  <span className="size-2 rounded-full bg-emerald-500" />
                )}
              </div>
            </button>
          </div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
