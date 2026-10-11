"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("Global boundary error caught:", error);
  }, [error]);

  return (
    <html lang="tr">
      <body className="flex min-h-dvh flex-col items-center justify-center bg-[#1f2328] p-6 text-center text-[#e6edf3]">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-400 mb-4">
          <AlertTriangle className="size-7" />
        </div>
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Uygulama Hatası</h2>
        <p className="mt-2 max-w-md text-sm text-[#8d96a0]">
          {error?.message || "Beklenmeyen bir sistem hatası oluştu. Sayfayı yenileyebilir veya ana panele dönebilirsiniz."}
        </p>
        {error?.digest && (
          <span className="mt-1 font-mono text-[11px] text-[#8d96a0]/60">Hata Kodu: {error.digest}</span>
        )}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="inline-flex items-center rounded-lg bg-[#3081f6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2072e5]"
          >
            <RefreshCw className="size-4 mr-1.5" /> Yeniden Yükle
          </button>
          <Link
            href="/panel"
            className="inline-flex items-center rounded-lg border border-[#373e47] bg-[#262c36] px-4 py-2 text-sm font-semibold text-[#e6edf3] hover:bg-[#323945]"
          >
            <Home className="size-4 mr-1.5" /> Panele Dön
          </Link>
        </div>
      </body>
    </html>
  );
}
