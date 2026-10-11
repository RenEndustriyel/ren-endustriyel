"use client";

import * as React from "react";
import Link from "next/link";
import {
  Calendar,
  CheckCircle2,
  Circle,
  Plus,
  StickyNote,
  Bell,
  Clock,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRows, useSave, useUpdate, type Row } from "@/lib/data";
import { formatDate, formatDayMonth, isoDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type Reminder = Row<"reminders">;

export function AgendaWidget() {
  const reminders = useRows<Reminder>("reminders", {
    order: [{ column: "starts_at", ascending: true }],
  });
  const save = useSave("reminders");
  const upd = useUpdate("reminders");

  const [newTitle, setNewTitle] = React.useState("");
  const [kind, setKind] = React.useState<"reminder" | "note">("note");
  const today = isoDate();

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      await save.save(
        {
          title: newTitle.trim(),
          kind,
          starts_at: new Date().toISOString(),
          is_done: false,
        },
        "Ajandaya eklendi",
      );
      setNewTitle("");
    } catch {
      toast.error("Not eklenemedi");
    }
  };

  const toggleDone = async (item: Reminder) => {
    try {
      await upd.update(item.id, { is_done: !item.is_done });
    } catch {
      toast.error("Durum güncellenemedi");
    }
  };

  const remove = async (id: string) => {
    try {
      await upd.remove(id, "Ajandadan silindi");
    } catch {
      toast.error("Silinemedi");
    }
  };

  const items = reminders.data ?? [];
  // Aktif veya bugün/yakın tarihteki öğeler
  const activeItems = items.filter((x) => !x.is_done);
  const doneItems = items.filter((x) => x.is_done).slice(0, 3);
  const displayItems = [...activeItems.slice(0, 5), ...doneItems].slice(0, 6);

  return (
    <Card className="p-3.5 sm:p-4">
      <div className="mb-2.5 flex items-center justify-between border-b border-border pb-2.5">
        <Link href="/ajanda" className="flex items-center gap-1.5 text-sm font-semibold text-text hover:text-primary transition-colors group">
          <Calendar className="size-4 text-blue-500 group-hover:scale-105 transition-transform" /> Ajanda (Takvim &amp; Notlar / Hatırlatmalar)
        </Link>
        <Link href="/ajanda" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:underline">
          Tüm Ajanda →
        </Link>
      </div>

      {/* Notlar ve Görevler Listesi */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center text-xs text-muted">
          <StickyNote className="size-6 text-amber-500 mb-1.5 opacity-80" />
          <p>Henüz planlanmış ajanda notu veya hatırlatma bulunmuyor.</p>
          <span className="text-[11px] text-muted/70 mt-0.5">Aşağıdaki alandan hızlıca yeni not ekleyebilirsiniz.</span>
        </div>
      ) : (
        <div className="divide-y divide-border/60 mb-2.5">
          {displayItems.map((item) => {
            const isDone = item.is_done;
            const itemDate = item.starts_at ? item.starts_at.slice(0, 10) : "";
            const isToday = itemDate === today;

            return (
              <div key={item.id} className="group flex items-center justify-between gap-2.5 py-2">
                <button
                  type="button"
                  onClick={() => toggleDone(item)}
                  className="flex items-center gap-2 text-left min-w-0 flex-1"
                >
                  {isDone ? (
                    <CheckCircle2 className="size-3.5 shrink-0 text-success" />
                  ) : (
                    <Circle className="size-3.5 shrink-0 text-muted hover:text-primary transition-colors" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div
                      className={cn(
                        "text-xs font-medium truncate",
                        isDone ? "line-through text-muted opacity-70" : "text-text"
                      )}
                    >
                      {item.title}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10.5px] text-muted">
                      {item.kind === "reminder" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                          <Bell className="size-2.5" /> Hatırlatma
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                          <StickyNote className="size-2.5" /> Not
                        </span>
                      )}
                      <span>·</span>
                      <span className={cn(isToday && "text-primary font-semibold")}>
                        {isToday ? "Bugün" : formatDate(itemDate)}
                      </span>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-muted hover:text-danger transition"
                  aria-label="Sil"
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Hızlı Ekleme Çubuğu */}
      <form onSubmit={handleQuickAdd} className="flex items-center gap-2 border-t border-border pt-2.5">
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Hızlıca yeni not veya hatırlatma yazın..."
          className="h-8 text-xs flex-1"
        />
        <div className="flex rounded-lg border border-border p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setKind("note")}
            className={cn(
              "rounded px-2 py-0.5 transition text-[10.5px] font-medium",
              kind === "note" ? "bg-primary text-white" : "text-muted hover:text-text"
            )}
          >
            Not
          </button>
          <button
            type="button"
            onClick={() => setKind("reminder")}
            className={cn(
              "rounded px-2 py-0.5 transition text-[10.5px] font-medium",
              kind === "reminder" ? "bg-primary text-white" : "text-muted hover:text-text"
            )}
          >
            Hatırlatma
          </button>
        </div>
        <Button type="submit" size="sm" className="h-8 gap-1 text-xs" disabled={!newTitle.trim() || save.isPending}>
          <Plus className="size-3.5" /> Ekle
        </Button>
      </form>
    </Card>
  );
}
