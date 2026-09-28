"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, Bell, CheckCircle2, Circle, Trash2, FileText, ScrollText, StickyNote } from "lucide-react";
import { newId, useRows, useSave, useUpdate, type Row } from "@/lib/data";
import { DOC_TYPES, docFlow, type DocType } from "@/lib/doc-types";
import { formatDayMonth, formatMoney, isoDate } from "@/lib/format";
import { useOrg } from "@/providers/org-provider";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Segmented } from "@/components/ui/segmented";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Reminder = Row<"reminders">;
type Item = {
  id: string;
  date: string;
  time?: string;
  title: string;
  sub?: string;
  kind: "reminder" | "note" | "event" | "doc-in" | "doc-out" | "cheque";
  done?: boolean;
  href?: string;
  reminder?: Reminder;
};

const WEEKDAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const KIND_STYLE: Record<Item["kind"], string> = {
  reminder: "bg-primary",
  note: "bg-warning",
  event: "bg-success",
  "doc-in": "bg-chart-in",
  "doc-out": "bg-chart-out",
  cheque: "bg-brown",
};

const localDate = (ts: string) => isoDate(new Date(ts));
const localTime = (ts: string) => new Date(ts).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

function nextOccurrence(ts: string, rule: string) {
  const d = new Date(ts);
  if (rule === "daily") d.setDate(d.getDate() + 1);
  if (rule === "weekly") d.setDate(d.getDate() + 7);
  if (rule === "monthly") d.setMonth(d.getMonth() + 1);
  if (rule === "yearly") d.setFullYear(d.getFullYear() + 1);
  return d.toISOString();
}

export function AgendaPage() {
  const { canWrite } = useOrg();
  const today = isoDate();
  const [cursor, setCursor] = React.useState(() => {
    const n = new Date();
    return { y: n.getFullYear(), m: n.getMonth() };
  });
  const [selected, setSelected] = React.useState(today);
  const [editing, setEditing] = React.useState<Reminder | "new" | null>(null);
  const first = new Date(cursor.y, cursor.m, 1);
  const gridStart = new Date(first);
  gridStart.setDate(1 - ((first.getDay() + 6) % 7));
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return isoDate(d);
  });
  const from = days[0];
  const to = days[41];

  const reminders = useRows<Reminder>("reminders", {
    params: [from, to],
    filter: (q) => q.gte("starts_at", `${from}T00:00:00`).lte("starts_at", `${to}T23:59:59`),
    order: [{ column: "starts_at" }],
  });
  const docs = useRows<Row<"documents"> & { contact: { name: string } | null }>("documents", {
    select: "*, contact:contacts(name)",
    params: ["agenda", from, to],
    filter: (q) => q.in("payment_status", ["unpaid", "partial"]).gte("due_date", from).lte("due_date", to).not("status", "in", "(draft,cancelled)"),
  });
  const cheques = useRows<Row<"cheques"> & { contact: { name: string } | null }>("cheques", {
    select: "*, contact:contacts(name)",
    params: ["agenda", from, to],
    filter: (q) => q.in("status", ["portfolio", "deposited"]).gte("due_date", from).lte("due_date", to),
  });
  const { update, remove } = useUpdate("reminders");
  const save = useSave("reminders");

  const items: Item[] = [
    ...(reminders.data ?? []).map((r) => ({
      id: r.id,
      date: localDate(r.starts_at),
      time: r.all_day ? undefined : localTime(r.starts_at),
      title: r.title,
      sub: r.description ?? undefined,
      kind: r.kind as Item["kind"],
      done: r.is_done,
      reminder: r,
    })),
    ...(docs.data ?? []).map((d) => {
      const flow = docFlow(d.doc_type as DocType);
      return {
        id: d.id,
        date: d.due_date!,
        title: `${flow === "in" ? "Tahsilat" : "Ödeme"}: ${formatMoney((Number(d.total) - Number(d.paid_amount)) * Number(d.exchange_rate))}`,
        sub: `${d.contact?.name ?? d.description ?? ""} · ${DOC_TYPES[d.doc_type as DocType].label} ${d.number ?? ""}`,
        kind: (flow === "in" ? "doc-in" : "doc-out") as Item["kind"],
        href: `${DOC_TYPES[d.doc_type as DocType].base}/detay?id=${d.id}`,
      };
    }),
    ...(cheques.data ?? []).map((c) => ({
      id: c.id,
      date: c.due_date,
      title: `${c.direction === "received" ? "Alınan" : "Verilen"} ${c.kind === "note" ? "senet" : "çek"}: ${formatMoney(c.amount, c.currency)}`,
      sub: c.contact?.name ?? c.drawer ?? undefined,
      kind: "cheque" as const,
      href: "/nakit/cek-senet",
    })),
  ];
  const byDay = new Map<string, Item[]>();
  for (const i of items) {
    if (!byDay.has(i.date)) byDay.set(i.date, []);
    byDay.get(i.date)!.push(i);
  }
  const dayItems = (byDay.get(selected) ?? []).sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));

  const toggleDone = async (r: Reminder) => {
    await update(r.id, { is_done: !r.is_done });
    if (!r.is_done && r.repeat_rule) {
      // tekrarlayan hatırlatma: bir sonraki kaydı oluştur
      await save.save({
        kind: r.kind,
        title: r.title,
        description: r.description,
        starts_at: nextOccurrence(r.starts_at, r.repeat_rule),
        all_day: r.all_day,
        remind_at: r.remind_at ? nextOccurrence(r.remind_at, r.repeat_rule) : null,
        repeat_rule: r.repeat_rule,
        color: r.color,
      });
    }
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Ajanda"
        description="Hatırlatmalar, notlar ve vadesi gelen işlemler"
        actions={
          canWrite && (
            <Button size="sm" onClick={() => setEditing("new")}>
              <Plus /> Yeni kayıt
            </Button>
          )
        }
      />
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
            <Button variant="ghost" size="icon-sm" onClick={() => setCursor((c) => (c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 }))} aria-label="Önceki ay">
              <ChevronLeft />
            </Button>
            <button className="font-semibold" onClick={() => { const n = new Date(); setCursor({ y: n.getFullYear(), m: n.getMonth() }); setSelected(today); }}>
              {MONTHS[cursor.m]} {cursor.y}
            </button>
            <Button variant="ghost" size="icon-sm" onClick={() => setCursor((c) => (c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 }))} aria-label="Sonraki ay">
              <ChevronRight />
            </Button>
          </div>
          <div className="grid grid-cols-7 border-b border-border bg-surface-2 text-center text-[11px] font-semibold uppercase text-muted">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-1.5">
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((d) => {
              const list = byDay.get(d) ?? [];
              const inMonth = Number(d.slice(5, 7)) - 1 === cursor.m;
              return (
                <button
                  key={d}
                  onClick={() => setSelected(d)}
                  className={cn(
                    "flex min-h-14 flex-col items-stretch gap-0.5 border-b border-r border-border p-1 text-left transition-colors sm:min-h-24 sm:p-1.5",
                    !inMonth && "bg-surface-2/50 text-muted",
                    selected === d && "bg-primary-soft",
                  )}
                >
                  <span className={cn("flex size-6 items-center justify-center rounded-full text-xs", d === today && "bg-primary font-bold text-white")}>{Number(d.slice(8))}</span>
                  <span className="hidden flex-col gap-0.5 sm:flex">
                    {list.slice(0, 3).map((i) => (
                      <span key={i.id} className={cn("truncate rounded px-1 text-[10px] leading-4 text-white", KIND_STYLE[i.kind], i.done && "opacity-50 line-through")}>
                        {i.title}
                      </span>
                    ))}
                    {list.length > 3 && <span className="text-[10px] text-muted">+{list.length - 3}</span>}
                  </span>
                  {!!list.length && (
                    <span className="flex gap-0.5 sm:hidden">
                      {list.slice(0, 4).map((i) => (
                        <span key={i.id} className={cn("size-1.5 rounded-full", KIND_STYLE[i.kind])} />
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 px-3 py-2 text-[11px] text-muted">
            {(
              [
                ["reminder", "Hatırlatma"],
                ["event", "Etkinlik"],
                ["note", "Not"],
                ["doc-in", "Tahsilat vadesi"],
                ["doc-out", "Ödeme vadesi"],
                ["cheque", "Çek / senet"],
              ] as const
            ).map(([k, l]) => (
              <span key={k} className="flex items-center gap-1.5">
                <span className={cn("size-2.5 rounded-sm", KIND_STYLE[k])} />
                {l}
              </span>
            ))}
          </div>
        </Card>

        <Card className="lg:sticky lg:top-20">
          <CardHeader
            title={formatDayMonth(selected)}
            action={
              canWrite && (
                <Button size="sm" variant="ghost" onClick={() => setEditing("new")}>
                  <Plus /> Ekle
                </Button>
              )
            }
          />
          {!dayItems.length && <p className="px-4 py-6 text-center text-sm text-muted">Bu gün için kayıt yok.</p>}
          <ul className="divide-y divide-border">
            {dayItems.map((i) => (
              <li key={i.id} className="flex items-start gap-3 px-4 py-3">
                {i.reminder ? (
                  <button onClick={() => toggleDone(i.reminder!)} className="mt-0.5 text-muted hover:text-success" aria-label="Tamamlandı">
                    {i.done ? <CheckCircle2 className="size-5 text-success" /> : <Circle className="size-5" />}
                  </button>
                ) : (
                  <span className="mt-0.5 text-muted">{i.kind === "cheque" ? <ScrollText className="size-5" /> : <FileText className="size-5" />}</span>
                )}
                <div className="min-w-0 flex-1">
                  {i.href ? (
                    <Link href={i.href} className="block font-medium hover:text-primary">
                      {i.title}
                    </Link>
                  ) : (
                    <button onClick={() => i.reminder && setEditing(i.reminder)} className={cn("block text-left font-medium", i.done && "text-muted line-through")}>
                      {i.kind === "note" && <StickyNote className="mr-1 inline size-3.5 text-warning" />}
                      {i.title}
                    </button>
                  )}
                  <div className="text-xs text-muted">
                    {i.time && `${i.time} · `}
                    {i.sub}
                    {i.reminder?.remind_at && !i.reminder.notified_at && <Bell className="ml-1 inline size-3" />}
                  </div>
                </div>
                {i.reminder && canWrite && (
                  <Button size="icon-sm" variant="ghost" onClick={() => remove(i.reminder!.id, "Silindi")} aria-label="Sil">
                    <Trash2 />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent title={editing === "new" ? "Yeni kayıt" : "Kaydı düzenle"}>
          {editing && <ReminderForm reminder={editing === "new" ? null : editing} date={selected} onDone={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReminderForm({ reminder, date, onDone }: { reminder: Reminder | null; date: string; onDone: () => void }) {
  const save = useSave("reminders");
  const start = reminder ? new Date(reminder.starts_at) : null;
  const [v, setV] = React.useState({
    kind: (reminder?.kind as "reminder" | "note" | "event") ?? "reminder",
    title: reminder?.title ?? "",
    description: reminder?.description ?? "",
    date: start ? isoDate(start) : date,
    time: start && !reminder?.all_day ? start.toTimeString().slice(0, 5) : "09:00",
    all_day: reminder?.all_day ?? false,
    alert: reminder ? (reminder.remind_at ? "custom" : "none") : "at",
    repeat_rule: reminder?.repeat_rule ?? "",
  });
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((x) => ({ ...x, [k]: val }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.title.trim()) return;
    const startsAt = new Date(`${v.date}T${v.all_day ? "09:00" : v.time}:00`);
    const offsets: Record<string, number> = { at: 0, "15m": 15, "1h": 60, "1d": 1440 };
    const remindAt =
      v.kind === "note" || v.alert === "none"
        ? null
        : v.alert === "custom" && reminder?.remind_at
          ? reminder.remind_at
          : new Date(startsAt.getTime() - (offsets[v.alert] ?? 0) * 60000).toISOString();
    await save.save(
      {
        id: reminder?.id ?? newId(),
        kind: v.kind,
        title: v.title.trim(),
        description: v.description.trim() || null,
        starts_at: startsAt.toISOString(),
        all_day: v.all_day,
        remind_at: remindAt,
        notified_at: remindAt && remindAt !== reminder?.remind_at ? null : reminder?.notified_at ?? null,
        repeat_rule: v.repeat_rule || null,
      },
      "Kaydedildi",
    );
    onDone();
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Segmented value={v.kind} onChange={(k) => set("kind", k)} options={[{ value: "reminder", label: "Hatırlatma" }, { value: "event", label: "Etkinlik" }, { value: "note", label: "Not" }]} />
      <Field label="Başlık *">
        <Input value={v.title} onChange={(e) => set("title", e.target.value)} autoFocus placeholder="Örn. Aksakal Lojistik'i ara" />
      </Field>
      <Field label="Açıklama">
        <Textarea rows={2} value={v.description} onChange={(e) => set("description", e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tarih">
          <Input type="date" value={v.date} onChange={(e) => set("date", e.target.value)} />
        </Field>
        {!v.all_day && (
          <Field label="Saat">
            <Input type="time" value={v.time} onChange={(e) => set("time", e.target.value)} />
          </Field>
        )}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Switch checked={v.all_day} onCheckedChange={(x) => set("all_day", x)} /> Tüm gün
      </label>
      {v.kind !== "note" && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Bildirim">
            <NativeSelect value={v.alert} onChange={(e) => set("alert", e.target.value)}>
              <option value="none">Yok</option>
              <option value="at">Zamanında</option>
              <option value="15m">15 dk önce</option>
              <option value="1h">1 saat önce</option>
              <option value="1d">1 gün önce</option>
              {v.alert === "custom" && <option value="custom">Mevcut</option>}
            </NativeSelect>
          </Field>
          <Field label="Tekrar">
            <NativeSelect value={v.repeat_rule} onChange={(e) => set("repeat_rule", e.target.value)}>
              <option value="">Tekrarlama</option>
              <option value="daily">Her gün</option>
              <option value="weekly">Her hafta</option>
              <option value="monthly">Her ay</option>
              <option value="yearly">Her yıl</option>
            </NativeSelect>
          </Field>
        </div>
      )}
      <p className="text-xs text-muted">Bildirimler için Ayarlar → Bildirim ve Kur sekmesinden bu cihazda bildirimleri açın.</p>
      <Button type="submit" loading={save.isPending}>
        Kaydet
      </Button>
    </form>
  );
}
