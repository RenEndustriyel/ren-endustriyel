"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useOrg } from "@/providers/org-provider";
import { supabase } from "@/lib/supabase/client";
import { triggerCalendarNotification, playDoneSound } from "@/lib/calendar-notifications";
import { toast } from "sonner";

const CHECK_INTERVAL_MS = 20_000; // 20 saniyede bir kontrol et

export function CalendarNotificationRunner() {
  const { org } = useOrg();
  const qc = useQueryClient();
  const orgId = org?.id;
  const notifiedIdsRef = React.useRef<Set<string>>(new Set());
  const isCheckingRef = React.useRef(false);

  React.useEffect(() => {
    if (!orgId) return;

    let cancelled = false;

    const checkReminders = async () => {
      if (cancelled || isCheckingRef.current || !navigator.onLine) return;
      isCheckingRef.current = true;

      try {
        const now = new Date();
        // 1 saat öncesinden şimdiye kadar ve vadesi gelenler
        const pastWindow = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
        const futureWindow = new Date(now.getTime() + 60 * 1000).toISOString();

        // Aktif hatırlatmaları çek
        const { data: reminders, error } = await (supabase as any)
          .from("reminders")
          .select("id, title, description, starts_at, remind_at, all_day, is_done, notified_at")
          .eq("org_id", orgId)
          .is("deleted_at", null)
          .eq("is_done", false)
          .is("notified_at", null)
          .or(`remind_at.lte.${futureWindow},and(remind_at.is.null,starts_at.lte.${futureWindow})`)
          .gte("starts_at", pastWindow);

        if (error || !reminders || reminders.length === 0) {
          return;
        }

        for (const item of reminders) {
          if (notifiedIdsRef.current.has(item.id)) continue;

          const triggerTimeStr = item.remind_at || item.starts_at;
          const triggerTime = new Date(triggerTimeStr).getTime();
          // Eğer zamanı geldiyse (şu an >= tetikleme zamanı)
          if (now.getTime() >= triggerTime - 15_000) {
            notifiedIdsRef.current.add(item.id);

            // Supabase'de notified_at damgala
            await (supabase as any)
              .from("reminders")
              .update({ notified_at: new Date().toISOString() })
              .eq("id", item.id);

            const timeStr = item.all_day
              ? undefined
              : new Date(item.starts_at).toLocaleTimeString("tr-TR", {
                  hour: "2-digit",
                  minute: "2-digit",
                });

            triggerCalendarNotification(
              {
                id: item.id,
                title: item.title,
                description: item.description,
                starts_at: item.starts_at,
                time: timeStr,
                all_day: item.all_day,
              },
              async (id) => {
                await (supabase as any)
                  .from("reminders")
                  .update({ is_done: true, updated_at: new Date().toISOString() })
                  .eq("id", id);
                playDoneSound();
                toast.success("İş tamamlandı olarak işaretlendi");
                qc.invalidateQueries({ queryKey: ["reminders"] });
              },
              async (id, minutes) => {
                const next = new Date(Date.now() + minutes * 60_000).toISOString();
                await (supabase as any)
                  .from("reminders")
                  .update({ remind_at: next, notified_at: null, updated_at: new Date().toISOString() })
                  .eq("id", id);
                notifiedIdsRef.current.delete(id);
                toast.info(`${minutes} dakika ertelendi`);
                qc.invalidateQueries({ queryKey: ["reminders"] });
              },
            );
          }
        }
      } catch (err) {
        console.warn("Hatırlatma kontrol hatası:", err);
      } finally {
        isCheckingRef.current = false;
      }
    };

    const firstTimer = setTimeout(checkReminders, 2500);
    const intervalTimer = setInterval(checkReminders, CHECK_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        checkReminders();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearTimeout(firstTimer);
      clearInterval(intervalTimer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [orgId, qc]);

  return null;
}
