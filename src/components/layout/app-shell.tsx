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
import { InstallBanner } from "./install-banner";
import { CommandPaletteProvider } from "./command-palette";
import { BrandMark } from "./brand";
import {
  useAccounts,
  useCategories,
  useContacts,
  useContactBalances,
  useProducts,
  useUnits,
  useWarehouses,
  usePriceLists,
  useRows,
} from "@/lib/data";
import { useRates } from "@/lib/rates";
import { ChangelogProvider } from "./changelog-context";
import { ChangelogDialog } from "./changelog-dialog";
import { cn } from "@/lib/utils";

export function FullScreenLoader() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-slate-100 dark:bg-slate-950">
      <BrandMark size={72} className="animate-pulse" />
      <Loader2 className="size-5 animate-spin text-slate-400" />
    </div>
  );
}

/** Sık kullanılan listeleri önceden yükler */
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

  const isPosPage = pathname === "/hizli-satis";

  return (
    <ChangelogProvider>
      <CommandPaletteProvider>
        <Warmup />
        <div className="min-h-dvh flex w-full max-w-[100vw] overflow-x-hidden bg-slate-100 dark:bg-slate-950">
          <div className="contents">
            <Sidebar />
          </div>

          <div className="flex-1 min-w-0 lg:ml-64 transition-[margin] duration-200 flex flex-col min-h-dvh">
            <div className="contents">
              <OfflineBanner />
              <InstallBanner />
              {!isPosPage && <Topbar />}
            </div>

            <main
              className={cn(
                "flex-1 flex flex-col min-h-0 min-w-0 w-full animate-fade-in",
                isPosPage
                  ? "p-0 pb-0 lg:pb-0 h-dvh overflow-hidden"
                  : "p-3 sm:p-4 lg:p-8 pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))] lg:pb-8 overflow-x-hidden"
              )}
            >
              <div className="flex-1 flex flex-col min-h-0">
                <React.Suspense fallback={null}>{children}</React.Suspense>
              </div>
            </main>

            {/* Pusulam 1:1 Masaüstü Footer */}
            {!isPosPage && (
              <footer className="hidden lg:flex lg:flex-col border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 px-3 py-2.5 items-center gap-1.5 text-[11px] sm:text-xs text-slate-400">
                <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 max-w-5xl">
                <a href="/biz-kimiz" target="_blank" rel="noopener noreferrer" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                  Biz Kimiz
                </a>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <a href="/tanitim" target="_blank" rel="noopener noreferrer" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                  Tanıtım
                </a>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <button type="button" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                  Akademi
                </button>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <button type="button" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                  Destek
                </button>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <a href="mailto:destek@renendustriyel.com" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                  destek@renendustriyel.com
                </a>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <a href="/yardim" target="_blank" rel="noopener noreferrer" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                  Yardım
                </a>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <a href="/gizlilik" target="_blank" rel="noopener noreferrer" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                  Gizlilik
                </a>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <a href="/veri-guvenligi" target="_blank" rel="noopener noreferrer" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                  Veri Güvenliği
                </a>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <a href="/kvkk" target="_blank" rel="noopener noreferrer" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                  KVKK
                </a>
                <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">·</span>
                <span className="w-full sm:w-auto text-center">© 2026 Ren Endüstriyel</span>
              </div>
              <div
                className="inline-flex items-center gap-1.5 text-[11px] font-medium tracking-wide transition text-violet-600 dark:text-violet-400 hover:text-fuchsia-600 dark:hover:text-fuchsia-400"
                title="REN AI ürünüdür"
              >
                <span className="text-slate-400 dark:text-slate-500">powered by</span>
                <span className="font-semibold">REN AI</span>
              </div>
            </footer>
            )}
          </div>

          <MobileNav />
          <ChangelogDialog />
        </div>
      </CommandPaletteProvider>
    </ChangelogProvider>
  );
}
