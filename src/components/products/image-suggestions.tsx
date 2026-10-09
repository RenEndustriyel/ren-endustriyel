"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Check, ExternalLink, ImageOff, X } from "lucide-react";
import { toast } from "sonner";
import { useProducts, useUpdate } from "@/lib/data";
import { useOrg } from "@/providers/org-provider";
import { useConfirm } from "@/components/ui/confirm";
import { cn } from "@/lib/utils";

type Suggestion = {
  product_id: string;
  name: string;
  image: string;
  source: string;
  source_title: string;
  match: "tam" | "benzer";
  note?: string;
};

const DISMISS_KEY = "ren-resim-onerisi-reddedilen";
const readDismissed = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(DISMISS_KEY) || "[]");
  } catch {
    return [];
  }
};

/**
 * Ürün resmi önerileri: üreticinin resmi sitesinden bulunan görseller burada onaylanır.
 * Onaylanan resim ürün kartına yazılır; reddedilen öneri bu cihazda bir daha gösterilmez.
 */
export function ImageSuggestions() {
  const { canWrite } = useOrg();
  const confirm = useConfirm();
  const products = useProducts();
  const { update } = useUpdate("products");
  const [list, setList] = React.useState<Suggestion[] | null>(null);
  const [dismissed, setDismissed] = React.useState<string[]>([]);
  const [busy, setBusy] = React.useState<string | null>(null);

  React.useEffect(() => {
    setDismissed(readDismissed()); // eslint-disable-line react-hooks/set-state-in-effect
    fetch("/urun-resimleri/oneriler.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((j: Suggestion[]) => setList(j))
      .catch(() => setList([]));
  }, []);

  const current = new Map((products.data ?? []).map((p) => [p.id, p]));
  const pending = (list ?? []).filter((s) => {
    const p = current.get(s.product_id);
    return p && !p.image_path && !dismissed.includes(s.product_id);
  });
  const done = (list ?? []).filter((s) => current.get(s.product_id)?.image_path === s.image);
  const exact = pending.filter((s) => s.match === "tam");

  const approve = async (s: Suggestion, quiet = false) => {
    setBusy(s.product_id);
    try {
      await update(s.product_id, { image_path: s.image }, quiet ? undefined : `${s.name}: resim eklendi`);
    } finally {
      setBusy(null);
    }
  };
  const dismiss = (s: Suggestion) => {
    const next = [...dismissed, s.product_id];
    setDismissed(next);
    try {
      localStorage.setItem(DISMISS_KEY, JSON.stringify(next));
    } catch {}
  };
  const approveAllExact = async () => {
    if (!(await confirm({ title: `${exact.length} ürüne resim eklensin mi?`, description: "Yalnızca birebir eşleşen öneriler onaylanır. 'Benzer' olanlara tek tek bakın.", confirmText: "Hepsini onayla" }))) return;
    for (const s of exact) await approve(s, true);
    toast.success(`${exact.length} ürüne resim eklendi`);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/urunler" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold dark:border-slate-600">
          <ArrowLeft size={16} /> Ürünler
        </Link>
        <div>
          <h1 className="text-xl font-bold">Ürün resmi önerileri</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Görseller üreticinin resmi sitesinden alındı. Doğruysa onaylayın; resim ürün kartına ve kataloğa eklenir.
          </p>
        </div>
        {canWrite && exact.length > 1 && (
          <button type="button" onClick={approveAllExact} className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-[#00b49c] px-4 py-2 text-sm font-bold text-white hover:bg-[#009e89]">
            <Check size={16} /> Birebir eşleşenlerin hepsini onayla ({exact.length})
          </button>
        )}
      </div>

      <div className="text-sm text-slate-600 dark:text-slate-300">
        Bekleyen <b>{pending.length}</b> · eklenmiş <b>{done.length}</b>
      </div>

      {list === null ? (
        <p className="py-10 text-center text-sm text-slate-500">Yükleniyor…</p>
      ) : pending.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white py-12 text-center dark:border-slate-700 dark:bg-slate-900">
          <ImageOff className="mx-auto mb-2 text-slate-400" />
          <p className="text-sm text-slate-600 dark:text-slate-300">Onay bekleyen resim önerisi yok.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pending.map((s) => (
            <div key={s.product_id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <div className="mb-3 flex h-48 items-center justify-center rounded-xl bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.image} alt={s.name} className="h-full w-full object-contain p-2" />
              </div>
              <div className="text-sm font-bold">{s.name}</div>
              <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">Kaynaktaki adı: {s.source_title}</div>
              <span
                className={cn(
                  "mt-2 inline-flex w-fit rounded-full px-2 py-0.5 text-[11px] font-bold",
                  s.match === "tam" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300" : "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
                )}
              >
                {s.match === "tam" ? "Birebir eşleşme" : "Benzer — kontrol edin"}
              </span>
              {s.note && <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">{s.note}</p>}
              <a href={s.source} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline">
                Kaynak sayfa <ExternalLink size={12} />
              </a>
              {canWrite && (
                <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
                  <button type="button" disabled={busy === s.product_id} onClick={() => approve(s)} className="inline-flex items-center justify-center gap-1 rounded-lg bg-[#00b49c] py-2 text-sm font-bold text-white hover:bg-[#009e89] disabled:opacity-60">
                    <Check size={15} /> Onayla
                  </button>
                  <button type="button" onClick={() => dismiss(s)} className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-300 py-2 text-sm font-semibold dark:border-slate-600">
                    <X size={15} /> Uygun değil
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
