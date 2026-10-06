"use client";

import * as React from "react";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Tarih kutusu — tarayıcının dilinden bağımsız olarak her zaman GG/AA/YYYY gösterir.
 * Değer yine standart "YYYY-MM-DD" olarak taşınır; <input type="date"> yerine birebir kullanılır
 * (value + onChange ile de, react-hook-form register ile de çalışır). Takvim düğmesi yerel seçiciyi açar.
 */

const toText = (iso?: string | null) => {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};

const toIso = (t: string) => {
  const m = t.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (!m) return null;
  const d = Number(m[1]), mo = Number(m[2]), y = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
};

/** Yazarken "GG/AA/YYYY" biçimine sokar */
const mask = (raw: string) => {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
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

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="numeric"
        id={id}
        aria-label={ariaLabel}
        title={title}
        placeholder={placeholder ?? "GG/AA/YYYY"}
        value={text}
        disabled={disabled}
        style={style}
        onFocus={() => {
          setFocused(true);
          if (!controlled && hidden.current) setText(toText(hidden.current.value));
        }}
        onChange={(e) => {
          const t = mask(e.target.value);
          setText(t);
          if (t === "") emit("");
          else {
            const iso = toIso(t);
            if (iso) emit(iso);
          }
        }}
        onBlur={() => {
          setFocused(false);
          // eksik/geçersiz yazım: son geçerli tarihe dön
          if (text && !toIso(text)) setText(toText(hidden.current?.value));
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
