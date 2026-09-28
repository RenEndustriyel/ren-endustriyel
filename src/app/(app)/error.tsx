"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("App boundary error caught:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-danger/10 text-danger mb-4">
        <AlertTriangle className="size-7" />
      </div>
      <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Sayfa Yüklenirken Bir Sorun Oluştu</h2>
      <p className="mt-2 max-w-md text-sm text-muted">
        {error?.message || "Beklenmeyen bir hata meydana geldi. Lütfen tekrar deneyin."}
      </p>
      {error?.digest && (
        <span className="mt-1 font-mono text-[11px] text-muted/60">Hata Kodu: {error.digest}</span>
      )}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={() => reset()} variant="primary">
          <RefreshCw className="size-4 mr-1.5" /> Tekrar Dene
        </Button>
        <Button asChild variant="outline">
          <Link href="/panel">
            <Home className="size-4 mr-1.5" /> Panele Dön
          </Link>
        </Button>
      </div>
    </div>
  );
}
