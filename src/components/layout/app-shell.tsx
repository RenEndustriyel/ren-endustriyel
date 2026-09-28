"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { useOrg } from "@/providers/org-provider";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { MobileNav } from "./mobile-nav";
import { OfflineBanner } from "./online-status";
import { CommandPaletteProvider } from "./command-palette";
import { BrandMark } from "./brand";
import { useAccounts, useCategories, useContacts, useContactBalances, useProducts, useUnits, useWarehouses, usePriceLists, useRows } from "@/lib/data";
import { useRates } from "@/lib/rates";

export function FullScreenLoader() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg">
      <BrandMark size={72} className="animate-pulse" />
      <Loader2 className="size-5 animate-spin text-muted" />
    </div>
  );
}

/** Sık kullanılan listeleri önceden yükler: çevrimdışıyken formlar ve seçiciler çalışsın */
function Warmup() {
  useContacts();
  useContactBalances();
  useProducts();
  useUnits();
  useWarehouses();
  useAccounts();
  useCategories("expense");
  useCategories("product");
  useCategories("income");
  usePriceLists();
  useRows("product_units");
  useRows("price_list_items");
  useRates();
  return null;
}

/** Oturum + firma koruması ve uygulama iskeleti */
import { ChangelogProvider } from "./changelog-context";
import { ChangelogDialog } from "./changelog-dialog";

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { session, loading: authLoading } = useAuth();
  const { org, loading: orgLoading, memberships } = useOrg();

  React.useEffect(() => {
    if (authLoading) return;
    if (!session) {
      router.replace(`/giris?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (!orgLoading && memberships.length === 0) router.replace("/kurulum");
  }, [authLoading, session, orgLoading, memberships.length, router, pathname]);

  if (authLoading || !session || !org) return <FullScreenLoader />;

  return (
    <ChangelogProvider>
      <CommandPaletteProvider>
        <Warmup />
        <div className="flex min-h-dvh">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <OfflineBanner />
            <Topbar />
            <main className="min-w-0 flex-1 px-3 pb-28 pt-4 sm:px-5 sm:pt-5 md:pb-8">
              <React.Suspense fallback={null}>{children}</React.Suspense>
            </main>
          </div>
        </div>
        <MobileNav />
        <ChangelogDialog />
      </CommandPaletteProvider>
    </ChangelogProvider>
  );
}
