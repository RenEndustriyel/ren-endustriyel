"use client";

import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";

/**
 * Web Audio API ile harici dosya indirmeden tertemiz 2 tonlu bildirim sesi çalar.
 */
export function playNotificationSound() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;

    // 1. Ton: 659.25 Hz (E5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // 2. Ton: 880 Hz (A5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, now + 0.12);
    gain2.gain.setValueAtTime(0.25, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.6);
  } catch (e) {
    console.warn("Bildirim sesi çalınamadı:", e);
  }
}

/**
 * Görev tamamlandığında hoş bir onay sesi çalar.
 */
export function playDoneSound() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.15);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.18);
  } catch {}
}

/**
 * Tarayıcı masaüstü bildirim desteği ve izin kontrolü
 */
export function isDesktopNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (!isDesktopNotificationSupported()) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!isDesktopNotificationSupported()) return "unsupported";
  try {
    const perm = await Notification.requestPermission();
    return perm;
  } catch {
    return Notification.permission;
  }
}

export type ReminderNotifyItem = {
  id: string;
  title: string;
  description?: string | null;
  starts_at: string;
  time?: string;
  all_day?: boolean;
};

/**
 * Zamanı gelen hatırlatma için ses, masaüstü bildirimi ve uygulama içi toast gösterir.
 */
export function triggerCalendarNotification(
  item: ReminderNotifyItem,
  onComplete?: (id: string) => Promise<void> | void,
  onPostpone?: (id: string, minutes: number) => Promise<void> | void,
) {
  // 1. Ses çal
  playNotificationSound();

  // 2. Masaüstü HTML5 Bildirimi (izni varsa)
  if (isDesktopNotificationSupported() && Notification.permission === "granted") {
    try {
      const notif = new Notification(`⏰ Hatırlatma: ${item.title}`, {
        body: item.description
          ? `${item.time ? item.time + " - " : ""}${item.description}`
          : item.time
          ? `Saat: ${item.time}`
          : "Zamanı gelen takvim işi",
        icon: "/icons/logo-mark.png",
        badge: "/icons/logo-mark.png",
        tag: `reminder-${item.id}`,
        requireInteraction: true,
      });

      notif.onclick = () => {
        window.focus();
        if (window.location.pathname !== "/takvim" && window.location.pathname !== "/ajanda") {
          window.location.href = "/takvim";
        }
        notif.close();
      };
    } catch (e) {
      console.warn("Desktop notification hatası:", e);
    }
  }

  // 3. Uygulama İçi İnteraktif Toast
  const subText = item.time ? `Saat: ${item.time}` : item.all_day ? "Tüm gün" : "";
  const desc = [subText, item.description].filter(Boolean).join(" · ");

  toast(`⏰ ${item.title}`, {
    description: desc || "Zamanı gelen takvim hatırlatması",
    duration: 15000,
    action: {
      label: "Tamamla",
      onClick: async () => {
        if (onComplete) {
          await onComplete(item.id);
        } else {
          try {
            await (supabase as any)
              .from("reminders")
              .update({ is_done: true, updated_at: new Date().toISOString() })
              .eq("id", item.id);
            playDoneSound();
            toast.success("İş tamamlandı olarak işaretlendi");
          } catch {}
        }
      },
    },
    cancel: {
      label: "10 Dk Ertele",
      onClick: async () => {
        if (onPostpone) {
          await onPostpone(item.id, 10);
        } else {
          try {
            const nextTime = new Date(Date.now() + 10 * 60 * 1000).toISOString();
            await (supabase as any)
              .from("reminders")
              .update({ remind_at: nextTime, notified_at: null, updated_at: new Date().toISOString() })
              .eq("id", item.id);
            toast.info("10 dakika ertelendi");
          } catch {}
        }
      },
    },
  });
}
