"use client";

import * as React from "react";
import { Popover } from "radix-ui";
import { Command } from "cmdk";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { inputClass } from "./input";

export type ComboOption = { value: string; label: string; sub?: string; keywords?: string };

/** Aranabilir seçim kutusu (cari, ürün, hesap seçimi) */
export function Combobox({
  value,
  onChange,
  options,
  placeholder = "Seçin…",
  searchPlaceholder = "Ara…",
  emptyText = "Sonuç yok",
  onCreate,
  createLabel = "Yeni ekle",
  disabled,
  clearable,
  className,
  id,
  autoOpen,
}: {
  value: string | null | undefined;
  onChange: (v: string | null) => void;
  options: ComboOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  onCreate?: (search: string) => void;
  createLabel?: string;
  disabled?: boolean;
  clearable?: boolean;
  className?: string;
  id?: string;
  autoOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const selected = options.find((o) => o.value === value);

  React.useEffect(() => {
    if (autoOpen) {
      setOpen(true);
    }
  }, [autoOpen]);

  React.useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [open]);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild disabled={disabled}>
        <button type="button" id={id} className={cn(inputClass, "flex items-center justify-between gap-2 text-left", className)}>
          <span className={cn("truncate", !selected && "text-muted/70")}>{selected ? selected.label : placeholder}</span>
          <span className="flex shrink-0 items-center gap-1 text-muted">
            {clearable && selected && (
              <X
                className="size-4 hover:text-text"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(null);
                }}
              />
            )}
            <ChevronsUpDown className="size-4" />
          </span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          className="z-50 w-[var(--radix-popover-trigger-width)] min-w-64 overflow-hidden rounded-xl border border-border bg-surface shadow-lg"
        >
          <Command loop>
            <Command.Input
              ref={inputRef}
              autoFocus
              value={search}
              onValueChange={setSearch}
              placeholder={searchPlaceholder}
              className="h-10 w-full border-b border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted"
            />
            <Command.List className="thin-scroll max-h-72 overflow-y-auto p-1">
              <Command.Empty className="px-3 py-4 text-center text-sm text-muted">{emptyText}</Command.Empty>
              {options.map((o) => (
                <Command.Item
                  key={o.value}
                  value={`${o.label} ${o.sub ?? ""} ${o.keywords ?? ""} ${o.value}`}
                  onSelect={() => {
                    onChange(o.value);
                    setOpen(false);
                    setSearch("");
                  }}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm data-[selected=true]:bg-primary-soft"
                >
                  <Check className={cn("size-4 shrink-0 text-primary", value === o.value ? "opacity-100" : "opacity-0")} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{o.label}</div>
                    {o.sub && <div className="truncate text-xs text-muted">{o.sub}</div>}
                  </div>
                </Command.Item>
              ))}
            </Command.List>
            {onCreate && (
              <button
                type="button"
                onClick={() => {
                  onCreate(search);
                  setOpen(false);
                  setSearch("");
                }}
                className="flex w-full items-center gap-2 border-t border-border px-3 py-2.5 text-sm font-medium text-primary hover:bg-surface-2"
              >
                <Plus className="size-4" />
                {createLabel}
                {search && <span className="truncate text-muted">“{search}”</span>}
              </button>
            )}
          </Command>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
