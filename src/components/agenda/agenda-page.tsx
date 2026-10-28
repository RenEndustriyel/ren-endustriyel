"use client";

import * as React from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Bell,
  BellRing,
  CheckCircle2,
  Circle,
  Trash2,
  FileText,
  ScrollText,
  Clock,
  Sparkles,
  CalendarDays,
  ListTodo,
  CheckCheck,
  RotateCcw,
  Volume2,
} from "lucide-react";
import { newId, useRows, useSave, useUpdate, type Row } from "@/lib/data";
import { DOC_TYPES, docFlow, type DocType } from "@/lib/doc-types";
import { CHEQUES_ENABLED } from "@/lib/features";
import { formatMoney, isoDate } from "@/lib/format";
import { useOrg } from "@/providers/org-provider";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  getNotificationPermission,
  isDesktopNotificationSupported,
  playDoneSound,
  playNotificationSound,
  requestNotificationPermission,
  triggerCalendarNotification,
} from "@/lib/calendar-notifications";

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
const MONTHS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
];

const localDate = (ts: string) => isoDate(new Date(ts));
const localTime = (ts: string) =>
  new Date(ts).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

function formatDisplayDate(dateStr: string) {
  try {
    const d = new Date(dateStr + "T00:00:00");
    const today = isoDate();
    const isToday = dateStr === today;
    const weekday = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"][d.getDay()];
    return `${isToday ? "Bugün, " : ""}${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()} ${weekday}`;
  } catch {
    return dateStr;
  }
}

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
  const [activeTab, setActiveTab] = React.useState<"all" | "todo" | "done">("all");

  // Hızlı ekleme form durumu
  const [quickTitle, setQuickTitle] = React.useState("");
  const [quickTime, setQuickTime] = React.useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return d.toTimeString().slice(0, 5);
  });
  const [quickMode, setQuickMode] = React.useState<"todo" | "done">("todo");
  const [quickAlert, setQuickAlert] = React.useState("at");

  // Bildirim izin durumu
  const [perm, setPerm] = React.useState<string>("default");
  // Bildirim silme modal durumu
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [clearing, setClearing] = React.useState(false);

  React.useEffect(() => {
    setPerm(getNotificationPermission());
  }, []);

  const handleRequestPerm = async () => {
    const p = await requestNotificationPermission();
    setPerm(p);
    if (p === "granted") {
      playNotificationSound();
      toast.success("Bildirimler aktif! Zamanı gelince sesli ve masaüstü uyarısı alacaksınız.");
    } else if (p === "denied") {
      toast.error("Tarayıcınızda bildirim izni engellenmiş. Adres çubuğundaki kilit simgesinden açabilirsiniz.");
    }
  };

  const handleTestNotification = () => {
    triggerCalendarNotification({
      id: "test",
      title: "Deneme Hatırlatması",
      description: "Takvim bildirim sistemi aktif ve çalışıyor! Saatinde böyle sesli uyarı alırsınız.",
      starts_at: new Date().toISOString(),
      time: new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
    });
  };

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
    filter: (q) =>
      q
        .gte("starts_at", `${from}T00:00:00`)
        .lte("starts_at", `${to}T23:59:59`)
        .or("related_type.is.null,related_type.neq.recurring_expense"),
    order: [{ column: "starts_at" }],
  });

  const docs = useRows<Row<"documents"> & { contact: { name: string } | null }>("documents", {
    select: "*, contact:contacts(name)",
    params: ["agenda", from, to],
    filter: (q) =>
      q
        .in("payment_status", ["unpaid", "partial"])
        .gte("due_date", from)
        .lte("due_date", to)
        .not("status", "in", "(draft,cancelled)"),
  });

  const cheques = useRows<Row<"cheques"> & { contact: { name: string } | null }>("cheques", {
    select: "*, contact:contacts(name)",
    params: ["agenda", from, to],
    filter: (q) =>
      q.in("status", ["portfolio", "deposited"]).gte("due_date", from).lte("due_date", to),
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
        title: `${flow === "in" ? "Tahsilat" : "Ödeme"}: ${formatMoney(
          (Number(d.total) - Number(d.paid_amount)) * Number(d.exchange_rate)
        )}`,
        sub: `${d.contact?.name ?? d.description ?? ""} · ${DOC_TYPES[d.doc_type as DocType].label} ${
          d.number ?? ""
        }`,
        kind: (flow === "in" ? "doc-in" : "doc-out") as Item["kind"],
        href: `${DOC_TYPES[d.doc_type as DocType].base}/detay?id=${d.id}`,
      };
    }),
    ...(CHEQUES_ENABLED ? cheques.data ?? [] : []).map((c) => ({
      id: c.id,
      date: c.due_date,
      title: `${c.direction === "received" ? "Alınan" : "Verilen"} ${
        c.kind === "note" ? "senet" : "çek"
      }: ${formatMoney(c.amount, c.currency)}`,
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

  const rawDayItems = (byDay.get(selected) ?? []).sort((a, b) =>
    (a.time ?? "").localeCompare(b.time ?? "")
  );

  const todoItems = rawDayItems.filter((i) => i.reminder && !i.done);
  const doneItems = rawDayItems.filter((i) => i.reminder && i.done);
  const financialItems = rawDayItems.filter((i) => !i.reminder);

  const dayItems = rawDayItems.filter((i) => {
    if (activeTab === "todo") return i.reminder ? !i.done : true;
    if (activeTab === "done") return i.reminder ? i.done : false;
    return true;
  });

  const toggleDone = async (r: Reminder) => {
    const nextState = !r.is_done;
    if (nextState) {
      playDoneSound();
    }
    await update(r.id, { is_done: nextState, updated_at: new Date().toISOString() });
    if (nextState && r.repeat_rule) {
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

  const handleClearReminders = async (type: "day" | "done" | "past" | "all") => {
    setClearing(true);
    try {
      let targets: Reminder[] = [];
      const list = reminders.data ?? [];
      if (type === "day") {
        targets = list.filter((r) => localDate(r.starts_at) === selected);
      } else if (type === "done") {
        targets = list.filter((r) => r.is_done);
      } else if (type === "past") {
        targets = list.filter((r) => localDate(r.starts_at) < today);
      } else if (type === "all") {
        targets = list;
      }

      if (targets.length === 0) {
        toast.info("Silinecek bildirim kaydı bulunamadı.");
        setDeleteDialogOpen(false);
        return;
      }

      for (const r of targets) {
        await update(r.id, { deleted_at: new Date().toISOString() });
      }

      toast.success(`${targets.length} adet bildirim başarıyla silindi.`);
      setDeleteDialogOpen(false);
    } catch {
      toast.error("Bildirimler silinirken hata oluştu.");
    } finally {
      setClearing(false);
    }
  };

  // Hızlı Görev / Yapılan Not Ekle
  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;

    const startsAt = new Date(`${selected}T${quickTime}:00`);
    const offsets: Record<string, number> = { at: 0, "10m": 10, "30m": 30, "1h": 60 };
    const remindAt =
      quickMode === "done" || quickAlert === "none"
        ? null
        : new Date(startsAt.getTime() - (offsets[quickAlert] ?? 0) * 60000).toISOString();

    const isDone = quickMode === "done";

    await save.save(
      {
        id: newId(),
        kind: isDone ? "note" : "reminder",
        title: quickTitle.trim(),
        description: isDone ? "Tamamlanan günlük iş" : null,
        starts_at: startsAt.toISOString(),
        all_day: false,
        remind_at: remindAt,
        notified_at: isDone ? new Date().toISOString() : null,
        is_done: isDone,
      },
      isDone ? "Yaptıklarımıza eklendi ✓" : "Yapılacaklara eklendi"
    );

    if (isDone) {
      playDoneSound();
    } else {
      toast.success("Saatinde sesli ve masaüstü bildirim verilecektir.");
    }

    setQuickTitle("");
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-12">
      {/* 1. Üst Bar: Başlık & Bildirim İzni */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <CalendarDays className="size-7 text-brand-600 dark:text-brand-400" />
            Takvim & Günlük Ajanda
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Günlük yaptıklarımız, yapacaklarımız, saatli hatırlatmalar ve vadesi gelen işlemler
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Bildirim Durumu & Butonu */}
          {perm === "granted" ? (
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <BellRing className="size-4 animate-bounce-subtle" />
              Bildirimler Açık
            </span>
          ) : isDesktopNotificationSupported() ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRequestPerm}
              className="text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800 hover:bg-amber-50"
            >
              <Bell className="size-4" />
              Bildirimleri Etkinleştir
            </Button>
          ) : null}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleTestNotification}
            title="Ses ve masaüstü bildirim testini çalıştır"
            className="text-slate-600 dark:text-slate-300"
          >
            <Volume2 className="size-4" />
            Sesi Test Et
          </Button>

          {canWrite && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
                className="text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              >
                <Trash2 className="size-4" />
                Bildirimleri Sil
              </Button>

              <Button size="sm" onClick={() => setEditing("new")} className="bg-brand-500 hover:bg-brand-600 text-white shadow-sm">
                <Plus className="size-4" /> Yeni Hatırlatma
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 2. Ana Gövde: Sol Takvim Izgarası + Sağ Seçili Gün Paneli */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1.35fr)]">
        {/* SOL: Takvim Kartı */}
        <Card className="overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 py-3 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() =>
                  setCursor((c) => (c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 }))
                }
                aria-label="Önceki ay"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <button
                className="font-bold text-slate-800 dark:text-slate-100 text-base hover:text-brand-600 transition"
                onClick={() => {
                  const n = new Date();
                  setCursor({ y: n.getFullYear(), m: n.getMonth() });
                  setSelected(today);
                }}
              >
                {MONTHS[cursor.m]} {cursor.y}
              </button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() =>
                  setCursor((c) => (c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 }))
                }
                aria-label="Sonraki ay"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const n = new Date();
                setCursor({ y: n.getFullYear(), m: n.getMonth() });
                setSelected(today);
              }}
              className="text-xs"
            >
              Bugüne Git
            </Button>
          </div>

          {/* Hafta Günleri Başlıkları */}
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900 text-center text-[12px] font-bold uppercase text-slate-500 dark:text-slate-400">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-2">
                {w}
              </div>
            ))}
          </div>

          {/* Gün Hücreleri */}
          <div className="grid grid-cols-7">
            {days.map((d) => {
              const list = byDay.get(d) ?? [];
              const inMonth = Number(d.slice(5, 7)) - 1 === cursor.m;
              const isSelected = selected === d;
              const isToday = d === today;
              const hasTodo = list.some((i) => i.reminder && !i.done);
              const hasDone = list.some((i) => i.reminder && i.done);
              const hasFinance = list.some((i) => !i.reminder);

              return (
                <button
                  key={d}
                  onClick={() => setSelected(d)}
                  className={cn(
                    "relative flex min-h-16 flex-col items-center justify-start gap-1 border-b border-r border-slate-100 dark:border-slate-800/80 p-1.5 transition text-left sm:min-h-20 sm:items-stretch sm:p-2",
                    !inMonth && "bg-slate-50/40 text-slate-400 dark:bg-slate-950/40 dark:text-slate-600",
                    isSelected
                      ? "bg-brand-50/80 dark:bg-brand-950/40 ring-2 ring-inset ring-brand-500 font-semibold"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={cn(
                        "flex size-6 items-center justify-center rounded-full text-xs font-medium",
                        isToday
                          ? "bg-brand-600 text-white font-bold shadow-sm"
                          : isSelected
                          ? "text-brand-600 dark:text-brand-400 font-bold"
                          : "text-slate-700 dark:text-slate-300"
                      )}
                    >
                      {Number(d.slice(8))}
                    </span>

                    {/* Küçük göstergeler (badge dots) */}
                    <div className="flex gap-1">
                      {hasTodo && <span className="size-2 rounded-full bg-blue-500" title="Yapılacak işler var" />}
                      {hasDone && <span className="size-2 rounded-full bg-emerald-500" title="Tamamlanan işler" />}
                      {hasFinance && <span className="size-2 rounded-full bg-amber-500" title="Vadeli işlem" />}
                    </div>
                  </div>

                  {/* Masaüstü liste özeti */}
                  <div className="hidden flex-col gap-1 sm:flex w-full mt-0.5">
                    {list.slice(0, 2).map((i) => (
                      <span
                        key={i.id}
                        className={cn(
                          "truncate rounded px-1.5 py-0.5 text-[10px] leading-tight font-medium",
                          i.done
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 line-through opacity-70"
                            : i.reminder
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                        )}
                      >
                        {i.time && `${i.time} `}
                        {i.title}
                      </span>
                    ))}
                    {list.length > 2 && (
                      <span className="text-[10px] font-semibold text-slate-400 pl-1">
                        +{list.length - 2} kayıt
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Açıklama / Legend */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 dark:border-slate-800 px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/50">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-blue-500" /> Yapılacaklar (Planlanan)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-emerald-500" /> Yaptıklarımız (Tamamlanan)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-amber-500" /> Finansal Vadeler
            </span>
          </div>
        </Card>

        {/* SAĞ: Seçili Günün Ajandası (Yapacaklarımız & Yaptıklarımız) */}
        <div className="space-y-4">
          <Card className="border border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader
              title={
                <div>
                  <div className="font-bold text-slate-900 dark:text-slate-100">{formatDisplayDate(selected)}</div>
                  <div className="text-xs font-normal text-slate-500 dark:text-slate-400 mt-0.5">
                    {todoItems.length} yapılacak · {doneItems.length} yapılan · {financialItems.length} vade
                  </div>
                </div>
              }
              action={
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  <button
                    onClick={() => setActiveTab("all")}
                    className={cn(
                      "px-2.5 py-1 text-xs font-semibold rounded-lg transition",
                      activeTab === "all"
                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    )}
                  >
                    Tümü ({rawDayItems.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("todo")}
                    className={cn(
                      "px-2.5 py-1 text-xs font-semibold rounded-lg transition",
                      activeTab === "todo"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    )}
                  >
                    Yapacaklarımız ({todoItems.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("done")}
                    className={cn(
                      "px-2.5 py-1 text-xs font-semibold rounded-lg transition",
                      activeTab === "done"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    )}
                  >
                    Yaptıklarımız ({doneItems.length})
                  </button>
                </div>
              }
            />

            {/* HIZLI GİRİŞ KUTUSU */}
            {canWrite && (
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40">
                <div className="flex items-center gap-2 mb-2.5">
                  <button
                    type="button"
                    onClick={() => setQuickMode("todo")}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition",
                      quickMode === "todo"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    )}
                  >
                    <ListTodo className="size-3.5" />
                    Yapılacak İş Planla
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickMode("done")}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition",
                      quickMode === "done"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    )}
                  >
                    <CheckCheck className="size-3.5" />
                    Bugün Yaptığımızı Kaydet (Not)
                  </button>
                </div>

                <form onSubmit={handleQuickAdd} className="space-y-2.5">
                  <div className="flex gap-2">
                    <Input
                      value={quickTitle}
                      onChange={(e) => setQuickTitle(e.target.value)}
                      placeholder={
                        quickMode === "todo"
                          ? "Örn: Saat 15:30'da müşteri aranacak, teklif sorulacak..."
                          : "Örn: Müşteri ziyareti yapıldı, numune teslim edildi..."
                      }
                      className="flex-1 bg-white dark:bg-slate-950"
                      autoFocus={false}
                    />
                    <Input
                      type="time"
                      value={quickTime}
                      onChange={(e) => setQuickTime(e.target.value)}
                      className="w-24 bg-white dark:bg-slate-950 shrink-0 font-medium"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    {quickMode === "todo" ? (
                      <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                        <BellRing className="size-3.5 text-brand-600" />
                        <span>Saatinde Bildirim:</span>
                        <select
                          value={quickAlert}
                          onChange={(e) => setQuickAlert(e.target.value)}
                          className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs outline-none"
                        >
                          <option value="at">Tam Vaktinde</option>
                          <option value="10m">10 Dk Önce</option>
                          <option value="30m">30 Dk Önce</option>
                          <option value="1h">1 Saat Önce</option>
                          <option value="none">Sessiz (Uyarısız)</option>
                        </select>
                      </div>
                    ) : (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCheck className="size-3.5" />
                        Doğrudan tamamlanan iş olarak günlüğe işlenir
                      </span>
                    )}

                    <Button
                      type="submit"
                      size="sm"
                      loading={save.isPending}
                      className={cn(
                        "text-white shadow-sm font-semibold",
                        quickMode === "todo" ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700"
                      )}
                    >
                      <Plus className="size-4" /> {quickMode === "todo" ? "Yapılacaklara Ekle" : "Yaptıklarımıza Kaydet"}
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* LİSTE */}
            <CardBody className="p-0">
              {dayItems.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <CalendarDays className="size-10 mx-auto text-slate-300 dark:text-slate-700" />
                  <p className="text-sm font-medium">Bu gün için herhangi bir kayıt bulunmuyor.</p>
                  <p className="text-xs text-slate-400">Yukarıdaki kutudan hızlıca yapılacak iş veya yapılan not ekleyebilirsiniz.</p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {dayItems.map((i) => (
                    <li
                      key={i.id}
                      className={cn(
                        "flex items-start gap-3 p-4 transition hover:bg-slate-50/60 dark:hover:bg-slate-800/40",
                        i.done && "bg-slate-50/40 dark:bg-slate-900/20"
                      )}
                    >
                      {/* Tamamlama Butonu veya İkon */}
                      {i.reminder ? (
                        <button
                          onClick={() => toggleDone(i.reminder!)}
                          className="mt-0.5 text-slate-400 hover:text-emerald-600 transition"
                          title={i.done ? "Tekrar yapılacaklara al" : "Tamamlandı olarak işaretle"}
                        >
                          {i.done ? (
                            <CheckCircle2 className="size-5 text-emerald-500 fill-emerald-50 dark:fill-emerald-950" />
                          ) : (
                            <Circle className="size-5 text-slate-400 hover:text-blue-600" />
                          )}
                        </button>
                      ) : (
                        <span className="mt-0.5 text-amber-500">
                          {i.kind === "cheque" ? <ScrollText className="size-5" /> : <FileText className="size-5" />}
                        </span>
                      )}

                      {/* Başlık ve Detaylar */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {i.time && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                              <Clock className="size-3 text-slate-400" />
                              {i.time}
                            </span>
                          )}

                          {i.reminder?.remind_at && (
                            <span
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-600 dark:text-brand-400"
                              title="Saatinde bildirim verilecek"
                            >
                              <BellRing className="size-3 text-brand-500" />
                              Bildirimli
                            </span>
                          )}

                          {i.done && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                              <CheckCheck className="size-3" />
                              Yapıldı
                            </span>
                          )}
                        </div>

                        {i.href ? (
                          <Link
                            href={i.href}
                            className="mt-1 block font-semibold text-slate-900 dark:text-slate-100 hover:text-brand-600 transition"
                          >
                            {i.title}
                          </Link>
                        ) : (
                          <button
                            onClick={() => i.reminder && setEditing(i.reminder)}
                            className={cn(
                              "mt-1 block text-left font-semibold text-slate-900 dark:text-slate-100 hover:text-brand-600 transition",
                              i.done && "line-through text-slate-400 dark:text-slate-500 font-normal"
                            )}
                          >
                            {i.title}
                          </button>
                        )}

                        {i.sub && (
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                            {i.sub}
                          </p>
                        )}
                      </div>

                      {/* İşlem Butonları */}
                      {i.reminder && canWrite && (
                        <div className="flex items-center gap-1">
                          {i.done ? (
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              onClick={() => toggleDone(i.reminder!)}
                              title="Geri Al (Yapılacaklara taşı)"
                              className="text-slate-400 hover:text-blue-600"
                            >
                              <RotateCcw className="size-4" />
                            </Button>
                          ) : (
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              onClick={() => toggleDone(i.reminder!)}
                              title="Tamamlandı olarak işaretle"
                              className="text-slate-400 hover:text-emerald-600"
                            >
                              <CheckCircle2 className="size-4" />
                            </Button>
                          )}

                          <Button
                            size="icon-sm"
                            variant="ghost"
                            onClick={() => remove(i.reminder!.id, "Kayıt silindi")}
                            title="Sil"
                            className="text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Düzenleme / Detaylı Yeni Kayıt Modalı */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent title={editing === "new" ? "Yeni Takvim Kaydı" : "Kaydı Düzenle"}>
          {editing && (
            <ReminderForm
              reminder={editing === "new" ? null : editing}
              date={selected}
              onDone={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Bildirimleri Toplu Silme Modalı */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent title="Bildirimleri Sil / Temizle">
          <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
            <p>
              Silmek istediğiniz bildirim kapsamını seçin. Silinen kayıtlar takvimden ve bildirim listesinden kaldırılır.
            </p>

            <div className="grid grid-cols-1 gap-2.5">
              <Button
                variant="outline"
                className="justify-between text-left h-auto py-3 px-4 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={() => handleClearReminders("day")}
                loading={clearing}
              >
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    Seçili Günün Bildirimlerini Sil
                  </div>
                  <div className="text-xs text-slate-500">
                    {formatDisplayDate(selected)} tarihindeki tüm kayıtlar
                  </div>
                </div>
                <span className="text-xs font-bold bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                  {(reminders.data ?? []).filter((r) => localDate(r.starts_at) === selected).length} adet
                </span>
              </Button>

              <Button
                variant="outline"
                className="justify-between text-left h-auto py-3 px-4 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={() => handleClearReminders("done")}
                loading={clearing}
              >
                <div>
                  <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                    Tamamlanmış Bildirimleri Temizle
                  </div>
                  <div className="text-xs text-slate-500">
                    Tamamlandı (yapıldı) olarak işaretlenmiş tüm işler
                  </div>
                </div>
                <span className="text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 px-2.5 py-1 rounded-lg">
                  {(reminders.data ?? []).filter((r) => r.is_done).length} adet
                </span>
              </Button>

              <Button
                variant="outline"
                className="justify-between text-left h-auto py-3 px-4 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={() => handleClearReminders("past")}
                loading={clearing}
              >
                <div>
                  <div className="font-semibold text-amber-600 dark:text-amber-400">
                    Zamanı Geçmiş Bildirimleri Temizle
                  </div>
                  <div className="text-xs text-slate-500">
                    Bugünden önceki günlerde kalan bildirimler
                  </div>
                </div>
                <span className="text-xs font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-600 px-2.5 py-1 rounded-lg">
                  {(reminders.data ?? []).filter((r) => localDate(r.starts_at) < today).length} adet
                </span>
              </Button>

              <Button
                variant="outline"
                className="justify-between text-left h-auto py-3 px-4 border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400"
                onClick={() => handleClearReminders("all")}
                loading={clearing}
              >
                <div>
                  <div className="font-semibold">
                    Tüm Bildirimleri Temizle
                  </div>
                  <div className="text-xs text-rose-500/80">
                    Bu aydaki tüm bildirim kayıtlarını siler
                  </div>
                </div>
                <span className="text-xs font-bold bg-rose-50 dark:bg-rose-950/50 px-2.5 py-1 rounded-lg">
                  {(reminders.data ?? []).length} adet
                </span>
              </Button>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="ghost" size="sm" onClick={() => setDeleteDialogOpen(false)}>
                Vazgeç
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReminderForm({
  reminder,
  date,
  onDone,
}: {
  reminder: Reminder | null;
  date: string;
  onDone: () => void;
}) {
  const save = useSave("reminders");
  const start = reminder ? new Date(reminder.starts_at) : null;
  const [v, setV] = React.useState({
    kind: (reminder?.kind as "reminder" | "note" | "event") ?? "reminder",
    title: reminder?.title ?? "",
    description: reminder?.description ?? "",
    date: start ? isoDate(start) : date,
    time: start && !reminder?.all_day ? start.toTimeString().slice(0, 5) : "10:00",
    all_day: reminder?.all_day ?? false,
    alert: reminder ? (reminder.remind_at ? "custom" : "none") : "at",
    repeat_rule: reminder?.repeat_rule ?? "",
    is_done: reminder?.is_done ?? false,
  });

  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) =>
    setV((x) => ({ ...x, [k]: val }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.title.trim()) return;

    const startsAt = new Date(`${v.date}T${v.all_day ? "09:00" : v.time}:00`);
    const offsets: Record<string, number> = { at: 0, "10m": 10, "15m": 15, "30m": 30, "1h": 60, "1d": 1440 };

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
        is_done: v.is_done,
      },
      "Kaydedildi"
    );

    onDone();
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
        <button
          type="button"
          onClick={() => set("kind", "reminder")}
          className={cn(
            "flex-1 py-1.5 text-xs font-semibold rounded-lg transition",
            v.kind === "reminder" ? "bg-white dark:bg-slate-700 shadow-sm text-brand-600 dark:text-brand-400" : "text-slate-600"
          )}
        >
          Hatırlatma / İş
        </button>
        <button
          type="button"
          onClick={() => set("kind", "note")}
          className={cn(
            "flex-1 py-1.5 text-xs font-semibold rounded-lg transition",
            v.kind === "note" ? "bg-white dark:bg-slate-700 shadow-sm text-emerald-600 dark:text-emerald-400" : "text-slate-600"
          )}
        >
          Yapılan İş (Not)
        </button>
        <button
          type="button"
          onClick={() => set("kind", "event")}
          className={cn(
            "flex-1 py-1.5 text-xs font-semibold rounded-lg transition",
            v.kind === "event" ? "bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400" : "text-slate-600"
          )}
        >
          Etkinlik / Toplantı
        </button>
      </div>

      <Field label="Başlık *">
        <Input
          value={v.title}
          onChange={(e) => set("title", e.target.value)}
          autoFocus
          placeholder="Örn. Demir Çelik firmasını ara ve teklifi teyit et"
        />
      </Field>

      <Field label="Açıklama / Notlar">
        <Textarea
          rows={3}
          value={v.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Görüşülecek konular, sipariş detayları..."
        />
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

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
          <Switch checked={v.all_day} onCheckedChange={(x) => set("all_day", x)} />
          Tüm Gün Süren Etkinlik
        </label>

        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
          <Switch checked={v.is_done} onCheckedChange={(x) => set("is_done", x)} />
          Tamamlandı / Yapıldı
        </label>
      </div>

      {v.kind !== "note" && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Sesli & Masaüstü Bildirim">
            <NativeSelect value={v.alert} onChange={(e) => set("alert", e.target.value)}>
              <option value="none">Bildirim Yok</option>
              <option value="at">Tam Saatinde</option>
              <option value="10m">10 Dk Önce</option>
              <option value="15m">15 Dk Önce</option>
              <option value="30m">30 Dk Önce</option>
              <option value="1h">1 Saat Önce</option>
              <option value="1d">1 Gün Önce</option>
              {v.alert === "custom" && <option value="custom">Mevcut Zaman</option>}
            </NativeSelect>
          </Field>

          <Field label="Tekrarlama">
            <NativeSelect value={v.repeat_rule} onChange={(e) => set("repeat_rule", e.target.value)}>
              <option value="">Tekrarlama Yok</option>
              <option value="daily">Her Gün</option>
              <option value="weekly">Her Hafta</option>
              <option value="monthly">Her Ay</option>
              <option value="yearly">Her Yıl</option>
            </NativeSelect>
          </Field>
        </div>
      )}

      <p className="text-xs text-slate-500">
        🔔 Bildirim kurulduğunda belirlediğiniz saatte sesli uyarı ve masaüstü bildirimi alırsınız.
      </p>

      <Button type="submit" loading={save.isPending} className="bg-brand-500 hover:bg-brand-600 text-white font-semibold">
        Kaydet
      </Button>
    </form>
  );
}
