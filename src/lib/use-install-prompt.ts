"use client";

import * as React from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = React.useState(false);
  const [isIOS, setIsIOS] = React.useState(false);
  const [showIOSModal, setShowIOSModal] = React.useState(false);

  React.useEffect(() => {
    // 1. Zaten yüklü (standalone) modda mı açıldı?
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        document.referrer.includes("android-app://");
      setIsInstalled(Boolean(isStandaloneMode));
    };

    checkStandalone();

    // 2. iOS / iPadOS cihaz kontrolü
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice =
      /iphone|ipad|ipod/.test(userAgent) ||
      (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
    setIsIOS(Boolean(isAppleDevice));

    // 3. Android / Chromium beforeinstallprompt olayı
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (isInstalled) return false;

    // iOS cihazlarda Safari yönergesi açılır
    if (isIOS) {
      setShowIOSModal(true);
      return true;
    }

    // Android / Desktop Chrome / Edge
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          setIsInstalled(true);
          setDeferredPrompt(null);
          return true;
        }
      } catch (err) {
        console.error("Yükleme penceresi açılırken hata:", err);
      }
    } else {
      // Prompt henüz tetiklenmediyse yine de bilgi modalı göster
      setShowIOSModal(true);
    }

    return false;
  };

  return {
    canInstall: !isInstalled && (Boolean(deferredPrompt) || isIOS),
    isInstalled,
    isIOS,
    showIOSModal,
    setShowIOSModal,
    promptInstall,
  };
}
