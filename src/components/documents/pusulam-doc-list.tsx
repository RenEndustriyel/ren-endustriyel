"use client";

import * as React from "react";
import { CircleHelp, Copy, Ellipsis, FileText, Mail, Pencil, Plus, Printer } from "lucide-react";
import { formatDate, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

// Pusulam Alışlar / Satışlar listelerinin ortak parçaları (canlı hesaptaki görünümle birebir)

export type MenuItem = { label: string; hint?: string; onSelect: () => void; danger?: boolean; hidden?: boolean };

/** Pusulam'ın küçük açılır menüsü (İçe/Dışa Aktar, Diğer) */
export function PopoverMenu({
  trigger,
  items,
  align = "right",
  triggerClassName,
  title,
}: {
  trigger: React.ReactNode;
  items: MenuItem[];
  align?: "left" | "right";
  triggerClassName: string;
  title: string;
}) {
  const [open, setOpen] = React.useState(false);
  const visible = items.filter((i) => !i.hidden);
  return (
    <div className="relative">
      <button
        type="button"
        className={triggerClassName}
        aria-haspopup="menu"
        aria-expanded={open}
        title={title}
        onClick={() => setOpen((v) => !v)}
      >
        {trigger}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div
            role="menu"
            className={cn(
              "absolute mt-1.5 z-30 min-w-[14rem] card p-1 animate-scale-in",
              align === "right" ? "right-0" : "left-0",
            )}
          >
            {visible.map((it) => (
              <button
                key={it.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  it.onSelect();
                }}
                className={cn(
                  "w-full text-left rounded-lg px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/60 transition",
                  it.danger ? "text-rose-600 dark:text-rose-400" : "text-slate-700 dark:text-slate-200",
                )}
              >
                <div className="font-medium">{it.label}</div>
                {it.hint && <div className="text-xs text-slate-400 mt-0.5">{it.hint}</div>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** Sayfa başlığı + sağ aksiyonlar */
export function ListHeader({ title, actions }: { title: string; actions: React.ReactNode }) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 lg:gap-4 mb-5">
      <div className="min-w-0 lg:min-w-[12rem] lg:shrink-0 lg:max-w-[45%]">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Sipariş, irsaliye ve faturalarınız</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 min-w-0 lg:justify-end">
        <div className="flex flex-wrap gap-2">{actions}</div>
      </div>
    </div>
  );
}

export function ExportMenu({ items }: { items: MenuItem[] }) {
  return (
    <PopoverMenu
      title="Diğer işlemler"
      triggerClassName="btn-ghost"
      items={items}
      trigger={
        <>
          <FileText size={16} /> <span className="hidden md:inline">İçe / Dışa Aktar</span>
        </>
      }
    />
  );
}

export type Period = "all" | "today" | "7" | "30";

export function PeriodSelect({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <select
      className="input !w-auto !py-1.5 text-sm"
      aria-label="Dönem"
      value={value}
      onChange={(e) => onChange(e.target.value as Period)}
    >
      <option value="all">Tüm tarihler</option>
      <option value="today">Bugün</option>
      <option value="7">Son 7 gün</option>
      <option value="30">Son 30 gün</option>
    </select>
  );
}

/** "YYYY-MM-DD" seçilen döneme giriyor mu */
export function inPeriod(date: string, period: Period, today: string): boolean {
  if (period === "all") return true;
  const day = String(date).slice(0, 10);
  if (period === "today") return day === today;
  const d = new Date(today);
  d.setDate(d.getDate() - Number(period) + 1);
  const from = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return day >= from && day <= today;
}

export function TypeTabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: T; label: string }[];
  active: T;
  onChange: (t: T) => void;
}) {
  return (
    <div className="mb-5">
      <div className="flex gap-2 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-semibold transition",
              active === t.id
                ? "bg-emerald-500 text-white shadow-sm"
                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-brand-400",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const actionCls =
  "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:border-brand-300 hover:text-brand-700 dark:hover:text-brand-300 transition-colors";

function WhatsAppIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.47-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.22 3.08.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.79h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.89 6.99c0 5.45-4.43 9.88-9.88 9.88m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.94L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.17-3.48-8.42" />
    </svg>
  );
}

export type DocStatus = "paid" | "open" | "cancelled";

/** Belge kartı (Belge · WhatsApp · E-posta · Kopyala · Düzenle · Diğer) */
export function DocCard({
  name,
  kindLabel,
  date,
  linesCount,
  net,
  vat,
  total,
  currency,
  status,
  dueDate,
  overdue,
  extraInfo,
  whatsappTitle,
  onOpen,
  onPrint,
  onWhatsApp,
  onEmail,
  onCopy,
  onEdit,
  moreItems,
}: {
  name: string;
  kindLabel: string;
  date: string;
  linesCount: number;
  net: number;
  vat: number;
  total: number;
  currency?: string | null;
  status: DocStatus;
  dueDate?: string | null;
  overdue?: boolean;
  extraInfo?: string | null;
  whatsappTitle: string;
  onOpen: () => void;
  onPrint: () => void;
  onWhatsApp: () => void;
  onEmail: () => void;
  onCopy: () => void;
  onEdit?: () => void;
  moreItems: MenuItem[];
}) {
  return (
    <div className="card p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
      <div
        className="flex items-center gap-3 min-w-0 flex-1 order-1 cursor-pointer rounded-lg -m-1 p-1 hover:bg-slate-50 dark:hover:bg-slate-800/40"
        role="button"
        tabIndex={0}
        title="Belgeyi aç"
        onClick={onOpen}
        onKeyDown={(e) => e.key === "Enter" && onOpen()}
      >
        <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-brand-50 dark:bg-brand-900/30 text-brand-500 flex items-center justify-center shrink-0">
          <FileText size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold truncate flex flex-wrap items-center gap-1.5 text-sm sm:text-base">{name}</div>
          <div className="text-xs text-slate-400 truncate">
            {kindLabel} · {formatDate(date)} · {linesCount} kalem{extraInfo ? ` · ${extraInfo}` : ""}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
            Net {formatMoney(net)} · KDV {formatMoney(vat)}
          </div>
        </div>
      </div>

      <div className="order-2 sm:order-3 shrink-0 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 sm:gap-1 text-right sm:min-w-[120px] md:min-w-[150px] border-t sm:border-t-0 border-slate-100 dark:border-slate-800 pt-2.5 sm:pt-0">
        <div className="font-bold text-sm sm:text-base tabular-nums">{formatMoney(total, currency || "TRY")}</div>
        {status === "paid" ? (
          <span className="flex items-center gap-1.5 text-xs font-semibold justify-end select-none mt-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="text-emerald-600 dark:text-emerald-400">Ödendi</span>
          </span>
        ) : status === "cancelled" ? (
          <span className="flex items-center gap-1.5 text-xs font-semibold justify-end select-none mt-1">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            <span className="text-rose-600 dark:text-rose-400">İptal</span>
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs font-semibold justify-end select-none mt-1">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-amber-600 dark:text-amber-500">Açık</span>
          </span>
        )}
        {status === "open" && dueDate && (
          <span className={cn("text-[11px] font-medium", overdue ? "text-rose-600 dark:text-rose-400" : "text-slate-500 dark:text-slate-400")}>
            Vade: {formatDate(dueDate)}
            {overdue && " · gecikti"}
          </span>
        )}
      </div>

      <div className="order-3 sm:order-2 flex flex-wrap items-center justify-end gap-1.5 shrink-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800 pt-2.5 sm:pt-0">
        <button type="button" className={actionCls} title="Belgeyi görüntüle / yazdır" onClick={onPrint}>
          <Printer size={14} /> <span className="hidden md:inline">Belge</span>
        </button>
        <button type="button" className={cn(actionCls, "!text-emerald-700 dark:!text-emerald-400")} title={whatsappTitle} onClick={onWhatsApp}>
          <WhatsAppIcon /> <span className="hidden md:inline">WhatsApp</span>
        </button>
        <button type="button" className={actionCls} title="E-posta ile gönder" onClick={onEmail}>
          <Mail size={14} /> <span className="hidden md:inline">E-posta</span>
        </button>
        <button type="button" className={actionCls} title="Belge metnini panoya kopyala (kalemler + toplamlar)" onClick={onCopy}>
          <Copy size={14} />
          <span className="hidden md:inline">Kopyala</span>
        </button>
        {onEdit && (
          <button type="button" className={actionCls} title="Düzenle" onClick={onEdit}>
            <Pencil size={14} /> <span className="hidden md:inline">Düzenle</span>
          </button>
        )}
        {moreItems.some((i) => !i.hidden) && (
          <PopoverMenu
            title="Diğer işlemler"
            triggerClassName={actionCls}
            items={moreItems}
            trigger={
              <>
                <Ellipsis size={14} /> <span className="hidden md:inline">Diğer</span>
              </>
            }
          />
        )}
      </div>
    </div>
  );
}

/** Sağ alt yeni belge butonu */
export function NewDocFab({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed z-30 h-14 w-14 rounded-full bg-brand-500 text-white shadow-lg shadow-brand-500/40 hover:bg-brand-600 flex items-center justify-center transition active:scale-95 right-4 sm:right-5 lg:right-6 bottom-[calc(7.5rem+env(safe-area-inset-bottom,0px))] lg:bottom-[4.5rem]"
      title={label}
      aria-label={label}
    >
      <Plus size={26} strokeWidth={2.5} />
    </button>
  );
}

/** Sağ alt sayfa yardımı */
export function HelpTrigger({ title, onClick }: { title: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="fixed z-20 right-4 bottom-4 h-9 w-9 rounded-full flex items-center justify-center border transition bg-white/70 dark:bg-slate-900/70 border-slate-200/60 dark:border-slate-700/60 text-slate-400/70 hover:text-slate-500"
    >
      <CircleHelp size={18} />
    </button>
  );
}

/** Pusulam yardım listesi */
export function HelpFeatures({ items }: { items: string[] }) {
  return (
    <div className="text-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">Özellikler</p>
      <ul className="space-y-1.5 mb-3">
        {items.map((t) => (
          <li key={t} className="flex gap-2 text-slate-600 dark:text-slate-300">
            <span className="mt-1.5 h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Panoya kopyalanacak belge metni (kalemler + toplamlar) */
export function docText(opts: {
  title: string;
  name: string;
  number?: string | null;
  date: string;
  lines: { description?: string | null; quantity?: number | null; unit_price?: number | null; total_amount?: number | null }[];
  net: number;
  vat: number;
  total: number;
  currency?: string | null;
}) {
  const cur = opts.currency || "TRY";
  const rows = opts.lines.map(
    (l) => `- ${l.description ?? "Kalem"}: ${Number(l.quantity ?? 0)} x ${formatMoney(Number(l.unit_price ?? 0), cur)} = ${formatMoney(Number(l.total_amount ?? 0), cur)}`,
  );
  return [
    `${opts.title}${opts.number ? ` (${opts.number})` : ""} · ${formatDate(opts.date)}`,
    opts.name,
    "",
    ...rows,
    "",
    `Net: ${formatMoney(opts.net, cur)}`,
    `KDV: ${formatMoney(opts.vat, cur)}`,
    `Toplam: ${formatMoney(opts.total, cur)}`,
  ].join("\n");
}
