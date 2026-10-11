"use client";

import * as React from "react";
import { Toaster } from "sonner";
import { QueryProvider } from "./query-provider";
import { AuthProvider } from "./auth-provider";
import { OrgProvider } from "./org-provider";
import { ThemeProvider, useTheme } from "./theme-provider";
import { ServiceWorkerRegister } from "@/components/layout/service-worker-register";
import { ConfirmProvider } from "@/components/ui/confirm";

function ThemedToaster() {
  const { resolved } = useTheme();
  return <Toaster position="top-center" richColors closeButton theme={resolved} />;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <AuthProvider>
          <OrgProvider>
            <ConfirmProvider>{children}</ConfirmProvider>
          </OrgProvider>
        </AuthProvider>
      </QueryProvider>
      <ThemedToaster />
      <ServiceWorkerRegister />
    </ThemeProvider>
  );
}
