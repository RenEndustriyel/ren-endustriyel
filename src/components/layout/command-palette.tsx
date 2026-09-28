"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Dialog as D } from "radix-ui";
import { Search, CornerDownLeft } from "lucide-react";
import { NAV, QUICK_ACTIONS } from "@/lib/nav";
import { useOrg } from "@/providers/org-provider";

const CommandContext = React.createContext<{ open: () => void }>({ open: () => {} });
export const useCommandPalette = () => React.useContext(CommandContext);

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const { role } = useOrg();

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const itemCls =
    "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm data-[selected=true]:bg-primary-soft data-[selected=true]:text-primary [&_svg]:size-4 [&_svg]:text-muted data-[selected=true]:[&_svg]:text-primary";
  const groupCls =
    "[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-muted";

  return (
    <CommandContext.Provider value={{ open: () => setOpen(true) }}>
      {children}
      <D.Root open={open} onOpenChange={setOpen}>
        <D.Portal>
          <D.Overlay className="fixed inset-0 z-50 bg-black/40" />
          <D.Content className="fixed inset-x-3 top-[10dvh] z-50 mx-auto max-w-xl overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl focus:outline-none">
            <D.Title className="sr-only">Komut paleti</D.Title>
            <D.Description className="sr-only">Sayfa ve işlem ara</D.Description>
            <Command loop>
              <div className="flex items-center gap-2 border-b border-border px-4">
                <Search className="size-4 text-muted" />
                <Command.Input
                  autoFocus
                  placeholder="Sayfa veya işlem ara…"
                  className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
                />
                <kbd className="rounded border border-border px-1.5 text-[10px] text-muted">ESC</kbd>
              </div>
              <Command.List className="thin-scroll max-h-[60dvh] overflow-y-auto p-2">
                <Command.Empty className="py-8 text-center text-sm text-muted">Sonuç bulunamadı.</Command.Empty>
                <Command.Group heading="Hızlı İşlemler" className={groupCls}>
                  {QUICK_ACTIONS.map((a) => (
                    <Command.Item key={a.href} value={`yeni ${a.title}`} onSelect={() => go(a.href)} className={itemCls}>
                      <a.icon />
                      Yeni {a.title}
                      <CornerDownLeft className="ml-auto opacity-0 [[data-selected=true]_&]:opacity-100" />
                    </Command.Item>
                  ))}
                </Command.Group>
                {NAV.map((g, i) => (
                  <Command.Group key={i} heading={g.title || "Genel"} className={groupCls}>
                    {g.items
                      .filter((it) => !role || !it.hideFor?.includes(role))
                      .map((it) => (
                        <Command.Item
                          key={it.href}
                          value={`${it.title} ${g.title} ${it.keywords ?? ""}`}
                          onSelect={() => go(it.href)}
                          className={itemCls}
                        >
                          <it.icon />
                          {it.title}
                          {g.title && <span className="ml-auto text-xs text-muted">{g.title}</span>}
                        </Command.Item>
                      ))}
                  </Command.Group>
                ))}
              </Command.List>
            </Command>
          </D.Content>
        </D.Portal>
      </D.Root>
    </CommandContext.Provider>
  );
}
