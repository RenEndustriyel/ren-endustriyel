"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bell, CalendarClock, PackageX } from "lucide-react";
import { useRows, type Row } from "@/lib/data";
import { formatMoney, formatQty, isoDate } from "@/lib/format";
import { DOC_TYPES, type DocType } from "@/lib/doc-types";
import { useOrg } from "@/providers/org-provider";
import { useDashboard } from "@/components/dashboard/use-dashboard";

type Item = { key: string; label: string; value: string; href: string };
type Section = { key: string; title: string; icon: React.ReactNode; items: Item[] };

/** Pusulam üst çubuk "Bildirimler" menüsü: kritik stok, vadesi geçen ödemeler/tahsilatlar ve çek/senetler */
export function NotificationsMenu() {
  const router = useRouter();
  const { org } = useOrg();
  const { data } = useDashboard(org?.id || "");
  const [open, setOpen] = React.useState(false);
  const today = isoDate();

  const cheques = useRows<Row<"cheques">>("cheques", {
    params: ["overdue", today],
    filter: (q) => q.is("deleted_at", null).eq("status", "portfolio").lt("due_date", today),
    order: [{ column: "due_date" }],
  });

  const sections = React.useMemo<Section[]>(() => {
    const list: Section[] = [];

    const stock = data?.critical_stock ?? [];
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

    const overdue = (data?.timeline ?? []).filter((t) => Number(t.days_overdue) > 0);
    const toItem = (t: (typeof overdue)[number]): Item => {
      const cfg = DOC_TYPES[t.doc_type as DocType];
      return {
        key: t.id,
        label: t.party || t.number || cfg?.label || "Belge",
        value: formatMoney(t.amount),
        href: cfg ? `${cfg.base}/detay?id=${t.id}` : "/panel",
      };
    };
    const outs = overdue.filter((t) => t.flow === "out");
    const ins = overdue.filter((t) => t.flow === "in");
    if (outs.length) {
      list.push({ key: "out", title: `Vadesi Geçen Ödemeler (${outs.length})`, icon: <CalendarClock size={13} />, items: outs.map(toItem) });
    }
    if (ins.length) {
      list.push({ key: "in", title: `Vadesi Geçen Tahsilatlar (${ins.length})`, icon: <CalendarClock size={13} />, items: ins.map(toItem) });
    }

    const ch = cheques.data ?? [];
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
  }, [data?.critical_stock, data?.timeline, cheques.data]);

  const count = sections.reduce((s, x) => s + x.items.length, 0);

  const go = (href: string) => {
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
        {count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-[min(20rem,calc(100vw-1.5rem))] card p-0 z-30 animate-scale-in overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="font-semibold text-sm">Bildirimler</span>
              <span className="text-xs text-slate-400">{count > 0 ? `${count} uyarı` : "uyarı yok"}</span>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {sections.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-slate-400">Şu an bir uyarı yok.</p>
              ) : (
                sections.map((s) => (
                  <div key={s.key} className="py-2">
                    <p className="px-4 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-400 flex items-center gap-1.5">
                      {s.icon} {s.title}
                    </p>
                    {s.items.map((it) => (
                      <button
                        key={it.key}
                        type="button"
                        onClick={() => go(it.href)}
                        className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center justify-between gap-3"
                      >
                        <span className="text-sm truncate">{it.label}</span>
                        <span className="text-xs font-semibold shrink-0 text-rose-500">{it.value}</span>
                      </button>
                    ))}
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
