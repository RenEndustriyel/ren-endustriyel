// Web Push bildirimleri:
//  - { }            : zamanı gelmiş hatırlatmaları gönderir (pg_cron, 10 dk'da bir)
//  - { digest:true }: günlük özet (vadesi gelen tahsilat/ödeme/çek) — pg_cron her sabah
//  - { test:true }  : oturum açmış kullanıcıya deneme bildirimi
import webpush from "npm:web-push@3.6.7";
import { adminClient, authorize, cors, json } from "../_shared/auth.ts";

webpush.setVapidDetails(
  Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@example.com",
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!,
);

const db = adminClient();

async function pushToUsers(userIds: string[], payload: { title: string; body: string; url?: string; tag?: string }) {
  if (!userIds.length) return 0;
  const { data: subs } = await db.from("push_subscriptions").select("*").in("user_id", [...new Set(userIds)]);
  let sent = 0;
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 60 * 60 * 12 });
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await db.from("push_subscriptions").delete().eq("id", s.id);
    }
  }
  return sent;
}

async function orgAdmins(orgId: string) {
  const { data } = await db.from("memberships").select("user_id").eq("org_id", orgId).in("role", ["owner", "admin"]);
  return (data ?? []).map((m) => m.user_id as string);
}

const fmt = (n: number) => n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const who = await authorize(req);
  if (!who) return json({ error: "Yetkisiz" }, 401);
  const body = await req.json().catch(() => ({}));

  if (body.test) {
    if (!who.userId) return json({ error: "Kullanıcı gerekli" }, 400);
    const n = await pushToUsers([who.userId], { title: "Ren Endüstriyel", body: "Bildirimler açık. Vadesi gelen işlemler için haber vereceğiz.", url: "/ajanda", tag: "test" });
    return json({ ok: true, sent: n });
  }

  if (!who.cron) return json({ error: "Yalnızca zamanlanmış görev" }, 403);

  if (body.digest) {
    const today = new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 10); // TR saati
    const { data: orgs } = await db.from("organizations").select("id, name");
    let total = 0;
    for (const org of orgs ?? []) {
      const { data: docs } = await db
        .from("documents")
        .select("doc_type, total, paid_amount, exchange_rate, due_date")
        .eq("org_id", org.id)
        .is("deleted_at", null)
        .in("payment_status", ["unpaid", "partial"])
        .in("doc_type", ["sales_invoice", "pos_sale", "purchase_invoice", "expense", "salary"])
        .lte("due_date", today);
      const { data: cheques } = await db.from("cheques").select("direction, amount, exchange_rate").eq("org_id", org.id).is("deleted_at", null).in("status", ["portfolio", "deposited"]).eq("due_date", today);
      let inToday = 0, outToday = 0, overdueIn = 0, overdueOut = 0;
      for (const d of docs ?? []) {
        const rem = (Number(d.total) - Number(d.paid_amount)) * Number(d.exchange_rate);
        const isIn = d.doc_type === "sales_invoice" || d.doc_type === "pos_sale";
        if (d.due_date === today) isIn ? (inToday += rem) : (outToday += rem);
        else isIn ? (overdueIn += rem) : (overdueOut += rem);
      }
      const chq = (cheques ?? []).length;
      if (!inToday && !outToday && !overdueIn && !overdueOut && !chq) continue;
      const parts = [
        inToday ? `Bugün tahsilat ${fmt(inToday)} ₺` : "",
        outToday ? `bugün ödeme ${fmt(outToday)} ₺` : "",
        overdueIn ? `geciken alacak ${fmt(overdueIn)} ₺` : "",
        overdueOut ? `geciken borç ${fmt(overdueOut)} ₺` : "",
        chq ? `${chq} çek/senet vadesi bugün` : "",
      ].filter(Boolean);
      total += await pushToUsers(await orgAdmins(org.id), { title: `${org.name} · Günlük özet`, body: parts.join(", "), url: "/panel", tag: `digest-${today}` });
    }
    return json({ ok: true, sent: total });
  }

  // zamanı gelen hatırlatmalar
  const { data: due } = await db
    .from("reminders")
    .select("*")
    .is("deleted_at", null)
    .is("notified_at", null)
    .eq("is_done", false)
    .lte("remind_at", new Date().toISOString())
    .limit(200);
  let sent = 0;
  for (const r of due ?? []) {
    const users = r.assigned_to ? [r.assigned_to] : r.created_by ? [r.created_by] : await orgAdmins(r.org_id);
    sent += await pushToUsers(users, { title: r.title, body: r.description ?? "Hatırlatma", url: "/ajanda", tag: `rem-${r.id}` });
    await db.from("reminders").update({ notified_at: new Date().toISOString() }).eq("id", r.id);
  }
  return json({ ok: true, reminders: due?.length ?? 0, sent });
});
