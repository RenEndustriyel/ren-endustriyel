"use client";

import * as React from "react";
import { Dialog as D } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

export function DialogContent({
  className,
  children,
  title,
  description,
  ...props
}: React.ComponentProps<typeof D.Content> & { title: string; description?: string }) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in print:hidden" />
      <D.Content
        className={cn(
          "fixed z-50 flex max-h-[92dvh] w-full flex-col bg-surface shadow-xl focus:outline-none print:static print:max-h-none print:w-full print:shadow-none print:bg-transparent print:p-0",
          // telefon: alttan çıkan sayfa ; masaüstü: ortada pencere
          "inset-x-0 bottom-0 rounded-t-2xl pb-safe sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl",
          className,
        )}
        {...props}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 print:hidden">
          <div>
            <D.Title className="text-base font-semibold">{title}</D.Title>
            {description ? (
              <D.Description className="mt-0.5 text-sm text-muted">{description}</D.Description>
            ) : (
              <D.Description className="sr-only">{title}</D.Description>
            )}
          </div>
          <D.Close className="rounded-md p-1 text-muted hover:bg-surface-2 hover:text-text" aria-label="Kapat">
            <X className="size-5" />
          </D.Close>
        </div>
        <div className="thin-scroll overflow-y-auto px-5 py-4 print:overflow-visible print:p-0">{children}</div>
      </D.Content>
    </D.Portal>
  );
}
