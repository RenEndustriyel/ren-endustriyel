"use client";

import * as React from "react";
import { AlertTriangle, CloudOff, CloudUpload, Loader2, RotateCw, Trash2 } from "lucide-react";
import { useOutbox } from "@/lib/data";
import { discardItem, flushOutbox, loadOutbox, retryItem } from "@/lib/outbox";
import { useConfirm } from "@/components/ui/confirm";
import { useOnline } from "./online-status";
import { cn } from "@/lib/utils";

/** Giden kutusunu açılışta yükler; bağlantı gelince ve aralıklarla gönderir */
export function OutboxRunner() {
  React.useEffect(() => {
    let alive = true;
    void loadOutbox().then(() => {
      if (alive) void flushOutbox();
    });
    const onOnline = () => void flushOutbox();
    window.addEventListener("online", onOnline);
    const t = window.setInterval(() => void flushOutbox(), 20000);
    return () => {
      alive = false;
      window.removeEventListener("online", onOnline);
      window.clearInterval(t);
    };
  }, []);
  return null;
}

/** Üst çubuk: bekleyen / gönderilemeyen kayıtlar */
export function OutboxStatus() {
  const { items, flushing } = useOutbox();
  const online = useOnline();
  const confirm = useConfirm();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  if (!items.length && online) return null;
  const failed = items.filter((i) => i.status === "failed");

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition",
          failed.length
            ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
            : !online
              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
              : "bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300",
        )}
        title="Gönderilmeyi bekleyen kayıtlar"
      >
        {failed.length ? <AlertTriangle className="size-4" /> : flushing ? <Loader2 className="size-4 animate-spin" /> : !online ? <CloudOff className="size-4" /> : <CloudUpload className="size-4" />}
        <span className="hidden sm:inline">
          {failed.length ? `${failed.length} kayıt gönderilemedi` : items.length ? `${items.length} kayıt bekliyor` : "Çevrimdışı"}
        </span>
        {items.length > 0 && <span className="sm:hidden">{items.length}</span>}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(380px,calc(100vw-24px))] rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-2 text-sm font-bold">{online ? "Gönderilmeyi bekleyen kayıtlar" : "Çevrimdışı çalışıyorsunuz"}</div>
          <p className="mb-2 text-xs text-slate-600 dark:text-slate-300">
            Kayıtlar bu bilgisayarda saklanıyor; internet gelince sırayla gönderilir. Uygulamayı kapatsanız da kaybolmaz.
          </p>
          {items.length === 0 ? (
            <p className="py-3 text-center text-xs text-slate-500">Bekleyen kayıt yok.</p>
          ) : (
            <ul className="max-h-72 space-y-1.5 overflow-y-auto">
              {items.map((i) => (
                <li key={i.key} className={cn("rounded-lg border px-2.5 py-2 text-xs", i.status === "failed" ? "border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/30" : "border-slate-200 dark:border-slate-700")}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{i.label}</span>
                    <span className="text-slate-500">{new Date(i.createdAt).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  {i.status === "failed" && (
                    <>
                      <div className="mt-1 text-rose-700 dark:text-rose-300">Sunucu kabul etmedi: {i.error}</div>
                      <div className="mt-1.5 flex gap-1.5">
                        <button type="button" className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 font-semibold dark:border-slate-600" onClick={() => retryItem(i.key)}>
                          <RotateCw className="size-3" /> Tekrar dene
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-md border border-rose-300 px-2 py-1 font-semibold text-rose-700 dark:border-rose-800 dark:text-rose-300"
                          onClick={async () => {
                            if (await confirm({ title: "Kayıt kuyruktan silinsin mi?", description: `"${i.label}" gönderilmeyecek ve kaybolacak. Gerekirse yeniden girin.`, danger: true, confirmText: "Sil" }))
                              await discardItem(i.key);
                          }}
                        >
                          <Trash2 className="size-3" /> Kuyruktan sil
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
          {online && items.some((i) => i.status === "pending") && (
            <button type="button" disabled={flushing} onClick={() => void flushOutbox()} className="mt-2 w-full rounded-lg bg-brand-500 py-2 text-xs font-bold text-white disabled:opacity-60">
              {flushing ? "Gönderiliyor…" : "Şimdi gönder"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
