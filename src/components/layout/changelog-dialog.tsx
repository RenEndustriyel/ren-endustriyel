"use client";

import * as React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useChangelog } from "./changelog-context";
import { CHANGELOG_RELEASES, ChangelogType } from "@/lib/changelog";
import { Sparkles, CheckCircle2, ArrowUpRight, Zap, Wrench, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

function TypeBadge({ type }: { type: ChangelogType }) {
  switch (type) {
    case "yeni":
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-400 border border-emerald-500/25">
          <Zap className="size-3" />
          Yeni
        </span>
      );
    case "iyilestirme":
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-sky-500/15 px-2 py-0.5 text-[11px] font-semibold text-sky-400 border border-sky-500/25">
          <ArrowUpRight className="size-3" />
          İyileştirme
        </span>
      );
    case "duzeltme":
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-400 border border-amber-500/25">
          <Wrench className="size-3" />
          Düzeltme
        </span>
      );
  }
}

export function ChangelogDialog() {
  const { isOpen, closeChangelog } = useChangelog();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeChangelog()}>
      <DialogContent
        title="Güncelleme Notları"
        description="Sistemde yapılan en son yenilikler, geliştirmeler ve değişiklikler"
        className="sm:max-w-2xl"
      >
        <div className="space-y-6 pt-1 pb-2">
          {CHANGELOG_RELEASES.map((release, idx) => (
            <div
              key={release.version}
              className={cn(
                "rounded-xl border p-4 sm:p-5 transition-all",
                idx === 0
                  ? "border-primary/30 bg-primary/[0.03] shadow-sm"
                  : "border-border/60 bg-surface-2/30"
              )}
            >
              {/* Sürüm Başlığı */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Sparkles className="size-4" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-text">
                      v{release.version}
                    </span>
                    {release.badge && (
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/30">
                        {release.badge}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-muted font-medium">
                  {release.date}
                </span>
              </div>

              {/* Sürüm Teması */}
              <div className="mt-3 text-sm font-semibold text-text">
                {release.title}
              </div>

              {/* Maddeler */}
              <div className="mt-3.5 space-y-2.5">
                {release.items.map((item, i) => (
                  <div
                    key={i}
                    className="group flex flex-col gap-1 rounded-lg bg-surface/60 p-2.5 sm:p-3 border border-border/40 hover:border-border transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <TypeBadge type={item.type} />
                      <span className="text-[13px] font-medium text-text">
                        {item.title}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-xs text-muted leading-relaxed pl-1">
                        {item.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Bilgi Kutusu */}
          <div className="flex items-center gap-3 rounded-lg border border-border/70 bg-surface-2/50 px-4 py-3 text-xs text-muted">
            <ShieldCheck className="size-5 shrink-0 text-primary" />
            <span>
              Tüm güncellemeler otomatik olarak tarayıcı ve PWA önbelleğinize
              yansıtılır. Verileriniz Supabase üzerinde güvenle saklanır.
            </span>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={closeChangelog}
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors shadow-sm"
            >
              Anladım, Kapat
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
