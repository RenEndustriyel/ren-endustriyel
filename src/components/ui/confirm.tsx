"use client";

import * as React from "react";
import { AlertDialog as A } from "radix-ui";
import { ShieldAlert } from "lucide-react";
import { Button } from "./button";
import { Input } from "./input";

type Opts = {
  title: string;
  description?: string;
  confirmText?: string;
  danger?: boolean;
  requireCode?: boolean;
};

const Ctx = React.createContext<(o: Opts) => Promise<boolean>>(async () => false);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<
    (Opts & { resolve: (v: boolean) => void; targetCode?: string }) | null
  >(null);
  const [inputCode, setInputCode] = React.useState("");

  const confirm = React.useCallback((o: Opts) => {
    return new Promise<boolean>((resolve) => {
      const needsCode = o.requireCode ?? o.danger;
      const targetCode = needsCode ? Math.floor(1000 + Math.random() * 9000).toString() : undefined;
      setInputCode("");
      setState({ ...o, resolve, targetCode });
    });
  }, []);

  const close = (v: boolean) => {
    state?.resolve(v);
    setState(null);
    setInputCode("");
  };

  const needsCode = !!state?.targetCode;
  const isCodeValid = !needsCode || inputCode.trim() === state?.targetCode;

  return (
    <Ctx.Provider value={confirm}>
      {children}
      <A.Root open={!!state} onOpenChange={(o) => !o && close(false)}>
        <A.Portal>
          <A.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-150" />
          <A.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-surface p-5 shadow-2xl animate-in zoom-in-95 duration-150">
            {state?.danger && (
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-danger/10 text-danger ring-4 ring-danger/10">
                <ShieldAlert className="h-5 w-5" />
              </div>
            )}
            <A.Title className="text-base font-semibold text-foreground">{state?.title}</A.Title>
            <A.Description className="mt-1.5 text-sm text-muted">
              {state?.description ?? (state?.danger ? "Bu işlem geri alınamaz. Bağlı tüm hareketler silinecektir." : "İşlemi onaylıyor musunuz?")}
            </A.Description>

            {needsCode && (
              <div className="mt-4 space-y-2.5">
                <div className="rounded-xl border border-danger/30 bg-danger/5 p-3 text-center">
                  <div className="text-[11px] font-semibold tracking-wider text-danger uppercase">
                    Silme Güvenlik Kodu
                  </div>
                  <div className="mt-1 font-mono text-2xl font-black tracking-[0.35em] text-danger select-all">
                    {state.targetCode}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted">
                    İşlemi onaylamak için yukarıdaki 4 haneli kodu giriniz:
                  </label>
                  <Input
                    autoFocus
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && isCodeValid) {
                        e.preventDefault();
                        close(true);
                      }
                    }}
                    placeholder="4 haneli kod"
                    className="mt-1.5 text-center font-mono text-lg font-bold tracking-widest"
                    maxLength={4}
                    inputMode="numeric"
                  />
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <A.Cancel asChild>
                <Button variant="outline" onClick={() => close(false)}>
                  Vazgeç
                </Button>
              </A.Cancel>
              <Button
                variant={state?.danger ? "danger" : "primary"}
                disabled={!isCodeValid}
                onClick={() => {
                  if (isCodeValid) close(true);
                }}
              >
                {state?.confirmText ?? (state?.danger ? "Sil" : "Onayla")}
              </Button>
            </div>
          </A.Content>
        </A.Portal>
      </A.Root>
    </Ctx.Provider>
  );
}

export const useConfirm = () => React.useContext(Ctx);

