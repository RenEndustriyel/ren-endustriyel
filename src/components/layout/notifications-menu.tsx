"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bell, CalendarClock, CheckCheck, PackageCheck, PackageX, TrendingUp } from "lucide-react";
import { getStoredAiAlerts, type RenAiDiscrepancy } from "@/lib/ren-ai";
import { toast } from "sonner";
import { DOC_TYPES, type DocType } from "@/lib/doc-types";
import { useRows, type Row } from "@/lib/data";
import { formatMoney, formatQty, isoDate } from "@/lib/format";
import { useOrg } from "@/providers/org-provider";
import { cn } from "@/lib/utils";
import { CHEQUES_ENABLED, criticalStockEnabled } from "@/lib/features";
import { useDashboard } from "@/components/dashboard/use-dashboard";
import { useNettedDues, type DueItem } from "@/components/dashboard/use-netted-dues";

type Item = { key: string; label: string; value: string; href: string };
const READ_KEY = "ren-bildirim-okundu";

/** Okundu bilgisi yalnızca bu cihazda tutulur; tutar değişirse uyarı yeniden okunmamış sayılır */
const itemId = (section: string, it: Item) => `${section}:${it.key}:${it.value}`;

function loadRead(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(READ_KEY) || "[]") as string[]);
  } catch {
    return new Set();
  }
}

function saveRead(ids: Set<string>) {
  try {
    localStorage.setItem(READ_KEY, JSON.stringify([...ids]));
  } catch {}
}

type Section = { key: string; title: string; icon: React.ReactNode; items: Item[] };

/** Pusulam üst çubuk "Bildirimler" menüsü: kritik stok, vadesi geçen ödemeler/tahsilatlar ve çek/senetler */
export function NotificationsMenu() {
  const router = useRouter();
  const { org } = useOrg();
  const criticalStockOn = criticalStockEnabled(org?.settings);
  const { data } = useDashboard(org?.id || "");
  const { data: dues } = useNettedDues();
  const [open, setOpen] = React.useState(false);
  const [read, setRead] = React.useState<Set<string>>(() => new Set());
  React.useEffect(() => setRead(loadRead()), []); // eslint-disable-line react-hooks/set-state-in-effect
  const today = isoDate();

  const cheques = useRows<Row<"cheques">>("cheques", {
    params: ["overdue", today],
    filter: (q) => q.is("deleted_at", null).eq("status", "portfolio").lt("due_date", today),
    order: [{ column: "due_date" }],
  });

  // Tarihi gelen siparişler: teslim/hatırlatma tarihi (yoksa ileri yazılmış sipariş tarihi) bugün ya da geçmiş, sipariş hâlâ açık
  const orders = useRows<{ id: string; doc_type: string; number: string | null; issue_date: string; due_date: string | null; created_at: string; total: number; currency: string; contact: { name: string } | null }>("documents", {
    select: "id, doc_type, number, issue_date, due_date, created_at, total, currency, contact:contacts(name)",
    params: ["siparis_hatirlatma"],
    filter: (q) => q.in("doc_type", ["sales_order", "purchase_order"]).not("status", "in", '("draft","cancelled","converted","rejected","accepted")'),
  });
  const dueOrders = React.useMemo(() => {
    return (orders.data ?? [])
      .map((o) => {
        const created = String(o.created_at).slice(0, 10);
        const remind = o.due_date ?? (o.issue_date > created ? o.issue_date : null);
        return remind ? { ...o, remind } : null;
      })
      .filter((o): o is NonNullable<typeof o> => !!o && o.remind <= today)
      .sort((a, b) => a.remind.localeCompare(b.remind));
  }, [orders.data, today]);

  // Uygulama o gün ilk açıldığında bir kez ekranda uyar
  React.useEffect(() => {
    if (!dueOrders.length) return;
    try {
      const key = "ren-siparis-uyari-gun";
      if (localStorage.getItem(key) === today) return;
      localStorage.setItem(key, today);
    } catch {}
    const first = dueOrders[0];
    toast.warning(`Tarihi gelen ${dueOrders.length} sipariş var`, {
      description: dueOrders
        .slice(0, 3)
        .map((o) => `${o.doc_type === "sales_order" ? "Satış" : "Satın alma"} siparişi ${o.number ?? ""} · ${o.contact?.name ?? "cari yok"}`)
        .join(" — "),
      duration: 15000,
      action: { label: "Aç", onClick: () => router.push(`${DOC_TYPES[first.doc_type as DocType].base}/detay?id=${first.id}`) },
    });
  }, [dueOrders, today, router]);

  // Ren AI: önceki alışa göre pahalı gelen kalemler (bekleyen uyarılar)
  const [aiAlerts, setAiAlerts] = React.useState<RenAiDiscrepancy[]>([]);
  React.useEffect(() => {
    const load = () => setAiAlerts(getStoredAiAlerts(org?.id).filter((a) => a.status === "pending"));
    load();
    window.addEventListener("ren_ai_alerts_updated", load);
    return () => window.removeEventListener("ren_ai_alerts_updated", load);
  }, [org?.id]);

  const sections = React.useMemo<Section[]>(() => {
    const list: Section[] = [];

    if (aiAlerts.length) {
      list.push({
        key: "ai",
        title: `Alış Fiyat / İskonto Farkı (${aiAlerts.length})`,
        icon: <TrendingUp size={13} />,
        items: aiAlerts.map((a) => ({
          key: a.id,
          label: `${a.productName} · ${a.contactName}`,
          value: `+${formatMoney(a.totalLoss, a.currency)}`,
          href: "/yapay-zeka?tab=alerts",
        })),
      });
    }

    if (dueOrders.length) {
      list.push({
        key: "order",
        title: `Tarihi Gelen Siparişler (${dueOrders.length})`,
        icon: <PackageCheck size={13} />,
        items: dueOrders.map((o) => {
          const late = Math.round((Date.parse(today) - Date.parse(o.remind)) / 86400000);
          return {
            key: o.id,
            label: `${o.doc_type === "sales_order" ? "Satış" : "Alış"} sip. ${o.number ?? ""} · ${o.contact?.name ?? "—"}`,
            value: late > 0 ? `${late} gün geçti` : "bugün",
            href: `${DOC_TYPES[o.doc_type as DocType].base}/detay?id=${o.id}`,
          };
        }),
      });
    }

    const stock = criticalStockOn ? data?.critical_stock ?? [] : [];
    if (stock.length) {
      list.push({
        key: "stock",
        title: `Kritik / Tükenen Stok (${stock.length})`,
        icon: <PackageX size={13} />,
        items: stock.map((p) => ({
          key: p.id,
          label: p.name,
          value: `${formatQty(p.stock_qty)} ad`,
          href: `/urunler/${p.id}`,
        })),
      });
    }

    // Cari bazında mahsuplaşmış net bakiyeler; yalnızca vadesi geçenler
    const toItem = (t: DueItem): Item => ({ key: t.key, label: t.title, value: formatMoney(t.amount), href: t.href });
    const outs = (dues?.outgoing ?? []).filter((t) => t.days_overdue > 0);
    const ins = (dues?.incoming ?? []).filter((t) => t.days_overdue > 0);
    if (outs.length) {
      list.push({ key: "out", title: `Vadesi Geçen Ödemeler (${outs.length})`, icon: <CalendarClock size={13} />, items: outs.map(toItem) });
    }
    if (ins.length) {
      list.push({ key: "in", title: `Vadesi Geçen Tahsilatlar (${ins.length})`, icon: <CalendarClock size={13} />, items: ins.map(toItem) });
    }

    const ch = CHEQUES_ENABLED ? cheques.data ?? [] : [];
    if (ch.length) {
      list.push({
        key: "cheque",
        title: `Vadesi Geçen Çek/Senet (${ch.length})`,
        icon: <CalendarClock size={13} />,
        items: ch.map((c) => ({
          key: c.id,
          label: c.serial_number || c.drawer || (c.kind === "note" ? "Senet" : "Çek"),
          value: formatMoney(c.amount, c.currency),
          href: "/cek-senet",
        })),
      });
    }
    return list;
  }, [criticalStockOn, data?.critical_stock, dues, cheques.data, dueOrders, today, aiAlerts]);

  const allIds = sections.flatMap((s) => s.items.map((it) => itemId(s.key, it)));
  const count = allIds.length;
  const unread = allIds.filter((id) => !read.has(id)).length;

  /** Yalnızca güncel uyarıların kimliklerini sakla (liste şişmesin) */
  const markRead = (ids: string[]) => {
    const next = new Set([...read].filter((id) => allIds.includes(id)));
    ids.forEach((id) => next.add(id));
    setRead(next);
    saveRead(next);
  };

  const go = (id: string, href: string) => {
    markRead([id]);
    setOpen(false);
    router.push(href);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
        title="Bildirimler"
        aria-expanded={open}
      >
        <Bell size={18} className="text-slate-600 dark:text-slate-300" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-[min(20rem,calc(100vw-1.5rem))] card p-0 z-30 animate-scale-in overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-semibold text-sm">Bildirimler</span>
                <span className="ml-2 text-xs text-slate-500 dark:text-slate-500 dark:text-slate-400">
                  {count === 0 ? "uyarı yok" : unread > 0 ? `${unread} okunmamış · ${count} uyarı` : `${count} uyarı`}
                </span>
              </div>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={() => markRead(allIds)}
                  className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 shrink-0"
                >
                  <CheckCheck size={14} />
                  Tümü okundu
                </button>
              )}
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {sections.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">Şu an bir uyarı yok.</p>
              ) : (
                sections.map((s) => (
                  <div key={s.key} className="py-2">
                    <p className="px-4 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      {s.icon} {s.title}
                    </p>
                    {s.items.map((it) => {
                      const id = itemId(s.key, it);
                      const isRead = read.has(id);
                      return (
                        <button
                          key={it.key}
                          type="button"
                          onClick={() => go(id, it.href)}
                          className={cn(
                            "w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center justify-between gap-3",
                            !isRead && "bg-brand-50/60 dark:bg-brand-900/20",
                          )}
                        >
                          <span className={cn("text-sm truncate flex items-center gap-2", !isRead && "font-semibold")}>
                            <span
                              className={cn("h-2 w-2 rounded-full shrink-0", isRead ? "bg-transparent" : "bg-brand-500")}
                              aria-label={isRead ? undefined : "okunmamış"}
                            />
                            {it.label}
                          </span>
                          <span className="text-xs font-semibold shrink-0 text-rose-500">{it.value}</span>
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
