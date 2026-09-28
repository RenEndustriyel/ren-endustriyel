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
    <Card className="p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <Link href="/ajanda" className="flex items-center gap-2 text-base font-semibold text-text hover:text-primary transition-colors group">
          <Calendar className="size-4 text-blue-500 group-hover:scale-105 transition-transform" /> Ajanda (Takvim &amp; Notlar / Hatırlatmalar)
        </Link>
        <Link href="/ajanda" className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline">
          Tüm Ajanda →
        </Link>
      </div>

      {/* Notlar ve Görevler Listesi */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center text-sm text-muted">
          <StickyNote className="size-8 text-amber-500 mb-2 opacity-80" />
          <p>Henüz planlanmış ajanda notu veya hatırlatma bulunmuyor.</p>
          <span className="text-xs text-muted/70 mt-0.5">Aşağıdaki alandan hızlıca yeni not ekleyebilirsiniz.</span>
        </div>
      ) : (
        <div className="divide-y divide-border mb-3">
          {displayItems.map((item) => {
            const isDone = item.is_done;
            const itemDate = item.starts_at ? item.starts_at.slice(0, 10) : "";
            const isToday = itemDate === today;

            return (
              <div key={item.id} className="group flex items-center justify-between gap-3 py-2.5">
                <button
                  type="button"
                  onClick={() => toggleDone(item)}
                  className="flex items-center gap-2.5 text-left min-w-0 flex-1"
                >
                  {isDone ? (
                    <CheckCircle2 className="size-4 shrink-0 text-success" />
                  ) : (
                    <Circle className="size-4 shrink-0 text-muted hover:text-primary transition-colors" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div
                      className={cn(
                        "text-sm font-medium truncate",
                        isDone ? "line-through text-muted opacity-70" : "text-text"
                      )}
                    >
                      {item.title}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted">
                      {item.kind === "reminder" ? (
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-blue-600 dark:text-blue-400">
                          <Bell className="size-3" /> Hatırlatma
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-amber-600 dark:text-amber-400">
                          <StickyNote className="size-3" /> Not
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
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Hızlı Ekleme Çubuğu */}
      <form onSubmit={handleQuickAdd} className="flex items-center gap-2 border-t border-border pt-3">
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Hızlıca yeni not veya hatırlatma yazın..."
          className="h-9 text-xs flex-1"
        />
        <div className="flex rounded-lg border border-border p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setKind("note")}
            className={cn(
              "rounded px-2 py-1 transition text-[11px] font-medium",
              kind === "note" ? "bg-primary text-white" : "text-muted hover:text-text"
            )}
          >
            Not
          </button>
          <button
            type="button"
            onClick={() => setKind("reminder")}
            className={cn(
              "rounded px-2 py-1 transition text-[11px] font-medium",
              kind === "reminder" ? "bg-primary text-white" : "text-muted hover:text-text"
            )}
          >
            Hatırlatma
          </button>
        </div>
        <Button type="submit" size="sm" className="h-9 gap-1" disabled={!newTitle.trim() || save.isPending}>
          <Plus className="size-3.5" /> Ekle
        </Button>
      </form>
    </Card>
  );
}
