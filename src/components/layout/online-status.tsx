"use client";

import * as React from "react";
import { useIsMutating, onlineManager } from "@tanstack/react-query";
import { usePendingSync } from "@/lib/data";
import { CloudOff, Cloud, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function useOnline() {
  return React.useSyncExternalStore(
    (cb) => onlineManager.subscribe(cb),
    () => onlineManager.isOnline(),
    () => true,
  );
}

/** Bağlantı / kaydetme durumu göstergesi */
export function OnlineStatus({ className }: { className?: string }) {
  const online = useOnline();
  const saving = useIsMutating();
  const pending = usePendingSync();
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        online ? "text-muted" : "bg-warning-soft text-warning",
        className,
      )}
      title={
        pending
          ? `${pending} değişiklik gönderilmeyi bekliyor`
          : online
            ? "Çevrimiçi"
            : "Çevrimdışı — değişiklikler bağlantı gelince gönderilecek"
      }
    >
      {!online ? (
        <CloudOff className="size-4" />
      ) : saving ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Cloud className="size-4" />
      )}
      <span className="hidden sm:inline">{!online ? "Çevrimdışı" : saving ? "Kaydediliyor" : "Kaydedildi"}</span>
      {pending > 0 && <span className="rounded-full bg-warning px-1.5 text-[10px] font-bold text-white">{pending}</span>}
    </div>
  );
}

export function OfflineBanner() {
  const online = useOnline();
  const pending = usePendingSync();
  if (online) return null;
  return (
    <div className="bg-warning px-4 py-1.5 text-center text-xs font-medium text-white">
      İnternet bağlantısı yok. Son kaydedilen veriler gösteriliyor
      {pending ? ` · ${pending} değişiklik bağlantı gelince gönderilecek` : ""}.
    </div>
  );
}
