"use client";

import * as React from "react";
import { Download, X, Smartphone } from "lucide-react";
import { useInstallPrompt } from "@/lib/use-install-prompt";
import { InstallDialog } from "./install-dialog";
import { BrandMark } from "./brand";

export function InstallBanner() {
  const { isInstalled, isIOS, showIOSModal, setShowIOSModal, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = React.useState(true);

  React.useEffect(() => {
    try {
      const until = localStorage.getItem("ren-install-banner-dismissed-until");
      if (!until || Date.now() > Number(until)) {
        setDismissed(false);
      }
    } catch {
      setDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      // 7 gün boyunca tekrar gösterme
      localStorage.setItem("ren-install-banner-dismissed-until", String(Date.now() + 7 * 24 * 60 * 60 * 1000));
    } catch {}
  };

  if (isInstalled || dismissed) {
    return (
      <InstallDialog
        open={showIOSModal}
        onOpenChange={setShowIOSModal}
        isIOS={isIOS}
      />
    );
  }

  return (
    <>
      <div className="md:hidden relative border-b border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-3 py-2 text-xs">
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <BrandMark size={24} className="shrink-0" />
            <div className="truncate text-text">
              <span className="font-semibold text-primary">Uygulamayı Yükleyin:</span>{" "}
              <span className="text-muted">İnternetsiz de çalışır</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => promptInstall()}
              className="flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm active:scale-95 transition-transform"
            >
              <Download className="size-3" />
              Yükle
            </button>
            <button
              onClick={handleDismiss}
              className="rounded p-1 text-muted hover:text-text"
              aria-label="Kapat"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      <InstallDialog
        open={showIOSModal}
        onOpenChange={setShowIOSModal}
        isIOS={isIOS}
      />
    </>
  );
}

/**
 * Topbar ve Menüler için tekil Yükle butonu
 */
export function InstallButton({ className, variant = "button" }: { className?: string; variant?: "button" | "menuItem" }) {
  const { isInstalled, isIOS, showIOSModal, setShowIOSModal, promptInstall } = useInstallPrompt();

  if (isInstalled) return null;

  if (variant === "menuItem") {
    return (
      <>
        <button
          type="button"
          onClick={() => promptInstall()}
          className={className}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex size-6 items-center justify-center rounded-md bg-primary/15 text-primary">
              <Download className="size-3.5" />
            </div>
            <span>Uygulamayı Cihaza Yükle</span>
          </div>
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
            Yükle
          </span>
        </button>
        <InstallDialog
          open={showIOSModal}
          onOpenChange={setShowIOSModal}
          isIOS={isIOS}
        />
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => promptInstall()}
        className={className || "flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 active:scale-95 transition-all"}
        title="Uygulamayı Cihazınıza Yükleyin (İnternetsiz de çalışır)"
      >
        <Download className="size-3.5" />
        <span className="hidden sm:inline">Uygulama Yükle</span>
      </button>
      <InstallDialog
        open={showIOSModal}
        onOpenChange={setShowIOSModal}
        isIOS={isIOS}
      />
    </>
  );
}
