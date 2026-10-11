"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  LATEST_VERSION,
  hasUnreadChangelog,
  setStoredChangelogVersion,
} from "@/lib/changelog";

interface ChangelogContextType {
  isOpen: boolean;
  hasUnread: boolean;
  openChangelog: () => void;
  closeChangelog: () => void;
}

const ChangelogContext = React.createContext<ChangelogContextType>({
  isOpen: false,
  hasUnread: false,
  openChangelog: () => {},
  closeChangelog: () => {},
});

export function ChangelogProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [hasUnread, setHasUnread] = React.useState(false);

  React.useEffect(() => {
    // İstemci tarafında son okunan sürümü kontrol et
    const unread = hasUnreadChangelog();
    setHasUnread(unread);

    if (unread) {
      // Kullanıcıya bildirim olarak güncelleme notu bildirimi göster
      const timer = setTimeout(() => {
        toast("🚀 Yeni Güncelleme Yayında (v" + LATEST_VERSION + ")", {
          description: "Yeni gösterge paneli ve tüm sistem güncellemeleri hazır.",
          action: {
            label: "Neler Değişti?",
            onClick: () => {
              setIsOpen(true);
              setStoredChangelogVersion(LATEST_VERSION);
              setHasUnread(false);
            },
          },
          duration: 9000,
        });
      }, 1200);

      return () => clearTimeout(timer);
    }
  }, []);

  const openChangelog = React.useCallback(() => {
    setIsOpen(true);
    setStoredChangelogVersion(LATEST_VERSION);
    setHasUnread(false);
  }, []);

  const closeChangelog = React.useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <ChangelogContext.Provider
      value={{
        isOpen,
        hasUnread,
        openChangelog,
        closeChangelog,
      }}
    >
      {children}
    </ChangelogContext.Provider>
  );
}

export function useChangelog() {
  return React.useContext(ChangelogContext);
}
