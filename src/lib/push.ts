"use client";

import { supabase } from "@/lib/supabase/client";

/** VAPID açık anahtarı (gizli değildir; özel anahtar yalnızca Edge Function'da) */
export const VAPID_PUBLIC_KEY = "BFxxQdFSJU7Lw2R1u1JFwL6BVWRf55e-JK15N_B6VV7G_Y9hwEBYS2ibX-48K2hbdAn7FTdPvA3yh7qLmUvp_-U";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export const pushSupported = () => typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

export async function currentSubscription() {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ?? null;
}

export async function enablePush(): Promise<void> {
  if (!pushSupported()) throw new Error("Bu tarayıcı bildirimleri desteklemiyor. iPhone'da uygulamayı ana ekrana ekleyip oradan açın.");
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("Bildirim izni verilmedi.");
  const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
  await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) }));
  const j = sub.toJSON();
  const { error } = await supabase.from("push_subscriptions").upsert(
    { endpoint: sub.endpoint, p256dh: j.keys!.p256dh, auth: j.keys!.auth, user_agent: navigator.userAgent.slice(0, 200) },
    { onConflict: "endpoint" },
  );
  if (error) throw error;
}

export async function disablePush(): Promise<void> {
  const sub = await currentSubscription();
  if (!sub) return;
  await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  await sub.unsubscribe();
}

export async function testPush() {
  const { data, error } = await supabase.functions.invoke("send-reminders", { body: { test: true } });
  if (error) throw error;
  return data as { sent: number };
}

export async function refreshRates() {
  const { data, error } = await supabase.functions.invoke("fetch-rates", { body: {} });
  if (error) throw error;
  return data as { date: string; rates: Record<string, number> };
}
