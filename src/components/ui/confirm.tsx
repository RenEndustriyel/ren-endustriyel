"use client";

import * as React from "react";
import { AlertDialog as A } from "radix-ui";
import { Button } from "./button";

type Opts = { title: string; description?: string; confirmText?: string; danger?: boolean };
const Ctx = React.createContext<(o: Opts) => Promise<boolean>>(async () => false);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<(Opts & { resolve: (v: boolean) => void }) | null>(null);
  const confirm = React.useCallback((o: Opts) => new Promise<boolean>((resolve) => setState({ ...o, resolve })), []);
  const close = (v: boolean) => {
    state?.resolve(v);
    setState(null);
  };
  return (
    <Ctx.Provider value={confirm}>
      {children}
      <A.Root open={!!state} onOpenChange={(o) => !o && close(false)}>
        <A.Portal>
          <A.Overlay className="fixed inset-0 z-50 bg-black/40" />
          <A.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-surface p-5 shadow-xl">
            <A.Title className="text-base font-semibold">{state?.title}</A.Title>
            <A.Description className="mt-1.5 text-sm text-muted">{state?.description ?? "Bu işlem geri alınamaz."}</A.Description>
            <div className="mt-5 flex justify-end gap-2">
              <A.Cancel asChild>
                <Button variant="outline">Vazgeç</Button>
              </A.Cancel>
              <A.Action asChild>
                <Button variant={state?.danger ? "danger" : "primary"} onClick={() => close(true)}>
                  {state?.confirmText ?? "Onayla"}
                </Button>
              </A.Action>
            </div>
          </A.Content>
        </A.Portal>
      </A.Root>
    </Ctx.Provider>
  );
}

export const useConfirm = () => React.useContext(Ctx);
