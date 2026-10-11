"use client";

import * as React from "react";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Tarih kutusu — tarayıcının dilinden bağımsız olarak her zaman GG/AA/YYYY gösterir.
 * Değer yine standart "YYYY-MM-DD" olarak taşınır; <input type="date"> yerine birebir kullanılır
 * (value + onChange ile de, react-hook-form register ile de çalışır). Takvim düğmesi yerel seçiciyi açar.
 *
 * Hızlı yazım: 7 → bu ayın 7'si · 7.10 / 7/10 / 7 10 → bu yıl · 7.10.26 / 071026 / 07102026 → tam tarih
 * b → bugün · +3 / -2 → bugünden gün ekle/çıkar · ↑ ↓ → bir gün ileri/geri · Enter → onayla ve sonraki alana geç
 */

const HINT = "Hızlı yazım: 7 → ayın 7'si · 7.10 → 7 Ekim · 071026 → 07/10/2026 · b → bugün · +3 → 3 gün sonra · ↑↓ → gün değiştir";

const pad = (n: number) => String(n).padStart(2, "0");
const isoOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const toText = (iso?: string | null) => {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};

const build = (d: number, mo: number, y: number) => {
  if (y < 100) y += 2000;
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return isoOf(dt);
};

/** Kısa yazımı tarihe çevirir: "" → "", geçersiz → null */
const parse = (raw: string): string | null => {
  const s = raw.trim().toLocaleLowerCase("tr-TR");
  if (!s) return "";
  const now = new Date();
  if (s === "b" || s === "bugün" || s === "bugun") return isoOf(now);
  const rel = s.match(/^([+-])\s*(\d{1,3})$/);
  if (rel) {
    const d = new Date(now);
    d.setDate(d.getDate() + (rel[1] === "+" ? 1 : -1) * Number(rel[2]));
    return isoOf(d);
  }
  const cy = now.getFullYear();
  const cm = now.getMonth() + 1;
  if (/[./\-\s]/.test(s)) {
    const p = s.split(/[./\-\s]+/).filter(Boolean);
    if (!p.length || p.length > 3 || p.some((x) => !/^\d+$/.test(x))) return null;
    if (p[2] && p[2].length !== 2 && p[2].length !== 4) return null;
    return build(Number(p[0]), Number(p[1] ?? cm), Number(p[2] ?? cy));
  }
  if (!/^\d+$/.test(s)) return null;
  switch (s.length) {
    case 1:
    case 2:
      return build(Number(s), cm, cy);
    case 3: // 710 → 7/10, 121 → 12/1
      return Number(s.slice(0, 2)) <= 31 && s[2] !== "0" ? build(Number(s.slice(0, 2)), Number(s[2]), cy) : build(Number(s[0]), Number(s.slice(1)), cy);
    case 4:
      return build(Number(s.slice(0, 2)), Number(s.slice(2)), cy);
    case 6:
      return build(Number(s.slice(0, 2)), Number(s.slice(2, 4)), Number(s.slice(4)));
    case 8:
      return build(Number(s.slice(0, 2)), Number(s.slice(2, 4)), Number(s.slice(4)));
    default:
      return null;
  }
};

/** Tam yazılmış tarih (yazarken anında işlenir); kısa yazımlar Enter / alandan çıkınca işlenir */
const isComplete = (t: string) => /^\d{1,2}[./\-\s]\d{1,2}[./\-\s]\d{4}$/.test(t.trim()) || /^\d{8}$/.test(t.trim());

/** Hanelerle yazarken ayraç ekler: 07 → 07/ , 07/10 → 07/10/ (kullanıcının ayracı korunur) */
const autoSep = (prev: string, next: string) => {
  // ayraç zaten eklendiyse kullanıcının yazdığı ikinci ayraç yok sayılır (07/ + . → 07/)
  if (next.length > prev.length && /[./\- ]{2}$/.test(next)) return prev;
  if (next.length <= prev.length || !/\d$/.test(next) || !/^[\d./\- ]+$/.test(next)) return next;
  const seps = next.match(/[./\- ]/g) ?? [];
  if (seps.length >= 2) return next;
  const seg = next.split(/[./\- ]/).pop() ?? "";
  // tek parça 4+ hane (ör. 071026 yapıştırma / hızlı yazım) olduğu gibi kalır
  if (seg.length !== 2 || (seps.length === 0 && next.length > 2)) return next;
  return next + (seps[0] ?? "/");
};

export function DateInput({
  className,
  value,
  defaultValue,
  onChange,
  onBlur,
  disabled,
  placeholder,
  style,
  id,
  ref,
  "aria-label": ariaLabel,
  title,
  ...rest
}: React.ComponentProps<"input">) {
  const hidden = React.useRef<HTMLInputElement | null>(null);
  const controlled = value !== undefined;
  const [text, setText] = React.useState(() => toText(String(value ?? defaultValue ?? "")));
  const [focused, setFocused] = React.useState(false);
  const keepSelection = React.useRef(false);

  const setRefs = (el: HTMLInputElement | null) => {
    hidden.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) (ref as React.RefObject<HTMLInputElement | null>).current = el;
  };

  // Dışarıdan gelen değer değişince göster (yazarken araya girme)
  React.useEffect(() => {
    if (controlled && !focused) setText(toText(String(value ?? ""))); // eslint-disable-line react-hooks/set-state-in-effect
  }, [value, controlled, focused]);
  // Kontrolsüz kullanımda (form kaydı) ilk değeri gizli kutudan oku
  React.useEffect(() => {
    if (controlled) return;
    const t = setTimeout(() => hidden.current && setText(toText(hidden.current.value)), 0);
    return () => clearTimeout(t);
  }, [controlled]);

  /** Gizli tarih kutusuna değeri yaz ve React'in onChange'ini tetikle (form kütüphaneleri de görür) */
  const emit = (iso: string) => {
    const el = hidden.current;
    if (!el || el.value === iso) return;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(el, iso);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  };

  /** Yazılanı tarihe çevir; geçersizse son geçerli tarihe dön */
  const commit = (t = text) => {
    const iso = parse(t);
    if (iso === null) {
      setText(toText(hidden.current?.value));
      return false;
    }
    emit(iso);
    setText(toText(iso));
    return true;
  };

  const shift = (days: number) => {
    const base = parse(text) || hidden.current?.value || isoOf(new Date());
    const [y, m, d] = base.split("-").map(Number);
    const dt = new Date(y, m - 1, d + days);
    const iso = isoOf(dt);
    emit(iso);
    setText(toText(iso));
  };

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        id={id}
        aria-label={ariaLabel}
        title={title ? `${title}\n${HINT}` : HINT}
        placeholder={placeholder ?? "GG/AA/YYYY"}
        value={text}
        disabled={disabled}
        style={style}
        onFocus={(e) => {
          setFocused(true);
          if (!controlled && hidden.current) setText(toText(hidden.current.value));
          // üstüne yazmak için hepsini seç (fareyle tıklamada seçim bozulmasın)
          e.currentTarget.select();
          keepSelection.current = true;
        }}
        onMouseUp={(e) => {
          if (keepSelection.current) {
            e.preventDefault();
            keepSelection.current = false;
          }
        }}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^\d./\-\s+bBuUgGnNüÜ]/g, "").slice(0, 10);
          const t = autoSep(text, raw);
          setText(t);
          if (t.trim() === "") emit("");
          else if (isComplete(t)) {
            const iso = parse(t);
            if (iso) emit(iso);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault();
            shift(e.key === "ArrowUp" ? 1 : -1);
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (!commit()) return;
            // sonraki alana geç (Tab gibi)
            const el = e.currentTarget;
            const scope = el.closest("form, [role=dialog]") ?? document.body;
            const items = [...scope.querySelectorAll<HTMLElement>("input, select, textarea, button")].filter(
              (x) => !x.hasAttribute("disabled") && x.tabIndex >= 0 && x.getAttribute("aria-hidden") !== "true" && x.offsetParent !== null,
            );
            const next = items[items.indexOf(el) + 1];
            next?.focus();
          }
        }}
        onBlur={() => {
          setFocused(false);
          commit();
          if (onBlur && hidden.current) onBlur({ target: hidden.current, currentTarget: hidden.current, type: "blur" } as unknown as React.FocusEvent<HTMLInputElement>);
        }}
        className={cn(className, "pr-10 tabular-nums")}
      />
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled}
        onClick={() => {
          const el = hidden.current as (HTMLInputElement & { showPicker?: () => void }) | null;
          try {
            el?.showPicker?.();
          } catch {
            el?.focus();
          }
        }}
        className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-md flex items-center justify-center text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400 disabled:opacity-40"
        aria-label="Takvimden seç"
      >
        <CalendarDays size={16} />
      </button>
      <input
        {...rest}
        ref={setRefs}
        type="date"
        tabIndex={-1}
        aria-hidden
        disabled={disabled}
        value={controlled ? String(value ?? "") : undefined}
        defaultValue={controlled ? undefined : (defaultValue as string | undefined)}
        onChange={(e) => {
          setText(toText(e.target.value));
          onChange?.(e);
        }}
        className="pointer-events-none absolute bottom-0 right-0 h-px w-px opacity-0"
      />
    </div>
  );
}
